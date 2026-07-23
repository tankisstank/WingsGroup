import 'dotenv/config'

import configPromise from '@payload-config'
import { createLocalReq, getPayload, type Payload, type PayloadRequest, type Where } from 'payload'
import fs from 'node:fs/promises'
import path from 'node:path'

import {
  bindingSnapshotChecksum,
  deterministicHiFiFilename,
  readRelationAtPath,
  sha256,
  WINGSSIDE_HIFI_ROLLBACK_MEDIA_POLICY,
  WINGSSIDE_HIFI_SITE_CODE,
  wingsSideHiFiAssets,
  wingsSidePageMediaBindings,
  writeRelationAtPath,
  type WingsSideHiFiAssetKey,
} from './lib/wingssideHifiAssets'

type RelationID = number | string
type AssetState = Record<
  WingsSideHiFiAssetKey,
  {
    action?: 'create' | 'reuse'
    digest: string
    filename: string
    id?: RelationID
    requestedFilename: string
  }
>
type PageState = {
  after: Record<string, RelationID | null>
  afterChecksum: string
  before: Record<string, RelationID | null>
  beforeChecksum: string
  bindings: Array<{
    asset: WingsSideHiFiAssetKey
    currentMediaID: RelationID | null
    fieldPath: string
    resolvedMediaID: RelationID | null
  }>
  id: RelationID
  mutationStatus: 'pending' | 'unchanged' | 'updated'
  path: '/' | '/packages'
}

type SyncReport = {
  assets: AssetState
  createdMediaIDs: RelationID[]
  dryRun: boolean
  generatedAt: string
  pages: PageState[]
  rollbackMediaPolicy: typeof WINGSSIDE_HIFI_ROLLBACK_MEDIA_POLICY
  siteCode: typeof WINGSSIDE_HIFI_SITE_CODE
  siteID: number
  version: 1
}

const context = { disableRevalidate: true, seed: true }
const assetRoot = path.resolve(import.meta.dirname, '../assets/wingsside-hifi')
const mediaRoot = path.resolve(import.meta.dirname, '../public/media')

const writeReportAtomic = async (reportPath: string, report: SyncReport) => {
  await fs.mkdir(path.dirname(reportPath), { recursive: true })
  const temporaryPath = `${reportPath}.${process.pid}.tmp`
  await fs.writeFile(temporaryPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  await fs.rename(temporaryPath, reportPath)
}

const readResumeReport = async (reportPath: string): Promise<SyncReport | null> => {
  try {
    return JSON.parse(await fs.readFile(reportPath, 'utf8')) as SyncReport
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw error
  }
}

const parseArgs = () => {
  const args = process.argv.slice(2)
  const valueAfter = (flag: string) => {
    const index = args.indexOf(flag)
    return index >= 0 ? args[index + 1] : undefined
  }

  return {
    apply: args.includes('--apply'),
    report: path.resolve(valueAfter('--report') || 'output/us046/wingsside-hifi-assets.json'),
    rollbackReport: valueAfter('--rollback-report'),
  }
}

const whereAnd = (...clauses: Where[]): Where => ({ and: clauses })

const findExactSite = async (payload: Payload, req: PayloadRequest) => {
  const result = await payload.find({
    collection: 'sites',
    depth: 0,
    limit: 2,
    overrideAccess: true,
    pagination: false,
    req,
    where: { code: { equals: WINGSSIDE_HIFI_SITE_CODE } },
  })
  if (result.docs.length !== 1) {
    throw new Error(`Expected exactly one ${WINGSSIDE_HIFI_SITE_CODE} site; found ${result.docs.length}`)
  }
  return result.docs[0]
}

const findExactPage = async (
  payload: Payload,
  req: PayloadRequest,
  siteID: number,
  pagePath: '/' | '/packages',
) => {
  const result = await payload.find({
    collection: 'pages',
    depth: 0,
    fallbackLocale: false,
    limit: 2,
    locale: 'en',
    overrideAccess: true,
    pagination: false,
    req,
    where: whereAnd({ site: { equals: siteID } }, { pathname: { equals: pagePath } }),
  })
  if (result.docs.length !== 1) {
    throw new Error(`Expected exactly one ${WINGSSIDE_HIFI_SITE_CODE} page ${pagePath}; found ${result.docs.length}`)
  }
  return result.docs[0] as unknown as Record<string, unknown> & { id: RelationID }
}

const loadAssets = async (): Promise<AssetState> => {
  const entries = await Promise.all(
    (Object.entries(wingsSideHiFiAssets) as Array<
      [WingsSideHiFiAssetKey, (typeof wingsSideHiFiAssets)[WingsSideHiFiAssetKey]]
    >).map(async ([key, definition]) => {
      const bytes = await fs.readFile(path.join(assetRoot, definition.file))
      const digest = sha256(bytes)
      const filename = deterministicHiFiFilename(definition.file, digest)
      return [key, { digest, filename, requestedFilename: filename }] as const
    }),
  )
  return Object.fromEntries(entries) as AssetState
}

const resolveMedia = async ({
  apply,
  assets,
  createdMediaIDs,
  onDecision,
  payload,
  req,
  siteID,
}: {
  apply: boolean
  assets: AssetState
  createdMediaIDs: RelationID[]
  onDecision: () => Promise<void>
  payload: Payload
  req: PayloadRequest
  siteID: number
}) => {
  for (const [key, state] of Object.entries(assets) as Array<
    [WingsSideHiFiAssetKey, AssetState[WingsSideHiFiAssetKey]]
  >) {
    const definition = wingsSideHiFiAssets[key]
    const filenamePrefix = path.basename(state.requestedFilename, path.extname(state.requestedFilename))
    const candidates = await payload.find({
      collection: 'media',
      depth: 0,
      limit: 50,
      overrideAccess: true,
      pagination: false,
      req,
      where: whereAnd({ site: { equals: siteID } }, { filename: { contains: filenamePrefix } }),
    })
    const matching = []
    for (const candidate of candidates.docs) {
      if (!candidate.filename) continue
      let bytes: Buffer
      try {
        bytes = await fs.readFile(path.join(mediaRoot, candidate.filename))
      } catch {
        throw new Error(`Media ${candidate.id} references missing file ${candidate.filename}`)
      }
      if (sha256(bytes) === state.digest) matching.push(candidate)
    }
    if (matching.length > 1) throw new Error(`Duplicate content-addressed media ${state.requestedFilename}`)
    if (matching[0]) {
      state.action = 'reuse'
      state.filename = matching[0].filename || state.requestedFilename
      state.id = matching[0].id
      await onDecision()
      continue
    }
    state.action = 'create'
    if (!apply) {
      await onDecision()
      continue
    }

    const bytes = await fs.readFile(path.join(assetRoot, definition.file))
    const media = await payload.create({
      collection: 'media',
      context,
      data: { alt: definition.alt, site: siteID },
      file: { data: bytes, mimetype: 'image/jpeg', name: state.requestedFilename, size: bytes.byteLength },
      locale: 'en',
      overrideAccess: true,
      req,
    })
    state.filename = media.filename || state.requestedFilename
    state.id = media.id
    createdMediaIDs.push(media.id)
    await onDecision()
  }
}

const snapshotPage = (
  document: Record<string, unknown>,
  pagePath: '/' | '/packages',
): Record<string, RelationID | null> =>
  Object.fromEntries(
    wingsSidePageMediaBindings
      .filter((binding) => binding.pagePath === pagePath)
      .map((binding) => [binding.fieldPath, readRelationAtPath(document, binding.fieldPath)]),
  )

type PlannedPage = { document: Record<string, unknown>; state: PageState }

const planPages = async ({
  apply,
  assets,
  payload,
  req,
  siteID,
}: {
  apply: boolean
  assets: AssetState
  payload: Payload
  req: PayloadRequest
  siteID: number
}) => {
  const plannedPages: PlannedPage[] = []
  for (const pagePath of ['/', '/packages'] as const) {
    const page = await findExactPage(payload, req, siteID, pagePath)
    const before = snapshotPage(page, pagePath)
    const bindings = wingsSidePageMediaBindings
      .filter((item) => item.pagePath === pagePath)
      .map((binding) => ({
        asset: binding.asset,
        currentMediaID: before[binding.fieldPath] ?? null,
        fieldPath: binding.fieldPath,
        resolvedMediaID: assets[binding.asset].id ?? null,
      }))

    for (const binding of bindings) {
      const mediaID = assets[binding.asset].id
      if (apply && mediaID === undefined) throw new Error(`Media ${binding.asset} was not resolved`)
      if (mediaID !== undefined) writeRelationAtPath(page, binding.fieldPath, mediaID)
    }

    const after = apply ? snapshotPage(page, pagePath) : before
    plannedPages.push({
      document: page,
      state: {
        after,
        afterChecksum: bindingSnapshotChecksum(after),
        before,
        beforeChecksum: bindingSnapshotChecksum(before),
        bindings,
        id: page.id,
        mutationStatus:
          !apply || bindingSnapshotChecksum(before) === bindingSnapshotChecksum(after)
            ? 'unchanged'
            : 'pending',
        path: pagePath,
      },
    })
  }
  return plannedPages
}

const applyPagePlans = async ({
  payload,
  plannedPages,
  report,
  reportPath,
  req,
}: {
  payload: Payload
  plannedPages: PlannedPage[]
  report: SyncReport
  reportPath: string
  req: PayloadRequest
}) => {
  let updatedCount = 0
  const failAfter = Number.parseInt(process.env.WINGSSIDE_HIFI_FAIL_AFTER_PAGE_UPDATES || '', 10)
  for (const { document, state } of plannedPages) {
    if (state.mutationStatus !== 'pending') continue
    await writeReportAtomic(reportPath, report)
    await payload.update({
      collection: 'pages',
      context,
      data: { hero: document.hero, layout: document.layout, meta: document.meta } as never,
      id: document.id as RelationID,
      locale: 'en',
      overrideAccess: true,
      req,
    })
    state.mutationStatus = 'updated'
    updatedCount += 1
    await writeReportAtomic(reportPath, report)
    if (Number.isFinite(failAfter) && updatedCount === failAfter) {
      throw new Error(`Injected failure after ${updatedCount} Page update(s)`)
    }
  }
}

const rollback = async ({ payload, report, req }: { payload: Payload; report: SyncReport; req: PayloadRequest }) => {
  if (report.siteCode !== WINGSSIDE_HIFI_SITE_CODE || report.version !== 1) {
    throw new Error('Rollback report does not match the WingSide hi-fi asset contract')
  }
  const site = await findExactSite(payload, req)
  if (String(site.id) !== String(report.siteID)) throw new Error('Rollback site ID no longer matches')

  for (const state of report.pages) {
    const page = await findExactPage(payload, req, site.id, state.path)
    const current = snapshotPage(page, state.path)
    const currentChecksum = bindingSnapshotChecksum(current)
    if (currentChecksum === state.beforeChecksum) continue
    if (currentChecksum !== state.afterChecksum) {
      throw new Error(`Rollback refused for ${state.path}; current media references differ from report`)
    }
    for (const [fieldPath, value] of Object.entries(state.before)) {
      writeRelationAtPath(page, fieldPath, value)
    }
    await payload.update({
      collection: 'pages',
      context,
      data: { hero: page.hero, layout: page.layout, meta: page.meta } as never,
      id: page.id,
      locale: 'en',
      overrideAccess: true,
      req,
    })
  }

  // Page drafts/versions retain historical relationship snapshots. Deleting
  // report-created Media here could corrupt that history, so rollback restores
  // live Page bindings but deliberately keeps these content-addressed records.
  // Reapply resolves them by site + digest and therefore creates no duplicates.
  return {
    mediaRetained: report.createdMediaIDs,
    mediaRetentionReason: WINGSSIDE_HIFI_ROLLBACK_MEDIA_POLICY,
  }
}

const main = async () => {
  const args = parseArgs()
  const payload = await getPayload({ config: configPromise })
  // The relationship field filter permits all sites only for super-admins. This
  // synthetic local request is scoped to this explicit operational script; no
  // credential or persisted user is required, while every query still pins the
  // exact WingSide site and pathname.
  const req = await createLocalReq(
    { context, user: { id: 0, role: 'super-admin' } as never },
    payload,
  )

  if (args.rollbackReport) {
    const report = JSON.parse(await fs.readFile(path.resolve(args.rollbackReport), 'utf8')) as SyncReport
    const rollbackResult = await rollback({ payload, report, req })
    console.log(
      JSON.stringify({
        ...rollbackResult,
        pagesRestored: report.pages.length,
        siteCode: report.siteCode,
      }),
    )
    return
  }

  const site = await findExactSite(payload, req)
  const assets = await loadAssets()
  const resumeReport = args.apply ? await readResumeReport(args.report) : null
  if (
    resumeReport &&
    (resumeReport.dryRun ||
      resumeReport.siteCode !== WINGSSIDE_HIFI_SITE_CODE ||
      resumeReport.version !== 1 ||
      String(resumeReport.siteID) !== String(site.id))
  ) {
    throw new Error('Existing apply report does not match this WingSide asset sync')
  }
  const createdMediaIDs: RelationID[] = [...(resumeReport?.createdMediaIDs || [])]
  const report: SyncReport = {
    assets,
    createdMediaIDs,
    dryRun: !args.apply,
    generatedAt: resumeReport?.generatedAt || new Date().toISOString(),
    pages: resumeReport?.pages || [],
    rollbackMediaPolicy: WINGSSIDE_HIFI_ROLLBACK_MEDIA_POLICY,
    siteCode: WINGSSIDE_HIFI_SITE_CODE,
    siteID: site.id,
    version: 1,
  }
  await resolveMedia({
    apply: args.apply,
    assets,
    createdMediaIDs,
    onDecision: () => writeReportAtomic(args.report, report),
    payload,
    req,
    siteID: site.id,
  })
  const plannedPages = await planPages({
    apply: args.apply,
    assets,
    payload,
    req,
    siteID: site.id,
  })
  if (resumeReport?.pages.length) {
    for (const planned of plannedPages) {
      const previous = resumeReport.pages.find(({ path: previousPath }) => previousPath === planned.state.path)
      if (!previous) throw new Error(`Resume report is missing Page ${planned.state.path}`)
      if (planned.state.afterChecksum !== previous.afterChecksum) {
        throw new Error(
          `Resume refused for ${planned.state.path}; desired media plan changed ` +
            `(${planned.state.afterChecksum} != ${previous.afterChecksum})`,
        )
      }
      const currentChecksum = planned.state.beforeChecksum
      const mutationStatus =
        currentChecksum === previous.afterChecksum
          ? 'updated'
          : currentChecksum === previous.beforeChecksum
            ? 'pending'
            : null
      if (!mutationStatus) {
        throw new Error(`Resume refused for ${planned.state.path}; current media references drifted`)
      }
      planned.state = {
        ...previous,
        bindings: planned.state.bindings,
        mutationStatus:
          previous.beforeChecksum === previous.afterChecksum ? 'unchanged' : mutationStatus,
      }
    }
  }
  const pages = plannedPages.map(({ state }) => state)
  report.pages = pages
  await writeReportAtomic(args.report, report)
  // Persist the complete rollback contract before changing any Page. If the
  // process stops midway, rollback safely restores changed pages and skips
  // pages that still match their pre-apply checksums.
  if (args.apply) {
    await applyPagePlans({ payload, plannedPages, report, reportPath: args.report, req })
  }
  console.log(
    JSON.stringify({
      createdMediaCount: createdMediaIDs.length,
      dryRun: !args.apply,
      pageCount: pages.length,
      report: args.report,
      siteCode: report.siteCode,
    }),
  )
}

await main()
