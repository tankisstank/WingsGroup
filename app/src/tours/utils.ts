import { getCopyLocale, type CopyLocaleCode } from '@/utilities/locales'
import { resolveSiteInquiryContactPath } from '@/utilities/siteContactPaths'
import type { SupportedLocaleCode } from '@/utilities/sitePaths'
import { normalizeGovernedTourPrice } from './currency'
import { appendTourEnquiryContextParams, type TourEnquiryContext } from './enquiryContext'

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
  const governedPrice = normalizeGovernedTourPrice({ currency, value })

  if (!governedPrice) {
    return null
  }

  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: governedPrice.currency,
    maximumFractionDigits: 0,
  }).format(governedPrice.value)
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

  const durationUnits = {
    en: {
      day: (value: number) => `${value} ${value === 1 ? 'day' : 'days'}`,
      night: (value: number) => `${value} ${value === 1 ? 'night' : 'nights'}`,
    },
    es: {
      day: (value: number) => `${value} ${value === 1 ? 'día' : 'días'}`,
      night: (value: number) => `${value} ${value === 1 ? 'noche' : 'noches'}`,
    },
    it: {
      day: (value: number) => `${value} ${value === 1 ? 'giorno' : 'giorni'}`,
      night: (value: number) => `${value} ${value === 1 ? 'notte' : 'notti'}`,
    },
    pt: {
      day: (value: number) => `${value} ${value === 1 ? 'dia' : 'dias'}`,
      night: (value: number) => `${value} ${value === 1 ? 'noite' : 'noites'}`,
    },
    vi: {
      day: (value: number) => `${value} ngày`,
      night: (value: number) => `${value} đêm`,
    },
  } as const
  const publicLocale = locale in durationUnits ? (locale as keyof typeof durationUnits) : 'en'
  const units = durationUnits[publicLocale]
  const parts = [
    days ? units.day(days) : null,
    nights !== null && nights !== undefined ? units.night(nights) : null,
  ].filter(Boolean)

  return parts.length > 0 ? parts.join(' / ') : null
}

/**
 * Applies conservative public-facing editorial cleanup without translating or
 * changing factual content. Place names follow the canonical public taxonomy.
 */
export const normalizeTourPublicText = (value?: null | string): string => {
  return String(value || '')
    .normalize('NFKC')
    .replace(/\bSa\s*Pa\b/giu, 'Sa Pa')
    .replace(/\bHa\s*Long\b/giu, 'Ha Long')
    .replace(/\s+([,.;:!?])/gu, '$1')
    .replace(/([,;:])(?=\p{L})/gu, '$1 ')
    .replace(/([.!?])(?=\p{Lu})/gu, '$1 ')
    .replace(/\s+/gu, ' ')
    .trim()
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
  discoveryContext,
}: {
  departureId?: null | number | string
  discoveryContext?: Omit<TourEnquiryContext, 'source' | 'tourId' | 'tourSlug' | 'tourTitle'>
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

  appendTourEnquiryContextParams(params, { discovery: discoveryContext?.discovery })

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
  const publicLocale = ['en', 'es', 'it', 'pt', 'vi'].includes(locale)
    ? (locale as 'en' | 'es' | 'it' | 'pt' | 'vi')
    : 'en'
  const copy = {
    en: {
      honesty: 'We confirm your tailored quote before any deposit.',
      label: 'From',
      onRequest: 'On request · reply within 24h',
      priceOnRequest: 'Price on request',
    },
    es: {
      honesty: 'Confirmamos tu propuesta personalizada antes de cualquier depósito.',
      label: 'Desde',
      onRequest: 'Bajo consulta · respuesta en 24 h',
      priceOnRequest: 'Precio bajo consulta',
    },
    it: {
      honesty: 'Confermiamo il preventivo personalizzato prima di qualsiasi acconto.',
      label: 'Da',
      onRequest: 'Su richiesta · risposta entro 24 ore',
      priceOnRequest: 'Prezzo su richiesta',
    },
    pt: {
      honesty: 'Confirmamos sua proposta personalizada antes de qualquer depósito.',
      label: 'A partir de',
      onRequest: 'Sob consulta · resposta em 24 h',
      priceOnRequest: 'Preço sob consulta',
    },
    vi: {
      honesty: 'Chúng tôi xác nhận báo giá thiết kế riêng trước khi bạn đặt cọc.',
      label: 'Giá từ',
      onRequest: 'Theo yêu cầu · phản hồi trong 24 giờ',
      priceOnRequest: 'Giá theo yêu cầu',
    },
  }[publicLocale]
  const formatted = formatTourPrice(priceFrom, currency)

  if (formatted) {
    return {
      honesty: copy.honesty,
      label: copy.label,
      value: formatted,
    }
  }

  return {
    honesty: copy.honesty,
    label: copy.priceOnRequest,
    value: copy.onRequest,
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
