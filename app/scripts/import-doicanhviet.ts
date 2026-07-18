import 'dotenv/config'

import fs from 'node:fs/promises'
import path from 'node:path'

import type { File, Payload, PayloadRequest, Where } from 'payload'
import { createLocalReq, getPayload } from 'payload'

import config from '../src/payload.config'
import {
  buildTourWrapperLayout,
  deterministicMediaFilename,
  isDescriptivePublicSlug,
  removeAirlineMarkers,
  parseArgs,
  selectedSourceIDs,
  sourceTourCode,
  type NormalizedTour,
  type SourceImage,
} from './lib/doicanhviet'

type Decision = {
  approved?: boolean
  action?: 'create' | 'skip' | 'reject' | 'merge' | 'create-variant'
  approvedTitle?: string
  approvedSlug?: string
  approvedHeroSourceKey?: string
  notes?: string
}

type DecisionMap = Record<string, Decision>

const defaultArtifactDir = path.resolve(
  import.meta.dirname,
  '..',
  '..',
  'artifacts',
  'imports',
  'doicanhviet',
)
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

const context = { disableRevalidate: true, import: true }

const whereAnd = (...clauses: Where[]): Where => ({ and: clauses })

const parseJSONFile = async <T>(filePath: string): Promise<T> =>
  JSON.parse(await fs.readFile(filePath, 'utf8')) as T

const resolveAdmin = async (payload: Payload, email: string, req?: PayloadRequest) => {
  const result = await payload.find({
    collection: 'users',
    depth: 0,
    limit: 1,
    pagination: false,
    overrideAccess: true,
    req,
    where: { email: { equals: email } },
  })
  const user = result.docs[0] as any
  if (!user) throw new Error(`Admin user not found for --admin-email ${email}`)
  if (user.role !== 'super-admin') throw new Error(`Admin user ${email} must have role super-admin`)
  return user
}

const resolveSite = async (payload: Payload, req: PayloadRequest, siteCode: string) => {
  const result = await payload.find({
    collection: 'sites',
    depth: 0,
    limit: 2,
    pagination: false,
    overrideAccess: true,
    req,
    where: { code: { equals: siteCode } },
  })
  if (result.docs.length !== 1)
    throw new Error(`Expected exactly one target site (${siteCode}), found ${result.docs.length}`)
  return result.docs[0] as any
}

const resolveTourParentPage = async (
  payload: Payload,
  siteID: number | string,
  siteCode: string,
  req: PayloadRequest,
  dryRun: boolean,
  locale: 'en' | 'vi',
) => {
  const result = await payload.find({
    collection: 'pages',
    depth: 0,
    limit: 2,
    pagination: false,
    overrideAccess: true,
    req,
    where: whereAnd({ site: { equals: siteID } }, { pathname: { equals: '/tour' } }),
  })
  if (result.docs.length > 1)
    throw new Error(
      `Expected at most one ${siteCode} parent page at /tour, found ${result.docs.length}`,
    )
  if (result.docs[0]) return result.docs[0] as any
  if (dryRun) return null
  return payload.create({
    collection: 'pages',
    locale,
    req,
    context,
    data: {
      _status: 'draft',
      site: siteID,
      title: 'Tours',
      slug: `${siteCode}-tour`,
      pathname: '/tour',
      hero: { type: 'none' },
      layout: buildTourWrapperLayout('Tour catalog imported for editorial review.'),
      meta: { title: 'Tours', description: 'Tour catalog' },
    } as never,
  })
}

const sourceImageFile = async (image: SourceImage, filename: string): Promise<File> => {
  const data = await fs.readFile(image.localPath)
  const extension = path.extname(image.localPath).slice(1).toLowerCase()
  const mimetype =
    extension === 'png' ? 'image/png' : extension === 'webp' ? 'image/webp' : 'image/jpeg'
  return { name: filename, data, mimetype, size: data.byteLength }
}

const resolveOrCreateMedia = async ({
  image,
  imageIndex,
  payload,
  req,
  sourceId,
  sourceSystem,
  siteID,
  createdMedia,
  locale,
}: {
  image: SourceImage
  imageIndex: number
  payload: Payload
  req: PayloadRequest
  sourceId: string
  sourceSystem: NormalizedTour['source']['sourceSystem']
  siteID: number | string
  createdMedia: Array<number | string>
  locale: 'en' | 'vi'
}) => {
  const filename = deterministicMediaFilename(sourceId, imageIndex, image, sourceSystem)
  const existing = await payload.find({
    collection: 'media',
    depth: 0,
    limit: 1,
    pagination: false,
    overrideAccess: true,
    req,
    where: whereAnd({ site: { equals: siteID } }, { filename: { equals: filename } }),
  })
  if (existing.docs[0]) return { doc: existing.docs[0] as any, reused: true }

  const doc = await payload.create({
    collection: 'media',
    locale,
    req,
    context,
    data: { alt: image.alt || filename, site: siteID } as never,
    file: await sourceImageFile(image, filename),
  })
  createdMedia.push(doc.id)
  return { doc: doc as any, reused: false }
}

const getApprovedImages = (record: NormalizedTour, decision: Decision) => {
  if (!record.images.length) return { hero: null, gallery: [] as SourceImage[] }
  const hero =
    record.images.find((image) => image.sourceKey === decision.approvedHeroSourceKey) ||
    record.images[0]
  return { hero, gallery: record.images.filter((image) => image.sourceKey !== hero.sourceKey) }
}

const validateDecision = (record: NormalizedTour, decision?: Decision) => {
  if (!decision) return 'MISSING_DECISION'
  if (decision.action === 'skip' || decision.action === 'reject') return null
  if (decision.action === 'merge' || decision.action === 'create-variant')
    return 'UNSUPPORTED_ACTION'
  if (decision.action !== 'create' || decision.approved !== true) return 'DECISION_NOT_APPROVED'
  if (!decision.approvedSlug) return 'MISSING_APPROVED_SLUG'
  if (!isDescriptivePublicSlug(decision.approvedSlug)) return 'INVALID_PUBLIC_SLUG'
  if (record.kind !== 'tour') return `NON_TOUR_KIND:${record.kind}`
  if (record.blockingErrors.length)
    return `SOURCE_BLOCKING_ERRORS:${record.blockingErrors.join(',')}`
  if (!record.market) return 'UNMAPPED_MARKET'
  if (!record.title || !record.durationDays || record.durationNights === null)
    return 'MISSING_REQUIRED_TOUR_FIELDS'
  if (!record.itineraryDays.length) return 'NO_ITINERARY'
  return null
}

const findExistingProduct = async (
  payload: Payload,
  siteID: number | string,
  tourCode: string,
  req: PayloadRequest,
) => {
  const result = await payload.find({
    collection: 'tour-products',
    depth: 0,
    limit: 1,
    pagination: false,
    overrideAccess: true,
    req,
    where: whereAnd({ site: { equals: siteID } }, { tourCode: { equals: tourCode } }),
  })
  return (result.docs[0] as any) || null
}

const findPage = async (
  payload: Payload,
  siteID: number | string,
  pathname: string,
  req: PayloadRequest,
) => {
  const result = await payload.find({
    collection: 'pages',
    depth: 0,
    limit: 1,
    pagination: false,
    overrideAccess: true,
    req,
    where: whereAnd({ site: { equals: siteID } }, { pathname: { equals: pathname } }),
  })
  return (result.docs[0] as any) || null
}

const buildProductData = ({
  record,
  slug,
  title,
  siteID,
  wrapperPage,
  heroMedia,
  gallery,
  batchId,
}: {
  record: NormalizedTour
  slug: string
  title: string
  siteID: number | string
  wrapperPage: number | string
  heroMedia: number | string | null
  gallery: Array<number | string>
  batchId: string
}) => ({
  _status: 'draft',
  site: siteID,
  title,
  slug,
  tourCode: sourceTourCode(record.sourceId, record.source.sourceSystem),
  sourceProvenance: {
    sourceSystem: record.source.sourceSystem,
    sourceId: record.sourceId,
    sourceUrl: record.sourceUrl || record.source?.sourceUrl || null,
    sourceHash: record.sourceHash || record.source?.sourceHash,
    sourceFile: record.sourceFile,
    crawledAt: record.crawledAt || record.source?.crawledAt || null,
    importBatchId: batchId,
    rawPricing: record.rawPricing || record.sourcePricing?.tables || [],
  },
  market: record.market,
  durationDays: record.durationDays,
  durationNights: record.durationNights,
  wrapperPage,
  summary: record.summary || title,
  priceFrom: record.priceFrom || record.departures[0]?.priceFrom,
  currency: record.currency || record.departures[0]?.currency || 'USD',
  heroMedia: heroMedia || undefined,
  gallery,
  highlights: [],
  itineraryDays: record.itineraryDays.map((day) => ({
    dayNumber: day.dayNumber,
    title: day.title,
    route: day.route,
    summary: day.summary,
    meals: day.meals,
    transport: day.transport,
    accommodation: day.accommodation,
  })),
  includes: [],
  excludes: [],
  servicesSummary: {
    hotelSummary: record.itineraryDays
      .map((day) => day.accommodation)
      .filter(Boolean)
      .slice(0, 3)
      .join('. '),
    mealsSummary: record.itineraryDays
      .map((day) => day.meals)
      .filter(Boolean)
      .join('; '),
    transportSummary: record.itineraryDays
      .map((day) => day.transport)
      .filter(Boolean)
      .slice(0, 3)
      .join('. '),
    operatorNotes: `Dữ liệu import từ ${record.source.sourceSystem}; cần biên tập xác nhận trước khi publish.`,
    notes: [{ label: 'Giá và dịch vụ cần sales xác nhận trước khi chốt booking.' }],
  },
  faqItems: [],
  bcfg: {
    template: 'dense-retail-default',
    stickyCTAEnabled: record.sectionVisibility.includes('sticky-cta'),
    ctaStyle: 'inquiry',
    routeMode: 'route-map',
    itinMode: 'timeline-cards',
    depMode: 'matrix',
  },
  sectionVisibility: record.sectionVisibility,
  sectionOrder,
  variantStrategy: 'product-first',
  meta: {
    title,
    description: record.summary || title,
    image: heroMedia || undefined,
    breadcrumbLabel: title,
  },
})

const buildPageData = ({
  record,
  slug,
  title,
  siteID,
  parentPage,
  heroMedia,
  siteCode,
}: {
  record: NormalizedTour
  slug: string
  title: string
  siteID: number | string
  parentPage: number | string
  heroMedia: number | string | null
  siteCode: string
}) => ({
  _status: 'draft',
  site: siteID,
  title,
  slug: `${siteCode}-${slug}`,
  pathname: `/tour/${slug}`,
  parentPage,
  hero: { type: 'none' },
  layout: buildTourWrapperLayout(record.summary || title),
  meta: {
    title,
    description: record.summary || title,
    image: heroMedia || undefined,
    breadcrumbLabel: title,
  },
})

type ImportState = {
  created: number
  skippedExisting: number
  skippedDecision: number
  rejected: number
  errors: number
  mediaCreated: number
  mediaReused: number
  departuresCreated: number
  pagesCreated: number
  productsCreated: number
}

const main = async () => {
  const args = parseArgs(process.argv.slice(2))
  const mode = String(args.mode || 'create-only')
  if (mode !== 'create-only') throw new Error('Phase lõi chỉ hỗ trợ --mode create-only')
  if (args.publish || args.overwrite)
    throw new Error('Phase lõi không hỗ trợ --publish hoặc --overwrite')
  const filePath = path.resolve(
    String(args.file || path.join(defaultArtifactDir, 'tours.normalized.json')),
  )
  const decisionsPath = path.resolve(
    String(args.decisions || path.join(path.dirname(filePath), 'import-decisions.json')),
  )
  const dryRun = Boolean(args['dry-run'])
  const importLocale = String(args.locale || 'vi')
  if (importLocale !== 'vi' && importLocale !== 'en')
    throw new Error('Only --locale vi|en is supported')
  const siteCode = String(args['site-code'] || 'wings-side').trim()
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(siteCode)) throw new Error('Invalid --site-code')
  const batchId = String(
    args['batch-id'] || `dcv-${new Date().toISOString().replace(/[:.]/g, '-')}`,
  ).trim()
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{2,79}$/u.test(batchId)) throw new Error('Invalid --batch-id')
  const records = await parseJSONFile<NormalizedTour[]>(filePath)
  const decisions = await parseJSONFile<DecisionMap>(decisionsPath)
  const only = args.only ? selectedSourceIDs(args.only) : undefined
  const limit = args.limit ? Number(args.limit) : undefined
  const selected = records
    .filter((record) => !only || only.has(record.sourceId))
    .sort((left, right) => left.sourceId.localeCompare(right.sourceId, 'en', { numeric: true }))
    .slice(0, limit)
  if (!selected.length) throw new Error('Không có normalized record phù hợp --only/--limit')

  const approvedSlugs = new Map<string, string>()
  for (const record of selected.filter((item) => item.kind === 'tour')) {
    const decision = decisions[record.sourceId]
    if (decision?.action !== 'create' || decision.approved !== true || !decision.approvedSlug)
      continue
    if (!isDescriptivePublicSlug(decision.approvedSlug)) {
      throw new Error(`Invalid approvedSlug for ${record.sourceId}: ${decision.approvedSlug}`)
    }
    const previous = approvedSlugs.get(decision.approvedSlug)
    if (previous && previous !== record.sourceId) {
      throw new Error(
        `Approved slug collision: ${decision.approvedSlug} (${previous}, ${record.sourceId})`,
      )
    }
    approvedSlugs.set(decision.approvedSlug, record.sourceId)
  }

  const adminEmail = String(args['admin-email'] || process.env.IMPORT_ADMIN_EMAIL || '').trim()
  if (!adminEmail) throw new Error('Thiếu --admin-email hoặc IMPORT_ADMIN_EMAIL')
  const payload = await getPayload({ config })
  const adminUser = await resolveAdmin(payload, adminEmail)
  const req = await createLocalReq({ user: adminUser }, payload)
  const site = await resolveSite(payload, req, siteCode)
  const parentPage = await resolveTourParentPage(
    payload,
    site.id,
    siteCode,
    req,
    dryRun,
    importLocale,
  )
  const state: ImportState = {
    created: 0,
    skippedExisting: 0,
    skippedDecision: 0,
    rejected: 0,
    errors: 0,
    mediaCreated: 0,
    mediaReused: 0,
    departuresCreated: 0,
    pagesCreated: 0,
    productsCreated: 0,
  }
  const report: Array<Record<string, unknown>> = []

  for (const record of selected) {
    const decision = decisions[record.sourceId]
    const decisionError = validateDecision(record, decision)
    if (record.kind !== 'tour') {
      state.rejected += 1
      report.push({
        sourceId: record.sourceId,
        status: 'rejected',
        reason: decision?.notes || `NON_TOUR_KIND:${record.kind}`,
      })
      continue
    }
    if (decision?.action === 'skip') {
      state.skippedDecision += 1
      report.push({
        sourceId: record.sourceId,
        status: 'skippedDecision',
        reason: decision.notes || 'skip',
      })
      continue
    }
    if (decision?.action === 'reject') {
      state.rejected += 1
      report.push({
        sourceId: record.sourceId,
        status: 'rejected',
        reason: decision?.notes || decisionError,
      })
      continue
    }
    if (decisionError) {
      state.errors += 1
      report.push({ sourceId: record.sourceId, status: 'error', reason: decisionError })
      continue
    }

    const tourCode = sourceTourCode(record.sourceId, record.source.sourceSystem)
    let existing: any
    try {
      existing = await findExistingProduct(payload, site.id, tourCode, req)
    } catch (error) {
      state.errors += 1
      report.push({
        sourceId: record.sourceId,
        status: 'error',
        reason: error instanceof Error ? error.message : String(error),
      })
      continue
    }
    if (existing) {
      state.skippedExisting += 1
      report.push({
        sourceId: record.sourceId,
        status: 'skippedExisting',
        productId: existing.id,
        tourCode,
      })
      continue
    }

    const slug = decision?.approvedSlug as string
    const title = removeAirlineMarkers(decision?.approvedTitle?.trim() || record.title)
    const pagePath = `/tour/${slug}`
    const imageSelection = getApprovedImages(record, decision as Decision)
    const futureDepartures = record.departures.filter(
      (departure) => new Date(departure.departureDate).getTime() > Date.now(),
    )
    let pageExisting: any
    try {
      pageExisting = await findPage(payload, site.id, pagePath, req)
    } catch (error) {
      state.errors += 1
      report.push({
        sourceId: record.sourceId,
        status: 'error',
        reason: error instanceof Error ? error.message : String(error),
      })
      continue
    }
    const predicted = {
      sourceId: record.sourceId,
      tourCode,
      slug,
      pagePath,
      existingPageId: pageExisting?.id || null,
      mediaCount: record.images.length,
      futureDepartures: futureDepartures.length,
      status: dryRun ? 'dryRun' : 'pending',
      batchId,
      parentPage: parentPage?.id || 'would-create:/tour',
    }
    if (dryRun) {
      report.push(predicted)
      state.created += 1
      continue
    }

    const createdMedia: Array<number | string> = []
    let createdPage: number | string | null = null
    let createdProduct: number | string | null = null
    const createdDepartures: Array<number | string> = []
    try {
      const mediaIDs: Array<number | string> = []
      const mediaBySourceKey = new Map<string, number | string>()
      for (const [imageIndex, image] of record.images.entries()) {
        const media = await resolveOrCreateMedia({
          image,
          imageIndex,
          payload,
          req,
          sourceId: record.sourceId,
          sourceSystem: record.source.sourceSystem,
          siteID: site.id,
          createdMedia,
          locale: importLocale,
        })
        mediaBySourceKey.set(image.sourceKey, media.doc.id)
        mediaIDs.push(media.doc.id)
        if (media.reused) state.mediaReused += 1
        else state.mediaCreated += 1
      }
      const heroMedia = imageSelection.hero
        ? mediaBySourceKey.get(imageSelection.hero.sourceKey) || null
        : null
      const gallery = imageSelection.gallery
        .map((image) => mediaBySourceKey.get(image.sourceKey))
        .filter(Boolean) as Array<number | string>
      const page =
        pageExisting ||
        (await payload.create({
          collection: 'pages',
          locale: importLocale,
          req,
          context,
          data: buildPageData({
            record,
            slug,
            title,
            siteID: site.id,
            parentPage: parentPage!.id,
            heroMedia,
            siteCode,
          }) as never,
        }))
      if (!pageExisting) {
        createdPage = page.id
        state.pagesCreated += 1
      }
      const product = await payload.create({
        collection: 'tour-products',
        locale: importLocale,
        req,
        context,
        data: buildProductData({
          record,
          slug,
          title,
          siteID: site.id,
          wrapperPage: page.id,
          heroMedia,
          gallery: gallery.length ? gallery : mediaIDs,
          batchId,
        }) as never,
      })
      createdProduct = product.id
      state.productsCreated += 1
      for (const departure of futureDepartures) {
        const created = await payload.create({
          collection: 'tour-departures',
          locale: importLocale,
          req,
          context,
          data: {
            _status: 'draft',
            site: site.id,
            tourProduct: product.id,
            departureDate: departure.departureDate,
            priceFrom: departure.priceFrom,
            currency: departure.currency || record.currency || 'USD',
            airline: departure.airline || record.airline,
            availabilityStatus: 'open',
            isFeatured: createdDepartures.length === 0,
          } as never,
        })
        createdDepartures.push(created.id)
        state.departuresCreated += 1
      }
      const verified = await findExistingProduct(payload, site.id, tourCode, req)
      if (
        !verified ||
        String(verified.wrapperPage?.id || verified.wrapperPage) !== String(page.id)
      ) {
        throw new Error('POST_WRITE_VERIFY_FAILED')
      }
      state.created += 1
      report.push({
        ...predicted,
        status: 'created',
        pageId: page.id,
        createdPageId: createdPage,
        productId: product.id,
        departureIds: createdDepartures,
        mediaIds: createdMedia,
      })
    } catch (error) {
      state.errors += 1
      for (const id of createdDepartures.reverse()) {
        await payload
          .delete({ collection: 'tour-departures', id, overrideAccess: true, req, context })
          .catch(() => undefined)
      }
      if (createdProduct)
        await payload
          .delete({
            collection: 'tour-products',
            id: createdProduct,
            overrideAccess: true,
            req,
            context,
          })
          .catch(() => undefined)
      if (createdPage)
        await payload
          .delete({ collection: 'pages', id: createdPage, overrideAccess: true, req, context })
          .catch(() => undefined)
      for (const id of createdMedia.reverse()) {
        await payload
          .delete({ collection: 'media', id, overrideAccess: true, req, context })
          .catch(() => undefined)
      }
      report.push({
        sourceId: record.sourceId,
        status: 'error',
        reason: error instanceof Error ? error.message : String(error),
      })
    }
  }

  const outputPath = path.join(
    path.dirname(filePath),
    dryRun ? 'import-dry-run.json' : 'import-result.json',
  )
  await fs.mkdir(path.dirname(outputPath), { recursive: true })
  await fs.writeFile(
    outputPath,
    `${JSON.stringify({ runAt: new Date().toISOString(), dryRun, siteCode, siteId: site.id, locale: importLocale, batchId, adminUserId: adminUser.id, mode, state, report }, null, 2)}\n`,
    'utf8',
  )
  console.log(JSON.stringify({ outputPath, ...state }, null, 2))
  if (state.errors > 0) process.exitCode = 1
  await payload.destroy()
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
