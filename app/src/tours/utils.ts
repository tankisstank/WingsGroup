import { getCopyLocale, type CopyLocaleCode } from '@/utilities/locales'
import { resolveSiteInquiryContactPath } from '@/utilities/siteContactPaths'
import type { SupportedLocaleCode } from '@/utilities/sitePaths'

const marketConfig = {
  china: {
    heading: 'Tour Trung Quốc',
    routeSlug: 'trung-quoc',
    shortLabel: 'Trung Quốc',
  },
  japan: {
    heading: 'Tour Nhật Bản',
    routeSlug: 'nhat-ban',
    shortLabel: 'Nhật Bản',
  },
  korea: {
    heading: 'Tour Hàn Quốc',
    routeSlug: 'han-quoc',
    shortLabel: 'Hàn Quốc',
  },
  vietnam: { heading: 'Vietnam Tours', routeSlug: 'vietnam', shortLabel: 'Vietnam' },
  thailand: { heading: 'Thailand Tours', routeSlug: 'thailand', shortLabel: 'Thailand' },
  cambodia: { heading: 'Cambodia Tours', routeSlug: 'cambodia', shortLabel: 'Cambodia' },
  laos: { heading: 'Laos Tours', routeSlug: 'laos', shortLabel: 'Laos' },
  myanmar: { heading: 'Myanmar Tours', routeSlug: 'myanmar', shortLabel: 'Myanmar' },
  indochina: { heading: 'Indochina Tours', routeSlug: 'indochina', shortLabel: 'Indochina' },
  other: { heading: 'Other Tours', routeSlug: 'other', shortLabel: 'Other' },
} as const

export type TourMarketKey = keyof typeof marketConfig

export const marketRouteSlugToKey = Object.fromEntries(
  Object.entries(marketConfig).map(([key, value]) => [value.routeSlug, key]),
) as Record<string, TourMarketKey>

export const getMarketConfig = (key?: null | string) => {
  if (!key) {
    return null
  }

  return marketConfig[key as TourMarketKey] || null
}

export const formatTourPrice = (value?: null | number, currency?: null | string) => {
  if (typeof value !== 'number') {
    return null
  }

  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: currency || 'VND',
    maximumFractionDigits: 0,
  }).format(value)
}

export const formatTourDate = (
  value?: null | string,
  locale: CopyLocaleCode | SupportedLocaleCode = 'vi',
) => {
  if (!value) {
    return null
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat(getCopyLocale(locale) === 'en' ? 'en-GB' : 'vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

export const getDurationLabel = (
  days?: null | number,
  nights?: null | number,
  locale: CopyLocaleCode | SupportedLocaleCode = 'vi',
) => {
  if (!days && !nights) {
    return null
  }

  if (getCopyLocale(locale) === 'en') {
    if (days && nights !== null && nights !== undefined) {
      return `${days} days / ${nights} nights`
    }

    return [days ? `${days} days` : null, nights ? `${nights} nights` : null]
      .filter(Boolean)
      .join(' / ')
  }

  if (days && nights !== null && nights !== undefined) {
    return `${days}N${nights}Đ`
  }

  return [days ? `${days} ngày` : null, nights ? `${nights} đêm` : null].filter(Boolean).join(' / ')
}

export const getAvailabilityLabel = (
  status?: null | string,
  locale: CopyLocaleCode | SupportedLocaleCode = 'vi',
) => {
  const vi: Record<string, string> = {
    limited: 'Sắp hết chỗ',
    open: 'Mở bán',
    'sold-out': 'Đã kín',
  }
  const en: Record<string, string> = {
    limited: 'Limited',
    open: 'Open',
    'sold-out': 'Sold out',
  }

  if (!status) {
    return getCopyLocale(locale) === 'en' ? 'Open' : 'Mở bán'
  }

  return (getCopyLocale(locale) === 'en' ? en : vi)[status] || status
}

export const getSchedulePath = () => '/lich-khoi-hanh'

/** Site-aware inquiry/contact path. Defaults to WingsGo `/lien-he`. */
export const getContactPath = (siteCode?: null | string) => resolveSiteInquiryContactPath(siteCode)

export type TourInquiryIntent = 'hold-seat' | 'inquiry' | 'request-quote' | 'contact'

export const getTourInquiryPath = ({
  departureId,
  intent = 'inquiry',
  siteCode,
  source,
  tourId,
  tourSlug,
  tourTitle,
}: {
  departureId?: null | number | string
  intent?: TourInquiryIntent
  siteCode?: null | string
  source?: null | string
  tourId?: null | number | string
  tourSlug?: null | string
  tourTitle?: null | string
}) => {
  const params = new URLSearchParams()
  const contactPath = getContactPath(siteCode)

  params.set('intent', intent)

  if (tourSlug) {
    params.set('tour', String(tourSlug))
  }

  if (tourId !== null && tourId !== undefined && tourId !== '') {
    params.set('tourId', String(tourId))
  }

  if (tourTitle) {
    params.set('tourTitle', String(tourTitle))
  }

  if (departureId !== null && departureId !== undefined && departureId !== '') {
    params.set('departureId', String(departureId))
  }

  if (source) {
    params.set('source', source)
  }

  const query = params.toString()

  return query ? `${contactPath}?${query}` : contactPath
}

/** Parse free-text meal notes into B/L/D chip flags (EN + VI keywords). */
export const getMealChipFlags = (meals?: null | string) => {
  const text = String(meals || '').toLowerCase()
  const comparable = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '')

  if (!comparable.trim()) {
    return { breakfast: false, dinner: false, lunch: false }
  }

  const breakfast =
    /\b(b|bf|breakfast)\b/.test(comparable) ||
    comparable.includes('an sang') ||
    comparable.includes('bua sang') ||
    /(^|[^a-z])sang([^a-z]|$)/.test(comparable)
  const lunch =
    /\b(l|lunch)\b/.test(comparable) ||
    comparable.includes('an trua') ||
    comparable.includes('bua trua') ||
    /(^|[^a-z])trua([^a-z]|$)/.test(comparable)
  const dinner =
    /\b(d|dinner|supper)\b/.test(comparable) ||
    comparable.includes('an toi') ||
    comparable.includes('bua toi') ||
    /(^|[^a-z])toi([^a-z]|$)/.test(comparable)

  // Compact "B/L/D" or "B · L · D" style
  if (!breakfast && !lunch && !dinner) {
    const tokens = comparable.split(/[^a-z]+/).filter(Boolean)
    return {
      breakfast: tokens.includes('b'),
      dinner: tokens.includes('d'),
      lunch: tokens.includes('l'),
    }
  }

  return { breakfast, dinner, lunch }
}

/** Short route chips for hero (max 5). Prefer structured stops over day titles. */
export const getTourRouteChips = (tour: {
  destinations?: null | Array<{ label?: null | string } | string>
  factSummary?: { routeSummary?: null | string } | null
  routeViz?: { stops?: null | Array<{ label?: null | string }> } | null
}): string[] => {
  const fromStops = (tour.routeViz?.stops || [])
    .map((stop) => String(stop?.label || '').trim())
    .filter(Boolean)

  if (fromStops.length > 0) {
    return Array.from(new Set(fromStops)).slice(0, 5)
  }

  const fromDestinations = (tour.destinations || [])
    .map((item) => (typeof item === 'string' ? item : String(item?.label || '')).trim())
    .filter(Boolean)

  if (fromDestinations.length > 0) {
    return Array.from(new Set(fromDestinations)).slice(0, 5)
  }

  const summary = String(tour.factSummary?.routeSummary || '').trim()
  if (!summary) {
    return []
  }

  return Array.from(
    new Set(
      summary
        .split(/\s*[·•|,/→\-–—]\s*/)
        .map((part) => part.trim())
        .filter((part) => part.length > 0 && part.length <= 28),
    ),
  ).slice(0, 5)
}

/**
 * Consultative primary CTA href policy:
 * - honor external / tel / mailto CMS targets
 * - honor same-origin paths that already include consultative intent
 * - otherwise rebuild via site-aware inquiry path (no bare /lien-he leak)
 */
export const resolveConsultativeCtaHref = ({
  cmsHref,
  fallbackPath,
}: {
  cmsHref?: null | string
  fallbackPath: string
}) => {
  const href = String(cmsHref || '').trim()

  if (!href) {
    return fallbackPath
  }

  if (/^(https?:|mailto:|tel:)/i.test(href)) {
    return href
  }

  if (/[?&]intent=(inquiry|request-quote|contact)\b/i.test(href)) {
    return href
  }

  return fallbackPath
}

export const getTourPricePosture = ({
  currency,
  locale = 'en',
  priceFrom,
}: {
  currency?: null | string
  locale?: CopyLocaleCode | SupportedLocaleCode
  priceFrom?: null | number
}): { honesty: string; label: string; value: string } => {
  const isEn = getCopyLocale(locale) === 'en'
  const formatted = formatTourPrice(priceFrom, currency)

  if (formatted) {
    return {
      honesty: isEn
        ? 'Sales confirms final price before any hold.'
        : 'Sales xác nhận lại giá trước khi giữ chỗ.',
      label: isEn ? 'From' : 'Giá từ',
      value: formatted,
    }
  }

  return {
    honesty: isEn
      ? 'Sales confirms final price before any hold.'
      : 'Sales xác nhận lại giá trước khi giữ chỗ.',
    label: isEn ? 'Price on request' : 'Giá theo yêu cầu',
    value: isEn ? 'On request · reply within 24h' : 'Theo yêu cầu · phản hồi trong 24h',
  }
}

export const getMarketPath = (market?: null | string) => {
  const config = getMarketConfig(market)

  return config ? `/thi-truong/${config.routeSlug}` : '/thi-truong'
}

export const getCampaignPath = (slug?: null | string) => (slug ? `/campaign/${slug}` : '/campaign')
export const getTourPath = (slug?: null | string) => (slug ? `/tour/${slug}` : '/tour')

export const getLowestPrice = (departures?: Array<{ priceFrom?: null | number }> | null) => {
  const values =
    departures
      ?.map((departure) => departure.priceFrom)
      .filter((value): value is number => typeof value === 'number') || []

  if (values.length === 0) {
    return null
  }

  return Math.min(...values)
}

const toDateOnly = (value?: null | string) => {
  if (!value) {
    return null
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

export const getFutureDepartures = <T extends { departureDate?: null | string }>(
  departures?: T[] | null,
) => {
  const today = new Date()
  const threshold = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  )

  return (departures || []).filter((departure) => {
    const date = toDateOnly(departure.departureDate)

    return date ? date.getTime() >= threshold.getTime() : false
  })
}

export const getNextDeparture = <T extends { departureDate?: null | string }>(
  departures?: T[] | null,
) => getFutureDepartures(departures)[0] || (departures?.[0] ?? null)

export const groupDeparturesByMonth = <T extends { departureDate?: null | string }>(
  departures?: T[] | null,
) => {
  const groups = new Map<string, T[]>()

  for (const departure of departures || []) {
    const date = toDateOnly(departure.departureDate)
    const key = date
      ? `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
      : 'undated'

    groups.set(key, [...(groups.get(key) || []), departure])
  }

  return Array.from(groups.entries()).map(([key, items]) => ({
    key,
    label:
      key === 'undated'
        ? 'Chưa có ngày cụ thể'
        : new Intl.DateTimeFormat('vi-VN', {
            month: 'long',
            year: 'numeric',
          }).format(new Date(`${key}-01T00:00:00.000Z`)),
    items,
  }))
}
