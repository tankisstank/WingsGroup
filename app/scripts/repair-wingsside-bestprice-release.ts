import 'dotenv/config'

import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

import config from '../src/payload.config'
import { createLocalReq, getPayload, type Payload, type PayloadRequest } from 'payload'

import { buildBestPriceNormalizedTours, type BestPriceNormalizedTour } from './lib/bestprice22'
import {
  assertReleaseRepairPlanRecords,
  assertReleaseRepairScope,
  buildReleaseRepairPlanRecords,
  buildReleaseRepairSourceDesired,
  classifyReleaseRepairState,
  portableSourceChecksum,
  releaseRepairAggregateChecksum,
  releaseRepairChecksum,
  releaseRepairPlanRepresentsOnlyFieldUpdates,
  releaseRepairRelationID,
  releaseRepairTransitionDecision,
  wingsSideBestPriceReleaseRepairBatchID,
  wingsSideBestPriceReleaseRepairExpectedCount,
  wingsSideBestPriceReleaseRepairSiteCode,
  type ReleaseRepairAggregate,
  type ReleaseRepairMedia,
  type ReleaseRepairPlanRecord,
  type ReleaseRepairProduct,
  type ReleaseRepairWrapper,
} from './lib/wingsSideBestPriceReleaseRepair'
import { transitionReleaseRepairAtomically } from './lib/wingsSideBestPriceReleaseRepairRuntime'

type Mode = 'apply' | 'dry-run' | 'rollback'

type ReleaseRepairSourceIdentity = {
  expectedTourCount: number
  manifestBasename: string
  normalizedChecksum: string
  rawBasename: string
  sourceIdsChecksum: string
  sourceSystem: 'bestpricetravel'
}

type ReleaseRepairPlan = {
  adapter: { name: string; packageName: string }
  aggregateChecksums: { after: string; before: string }
  batchID: string
  createdAt: string
  expectedCount: number
  mode: 'dry-run'
  noCreates: true
  noDeletes: true
  records: ReleaseRepairPlanRecord[]
  runID: string
  schemaChanges: false
  schemaVersion: 1
  siteCode: string
  siteID: number | string
  sourceIdentity: ReleaseRepairSourceIdentity
  totals: { changed: number; unchanged: number }
}

const defaultCrawlerRoot = 'E:\\repo\\tour-crawlers'
const defaultManifestPath = path.resolve(
  import.meta.dirname,
  '..',
  '..',
  'output',
  'doc',
  'tour-source-match-20260717.csv',
)
const defaultRawPath = path.join(defaultCrawlerRoot, 'bestprice_tours.json')

const argumentValue = (name: string): string | undefined => {
  const inline = process.argv.find((argument) => argument.startsWith(`${name}=`))
  if (inline) return inline.slice(name.length + 1)
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : undefined
}

const selectedMode = (): Mode => {
  const modes = (['dry-run', 'apply', 'rollback'] as const).filter((mode) =>
    process.argv.includes(`--${mode}`),
  )
  if (modes.length !== 1) throw new Error('Choose exactly one of --dry-run, --apply, or --rollback')
  return modes[0]
}

const syntheticAdmin = {
  collection: 'users',
  createdAt: new Date(0).toISOString(),
  email: 'release-repair-dry-run@internal.invalid',
  id: 0,
  role: 'super-admin',
  sites: [],
  updatedAt: new Date(0).toISOString(),
}

const resolveAdmin = async (payload: Payload, mode: Mode) => {
  if (mode === 'dry-run') return syntheticAdmin
  const email = String(
    argumentValue('--admin-email') || process.env.IMPORT_ADMIN_EMAIL || '',
  ).trim()
  if (!email) throw new Error('Apply and rollback require --admin-email or IMPORT_ADMIN_EMAIL')
  const result = await payload.find({
    collection: 'users',
    depth: 0,
    limit: 2,
    overrideAccess: true,
    pagination: false,
    where: { email: { equals: email } },
  })
  if (result.docs.length !== 1 || result.docs[0].role !== 'super-admin') {
    throw new Error('Release repair operator must resolve to exactly one super-admin')
  }
  return result.docs[0]
}

const resolveSourcePaths = () => {
  const crawlerRoot = String(argumentValue('--crawler-root') || defaultCrawlerRoot)
  const manifestPath = path.resolve(String(argumentValue('--manifest') || defaultManifestPath))
  const rawPath = path.resolve(String(argumentValue('--raw') || defaultRawPath))
  return { crawlerRoot, manifestPath, rawPath }
}

const loadNormalizedTours = async (): Promise<{
  identity: ReleaseRepairSourceIdentity
  tours: BestPriceNormalizedTour[]
  toursBySourceId: Map<string, BestPriceNormalizedTour>
}> => {
  const { crawlerRoot, manifestPath, rawPath } = resolveSourcePaths()
  const { missing, tours } = await buildBestPriceNormalizedTours({
    crawlerRoot,
    manifestPath,
    rawPath,
  })
  if (missing.length) {
    throw new Error(`Missing raw records for ${missing.length} manifest rows`)
  }
  if (tours.length !== wingsSideBestPriceReleaseRepairExpectedCount) {
    throw new Error(
      `Expected ${wingsSideBestPriceReleaseRepairExpectedCount} normalized tours, got ${tours.length}`,
    )
  }

  const sortedSourceIds = tours.map((tour) => tour.sourceId).sort()
  if (new Set(sortedSourceIds).size !== sortedSourceIds.length) {
    throw new Error('Normalized source contains duplicate sourceId values')
  }

  const sourceDesiredList = tours
    .map((tour) => buildReleaseRepairSourceDesired(tour))
    .sort((left, right) => left.sourceId.localeCompare(right.sourceId))

  const identity: ReleaseRepairSourceIdentity = {
    expectedTourCount: wingsSideBestPriceReleaseRepairExpectedCount,
    manifestBasename: path.basename(manifestPath),
    normalizedChecksum: releaseRepairChecksum(sourceDesiredList),
    rawBasename: path.basename(rawPath),
    sourceIdsChecksum: createHash('sha256').update(sortedSourceIds.join('\n')).digest('hex'),
    sourceSystem: 'bestpricetravel',
  }

  return {
    identity,
    tours,
    toursBySourceId: new Map(tours.map((tour) => [tour.sourceId, tour])),
  }
}

const resolveSite = async (payload: Payload, req: PayloadRequest) => {
  const result = await payload.find({
    collection: 'sites',
    depth: 0,
    limit: 2,
    overrideAccess: true,
    pagination: false,
    req,
    where: { code: { equals: wingsSideBestPriceReleaseRepairSiteCode } },
  })
  if (result.docs.length !== 1) {
    throw new Error(`Expected exactly one site ${wingsSideBestPriceReleaseRepairSiteCode}`)
  }
  return result.docs[0]
}

const findByIDs = async <T>(
  payload: Payload,
  req: PayloadRequest,
  collection: 'media' | 'pages',
  ids: Array<number | string>,
): Promise<T[]> => {
  if (!ids.length) return []
  const result = await payload.find({
    collection,
    depth: 0,
    limit: ids.length,
    overrideAccess: true,
    pagination: false,
    req,
    where: { id: { in: ids } },
  })
  if (result.docs.length !== ids.length) {
    throw new Error(`Expected ${ids.length} ${collection} documents, found ${result.docs.length}`)
  }
  return result.docs as unknown as T[]
}

const resolveAggregates = async (
  payload: Payload,
  req: PayloadRequest,
  toursBySourceId: Map<string, BestPriceNormalizedTour>,
): Promise<{ aggregates: ReleaseRepairAggregate[]; siteID: number | string }> => {
  const site = await resolveSite(payload, req)
  const siteResult = await payload.find({
    collection: 'tour-products',
    depth: 0,
    fallbackLocale: false,
    limit: 1000,
    locale: 'en',
    overrideAccess: true,
    pagination: false,
    req,
    where: {
      and: [
        { site: { equals: site.id } },
        {
          'sourceProvenance.importBatchId': {
            equals: wingsSideBestPriceReleaseRepairBatchID,
          },
        },
      ],
    },
  })

  const products = siteResult.docs as unknown as ReleaseRepairProduct[]

  if (products.length !== wingsSideBestPriceReleaseRepairExpectedCount) {
    throw new Error(
      `Expected ${wingsSideBestPriceReleaseRepairExpectedCount} batch products, found ${products.length}`,
    )
  }

  const wrapperIDs = products.map((product) => {
    const id = releaseRepairRelationID(product.wrapperPage)
    if (id === null) throw new Error(`TourProduct ${product.id} has no wrapperPage`)
    return id
  })
  const heroIDs = products.map((product) => {
    const id = releaseRepairRelationID(product.heroMedia)
    if (id === null) throw new Error(`TourProduct ${product.id} has no heroMedia`)
    return id
  })

  const wrappers = await findByIDs<ReleaseRepairWrapper>(payload, req, 'pages', wrapperIDs)
  const heroes = await findByIDs<ReleaseRepairMedia>(payload, req, 'media', heroIDs)
  const wrapperByID = new Map(wrappers.map((wrapper) => [String(wrapper.id), wrapper]))
  const heroByID = new Map(heroes.map((hero) => [String(hero.id), hero]))

  const aggregates: ReleaseRepairAggregate[] = products.map((product) => {
    const sourceId = product.sourceProvenance?.sourceId
    if (typeof sourceId !== 'string' && typeof sourceId !== 'number') {
      throw new Error(`TourProduct ${product.id} is missing sourceProvenance.sourceId`)
    }
    const normalized = toursBySourceId.get(String(sourceId))
    if (!normalized) {
      throw new Error(
        `TourProduct ${product.id} has no matching normalized source ${String(sourceId)}`,
      )
    }
    const wrapperPageID = releaseRepairRelationID(product.wrapperPage)
    const heroMediaID = releaseRepairRelationID(product.heroMedia)
    const wrapper = wrapperPageID === null ? undefined : wrapperByID.get(String(wrapperPageID))
    const hero = heroMediaID === null ? undefined : heroByID.get(String(heroMediaID))
    if (!wrapper)
      throw new Error(`TourProduct ${product.id} wrapper ${String(wrapperPageID)} missing`)
    if (!hero) throw new Error(`TourProduct ${product.id} hero ${String(heroMediaID)} missing`)
    return { hero, normalized, product, wrapper }
  })

  return {
    aggregates: assertReleaseRepairScope({
      aggregates,
      batchID: wingsSideBestPriceReleaseRepairBatchID,
      expectedCount: wingsSideBestPriceReleaseRepairExpectedCount,
      siteID: site.id,
    }),
    siteID: site.id,
  }
}

const buildSourceIdentityFromRecords = (
  records: ReleaseRepairPlanRecord[],
  basenames: { manifestBasename: string; rawBasename: string },
): ReleaseRepairSourceIdentity => {
  const sortedSourceIds = records.map((record) => record.sourceId).sort()
  const sourceDesiredList = [...records]
    .map((record) => record.sourceDesired)
    .sort((left, right) => left.sourceId.localeCompare(right.sourceId))
  return {
    expectedTourCount: wingsSideBestPriceReleaseRepairExpectedCount,
    manifestBasename: basenames.manifestBasename,
    normalizedChecksum: releaseRepairChecksum(sourceDesiredList),
    rawBasename: basenames.rawBasename,
    sourceIdsChecksum: createHash('sha256').update(sortedSourceIds.join('\n')).digest('hex'),
    sourceSystem: 'bestpricetravel',
  }
}

const assertSourceIdentityMatch = (
  planIdentity: ReleaseRepairSourceIdentity,
  liveIdentity: ReleaseRepairSourceIdentity,
) => {
  if (
    planIdentity.expectedTourCount !== liveIdentity.expectedTourCount ||
    planIdentity.sourceSystem !== liveIdentity.sourceSystem ||
    planIdentity.sourceIdsChecksum !== liveIdentity.sourceIdsChecksum ||
    planIdentity.normalizedChecksum !== liveIdentity.normalizedChecksum ||
    planIdentity.manifestBasename !== liveIdentity.manifestBasename ||
    planIdentity.rawBasename !== liveIdentity.rawBasename
  ) {
    throw new Error('Normalized source identity drifted from plan')
  }
}

const atomicWriteJSON = async (filePath: string, value: unknown) => {
  const resolved = path.resolve(filePath)
  const temporary = `${resolved}.${process.pid}.${Date.now()}.tmp`
  await mkdir(path.dirname(resolved), { recursive: true })
  try {
    await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
    await rename(temporary, resolved)
  } catch (error) {
    await rm(temporary, { force: true })
    throw error
  }
  return resolved
}

const readPlan = async (filePath: string): Promise<ReleaseRepairPlan> => {
  const plan = JSON.parse(await readFile(path.resolve(filePath), 'utf8')) as ReleaseRepairPlan
  if (
    plan.schemaVersion !== 1 ||
    plan.mode !== 'dry-run' ||
    plan.batchID !== wingsSideBestPriceReleaseRepairBatchID ||
    plan.siteCode !== wingsSideBestPriceReleaseRepairSiteCode ||
    plan.expectedCount !== wingsSideBestPriceReleaseRepairExpectedCount ||
    plan.noCreates !== true ||
    plan.noDeletes !== true ||
    plan.schemaChanges !== false ||
    plan.records?.length !== wingsSideBestPriceReleaseRepairExpectedCount
  ) {
    throw new Error('Release repair plan contract mismatch')
  }
  assertReleaseRepairPlanRecords(plan.records)
  if (!releaseRepairPlanRepresentsOnlyFieldUpdates(plan.records)) {
    throw new Error('Release repair plan contains non-field update paths')
  }
  if (
    releaseRepairAggregateChecksum(plan.records, 'before') !== plan.aggregateChecksums.before ||
    releaseRepairAggregateChecksum(plan.records, 'after') !== plan.aggregateChecksums.after
  ) {
    throw new Error('Release repair plan aggregate checksum mismatch')
  }

  const derivedIdentity = buildSourceIdentityFromRecords(plan.records, {
    manifestBasename: plan.sourceIdentity.manifestBasename,
    rawBasename: plan.sourceIdentity.rawBasename,
  })
  if (releaseRepairChecksum(derivedIdentity) !== releaseRepairChecksum(plan.sourceIdentity)) {
    throw new Error('Release repair plan source identity mismatch')
  }

  return plan
}

const summaryLog = (value: Record<string, unknown>) => {
  console.log(JSON.stringify(value))
}

const main = async () => {
  const mode = selectedMode()
  const planPath = argumentValue('--plan')
  if (!planPath) throw new Error(`${mode} requires --plan <path>`)

  summaryLog({ mode, phase: 'payload:init:start' })
  const payload = await getPayload({ config })
  try {
    summaryLog({ adapter: payload.db.packageName, mode, phase: 'payload:init:done' })
    const admin = await resolveAdmin(payload, mode)
    const req = await createLocalReq({ user: admin as never }, payload)

    summaryLog({ mode, phase: 'source:load:start' })
    const source = await loadNormalizedTours()
    summaryLog({ mode, phase: 'source:load:done', tourCount: source.tours.length })
    summaryLog({ mode, phase: 'scope:load:start' })
    const scope = await resolveAggregates(payload, req, source.toursBySourceId)
    summaryLog({ mode, phase: 'scope:load:done', recordCount: scope.aggregates.length })

    if (mode === 'dry-run') {
      const records = buildReleaseRepairPlanRecords({
        aggregates: scope.aggregates,
        batchID: wingsSideBestPriceReleaseRepairBatchID,
        expectedCount: wingsSideBestPriceReleaseRepairExpectedCount,
        siteID: scope.siteID,
      })
      assertReleaseRepairPlanRecords(records)
      if (!releaseRepairPlanRepresentsOnlyFieldUpdates(records)) {
        throw new Error('Release repair dry-run produced non-field update paths')
      }

      const plan: ReleaseRepairPlan = {
        adapter: { name: payload.db.name, packageName: payload.db.packageName },
        aggregateChecksums: {
          after: releaseRepairAggregateChecksum(records, 'after'),
          before: releaseRepairAggregateChecksum(records, 'before'),
        },
        batchID: wingsSideBestPriceReleaseRepairBatchID,
        createdAt: new Date().toISOString(),
        expectedCount: wingsSideBestPriceReleaseRepairExpectedCount,
        mode: 'dry-run',
        noCreates: true,
        noDeletes: true,
        records,
        runID: randomUUID(),
        schemaChanges: false,
        schemaVersion: 1,
        siteCode: wingsSideBestPriceReleaseRepairSiteCode,
        siteID: scope.siteID,
        sourceIdentity: source.identity,
        totals: {
          changed: records.filter(({ action }) => action === 'update').length,
          unchanged: records.filter(({ action }) => action === 'unchanged').length,
        },
      }

      const outputPath = await atomicWriteJSON(planPath, plan)
      summaryLog({
        mode,
        outputPath,
        recordCount: plan.records.length,
        siteCode: plan.siteCode,
        totals: plan.totals,
        writes: 0,
      })
      return
    }

    const plan = await readPlan(planPath)
    if (String(plan.siteID) !== String(scope.siteID)) {
      throw new Error('Resolved site ID drifted from plan')
    }
    assertSourceIdentityMatch(plan.sourceIdentity, source.identity)

    const freshRecords = buildReleaseRepairPlanRecords({
      aggregates: scope.aggregates,
      batchID: wingsSideBestPriceReleaseRepairBatchID,
      expectedCount: wingsSideBestPriceReleaseRepairExpectedCount,
      siteID: scope.siteID,
    })
    const planByID = new Map(plan.records.map((record) => [String(record.id), record]))
    for (const fresh of freshRecords) {
      const planned = planByID.get(String(fresh.id))
      if (!planned) throw new Error(`Fresh aggregate ${fresh.id} is missing from plan`)
      if (
        planned.scopeChecksum !== fresh.scopeChecksum ||
        planned.provenanceChecksum !== fresh.provenanceChecksum ||
        planned.sourceChecksum !== fresh.sourceChecksum ||
        planned.afterChecksum !== fresh.afterChecksum ||
        String(planned.wrapperPageID) !== String(fresh.wrapperPageID) ||
        String(planned.heroMediaID) !== String(fresh.heroMediaID)
      ) {
        throw new Error(`Plan record ${fresh.id} drifted from fresh aggregates/source`)
      }
    }

    const state = classifyReleaseRepairState({
      aggregates: scope.aggregates,
      batchID: wingsSideBestPriceReleaseRepairBatchID,
      records: plan.records,
      siteID: scope.siteID,
    })
    const transition = releaseRepairTransitionDecision(mode, state)
    summaryLog({
      mode,
      phase: 'preflight',
      recordCount: plan.records.length,
      resumed: transition.resumed,
      state,
    })

    if (!transition.resumed) {
      await transitionReleaseRepairAtomically({
        batchID: wingsSideBestPriceReleaseRepairBatchID,
        loadAggregates: async () => {
          const liveSource = await loadNormalizedTours()
          assertSourceIdentityMatch(plan.sourceIdentity, liveSource.identity)
          return (await resolveAggregates(payload, req, liveSource.toursBySourceId)).aggregates
        },
        payload,
        records: plan.records,
        req,
        side: mode === 'apply' ? 'after' : 'before',
        siteID: scope.siteID,
      })
    }

    const verifiedSource = await loadNormalizedTours()
    assertSourceIdentityMatch(plan.sourceIdentity, verifiedSource.identity)
    const verifiedScope = await resolveAggregates(payload, req, verifiedSource.toursBySourceId)
    const verifiedState = classifyReleaseRepairState({
      aggregates: verifiedScope.aggregates,
      batchID: wingsSideBestPriceReleaseRepairBatchID,
      records: plan.records,
      siteID: verifiedScope.siteID,
    })
    if (verifiedState !== transition.desiredState && verifiedState !== 'equivalent') {
      throw new Error(`Release repair ${mode} verification failed with state ${verifiedState}`)
    }

    summaryLog({
      mode,
      recordCount: plan.records.length,
      resumed: transition.resumed,
      state: verifiedState,
      writes: transition.resumed ? 0 : 'committed',
    })
  } finally {
    summaryLog({ mode, phase: 'payload:destroy:start' })
    await payload.destroy()
    summaryLog({ mode, phase: 'payload:destroy:done' })
  }
}

void main().then(
  () => process.exit(0),
  (error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  },
)
