import 'dotenv/config'

import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

import config from '../src/payload.config'
import {
  createLocalReq,
  getPayload,
  type Payload,
  type PayloadRequest,
} from 'payload'

import {
  assertCleanupScope,
  assertCleanupPlanRecords,
  buildCleanupPlanRecords,
  classifyCleanupState,
  cleanupAggregateChecksum,
  cleanupChecksum,
  cleanupRelationID,
  cleanupTransitionDecision,
  wingsSideBestPriceCleanupBatchID,
  wingsSideBestPriceCleanupExpectedCount,
  wingsSideBestPriceCleanupSiteCode,
  wingsSideBestPriceTechnicalCopy,
  type CleanupDocument,
  type CleanupPlanRecord,
} from './lib/wingsSideBestPriceCleanup'
import { transitionCleanupAtomically } from './lib/wingsSideBestPriceCleanupRuntime'

type Mode = 'apply' | 'dry-run' | 'rollback'

type CleanupPlan = {
  adapter: { name: string; packageName: string }
  aggregateChecksums: { after: string; before: string }
  batchID: string
  createdAt: string
  expectedCount: number
  mode: Mode
  nestedJSONQuery: { error: null | string; matchesInProcessScope: boolean; supported: boolean }
  noCreates: true
  records: CleanupPlanRecord[]
  runID: string
  schemaChanges: false
  schemaVersion: 1
  siteCode: string
  siteID: number | string
  technicalCopy: typeof wingsSideBestPriceTechnicalCopy
  totals: { changed: number; unchanged: number }
  versionCount: { after: number | null; before: number }
}

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

const whereAnd = (...conditions: Array<Record<string, unknown>>) => ({ and: conditions }) as never

const syntheticAdmin = {
  collection: 'users',
  createdAt: new Date(0).toISOString(),
  email: 'cleanup-dry-run@internal.invalid',
  id: 0,
  role: 'super-admin',
  sites: [],
  updatedAt: new Date(0).toISOString(),
}

const resolveAdmin = async (payload: Payload, mode: Mode) => {
  if (mode === 'dry-run') return syntheticAdmin
  const email = String(argumentValue('--admin-email') || process.env.IMPORT_ADMIN_EMAIL || '').trim()
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
    throw new Error('Cleanup operator must resolve to exactly one super-admin')
  }
  return result.docs[0]
}

const resolveSite = async (payload: Payload, req: PayloadRequest) => {
  const result = await payload.find({
    collection: 'sites',
    depth: 0,
    limit: 2,
    overrideAccess: true,
    pagination: false,
    req,
    where: { code: { equals: wingsSideBestPriceCleanupSiteCode } },
  })
  if (result.docs.length !== 1) {
    throw new Error(`Expected exactly one site ${wingsSideBestPriceCleanupSiteCode}`)
  }
  return result.docs[0]
}

const resolveScope = async (payload: Payload, req: PayloadRequest) => {
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
    where: { site: { equals: site.id } },
  })
  const documents = (siteResult.docs as unknown as CleanupDocument[]).filter(
    (document) =>
      document.sourceProvenance?.importBatchId === wingsSideBestPriceCleanupBatchID,
  )

  let nestedJSONQuery: CleanupPlan['nestedJSONQuery']
  try {
    const nestedResult = await payload.find({
      collection: 'tour-products',
      depth: 0,
      fallbackLocale: false,
      limit: 1000,
      locale: 'en',
      overrideAccess: true,
      pagination: false,
      req,
      where: whereAnd(
        { site: { equals: site.id } },
        {
          'sourceProvenance.importBatchId': {
            equals: wingsSideBestPriceCleanupBatchID,
          },
        },
      ),
    })
    const nestedIDs = nestedResult.docs.map(({ id }) => String(id)).sort()
    const inProcessIDs = documents.map(({ id }) => String(id)).sort()
    nestedJSONQuery = {
      error: null,
      matchesInProcessScope: JSON.stringify(nestedIDs) === JSON.stringify(inProcessIDs),
      supported: true,
    }
  } catch (error) {
    nestedJSONQuery = {
      error: error instanceof Error ? error.message.slice(0, 240) : 'Unknown nested JSON query error',
      matchesInProcessScope: false,
      supported: false,
    }
  }

  const wrapperIDs = documents.map(({ wrapperPage }) => cleanupRelationID(wrapperPage)).filter(
    (id): id is number | string => id !== null,
  )
  const wrappers = wrapperIDs.length
    ? await payload.find({
        collection: 'pages',
        depth: 0,
        limit: 100,
        overrideAccess: true,
        pagination: false,
        req,
        where: { id: { in: wrapperIDs } },
      })
    : { docs: [] }
  const wrapperSiteByID = new Map(
    wrappers.docs.map((page) => [String(page.id), cleanupRelationID(page.site) ?? 'missing']),
  )
  const scoped = assertCleanupScope({
    batchID: wingsSideBestPriceCleanupBatchID,
    documents,
    siteID: site.id,
    wrapperSiteByID,
  })

  return { documents: scoped, nestedJSONQuery, site }
}

const countTargetVersions = async (
  payload: Payload,
  req: PayloadRequest,
  records: CleanupPlanRecord[],
) =>
  (
    await payload.countVersions({
      collection: 'tour-products',
      overrideAccess: true,
      req,
      where: { parent: { in: records.map(({ id }) => id) } },
    })
  ).totalDocs

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

const readPlan = async (filePath: string): Promise<CleanupPlan> => {
  const plan = JSON.parse(await readFile(path.resolve(filePath), 'utf8')) as CleanupPlan
  if (
    plan.schemaVersion !== 1 ||
    plan.mode !== 'dry-run' ||
    plan.batchID !== wingsSideBestPriceCleanupBatchID ||
    plan.siteCode !== wingsSideBestPriceCleanupSiteCode ||
    plan.expectedCount !== wingsSideBestPriceCleanupExpectedCount ||
    plan.noCreates !== true ||
    plan.schemaChanges !== false ||
    plan.records?.length !== wingsSideBestPriceCleanupExpectedCount
  ) {
    throw new Error('Cleanup plan contract mismatch')
  }
  assertCleanupPlanRecords(plan.records)
  if (cleanupChecksum(plan.technicalCopy) !== cleanupChecksum(wingsSideBestPriceTechnicalCopy)) {
    throw new Error('Cleanup plan technical copy contract mismatch')
  }
  if (
    cleanupAggregateChecksum(plan.records, 'before') !== plan.aggregateChecksums.before ||
    cleanupAggregateChecksum(plan.records, 'after') !== plan.aggregateChecksums.after
  ) {
    throw new Error('Cleanup plan checksum mismatch')
  }
  return plan
}

const defaultOutputPath = (mode: Mode) =>
  path.resolve('artifacts', 'cleanup', 'wingsside-bestprice-22', `cleanup-${mode}.json`)

const main = async () => {
  const mode = selectedMode()
  const planPath = argumentValue('--plan')
  if (mode !== 'dry-run' && !planPath) throw new Error(`${mode} requires --plan <report.json>`)

  const payload = await getPayload({ config })
  try {
    const admin = await resolveAdmin(payload, mode)
    const req = await createLocalReq({ user: admin as never }, payload)
    const scope = await resolveScope(payload, req)

    if (mode === 'dry-run') {
      const records = buildCleanupPlanRecords({
        batchID: wingsSideBestPriceCleanupBatchID,
        documents: scope.documents,
        siteID: scope.site.id,
      })
      const versionCountBefore = await countTargetVersions(payload, req, records)
      const report: CleanupPlan = {
        adapter: { name: payload.db.name, packageName: payload.db.packageName },
        aggregateChecksums: {
          after: cleanupAggregateChecksum(records, 'after'),
          before: cleanupAggregateChecksum(records, 'before'),
        },
        batchID: wingsSideBestPriceCleanupBatchID,
        createdAt: new Date().toISOString(),
        expectedCount: wingsSideBestPriceCleanupExpectedCount,
        mode,
        nestedJSONQuery: scope.nestedJSONQuery,
        noCreates: true,
        records,
        runID: randomUUID(),
        schemaChanges: false,
        schemaVersion: 1,
        siteCode: wingsSideBestPriceCleanupSiteCode,
        siteID: scope.site.id,
        technicalCopy: wingsSideBestPriceTechnicalCopy,
        totals: {
          changed: records.filter(({ action }) => action === 'update').length,
          unchanged: records.filter(({ action }) => action === 'unchanged').length,
        },
        versionCount: { after: null, before: versionCountBefore },
      }
      const outputPath = await atomicWriteJSON(argumentValue('--output') || defaultOutputPath(mode), report)
      console.log(JSON.stringify({ outputPath, ...report.totals, nestedJSONQuery: report.nestedJSONQuery }))
      return
    }

    const plan = await readPlan(planPath!)
    if (String(plan.siteID) !== String(scope.site.id)) throw new Error('Resolved site ID drifted from plan')
    const versionCountBefore = await countTargetVersions(payload, req, plan.records)
    if (versionCountBefore !== plan.versionCount.before) {
      throw new Error('Target TourProduct version count drifted from plan')
    }

    const state = classifyCleanupState({
      batchID: wingsSideBestPriceCleanupBatchID,
      documents: scope.documents,
      records: plan.records,
      siteID: scope.site.id,
    })
    const transition = cleanupTransitionDecision(mode, state)
    const resumedState = transition.desiredState
    const resumed = transition.resumed

    if (!resumed) {
      await transitionCleanupAtomically({
        batchID: wingsSideBestPriceCleanupBatchID,
        loadDocuments: async () => (await resolveScope(payload, req)).documents,
        payload,
        records: plan.records,
        req,
        side: mode === 'apply' ? 'after' : 'before',
        siteID: scope.site.id,
      })
    }

    const verifiedScope = await resolveScope(payload, req)
    const verifiedState = classifyCleanupState({
      batchID: wingsSideBestPriceCleanupBatchID,
      documents: verifiedScope.documents,
      records: plan.records,
      siteID: verifiedScope.site.id,
    })
    if (verifiedState !== resumedState && verifiedState !== 'equivalent') {
      throw new Error(`Cleanup ${mode} verification failed with state ${verifiedState}`)
    }
    const versionCountAfter = await countTargetVersions(payload, req, plan.records)
    if (versionCountAfter !== plan.versionCount.before) {
      throw new Error('Cleanup unexpectedly changed target TourProduct version count')
    }

    const report: CleanupPlan & { completedAt: string; resumed: boolean; sourcePlan: string } = {
      ...plan,
      completedAt: new Date().toISOString(),
      mode,
      nestedJSONQuery: verifiedScope.nestedJSONQuery,
      resumed,
      runID: randomUUID(),
      sourcePlan: path.resolve(planPath!),
      versionCount: { after: versionCountAfter, before: plan.versionCount.before },
    }
    const outputPath = await atomicWriteJSON(argumentValue('--output') || defaultOutputPath(mode), report)
    console.log(JSON.stringify({ mode, outputPath, resumed, state: verifiedState, versionCountAfter }))
  } finally {
    await payload.destroy()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
