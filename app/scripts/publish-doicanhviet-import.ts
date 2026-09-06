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
import { sourceTourCode, type NormalizedTour } from './lib/doicanhviet'

const defaultArtifactDir = path.resolve(
  import.meta.dirname,
  '..',
  '..',
  'artifacts',
  'imports',
  'doicanhviet',
)
const context = { disableRevalidate: true, import: true }

const uniqueSections = (sections: unknown[]) => [
  ...new Set(
    sections.filter((value): value is string => typeof value === 'string' && value.length > 0),
  ),
]

const main = async () => {
  const plan = createLifecyclePlan(process.argv.slice(2), 'publish')
  const filePath = path.resolve(
    String(plan.args.file || path.join(defaultArtifactDir, 'tours.normalized.json')),
  )
  const normalized = JSON.parse(await fs.readFile(filePath, 'utf8')) as NormalizedTour[]
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

  const runtime = await initializePayloadForApply()
  const { payload } = runtime
  try {
    const user = await resolveSuperAdmin(payload, plan.adminEmail!)
    const req = await runtime.createLocalReq({ user }, payload)
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
      if (page && !sameID(page.site, site.id))
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

    let pagesPublished = 0
    let productsPublished = 0
    let departuresPublished = 0
    const report: Array<Record<string, unknown>> = []
    for (const { product, record } of plans) {
      const tourCode = sourceTourCode(record.sourceId)
      if (!product) {
        report.push({ sourceId: record.sourceId, status: 'missingProduct', tourCode })
        continue
      }
      if (product.sourceProvenance.sourceId !== record.sourceId)
        throw new Error(`Source provenance mismatch: ${record.sourceId}`)
      await payload.update({
        collection: 'tour-products',
        context,
        data: { _status: 'published' } as never,
        id: product.id,
        overrideAccess: true,
        req,
      })
      productsPublished += 1
      const pageID = relationID(product.wrapperPage)
      const page = pagesByProduct.get(String(product.id))
      if (page && pageID !== null) {
        await payload.update({
          collection: 'pages',
          context,
          data: { _status: 'published', publishedAt: new Date().toISOString() } as never,
          id: pageID,
          overrideAccess: true,
          req,
        })
        pagesPublished += 1
      }
      const departures = (departuresByProduct.get(String(product.id)) || []).sort((left, right) =>
        String(left.id).localeCompare(String(right.id), 'en'),
      )
      for (const departure of departures) {
        await payload.update({
          collection: 'tour-departures',
          context,
          data: { _status: 'published' } as never,
          id: departure.id,
          overrideAccess: true,
          req,
        })
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
    printLifecycleJSON({
      apply: true,
      departuresPublished,
      operation: 'publish',
      pagesPublished,
      productsPublished,
      report,
      selection,
      siteCode: DOICANHVIET_SITE_CODE,
      siteId: relationID(site.id),
    })
  } finally {
    await payload.destroy()
  }
}

main().catch((error) => {
  printLifecycleError(error)
  process.exitCode = 1
})
