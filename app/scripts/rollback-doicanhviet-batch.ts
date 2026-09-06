import fs from 'node:fs/promises'
import path from 'node:path'

import { buildMediaReferenceIndex, type MediaReferenceIndex } from './import-doicanhviet'
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
  journal?: {
    createdProductId?: number | string | null
    createdPageId?: number | string | null
    createdDepartureIds?: Array<number | string>
    createdMediaIds?: Array<number | string>
  }
}

type ImportResult = {
  dryRun: boolean
  siteCode: string
  siteId: number | string
  batchId: string
  runId?: string
  report: CreatedRecord[]
}

type RollbackRecord = {
  sourceId: string
  productId: number | string
  deleted: {
    departures: Array<number | string>
    product: Array<number | string>
    page: Array<number | string>
    media: Array<number | string>
  }
  retainedMedia: Array<{ id: number | string; reason: string }>
  errors: Array<{ collection: string; id: number | string; error: string }>
}

const context = { disableRevalidate: true, import: true, rollback: true }

const sortedCreatedRecords = (result: ImportResult) =>
  result.report
    .filter((item) => item.status === 'created' && (item.productId !== undefined || item.journal?.createdProductId !== undefined))
    .map((item) => ({
      ...item,
      productId: item.productId ?? item.journal?.createdProductId,
      createdPageId: item.createdPageId ?? item.journal?.createdPageId,
      departureIds: item.departureIds ?? item.journal?.createdDepartureIds ?? [],
      mediaIds: item.mediaIds ?? item.journal?.createdMediaIds ?? [],
    }))
    .sort((left, right) => left.sourceId.localeCompare(right.sourceId, 'en', { numeric: true }))

const errorMessage = (error: unknown) => error instanceof Error ? error.message : String(error)

const outputPathFor = (resultPath: string, value: unknown) =>
  typeof value === 'string' && value.trim()
    ? path.resolve(value)
    : `${resultPath}.rollback-${new Date().toISOString().replace(/[^0-9]/gu, '')}.json`

const main = async () => {
  const plan = createLifecyclePlan(process.argv.slice(2), 'rollback')
  const file = plan.args.file
  if (typeof file !== 'string' || !file.trim())
    throw new Error('Missing --file <import-result.json>')

  const resultPath = path.resolve(file)
  const result = JSON.parse(await fs.readFile(resultPath, 'utf8')) as ImportResult
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
  const outputPath = outputPathFor(resultPath, plan.args.output)

  if (!plan.apply) {
    printLifecycleJSON({
      apply: false,
      batchId: result.batchId,
      outputPath,
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

    const rollbackRecords: RollbackRecord[] = verified.map(({ item, product }) => ({
      sourceId: item.sourceId,
      productId: product.id,
      deleted: { departures: [], product: [], page: [], media: [] },
      retainedMedia: [],
      errors: [],
    }))
    const rollbackByProductID = new Map(rollbackRecords.map((item) => [String(item.productId), item]))
    const remove = async (
      collection: 'media' | 'pages' | 'tour-products' | 'tour-departures',
      id: number | string,
      record: RollbackRecord,
      key: keyof RollbackRecord['deleted'],
    ) => {
      try {
        await payload.delete({ collection, id, context, overrideAccess: true, req })
        record.deleted[key].push(id)
      } catch (error) {
        record.errors.push({ collection, id, error: errorMessage(error) })
      }
    }

    // Delete the owned graph first. Build one schema-guided index afterwards so deleted
    // product/page references do not make every owned image look externally referenced.
    for (const { departures, page, product } of [...verified].reverse()) {
      const record = rollbackByProductID.get(String(product.id))!
      for (const departure of [...departures].reverse()) {
        await remove('tour-departures', departure.id, record, 'departures')
      }
      await remove('tour-products', product.id, record, 'product')
      if (page) await remove('pages', page.id, record, 'page')
    }

    let mediaReferenceIndex: MediaReferenceIndex
    try {
      mediaReferenceIndex = await buildMediaReferenceIndex(payload, req)
    } catch (error) {
      mediaReferenceIndex = {
        ids: new Set<string>(),
        coverage: 'incomplete',
        gaps: [`scanner-failed:${errorMessage(error)}`],
      }
    }
    for (const { item, media } of verified) {
      const record = rollbackByProductID.get(String(item.productId))!
      for (const mediaItem of [...media].reverse()) {
        if (mediaReferenceIndex.coverage !== 'complete') {
          record.retainedMedia.push({
            id: mediaItem.id,
            reason: `reference-coverage-incomplete:${mediaReferenceIndex.gaps.join('|')}`,
          })
        } else if (mediaReferenceIndex.ids.has(String(mediaItem.id))) {
          record.retainedMedia.push({
            id: mediaItem.id,
            reason: 'referenced-by-schema-guided-record-or-version',
          })
        } else {
          await remove('media', mediaItem.id, record, 'media')
        }
      }
    }

    const errors = rollbackRecords.flatMap((record) => record.errors)
    const retainedMedia = rollbackRecords.flatMap((record) => record.retainedMedia)
    const rollbackReport = {
      version: 2,
      apply: true,
      batchId: result.batchId,
      runId: result.runId || null,
      siteCode: DOICANHVIET_SITE_CODE,
      siteId: relationID(site.id),
      sourceImportResult: resultPath,
      executionDate: new Date().toISOString(),
      referenceCoverage: 'all-configured-collections-records-only',
      mediaReferenceIndex: {
        coverage: mediaReferenceIndex.coverage,
        referencedCount: mediaReferenceIndex.ids.size,
        gaps: mediaReferenceIndex.gaps,
      },
      status: errors.length || retainedMedia.length ? 'partial-failure' : 'ok',
      deleted: {
        tours: rollbackRecords.filter((record) => record.deleted.product.length).length,
        departures: rollbackRecords.flatMap((record) => record.deleted.departures),
        products: rollbackRecords.flatMap((record) => record.deleted.product),
        pages: rollbackRecords.flatMap((record) => record.deleted.page),
        media: rollbackRecords.flatMap((record) => record.deleted.media),
      },
      retainedMedia,
      errors,
      records: rollbackRecords,
    }
    await fs.writeFile(outputPath, `${JSON.stringify(rollbackReport, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' })
    printLifecycleJSON({ ...rollbackReport, outputPath })
    if (rollbackReport.status !== 'ok') process.exitCode = 1
  } finally {
    await payload.destroy()
  }
}

main().catch((error) => {
  printLifecycleError(error)
  process.exitCode = 1
})
