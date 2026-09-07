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

const main = async () => {
  const plan = createLifecyclePlan(process.argv.slice(2), 'contact-only')
  const filePath = path.resolve(
    String(plan.args.file || path.join(defaultArtifactDir, 'tours.normalized.json')),
  )
  const normalized = parseInputEnvelope(JSON.parse(await fs.readFile(filePath, 'utf8'))).records
  const today = new Date()
  const threshold = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  const selected = normalized
    .filter((record) => record.kind === 'tour')
    .filter((record) => plan.only.size === 0 || plan.only.has(record.sourceId))
    .filter(
      (record) =>
        record.blockingErrors.length === 0 &&
        Boolean(record.market) &&
        record.itineraryDays.length > 0,
    )
    .filter(
      (record) =>
        !record.departures.some((departure) => {
          if (!departure.departureDate) return false
          const date = new Date(departure.departureDate)
          if (Number.isNaN(date.getTime())) return false
          return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) >= threshold
        }),
    )
    .sort((left, right) => left.sourceId.localeCompare(right.sourceId, 'en', { numeric: true }))
  const selection = applySelection(plan)
  if (!selected.length)
    throw new Error('No eligible contact-only tours found for lifecycle selection')

  if (!plan.apply) {
    printLifecycleJSON({
      apply: false,
      operation: 'contact-only',
      records: selected.map((record) => ({
        sourceId: record.sourceId,
        status: 'would-publish-contact-only',
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
    const productsResult = await payload.find({
      collection: 'tour-products',
      depth: 0,
      pagination: false,
      overrideAccess: true,
      req,
      where: {
        and: [
          { site: { equals: site.id } },
          { tourCode: { in: selected.map((record) => sourceTourCode(record.sourceId)) } },
        ],
      },
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
    const report: Array<Record<string, unknown>> = []
    for (const { product, record } of plans) {
      const tourCode = sourceTourCode(record.sourceId)
      if (!product) {
        report.push({ sourceId: record.sourceId, status: 'missingProduct', tourCode })
        continue
      }
      if (product.sourceProvenance.sourceId !== record.sourceId)
        throw new Error(`Source provenance mismatch: ${record.sourceId}`)
      const sectionVisibility = [
        ...new Set(
          (Array.isArray(product.sectionVisibility)
            ? product.sectionVisibility
            : record.sectionVisibility
          ).filter((section: unknown) => section !== 'departures' && section !== 'sticky-cta'),
        ),
      ]
      const sectionOrder = [
        ...new Set(
          (Array.isArray(product.sectionOrder)
            ? product.sectionOrder
            : record.sectionVisibility
          ).filter((section: unknown) => section !== 'departures' && section !== 'sticky-cta'),
        ),
      ]
      const pageID = relationID(product.wrapperPage)
      const page = pagesByProduct.get(String(product.id))
      await payload.update({
        collection: 'tour-products',
        id: product.id,
        overrideAccess: true,
        req,
        context,
        locale: 'vi',
        data: {
          _status: 'published',
          primaryCTA: { ...(product.primaryCTA || {}), mode: 'contact', label: 'Liên hệ' },
          bcfg: { ...(product.bcfg || {}), stickyCTAEnabled: false, ctaStyle: 'inquiry' },
          sectionVisibility,
          sectionOrder,
        } as never,
      })
      productsPublished += 1
      if (page) {
        await payload.update({
          collection: 'pages',
          id: pageID!,
          overrideAccess: true,
          req,
          context,
          locale: 'vi',
          data: { _status: 'published', publishedAt: new Date().toISOString() } as never,
        })
        pagesPublished += 1
      }
      for (const departure of (departuresByProduct.get(String(product.id)) || []).sort(
        (left, right) => String(left.id).localeCompare(String(right.id), 'en'),
      )) {
        if (!sameID(departure.site, site.id))
          throw new Error(`Departure site mismatch: ${record.sourceId}`)
      }
      report.push({
        sourceId: record.sourceId,
        status: 'published-contact-only',
        productId: product.id,
        pageId: pageID,
        tourCode,
      })
    }
    printLifecycleJSON({
      apply: true,
      operation: 'contact-only',
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
