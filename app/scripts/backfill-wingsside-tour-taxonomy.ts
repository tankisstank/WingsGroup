import 'dotenv/config'

import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { createLocalReq, getPayload, type Payload, type PayloadRequest } from 'payload'

import config from '../src/payload.config'
import {
  assertTourTaxonomyPlanRecords,
  assertTourTaxonomyScope,
  buildTourTaxonomyPlanRecords,
  classifyTourTaxonomyState,
  taxonomyChecksum,
  taxonomyRelationID,
  wingsSideTourTaxonomyBatchID,
  wingsSideTourTaxonomyExpectedCount,
  wingsSideTourTaxonomyMappingRevision,
  wingsSideTourTaxonomySiteCode,
  type TourTaxonomyDocument,
  type TourTaxonomyPlanRecord,
} from './lib/wingsSideTourTaxonomy'
import { transitionTourTaxonomy } from './lib/wingsSideTourTaxonomyRuntime'
import {
  assertTourTaxonomyWriteGate,
  parseTourTaxonomyCLIArgs,
} from './lib/wingsSideTourTaxonomyWriteGate'

type Mode = 'apply' | 'dry-run' | 'rollback'

type TaxonomyPlan = {
  adapter: { name: string; packageName: string }
  aggregateChecksums: { after: string; before: string }
  batchID: string
  createdAt: string
  expectedCount: number
  mappingRevision: string
  mode: Mode
  productionMutation: false
  records: TourTaxonomyPlanRecord[]
  runID: string
  schemaVersion: 1
  siteCode: string
  siteID: number | string
  totals: { changed: number; unchanged: number }
  validation: {
    conflicts: string[]
    exceptions: string[]
    missingMappings: string[]
    missingRecords: string[]
  }
}

const cliArgs = parseTourTaxonomyCLIArgs(process.argv.slice(2))

const selectedMode = (): Mode => {
  const modes = (['dry-run', 'apply', 'rollback'] as const).filter((mode) =>
    process.argv.includes(`--${mode}`),
  )
  if (modes.length !== 1) throw new Error('Choose exactly one: --dry-run, --apply, --rollback')
  return modes[0]
}

const syntheticAdmin = {
  collection: 'users',
  createdAt: new Date(0).toISOString(),
  email: 'taxonomy-dry-run@internal.invalid',
  id: 0,
  role: 'super-admin',
  sites: [],
  updatedAt: new Date(0).toISOString(),
}

const resolveAdmin = async (payload: Payload, mode: Mode) => {
  if (mode === 'dry-run') return syntheticAdmin
  const email = String(
    cliArgs.adminEmail || process.env.IMPORT_ADMIN_EMAIL || '',
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
    throw new Error('Taxonomy operator must resolve to exactly one super-admin')
  }
  return result.docs[0]
}

const resolveScope = async (payload: Payload, req: PayloadRequest) => {
  const sites = await payload.find({
    collection: 'sites',
    depth: 0,
    limit: 2,
    overrideAccess: true,
    pagination: false,
    req,
    where: { code: { equals: wingsSideTourTaxonomySiteCode } },
  })
  if (sites.docs.length !== 1) {
    throw new Error(`Expected exactly one site ${wingsSideTourTaxonomySiteCode}`)
  }
  const site = sites.docs[0]
  const products = await payload.find({
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
  const documents = (products.docs as unknown as TourTaxonomyDocument[]).filter(
    (document) => document.sourceProvenance?.importBatchId === wingsSideTourTaxonomyBatchID,
  )
  const wrapperIDs = documents
    .map(({ wrapperPage }) => taxonomyRelationID(wrapperPage))
    .filter((id): id is number | string => id !== null)
  const wrappers = await payload.find({
    collection: 'pages',
    depth: 0,
    limit: 100,
    overrideAccess: true,
    pagination: false,
    req,
    where: { id: { in: wrapperIDs } },
  })
  const wrapperSiteByID = new Map(
    wrappers.docs.map((page) => [String(page.id), taxonomyRelationID(page.site)!]),
  )
  return {
    documents: assertTourTaxonomyScope({
      documents,
      siteID: site.id,
      wrapperSiteByID,
    }),
    site,
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

const readPlan = async (filePath: string): Promise<TaxonomyPlan> => {
  const plan = JSON.parse(await readFile(path.resolve(filePath), 'utf8')) as TaxonomyPlan
  if (
    plan.schemaVersion !== 1 ||
    plan.mode !== 'dry-run' ||
    plan.batchID !== wingsSideTourTaxonomyBatchID ||
    plan.siteCode !== wingsSideTourTaxonomySiteCode ||
    plan.expectedCount !== wingsSideTourTaxonomyExpectedCount ||
    plan.mappingRevision !== wingsSideTourTaxonomyMappingRevision ||
    plan.productionMutation !== false
  ) {
    throw new Error('Taxonomy plan contract mismatch')
  }
  assertTourTaxonomyPlanRecords(plan.records)
  if (
    taxonomyChecksum(plan.records.map(({ before }) => before)) !== plan.aggregateChecksums.before ||
    taxonomyChecksum(plan.records.map(({ after }) => after)) !== plan.aggregateChecksums.after
  ) {
    throw new Error('Taxonomy aggregate checksum mismatch')
  }
  return plan
}

const defaultOutputPath = (mode: Mode) =>
  path.resolve('artifacts', 'taxonomy', 'wingsside-bestprice-22', `taxonomy-${mode}.json`)

const main = async () => {
  const mode = selectedMode()
  const writeGate = assertTourTaxonomyWriteGate({ args: cliArgs, mode })
  const planPath = cliArgs.planPath
  if (mode !== 'dry-run' && !planPath) throw new Error(`${mode} requires --plan <report.json>`)

  const payload = await getPayload({ config })
  try {
    const admin = await resolveAdmin(payload, mode)
    const req = await createLocalReq({ user: admin as never }, payload)
    req.context = {
      ...req.context,
      disableRevalidate: true,
      releaseRemediation: mode !== 'dry-run',
    }
    const scope = await resolveScope(payload, req)

    if (mode === 'dry-run') {
      const records = buildTourTaxonomyPlanRecords(scope.documents)
      const report: TaxonomyPlan = {
        adapter: { name: payload.db.name, packageName: payload.db.packageName },
        aggregateChecksums: {
          after: taxonomyChecksum(records.map(({ after }) => after)),
          before: taxonomyChecksum(records.map(({ before }) => before)),
        },
        batchID: wingsSideTourTaxonomyBatchID,
        createdAt: new Date().toISOString(),
        expectedCount: wingsSideTourTaxonomyExpectedCount,
        mappingRevision: wingsSideTourTaxonomyMappingRevision,
        mode,
        productionMutation: false,
        records,
        runID: randomUUID(),
        schemaVersion: 1,
        siteCode: wingsSideTourTaxonomySiteCode,
        siteID: scope.site.id,
        totals: {
          changed: records.filter(({ action }) => action === 'update').length,
          unchanged: records.filter(({ action }) => action === 'unchanged').length,
        },
        validation: {
          conflicts: [],
          exceptions: [],
          missingMappings: [],
          missingRecords: [],
        },
      }
      const outputPath = await atomicWriteJSON(
        cliArgs.outputPath || defaultOutputPath(mode),
        report,
      )
      console.log(JSON.stringify({ outputPath, ...report.totals, validation: report.validation }))
      return
    }

    const plan = await readPlan(planPath!)
    if (String(plan.siteID) !== String(scope.site.id)) {
      throw new Error('Resolved site ID drifted from taxonomy plan')
    }
    const loadDocuments = async () => (await resolveScope(payload, req)).documents
    const result = await transitionTourTaxonomy({
      loadDocuments,
      payload,
      records: plan.records,
      req,
      side: mode === 'apply' ? 'after' : 'before',
    })
    const verifiedState = classifyTourTaxonomyState({
      documents: await loadDocuments(),
      records: plan.records,
    })
    const report = {
      ...plan,
      completedAt: new Date().toISOString(),
      deployment: {
        backupSha256: cliArgs.backupSha256 || null,
        environment: writeGate.environment,
        releaseSha: cliArgs.releaseSha || null,
        rollbackRelease: cliArgs.rollbackRelease || null,
      },
      mode,
      productionMutation: writeGate.productionMutation,
      resumed: result.resumed,
      runID: randomUUID(),
      sourcePlan: path.resolve(planPath!),
      verifiedState,
    }
    const outputPath = await atomicWriteJSON(
      cliArgs.outputPath || defaultOutputPath(mode),
      report,
    )
    console.log(JSON.stringify({ mode, outputPath, resumed: result.resumed, verifiedState }))
  } finally {
    await payload.destroy()
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
