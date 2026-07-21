import 'dotenv/config'

import fs from 'node:fs/promises'
import path from 'node:path'

import type { File, Payload, PayloadRequest, Where } from 'payload'
import { createLocalReq, getPayload } from 'payload'

import config from '../src/payload.config'
import {
  bestPriceMediaFilename,
  bestPriceSourceSystem,
  bestPriceTourCode,
  buildBestPriceNormalizedTours,
  buildBestPriceWrapperLayout,
  type BestPriceImage,
  type BestPriceNormalizedTour,
} from './lib/bestprice22'
import { parseArgs } from './lib/doicanhviet'

type ImportReportItem = {
  sourceId: string
  status: string
  title?: string
  slug?: string
  productId?: number | string
  pageId?: number | string | null
  mediaIds?: Array<number | string>
  reason?: string
  warnings?: string[]
  blockingErrors?: string[]
}

type DemotedRecord = {
  id: number | string
  collection: 'pages' | 'tour-departures' | 'tour-products'
  previousStatus: string | null
  title?: string
}

const defaultBatchId = 'wingsside-bestprice-22-20260717'
const defaultArtifactDir = path.resolve(
  import.meta.dirname,
  '..',
  '..',
  'artifacts',
  'imports',
  'bestprice-22',
)
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
const context = { disableRevalidate: true, import: true }
const sectionOrder = [
  'hero',
  'facts',
  'reviews',
  'why-choose',
  'route',
  'itinerary',
  'services',
  'departures',
  'faq',
  'related',
  'sticky-cta',
]

const whereAnd = (...clauses: Where[]): Where => ({ and: clauses })

const syntheticDryRunAdmin = {
  id: 0,
  collection: 'users',
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
  email: 'bestprice-dry-run@internal.invalid',
  role: 'super-admin',
  sites: [],
}

const resolveAdmin = async (payload: Payload, adminEmail: string | undefined, dryRun: boolean) => {
  const email = String(adminEmail || process.env.IMPORT_ADMIN_EMAIL || '').trim()
  if (!email && dryRun) return syntheticDryRunAdmin
  if (!email) throw new Error('Missing --admin-email or IMPORT_ADMIN_EMAIL for write operation')

  const result = await payload.find({
    collection: 'users',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    pagination: false,
    where: { email: { equals: email } },
  })
  const user = result.docs[0] as any
  if (!user) throw new Error(`Admin user not found for ${email}`)
  if (user.role !== 'super-admin') throw new Error(`Admin user ${email} must be super-admin`)
  return user
}

const resolveSite = async (payload: Payload, req: PayloadRequest, siteCode: string) => {
  const result = await payload.find({
    collection: 'sites',
    depth: 0,
    limit: 2,
    overrideAccess: true,
    pagination: false,
    req,
    where: { code: { equals: siteCode } },
  })
  if (result.docs.length !== 1) {
    throw new Error(`Expected exactly one target site ${siteCode}, found ${result.docs.length}`)
  }
  return result.docs[0] as any
}

const resolveTourParentPage = async ({
  dryRun,
  payload,
  req,
  siteCode,
  siteId,
}: {
  dryRun: boolean
  payload: Payload
  req: PayloadRequest
  siteCode: string
  siteId: number | string
}) => {
  const result = await payload.find({
    collection: 'pages',
    depth: 0,
    limit: 2,
    overrideAccess: true,
    pagination: false,
    req,
    where: whereAnd({ site: { equals: siteId } }, { pathname: { equals: '/tour' } }),
  })
  if (result.docs.length > 1) throw new Error(`Multiple ${siteCode} /tour parent pages found`)
  if (result.docs[0]) return result.docs[0] as any
  if (dryRun) return null

  return payload.create({
    collection: 'pages',
    locale: 'en',
    req,
    context,
    data: {
      _status: 'draft',
      site: siteId,
      title: 'Tours',
      slug: `${siteCode}-tour`,
      pathname: '/tour',
      hero: { type: 'none' },
      layout: buildBestPriceWrapperLayout('WingSide tour catalog.'),
      meta: { title: 'Tours', description: 'WingSide tour catalog' },
    } as never,
  })
}

const imageFile = async (image: BestPriceImage, filename: string): Promise<File> => {
  const data = await fs.readFile(image.localPath)
  const extension = path.extname(image.localPath).slice(1).toLowerCase()
  const mimetype =
    extension === 'png' ? 'image/png' : extension === 'webp' ? 'image/webp' : 'image/jpeg'
  return { name: filename, data, mimetype, size: data.byteLength }
}

const mediaStaticDir = path.resolve(process.cwd(), 'public', 'media')

const mediaFileExistsOnDisk = async (filename: string) => {
  try {
    await fs.access(path.join(mediaStaticDir, filename))
    return true
  } catch {
    return false
  }
}

const resolveOrCreateMedia = async ({
  image,
  imageIndex,
  payload,
  req,
  siteId,
  sourceId,
}: {
  image: BestPriceImage
  imageIndex: number
  payload: Payload
  req: PayloadRequest
  siteId: number | string
  sourceId: string
}) => {
  const filename = bestPriceMediaFilename(sourceId, imageIndex, image)
  const existing = await payload.find({
    collection: 'media',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    pagination: false,
    req,
    where: whereAnd({ site: { equals: siteId } }, { filename: { equals: filename } }),
  })
  if (existing.docs[0]) {
    // Local DBs often retain media rows from prior imports while public/media files are absent
    // (e.g. after DB copy without media folder). Reuse only when the binary is on disk.
    if (await mediaFileExistsOnDisk(filename)) {
      return { doc: existing.docs[0] as any, created: false }
    }
    await payload.delete({
      collection: 'media',
      id: existing.docs[0].id,
      overrideAccess: true,
      req,
      context,
    })
  }

  const doc = await payload.create({
    collection: 'media',
    locale: 'en',
    req,
    context,
    data: { alt: image.alt || filename, site: siteId } as never,
    file: await imageFile(image, filename),
  })
  return { doc: doc as any, created: true }
}

const findProduct = async (
  payload: Payload,
  req: PayloadRequest,
  siteId: number | string,
  tourCode: string,
) => {
  const result = await payload.find({
    collection: 'tour-products',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    pagination: false,
    req,
    where: whereAnd({ site: { equals: siteId } }, { tourCode: { equals: tourCode } }),
  })
  return (result.docs[0] as any) || null
}

const findPage = async (
  payload: Payload,
  req: PayloadRequest,
  siteId: number | string,
  pathname: string,
) => {
  const result = await payload.find({
    collection: 'pages',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    pagination: false,
    req,
    where: whereAnd({ site: { equals: siteId } }, { pathname: { equals: pathname } }),
  })
  return (result.docs[0] as any) || null
}

const productStatus = (tour: BestPriceNormalizedTour) =>
  tour.publishEligible ? 'published' : 'draft'

const primaryCTAFor = (tour: BestPriceNormalizedTour) =>
  tour.priceFrom && tour.futureDepartures.length
    ? {
        mode: 'request-quote' as const,
        label: 'Request a quote',
      }
    : {
        mode: 'contact' as const,
        label: 'Liên hệ',
      }

const pageData = ({
  heroMedia,
  parentPage,
  siteCode,
  siteId,
  tour,
}: {
  heroMedia: number | string | null
  parentPage: number | string | null
  siteCode: string
  siteId: number | string
  tour: BestPriceNormalizedTour
}) => ({
  _status: productStatus(tour),
  site: siteId,
  title: tour.title,
  slug: `${siteCode}-${tour.slug}`,
  pathname: `/tour/${tour.slug}`,
  ...(parentPage ? { parentPage } : {}),
  hero: { type: 'none' },
  layout: buildBestPriceWrapperLayout(tour.summary),
  meta: {
    title: tour.title,
    description: tour.summary,
    image: heroMedia || undefined,
    breadcrumbLabel: tour.title,
  },
})

const productData = ({
  batchId,
  gallery,
  heroMedia,
  pageId,
  siteId,
  tour,
}: {
  batchId: string
  gallery: Array<number | string>
  heroMedia: number | string | null
  pageId: number | string
  siteId: number | string
  tour: BestPriceNormalizedTour
}) => {
  const shouldShowPrice = Boolean(tour.priceFrom && tour.futureDepartures.length)

  return {
  _status: productStatus(tour),
  site: siteId,
  title: tour.title,
  slug: tour.slug,
  tourCode: bestPriceTourCode(tour.sourceId),
  sourceProvenance: {
    sourceSystem: bestPriceSourceSystem,
    sourceId: tour.sourceId,
    sourceUrl: tour.sourceUrl,
    sourceHash: tour.sourceHash,
    sourceFile: tour.sourceFile,
    matchedDocument: tour.matchedDocument,
    importBatchId: batchId,
    warnings: tour.warnings,
    blockingErrors: tour.blockingErrors,
  },
  market: tour.market,
  durationDays: tour.durationDays,
  durationNights: tour.durationNights,
  wrapperPage: pageId,
  summary: tour.summary,
  priceFrom: shouldShowPrice ? tour.priceFrom : null,
  currency: tour.currency,
  heroMedia: heroMedia || undefined,
  gallery,
  highlights: [],
  factSummary: {
    routeSummary: tour.category,
  },
  primaryCTA: primaryCTAFor(tour),
  itineraryDays: tour.itineraryDays.map((day) => ({
    dayNumber: day.dayNumber,
    title: day.title,
    route: day.route,
    summary: day.summary,
    meals: day.meals,
    accommodation: day.accommodation,
  })),
  includes: tour.includes.map((label) => ({ label })),
  excludes: tour.excludes.map((label) => ({ label })),
  servicesSummary: {
    hotelSummary: tour.itineraryDays
      .map((day) => day.accommodation)
      .filter(Boolean)
      .slice(0, 3)
      .join('. '),
    mealsSummary: tour.itineraryDays
      .map((day) => day.meals)
      .filter(Boolean)
      .join('; '),
  },
  faqItems: [],
  bcfg: {
    template: 'dense-retail-default',
    stickyCTAEnabled: tour.sectionVisibility.includes('sticky-cta'),
    ctaStyle: tour.priceFrom && tour.futureDepartures.length ? 'request-quote' : 'inquiry',
    routeMode: 'stop-timeline',
    itinMode: 'timeline-cards',
    depMode: 'cards',
  },
  sectionVisibility: tour.sectionVisibility,
  sectionOrder,
  variantStrategy: 'product-first',
  meta: {
    title: tour.title,
    description: tour.summary,
    image: heroMedia || undefined,
    breadcrumbLabel: tour.title,
  },
  }
}

const findSampleRecordsToDemote = async (
  payload: Payload,
  req: PayloadRequest,
  siteId: number | string,
  activeTourCodes: Set<string>,
) => {
  const result = await payload.find({
    collection: 'tour-products',
    depth: 0,
    limit: 1000,
    overrideAccess: true,
    pagination: false,
    req,
    where: { site: { equals: siteId } },
  })
  return (result.docs as any[]).filter((doc) => !activeTourCodes.has(String(doc.tourCode || '')))
}

const demoteSampleRecords = async ({
  dryRun,
  payload,
  req,
  sampleProducts,
}: {
  dryRun: boolean
  payload: Payload
  req: PayloadRequest
  sampleProducts: any[]
}) => {
  const demoted: DemotedRecord[] = []
  for (const product of sampleProducts) {
    const previousStatus = product._status || null
    demoted.push({
      collection: 'tour-products',
      id: product.id,
      previousStatus,
      title: product.title,
    })

    if (!dryRun && previousStatus !== 'draft') {
      await payload.update({
        collection: 'tour-products',
        id: product.id,
        overrideAccess: true,
        req,
        context,
        data: { _status: 'draft' } as never,
      })
    }

    const departures = await payload.find({
      collection: 'tour-departures',
      depth: 0,
      limit: 1000,
      overrideAccess: true,
      pagination: false,
      req,
      where: { tourProduct: { equals: product.id } },
    })
    for (const departure of departures.docs as any[]) {
      demoted.push({
        collection: 'tour-departures',
        id: departure.id,
        previousStatus: departure._status || null,
      })
      if (!dryRun && departure._status !== 'draft') {
        await payload.update({
          collection: 'tour-departures',
          id: departure.id,
          overrideAccess: true,
          req,
          context,
          data: { _status: 'draft' } as never,
        })
      }
    }

    const wrapperPageId = typeof product.wrapperPage === 'object' ? product.wrapperPage?.id : product.wrapperPage
    if (wrapperPageId) {
      const page = (await payload.findByID({
        collection: 'pages',
        id: wrapperPageId,
        depth: 0,
        overrideAccess: true,
        req,
      })) as any
      demoted.push({
        collection: 'pages',
        id: page.id,
        previousStatus: page._status || null,
        title: page.title,
      })
      if (!dryRun && page._status !== 'draft') {
        await payload.update({
          collection: 'pages',
          id: page.id,
          overrideAccess: true,
          req,
          context,
          data: { _status: 'draft' } as never,
        })
      }
    }
  }
  return demoted
}

const runRollback = async ({
  batchId,
  payload,
  req,
  resultPath,
}: {
  batchId: string
  payload: Payload
  req: PayloadRequest
  resultPath: string
}) => {
  const result = JSON.parse(await fs.readFile(resultPath, 'utf8')) as {
    batchId: string
    demoted: DemotedRecord[]
    report: ImportReportItem[]
  }
  if (result.batchId !== batchId) throw new Error('--batch-id does not match result file')

  for (const item of [...result.report].reverse()) {
    if (!item.productId) continue
    const product = (await payload.findByID({
      collection: 'tour-products',
      id: item.productId,
      depth: 0,
      overrideAccess: true,
      req,
    })) as any
    if (product?.sourceProvenance?.importBatchId !== batchId) continue
    await payload.update({
      collection: 'tour-products',
      id: item.productId,
      overrideAccess: true,
      req,
      context,
      data: { _status: 'draft' } as never,
    })
    if (item.pageId) {
      await payload.update({
        collection: 'pages',
        id: item.pageId,
        overrideAccess: true,
        req,
        context,
        data: { _status: 'draft' } as never,
      })
    }
  }

  for (const item of result.demoted) {
    if (!item.previousStatus || item.previousStatus === 'draft') continue
    await payload.update({
      collection: item.collection,
      id: item.id,
      overrideAccess: true,
      req,
      context,
      data: { _status: item.previousStatus } as never,
    })
  }

  return { restored: result.demoted.length }
}

const main = async () => {
  const args = parseArgs(process.argv.slice(2))
  const dryRun = Boolean(args['dry-run'])
  const apply = Boolean(args.apply)
  const rollback = Boolean(args.rollback)
  if ([dryRun, apply, rollback].filter(Boolean).length !== 1) {
    throw new Error('Choose exactly one of --dry-run, --apply, or --rollback')
  }

  const siteCode = String(args['site-code'] || 'wings-side')
  const batchId = String(args['batch-id'] || defaultBatchId)
  const artifactDir = path.resolve(String(args['artifact-dir'] || defaultArtifactDir))
  const resultPath = path.resolve(String(args.file || path.join(artifactDir, 'import-result.json')))
  const payload = await getPayload({ config })

  try {
    const admin = await resolveAdmin(payload, String(args['admin-email'] || ''), dryRun)
    const req = await createLocalReq({ user: admin }, payload)

    if (rollback) {
      const rollbackResult = await runRollback({ batchId, payload, req, resultPath })
      console.log(JSON.stringify({ batchId, rollback: true, ...rollbackResult }, null, 2))
      return
    }

    const crawlerRoot = String(args['crawler-root'] || defaultCrawlerRoot)
    const manifestPath = path.resolve(String(args.manifest || defaultManifestPath))
    const rawPath = path.resolve(String(args.raw || defaultRawPath))
    const { missing, tours } = await buildBestPriceNormalizedTours({
      crawlerRoot,
      manifestPath,
      rawPath,
    })
    if (missing.length) throw new Error(`Missing raw records for ${missing.length} manifest rows`)
    if (tours.length !== 22) throw new Error(`Expected 22 tours, got ${tours.length}`)

    const site = await resolveSite(payload, req, siteCode)
    const parentPage = await resolveTourParentPage({
      dryRun,
      payload,
      req,
      siteCode,
      siteId: site.id,
    })
    const activeTourCodes = new Set(tours.map((tour) => bestPriceTourCode(tour.sourceId)))
    const sampleProducts = await findSampleRecordsToDemote(payload, req, site.id, activeTourCodes)
    const demoted = await demoteSampleRecords({ dryRun, payload, req, sampleProducts })
    const report: ImportReportItem[] = []
    let mediaCreated = 0
    let mediaReused = 0
    let pagesCreated = 0
    let pagesUpdated = 0
    let productsCreated = 0
    let productsUpdated = 0

    for (const tour of tours) {
      const tourCode = bestPriceTourCode(tour.sourceId)
      const existingProduct = await findProduct(payload, req, site.id, tourCode)
      const existingPage = await findPage(payload, req, site.id, `/tour/${tour.slug}`)

      if (dryRun) {
        report.push({
          sourceId: tour.sourceId,
          status: existingProduct ? 'would-update' : 'would-create',
          title: tour.title,
          slug: tour.slug,
          warnings: tour.warnings,
          blockingErrors: tour.blockingErrors,
          reason: productStatus(tour),
          productId: existingProduct?.id,
          pageId: existingPage?.id || null,
        })
        continue
      }

      const mediaIds: Array<number | string> = []
      const createdMediaIds: Array<number | string> = []
      for (const [imageIndex, image] of tour.images.entries()) {
        const media = await resolveOrCreateMedia({
          image,
          imageIndex,
          payload,
          req,
          siteId: site.id,
          sourceId: tour.sourceId,
        })
        mediaIds.push(media.doc.id)
        if (media.created) {
          createdMediaIds.push(media.doc.id)
          mediaCreated += 1
        } else {
          mediaReused += 1
        }
      }
      const heroMedia = mediaIds[0] || null
      const gallery = mediaIds.slice(1)
      const pagePayload = pageData({
        heroMedia,
        parentPage: parentPage?.id || null,
        siteCode,
        siteId: site.id,
        tour,
      })
      const page = existingPage
        ? await payload.update({
            collection: 'pages',
            id: existingPage.id,
            locale: 'en',
            overrideAccess: true,
            req,
            context,
            data: pagePayload as never,
          })
        : await payload.create({
            collection: 'pages',
            locale: 'en',
            overrideAccess: true,
            req,
            context,
            data: pagePayload as never,
          })
      if (existingPage) pagesUpdated += 1
      else pagesCreated += 1

      const productPayload = productData({
        batchId,
        gallery,
        heroMedia,
        pageId: page.id,
        siteId: site.id,
        tour,
      })
      const product = existingProduct
        ? await payload.update({
            collection: 'tour-products',
            id: existingProduct.id,
            locale: 'en',
            overrideAccess: true,
            req,
            context,
            data: productPayload as never,
          })
        : await payload.create({
            collection: 'tour-products',
            locale: 'en',
            overrideAccess: true,
            req,
            context,
            data: productPayload as never,
          })
      if (existingProduct) productsUpdated += 1
      else productsCreated += 1

      report.push({
        sourceId: tour.sourceId,
        status: existingProduct ? 'updated' : 'created',
        title: tour.title,
        slug: tour.slug,
        productId: product.id,
        pageId: page.id,
        mediaIds: createdMediaIds,
        warnings: tour.warnings,
        blockingErrors: tour.blockingErrors,
        reason: productStatus(tour),
      })
    }

    const output = {
      runAt: new Date().toISOString(),
      dryRun,
      apply,
      batchId,
      siteCode,
      siteId: site.id,
      totals: {
        tours: tours.length,
        publishEligible: tours.filter((tour) => tour.publishEligible).length,
        draftOnly: tours.filter((tour) => !tour.publishEligible).length,
        sampleProductsToDraft: sampleProducts.length,
        demotedRecords: demoted.length,
        mediaCreated,
        mediaReused,
        pagesCreated,
        pagesUpdated,
        productsCreated,
        productsUpdated,
      },
      demoted,
      report,
    }
    await fs.mkdir(artifactDir, { recursive: true })
    const outputPath = path.join(artifactDir, dryRun ? 'import-dry-run.json' : 'import-result.json')
    await fs.writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8')
    console.log(JSON.stringify({ outputPath, ...output.totals }, null, 2))
  } finally {
    await payload.destroy()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
