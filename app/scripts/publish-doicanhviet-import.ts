import fs from 'node:fs/promises'
import path from 'node:path'

import {
  applySelection,
  createLifecyclePlan,
  DOICANHVIET_SITE_CODE,
  initializePayloadForApply,
  printLifecycleError,
  printLifecycleJSON,
  relationID,
  resolveSuperAdmin,
  resolveWingsGoSite,
  sameID,
} from './doicanhviet-lifecycle-safety'
import { sourceTourCode } from './lib/doicanhviet'
import { parseInputEnvelope } from './import-doicanhviet'

const defaultArtifactDir = path.resolve(
  import.meta.dirname,
  '..',
  '..',
  'artifacts',
  'imports',
  'doicanhviet',
)
const context = { disableRevalidate: true, import: true }

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error))

type RestoreAction = {
  collection: 'pages' | 'tour-departures' | 'tour-products'
  id: number | string
  sourceId: string
  data: Record<string, unknown>
}

const main = async () => {
  const plan = createLifecyclePlan(process.argv.slice(2), 'publish')
  const filePath = path.resolve(
    String(plan.args.file || path.join(defaultArtifactDir, 'tours.normalized.json')),
  )
  const normalized = parseInputEnvelope(JSON.parse(await fs.readFile(filePath, 'utf8'))).records
  const selected = normalized
    .filter((record) => record.kind === 'tour')
    .filter((record) => plan.only.size === 0 || plan.only.has(record.sourceId))
    .filter(
      (record) =>
        record.blockingErrors.length === 0 &&
        Boolean(record.market) &&
        record.itineraryDays.length > 0,
    )
    .sort((left, right) => left.sourceId.localeCompare(right.sourceId, 'en', { numeric: true }))
  const selection = applySelection(plan)
  if (!selected.length) throw new Error('No eligible tours found for lifecycle selection')

  if (!plan.apply) {
    printLifecycleJSON({
      apply: false,
      operation: 'publish',
      records: selected.map((record) => ({
        sourceId: record.sourceId,
        status: 'would-publish',
        tourCode: sourceTourCode(record.sourceId),
      })),
      requiresExplicitOnlyOnApply: selection.sourceIds.length === 0,
      selection,
      siteCode: DOICANHVIET_SITE_CODE,
    })
    return
  }

  const outputArg = plan.args.output
  if (typeof outputArg !== 'string' || !outputArg.trim())
    throw new Error('Publish apply requires explicit --output')
  const batchId = plan.batchId
  if (!batchId) throw new Error('Publish apply requires --batch-id')
  const outputPath = path.resolve(outputArg)
  const journal: Array<Record<string, unknown>> = []
  const restoreActions: RestoreAction[] = []
  const reportBase: Record<string, unknown> = {
    version: 1,
    status: 'reserved',
    apply: true,
    batchId,
    operation: 'publish',
    siteCode: DOICANHVIET_SITE_CODE,
    sourceInput: filePath,
    selection,
    startedAt: new Date().toISOString(),
    journal,
  }
  await fs.writeFile(outputPath, `${JSON.stringify(reportBase, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' })
  const persist = async (entry: Record<string, unknown>) => {
    journal.push({ at: new Date().toISOString(), ...entry })
    await fs.writeFile(
      outputPath,
      `${JSON.stringify({ ...reportBase, status: 'in-progress', journal, restoreActions }, null, 2)}\n`,
      'utf8',
    )
  }

  const runtime = await initializePayloadForApply()
  const { payload } = runtime
  let req: any
  try {
    const user = await resolveSuperAdmin(payload, plan.adminEmail!)
    req = await runtime.createLocalReq({ user }, payload)
    const site = await resolveWingsGoSite(payload, req)
    const tourCodes = selected.map((record) => sourceTourCode(record.sourceId))
    const productsResult = await payload.find({
      collection: 'tour-products',
      depth: 0,
      pagination: false,
      overrideAccess: true,
      req,
      where: { and: [{ site: { equals: site.id } }, { tourCode: { in: tourCodes } }] },
    })
    const products = new Map<string, any>()
    for (const product of productsResult.docs as Array<Record<string, any>>) {
      if (
        product.sourceProvenance?.sourceSystem !== 'doicanhviet' ||
        !sameID(product.site, site.id)
      ) {
        throw new Error(`Product provenance/site safeguard failed: ${product.tourCode}`)
      }
      products.set(String(product.tourCode), product)
    }
    const plans = selected.map((record) => ({
      record,
      product: products.get(sourceTourCode(record.sourceId)) || null,
    }))
    const missingProducts = plans.filter((item) => !item.product).map((item) => item.record.sourceId)
    if (missingProducts.length)
      throw new Error(`Publish preflight missing products: ${missingProducts.join(',')}`)
    for (const { product, record } of plans) {
      if (product.sourceProvenance.importBatchId !== batchId)
        throw new Error(`Publish batch provenance mismatch: ${record.sourceId}`)
    }
    const pagesByProduct = new Map<string, any | null>()
    for (const { product, record } of plans) {
      if (!product) continue
      const pageID = relationID(product.wrapperPage)
      const page =
        pageID === null
          ? null
          : await payload.findByID({
              collection: 'pages',
              id: pageID,
              depth: 0,
              overrideAccess: true,
              req,
            })
      if (!page || !sameID(page.site, site.id))
        throw new Error(`Page site mismatch: ${record.sourceId}`)
      pagesByProduct.set(String(product.id), page)
    }
    const productIDs = plans.filter((item) => item.product).map((item) => item.product.id)
    const departuresResult = productIDs.length
      ? await payload.find({
          collection: 'tour-departures',
          depth: 0,
          pagination: false,
          overrideAccess: true,
          req,
          where: { and: [{ site: { equals: site.id } }, { tourProduct: { in: productIDs } }] },
        })
      : { docs: [] }
    const departuresByProduct = new Map<string, any[]>()
    for (const departure of departuresResult.docs as Array<Record<string, any>>) {
      const key = String(relationID(departure.tourProduct))
      const entries = departuresByProduct.get(key) || []
      entries.push(departure)
      departuresByProduct.set(key, entries)
    }

    const invalidDepartures = departuresResult.docs.filter(
      (departure: Record<string, any>) =>
        !sameID(departure.site, site.id) || !plans.some(({ product }) => sameID(product.id, departure.tourProduct)),
    )
    if (invalidDepartures.length) throw new Error('Publish preflight found a departure outside the selected WingsGo batch')
    await persist({ stage: 'preflight', status: 'verified', products: plans.length, departures: departuresResult.docs.length })

    let pagesPublished = 0
    let productsPublished = 0
    let departuresPublished = 0
    const report: Array<Record<string, unknown>> = []
    for (const { product, record } of plans) {
      const tourCode = sourceTourCode(record.sourceId)
      if (product.sourceProvenance.sourceId !== record.sourceId)
        throw new Error(`Source provenance mismatch: ${record.sourceId}`)
      restoreActions.push({
        collection: 'tour-products',
        id: product.id,
        sourceId: record.sourceId,
        data: { _status: product._status ?? null },
      })
      await payload.update({
        collection: 'tour-products',
        context,
        data: { _status: 'published' } as never,
        id: product.id,
        overrideAccess: true,
        req,
      })
      await persist({ stage: 'publish', status: 'updated', collection: 'tour-products', id: product.id, sourceId: record.sourceId })
      productsPublished += 1
      const pageID = relationID(product.wrapperPage)
      const page = pagesByProduct.get(String(product.id))
      if (page && pageID !== null) {
        restoreActions.push({
          collection: 'pages',
          id: pageID,
          sourceId: record.sourceId,
          data: { _status: page._status ?? null, publishedAt: page.publishedAt ?? null },
        })
        await payload.update({
          collection: 'pages',
          context,
          data: { _status: 'published', publishedAt: new Date().toISOString() } as never,
          id: pageID,
          overrideAccess: true,
          req,
        })
        await persist({ stage: 'publish', status: 'updated', collection: 'pages', id: pageID, sourceId: record.sourceId })
        pagesPublished += 1
      }
      const departures = (departuresByProduct.get(String(product.id)) || []).sort((left, right) =>
        String(left.id).localeCompare(String(right.id), 'en'),
      )
      for (const departure of departures) {
        restoreActions.push({
          collection: 'tour-departures',
          id: departure.id,
          sourceId: record.sourceId,
          data: { _status: departure._status ?? null },
        })
        await payload.update({
          collection: 'tour-departures',
          context,
          data: { _status: 'published' } as never,
          id: departure.id,
          overrideAccess: true,
          req,
        })
        await persist({ stage: 'publish', status: 'updated', collection: 'tour-departures', id: departure.id, sourceId: record.sourceId })
        departuresPublished += 1
      }
      report.push({
        sourceId: record.sourceId,
        status: 'published',
        productId: product.id,
        pageId: pageID,
        tourCode,
      })
    }
    const finalReport = {
      apply: true,
      batchId,
      departuresPublished,
      operation: 'publish',
      pagesPublished,
      productsPublished,
      report,
      selection,
      siteCode: DOICANHVIET_SITE_CODE,
      siteId: relationID(site.id),
      status: 'ok',
      finishedAt: new Date().toISOString(),
      journal,
      restoreActions,
    }
    await fs.writeFile(outputPath, `${JSON.stringify({ ...reportBase, ...finalReport }, null, 2)}\n`, 'utf8')
    printLifecycleJSON({ ...finalReport, outputPath })
  } catch (error) {
    const rollbackErrors: string[] = []
    for (const action of [...restoreActions].reverse()) {
      try {
        await payload.update({ collection: action.collection, id: action.id, context, data: action.data as never, overrideAccess: true, req } as never)
        await persist({
          stage: 'rollback',
          status: 'restored',
          collection: action.collection,
          id: action.id,
          sourceId: action.sourceId,
        })
      } catch (rollbackError) {
        rollbackErrors.push(`${action.collection}:${action.id}:${errorMessage(rollbackError)}`)
        await persist({
          stage: 'rollback',
          status: 'error',
          collection: action.collection,
          id: action.id,
          sourceId: action.sourceId,
          error: errorMessage(rollbackError),
        })
      }
    }
    await fs.writeFile(
      outputPath,
      `${JSON.stringify(
        {
          ...reportBase,
          status: rollbackErrors.length ? 'partial-failure' : 'rolled-back',
          error: errorMessage(error),
          rollbackErrors,
          finishedAt: new Date().toISOString(),
          journal,
          restoreActions,
        },
        null,
        2,
      )}\n`,
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
