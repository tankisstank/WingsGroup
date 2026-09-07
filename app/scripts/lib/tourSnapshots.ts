import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

import {
  sourceTourCode,
  type NormalizedTour,
  type NormalizedItineraryDay,
  type SourceDeparture,
  type SourceImage,
  type TourMarket,
  type TourSourceSystem,
} from './doicanhviet'

type RawRecord = Record<string, any>

const hash = (value: string | Uint8Array) => crypto.createHash('sha256').update(value).digest('hex')
const clean = (value: unknown) =>
  String(value || '')
    .replace(/\u00a0/gu, ' ')
    .replace(/[ \t]+/gu, ' ')
    .replace(/\n[ \t]+|[ \t]+\n/gu, '\n')
    .replace(/\n{3,}/gu, '\n\n')
    .trim()

export const snapshotSourceFromURL = (value: string): TourSourceSystem | null => {
  try {
    const host = new URL(value).hostname.replace(/^www\./u, '').toLowerCase()
    if (host === 'bestpricetravel.com') return 'bestpricetravel'
    if (host === 'thesinhtour.com') return 'thesinhtour'
  } catch {}
  return null
}

const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/gu, '')
    .toLowerCase()
    .replace(/đ/gu, 'd')
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '')

export const snapshotPublicSlug = (title: string, source: TourSourceSystem, sourceId: string) =>
  `${slugify(title).slice(0, 76).replace(/-+$/u, '')}-${source === 'bestpricetravel' ? 'bpt' : 'tst'}-${hash(sourceId).slice(0, 8)}`

export const snapshotMarket = (record: RawRecord): TourMarket => {
  const value =
    `${record.category || ''} ${record.url || ''} ${record.content?.heading || ''}`.toLowerCase()
  if (
    /vietnam|viet-nam|hanoi|ha-noi|halong|ha-long|ninh-binh|sapa|sa-pa|hoi-an|nha-trang|mekong-delta|ho-chi-minh|phu-quoc|pu-luong|cat-ba/u.test(
      value,
    )
  )
    return 'vietnam'
  if (/thailand|bangkok|phuket|chiang-mai|koh-samui|krabi/u.test(value)) return 'thailand'
  if (/cambodia|siem-reap|angkor|phnom-penh/u.test(value)) return 'cambodia'
  if (/laos|luang-prabang|vientiane/u.test(value)) return 'laos'
  if (/myanmar|bagan|yangon|mandalay|burma/u.test(value)) return 'myanmar'
  if (/indochina|multi-country/u.test(value)) return 'indochina'
  if (/korea|seoul/u.test(value)) return 'korea'
  if (/japan|tokyo|osaka|kyoto/u.test(value)) return 'japan'
  if (/china|beijing|shanghai/u.test(value)) return 'china'
  return 'other'
}

export const snapshotDuration = (value: string) => {
  const days = Number(value.match(/\b(\d{1,2})\s*days?\b/iu)?.[1] || 0) || null
  const nights = Number(value.match(/\b(\d{1,2})\s*nights?\b/iu)?.[1] || 0)
  return {
    days,
    nights: nights || (days === null ? null : Math.max(0, days - 1)),
    inferredNights: Boolean(days && !nights),
  }
}

export const snapshotPrice = (record: RawRecord) => {
  const candidates: number[] = []
  const scan = (value: unknown) => {
    const text = String(value || '')
    for (const match of text.matchAll(/(?:US\s*\$|US\$|USD\s*|\$)\s*([\d,.]+)/giu)) {
      const parsed = Number(match[1].replace(/,/gu, ''))
      if (parsed > 0 && parsed < 1_000_000) candidates.push(parsed)
    }
    for (const match of text.matchAll(/\b([\d,.]+)\s*USD\b/giu)) {
      const parsed = Number(match[1].replace(/,/gu, ''))
      if (parsed > 0 && parsed < 1_000_000) candidates.push(parsed)
    }
  }
  scan(record.content?.price)
  scan(JSON.stringify(record.content?.tables || []))
  return candidates.length ? Math.min(...candidates) : null
}

const month: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
}

export const snapshotDepartures = (
  record: RawRecord,
  priceFrom: number | null,
): SourceDeparture[] => {
  if (!priceFrom) return []
  const departures: SourceDeparture[] = []
  for (const table of record.content?.tables || []) {
    const text = JSON.stringify(table)
    const match = text.match(
      /\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(20\d{2})\b/iu,
    )
    if (!match) continue
    const date = new Date(
      Date.UTC(Number(match[3]), month[match[2].slice(0, 3).toLowerCase()], Number(match[1])),
    )
    if (date.getTime() <= Date.now()) continue
    departures.push({
      departureDate: date.toISOString(),
      returnDate: date.toISOString(),
      priceFrom,
      currency: 'USD',
      rawDate: match[0],
      rawRow: [text],
      availabilityStatus: 'open',
      isFeatured: false,
      sourceRowIndex: departures.length,
    })
  }
  return Array.from(new Map(departures.map((item) => [item.departureDate, item])).values())
}

export const snapshotItinerary = (
  body: string,
  durationDays: number | null,
): NormalizedItineraryDay[] => {
  const normalized = clean(body)
  const marker = /(?:^|\n)Day\s+(\d{1,2})\s*[:.\-–]?\s*([^\n]*)/giu
  const matches = Array.from(normalized.matchAll(marker))
  const byDay = new Map<number, NormalizedItineraryDay>()
  for (const [index, match] of matches.entries()) {
    const dayNumber = Number(match[1])
    if (byDay.has(dayNumber) || dayNumber < 1 || dayNumber > 60) continue
    const start = (match.index || 0) + match[0].length
    const end = matches[index + 1]?.index || normalized.length
    const summary = clean(normalized.slice(start, end)).slice(0, 8000)
    if (summary.length < 40) continue
    const title = clean(match[2]) || `Day ${dayNumber}`
    byDay.set(dayNumber, { dayNumber, title, route: title, summary })
  }
  const days = Array.from(byDay.values()).sort((a, b) => a.dayNumber - b.dayNumber)
  if (!days.length && durationDays === 1 && normalized.length >= 160) {
    return [
      { dayNumber: 1, title: 'Tour itinerary', route: '', summary: normalized.slice(0, 8000) },
    ]
  }
  return days
}

const sourceImages = async (
  root: string,
  source: TourSourceSystem,
  sourceId: string,
  images: any[],
) => {
  const result: SourceImage[] = []
  const sourceDir = source === 'bestpricetravel' ? 'bestprice' : 'thesinh'
  const expectedRoot = path.resolve(root, 'storage', 'images', sourceDir, sourceId)
  for (const [index, image] of images.entries()) {
    if (result.length >= 12) break
    if (!image.local_path) continue
    const localPath = path.resolve(root, 'storage', String(image.local_path).replace(/\\/gu, '/'))
    if (!localPath.startsWith(`${expectedRoot}${path.sep}`)) continue
    try {
      const bytes = await fs.readFile(localPath)
      const imageHash = hash(bytes)
      result.push({
        alt: clean(image.alt),
        hash: imageHash,
        localPath,
        sourceKey: `${source}:${sourceId}:media:${index + 1}-${imageHash.slice(0, 8)}`,
        sourceUrl: image.src_url,
      })
    } catch {}
  }
  return result
}

export const parseTourSnapshotRecord = async (
  root: string,
  sourceFile: string,
  record: RawRecord,
): Promise<NormalizedTour> => {
  const source = snapshotSourceFromURL(String(record.url || ''))
  const sourceId = clean(record.tour_id)
  const title = clean(
    record.content?.heading || record.meta?.og_title || record.meta?.title,
  ).replace(/\s*\|\s*(?:BestPrice Travel|The Sinh Tour).*$/iu, '')
  const body = clean(record.content?.body_text)
  const duration = snapshotDuration(`${title}\n${body.slice(0, 2500)}`)
  const market = snapshotMarket(record)
  const summary = clean(record.meta?.description || record.meta?.og_description || body).slice(
    0,
    1600,
  )
  const itineraryDays = snapshotItinerary(body, duration.days)
  const priceFrom = snapshotPrice(record)
  const departures = snapshotDepartures(record, priceFrom)
  const allImages =
    source && sourceId ? await sourceImages(root, source, sourceId, record.images || []) : []
  const images = allImages.slice(0, 12)
  const warnings: string[] = []
  const blockingErrors: string[] = []
  if (!source) blockingErrors.push('UNSUPPORTED_SOURCE_HOST')
  if (!sourceId) blockingErrors.push('MISSING_SOURCE_ID')
  if (!title) blockingErrors.push('MISSING_TITLE')
  if (!duration.days) blockingErrors.push('MISSING_DURATION')
  if (duration.inferredNights) warnings.push('INFERRED_NIGHTS')
  if (market === 'other') warnings.push('UNMAPPED_DESTINATION')
  if (!summary || summary.length < 80) blockingErrors.push('MISSING_SUMMARY')
  if (!itineraryDays.length) blockingErrors.push('MISSING_ITINERARY')
  if (duration.days && itineraryDays.length !== duration.days)
    warnings.push(`ITINERARY_DURATION_MISMATCH:${itineraryDays.length}/${duration.days}`)
  if (!priceFrom) warnings.push('MISSING_PRICE')
  if (!images.length) warnings.push('MISSING_MEDIA')
  if ((record.images || []).length > images.length)
    warnings.push(`MEDIA_TRUNCATED:${(record.images || []).length}/12`)
  if (!departures.length) warnings.push('NO_EXPLICIT_FUTURE_DEPARTURE')
  const sourceHash = hash(JSON.stringify(record))
  const slug = snapshotPublicSlug(
    title || sourceId || 'tour',
    source || 'bestpricetravel',
    sourceId || sourceHash,
  )
  const publishEligible =
    blockingErrors.length === 0 &&
    market !== 'other' &&
    Boolean(priceFrom) &&
    images.length > 0 &&
    departures.length > 0 &&
    itineraryDays.length === duration.days
  const sectionVisibility = ['hero', 'facts', 'itinerary', 'services', 'related']
  if (departures.length) sectionVisibility.push('departures', 'sticky-cta')
  return {
    sourceId,
    sourceUrl: record.url,
    sourceFile,
    sourceHash,
    crawledAt: record.crawled_at,
    category: record.category,
    kind: source ? 'tour' : 'invalid',
    title,
    slug,
    pathname: `/tour/${slug}`,
    market,
    durationDays: duration.days,
    durationNights: duration.nights,
    summary,
    priceFrom,
    currency: 'USD',
    itineraryDays,
    departures,
    sourcePricing: { tables: record.content?.tables || [] },
    airline: undefined,
    images,
    warnings,
    blockingErrors,
    sectionVisibility,
    publishEligible,
    duplicateCandidates: [],
    source: {
      sourceSystem: source || 'bestpricetravel',
      sourceId,
      sourceKey: `${source || 'invalid'}:${sourceId}`,
      sourceUrl: record.url,
      crawledAt: record.crawled_at,
      sourceHash,
    },
    classification: {
      kind: source ? 'tour' : 'invalid',
      market,
      originalCategory: record.category || null,
    },
    wrapperPage: {
      title,
      slug,
      pathname: `/tour/${slug}`,
      meta: { title, description: summary, imageSourceKey: images[0]?.sourceKey || null },
    },
    product: {
      tourCode: sourceTourCode(sourceId, source || 'bestpricetravel'),
      title,
      slug,
      market,
      durationDays: duration.days,
      durationNights: duration.nights,
      summary,
      highlights: [],
      routeStops: [],
      itineraryDays,
      includes: [],
      excludes: [],
      servicesSummary: { hotelSummary: '', mealsSummary: '', transportSummary: '', notes: [] },
      sectionVisibility,
      meta: { title, description: summary, breadcrumbLabel: title },
    },
    rawPricing: (record.content?.tables || []).filter(Array.isArray).map((table: any[]) => ({
      headers: (table[0] || []).map(String),
      rows: table
        .slice(1)
        .filter(Array.isArray)
        .map((row: any[]) => row.map(String)),
    })),
    quality: { warnings, blockingErrors, duplicateCandidates: [], publishEligible },
    parsedValues: {
      title: {
        value: title,
        sourceFragment: clean(record.content?.heading),
        confidence: title ? 1 : 0,
        parserRule: 'content.heading',
        requiresReview: !title,
      },
      market: {
        value: market,
        sourceFragment: clean(record.category),
        confidence: market === 'other' ? 0.3 : 0.9,
        parserRule: 'destination-map',
        requiresReview: market === 'other',
      },
      durationDays: {
        value: duration.days,
        sourceFragment: `${duration.days || ''}`,
        confidence: duration.days ? 0.9 : 0,
        parserRule: 'english-duration',
        requiresReview: !duration.days,
      },
      durationNights: {
        value: duration.nights,
        sourceFragment: `${duration.nights ?? ''}`,
        confidence: duration.inferredNights ? 0.5 : 0.9,
        parserRule: duration.inferredNights ? 'days-minus-one' : 'english-duration',
        requiresReview: duration.inferredNights,
      },
    },
  }
}

export const readTourSnapshotRecords = async (root: string) => {
  const records: Array<{ file: string; record: RawRecord }> = []
  for (const dataset of ['bestprice', 'thesinh']) {
    const dir = path.join(root, 'storage', 'datasets', dataset)
    for (const file of (await fs.readdir(dir)).filter((name) => /^\d+\.json$/u.test(name)).sort()) {
      const fullPath = path.join(dir, file)
      records.push({ file: fullPath, record: JSON.parse(await fs.readFile(fullPath, 'utf8')) })
    }
  }
  return records
}
