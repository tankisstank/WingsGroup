import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

export type SourceImage = {
  alt?: string
  hash: string
  localPath: string
  sourceKey: string
  sourceUrl?: string
}

export type TourSourceSystem = 'doicanhviet' | 'bestpricetravel' | 'thesinhtour'
export const DEFAULT_PARSER_REFERENCE_DATE = '1970-01-01T00:00:00.000Z'

export type TourMarket =
  | 'china'
  | 'japan'
  | 'korea'
  | 'vietnam'
  | 'thailand'
  | 'cambodia'
  | 'laos'
  | 'myanmar'
  | 'indochina'
  | 'other'

export type NormalizedDeparture = {
  departureDate: string
  returnDate: string
  departureCity?: string
  priceFrom: number
  rawDate: string
  rawRow: string[]
  airline?: string
  currency?: 'VND'
  availabilityStatus: 'open'
  isFeatured: boolean
  sourceRowIndex: number
}

export type SourceDeparture = NormalizedDeparture

export type SourceInventoryFile = {
  path: string
  bytes: number
  sha256: string
}

export type SourceInventory = {
  files: SourceInventoryFile[]
  fileCount: number
  totalBytes: number
  sourceSnapshotHash: string
}

export type ParsedValue<T> = {
  value: T
  sourceFragment: string
  confidence: number
  parserRule: string
  requiresReview: boolean
}

export type NormalizedItineraryDay = {
  dayNumber: number
  title: string
  route: string
  summary: string
  meals?: string
  transport?: string
  accommodation?: string
  notes?: string
}

type RichNormalizedContract = {
  source: {
    sourceSystem: TourSourceSystem
    sourceId: string
    sourceKey: string
    sourceUrl: string
    crawledAt?: string
    sourceHash: string
  }
  classification: {
    kind: 'tour' | 'news' | 'pagination' | 'invalid'
    market: TourMarket | null
    originalCategory: string | null
  }
  wrapperPage: {
    title: string
    slug: string
    pathname: string
    meta: {
      title: string | null
      description: string | null
      imageSourceKey: string | null
    }
  }
  product: {
    tourCode: string
    title: string
    slug: string
    market: TourMarket | null
    durationDays: number | null
    durationNights: number | null
    summary: string | null
    highlights: Array<{ title: string; description: string }>
    routeStops: Array<{
      order: number
      label: string
      type: 'origin' | 'arrival' | 'sightseeing' | 'overnight' | 'return'
    }>
    itineraryDays: NormalizedItineraryDay[]
    includes: string[]
    excludes: string[]
    servicesSummary: {
      hotelSummary: string
      mealsSummary: string
      transportSummary: string
      notes: string[]
    }
    sectionVisibility: string[]
    meta: {
      title: string | null
      description: string | null
      breadcrumbLabel: string | null
    }
  }
  rawPricing: Array<{ headers: string[]; rows: string[][] }>
  quality: {
    warnings: string[]
    blockingErrors: string[]
    duplicateCandidates: string[]
    publishEligible: boolean
  }
  parsedValues: {
    title: ParsedValue<string>
    market: ParsedValue<TourMarket | null>
    durationDays: ParsedValue<number | null>
    durationNights: ParsedValue<number | null>
  }
}

export type NormalizedTour = RichNormalizedContract & {
  sourceId: string
  sourceUrl: string
  sourceFile: string
  sourceHash: string
  crawledAt?: string
  category?: string
  kind: 'tour' | 'news' | 'pagination' | 'invalid'
  title: string
  slug: string
  pathname: string
  market: TourMarket | null
  durationDays: number | null
  durationNights: number | null
  summary: string
  priceFrom: number | null
  currency?: 'VND'
  itineraryDays: NormalizedItineraryDay[]
  departures: SourceDeparture[]
  sourcePricing: { tables: unknown[] }
  airline?: string
  images: SourceImage[]
  warnings: string[]
  blockingErrors: string[]
  sectionVisibility: string[]
  publishEligible: boolean
  duplicateCandidates: string[]
}

type RawRecord = Record<string, any>

const hashBytes = (value: Uint8Array | string) =>
  crypto.createHash('sha256').update(value).digest('hex')

const stableStringify = (value: unknown): string =>
  JSON.stringify(value, (_key, nestedValue: unknown) => {
    if (!nestedValue || typeof nestedValue !== 'object' || Array.isArray(nestedValue)) {
      return nestedValue
    }

    return Object.fromEntries(
      Object.entries(nestedValue as Record<string, unknown>).sort(([left], [right]) =>
        left.localeCompare(right),
      ),
    )
  })

const normalizedComparableText = (value: unknown) =>
  cleanText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/giu, 'd')
    .toLowerCase()

const isWithinPath = (candidate: string, parent: string) => {
  const relative = path.relative(parent, candidate)
  return (
    relative !== '' &&
    relative !== '..' &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative)
  )
}

export const isValidDoicanhvietSourceUrl = (value: unknown) => {
  if (typeof value !== 'string' || !value.trim()) return false

  try {
    const url = new URL(value.trim())
    return (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      (url.hostname === 'doicanhviet.com' || url.hostname === 'www.doicanhviet.com') &&
      !url.username &&
      !url.password &&
      !url.port
    )
  } catch {
    return false
  }
}

const cleanText = (value: unknown) =>
  String(value || '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .trim()

const decodeEntities = (value: string) =>
  value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')

const htmlToText = (html: string) =>
  decodeEntities(
    html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p\s*>/gi, '\n')
      .replace(/<[^>]+>/g, ' '),
  )
    .split(/\n+/)
    .map(cleanText)
    .filter(Boolean)
    .join('\n')

export const removeAirlineMarkers = (value: string) =>
  value
    .replace(/\b(?:bay\s+)?(?:vna|vj|vn)\b/giu, ' ')
    .replace(/\s{2,}/gu, ' ')
    .replace(/\s+([,:;])/gu, '$1')
    .trim()

const sourceUiBoundaryPatterns = [
  /\bGIÁ\s+TOUR\s+TRỌN\s+GÓI\b/iu,
  /\bChính\s+sách\b/iu,
  /\bHoàn\s+thành\b/iu,
  /\bĐăng\s+ký\s+tour\b/iu,
  /\bChia\s+sẻ\b/iu,
  /\bTweet\b/iu,
  /\bBình\s+luận\b/iu,
]

export const trimSourceUiTail = (value: string) => {
  const text = cleanText(value)
  const firstBoundary = sourceUiBoundaryPatterns.reduce<number | null>((earliest, pattern) => {
    const match = pattern.exec(text)
    if (!match || match.index < 0) return earliest
    return earliest === null ? match.index : Math.min(earliest, match.index)
  }, null)

  return firstBoundary === null ? text : cleanText(text.slice(0, firstBoundary))
}

const splitSentences = (value: string) =>
  cleanText(value)
    .split(/(?<=[.!?。])\s+|\n+/u)
    .map(cleanText)
    .filter(Boolean)

const extractItinerarySentence = (content: string, pattern: RegExp, reject?: RegExp) => {
  const sentence = splitSentences(content).find(
    (item) => pattern.test(item) && (!reject || !reject.test(item)),
  )

  return cleanText(sentence)
}

const slugify = (value: string) => {
  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return normalized || 'tour'
}

export const sourceTourCode = (sourceId: string, sourceSystem: TourSourceSystem = 'doicanhviet') =>
  `${sourceSystem === 'bestpricetravel' ? 'BPT' : sourceSystem === 'thesinhtour' ? 'TST' : 'DCV'}-${sourceId}`

export const sourceSlug = (sourceId: string, title: string) =>
  `${slugify(removeAirlineMarkers(title)).slice(0, 72).replace(/-+$/g, '')}-dcv-${sourceId}`

export const isDescriptivePublicSlug = (slug: string) =>
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(slug) && !/^dcv-[a-z0-9]+$/iu.test(slug)

export const buildTourWrapperLayout = (summary: string) => [
  {
    blockType: 'content' as const,
    presentation: 'columns',
    columns: [
      {
        size: 'full',
        richText: {
          root: {
            type: 'root',
            children: [
              {
                type: 'paragraph',
                children: [
                  {
                    type: 'text',
                    detail: 0,
                    format: 0,
                    mode: 'normal',
                    style: '',
                    text: summary,
                    version: 1,
                  },
                ],
                direction: 'ltr',
                format: '',
                indent: 0,
                textFormat: 0,
                version: 1,
              },
            ],
            direction: 'ltr',
            format: '',
            indent: 0,
            version: 1,
          },
        },
      },
    ],
  },
]

export const deterministicMediaFilename = (
  sourceId: string,
  imageIndex: number,
  image: Pick<SourceImage, 'hash' | 'localPath'>,
  sourceSystem: TourSourceSystem = 'doicanhviet',
) => {
  const extension = path.extname(image.localPath).slice(1).toLowerCase() || 'jpg'
  const index = String(imageIndex + 1).padStart(2, '0')
  const prefix =
    sourceSystem === 'bestpricetravel' ? 'bpt' : sourceSystem === 'thesinhtour' ? 'tst' : 'dcv'
  return `${prefix}-${slugify(sourceId).slice(0, 80)}-${index}-${image.hash.slice(0, 8)}.${extension}`
}

const parseMarket = (category: string) => {
  const normalized = normalizedComparableText(category)
  if (/han[-_ ]quoc|korea/.test(normalized)) return 'korea' as const
  if (/nhat[-_ ]ban|japan/.test(normalized)) return 'japan' as const
  if (/trung[-_ ]quoc|china/.test(normalized)) return 'china' as const
  if (
    /noi[-_ ]dia|viet[-_ ]nam|mien[-_ ]trung|dien[-_ ]bien|da[-_ ]lat|nha[-_ ]trang|da[-_ ]nang|hoi[-_ ]an|hue/iu.test(
      normalized,
    )
  )
    return 'vietnam' as const
  return null
}

const classify = (record: RawRecord): NormalizedTour['kind'] => {
  const category = String(record.category || '').toLowerCase()
  const sourceId = String(record.tour_id || '').trim()
  if (!sourceId) return 'invalid'
  if (!isValidDoicanhvietSourceUrl(record.url)) return 'invalid'
  const url = String(record.url).trim().toLowerCase()
  if (/tin[-_]?tuc|tin[-_]?nuoc[-_]?ngoai|news/.test(category)) return 'news'
  if (/\/pages\/p-\d+\.html(?:[?#].*)?$/iu.test(url)) return 'pagination'
  return 'tour'
}

const parseDuration = (value: string) => {
  const match = value.match(/(\d+)\s*(?:ngày|ngay|n)\s*[-–]?\s*(\d+)\s*(?:đêm|dem|d)/iu)
  if (match) return { days: Number(match[1]), nights: Number(match[2]) }
  const compact = value.match(/(\d+)\s*N\s*(\d+)\s*Đ/iu)
  if (compact) return { days: Number(compact[1]), nights: Number(compact[2]) }
  return { days: null, nights: null }
}

const parseAirline = (value: string) => {
  const match = value.match(/(?:hàng không(?: quốc gia)?|airline)\s*:\s*([^\n]+)/iu)
  if (!match) return undefined
  return cleanText(match[1]).replace(/\s+\([^)]*\)$/, '')
}

const parseSummary = (record: RawRecord, title: string) => {
  const html = String(record.content?.body_html || '')
  const summaryMatch = html.match(
    /class=["'][^"']*tomtat_tour[^"']*["'][^>]*>([\s\S]*?)(?:<\/div>\s*<div[^>]*class=["']clear|<\/div>\s*<\/div>)/iu,
  )
  const fromHtml = summaryMatch ? htmlToText(summaryMatch[1]) : ''
  if (fromHtml) return fromHtml.slice(0, 2000)

  const body = cleanText(record.content?.body_text)
  const beforeItinerary = body.split(/lịch trình tour/iu)[0] || body
  const lines = beforeItinerary
    .split(/\n+/)
    .map(cleanText)
    .filter(
      (line) =>
        line && line.toLowerCase() !== title.toLowerCase() && !/^(chia sẻ|tweet)$/iu.test(line),
    )
  return lines.slice(0, 5).join(' ').slice(0, 2000)
}

const parseItinerary = (body: string) => {
  const days: NormalizedTour['itineraryDays'] = []
  const marker = /(?:^|\n)\s*NGÀY\s*(\d+)(?=\s*(?::|[-–—.])|\s|$)/giu
  const matches = Array.from(body.matchAll(marker))
  matches.forEach((match, index) => {
    const start = (match.index || 0) + match[0].lastIndexOf('NGÀY')
    const end = index + 1 < matches.length ? matches[index + 1].index || body.length : body.length
    const chunk = body.slice(start, end).trim()
    const firstLineEnd = chunk.indexOf('\n')
    const header = cleanText(firstLineEnd >= 0 ? chunk.slice(0, firstLineEnd) : chunk)
    const rawContent = firstLineEnd >= 0 ? chunk.slice(firstLineEnd + 1) : ''
    const headerWithoutMarker = header.replace(/^NGÀY\s*\d+\s*(?:(?::|[-–—.])\s*)?/iu, '')
    const headerTitle = cleanText(headerWithoutMarker)
    const contentBeforeUiTail = trimSourceUiTail(rawContent)
    const contentLines = contentBeforeUiTail.split(/\n+/u)
    const fallbackTitleIndex = contentLines.findIndex((line) => cleanText(line))
    const fallbackTitle =
      !headerTitle && fallbackTitleIndex >= 0 ? cleanText(contentLines[fallbackTitleIndex]) : ''
    const title = cleanText((headerTitle || fallbackTitle).replace(/ĂN\s*:.*/iu, ''))
    const content = trimSourceUiTail(
      !headerTitle && fallbackTitleIndex >= 0
        ? contentLines.filter((_line, lineIndex) => lineIndex !== fallbackTitleIndex).join('\n')
        : rawContent,
    )
    const mealsMatch = headerWithoutMarker.match(/ĂN\s*:\s*([S\-\/T]+)/iu)
    const meals = mealsMatch ? mealsMatch[1].replace(/\s+/g, '') : undefined
    const route = cleanText(title.replace(/[–—]/g, '-'))
    const transport = extractItinerarySentence(
      content,
      /sân bay|máy bay|xe |xe ô tô|tàu|di chuyển/iu,
    )
    const accommodation =
      extractItinerarySentence(content, /nghỉ đêm|lưu trú|nhận phòng|resort/iu) ||
      extractItinerarySentence(content, /khách sạn/iu, /trả phòng|dùng bữa sáng/iu)

    days.push({
      dayNumber: Number(match[1]),
      title,
      route,
      summary: content.slice(0, 8000),
      meals,
      transport: cleanText(transport),
      accommodation: cleanText(accommodation),
    })
  })
  return days
}

const itineraryBlockingErrors = (
  days: NormalizedTour['itineraryDays'],
  durationDays: number | null,
) => {
  const errors: string[] = []
  if (!days.length) return ['NO_ITINERARY']

  const seen = new Set<number>()
  for (const [index, day] of days.entries()) {
    if (!day.title) errors.push(`MISSING_ITINERARY_TITLE:${index + 1}`)
    if (!day.summary) errors.push(`MISSING_ITINERARY_SUMMARY:${index + 1}`)
    if (seen.has(day.dayNumber)) errors.push(`DUPLICATE_ITINERARY_DAY:${day.dayNumber}`)
    seen.add(day.dayNumber)
    if (day.dayNumber !== index + 1) errors.push(`NON_CONTIGUOUS_ITINERARY_DAY:${day.dayNumber}`)
  }
  if (durationDays !== null && days.length !== durationDays) {
    errors.push(`ITINERARY_DURATION_MISMATCH:${days.length}/${durationDays}`)
  }
  return [...new Set(errors)]
}

const parsePrice = (value: unknown) => {
  const digits = String(value || '').replace(/[^\d]/g, '')
  return digits ? Number(digits) : null
}

const parseDateCandidates = (value: unknown, defaultYear: number | null) => {
  const raw = cleanText(value)
  const matches = Array.from(raw.matchAll(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/g))
  return matches
    .map((match) => {
      const day = Number(match[1])
      const month = Number(match[2])
      if (day < 1 || day > 31 || month < 1 || month > 12) return null
      const explicitYear = match[3]
        ? Number(match[3].length === 2 ? `20${match[3]}` : match[3])
        : defaultYear
      if (explicitYear === null) return null
      const date = new Date(Date.UTC(explicitYear, month - 1, day))
      if (date.getUTCDate() !== day || date.getUTCMonth() !== month - 1) return null
      return { date: date.toISOString(), rawDate: match[0] }
    })
    .filter((value): value is { date: string; rawDate: string } => Boolean(value))
}

const explicitYearsInDateCell = (value: unknown) =>
  Array.from(cleanText(value).matchAll(/\d{1,2}\/\d{1,2}\/(\d{2,4})\b/g), (match) =>
    Number(match[1].length === 2 ? `20${match[1]}` : match[1]),
  )

const yearsInText = (value: unknown) =>
  Array.from(String(value || '').matchAll(/\b(20\d{2})\b/g), (match) => Number(match[1]))

const resolveDepartureYear = (record: RawRecord, title: string, body: string) => {
  const tables = Array.isArray(record.content?.tables) ? record.content.tables : []
  const years = new Set<number>([
    ...yearsInText(title),
    ...yearsInText(body),
    ...yearsInText(JSON.stringify(tables)),
  ])
  return years.size === 1 ? [...years][0] : null
}

const findPricingTable = (tables: unknown[]) => {
  for (const candidate of tables) {
    if (!Array.isArray(candidate)) continue
    const rows = candidate as unknown[]
    const headerIndex = rows.findIndex(
      (row) => Array.isArray(row) && row.some((cell) => /ngày\s*khởi hành/iu.test(String(cell))),
    )
    if (headerIndex < 0) continue
    const header = rows[headerIndex] as unknown[]
    const dateIndex = header.findIndex((cell) => /ngày\s*khởi hành/iu.test(String(cell)))
    const adultIndex = header.findIndex((cell) => /người\s*lớn|adult/iu.test(String(cell)))
    if (dateIndex < 0 || adultIndex < 0) continue
    return {
      headers: header.map((cell) => String(cell ?? '')),
      rows: rows.slice(headerIndex + 1).filter(Array.isArray) as string[][],
      dateIndex,
      adultIndex,
    }
  }
  return null
}

const addDays = (date: string, days: number) => {
  const result = new Date(date)
  result.setUTCDate(result.getUTCDate() + days)
  return result.toISOString()
}

const toUtcDayTimestamp = (value: Date | string) => {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value)
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid reference date: ${String(value)}`)
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
}

const parseDepartureCity = (record: RawRecord, itineraryDays: NormalizedItineraryDay[]) => {
  const directValues = [
    record.departure_city,
    record.departureCity,
    record.content?.departure_city,
    record.content?.departureCity,
    record.meta?.departure_city,
    record.meta?.departureCity,
  ]
    .map(cleanText)
    .filter(Boolean)

  const body = cleanText(record.content?.body_text)
  const bodyMatch = body.match(/(?:điểm|nơi|sân bay)\s+(?:đón|khởi hành)\s*[:\-]\s*([^\n]+)/iu)
  const routeOrigin = itineraryDays[0]?.route
    ?.split(/\s*(?:-|–|—|→|->)\s*/u)
    .map(cleanText)
    .filter(Boolean)[0]
  const candidates = [...directValues, cleanText(bodyMatch?.[1]), routeOrigin].filter(Boolean)
  if (!candidates.length) return { value: undefined, ambiguous: false }

  const comparable = new Set(candidates.map(normalizedComparableText))
  if (comparable.size > 1) return { value: undefined, ambiguous: true }
  return { value: candidates[0], ambiguous: false }
}

const hasVndEvidence = (record: RawRecord, headers: string[], adultValue: unknown) => {
  const currency = [record.currency, record.content?.currency, record.meta?.currency]
    .map((value) => normalizedComparableText(value))
    .find(Boolean)
  if (currency === 'vnd' || currency === 'vnđ') return true
  return /(?:vnd|vnđ|đồng|₫|(?:^|[\s\d])đ(?:$|[\s.,]))/iu.test(
    `${headers.join(' ')} ${String(adultValue || '')}`,
  )
}

const parseDepartures = (
  record: RawRecord,
  warnings: string[],
  defaultYear: number | null,
  durationDays: number | null,
  departureCity: string | undefined,
  referenceTimestamp: number,
) => {
  const tables = Array.isArray(record.content?.tables) ? record.content.tables : []
  const table = findPricingTable(tables)
  if (!table) {
    warnings.push('NO_PRICING_TABLE')
    return []
  }
  const airline = parseAirline(String(record.content?.body_text || ''))
  const departures: SourceDeparture[] = []
  if (!durationDays || durationDays < 1) {
    warnings.push('NO_DURATION_FOR_RETURN_DATE')
    return departures
  }
  for (const [rowIndex, row] of table.rows.entries()) {
    const rawDates = String(row[table.dateIndex] || '')
    const priceFrom = parsePrice(row[table.adultIndex])
    if (!priceFrom) {
      warnings.push(`INVALID_ADULT_PRICE:${rawDates}`)
      continue
    }
    if (/\d{1,2}\/\d{2,}\/\d{1,2}/u.test(rawDates)) {
      warnings.push(`MALFORMED_DATE_CELL:${rawDates}`)
    }
    const cellYears = [...new Set(explicitYearsInDateCell(rawDates))]
    const dateYear =
      cellYears.length === 1 ? cellYears[0] : cellYears.length > 1 ? null : defaultYear
    const hasUnqualifiedDate = Array.from(
      rawDates.matchAll(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/g),
    ).some((match) => !match[3])
    if (dateYear === null && (cellYears.length === 0 || hasUnqualifiedDate)) {
      warnings.push(`AMBIGUOUS_DEPARTURE_YEAR:${rawDates}`)
    }
    const dates = parseDateCandidates(rawDates, dateYear)
    if (!dates.length) {
      warnings.push(`INVALID_DEPARTURE_DATE:${rawDates}`)
      continue
    }
    const currencySupported = hasVndEvidence(record, table.headers, row[table.adultIndex])
    if (!currencySupported) warnings.push(`AMBIGUOUS_PRICE_CURRENCY:${rawDates}`)
    for (const date of dates) {
      departures.push({
        departureDate: date.date,
        returnDate: addDays(date.date, durationDays - 1),
        departureCity,
        priceFrom,
        rawDate: date.rawDate,
        rawRow: row.map((cell) => String(cell ?? '')),
        airline,
        currency: currencySupported ? 'VND' : undefined,
        availabilityStatus: 'open',
        isFeatured:
          Date.parse(date.date) >= referenceTimestamp &&
          !departures.some((item) => item.isFeatured),
        sourceRowIndex: rowIndex + 1,
      })
    }
  }
  return departures
}

const sectionVisibilityFor = (
  tour: Pick<
    NormalizedTour,
    'title' | 'market' | 'durationDays' | 'itineraryDays' | 'departures' | 'images'
  >,
  itineraryValid: boolean,
  referenceTimestamp: number,
) => {
  const sections: string[] = []
  if (tour.title && tour.images.length) sections.push('hero')
  if (tour.durationDays) sections.push('facts')
  if (tour.itineraryDays.length && itineraryValid) sections.push('itinerary')
  if (tour.itineraryDays.length >= 2) sections.push('route')
  if (tour.departures.length) sections.push('departures')
  if (
    tour.departures.some((departure) => Date.parse(departure.departureDate) >= referenceTimestamp)
  ) {
    sections.push('sticky-cta')
  }
  return sections
}

const resolveImagePath = async (crawlerRoot: string, sourceId: string, localPath: string) => {
  const normalizedLocalPath = localPath.replace(/\\/g, '/')
  if (
    !normalizedLocalPath ||
    !sourceId ||
    sourceId.includes('/') ||
    sourceId.includes('\\') ||
    path.isAbsolute(normalizedLocalPath) ||
    /^[a-z]:\//iu.test(normalizedLocalPath)
  ) {
    return null
  }
  const relativeImagePath = normalizedLocalPath.replace(/^images\//iu, '')
  const storageImagesRoot = path.resolve(crawlerRoot, 'storage', 'images')
  const expectedRoot = path.resolve(storageImagesRoot, sourceId)
  const candidate = path.resolve(storageImagesRoot, relativeImagePath)
  if (!isWithinPath(expectedRoot, storageImagesRoot) || !isWithinPath(candidate, expectedRoot))
    return null

  try {
    const [realStorageImagesRoot, realExpectedRoot, realCandidate] = await Promise.all([
      fs.realpath(storageImagesRoot),
      fs.realpath(expectedRoot),
      fs.realpath(candidate),
    ])
    if (!isWithinPath(realExpectedRoot, realStorageImagesRoot)) return null
    if (!isWithinPath(realCandidate, realExpectedRoot)) return null
  } catch {
    return null
  }

  return candidate
}

const normalizeRawPricing = (tables: unknown[]): RichNormalizedContract['rawPricing'] =>
  tables.flatMap((candidate) => {
    if (!Array.isArray(candidate)) return []
    const rows = candidate.filter(Array.isArray) as unknown[][]
    if (!rows.length) return []
    return [
      {
        headers: rows[0].map((cell) => String(cell ?? '')),
        rows: rows.slice(1).map((row) => row.map((cell) => String(cell ?? ''))),
      },
    ]
  })

const collectRegularFiles = async (directory: string): Promise<string[]> => {
  let entries
  try {
    entries = await fs.readdir(directory, { withFileTypes: true })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw error
  }

  const files: string[] = []
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const entryPath = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...(await collectRegularFiles(entryPath)))
    else if (entry.isFile()) files.push(entryPath)
  }
  return files
}

export const buildSourceInventory = async (crawlerRoot: string): Promise<SourceInventory> => {
  const datasetDirectory = path.join(crawlerRoot, 'storage', 'datasets', 'default')
  const datasetFiles = (await collectRegularFiles(datasetDirectory)).filter(
    (file) => file.endsWith('.json') && path.basename(file) !== '__metadata__.json',
  )
  const imageFiles = await collectRegularFiles(path.join(crawlerRoot, 'storage', 'images'))
  const files = await Promise.all(
    [...datasetFiles, ...imageFiles]
      .sort((left, right) => left.localeCompare(right))
      .map(async (file): Promise<SourceInventoryFile> => {
        const bytes = await fs.readFile(file)
        return {
          path: path.relative(crawlerRoot, file).replace(/\\/g, '/'),
          bytes: bytes.byteLength,
          sha256: hashBytes(bytes),
        }
      }),
  )
  const totalBytes = files.reduce((total, file) => total + file.bytes, 0)
  return {
    files,
    fileCount: files.length,
    totalBytes,
    sourceSnapshotHash: hashBytes(stableStringify(files)),
  }
}

export const parseDoicanhvietRecord = async ({
  crawlerRoot,
  record,
  sourceFile,
  referenceDate = DEFAULT_PARSER_REFERENCE_DATE,
}: {
  crawlerRoot: string
  record: RawRecord
  sourceFile: string
  referenceDate?: Date | string
}): Promise<NormalizedTour> => {
  const referenceTimestamp = toUtcDayTimestamp(referenceDate)
  const sourceId = String(record.tour_id || '').trim()
  const category = String(record.category || '').trim()
  const kind = classify(record)
  const warnings: string[] = []
  const blockingErrors: string[] = []
  const sourceUrl = cleanText(record.url)
  if (!sourceUrl) blockingErrors.push('MISSING_SOURCE_URL')
  else if (!isValidDoicanhvietSourceUrl(sourceUrl)) {
    blockingErrors.push('INVALID_SOURCE_URL')
    try {
      const hostname = new URL(sourceUrl).hostname
      if (hostname !== 'doicanhviet.com' && hostname !== 'www.doicanhviet.com') {
        blockingErrors.push('INVALID_SOURCE_HOST')
      }
    } catch {
      // INVALID_SOURCE_URL is sufficient for an unparsable value.
    }
  }
  const title = cleanText(record.content?.heading || record.meta?.title)
  const body = cleanText(record.content?.body_text)
  const market = parseMarket(category)
  const duration = parseDuration(`${title}\n${body}`)
  const images: SourceImage[] = []

  if (!sourceId) blockingErrors.push('MISSING_SOURCE_ID')
  if (!title) blockingErrors.push('MISSING_TITLE')
  if (!market && kind === 'tour') warnings.push('UNMAPPED_MARKET', 'UNSUPPORTED_MARKET')
  if (!duration.days || duration.nights === null) warnings.push('NO_DURATION')
  if (kind === 'news') warnings.push('IS_NEWS')

  const rawImages = Array.isArray(record.images) ? record.images : []
  for (const [imageIndex, image] of rawImages.entries()) {
    const localPath = await resolveImagePath(crawlerRoot, sourceId, String(image.local_path || ''))
    if (!localPath) {
      warnings.push(`INVALID_IMAGE_PATH:${String(image.local_path || '')}`)
      continue
    }
    const bytes = await fs.readFile(localPath)
    const imageHash = hashBytes(bytes)
    images.push({
      alt: removeAirlineMarkers(cleanText(image.alt) || title),
      hash: imageHash,
      localPath,
      sourceKey: `dcv:${sourceId}:media:${imageIndex + 1}-${imageHash.slice(0, 8)}`,
      sourceUrl: image.src_url,
    })
  }

  const itineraryDays = kind === 'tour' ? parseItinerary(body) : []
  const itineraryErrors =
    kind === 'tour' ? itineraryBlockingErrors(itineraryDays, duration.days) : []
  const departureYear = kind === 'tour' ? resolveDepartureYear(record, title, body) : null
  const departureCityResult =
    kind === 'tour'
      ? parseDepartureCity(record, itineraryDays)
      : { value: undefined, ambiguous: false }
  if (departureCityResult.ambiguous) warnings.push('AMBIGUOUS_DEPARTURE_CITY')
  const departureCity = departureCityResult.value
  const departures =
    kind === 'tour'
      ? parseDepartures(
          record,
          warnings,
          departureYear,
          duration.days,
          departureCity,
          referenceTimestamp,
        )
      : []
  if (kind === 'tour' && !images.length) warnings.push('NO_MEDIA')
  if (kind === 'tour' && !itineraryDays.length) warnings.push('NO_ITINERARY')
  if (kind === 'tour' && !departures.length) warnings.push('NO_DEPARTURES')
  blockingErrors.push(...itineraryErrors)

  const sourceHash = hashBytes(stableStringify(record))
  const slug = sourceSlug(sourceId || 'unknown', title)
  const pathname = `/tour/${slug}`
  const summary = parseSummary(record, title)
  const sourceTables = Array.isArray(record.content?.tables) ? record.content.tables : []
  const rawPricing = normalizeRawPricing(sourceTables)
  const sectionVisibility = sectionVisibilityFor(
    { title, market, durationDays: duration.days, itineraryDays, departures, images },
    itineraryErrors.length === 0,
    referenceTimestamp,
  )
  const futureDepartures = departures.filter(
    (departure) => Date.parse(departure.departureDate) >= referenceTimestamp,
  )
  const publishEligible = Boolean(
    kind === 'tour' &&
    blockingErrors.length === 0 &&
    market &&
    title &&
    duration.days &&
    itineraryDays.length &&
    images.length &&
    futureDepartures.length > 0 &&
    futureDepartures.every((departure) => departure.currency === 'VND'),
  )
  if (kind === 'tour' && !publishEligible) warnings.push('DRAFT_ONLY')
  const duplicateCandidates: string[] = []
  const hotelSummary = itineraryDays
    .map((day) => day.accommodation)
    .filter(Boolean)
    .join('. ')
  const mealsSummary = itineraryDays
    .map((day) => day.meals)
    .filter(Boolean)
    .join('; ')
  const transportSummary = itineraryDays
    .map((day) => day.transport)
    .filter(Boolean)
    .join('. ')

  const normalized: NormalizedTour = {
    sourceId,
    sourceUrl,
    sourceFile,
    sourceHash,
    crawledAt: record.crawled_at,
    category,
    kind,
    title,
    slug,
    pathname,
    market,
    durationDays: duration.days,
    durationNights: duration.nights,
    summary,
    priceFrom: departures[0]?.priceFrom ?? null,
    currency: departures[0]?.currency,
    itineraryDays,
    departures,
    sourcePricing: { tables: sourceTables },
    airline: parseAirline(body),
    images,
    warnings,
    blockingErrors,
    sectionVisibility,
    publishEligible,
    duplicateCandidates,
    source: {
      sourceSystem: 'doicanhviet',
      sourceId,
      sourceKey: `doicanhviet:${sourceId}`,
      sourceUrl,
      crawledAt: record.crawled_at,
      sourceHash,
    },
    classification: {
      kind,
      market,
      originalCategory: category || null,
    },
    wrapperPage: {
      title,
      slug,
      pathname,
      meta: {
        title: title || null,
        description: summary || null,
        imageSourceKey: images[0]?.sourceKey || null,
      },
    },
    product: {
      tourCode: sourceTourCode(sourceId),
      title,
      slug,
      market,
      durationDays: duration.days,
      durationNights: duration.nights,
      summary: summary || null,
      highlights: [],
      routeStops: [],
      itineraryDays,
      includes: [],
      excludes: [],
      servicesSummary: {
        hotelSummary,
        mealsSummary,
        transportSummary,
        notes: [],
      },
      sectionVisibility,
      meta: {
        title: title || null,
        description: summary || null,
        breadcrumbLabel: title || null,
      },
    },
    rawPricing,
    quality: {
      warnings,
      blockingErrors,
      duplicateCandidates,
      publishEligible,
    },
    parsedValues: {
      title: {
        value: title,
        sourceFragment: cleanText(record.content?.heading || record.meta?.title),
        confidence: record.content?.heading ? 1 : 0.8,
        parserRule: record.content?.heading ? 'content.heading' : 'meta.title',
        requiresReview: !record.content?.heading,
      },
      market: {
        value: market,
        sourceFragment: category,
        confidence: market ? 1 : 0,
        parserRule: 'category-market-map',
        requiresReview: !market,
      },
      durationDays: {
        value: duration.days,
        sourceFragment:
          `${title}\n${body}`.match(/\d+\s*(?:ngày|ngay|n)\s*[-–]?\s*\d+\s*(?:đêm|dem|d)/iu)?.[0] ||
          '',
        confidence: duration.days ? 0.9 : 0,
        parserRule: 'duration-regex',
        requiresReview: !duration.days,
      },
      durationNights: {
        value: duration.nights,
        sourceFragment:
          `${title}\n${body}`.match(/\d+\s*(?:ngày|ngay|n)\s*[-–]?\s*\d+\s*(?:đêm|dem|d)/iu)?.[0] ||
          '',
        confidence: duration.nights !== null ? 0.9 : 0,
        parserRule: 'duration-regex',
        requiresReview: duration.nights === null,
      },
    },
  }
  return normalized
}

const duplicateFingerprint = (record: NormalizedTour) =>
  [record.market, record.durationDays, record.durationNights, slugify(record.title)].join('|')

export const annotateDuplicateCandidates = (records: NormalizedTour[]) => {
  const byFingerprint = new Map<string, NormalizedTour[]>()
  for (const record of records.filter((candidate) => candidate.kind === 'tour')) {
    const fingerprint = duplicateFingerprint(record)
    const candidates = byFingerprint.get(fingerprint) || []
    candidates.push(record)
    byFingerprint.set(fingerprint, candidates)
  }

  for (const candidates of byFingerprint.values()) {
    if (candidates.length < 2) continue
    candidates.sort(
      (left, right) =>
        left.sourceId.localeCompare(right.sourceId, 'en', { numeric: true }) ||
        left.sourceFile.localeCompare(right.sourceFile),
    )
    for (const record of candidates) {
      const duplicateCandidates = candidates
        .filter((candidate) => candidate !== record)
        .map((candidate) =>
          candidate.sourceId === record.sourceId
            ? `${candidate.sourceId}@${candidate.sourceFile}`
            : candidate.sourceId,
        )
      record.duplicateCandidates.splice(
        0,
        record.duplicateCandidates.length,
        ...duplicateCandidates,
      )
      if (!record.warnings.includes('POSSIBLE_SOURCE_DUPLICATE')) {
        record.warnings.push('POSSIBLE_SOURCE_DUPLICATE')
      }
      record.publishEligible = false
      record.quality.publishEligible = false
    }
  }

  return records
}

export const readCrawlerRecords = async (crawlerRoot: string, only?: Set<string>) => {
  const datasetDir = path.join(crawlerRoot, 'storage', 'datasets', 'default')
  const files = (await fs.readdir(datasetDir))
    .filter((file) => file.endsWith('.json') && file !== '__metadata__.json')
    .sort()
  const records: Array<{ file: string; record: RawRecord }> = []
  for (const file of files) {
    const fullPath = path.join(datasetDir, file)
    const record = JSON.parse(await fs.readFile(fullPath, 'utf8')) as RawRecord
    const sourceId = String(record.tour_id || '')
    if (only && !only.has(sourceId)) continue
    records.push({ file: fullPath, record })
  }
  return records.sort(
    (left, right) =>
      String(left.record.tour_id || '').localeCompare(String(right.record.tour_id || ''), 'en', {
        numeric: true,
      }) || left.file.localeCompare(right.file),
  )
}

export const parseArgs = (argv: string[]) => {
  const args: Record<string, string | boolean> = {}
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index]
    if (!item.startsWith('--')) continue
    const key = item.slice(2)
    const next = argv[index + 1]
    if (!next || next.startsWith('--')) args[key] = true
    else {
      args[key] = next
      index += 1
    }
  }
  return args
}

export const selectedSourceIDs = (value: unknown) =>
  new Set(
    String(value || '')
      .split(/[\s,]+/u)
      .map((item) => item.trim())
      .filter(Boolean),
  )
