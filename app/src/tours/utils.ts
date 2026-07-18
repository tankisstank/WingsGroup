import { getCopyLocale, type CopyLocaleCode } from '@/utilities/locales'
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

export const getDurationLabel = (days?: null | number, nights?: null | number) => {
  if (!days && !nights) {
    return null
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
export const getContactPath = () => '/lien-he'

export type TourInquiryIntent = 'hold-seat' | 'inquiry' | 'request-quote' | 'contact'

export const getTourInquiryPath = ({
  departureId,
  intent = 'inquiry',
  source,
  tourId,
  tourSlug,
}: {
  departureId?: null | number | string
  intent?: TourInquiryIntent
  source?: null | string
  tourId?: null | number | string
  tourSlug?: null | string
}) => {
  const params = new URLSearchParams()

  params.set('intent', intent)

  if (tourSlug) {
    params.set('tour', String(tourSlug))
  }

  if (tourId !== null && tourId !== undefined && tourId !== '') {
    params.set('tourId', String(tourId))
  }

  if (departureId !== null && departureId !== undefined && departureId !== '') {
    params.set('departureId', String(departureId))
  }

  if (source) {
    params.set('source', source)
  }

  const query = params.toString()

  return query ? `${getContactPath()}?${query}` : getContactPath()
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
