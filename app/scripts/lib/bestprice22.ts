import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

import { buildTourWrapperLayout, deterministicMediaFilename } from './doicanhviet'

export type BestPriceMarket =
  | 'vietnam'
  | 'indochina'
  | 'thailand'
  | 'cambodia'
  | 'laos'
  | 'myanmar'
  | 'other'

export type BestPriceManifestRow = {
  document: string
  sourceUrl: string
  title: string
}

export type BestPriceImage = {
  alt: string
  hash: string
  localPath: string
  sourceKey: string
  sourceUrl?: string
}

export type BestPriceItineraryDay = {
  dayNumber: number
  title: string
  route: string
  summary: string
  meals?: string
  accommodation?: string
}

export type BestPriceNormalizedTour = {
  sourceId: string
  sourceUrl: string
  sourceHash: string
  sourceFile: string
  matchedDocument: string
  title: string
  slug: string
  market: BestPriceMarket
  category: string
  durationDays: number
  durationNights: number
  summary: string
  priceFrom: number | null
  currency: 'USD'
  futureDepartures: []
  images: BestPriceImage[]
  itineraryDays: BestPriceItineraryDay[]
  includes: string[]
  excludes: string[]
  warnings: string[]
  blockingErrors: string[]
  publishEligible: boolean
  sectionVisibility: string[]
}

type RawBestPriceRecord = Record<string, any>

const acceptedSourceSystem = 'bestpricetravel'

const hashValue = (value: Uint8Array | string) =>
  crypto.createHash('sha256').update(value).digest('hex')

const addMissingSentenceSpacing = (value: string) => {
  const urlPattern = /https?:\/\/\S+/giu
  const sentenceBoundaryPattern = /([\p{Ll}\d][.!?])(?=\p{Lu})/gu
  let cursor = 0
  let result = ''

  for (const match of value.matchAll(urlPattern)) {
    const index = match.index ?? cursor
    result += value.slice(cursor, index).replace(sentenceBoundaryPattern, '$1 ')
    result += match[0]
    cursor = index + match[0].length
  }

  return result + value.slice(cursor).replace(sentenceBoundaryPattern, '$1 ')
}

export const cleanBestPriceText = (value: unknown) =>
  addMissingSentenceSpacing(
    String(value || '')
      .replace(/\u00a0/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;|&apos;/gi, "'")
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>'),
  )
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .trim()

/** Crawl often emits generic tokens like `img-video` (case/space/hyphen variants) or blank alt. */
const isGenericBestPriceMediaAlt = (alt: string) => {
  const compact = alt.toLowerCase().replace(/[\s_-]+/gu, '')
  return !compact || compact === 'imgvideo'
}

/** Prefer meaningful source alt; fall back to normalized tour title for generic/blank media alt. */
export const resolveBestPriceMediaAlt = (rawAlt: unknown, title: string) => {
  const alt = cleanBestPriceText(rawAlt)
  return isGenericBestPriceMediaAlt(alt) ? title : alt
}

const htmlToText = (html: string) =>
  cleanBestPriceText(
    html
      .replace(/<br\s*\/?>/giu, '\n')
      .replace(/<\/(?:p|div|li|h[1-6])\s*>/giu, '\n')
      .replace(/<[^>]+>/gu, ' '),
  )

export const bestPriceSlug = (value: string) =>
  cleanBestPriceText(value)
    .replace(/^(?:bpt|bestprice|bestpricetravel)[-_ ]+/iu, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/gu, '')
    .toLowerCase()
    .replace(/đ/gu, 'd')
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '')
    .slice(0, 90)
    .replace(/-+$/gu, '') || 'tour'

const parseCsvLine = (line: string) => {
  const cells: string[] = []
  let current = ''
  let quoted = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    const next = line[index + 1]

    if (char === '"' && quoted && next === '"') {
      current += '"'
      index += 1
      continue
    }
    if (char === '"') {
      quoted = !quoted
      continue
    }
    if (char === ',' && !quoted) {
      cells.push(current)
      current = ''
      continue
    }
    current += char
  }

  cells.push(current)
  return cells
}

export const readBestPriceManifest = async (manifestPath: string) => {
  const lines = (await fs.readFile(manifestPath, 'utf8'))
    .split(/\r?\n/u)
    .filter((line) => line.trim())
  const headers = parseCsvLine(lines[0]).map((header) => header.replace(/^\uFEFF/u, '').trim())

  return lines.slice(1).flatMap<BestPriceManifestRow>((line) => {
    const values = parseCsvLine(line)
    const row = Object.fromEntries(headers.map((header, index) => [header, values[index] || '']))
    if (row.status !== 'full' || row.candidate_source !== 'bestprice') return []
    return [
      {
        document: row.document,
        sourceUrl: row.candidate_url,
        title: row.tour_title,
      },
    ]
  })
}

export const mapBestPriceMarket = (category: string, title: string): BestPriceMarket => {
  const value = `${category} ${title}`.toLowerCase()
  if (/indochina|vietnam-and-cambodia|cambodia-and-vietnam/u.test(value)) return 'indochina'
  if (/thailand/u.test(value)) return 'thailand'
  if (/cambodia/u.test(value)) return 'cambodia'
  if (/laos/u.test(value)) return 'laos'
  if (/myanmar|bagan|yangon|mandalay/u.test(value)) return 'myanmar'
  if (/vietnam|halong|ninh-binh|mekong|sapa|hoi-an|da-nang|phu-quoc/u.test(value)) {
    return 'vietnam'
  }
  return 'other'
}

const parseDuration = (record: RawBestPriceRecord, title: string) => {
  const body = String(record.content?.body_text || '')
  const patterns = [
    /Duration\s*:\s*\n?\s*(\d+)\s*days?/iu,
    /(\d+)\s*days?/iu,
    /Full\s*Day/iu,
    /Half\s*day/iu,
  ]
  for (const pattern of patterns) {
    const match = pattern.exec(`${title}\n${body}`)
    if (!match) continue
    if (/full\s*day/iu.test(match[0])) return { days: 1, nights: 0 }
    if (/half\s*day/iu.test(match[0])) return { days: 1, nights: 0 }
    const days = Number(match[1])
    if (Number.isFinite(days) && days > 0) return { days, nights: Math.max(days - 1, 0) }
  }

  return { days: null, nights: null }
}

const parsePrice = (value: unknown) => {
  const cleaned = cleanBestPriceText(value)
  const match = cleaned.match(/(\d[\d,.]*)\s*(?:USD|US\$|\$)?/iu)
  if (!match) return null
  const parsed = Number(match[1].replace(/[^\d.]/gu, ''))
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

const editorialSummaryBySourceId: Readonly<Record<string, string>> = {
  'vietnam-tours--best-of-northern-vietnam-6-days':
    'Explore Hanoi, Ninh Binh, Sapa, Fansipan and Ha Long on a private six-day Northern Vietnam journey with local planning and flexible pacing.',
}

const extractSummary = (record: RawBestPriceRecord, title: string, sourceId: string) => {
  const editorialSummary = editorialSummaryBySourceId[sourceId]
  if (editorialSummary) return editorialSummary
  const description = cleanBestPriceText(record.meta?.description)
  if (description) return description.slice(0, 1200)

  const body = String(record.content?.body_text || '')
  const lines = body
    .split(/\n+/u)
    .map(cleanBestPriceText)
    .filter((line) => line && line.toLowerCase() !== title.toLowerCase())
    .filter(
      (line) => !/^(from|us|\/pax|book now|overview|itinerary|inclusion|price|q&as)$/iu.test(line),
    )
  return lines.slice(0, 4).join(' ').slice(0, 1200) || title
}

const extractBetween = (value: string, startPattern: RegExp, endPattern: RegExp) => {
  const start = startPattern.exec(value)
  if (!start || start.index < 0) return ''
  const slice = value.slice(start.index + start[0].length)
  const end = endPattern.exec(slice)
  return end && end.index >= 0 ? slice.slice(0, end.index) : slice
}

const parseListSection = (html: string, heading: string) => {
  const inclusionSection = extractBetween(
    html,
    /<h2[^>]*>\s*Inclusions\s*<\/h2>/iu,
    /<h2|<div class="margin-bottom-60 tailor_make|<div class="tour_detail__header/iu,
  )
  const excludedMarker = /<label[^>]*>\s*Excluded\s*<\/label>/iu
  const includedMarker = /<label[^>]*>\s*Included activities\s*<\/label>/iu
  const section = /^Exclusions$/iu.test(heading)
    ? extractBetween(inclusionSection, excludedMarker, /$^/u)
    : extractBetween(inclusionSection, includedMarker, excludedMarker)

  return Array.from(section.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/giu), (match) =>
    htmlToText(match[1]),
  ).filter(Boolean)
}

const normalizeDayTitle = (title: string, fallbackDay: number) =>
  cleanBestPriceText(title).replace(/^Day\s*\d+\s*[:.-]?\s*/iu, '') || `Day ${fallbackDay}`

const parseItineraryFromHtml = (html: string) => {
  const days: BestPriceItineraryDay[] = []
  const boxes = Array.from(
    html.matchAll(
      /<div[^>]+class=["'][^"']*itinerary-box[^"']*["'][^>]*>([\s\S]*?)(?=<div[^>]+class=["'][^"']*itinerary-box|<label[^>]+class=["'][^"']*lbl_note|<div[^>]+class=["'][^"']*itinerary-button|<div[^>]+class=["'][^"']*tailor_make|$)/giu,
    ),
  )

  for (const [index, match] of boxes.entries()) {
    const chunk = match[1]
    const titleMatch = chunk.match(
      /<span[^>]+class=["'][^"']*iti-day-title[^"']*["'][^>]*>([\s\S]*?)<\/span>/iu,
    )
    const rawTitle = htmlToText(titleMatch?.[1] || '')
    const dayMatch = rawTitle.match(/\bday\s*(\d+)/iu)
    const dayNumber = dayMatch ? Number(dayMatch[1]) : index + 1
    const contentMatch = chunk.match(
      /<div[^>]+class=["'][^"']*itinerary-content[^"']*["'][^>]*>([\s\S]*?)<\/div>/iu,
    )
    const content = htmlToText(contentMatch?.[1] || chunk)
    const meals = content.match(/Meals:\s*([^\n]+)/iu)?.[1]
    const accommodation = content.match(/Accommodation:\s*([^\n]+)/iu)?.[1]

    days.push({
      dayNumber,
      title: normalizeDayTitle(rawTitle, dayNumber),
      route: normalizeDayTitle(rawTitle, dayNumber),
      summary: cleanBestPriceText(
        content.replace(/Meals:\s*[^\n]+/iu, '').replace(/Accommodation:\s*[^\n]+/iu, ''),
      ).slice(0, 8000),
      meals: meals ? cleanBestPriceText(meals) : undefined,
      accommodation: accommodation ? cleanBestPriceText(accommodation) : undefined,
    })
  }

  return days
}

const validateItinerary = (days: BestPriceItineraryDay[], durationDays: number | null) => {
  const errors: string[] = []
  if (!days.length) errors.push('NO_ITINERARY')
  const seen = new Set<number>()

  for (const [index, day] of days.entries()) {
    if (seen.has(day.dayNumber)) errors.push(`DUPLICATE_ITINERARY_DAY:${day.dayNumber}`)
    seen.add(day.dayNumber)
    if (day.dayNumber < 1) errors.push(`INVALID_ITINERARY_DAY:${day.dayNumber}`)
    if (!day.title) errors.push(`MISSING_ITINERARY_TITLE:${index + 1}`)
    if (!day.summary) errors.push(`MISSING_ITINERARY_SUMMARY:${index + 1}`)
  }

  if (durationDays && days.length > durationDays) {
    errors.push(`ITINERARY_DURATION_OVERFLOW:${days.length}/${durationDays}`)
  }

  return [...new Set(errors)]
}

const resolveBestPriceImagePath = (crawlerRoot: string, sourceId: string, localPath: string) => {
  const normalized = localPath.replace(/\\/gu, '/')
  const candidate = path.resolve(crawlerRoot, 'storage', normalized)
  const expectedRoot = path.resolve(crawlerRoot, 'storage', 'images', 'bestprice', sourceId)
  return candidate.startsWith(`${expectedRoot}${path.sep}`) ? candidate : null
}

const loadImages = async ({
  crawlerRoot,
  record,
  sourceId,
  title,
  warnings,
}: {
  crawlerRoot: string
  record: RawBestPriceRecord
  sourceId: string
  title: string
  warnings: string[]
}) => {
  const images: BestPriceImage[] = []
  const rawImages = Array.isArray(record.images) ? record.images : []

  for (const [index, image] of rawImages.entries()) {
    const localPath = resolveBestPriceImagePath(
      crawlerRoot,
      sourceId,
      String(image.local_path || ''),
    )
    if (!localPath) {
      warnings.push(`INVALID_IMAGE_PATH:${String(image.local_path || '')}`)
      continue
    }
    const bytes = await fs.readFile(localPath)
    const hash = hashValue(bytes)
    images.push({
      alt: resolveBestPriceMediaAlt(image.alt, title),
      hash,
      localPath,
      sourceKey: `${acceptedSourceSystem}:${sourceId}:media:${index + 1}-${hash.slice(0, 8)}`,
      sourceUrl: image.src_url,
    })
  }

  return images
}

const sectionVisibilityFor = (
  tour: Pick<BestPriceNormalizedTour, 'images' | 'itineraryDays' | 'priceFrom'>,
) => {
  const sections = ['facts', 'itinerary', 'services', 'related', 'sticky-cta']
  if (tour.images.length) sections.unshift('hero')
  if (tour.itineraryDays.length > 1) sections.push('route')
  if (tour.priceFrom) sections.push('departures')
  return [...new Set(sections)]
}

export const normalizeBestPriceRecord = async ({
  crawlerRoot,
  manifestRow,
  record,
  sourceFile,
}: {
  crawlerRoot: string
  manifestRow: BestPriceManifestRow
  record: RawBestPriceRecord
  sourceFile: string
}): Promise<BestPriceNormalizedTour> => {
  const sourceId = cleanBestPriceText(record.tour_id)
  const title = cleanBestPriceText(
    record.content?.heading || manifestRow.title || record.meta?.title,
  )
  const sourceUrl = cleanBestPriceText(record.url || manifestRow.sourceUrl)
  const category = cleanBestPriceText(record.category)
  const warnings: string[] = []
  const blockingErrors: string[] = []

  if (!sourceId) blockingErrors.push('MISSING_SOURCE_ID')
  if (!title) blockingErrors.push('MISSING_TITLE')
  if (!/^https:\/\/www\.bestpricetravel\.com\//iu.test(sourceUrl))
    blockingErrors.push('INVALID_SOURCE_HOST')
  if (sourceUrl !== manifestRow.sourceUrl) blockingErrors.push('MANIFEST_URL_MISMATCH')

  const market = mapBestPriceMarket(category, title)
  if (market === 'other') warnings.push('UNMAPPED_MARKET')
  const duration = parseDuration(record, title)
  if (!duration.days || duration.nights === null) blockingErrors.push('MISSING_DURATION')
  const html = String(record.content?.body_html || '')
  const itineraryDays = parseItineraryFromHtml(html)
  const itineraryErrors = validateItinerary(itineraryDays, duration.days)
  blockingErrors.push(...itineraryErrors)

  const priceFrom = parsePrice(record.content?.price)
  if (!priceFrom) warnings.push('NO_PRICE_FROM')
  warnings.push('NO_FUTURE_DEPARTURES')

  const images = await loadImages({ crawlerRoot, record, sourceId, title, warnings })
  if (!images.length) blockingErrors.push('NO_MEDIA')

  const normalized: BestPriceNormalizedTour = {
    sourceId,
    sourceUrl,
    sourceHash: hashValue(JSON.stringify(record)),
    sourceFile,
    matchedDocument: manifestRow.document,
    title,
    slug: bestPriceSlug(manifestRow.title || title),
    market,
    category,
    durationDays: duration.days || 1,
    durationNights: duration.nights ?? 0,
    summary: extractSummary(record, title, sourceId),
    priceFrom,
    currency: 'USD',
    futureDepartures: [],
    images,
    itineraryDays,
    includes: parseListSection(html, 'Inclusions'),
    excludes: parseListSection(html, 'Exclusions'),
    warnings,
    blockingErrors,
    publishEligible: false,
    sectionVisibility: [],
  }

  normalized.sectionVisibility = sectionVisibilityFor(normalized)
  normalized.publishEligible = Boolean(
    !normalized.blockingErrors.length &&
    normalized.market !== 'other' &&
    normalized.summary &&
    normalized.itineraryDays.length &&
    normalized.images.length,
  )
  if (!normalized.publishEligible) warnings.push('DRAFT_ONLY')

  return normalized
}

export const readBestPriceRawRecords = async (rawPath: string) => {
  const raw = JSON.parse(await fs.readFile(rawPath, 'utf8')) as RawBestPriceRecord[]
  return raw
}

export const buildBestPriceNormalizedTours = async ({
  crawlerRoot,
  manifestPath,
  rawPath,
}: {
  crawlerRoot: string
  manifestPath: string
  rawPath: string
}) => {
  const manifest = await readBestPriceManifest(manifestPath)
  const rawRecords = await readBestPriceRawRecords(rawPath)
  const rawByUrl = new Map(rawRecords.map((record) => [String(record.url), record]))
  const normalized: BestPriceNormalizedTour[] = []
  const missing: BestPriceManifestRow[] = []

  for (const row of manifest) {
    const record = rawByUrl.get(row.sourceUrl)
    if (!record) {
      missing.push(row)
      continue
    }
    normalized.push(
      await normalizeBestPriceRecord({
        crawlerRoot,
        manifestRow: row,
        record,
        sourceFile: rawPath,
      }),
    )
  }

  return { manifest, missing, tours: normalized }
}

export const bestPriceTourCode = (sourceId: string) => `BPT-${sourceId}`

export const bestPriceMediaFilename = (
  sourceId: string,
  imageIndex: number,
  image: Pick<BestPriceImage, 'hash' | 'localPath'>,
) => deterministicMediaFilename(sourceId, imageIndex, image, acceptedSourceSystem)

export const buildBestPriceWrapperLayout = buildTourWrapperLayout

export const bestPriceSourceSystem = acceptedSourceSystem
