import fs from 'node:fs/promises'
import path from 'node:path'

import {
  createLifecyclePlan,
  DOICANHVIET_SITE_CODE,
  initializePayloadForApply,
  printLifecycleError,
  printLifecycleJSON,
  resolveSuperAdmin,
  resolveWingsGoSite,
  sameID,
} from './doicanhviet-lifecycle-safety'

type RestoreAction = {
  collection: 'pages' | 'tour-departures' | 'tour-products'
  id: number | string
  sourceId: string
  data: Record<string, unknown>
}

type PublishReport = {
  apply?: boolean
  batchId?: string
  operation?: string
  siteCode?: string
  status?: string
  restoreActions?: RestoreAction[]
}

const context = { disableRevalidate: true, import: true, rollback: true }
const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error))

const main = async () => {
  const plan = createLifecyclePlan(process.argv.slice(2), 'rollback')
  const file = plan.args.file
  if (typeof file !== 'string' || !file.trim())
    throw new Error('Missing --file <publish-result.json>')

  const reportPath = path.resolve(file)
  const report = JSON.parse(await fs.readFile(reportPath, 'utf8')) as PublishReport
  if (report.operation !== 'publish') throw new Error('Rollback file must be a publish report')
  if (!report.apply) throw new Error('Cannot rollback a publish dry-run report')
  if (report.siteCode !== DOICANHVIET_SITE_CODE) {
    throw new Error(`Publish report must target ${DOICANHVIET_SITE_CODE}`)
  }
  if (!report.batchId || !plan.batchId || report.batchId !== plan.batchId) {
    throw new Error('--batch-id must exactly match the publish report batchId')
  }
  const actions = Array.isArray(report.restoreActions) ? report.restoreActions : []
  if (!actions.length) throw new Error('Publish report contains no restoreActions')

  if (!plan.apply) {
    printLifecycleJSON({
      apply: false,
      batchId: report.batchId,
      operation: 'rollback-publish',
      siteCode: DOICANHVIET_SITE_CODE,
      actions: actions.map(({ collection, id, sourceId, data }) => ({
        collection,
        id,
        sourceId,
        restore: data,
      })),
    })
    return
  }

  const output = plan.args.output
  if (typeof output !== 'string' || !output.trim())
    throw new Error('Publish rollback apply requires explicit --output')
  const outputPath = path.resolve(output)
  const journal: Array<Record<string, unknown>> = []
  const header = {
    version: 1,
    apply: true,
    operation: 'rollback-publish',
    batchId: report.batchId,
    sourcePublishReport: reportPath,
    siteCode: DOICANHVIET_SITE_CODE,
    startedAt: new Date().toISOString(),
  }
  await fs.writeFile(outputPath, `${JSON.stringify({ ...header, status: 'reserved', journal }, null, 2)}\n`, {
    encoding: 'utf8',
    flag: 'wx',
  })
  const persist = async (entry: Record<string, unknown>) => {
    journal.push({ at: new Date().toISOString(), ...entry })
    await fs.writeFile(outputPath, `${JSON.stringify({ ...header, status: 'in-progress', journal }, null, 2)}\n`, 'utf8')
  }

  const runtime = await initializePayloadForApply()
  const { payload } = runtime
  try {
    const user = await resolveSuperAdmin(payload, plan.adminEmail!)
    const req = await runtime.createLocalReq({ user }, payload)
    const site = await resolveWingsGoSite(payload, req)
    const ordered = [...actions].reverse()
    for (const action of ordered) {
      if (!action.sourceId || action.id === undefined || !action.data) {
        throw new Error('Invalid restore action in publish report')
      }
      const current = (await payload.findByID({
        collection: action.collection,
        id: action.id,
        depth: 0,
        overrideAccess: true,
        req,
      })) as Record<string, any>
      if (!sameID(current.site, site.id)) {
        throw new Error(`Publish rollback site safeguard failed: ${action.sourceId}`)
      }
      if (
        action.collection === 'tour-products' &&
        (current.sourceProvenance?.sourceSystem !== 'doicanhviet' ||
          current.sourceProvenance?.importBatchId !== report.batchId)
      ) {
        throw new Error(`Publish rollback provenance safeguard failed: ${action.sourceId}`)
      }
      if (
        action.collection === 'tour-departures' &&
        current.tourProduct === null
      ) {
        throw new Error(`Publish rollback departure relation missing: ${action.sourceId}`)
      }
      await persist({ stage: 'preflight', status: 'verified', collection: action.collection, id: action.id, sourceId: action.sourceId })
    }
    for (const action of ordered) {
      await payload.update({
        collection: action.collection,
        context,
        data: action.data as never,
        id: action.id,
        overrideAccess: true,
        req,
      })
      await persist({ stage: 'rollback', status: 'restored', collection: action.collection, id: action.id, sourceId: action.sourceId })
    }
    const final = {
      ...header,
      status: 'ok',
      actionsRestored: ordered.length,
      finishedAt: new Date().toISOString(),
      journal,
    }
    await fs.writeFile(outputPath, `${JSON.stringify(final, null, 2)}\n`, 'utf8')
    printLifecycleJSON({ ...final, outputPath })
  } catch (error) {
    await fs.writeFile(
      outputPath,
      `${JSON.stringify({ ...header, status: 'failed', error: errorMessage(error), finishedAt: new Date().toISOString(), journal }, null, 2)}\n`,
      'utf8',
    )
    throw error
  } finally {
    await payload.destroy()
  }
}

main().catch((error) => {
  printLifecycleError(error)
  process.exitCode = 1
})
