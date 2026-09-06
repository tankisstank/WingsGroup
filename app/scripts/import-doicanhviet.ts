import 'dotenv/config'

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type { File, Payload, PayloadRequest, Where } from 'payload'

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

export const WINGS_GO_SITE_CODE = 'wings-go' as const

type InputEnvelope = {
  records: NormalizedTour[]
  sourceSnapshotHash?: string
}

export type ImportPlanRecord = {
  sourceId: string
  status: 'would-create' | 'skippedDecision' | 'rejected' | 'error'
  reason?: string
  tourCode?: string
  slug?: string
  pagePath?: string
  departureDates?: Array<{
    departureDate: string
    returnDate: string
    departureCity?: string
    priceFrom: number
    currency?: string
  }>
  sourceHash?: string
}

export type ImportPlan = {
  version: 1
  mode: 'dry-run'
  dryRun: true
  siteCode: typeof WINGS_GO_SITE_CODE
  locale: 'en' | 'vi'
  batchId: string
  selectionSource: 'only' | 'approved-decisions' | 'all'
  selectedSourceIds: string[]
  sourceSnapshotHash?: string
  records: ImportPlanRecord[]
}

type ImportPlanInput = {
  args: Record<string, string | boolean>
  records: NormalizedTour[]
  decisions: DecisionMap
  inputSourceSnapshotHash?: string
}

type ValidatedImportInput = {
  args: Record<string, string | boolean>
  records: NormalizedTour[]
  decisions: DecisionMap
  filePath: string
  decisionsPath: string
  sourceSnapshotHash?: string
  only?: Set<string>
  limit?: number
  siteCode: typeof WINGS_GO_SITE_CODE
  importLocale: 'en' | 'vi'
  batchId: string
  adminEmail?: string
  selectionSource: 'only' | 'approved-decisions' | 'all'
  selected: NormalizedTour[]
}

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

const isSha256 = (value: string) => /^[a-f0-9]{64}$/iu.test(value)

const normalizedArg = (args: Record<string, string | boolean>, key: string) => {
  const value = args[key]
  return typeof value === 'string' ? value.trim() : ''
}

const parseInputEnvelope = (value: unknown): InputEnvelope => {
  if (Array.isArray(value)) return { records: value as NormalizedTour[] }
  if (!value || typeof value !== 'object') throw new Error('Normalized input must be an array')
  const envelope = value as { records?: unknown; sourceSnapshotHash?: unknown }
  if (!Array.isArray(envelope.records)) throw new Error('Normalized input records must be an array')
  const sourceSnapshotHash =
    typeof envelope.sourceSnapshotHash === 'string' ? envelope.sourceSnapshotHash.trim() : undefined
  if (sourceSnapshotHash && !isSha256(sourceSnapshotHash)) {
    throw new Error('Invalid sourceSnapshotHash in normalized input')
  }
  return { records: envelope.records as NormalizedTour[], sourceSnapshotHash }
}

const validateSourceSnapshotHash = ({ expected, input }: { expected?: string; input?: string }) => {
  if (!expected) return input
  if (!isSha256(expected)) throw new Error('Invalid --source-inventory-hash')
  if (!input) throw new Error('--source-inventory-hash is not bound to normalized input')
  if (expected.toLowerCase() !== input.toLowerCase()) {
    throw new Error('--source-inventory-hash does not match normalized input')
  }
  return input
}

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
  _dryRun: boolean,
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
  return null
}

const createTourParentPage = async (
  payload: Payload,
  siteID: number | string,
  siteCode: string,
  req: PayloadRequest,
  locale: 'en' | 'vi',
) => {
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
    limit: 2,
    pagination: false,
    overrideAccess: true,
    req,
    where: whereAnd({ site: { equals: siteID } }, { tourCode: { equals: tourCode } }),
  })
  if (result.docs.length > 1) {
    throw new Error(`Product collision: multiple products for ${tourCode}`)
  }
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
    limit: 2,
    pagination: false,
    overrideAccess: true,
    req,
    where: whereAnd({ site: { equals: siteID } }, { pathname: { equals: pathname } }),
  })
  if (result.docs.length > 1) {
    throw new Error(`Page-path collision: multiple pages for ${pathname}`)
  }
  return (result.docs[0] as any) || null
}

const vndDepartures = (record: NormalizedTour) =>
  record.departures.filter((departure) => departure.currency === 'VND')

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
  priceFrom: vndDepartures(record)[0]?.priceFrom,
  currency: vndDepartures(record).length ? 'VND' : undefined,
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

const sortRecords = (records: NormalizedTour[]) =>
  [...records].sort((left, right) =>
    left.sourceId.localeCompare(right.sourceId, 'en', { numeric: true }),
  )

const assertApprovedSlugUniqueness = (records: NormalizedTour[], decisions: DecisionMap) => {
  const approvedSlugs = new Map<string, string>()
  for (const record of records.filter((item) => item.kind === 'tour')) {
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
}

const commonInput = (args: Record<string, string | boolean>) => {
  const mode = String(args.mode || 'create-only')
  if (mode !== 'create-only') throw new Error('Phase lõi chỉ hỗ trợ --mode create-only')
  if (args.publish || args.overwrite)
    throw new Error('Phase lõi không hỗ trợ --publish hoặc --overwrite')

  const rawSiteCode = Object.prototype.hasOwnProperty.call(args, 'site-code')
    ? normalizedArg(args, 'site-code')
    : WINGS_GO_SITE_CODE
  const siteCode = rawSiteCode || WINGS_GO_SITE_CODE
  if (Object.prototype.hasOwnProperty.call(args, 'site-code') && !rawSiteCode) {
    throw new Error(`--site-code must be ${WINGS_GO_SITE_CODE}`)
  }
  if (siteCode !== WINGS_GO_SITE_CODE) {
    throw new Error(`--site-code must be ${WINGS_GO_SITE_CODE}`)
  }

  const importLocale = normalizedArg(args, 'locale') || 'vi'
  if (importLocale !== 'vi' && importLocale !== 'en')
    throw new Error('Only --locale vi|en is supported')

  const dryRun = Boolean(args['dry-run'])
  const explicitBatchId = normalizedArg(args, 'batch-id')
  if (!dryRun && !explicitBatchId) throw new Error('Apply requires explicit --batch-id')
  const batchId = explicitBatchId || 'dcv-dry-run'
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{2,79}$/u.test(batchId)) throw new Error('Invalid --batch-id')

  const adminEmail = normalizedArg(args, 'admin-email')
  if (!dryRun && !adminEmail) throw new Error('Apply requires --admin-email')

  return { dryRun, siteCode, importLocale, batchId, adminEmail: adminEmail || undefined }
}

const selectedRecordsFor = ({
  args,
  records,
  decisions,
  dryRun,
}: {
  args: Record<string, string | boolean>
  records: NormalizedTour[]
  decisions: DecisionMap
  dryRun: boolean
}) => {
  const onlyProvided = Object.prototype.hasOwnProperty.call(args, 'only')
  const onlyValue = normalizedArg(args, 'only')
  if (onlyProvided && !onlyValue) throw new Error('--only must contain at least one source ID')
  const only = onlyProvided ? selectedSourceIDs(onlyValue) : undefined
  const limitValue = normalizedArg(args, 'limit')
  const limit = limitValue ? Number(limitValue) : undefined
  if (limit !== undefined && (!Number.isInteger(limit) || limit < 1)) {
    throw new Error('--limit must be a positive integer')
  }
  if (!dryRun && limit !== undefined)
    throw new Error('Apply requires exact selection; --limit is not allowed')

  const sorted = sortRecords(records)
  if (only) {
    const available = new Set(records.map((record) => record.sourceId))
    const missing = [...only].filter((sourceId) => !available.has(sourceId)).sort()
    if (missing.length) throw new Error(`--only contains unknown source IDs: ${missing.join(',')}`)
    return {
      only,
      limit,
      selectionSource: 'only' as const,
      selected: sorted.filter((record) => only.has(record.sourceId)),
    }
  }

  if (!dryRun) {
    const approved = sorted.filter(
      (record) =>
        decisions[record.sourceId]?.action === 'create' &&
        decisions[record.sourceId]?.approved === true,
    )
    if (!approved.length)
      throw new Error('Apply requires --only or a non-empty approved decision set')
    return { only, limit, selectionSource: 'approved-decisions' as const, selected: approved }
  }

  return {
    only,
    limit,
    selectionSource: 'all' as const,
    selected: sorted.slice(0, limit),
  }
}

export const validateImportCLI = ({
  args,
  records,
  decisions,
}: {
  args: Record<string, string | boolean>
  records: NormalizedTour[]
  decisions: DecisionMap
}) => {
  const common = commonInput(args)
  const selection = selectedRecordsFor({ args, records, decisions, dryRun: common.dryRun })
  if (!selection.selected.length)
    throw new Error('Không có normalized record phù hợp --only/--limit')
  assertApprovedSlugUniqueness(selection.selected, decisions)
  if (!common.dryRun) {
    const invalid = selection.selected.filter((record) => {
      const action = decisions[record.sourceId]?.action
      return (
        action !== 'skip' &&
        action !== 'reject' &&
        Boolean(validateDecision(record, decisions[record.sourceId]))
      )
    })
    if (invalid.length) {
      throw new Error(
        `Apply selection contains invalid decisions: ${invalid.map((record) => `${record.sourceId}:${validateDecision(record, decisions[record.sourceId])}`).join('; ')}`,
      )
    }
  }
  return { ...common, ...selection }
}

export const buildImportPlan = ({
  args,
  records,
  decisions,
  inputSourceSnapshotHash,
}: ImportPlanInput): ImportPlan => {
  const { dryRun, siteCode, importLocale, batchId } = commonInput(args)
  if (!dryRun) throw new Error('buildImportPlan is only for --dry-run')
  const sourceSnapshotHash = validateSourceSnapshotHash({
    expected: normalizedArg(args, 'source-inventory-hash') || undefined,
    input: inputSourceSnapshotHash,
  })
  const selection = selectedRecordsFor({ args, records, decisions, dryRun })
  if (!selection.selected.length)
    throw new Error('Không có normalized record phù hợp --only/--limit')
  assertApprovedSlugUniqueness(selection.selected, decisions)

  const planRecords: ImportPlanRecord[] = selection.selected.map((record) => {
    const decision = decisions[record.sourceId]
    const decisionError = validateDecision(record, decision)
    if (record.kind !== 'tour') {
      return {
        sourceId: record.sourceId,
        status: 'rejected',
        reason: decision?.notes || `NON_TOUR_KIND:${record.kind}`,
      }
    }
    if (decision?.action === 'skip') {
      return {
        sourceId: record.sourceId,
        status: 'skippedDecision',
        reason: decision.notes || 'skip',
      }
    }
    if (decision?.action === 'reject') {
      return {
        sourceId: record.sourceId,
        status: 'rejected',
        reason: decision.notes || decisionError || 'reject',
      }
    }
    if (decisionError) return { sourceId: record.sourceId, status: 'error', reason: decisionError }

    const slug = decision!.approvedSlug!
    return {
      sourceId: record.sourceId,
      status: 'would-create',
      tourCode: sourceTourCode(record.sourceId, record.source.sourceSystem),
      slug,
      pagePath: `/tour/${slug}`,
      departureDates: record.departures.map((departure) => ({
        departureDate: departure.departureDate,
        returnDate: departure.returnDate,
        departureCity: departure.departureCity,
        priceFrom: departure.priceFrom,
        currency: departure.currency,
      })),
      sourceHash: record.sourceHash,
    }
  })

  return {
    version: 1,
    mode: 'dry-run',
    dryRun: true,
    siteCode,
    locale: importLocale,
    batchId,
    selectionSource: selection.selectionSource,
    selectedSourceIds: selection.selected.map((record) => record.sourceId),
    sourceSnapshotHash,
    records: planRecords,
  }
}

const loadValidatedInput = async (): Promise<ValidatedImportInput> => {
  const args = parseArgs(process.argv.slice(2))
  const { dryRun, siteCode, importLocale, batchId, adminEmail } = commonInput(args)
  const filePath = path.resolve(
    String(args.file || path.join(defaultArtifactDir, 'tours.normalized.json')),
  )
  const decisionsPath = path.resolve(
    String(args.decisions || path.join(path.dirname(filePath), 'import-decisions.json')),
  )
  const input = parseInputEnvelope(await parseJSONFile<unknown>(filePath))
  const decisions = await parseJSONFile<DecisionMap>(decisionsPath)
  const sourceSnapshotHash = validateSourceSnapshotHash({
    expected: normalizedArg(args, 'source-inventory-hash') || undefined,
    input: input.sourceSnapshotHash,
  })
  const selection = selectedRecordsFor({
    args,
    records: input.records,
    decisions,
    dryRun,
  })
  if (!selection.selected.length)
    throw new Error('Không có normalized record phù hợp --only/--limit')
  assertApprovedSlugUniqueness(selection.selected, decisions)
  validateImportCLI({ args, records: input.records, decisions })
  return {
    args,
    records: input.records,
    decisions,
    filePath,
    decisionsPath,
    sourceSnapshotHash,
    only: selection.only,
    limit: selection.limit,
    siteCode,
    importLocale,
    batchId,
    adminEmail,
    selectionSource: selection.selectionSource,
    selected: selection.selected,
  }
}

const main = async () => {
  const input = await loadValidatedInput()
  const {
    args,
    records,
    decisions,
    filePath,
    sourceSnapshotHash,
    siteCode,
    importLocale,
    batchId,
  } = input
  const dryRun = Boolean(args['dry-run'])

  if (dryRun) {
    const plan = buildImportPlan({
      args,
      records,
      decisions,
      inputSourceSnapshotHash: sourceSnapshotHash,
    })
    const outputPath = path.join(path.dirname(filePath), 'import-dry-run.json')
    await fs.mkdir(path.dirname(outputPath), { recursive: true })
    await fs.writeFile(outputPath, `${JSON.stringify(plan, null, 2)}\n`, 'utf8')
    console.log(JSON.stringify({ outputPath, ...plan }, null, 2))
    return
  }

  const [{ createLocalReq, getPayload }, { default: config }] = await Promise.all([
    import('payload'),
    import('../src/payload.config'),
  ])
  const payload = await getPayload({ config })
  try {
    const adminUser = await resolveAdmin(payload, input.adminEmail!)
    const req = await createLocalReq({ user: adminUser }, payload)
    const site = await resolveSite(payload, req, siteCode)
    let parentPage = await resolveTourParentPage(
      payload,
      site.id,
      siteCode,
      req,
      false,
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

    // Preflight every write candidate before creating the parent page or any media.
    for (const record of input.selected) {
      const decision = decisions[record.sourceId]
      if (record.kind !== 'tour' || decision?.action === 'skip' || decision?.action === 'reject')
        continue
      const decisionError = validateDecision(record, decision)
      if (decisionError) throw new Error(`${record.sourceId}: ${decisionError}`)
      const tourCode = sourceTourCode(record.sourceId, record.source.sourceSystem)
      const slug = decision!.approvedSlug!
      const existingProduct = await findExistingProduct(payload, site.id, tourCode, req)
      if (existingProduct) {
        throw new Error(`IMPORT_COLLISION existing product ${tourCode} for ${record.sourceId}`)
      }
      const existingPage = await findPage(payload, site.id, `/tour/${slug}`, req)
      if (existingPage) {
        throw new Error(`IMPORT_COLLISION existing page path /tour/${slug} for ${record.sourceId}`)
      }
    }

    if (!parentPage) {
      parentPage = await createTourParentPage(payload, site.id, siteCode, req, importLocale)
      state.pagesCreated += 1
    }

    for (const record of input.selected) {
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
      const slug = decision?.approvedSlug as string
      const title = removeAirlineMarkers(decision?.approvedTitle?.trim() || record.title)
      const pagePath = `/tour/${slug}`
      const imageSelection = getApprovedImages(record, decision as Decision)
      const futureDepartures = vndDepartures(record).filter(
        (departure) => new Date(departure.departureDate).getTime() > Date.now(),
      )
      const predicted = {
        sourceId: record.sourceId,
        tourCode,
        slug,
        pagePath,
        mediaCount: record.images.length,
        futureDepartures: futureDepartures.length,
        status: 'pending',
        batchId,
        parentPage: parentPage.id,
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
        const page = await payload.create({
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
        })
        createdPage = page.id
        state.pagesCreated += 1
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
              returnDate: departure.returnDate,
              departureCity: departure.departureCity,
              priceFrom: departure.priceFrom,
              currency: departure.currency,
              airline: departure.airline || record.airline,
              sourceProvenance: {
                sourceSystem: record.source.sourceSystem,
                sourceUrl: record.sourceUrl || record.source.sourceUrl,
                sourcePageSha256: record.sourceHash,
                sourceRowSha256: record.sourceHash,
                checkedAt: record.crawledAt || record.source.crawledAt,
                managedBy: `import:${batchId}`,
              },
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
  } finally {
    await payload.destroy()
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))
) {
  main().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}
