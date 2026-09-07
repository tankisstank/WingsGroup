import 'dotenv/config'

import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

import type { Payload, PayloadRequest } from 'payload'

import { buildMediaReferenceIndex } from './import-doicanhviet'
import {
  DOICANHVIET_SITE_CODE,
  initializePayloadForApply,
  printLifecycleError,
  printLifecycleJSON,
  relationID,
  resolveSuperAdmin,
  resolveWingsGoSite,
  sameID,
} from './doicanhviet-lifecycle-safety'

type ID = number | string

type ImportEntry = {
  status: string
  sourceId: string
  productId?: ID
  createdPageId?: ID | null
  departureIds?: ID[]
  mediaIds?: ID[]
}

type ImportReport = {
  dryRun?: boolean
  status?: string
  siteCode?: string
  siteId?: ID
  batchId?: string
  runId?: string
  report?: ImportEntry[]
}

type PreviousRollbackRecord = {
  sourceId: string
  productId?: ID
  deleted?: {
    product?: ID[]
    page?: ID[]
    departures?: ID[]
    media?: ID[]
  }
  retainedMedia?: Array<{ id: ID; reason?: string }>
  errors?: Array<{ collection?: string; id?: ID; error?: string }>
}

type PreviousRollbackReport = {
  apply?: boolean
  status?: string
  siteCode?: string
  siteId?: ID
  batchId?: string
  sourceImportResult?: string
  records?: PreviousRollbackRecord[]
  retainedMedia?: Array<{ id: ID; reason?: string }>
}

export type RecoveryScopeEntry = {
  sourceId: string
  productId: ID
  pageId: ID | null
  departureIds: ID[]
  mediaIds: ID[]
}

export type RecoveryScope = {
  batchId: string
  siteId: ID
  importEntries: RecoveryScopeEntry[]
  mediaSourceById: Map<string, string>
  retainedMediaIds: Set<string>
}

export type RecoveryCoreProof = {
  sourceId: string
  product: { id: ID; status: 'absent'; evidence: 'previous-report-deleted' | 'absent-in-target' }
  page: { id: ID | null; status: 'absent'; evidence: 'previous-report-deleted' | 'absent-in-target' } | null
  departures: Array<{ id: ID; status: 'absent'; evidence: 'previous-report-deleted' | 'absent-in-target' }>
}

const isID = (value: unknown): value is ID =>
  (typeof value === 'number' && Number.isSafeInteger(value)) ||
  (typeof value === 'string' && value.trim().length > 0)

const idKey = (value: ID) => String(value)

const uniqueIDs = (values: unknown, label: string): ID[] => {
  if (values === undefined) return []
  if (!Array.isArray(values) || values.some((value) => !isID(value)))
    throw new Error(`${label} must contain only report-owned IDs`)
  const seen = new Set<string>()
  return values.filter((value) => {
    const key = idKey(value)
    if (seen.has(key)) throw new Error(`${label} contains duplicate ID ${key}`)
    seen.add(key)
    return true
  }) as ID[]
}

const requireID = (value: unknown, label: string): ID => {
  if (!isID(value)) throw new Error(`${label} is missing or invalid in immutable import report`)
  return value
}

const requireSourceID = (value: unknown, label: string) => {
  if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]*$/u.test(value))
    throw new Error(`${label} is missing or unsafe in immutable import report`)
  return value
}

const idsFrom = (values: unknown) => new Set(uniqueIDs(values, 'rollback evidence').map(idKey))

const previousRecordErrors = (record: PreviousRollbackRecord, sourceId: string) =>
  (record.errors || []).filter(
    (error) =>
      error.collection === 'tour-products' ||
      error.collection === 'pages' ||
      error.collection === 'tour-departures' ||
      error.id === undefined,
  ).map((error) => `${sourceId}:${error.collection || 'unknown'}:${error.error || 'rollback error'}`)

export const buildRecoveryScope = ({
  importReport,
  previousRollbackReport,
  importPath,
}: {
  importReport: ImportReport
  previousRollbackReport: PreviousRollbackReport
  importPath: string
}): RecoveryScope => {
  if (importReport.dryRun) throw new Error('Recovery cannot use a dry-run import report')
  if (importReport.siteCode !== DOICANHVIET_SITE_CODE)
    throw new Error(`Import report must target ${DOICANHVIET_SITE_CODE}`)
  if (previousRollbackReport.apply !== true)
    throw new Error('Previous rollback report must be an applied report')
  if (previousRollbackReport.siteCode !== DOICANHVIET_SITE_CODE)
    throw new Error(`Previous rollback report must target ${DOICANHVIET_SITE_CODE}`)
  if (!importReport.batchId || previousRollbackReport.batchId !== importReport.batchId)
    throw new Error('Import and previous rollback reports must have the same batchId')
  if (path.resolve(previousRollbackReport.sourceImportResult || '') !== path.resolve(importPath))
    throw new Error('Previous rollback report is not bound to the supplied import report')
  if (!isID(importReport.siteId) || !isID(previousRollbackReport.siteId) || !sameID(importReport.siteId, previousRollbackReport.siteId))
    throw new Error('Import and previous rollback reports must have the same siteId')

  const importEntries = (importReport.report || []).filter((entry) => entry.status === 'created')
  if (!importEntries.length) throw new Error('Import report has no created records to recover')
  const previousRecords = previousRollbackReport.records || []
  const previousBySource = new Map<string, PreviousRollbackRecord>()
  for (const record of previousRecords) {
    const sourceId = requireSourceID(record.sourceId, 'Previous rollback sourceId')
    if (previousBySource.has(sourceId)) throw new Error(`Previous rollback has duplicate sourceId ${sourceId}`)
    previousBySource.set(sourceId, record)
  }

  const seenSources = new Set<string>()
  const mediaSourceById = new Map<string, string>()
  const scopeEntries: RecoveryScopeEntry[] = []
  for (const entry of importEntries) {
    const sourceId = requireSourceID(entry.sourceId, 'Import sourceId')
    if (seenSources.has(sourceId)) throw new Error(`Import report has duplicate sourceId ${sourceId}`)
    seenSources.add(sourceId)
    const productId = requireID(entry.productId, `${sourceId}.productId`)
    const pageId = entry.createdPageId == null ? null : requireID(entry.createdPageId, `${sourceId}.createdPageId`)
    const departureIds = uniqueIDs(entry.departureIds, `${sourceId}.departureIds`)
    const mediaIds = uniqueIDs(entry.mediaIds, `${sourceId}.mediaIds`)
    const previous = previousBySource.get(sourceId)
    if (!previous) throw new Error(`Previous rollback has no record for ${sourceId}`)
    if (!isID(previous.productId) || !sameID(previous.productId, productId))
      throw new Error(`Previous rollback product scope mismatch for ${sourceId}`)
    const priorErrors = previousRecordErrors(previous, sourceId)
    if (priorErrors.length) throw new Error(`Previous rollback has core deletion errors: ${priorErrors.join('; ')}`)
    const deletedProducts = idsFrom(previous.deleted?.product)
    const deletedPages = idsFrom(previous.deleted?.page)
    const deletedDepartures = idsFrom(previous.deleted?.departures)
    if (pageId !== null && deletedPages.has(idKey(pageId)) === false && !previous.deleted)
      throw new Error(`Previous rollback has no page deletion evidence for ${sourceId}`)
    for (const mediaId of mediaIds) {
      const previousMedia = previousRollbackReport.retainedMedia || []
      const perRecordMedia = previous.retainedMedia || []
      if (![...previousMedia, ...perRecordMedia].some((item) => sameID(item.id, mediaId)))
        throw new Error(`Previous rollback has no retained-media evidence for ${sourceId}/${idKey(mediaId)}`)
      const key = idKey(mediaId)
      const priorSource = mediaSourceById.get(key)
      if (priorSource && priorSource !== sourceId)
        throw new Error(`Media ID ${key} maps to multiple import source IDs`)
      mediaSourceById.set(key, sourceId)
    }
    // These sets are carried into DB preflight so a current row can only ever be
    // treated as a failed prior deletion, never as a new arbitrary target.
    void deletedProducts
    void deletedPages
    void deletedDepartures
    scopeEntries.push({ sourceId, productId, pageId, departureIds, mediaIds })
  }
  if (previousBySource.size !== seenSources.size)
    throw new Error('Previous rollback source set does not exactly match created import source set')

  const retainedMediaIds = new Set(
    (previousRollbackReport.retainedMedia || []).map((item) => idKey(requireID(item.id, 'retainedMedia.id'))),
  )
  return {
    batchId: importReport.batchId,
    siteId: importReport.siteId!,
    importEntries: scopeEntries,
    mediaSourceById,
    retainedMediaIds,
  }
}

const hashFile = async (filePath: string) => {
  const hash = createHash('sha256')
  hash.update(await fs.readFile(filePath))
  return hash.digest('hex')
}

const readJSON = async <T>(filePath: string) => JSON.parse(await fs.readFile(filePath, 'utf8')) as T

const writeExclusiveJSON = async (filePath: string, value: unknown) => {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' })
}

const persistReport = async (filePath: string, report: Record<string, unknown>) => {
  await fs.writeFile(filePath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
}

const findOne = async (payload: Payload, collection: string, id: ID, req: PayloadRequest) => {
  const result = await payload.find({
    collection,
    depth: 0,
    limit: 1,
    pagination: false,
    overrideAccess: true,
    req,
    where: { id: { equals: id } },
  } as never)
  return result.docs?.[0] || null
}

const proofFor = async ({
  payload,
  req,
  collection,
  id,
  reportedDeleted,
  label,
}: {
  payload: Payload
  req: PayloadRequest
  collection: string
  id: ID
  reportedDeleted: Set<string>
  label: string
}) => {
  const document = await findOne(payload, collection, id, req)
  if (document) throw new Error(`Recovery blocked: ${label} ${idKey(id)} still exists in target`)
  return {
    id,
    status: 'absent' as const,
    evidence: reportedDeleted.has(idKey(id)) ? ('previous-report-deleted' as const) : ('absent-in-target' as const),
  }
}

const main = async () => {
  const argv = process.argv.slice(2)
  const readArg = (name: string) => {
    const index = argv.indexOf(`--${name}`)
    return index >= 0 ? argv[index + 1] : undefined
  }
  const has = (name: string) => argv.includes(`--${name}`)
  const importPathArg = readArg('import-result')
  const rollbackPathArg = readArg('rollback-result')
  const outputArg = readArg('output')
  const siteCode = readArg('site-code')
  const adminEmail = readArg('admin-email')
  if (!importPathArg || !rollbackPathArg) throw new Error('Requires --import-result and --rollback-result')
  if (siteCode !== DOICANHVIET_SITE_CODE) throw new Error(`Requires explicit --site-code ${DOICANHVIET_SITE_CODE}`)
  if (has('only') || has('id') || has('product-id') || has('media-id'))
    throw new Error('Recovery does not accept arbitrary IDs; scope is derived from the import report')
  const apply = has('apply')
  if (apply && has('dry-run')) throw new Error('Choose either --dry-run or --apply')
  if (apply && (!adminEmail || !outputArg)) throw new Error('Apply requires --admin-email and --output')
  const importPath = path.resolve(importPathArg)
  const rollbackPath = path.resolve(rollbackPathArg)
  const [importReport, previousRollbackReport] = await Promise.all([
    readJSON<ImportReport>(importPath),
    readJSON<PreviousRollbackReport>(rollbackPath),
  ])
  const scope = buildRecoveryScope({ importReport, previousRollbackReport, importPath })
  const preview = {
    apply,
    batchId: scope.batchId,
    siteCode: DOICANHVIET_SITE_CODE,
    sourceReports: { importResult: importPath, previousRollback: rollbackPath },
    createdRecords: scope.importEntries.length,
    sourceMedia: scope.mediaSourceById.size,
    retainedEvidenceMedia: [...scope.retainedMediaIds].length,
    outputPath: outputArg ? path.resolve(outputArg) : null,
  }
  if (!apply) {
    printLifecycleJSON({ ...preview, dryRun: true, note: 'No database connection or mutation performed' })
    return
  }

  const outputPath = path.resolve(outputArg!)
  const reportHashes = { importResultSha256: await hashFile(importPath), previousRollbackSha256: await hashFile(rollbackPath) }
  const journal: Array<Record<string, unknown>> = []
  const report: Record<string, unknown> = {
    version: 1,
    status: 'reserved',
    apply: true,
    batchId: scope.batchId,
    siteCode: DOICANHVIET_SITE_CODE,
    sourceReports: { importResult: importPath, previousRollback: rollbackPath, ...reportHashes },
    scope: preview,
    journal,
    startedAt: new Date().toISOString(),
  }
  await writeExclusiveJSON(outputPath, report)
  const persist = async (entry: Record<string, unknown>) => {
    journal.push({ at: new Date().toISOString(), ...entry })
    await persistReport(outputPath, { ...report, status: 'in-progress', journal })
  }

  const runtime = await initializePayloadForApply()
  const { payload } = runtime
  try {
    const user = await resolveSuperAdmin(payload, adminEmail!)
    const req = await runtime.createLocalReq({ user }, payload)
    const site = await resolveWingsGoSite(payload, req)
    if (!sameID(site.id, scope.siteId)) throw new Error('Recovery siteId does not match the import report')
    const coreProof: RecoveryCoreProof[] = []
    for (const entry of scope.importEntries) {
      const previous = (previousRollbackReport.records || []).find((record) => record.sourceId === entry.sourceId)!
      const product = await proofFor({ payload, req, collection: 'tour-products', id: entry.productId, reportedDeleted: idsFrom(previous.deleted?.product), label: `${entry.sourceId} product` })
      const page = entry.pageId === null ? null : await proofFor({ payload, req, collection: 'pages', id: entry.pageId, reportedDeleted: idsFrom(previous.deleted?.page), label: `${entry.sourceId} page` })
      const departures = []
      for (const departureId of entry.departureIds)
        departures.push(await proofFor({ payload, req, collection: 'tour-departures', id: departureId, reportedDeleted: idsFrom(previous.deleted?.departures), label: `${entry.sourceId} departure` }))
      coreProof.push({ sourceId: entry.sourceId, product, page, departures })
    }
    const mediaRows: Array<{ id: ID; sourceId: string; action: 'delete' | 'already-absent'; reason?: string }> = []
    for (const [mediaIdKey, sourceId] of scope.mediaSourceById) {
      const mediaId = mediaIdKey
      const media = (await findOne(payload, 'media', mediaId, req)) as Record<string, any> | null
      if (!media) {
        mediaRows.push({ id: mediaId, sourceId, action: 'already-absent' })
        continue
      }
      if (!sameID(media.site, site.id)) throw new Error(`Recovery blocked: media ${mediaIdKey} is not WingsGo-owned`)
      if (typeof media.filename !== 'string' || !media.filename.startsWith(`dcv-${sourceId}-`))
        throw new Error(`Recovery blocked: media ${mediaIdKey} does not match source prefix ${sourceId}`)
      mediaRows.push({ id: mediaId, sourceId, action: 'delete' })
    }
    const referenceIndex = await buildMediaReferenceIndex(payload, req)
    if (referenceIndex.coverage !== 'complete')
      throw new Error(`Recovery blocked: media reference coverage incomplete (${referenceIndex.gaps.join('|')})`)
    const referenced = mediaRows.filter((row) => row.action === 'delete' && referenceIndex.ids.has(idKey(row.id)))
    if (referenced.length)
      throw new Error(`Recovery blocked: source-owned media still referenced (${referenced.map((row) => idKey(row.id)).join(',')})`)
    if ((await hashFile(importPath)) !== reportHashes.importResultSha256 || (await hashFile(rollbackPath)) !== reportHashes.previousRollbackSha256)
      throw new Error('Recovery source reports changed after the exclusive report was reserved')
    await persist({ stage: 'preflight', status: 'verified', siteId: relationID(site.id), coreProof, mediaRows, referenceCoverage: referenceIndex.coverage, referencedMedia: [] })

    const deletedMedia: ID[] = []
    const errors: Array<{ id: ID; error: string }> = []
    for (const row of mediaRows.filter((item) => item.action === 'delete').reverse()) {
      try {
        await payload.delete({ collection: 'media', id: row.id, context: { disableRevalidate: true, import: true, rollbackRecovery: true }, overrideAccess: true, req })
        deletedMedia.push(row.id)
        await persist({ stage: 'delete', status: 'deleted', collection: 'media', id: row.id, sourceId: row.sourceId })
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        errors.push({ id: row.id, error: message })
        await persist({ stage: 'delete', status: 'error', collection: 'media', id: row.id, sourceId: row.sourceId, error: message })
      }
    }
    const finalReport = {
      ...report,
      status: errors.length ? 'partial-failure' : 'ok',
      finishedAt: new Date().toISOString(),
      deleted: { media: deletedMedia },
      alreadyAbsent: mediaRows.filter((row) => row.action === 'already-absent').map((row) => row.id),
      errors,
      coreProof,
      mediaReferenceIndex: { coverage: referenceIndex.coverage, referencedCount: referenceIndex.ids.size, gaps: referenceIndex.gaps },
      journal,
    }
    await persistReport(outputPath, finalReport)
    printLifecycleJSON({ ...finalReport, outputPath })
    if (errors.length) process.exitCode = 1
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    await persistReport(outputPath, {
      ...report,
      status: 'failed',
      finishedAt: new Date().toISOString(),
      error: message,
      journal,
    })
    throw error
  } finally {
    await payload.destroy()
  }
}

main().catch((error) => {
  printLifecycleError(error)
  process.exitCode = 1
})
