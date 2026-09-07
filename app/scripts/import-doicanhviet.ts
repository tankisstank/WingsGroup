import 'dotenv/config'

import { createHash } from 'node:crypto'
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

export type InputEnvelope = {
  records: NormalizedTour[]
  sourceSnapshotHash?: string
  referenceDate?: string
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
  referenceDate: string
  runId: string
  only?: Set<string>
  limit?: number
  siteCode: typeof WINGS_GO_SITE_CODE
  importLocale: 'en' | 'vi'
  batchId: string
  adminEmail?: string
  selectionSource: 'only' | 'approved-decisions' | 'all'
  selected: NormalizedTour[]
}

type ImportRunArtifacts = {
  runDir: string
  runId: string
  normalizedDatasetHash: string
  decisionFileHash: string
  sourceInventoryHash?: string
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

const dateOnly = (value: unknown) => String(value || '').slice(0, 10)

const isISODate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

const currentUTCDate = () => new Date().toISOString().slice(0, 10)

const validRunID = (value: string) => /^[a-zA-Z0-9][a-zA-Z0-9._-]{2,119}$/u.test(value)

const hashFile = async (filePath: string) => {
  const hash = createHash('sha256')
  const data = await fs.readFile(filePath)
  hash.update(data)
  return { bytes: data.byteLength, sha256: hash.digest('hex') }
}

const writeExclusiveJSON = async (filePath: string, value: unknown) => {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' })
}

const normalizedArg = (args: Record<string, string | boolean>, key: string) => {
  const value = args[key]
  return typeof value === 'string' ? value.trim() : ''
}

export const parseInputEnvelope = (value: unknown): InputEnvelope => {
  if (Array.isArray(value)) return { records: value as NormalizedTour[] }
  if (!value || typeof value !== 'object') throw new Error('Normalized input must be an array')
  const envelope = value as {
    records?: unknown
    sourceSnapshotHash?: unknown
    referenceDate?: unknown
  }
  if (!Array.isArray(envelope.records)) throw new Error('Normalized input records must be an array')
  const sourceSnapshotHash =
    typeof envelope.sourceSnapshotHash === 'string' ? envelope.sourceSnapshotHash.trim() : undefined
  if (sourceSnapshotHash && !isSha256(sourceSnapshotHash)) {
    throw new Error('Invalid sourceSnapshotHash in normalized input')
  }
  const referenceDate =
    typeof envelope.referenceDate === 'string' ? envelope.referenceDate.trim() : undefined
  if (referenceDate && !isISODate(referenceDate)) {
    throw new Error('Invalid referenceDate in normalized input')
  }
  return { records: envelope.records as NormalizedTour[], sourceSnapshotHash, referenceDate }
}

const resolveRunID = (args: Record<string, string | boolean>, batchId: string) => {
  const supplied = normalizedArg(args, 'run-id')
  const runId = supplied || `${batchId}-${new Date().toISOString().replace(/[^0-9]/gu, '').slice(0, 17)}`
  if (!validRunID(runId)) throw new Error('Invalid --run-id')
  return runId
}

export const prepareRunArtifacts = async ({
  decisionsPath,
  filePath,
  referenceDate,
  runId,
  sourceSnapshotHash,
}: {
  decisionsPath: string
  filePath: string
  referenceDate: string
  runId: string
  sourceSnapshotHash?: string
}): Promise<ImportRunArtifacts> => {
  const runDir = path.join(path.dirname(filePath), runId)
  await fs.mkdir(runDir, { recursive: false })
  const [normalized, decisions] = await Promise.all([hashFile(filePath), hashFile(decisionsPath)])
  const sourceInventoryPath = path.join(path.dirname(filePath), 'source-inventory.json')
  const sourceInventory = await fs
    .access(sourceInventoryPath)
    .then(() => hashFile(sourceInventoryPath))
    .catch(() => undefined)

  await Promise.all([
    fs.copyFile(filePath, path.join(runDir, 'tours.normalized.json')),
    fs.copyFile(decisionsPath, path.join(runDir, 'import-decisions.json')),
    sourceInventory
      ? fs.copyFile(sourceInventoryPath, path.join(runDir, 'source-inventory.json'))
      : Promise.resolve(),
  ])
  const provenance = {
    version: 1,
    runId,
    executionDate: new Date().toISOString(),
    referenceDate,
    sourceSnapshotHash: sourceSnapshotHash || null,
    source: {
      inventoryPath: sourceInventoryPath,
      inventorySha256: sourceInventory?.sha256 || null,
    },
    normalized: { path: filePath, ...normalized },
    decisions: { path: decisionsPath, ...decisions, retainedCopy: 'import-decisions.json' },
    retainedCopies: {
      normalized: 'tours.normalized.json',
      sourceInventory: sourceInventory ? 'source-inventory.json' : null,
      decisions: 'import-decisions.json',
    },
  }
  await writeExclusiveJSON(path.join(runDir, 'provenance.json'), provenance)
  await fs.writeFile(
    path.join(runDir, 'checksums.sha256'),
    [
      `${normalized.sha256}  normalized-source:${filePath}`,
      `${decisions.sha256}  import-decisions.json`,
      sourceInventory ? `${sourceInventory.sha256}  source-inventory:${sourceInventoryPath}` : null,
    ]
      .filter(Boolean)
      .join('\n') + '\n',
    'utf8',
  )
  return {
    runDir,
    runId,
    normalizedDatasetHash: normalized.sha256,
    decisionFileHash: decisions.sha256,
    sourceInventoryHash: sourceInventory?.sha256,
  }
}

const refreshRunChecksums = async (artifacts: ImportRunArtifacts) => {
  const names = [
    'import-decisions.json',
    'provenance.json',
    'tours.normalized.json',
    'source-inventory.json',
    'import-dry-run.json',
    'import-result.json',
  ]
  const lines: string[] = []
  for (const name of names) {
    const filePath = path.join(artifacts.runDir, name)
    const file = await fs
      .access(filePath)
      .then(() => hashFile(filePath))
      .catch(() => undefined)
    if (file) lines.push(`${file.sha256}  ${name}`)
  }
  lines.push(`${artifacts.normalizedDatasetHash}  normalized-source`)
  lines.push(`${artifacts.decisionFileHash}  import-decisions.json.source`)
  if (artifacts.sourceInventoryHash) lines.push(`${artifacts.sourceInventoryHash}  source-inventory`)
  await fs.writeFile(path.join(artifacts.runDir, 'checksums.sha256'), `${lines.join('\n')}\n`, 'utf8')
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

const findExistingProductBySlug = async (
  payload: Payload,
  siteID: number | string,
  slug: string,
  req: PayloadRequest,
) => {
  const result = await payload.find({
    collection: 'tour-products',
    depth: 0,
    limit: 2,
    pagination: false,
    overrideAccess: true,
    req,
    where: whereAnd({ site: { equals: siteID } }, { slug: { equals: slug } }),
  })
  if (result.docs.length > 1) throw new Error(`Product slug collision: multiple products for ${slug}`)
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

export type ImportState = {
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
  mediaRolledBack: number
  pagesRolledBack: number
  productsRolledBack: number
  departuresRolledBack: number
  parentPagesCreated: number
  parentPagesRolledBack: number
  cleanupFailures: number
  partialFailures: number
}

export const activeCounts = (state: ImportState) => ({
  media: state.mediaCreated - state.mediaRolledBack,
  pages: state.pagesCreated - state.pagesRolledBack,
  products: state.productsCreated - state.productsRolledBack,
  departures: state.departuresCreated - state.departuresRolledBack,
})

export type CleanupOutcome = {
  status: 'complete' | 'partial-failure'
  referenceCoverage: 'all-configured-collections-records-only'
  deleted: {
    media: Array<number | string>
    page: Array<number | string>
    product: Array<number | string>
    departures: Array<number | string>
  }
  retained: Array<{ collection: string; id: number | string; reason: string }>
  errors: Array<{ collection: string; id: number | string; error: string }>
}

export type MediaReferenceIndex = {
  ids: Set<string>
  coverage: 'complete' | 'incomplete'
  gaps: string[]
}

const collectMediaRelationIDs = (value: unknown, ids: Set<string>) => {
  if (Array.isArray(value)) {
    value.forEach((item) => collectMediaRelationIDs(item, ids))
    return
  }
  if (typeof value === 'number' || typeof value === 'string') {
    ids.add(String(value))
    return
  }
  if (value && typeof value === 'object') {
    const relationID = (value as { id?: unknown }).id
    if (typeof relationID === 'number' || typeof relationID === 'string') ids.add(String(relationID))
  }
}

const lexicalElementNodeTypes = new Set([
  'root',
  'paragraph',
  'heading',
  'quote',
  'list',
  'listitem',
  'link',
  'autolink',
  'code',
  'table',
  'tablerow',
  'tablecell',
])
const lexicalLeafNodeTypes = new Set([
  'text',
  'linebreak',
  'tab',
  'horizontalrule',
])
const lexicalBlockSchemas: Record<string, { mediaFields: string[]; richTextFields: string[] }> = {
  banner: { mediaFields: [], richTextFields: ['content'] },
  code: { mediaFields: [], richTextFields: [] },
  mediaBlock: { mediaFields: ['media'], richTextFields: [] },
}

const isObjectRecord = (value: unknown): value is Record<string, any> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value))

const scanLexicalMediaReferences = (
  value: unknown,
  ids: Set<string>,
  gaps: string[],
  pathPrefix: string,
) => {
  if (value == null) return
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanLexicalMediaReferences(item, ids, gaps, `${pathPrefix}[${index}]`))
    return
  }
  if (!isObjectRecord(value)) {
    gaps.push(`${pathPrefix}:malformed-lexical-node`)
    return
  }

  // Payload stores a rich-text field as SerializedEditorState: { root: {...} }.
  if (isObjectRecord(value.root) && value.type === undefined) {
    scanLexicalMediaReferences(value.root, ids, gaps, `${pathPrefix}.root`)
    return
  }

  const nodeType = typeof value.type === 'string' ? value.type : ''
  if (nodeType === 'upload' || nodeType === 'relationship') {
    const relationTo = value.relationTo
    if (relationTo === undefined || relationTo === null) {
      gaps.push(`${pathPrefix}:missing-relation-to`)
    } else if (relationTo === 'media' || (Array.isArray(relationTo) && relationTo.includes('media'))) {
      if (value.value === undefined || value.value === null) gaps.push(`${pathPrefix}:missing-media-value`)
      else collectMediaRelationIDs(value.value, ids)
    }
    return
  }
  if (nodeType === 'block' || nodeType === 'inlineBlock') {
    if (!isObjectRecord(value.fields) || typeof value.fields.blockType !== 'string') {
      gaps.push(`${pathPrefix}:malformed-block`)
      return
    }
    const schema = lexicalBlockSchemas[value.fields.blockType]
    if (!schema) {
      gaps.push(`${pathPrefix}.${value.fields.blockType}:unknown-block-schema`)
      return
    }
    for (const fieldName of schema.mediaFields) {
      if (value.fields[fieldName] === undefined || value.fields[fieldName] === null)
        gaps.push(`${pathPrefix}.${fieldName}:missing-media-value`)
      else collectMediaRelationIDs(value.fields[fieldName], ids)
    }
    for (const fieldName of schema.richTextFields)
      scanLexicalMediaReferences(value.fields[fieldName], ids, gaps, `${pathPrefix}.${fieldName}`)
    return
  }
  if (!lexicalElementNodeTypes.has(nodeType) && !lexicalLeafNodeTypes.has(nodeType)) {
    gaps.push(`${pathPrefix}:unknown-node-${nodeType || 'missing-type'}`)
    return
  }
  if (lexicalElementNodeTypes.has(nodeType)) {
    if (!Array.isArray(value.children)) {
      gaps.push(`${pathPrefix}:missing-children`)
      return
    }
    value.children.forEach((child: unknown, index: number) =>
      scanLexicalMediaReferences(child, ids, gaps, `${pathPrefix}.children[${index}]`),
    )
  }
}

const fieldValue = (value: any, name?: string) => (name ? value?.[name] : value)

const scanMediaFields = (
  fields: any[],
  value: any,
  ids: Set<string>,
  gaps: string[],
  pathPrefix: string,
) => {
  if (!Array.isArray(fields)) {
    gaps.push(`${pathPrefix}:missing-field-schema`)
    return
  }
  for (const field of fields) {
    if (field.type === 'tabs') {
      for (const tab of field.tabs || [])
        scanMediaFields(tab.fields, value, ids, gaps, `${pathPrefix}.tabs`)
      continue
    }
    if (field.type === 'row' || field.type === 'collapsible') {
      scanMediaFields(field.fields, value, ids, gaps, `${pathPrefix}.${field.type}`)
      continue
    }

    const current = fieldValue(value, field.name)
    const fieldPath = field.name ? `${pathPrefix}.${field.name}` : pathPrefix
    // A localized rich-text value is a locale map, not a Lexical node. Recurse
    // into each locale before inspecting the field itself so normal Payload
    // localization does not make reference coverage look incomplete.
    if (field.localized && current && typeof current === 'object' && !Array.isArray(current)) {
      for (const localeValue of Object.values(current)) {
        scanMediaFields(
          [{ ...field, localized: false }],
          { [field.name]: localeValue },
          ids,
          gaps,
          `${fieldPath}[locale]`,
        )
      }
      continue
    }
    if (field.type === 'upload' || field.type === 'relationship') {
      const relationTo = field.relationTo
      if (relationTo === 'media' || (Array.isArray(relationTo) && relationTo.includes('media')))
        collectMediaRelationIDs(current, ids)
    }
    if (field.type === 'json' && current != null) gaps.push(`${fieldPath}:dynamic-json`)
    if (field.type === 'richText' && current != null)
      scanLexicalMediaReferences(current, ids, gaps, fieldPath)

    if (field.type === 'array') {
      for (const item of Array.isArray(current) ? current : [])
        scanMediaFields(field.fields || [], item, ids, gaps, `${fieldPath}[]`)
    } else if (field.type === 'blocks') {
      for (const item of Array.isArray(current) ? current : []) {
        const block = (field.blocks || []).find((candidate: any) => candidate.slug === item?.blockType)
        if (!block) gaps.push(`${fieldPath}[${item?.blockType || 'unknown'}]:missing-block-schema`)
        else scanMediaFields(block.fields, item, ids, gaps, `${fieldPath}[${item.blockType}]`)
      }
    } else if (field.type === 'group') {
      scanMediaFields(field.fields, current, ids, gaps, fieldPath)
    } else if (field.fields && current && typeof current === 'object') {
      scanMediaFields(field.fields, current, ids, gaps, fieldPath)
    }
  }
}

const fieldsCanReferenceMedia = (fields: any[]): boolean => {
  if (!Array.isArray(fields)) return false
  return fields.some((field) => {
    if (field.type === 'upload' || field.type === 'relationship') {
      const relationTo = field.relationTo
      if (relationTo === 'media' || (Array.isArray(relationTo) && relationTo.includes('media'))) return true
    }
    if (field.type === 'richText') return true
    if (field.type === 'tabs') return (field.tabs || []).some((tab: any) => fieldsCanReferenceMedia(tab.fields))
    if (field.type === 'blocks') return (field.blocks || []).some((block: any) => fieldsCanReferenceMedia(block.fields))
    if (field.type === 'array' || field.type === 'group' || field.type === 'row' || field.type === 'collapsible')
      return fieldsCanReferenceMedia(field.fields)
    return false
  })
}

const fetchAll = async (payload: Payload, options: Record<string, unknown>) => {
  const result = await payload.find({
    ...options,
    depth: 0,
    limit: 10000,
    pagination: false,
    locale: 'all',
    overrideAccess: true,
  } as any)
  return result
}

export const buildMediaReferenceIndex = async (payload: Payload, req: PayloadRequest) => {
  const ids = new Set<string>()
  const gaps: string[] = []
  const configuredCollections = ((payload as any).config?.collections || []) as any[]
  for (const collection of configuredCollections) {
    // Avoid querying unrelated collections (notably payload-jobs). Besides
    // reducing work, this prevents schema drift in an unrelated collection
    // from blocking the media reference safety decision.
    if (!fieldsCanReferenceMedia(collection.fields)) continue
    const result = await fetchAll(payload, { collection: collection.slug, req })
    if (result.hasNextPage) gaps.push(`${collection.slug}:pagination-truncated`)
    for (const doc of result.docs || [])
      scanMediaFields(collection.fields, doc, ids, gaps, collection.slug)

    // Payload's versions table is only addressable for collections that opt in to
    // versions. Calling findVersions for an ordinary collection makes Drizzle build
    // a version query with no backing schema (and can throw before media cleanup).
    if (collection.versions) {
      const findVersions = (payload as any).findVersions
      if (typeof findVersions !== 'function') {
        gaps.push(`${collection.slug}:versions-api-unavailable`)
      } else {
        const versions = await findVersions.call(payload, {
          collection: collection.slug,
          depth: 0,
          limit: 10000,
          pagination: false,
          locale: 'all',
          overrideAccess: true,
          req,
        })
        if (versions.hasNextPage) gaps.push(`${collection.slug}:version-pagination-truncated`)
        for (const version of versions.docs || [])
          scanMediaFields(collection.fields, version.version || version, ids, gaps, `${collection.slug}.versions`)
      }
    }
  }
  for (const global of (((payload as any).config?.globals || []) as any[])) {
    if (!fieldsCanReferenceMedia(global.fields)) continue
    try {
      const doc = await (payload as any).findGlobal({ slug: global.slug, depth: 0, locale: 'all', overrideAccess: true, req })
      scanMediaFields(global.fields, doc, ids, gaps, `global:${global.slug}`)
      if (global.versions) {
        const findGlobalVersions = (payload as any).findGlobalVersions
        if (typeof findGlobalVersions !== 'function') {
          gaps.push(`global:${global.slug}:versions-api-unavailable`)
        } else {
          const versions = await findGlobalVersions.call(payload, {
            global: global.slug,
            depth: 0,
            limit: 10000,
            pagination: false,
            locale: 'all',
            overrideAccess: true,
            req,
          })
          if (versions.hasNextPage) gaps.push(`global:${global.slug}:version-pagination-truncated`)
          for (const version of versions.docs || [])
            scanMediaFields(global.fields, version.version || version, ids, gaps, `global:${global.slug}.versions`)
        }
      }
    } catch (error) {
      gaps.push(`global:${global.slug}:lookup-failed:${error instanceof Error ? error.message : String(error)}`)
    }
  }
  return { ids, coverage: gaps.length ? 'incomplete' : 'complete', gaps } as MediaReferenceIndex
}

export const cleanupCreatedResources = async ({
  createdDepartures,
  createdMedia,
  createdPage,
  createdProduct,
  payload,
  req,
  mediaReferenceIndex: suppliedMediaReferenceIndex,
}: {
  createdDepartures: Array<number | string>
  createdMedia: Array<number | string>
  createdPage: number | string | null
  createdProduct: number | string | null
  payload: Payload
  req: PayloadRequest
  mediaReferenceIndex?: MediaReferenceIndex
}): Promise<CleanupOutcome> => {
  const outcome: CleanupOutcome = {
    status: 'complete',
    referenceCoverage: 'all-configured-collections-records-only',
    deleted: { media: [], page: [], product: [], departures: [] },
    retained: [],
    errors: [],
  }

  const remove = async (collection: 'media' | 'pages' | 'tour-products' | 'tour-departures', id: number | string, key: keyof CleanupOutcome['deleted']) => {
    try {
      await payload.delete({ collection, id, overrideAccess: true, req, context })
      outcome.deleted[key].push(id)
    } catch (error) {
      outcome.status = 'partial-failure'
      outcome.errors.push({
        collection,
        id,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  for (const id of [...createdDepartures].reverse()) await remove('tour-departures', id, 'departures')
  if (createdProduct) await remove('tour-products', createdProduct, 'product')
  if (createdPage) await remove('pages', createdPage, 'page')

  let mediaReferenceIndex: MediaReferenceIndex
  if (suppliedMediaReferenceIndex) {
    mediaReferenceIndex = suppliedMediaReferenceIndex
  } else {
    try {
      mediaReferenceIndex = await buildMediaReferenceIndex(payload, req)
    } catch (error) {
      mediaReferenceIndex = {
        ids: new Set<string>(),
        coverage: 'incomplete',
        gaps: [`scanner-failed:${error instanceof Error ? error.message : String(error)}`],
      }
    }
  }

  for (const id of [...createdMedia].reverse()) {
    try {
      if (mediaReferenceIndex.coverage !== 'complete') {
        outcome.status = 'partial-failure'
        outcome.retained.push({
          collection: 'media',
          id,
          reason: `reference-coverage-incomplete:${mediaReferenceIndex.gaps.join('|')}`,
        })
        continue
      }
      if (mediaReferenceIndex.ids.has(String(id))) {
        outcome.retained.push({
          collection: 'media',
          id,
          reason: 'referenced-by-schema-guided-record-or-version',
        })
        continue
      }
      await remove('media', id, 'media')
    } catch (error) {
      outcome.status = 'partial-failure'
      outcome.retained.push({ collection: 'media', id, reason: 'reference-check-failed' })
      outcome.errors.push({
        collection: 'media',
        id,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }
  return outcome
}

const sortRecords = (records: NormalizedTour[]) =>
  [...records].sort((left, right) =>
    left.sourceId.localeCompare(right.sourceId, 'en', { numeric: true }),
  )

export const selectionCollisionMessages = (records: NormalizedTour[], decisions: DecisionMap) => {
  const collisions: string[] = []
  const seen = new Map<string, string>()
  const register = (kind: string, key: string, sourceId: string) => {
    const previous = seen.get(`${kind}:${key}`)
    if (previous) {
      collisions.push(`${kind} ${key} (${previous}, ${sourceId})`)
    } else {
      seen.set(`${kind}:${key}`, sourceId)
    }
  }

  for (const record of records) {
    const decision = decisions[record.sourceId]
    if (
      record.kind !== 'tour' ||
      decision?.action !== 'create' ||
      decision.approved !== true ||
      !decision.approvedSlug
    )
      continue
    const tourCode = sourceTourCode(record.sourceId, record.source.sourceSystem)
    register('source ID', record.sourceId, record.sourceId)
    register('tourCode', tourCode, record.sourceId)
    register('product slug', decision.approvedSlug, record.sourceId)
    register('page pathname', `/tour/${decision.approvedSlug}`, record.sourceId)
    const departureKeys = new Set<string>()
    for (const departure of vndDepartures(record)) {
      const key = `${tourCode}|${dateOnly(departure.departureDate)}`
      if (departureKeys.has(key)) collisions.push(`departure identity ${key} (${record.sourceId})`)
      departureKeys.add(key)
    }
  }
  return [...new Set(collisions)]
}

const assertSelectionCollisionFree = (records: NormalizedTour[], decisions: DecisionMap) => {
  const collisions = selectionCollisionMessages(records, decisions)
  if (collisions.length)
    throw new Error(`Approved slug collision or other selection collision: ${collisions.join('; ')}`)
}

const commonInput = (
  args: Record<string, string | boolean>,
  inputReferenceDate?: string,
) => {
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

  const importLocaleValue = normalizedArg(args, 'locale') || 'vi'
  if (importLocaleValue !== 'vi' && importLocaleValue !== 'en')
    throw new Error('Only --locale vi|en is supported')
  const importLocale = importLocaleValue as 'en' | 'vi'

  const dryRun = Boolean(args['dry-run'])
  const referenceDate = normalizedArg(args, 'reference-date') || inputReferenceDate || currentUTCDate()
  if (!isISODate(referenceDate)) throw new Error('Invalid --reference-date; expected YYYY-MM-DD')
  const explicitBatchId = normalizedArg(args, 'batch-id')
  if (!dryRun && !explicitBatchId) throw new Error('Apply requires explicit --batch-id')
  const batchId = explicitBatchId || 'dcv-dry-run'
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{2,79}$/u.test(batchId)) throw new Error('Invalid --batch-id')

  const adminEmail = normalizedArg(args, 'admin-email')
  if (!dryRun && !adminEmail) throw new Error('Apply requires --admin-email')
  if (!dryRun && args.apply !== true) throw new Error('Apply requires explicit --apply')

  return { dryRun, siteCode, importLocale, batchId, adminEmail: adminEmail || undefined, referenceDate }
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
  assertSelectionCollisionFree(selection.selected, decisions)
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
  assertSelectionCollisionFree(selection.selected, decisions)

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
  const filePath = path.resolve(
    String(args.file || path.join(defaultArtifactDir, 'tours.normalized.json')),
  )
  const decisionsPath = path.resolve(
    String(args.decisions || path.join(path.dirname(filePath), 'import-decisions.json')),
  )
  const input = parseInputEnvelope(await parseJSONFile<unknown>(filePath))
  const decisions = await parseJSONFile<DecisionMap>(decisionsPath)
  const { dryRun, siteCode, importLocale, batchId, adminEmail, referenceDate } = commonInput(
    args,
    input.referenceDate,
  )
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
  assertSelectionCollisionFree(selection.selected, decisions)
  validateImportCLI({ args, records: input.records, decisions })
  return {
    args,
    records: input.records,
    decisions,
    filePath,
    decisionsPath,
    sourceSnapshotHash,
    referenceDate,
    runId: resolveRunID(args, batchId),
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
    referenceDate,
    runId,
  } = input
  const artifacts = await prepareRunArtifacts({
    decisionsPath: input.decisionsPath,
    filePath: input.filePath,
    referenceDate,
    runId,
    sourceSnapshotHash,
  })
  const dryRun = Boolean(args['dry-run'])
  const mode = String(args.mode || 'create-only')

  if (dryRun) {
    const plan = buildImportPlan({
      args,
      records,
      decisions,
      inputSourceSnapshotHash: sourceSnapshotHash,
    })
    const outputPath = path.join(artifacts.runDir, 'import-dry-run.json')
    await writeExclusiveJSON(outputPath, {
      ...plan,
      runId,
      executionDate: new Date().toISOString(),
      referenceDate,
      normalizedDatasetHash: artifacts.normalizedDatasetHash,
      decisionFileHash: artifacts.decisionFileHash,
    })
    await refreshRunChecksums(artifacts)
    console.log(JSON.stringify({ outputPath, ...plan, runId, referenceDate }, null, 2))
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
      mediaRolledBack: 0,
      pagesRolledBack: 0,
      productsRolledBack: 0,
      departuresRolledBack: 0,
      parentPagesCreated: 0,
      parentPagesRolledBack: 0,
      cleanupFailures: 0,
      partialFailures: 0,
    }
    const report: Array<Record<string, unknown>> = []

    // Preflight every write candidate before creating the parent page or any media.
    const writeCandidates = input.selected.filter((record) => {
      const decision = decisions[record.sourceId]
      return record.kind === 'tour' && decision?.action === 'create' && decision.approved === true
    })
    assertSelectionCollisionFree(input.selected, decisions)
    const preflightCollisions: string[] = []
    for (const record of writeCandidates) {
      const decision = decisions[record.sourceId]
      const decisionError = validateDecision(record, decision)
      if (decisionError) throw new Error(`${record.sourceId}: ${decisionError}`)
      const tourCode = sourceTourCode(record.sourceId, record.source.sourceSystem)
      const slug = decision!.approvedSlug!
      try {
        const existingProduct = await findExistingProduct(payload, site.id, tourCode, req)
        if (existingProduct) {
          preflightCollisions.push(`existing product ${tourCode} for ${record.sourceId}`)
        }
      } catch (error) {
        preflightCollisions.push(
          `${tourCode} product lookup failed: ${error instanceof Error ? error.message : String(error)}`,
        )
      }
      try {
        const existingProductSlug = await findExistingProductBySlug(payload, site.id, slug, req)
        if (existingProductSlug) {
          preflightCollisions.push(`existing product slug ${slug} for ${record.sourceId}`)
        }
      } catch (error) {
        preflightCollisions.push(
          `${slug} product slug lookup failed: ${error instanceof Error ? error.message : String(error)}`,
        )
      }
      try {
        const existingPage = await findPage(payload, site.id, `/tour/${slug}`, req)
        if (existingPage) {
          preflightCollisions.push(`existing page path /tour/${slug} for ${record.sourceId}`)
        }
      } catch (error) {
        preflightCollisions.push(
          `${slug} page lookup failed: ${error instanceof Error ? error.message : String(error)}`,
        )
      }
    }
    if (preflightCollisions.length)
      throw new Error(`IMPORT_COLLISION preflight: ${[...new Set(preflightCollisions)].join('; ')}`)

    let parentPageCreated = false
    if (!parentPage && writeCandidates.length) {
      parentPage = await createTourParentPage(payload, site.id, siteCode, req, importLocale)
      state.pagesCreated += 1
      state.parentPagesCreated += 1
      parentPageCreated = true
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
      const referenceTimestamp = Date.parse(`${referenceDate}T00:00:00.000Z`)
      const futureDepartures = vndDepartures(record).filter(
        (departure) => new Date(departure.departureDate).getTime() > referenceTimestamp,
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
      const journal = {
        createdMediaIds: createdMedia,
        createdPageId: null as number | string | null,
        createdProductId: null as number | string | null,
        createdDepartureIds: createdDepartures,
      }
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
        journal.createdPageId = page.id
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
        journal.createdProductId = product.id
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
          journal,
        })
      } catch (error) {
        state.errors += 1
        const cleanup = await cleanupCreatedResources({
          createdDepartures,
          createdMedia,
          createdPage,
          createdProduct,
          payload,
          req,
        })
        state.departuresRolledBack += cleanup.deleted.departures.length
        state.productsRolledBack += cleanup.deleted.product.length
        state.pagesRolledBack += cleanup.deleted.page.length
        state.mediaRolledBack += cleanup.deleted.media.length
        state.cleanupFailures += cleanup.errors.length
        if (cleanup.status === 'partial-failure') state.partialFailures += 1
        report.push({
          ...predicted,
          sourceId: record.sourceId,
          status: 'error',
          reason: error instanceof Error ? error.message : String(error),
          journal,
          cleanup,
        })
      }
    }

    if (parentPageCreated && parentPage) {
      const children = await payload.find({
        collection: 'pages',
        depth: 0,
        limit: 1,
        pagination: false,
        overrideAccess: true,
        req,
        where: { parentPage: { equals: parentPage.id } },
      })
      if (!children.docs.length) {
        try {
          await payload.delete({
            collection: 'pages',
            id: parentPage.id,
            overrideAccess: true,
            req,
            context,
          })
          state.pagesRolledBack += 1
          state.parentPagesRolledBack += 1
          report.push({
            status: 'parent-rolled-back',
            parentPageId: parentPage.id,
            reason: 'created-by-run-and-unreferenced',
          })
        } catch (error) {
          state.cleanupFailures += 1
          state.partialFailures += 1
          report.push({
            status: 'parent-cleanup-error',
            parentPageId: parentPage.id,
            reason: error instanceof Error ? error.message : String(error),
          })
        }
      } else {
        report.push({
          status: 'parent-retained',
          parentPageId: parentPage.id,
          reason: 'referenced-by-child-page',
        })
      }
    }

    const outputPath = path.join(artifacts.runDir, 'import-result.json')
    const result = {
      version: 2,
      status: state.partialFailures ? 'partial-failure' : state.errors ? 'failed-records' : 'ok',
      runId,
      executionDate: new Date().toISOString(),
      referenceDate,
      dryRun,
      siteCode,
      siteId: site.id,
      locale: importLocale,
      batchId,
      adminUserId: adminUser.id,
      mode,
      sourceSnapshotHash: sourceSnapshotHash || null,
      normalizedDatasetHash: artifacts.normalizedDatasetHash,
      decisionFileHash: artifacts.decisionFileHash,
      state: { ...state, active: activeCounts(state) },
      report,
    }
    await writeExclusiveJSON(outputPath, result)
    await refreshRunChecksums(artifacts)
    console.log(JSON.stringify({ outputPath, ...result.state }, null, 2))
    if (state.errors > 0 || state.partialFailures > 0) process.exitCode = 1
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
