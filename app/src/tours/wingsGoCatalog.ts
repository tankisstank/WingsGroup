import { type EditorialBadgeDTO, normalizeEditorialBadges } from './editorialBadges'
import type { Payload } from 'payload'

import {
  type BusinessSeason,
  businessCalendarMonth,
  daysUntilBusinessDay,
  isBusinessSeason,
  seasonOfBusinessMonth,
  toBusinessCalendarDay,
} from './businessCalendar'
import { isDepartureVerificationCurrent } from './departureCommerce'
import { getMediaUrl } from '@/utilities/getMediaUrl'
import { getTourProductPath } from '@/utilities/siteURLs'
import { getWingsGoCatalogCopy } from './wingsGoCatalogCopy'

export const WINGSGO_CATALOG_BATCH_SIZE = 6
export const WINGSGO_CATALOG_MAX_FEATURED = 6
/** Maximum source inventory read for the bounded WingsGo catalog contract. */
export const WINGSGO_CATALOG_MAX_INVENTORY = 200

export const WINGSGO_CATALOG_MARKETS = [
  'korea',
  'japan',
  'china',
  'vietnam',
  'thailand',
  'cambodia',
  'laos',
  'myanmar',
  'indochina',
  'other',
] as const

export type WingsGoCatalogMarket = (typeof WINGSGO_CATALOG_MARKETS)[number]

export type WingsGoCatalogSort = 'next-departure' | 'price' | 'title'

export type WingsGoCatalogFilters = {
  departureMonth?: string
  durationMax?: number
  durationMin?: number
  market?: string
  priceMax?: number
  priceMin?: number
  season?: BusinessSeason
  sort?: WingsGoCatalogSort
}

export type WingsGoCatalogPage = {
  id: number | string
  pathname?: null | string
  site: number | string | { code?: null | string; id: number | string }
  wingsGoTourCatalog?: {
    enabled?: boolean | null
    curation?: number | string | { id?: number | string | null; featuredTours?: unknown } | null
    featuredTours?: Array<number | string | { id?: number | string | null }> | null
  } | null
}

export type WingsGoCatalogCard = {
  duration: { days: number; nights: number }
  editorialBadges?: EditorialBadgeDTO[]
  hasHotEditorialBadge?: boolean
  id: number | string
  image: { alt: string; url: string } | null
  market: string
  nextDeparture: {
    airline: string | null
    date: string
    daysUntilDeparture?: number | null
    departureCity: string | null
    promoLabel?: string | null
  }
  price:
    | { currency: string; kind: 'verified'; originalPrice?: number | null; value: number }
    | { kind: 'contact'; label: string }
  slug: string
  summary: string
  title: string
  href: string
}

export type WingsGoCatalogMarketSummary = {
  count: number
  image: { alt: string; url: string } | null
  lowestPrice:
    | { currency: string; kind: 'verified'; originalPrice?: number | null; value: number }
    | null
  market: string
}

export type WingsGoCatalogData = {
  all: WingsGoCatalogCard[]
  featured: WingsGoCatalogCard[]
  filtersActive: boolean
  hasMore: boolean
  hero: WingsGoCatalogCard[]
  markets: WingsGoCatalogMarketSummary[]
  nextCursor: string | null
  nextOffset: number
  upcoming: WingsGoCatalogCard[]
}

export type CatalogCursorPayload = {
  ctx: string
  date: string
  id: number | string
  price: number | null
  sort: WingsGoCatalogSort
  title: string
  v: 2
  x: string[]
}

type Relation = number | string | { id?: number | string | null } | null | undefined
type InventoryProduct = {
  _status?: null | string
  durationDays?: number | null
  editorialBadges?: unknown
  durationNights?: number | null
  gallery?: unknown
  heroMedia?: unknown
  id: number | string
  market?: null | string
  slug?: null | string
  summary?: null | string
  title?: null | string
  wrapperPage?: Relation
  site?: Relation
}
type InventoryMedia = {
  alt?: null | string
  site?: Relation
  url?: null | string
}
type InventoryWrapper = {
  _status?: null | string
  id: number | string
  pathname?: null | string
  site?: Relation
}
type InventoryDeparture = {
  _status?: null | string
  airline?: null | string
  currency?: null | string
  commerceVerified?: boolean | null
  departureCity?: null | string
  departureDate?: null | string
  expiresAt?: null | string
  id: number | string
  priceFrom?: null | number
  originalPrice?: null | number
  originalCurrency?: null | string
  promoLabel?: null | string
  tourProduct?: Relation
  availabilityStatus?: null | string
  verifiedAt?: null | string
  site?: Relation
}

type SearchParamSource = URLSearchParams | Record<string, string | string[] | undefined>

export const hasActiveCatalogFilters = (filters?: WingsGoCatalogFilters | null): boolean => {
  if (!filters) return false
  return Boolean(
    filters.market ||
      filters.durationMin !== undefined ||
      filters.durationMax !== undefined ||
      filters.priceMin !== undefined ||
      filters.priceMax !== undefined ||
      filters.departureMonth ||
      filters.season,
  )
}

export const fnv1a32 = (input: string): number => {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

const relationID = (value: Relation): number | string | null => {
  if (typeof value === 'number' || typeof value === 'string') return value
  if (value && (typeof value.id === 'number' || typeof value.id === 'string')) return value.id
  return null
}

const sameID = (left: unknown, right: unknown) => {
  const leftID = relationID(left as Relation)
  const rightID = relationID(right as Relation)
  return leftID !== null && rightID !== null && String(leftID) === String(rightID)
}

const validDate = (value: unknown): string | null => {
  if (typeof value !== 'string' || !value) return null
  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? value : null
}

const sortDepartures = (departures: InventoryDeparture[]) =>
  [...departures].sort((left, right) => {
    const dateDelta =
      new Date(left.departureDate || '').getTime() - new Date(right.departureDate || '').getTime()
    if (dateDelta !== 0) return dateDelta
    return String(left.id).localeCompare(String(right.id), 'en')
  })

const relationIDs = (value: unknown) =>
  (Array.isArray(value) ? value : [])
    .map((item) => relationID(item as Relation))
    .filter((id): id is number | string => id !== null)

const mediaDTO = (value: unknown, fallbackAlt: string, productSite: Relation) => {
  if (!value || typeof value !== 'object') return null
  const media = value as InventoryMedia
  return media.url && sameID(media.site, productSite)
    ? { alt: media.alt?.trim() || fallbackAlt, url: getMediaUrl(media.url) }
    : null
}

const firstMedia = (product: InventoryProduct) => {
  const fallbackAlt = product.title || 'Tour WingsGo'
  const hero = mediaDTO(product.heroMedia, fallbackAlt, product.site)
  if (hero) return hero
  const gallery = Array.isArray(product.gallery) ? product.gallery : []
  for (const item of gallery) {
    const media = mediaDTO(item, fallbackAlt, product.site)
    if (media) return media
  }
  return null
}

export const isEligibleWingsGoCatalogProduct = ({
  departures,
  now = new Date(),
  product,
  siteCode,
  wrapper,
}: {
  departures: InventoryDeparture[]
  now?: Date
  product: InventoryProduct
  siteCode: string
  wrapper?: InventoryWrapper | null
}) => {
  const futureDepartures = departures.filter((departure) => {
    const date = validDate(departure.departureDate)
    return (
      departure._status === 'published' &&
      sameID(departure.tourProduct, product.id) &&
      sameID(departure.site, product.site) &&
      date !== null &&
      new Date(date).getTime() > now.getTime()
    )
  })

  return (
    siteCode === 'wings-go' &&
    product._status === 'published' &&
    sameID(product.site, wrapper?.site) &&
    wrapper?._status === 'published' &&
    wrapper.pathname === `/tour/${product.slug}` &&
    futureDepartures.length > 0
  )
}

const buildCard = ({
  departures,
  locale,
  now,
  product,
  window,
  wrapper,
}: {
  departures: InventoryDeparture[]
  locale?: string
  now: Date
  product: InventoryProduct
  window?: { departureMonth?: string; season?: BusinessSeason }
  wrapper: InventoryWrapper | null
}): WingsGoCatalogCard | null => {
  if (
    !product.slug ||
    !product.title ||
    !isEligibleWingsGoCatalogProduct({
      departures,
      now,
      product,
      siteCode: 'wings-go',
      wrapper,
    })
  ) {
    return null
  }

  const matchingDepartures = sortDepartures(departures).filter((departure) => {
    const date = validDate(departure.departureDate)
    if (
      departure._status !== 'published' ||
      !sameID(departure.tourProduct, product.id) ||
      !sameID(departure.site, product.site) ||
      date === null ||
      new Date(date).getTime() <= now.getTime()
    ) {
      return false
    }

    if (window?.departureMonth) {
      const departureMonth = businessCalendarMonth(departure.departureDate)
      if (departureMonth !== window.departureMonth) return false
    }

    if (window?.season) {
      const departureSeason = seasonOfBusinessMonth(departure.departureDate)
      if (departureSeason !== window.season) return false
    }

    return true
  })

  if (matchingDepartures.length === 0) {
    return null
  }

  const nearestDeparture = matchingDepartures[0]
  if (!nearestDeparture?.departureDate) return null

  // US-091 / US-092: Card price displays the lowest price among future published same-site
  // departures inside the matching window with current commerce verification and not sold-out.
  // The nearest matching future departure remains independent as nextDeparture.
  const verifiedPriceDepartures = matchingDepartures.filter((departure) => {
    if (departure.availabilityStatus === 'sold-out') return false
    if (typeof departure.priceFrom !== 'number' || departure.priceFrom <= 0) return false

    const hasFreshness = Boolean(departure.verifiedAt || departure.expiresAt)
    return (
      departure.commerceVerified !== false &&
      (hasFreshness
        ? isDepartureVerificationCurrent(departure, now.getTime())
        : departure.commerceVerified === true)
    )
  })

  let lowestPriceDeparture: InventoryDeparture | null = null
  for (const departure of verifiedPriceDepartures) {
    if (
      !lowestPriceDeparture ||
      (departure.priceFrom as number) < (lowestPriceDeparture.priceFrom as number)
    ) {
      lowestPriceDeparture = departure
    }
  }

  // Payload stores the verification window; commerceVerified is a derived DTO value.
  const canShowDiscount =
    lowestPriceDeparture !== null &&
    typeof lowestPriceDeparture.originalPrice === 'number' &&
    lowestPriceDeparture.originalPrice > (lowestPriceDeparture.priceFrom as number) &&
    Boolean(lowestPriceDeparture.currency) &&
    (!lowestPriceDeparture.originalCurrency ||
      lowestPriceDeparture.originalCurrency === lowestPriceDeparture.currency)

  const price = lowestPriceDeparture
    ? {
        currency: lowestPriceDeparture.currency || 'VND',
        kind: 'verified' as const,
        originalPrice: canShowDiscount ? lowestPriceDeparture.originalPrice : null,
        value: lowestPriceDeparture.priceFrom!,
      }
    : { kind: 'contact' as const, label: getWingsGoCatalogCopy(locale).contactPriceLabel }

  const { editorialBadges, hasHotEditorialBadge } = normalizeEditorialBadges(
    product.editorialBadges,
    locale,
  )

  return {
    duration: {
      days: Number(product.durationDays || 0),
      nights: Number(product.durationNights || 0),
    },
    editorialBadges,
    hasHotEditorialBadge: Boolean(hasHotEditorialBadge),
    href: getTourProductPath(product.slug, locale === 'vi' ? undefined : locale, 'vi'),
    id: product.id,
    image: firstMedia(product),
    market: product.market || 'other',
    nextDeparture: {
      airline: nearestDeparture.airline || null,
      date: nearestDeparture.departureDate,
      daysUntilDeparture: daysUntilBusinessDay(nearestDeparture.departureDate, now),
      departureCity: nearestDeparture.departureCity || null,
      promoLabel:
        price.kind === 'verified' && lowestPriceDeparture?.promoLabel
          ? lowestPriceDeparture.promoLabel
          : null,
    },
    price,
    slug: product.slug,
    summary: product.summary || '',
    title: product.title,
  }
}

const compareCards = (
  left: WingsGoCatalogCard,
  right: WingsGoCatalogCard,
  sort: WingsGoCatalogSort,
) => {
  if (sort === 'price') {
    const leftPrice = left.price.kind === 'verified' ? left.price.value : Number.MAX_SAFE_INTEGER
    const rightPrice = right.price.kind === 'verified' ? right.price.value : Number.MAX_SAFE_INTEGER
    if (leftPrice !== rightPrice) return leftPrice - rightPrice
  }

  if (sort === 'title') {
    const titleDelta = left.title.localeCompare(right.title, 'vi')
    if (titleDelta !== 0) return titleDelta
  }

  const dateDelta =
    new Date(left.nextDeparture.date).getTime() - new Date(right.nextDeparture.date).getTime()
  if (dateDelta !== 0) return dateDelta
  const titleDelta = left.title.localeCompare(right.title, 'vi')
  if (titleDelta !== 0) return titleDelta
  return String(left.id).localeCompare(String(right.id), 'en')
}

export const buildCatalogCursorContext = ({
  filters,
  locale,
  siteID,
}: {
  filters?: WingsGoCatalogFilters
  locale: string
  siteID: number | string
}): string => {
  const sort = filters?.sort || 'next-departure'
  const filterParts: string[] = []
  if (filters) {
    const keys: Array<keyof WingsGoCatalogFilters> = [
      'departureMonth',
      'durationMax',
      'durationMin',
      'market',
      'priceMax',
      'priceMin',
      'season',
    ]
    for (const key of keys) {
      const val = filters[key]
      if (val !== undefined && val !== null && val !== '') {
        filterParts.push(`${key}=${val}`)
      }
    }
  }
  const canonicalFilters = filterParts.join('&')
  const canonical = `${siteID}|${locale}|${sort}|${canonicalFilters}`
  return (fnv1a32(canonical) >>> 0).toString(16)
}

export const encodeCatalogCursor = (
  card: WingsGoCatalogCard,
  {
    ctx,
    featuredIDs = [],
    filtersActive = false,
    sort = 'next-departure',
  }: {
    ctx: string
    featuredIDs?: Array<number | string>
    filtersActive?: boolean
    sort?: WingsGoCatalogSort
  },
): string => {
  const x = filtersActive
    ? []
    : featuredIDs
        .slice(0, 6)
        .map(String)
        .filter((id) => /^[A-Za-z0-9_-]{1,64}$/.test(id))

  const payload: CatalogCursorPayload = {
    ctx,
    date: card.nextDeparture.date,
    id: card.id,
    price: card.price.kind === 'verified' ? card.price.value : null,
    sort,
    title: card.title,
    v: 2,
    x,
  }
  const json = JSON.stringify(payload)
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(json, 'utf8').toString('base64url')
  }
  return btoa(unescape(encodeURIComponent(json)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

export const decodeCatalogCursor = (value: unknown): CatalogCursorPayload | null => {
  if (typeof value !== 'string') return null
  if (!value || value.length > 1024) return null
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null
  try {
    let json: string
    if (typeof Buffer !== 'undefined') {
      json = Buffer.from(value, 'base64url').toString('utf8')
    } else {
      let base64 = value.replace(/-/g, '+').replace(/_/g, '/')
      while (base64.length % 4) base64 += '='
      json = decodeURIComponent(escape(atob(base64)))
    }
    const parsed = JSON.parse(json)
    if (
      parsed &&
      typeof parsed === 'object' &&
      parsed.v === 2 &&
      typeof parsed.ctx === 'string' &&
      parsed.ctx.length <= 16 &&
      (parsed.sort === 'next-departure' || parsed.sort === 'price' || parsed.sort === 'title') &&
      typeof parsed.date === 'string' &&
      (typeof parsed.price === 'number' || parsed.price === null) &&
      typeof parsed.title === 'string' &&
      (typeof parsed.id === 'string' || typeof parsed.id === 'number') &&
      Array.isArray(parsed.x) &&
      parsed.x.length <= 6 &&
      parsed.x.every(
        (item: unknown) => typeof item === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(item),
      )
    ) {
      return parsed as CatalogCursorPayload
    }
    return null
  } catch {
    return null
  }
}

const createCursorStubCard = (after: CatalogCursorPayload): WingsGoCatalogCard => ({
  duration: { days: 0, nights: 0 },
  href: '',
  id: after.id,
  image: null,
  market: 'other',
  nextDeparture: {
    airline: null,
    date: after.date,
    daysUntilDeparture: null,
    departureCity: null,
  },
  price:
    after.price !== null
      ? { currency: 'VND', kind: 'verified', originalPrice: null, value: after.price }
      : { kind: 'contact', label: '' },
  slug: '',
  summary: '',
  title: after.title,
})

export const selectWingsGoCatalogCards = ({
  after,
  cards,
  excludeIDs = [],
  filters = {},
  limit = WINGSGO_CATALOG_BATCH_SIZE,
  offset = 0,
}: {
  after?: CatalogCursorPayload | null
  cards: WingsGoCatalogCard[]
  excludeIDs?: Array<number | string>
  filters?: WingsGoCatalogFilters
  limit?: number
  offset?: number
}) => {
  const boundedLimit = Math.min(Math.max(limit, 0), WINGSGO_CATALOG_BATCH_SIZE)
  const excluded = new Set(excludeIDs.map(String))
  const filtered = cards
    .filter((card) => !excluded.has(String(card.id)))
    .filter((card) => !filters.market || card.market === filters.market)
    .filter(
      (card) => filters.durationMin === undefined || card.duration.days >= filters.durationMin,
    )
    .filter(
      (card) => filters.durationMax === undefined || card.duration.days <= filters.durationMax,
    )
    .filter((card) => {
      const price = card.price.kind === 'verified' ? card.price.value : null
      return filters.priceMin === undefined || (price !== null && price >= filters.priceMin)
    })
    .filter((card) => {
      const price = card.price.kind === 'verified' ? card.price.value : null
      return filters.priceMax === undefined || (price !== null && price <= filters.priceMax)
    })

  const seenIDs = new Set<string>()
  const deduped = filtered.filter((card) => {
    const key = String(card.id)
    if (seenIDs.has(key)) return false
    seenIDs.add(key)
    return true
  })

  const sort = filters.sort || 'next-departure'
  deduped.sort((left, right) => compareCards(left, right, sort))

  if (after) {
    if (after.sort === sort) {
      const stub = createCursorStubCard(after)
      const afterCards = deduped.filter((card) => compareCards(card, stub, sort) > 0)
      return {
        cards: afterCards.slice(0, boundedLimit),
        hasMore: afterCards.length > boundedLimit,
        total: deduped.length,
      }
    }
    return {
      cards: deduped.slice(0, boundedLimit),
      hasMore: boundedLimit < deduped.length,
      total: deduped.length,
    }
  }

  return {
    cards: deduped.slice(offset, offset + boundedLimit),
    hasMore: offset + boundedLimit < deduped.length,
    total: deduped.length,
  }
}

const readSearchParam = (source: SearchParamSource, key: string) => {
  if (source instanceof URLSearchParams) return source.get(key) || undefined
  const value = source[key]
  return Array.isArray(value) ? value[0] : value
}

const parsePositiveNumber = (value?: string) => {
  if (!value || !/^\d+(?:\.\d+)?$/u.test(value)) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined
}

export const parseWingsGoCatalogFilters = (
  source: SearchParamSource,
  now: Date = new Date(),
): WingsGoCatalogFilters => {
  const sort = readSearchParam(source, 'sort')
  const durationMin = parsePositiveNumber(readSearchParam(source, 'durationMin'))
  const durationMax = parsePositiveNumber(readSearchParam(source, 'durationMax'))
  const priceMin = parsePositiveNumber(readSearchParam(source, 'priceMin'))
  const priceMax = parsePositiveNumber(readSearchParam(source, 'priceMax'))

  const rawMarket = readSearchParam(source, 'market')
  const market =
    rawMarket && (WINGSGO_CATALOG_MARKETS as readonly string[]).includes(rawMarket)
      ? rawMarket
      : undefined

  const rawDepartureMonth = readSearchParam(source, 'departureMonth')
  let departureMonth: string | undefined
  if (rawDepartureMonth && /^\d{4}-(?:0[1-9]|1[0-2])$/.test(rawDepartureMonth)) {
    const currentMonth = businessCalendarMonth(now)
    if (currentMonth) {
      const [currY, currM] = currentMonth.split('-').map(Number)
      const [targetY, targetM] = rawDepartureMonth.split('-').map(Number)
      const diff = (targetY - currY) * 12 + (targetM - currM)
      if (diff >= 0 && diff <= 24) {
        departureMonth = rawDepartureMonth
      }
    }
  }

  const rawSeason = readSearchParam(source, 'season')
  const season = isBusinessSeason(rawSeason) ? rawSeason : undefined

  return {
    ...(market ? { market } : {}),
    ...(durationMin === undefined ? {} : { durationMin }),
    ...(durationMax === undefined ? {} : { durationMax }),
    ...(priceMin === undefined ? {} : { priceMin }),
    ...(priceMax === undefined ? {} : { priceMax }),
    ...(departureMonth ? { departureMonth } : {}),
    ...(season ? { season } : {}),
    ...(sort === 'next-departure' || sort === 'price' || sort === 'title' ? { sort } : {}),
  }
}

const selectDeterministicMarketImage = ({
  cardsInMarket,
  featuredSlot1ID,
  market,
  now,
  siteID,
}: {
  cardsInMarket: WingsGoCatalogCard[]
  featuredSlot1ID?: number | string | null
  market: string
  now: Date
  siteID: number | string
}): { alt: string; url: string } | null => {
  const cardsWithImage = cardsInMarket.filter(
    (card): card is WingsGoCatalogCard & { image: { alt: string; url: string } } =>
      Boolean(card.image),
  )
  if (cardsWithImage.length === 0) return null
  if (cardsWithImage.length === 1) return cardsWithImage[0].image

  const nonFeatured = featuredSlot1ID
    ? cardsWithImage.filter((card) => String(card.id) !== String(featuredSlot1ID))
    : cardsWithImage
  const candidates = [...(nonFeatured.length > 0 ? nonFeatured : cardsWithImage)]
  candidates.sort((left, right) => {
    const idDiff = String(left.id).localeCompare(String(right.id), 'en')
    if (idDiff !== 0) return idDiff
    return String(left.image.url).localeCompare(String(right.image.url), 'en')
  })

  const calendarDay = toBusinessCalendarDay(now) || ''
  const seed = `${siteID}|${market}|${calendarDay}`
  const index = fnv1a32(seed) % candidates.length
  return candidates[index].image
}

const queryDocs = async (
  payload: Payload,
  collection: 'pages' | 'tour-departures' | 'tour-products',
  where: unknown,
  locale?: string,
) =>
  payload.find({
    collection,
    depth: 2,
    draft: false,
    ...(locale ? { fallbackLocale: locale === 'en' ? false : 'vi', locale: locale as never } : {}),
    limit: WINGSGO_CATALOG_MAX_INVENTORY,
    overrideAccess: true,
    pagination: false,
    where: where as never,
  })

export const queryWingsGoTourCatalog = async ({
  cursor,
  filters = {},
  limit = WINGSGO_CATALOG_BATCH_SIZE,
  locale = 'vi',
  now = new Date(),
  offset = 0,
  page,
  payload,
  site,
}: {
  cursor?: string | null
  filters?: WingsGoCatalogFilters
  limit?: number
  locale?: string
  now?: Date
  offset?: number
  page: WingsGoCatalogPage
  payload: Payload
  site: { code: string; id: number | string }
}): Promise<WingsGoCatalogData> => {
  const emptyCatalog: WingsGoCatalogData = {
    all: [],
    featured: [],
    filtersActive: false,
    hasMore: false,
    hero: [],
    markets: [],
    nextCursor: null,
    nextOffset: 0,
    upcoming: [],
  }

  if (site.code !== 'wings-go' || page.wingsGoTourCatalog?.enabled !== true) {
    return emptyCatalog
  }

  const checkInventoryCap = (collection: string, count: number) => {
    if (count >= WINGSGO_CATALOG_MAX_INVENTORY) {
      console.warn(
        `[wingsgo-catalog] Inventory query for collection "${collection}" reached maximum cap (${WINGSGO_CATALOG_MAX_INVENTORY}) for site ${site.id}.`,
      )
    }
  }

  const wrapperResult = await queryDocs(
    payload,
    'pages',
    {
      and: [
        { _status: { equals: 'published' } },
        { site: { equals: site.id } },
        { pathname: { like: '/tour/%' } },
      ],
    },
    locale,
  )
  checkInventoryCap('pages', wrapperResult.docs.length)
  const wrappers = (wrapperResult.docs as unknown as InventoryWrapper[]).filter((item) =>
    sameID(item.site, site.id),
  )
  const wrapperIDs = wrappers.map((wrapper) => wrapper.id)
  if (wrapperIDs.length === 0) return emptyCatalog

  const productsResult = await queryDocs(
    payload,
    'tour-products',
    {
      and: [
        { _status: { equals: 'published' } },
        { site: { equals: site.id } },
        { wrapperPage: { in: wrapperIDs } },
      ],
    },
    locale,
  )
  checkInventoryCap('tour-products', productsResult.docs.length)
  const products = (productsResult.docs as unknown as InventoryProduct[]).filter((item) =>
    sameID(item.site, site.id),
  )
  const productIDs = products.map((product) => product.id)
  if (productIDs.length === 0) return emptyCatalog

  const departuresResult = await queryDocs(
    payload,
    'tour-departures',
    {
      and: [
        { _status: { equals: 'published' } },
        { site: { equals: site.id } },
        { tourProduct: { in: productIDs } },
        { departureDate: { greater_than: now.toISOString() } },
      ],
    },
    locale,
  )
  checkInventoryCap('tour-departures', departuresResult.docs.length)
  const departures = (departuresResult.docs as unknown as InventoryDeparture[]).filter((item) =>
    sameID(item.site, site.id),
  )
  const wrappersByID = new Map(wrappers.map((wrapper) => [String(wrapper.id), wrapper]))
  const departuresByProduct = new Map<string, InventoryDeparture[]>()
  for (const departure of departures) {
    const productID = relationID(departure.tourProduct)
    if (productID === null) continue
    const current = departuresByProduct.get(String(productID)) || []
    current.push(departure)
    departuresByProduct.set(String(productID), current)
  }

  const unfilteredCards = products
    .map((product) =>
      buildCard({
        departures: departuresByProduct.get(String(product.id)) || [],
        locale,
        now,
        product,
        wrapper: wrappersByID.get(String(relationID(product.wrapperPage))) || null,
      }),
    )
    .filter((card): card is WingsGoCatalogCard => Boolean(card))

  const hasWindow = Boolean(filters.departureMonth || filters.season)
  const windowCards = hasWindow
    ? products
        .map((product) =>
          buildCard({
            departures: departuresByProduct.get(String(product.id)) || [],
            locale,
            now,
            product,
            window: {
              departureMonth: filters.departureMonth,
              season: filters.season,
            },
            wrapper: wrappersByID.get(String(relationID(product.wrapperPage))) || null,
          }),
        )
        .filter((card): card is WingsGoCatalogCard => Boolean(card))
    : unfilteredCards

  const configuredIDs = await resolveCuratedTourIDs({
    page,
    payload,
    siteID: site.id,
  })
  const configuredFeatured: WingsGoCatalogCard[] = []
  const configuredSeenIDs = new Set<string>()
  for (const id of configuredIDs) {
    const key = String(id)
    if (configuredSeenIDs.has(key)) continue
    const card = unfilteredCards.find((candidate) => String(candidate.id) === key)
    if (card) {
      configuredSeenIDs.add(key)
      configuredFeatured.push(card)
    }
  }
  const fallback = selectWingsGoCatalogCards({
    cards: unfilteredCards,
    excludeIDs: configuredFeatured.map((card) => card.id),
    filters: {},
  }).cards
  const featured = [...configuredFeatured, ...fallback].slice(0, WINGSGO_CATALOG_MAX_FEATURED)
  const featuredIDs = featured.map((card) => card.id)

  const currentCtx = buildCatalogCursorContext({
    filters,
    locale,
    siteID: site.id,
  })
  const decodedCursor = cursor ? decodeCatalogCursor(cursor) : null
  const validCursor =
    decodedCursor && decodedCursor.ctx === currentCtx ? decodedCursor : null
  const hasValidCursor = Boolean(validCursor)
  const filtersActive = hasActiveCatalogFilters(filters)

  let excludeIDsFromFeatured: Array<number | string> = []
  if (hasValidCursor && !filtersActive) {
    excludeIDsFromFeatured = validCursor!.x
  } else if (!filtersActive) {
    excludeIDsFromFeatured = featuredIDs
  } else {
    excludeIDsFromFeatured = []
  }

  const effectiveOffset = cursor ? 0 : offset

  const all = selectWingsGoCatalogCards({
    after: validCursor,
    cards: windowCards,
    excludeIDs: excludeIDsFromFeatured,
    filters,
    limit,
    offset: effectiveOffset,
  })

  const lastCard = all.cards[all.cards.length - 1]
  const effectiveSort = filters.sort || 'next-departure'
  const nextCursor =
    all.hasMore && lastCard
      ? encodeCatalogCursor(lastCard, {
          ctx: currentCtx,
          // Carry the featured IDs rendered with page 1, not the current ones.
          featuredIDs: validCursor ? validCursor.x : featuredIDs,
          filtersActive,
          sort: effectiveSort,
        })
      : null

  // Market summaries from unfilteredCards
  const marketMap = new Map<string, WingsGoCatalogCard[]>()
  for (const card of unfilteredCards) {
    const m = card.market || 'other'
    const list = marketMap.get(m) || []
    list.push(card)
    marketMap.set(m, list)
  }

  const featuredSlot1ID = featured[0]?.id || null

  const markets: WingsGoCatalogMarketSummary[] = Array.from(marketMap.entries())
    .filter(([, cardsInMarket]) => cardsInMarket.length > 0)
    .map(([marketName, cardsInMarket]) => {
      const verifiedCards = cardsInMarket.filter(
        (card): card is WingsGoCatalogCard & { price: { kind: 'verified'; value: number } } =>
          card.price.kind === 'verified',
      )
      let lowestPriceCard: (typeof verifiedCards)[0] | null = null
      for (const card of verifiedCards) {
        if (!lowestPriceCard || card.price.value < lowestPriceCard.price.value) {
          lowestPriceCard = card
        }
      }

      return {
        count: cardsInMarket.length,
        image: selectDeterministicMarketImage({
          cardsInMarket,
          featuredSlot1ID,
          market: marketName,
          now,
          siteID: site.id,
        }),
        lowestPrice: lowestPriceCard ? lowestPriceCard.price : null,
        market: marketName,
      }
    })
    .sort((left, right) => {
      if (left.count !== right.count) return right.count - left.count
      return left.market.localeCompare(right.market, 'en')
    })

  const featuredIdSet = new Set(featured.map((card) => String(card.id)))
  const upcoming = filtersActive
    ? []
    : [...unfilteredCards]
        .filter(
          (card) =>
            !featuredIdSet.has(String(card.id)) &&
            Boolean(card.nextDeparture && card.nextDeparture.date),
        )
        .sort((left, right) => compareCards(left, right, 'next-departure'))
        .slice(0, 6)

  return {
    all: all.cards,
    featured,
    filtersActive,
    hasMore: all.hasMore,
    hero: filtersActive ? [] : featured.slice(0, 3),
    markets,
    nextCursor,
    nextOffset: effectiveOffset + all.cards.length,
    upcoming,
  }
}

export const resolveCuratedTourIDs = async ({
  page,
  payload,
  siteID,
}: {
  page?: WingsGoCatalogPage | null
  payload: Payload
  siteID: number | string
}): Promise<Array<number | string>> => {
  // Tier 1: Page-bound curation
  const pageCurationRef = page?.wingsGoTourCatalog?.curation
  if (pageCurationRef) {
    if (
      typeof pageCurationRef === 'object' &&
      pageCurationRef !== null &&
      'featuredTours' in pageCurationRef &&
      Array.isArray((pageCurationRef as { featuredTours?: unknown }).featuredTours)
    ) {
      const pageCurationSite = relationID((pageCurationRef as { site?: Relation }).site)
      // Tier 1 hardening: strictly require site to be present AND match siteID
      if (pageCurationSite !== null && String(pageCurationSite) === String(siteID)) {
        const ids = relationIDs((pageCurationRef as { featuredTours?: unknown }).featuredTours)
        if (ids.length > 0) return ids
      }
    }
    const curationID = relationID(pageCurationRef as Relation)
    if (curationID) {
      try {
        const curationDoc = await payload.findByID({
          collection: 'tour-curations',
          depth: 0,
          id: curationID,
          overrideAccess: true,
        })
        if (curationDoc) {
          const curationSite = relationID((curationDoc as { site?: Relation }).site)
          // Tier 1 hardening: strictly require site to be present AND match siteID
          if (curationSite !== null && String(curationSite) === String(siteID)) {
            const ids = relationIDs((curationDoc as { featuredTours?: unknown }).featuredTours)
            if (ids.length > 0) return ids
          }
        }
      } catch {
        // Fallback to Tier 2
      }
    }
  }

  // Tier 2: Site default curation
  try {
    const defaultCurationResult = await payload.find({
      collection: 'tour-curations',
      depth: 0,
      limit: 1,
      overrideAccess: true,
      pagination: false,
      where: {
        and: [{ site: { equals: siteID } }, { isDefault: { equals: true } }],
      },
    })
    const defaultDoc = defaultCurationResult.docs[0]
    if (defaultDoc) {
      const ids = relationIDs((defaultDoc as { featuredTours?: unknown }).featuredTours)
      if (ids.length > 0) return ids
    }
  } catch {
    // Fallback to Tier 3
  }

  // Tier 3: Legacy featuredTours array on page
  const legacyIDs = relationIDs(page?.wingsGoTourCatalog?.featuredTours)
  if (legacyIDs.length > 0) {
    return legacyIDs
  }

  // Tier 4: Algorithmic fallback
  return []
}

export const getWingsGoFeaturedTours = async ({
  curationID,
  limit = 4,
  locale = 'vi',
  payload,
  site,
}: {
  curationID?: number | string
  limit?: number
  locale?: string
  payload: Payload
  site: { code: string; id: number | string }
}): Promise<WingsGoCatalogCard[]> => {
  const catalogPageResult = await payload.find({
    collection: 'pages',
    depth: 0,
    draft: false,
    fallbackLocale: locale === 'en' ? false : 'vi',
    limit: 1,
    locale: locale as never,
    overrideAccess: true,
    pagination: false,
    where: {
      and: [
        { _status: { equals: 'published' } },
        { pathname: { equals: '/tour' } },
        { site: { equals: site.id } },
      ],
    },
  })
  const catalogPage = catalogPageResult.docs[0] as unknown as WingsGoCatalogPage | undefined
  const effectivePage: WingsGoCatalogPage = catalogPage
    ? {
        ...catalogPage,
        wingsGoTourCatalog: {
          ...catalogPage.wingsGoTourCatalog,
          enabled: true,
          ...(curationID !== undefined ? { curation: curationID } : {}),
        },
      }
    : {
        id: 0,
        pathname: '/tour',
        site: site.id,
        wingsGoTourCatalog: {
          enabled: true,
          curation: curationID,
        },
      }

  const catalog = await queryWingsGoTourCatalog({
    limit,
    locale,
    page: effectivePage,
    payload,
    site,
  })
  if (!catalog) return []

  return catalog.featured.slice(0, limit)
}
