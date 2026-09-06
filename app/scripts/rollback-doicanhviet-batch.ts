import fs from 'node:fs/promises'
import path from 'node:path'

import {
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

type CreatedRecord = {
  status: string
  sourceId: string
  productId?: number | string
  createdPageId?: number | string | null
  departureIds?: Array<number | string>
  mediaIds?: Array<number | string>
}

type ImportResult = {
  dryRun: boolean
  siteCode: string
  siteId: number | string
  batchId: string
  report: CreatedRecord[]
}

const context = { disableRevalidate: true, import: true, rollback: true }

const sortedCreatedRecords = (result: ImportResult) =>
  result.report
    .filter((item) => item.status === 'created' && item.productId !== undefined)
    .sort((left, right) => left.sourceId.localeCompare(right.sourceId, 'en', { numeric: true }))

const main = async () => {
  const plan = createLifecyclePlan(process.argv.slice(2), 'rollback')
  const file = plan.args.file
  if (typeof file !== 'string' || !file.trim())
    throw new Error('Missing --file <import-result.json>')

  const result = JSON.parse(await fs.readFile(path.resolve(file), 'utf8')) as ImportResult
  if (result.dryRun) throw new Error('Cannot rollback a dry-run report')
  if (result.siteCode !== DOICANHVIET_SITE_CODE) {
    throw new Error(
      `Rollback result must target ${DOICANHVIET_SITE_CODE}; received ${JSON.stringify(result.siteCode)}`,
    )
  }
  if (!plan.batchId || plan.batchId !== result.batchId) {
    throw new Error('--batch-id must exactly match the import result batchId')
  }

  const created = sortedCreatedRecords(result)
  if (!created.length) throw new Error('No created records found in import result')

  if (!plan.apply) {
    printLifecycleJSON({
      apply: false,
      batchId: result.batchId,
      siteCode: DOICANHVIET_SITE_CODE,
      tours: created.map((item) => ({
        sourceId: item.sourceId,
        productId: item.productId,
        departures: item.departureIds?.length || 0,
        page: item.createdPageId || null,
        media: item.mediaIds?.length || 0,
      })),
    })
    return
  }

  const runtime = await initializePayloadForApply()
  const { payload } = runtime
  try {
    const user = await resolveSuperAdmin(payload, plan.adminEmail!)
    const req = await runtime.createLocalReq({ user }, payload)
    const site = await resolveWingsGoSite(payload, req)
    if (!sameID(site.id, result.siteId)) {
      throw new Error(`Import result siteId does not match ${DOICANHVIET_SITE_CODE}`)
    }

    const verified: Array<{
      item: CreatedRecord
      product: any
      departures: any[]
      page: any
      media: any[]
    }> = []
    const productIDs = new Set<string>()
    for (const item of created) {
      const productID = item.productId
      if (!item.sourceId || productID === undefined || productIDs.has(String(productID))) {
        throw new Error(`Duplicate or invalid created product: ${item.sourceId}`)
      }
      productIDs.add(String(productID))
      const product = await payload.findByID({
        collection: 'tour-products',
        id: productID,
        depth: 0,
        overrideAccess: true,
        req,
      })
      if (!sameID(product.site, site.id)) throw new Error(`Site mismatch: ${item.sourceId}`)
      if (product.tourCode !== `DCV-${item.sourceId}`)
        throw new Error(`Tour code mismatch: ${item.sourceId}`)
      const provenance = product.sourceProvenance as
        | { sourceId?: string; sourceSystem?: string; importBatchId?: string }
        | undefined
      if (
        provenance?.sourceSystem !== 'doicanhviet' ||
        provenance.sourceId !== item.sourceId ||
        provenance.importBatchId !== result.batchId
      ) {
        throw new Error(`Batch provenance mismatch: ${item.sourceId}`)
      }

      const page = item.createdPageId
        ? await payload.findByID({
            collection: 'pages',
            id: item.createdPageId,
            depth: 0,
            overrideAccess: true,
            req,
          })
        : null
      if (page && (!sameID(page.site, site.id) || !sameID(product.wrapperPage, page.id))) {
        throw new Error(`Created page safeguard failed: ${item.sourceId}`)
      }

      const departures: any[] = []
      for (const id of item.departureIds || []) {
        const departure = await payload.findByID({
          collection: 'tour-departures',
          id,
          depth: 0,
          overrideAccess: true,
          req,
        })
        if (!sameID(departure.site, site.id) || !sameID(departure.tourProduct, product.id)) {
          throw new Error(`Created departure safeguard failed: ${item.sourceId}`)
        }
        departures.push(departure)
      }

      const media: any[] = []
      for (const id of item.mediaIds || []) {
        const mediaItem = await payload.findByID({
          collection: 'media',
          id,
          depth: 0,
          overrideAccess: true,
          req,
        })
        if (
          !sameID(mediaItem.site, site.id) ||
          typeof mediaItem.filename !== 'string' ||
          !mediaItem.filename.startsWith(`dcv-${item.sourceId}-`)
        ) {
          throw new Error(`Created media safeguard failed: ${item.sourceId}`)
        }
        media.push(mediaItem)
      }
      verified.push({ item, product, departures, page, media })
    }

    for (const { departures, media, page, product } of [...verified].reverse()) {
      for (const departure of [...departures].reverse()) {
        await payload.delete({
          collection: 'tour-departures',
          id: departure.id,
          context,
          overrideAccess: true,
          req,
        })
      }
      await payload.delete({
        collection: 'tour-products',
        id: product.id,
        context,
        overrideAccess: true,
        req,
      })
      if (page)
        await payload.delete({
          collection: 'pages',
          id: page.id,
          context,
          overrideAccess: true,
          req,
        })
      for (const mediaItem of [...media].reverse()) {
        await payload.delete({
          collection: 'media',
          id: mediaItem.id,
          context,
          overrideAccess: true,
          req,
        })
      }
    }
    printLifecycleJSON({
      apply: true,
      batchId: result.batchId,
      deletedTours: verified.length,
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
