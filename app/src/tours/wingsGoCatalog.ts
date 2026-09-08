import type { Payload } from 'payload'

import { isDepartureVerificationCurrent } from './departureCommerce'
import { getTourProductPath } from '@/utilities/siteURLs'

export const WINGSGO_CATALOG_BATCH_SIZE = 6
export const WINGSGO_CATALOG_MAX_FEATURED = 6

export type WingsGoCatalogSort = 'next-departure' | 'price' | 'title'

export type WingsGoCatalogFilters = {
  market?: string
  durationMax?: number
  durationMin?: number
  priceMax?: number
  priceMin?: number
  sort?: WingsGoCatalogSort
}

export type WingsGoCatalogPage = {
  id: number | string
  pathname?: null | string
  site: number | string | { code?: null | string; id: number | string }
  wingsGoTourCatalog?: {
    enabled?: boolean | null
    featuredTours?: Array<number | string | { id?: number | string | null }> | null
  } | null
}

export type WingsGoCatalogCard = {
  duration: { days: number; nights: number }
  id: number | string
  image: { alt: string; url: string } | null
  market: string
  nextDeparture: {
    airline: string | null
    date: string
    departureCity: string | null
  }
  price: { currency: string; kind: 'verified'; value: number } | { kind: 'contact'; label: string }
  slug: string
  summary: string
  title: string
  href: string
}

export type WingsGoCatalogData = {
  all: WingsGoCatalogCard[]
  featured: WingsGoCatalogCard[]
  hasMore: boolean
  nextOffset: number
}

type Relation = number | string | { id?: number | string | null } | null | undefined
type InventoryProduct = {
  _status?: null | string
  durationDays?: number | null
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
  departureCity?: null | string
  departureDate?: null | string
  expiresAt?: null | string
  id: number | string
  priceFrom?: null | number
  tourProduct?: Relation
  verifiedAt?: null | string
  site?: Relation
}

type SearchParamSource = URLSearchParams | Record<string, string | string[] | undefined>

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

const mediaDTO = (value: unknown, fallbackAlt: string) => {
  if (!value || typeof value !== 'object') return null
  const media = value as { alt?: null | string; url?: null | string }
  return media.url ? { alt: media.alt?.trim() || fallbackAlt, url: media.url } : null
}

const firstMedia = (product: InventoryProduct) => {
  const hero = mediaDTO(product.heroMedia, product.title || 'Tour WingsGo')
  if (hero) return hero
  const gallery = Array.isArray(product.gallery) ? product.gallery : []
  return mediaDTO(gallery[0], product.title || 'Tour WingsGo')
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
  now,
  product,
  wrapper,
}: {
  departures: InventoryDeparture[]
  now: Date
  product: InventoryProduct
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

  const futureDepartures = sortDepartures(departures).filter((departure) => {
    const date = validDate(departure.departureDate)
    return (
      departure._status === 'published' &&
      sameID(departure.tourProduct, product.id) &&
      date !== null &&
      new Date(date).getTime() > now.getTime()
    )
  })
  const nextDeparture = futureDepartures[0]
  if (!nextDeparture?.departureDate) return null

  const verifiedPrice = futureDepartures
    .filter((departure) => isDepartureVerificationCurrent(departure))
    .find((departure) => typeof departure.priceFrom === 'number' && departure.priceFrom > 0)
  const price = verifiedPrice
    ? {
        currency: verifiedPrice.currency || 'VND',
        kind: 'verified' as const,
        value: verifiedPrice.priceFrom!,
      }
    : { kind: 'contact' as const, label: 'Liên hệ để nhận giá mới nhất' }

  return {
    duration: {
      days: Number(product.durationDays || 0),
      nights: Number(product.durationNights || 0),
    },
    href: getTourProductPath(product.slug),
    id: product.id,
    image: firstMedia(product),
    market: product.market || 'other',
    nextDeparture: {
      airline: nextDeparture.airline || null,
      date: nextDeparture.departureDate,
      departureCity: nextDeparture.departureCity || null,
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

export const selectWingsGoCatalogCards = ({
  cards,
  excludeIDs = [],
  filters = {},
  limit = WINGSGO_CATALOG_BATCH_SIZE,
  offset = 0,
}: {
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
  deduped.sort((left, right) => compareCards(left, right, filters.sort || 'next-departure'))

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

export const parseWingsGoCatalogFilters = (source: SearchParamSource): WingsGoCatalogFilters => {
  const sort = readSearchParam(source, 'sort')
  const durationMin = parsePositiveNumber(readSearchParam(source, 'durationMin'))
  const durationMax = parsePositiveNumber(readSearchParam(source, 'durationMax'))
  const priceMin = parsePositiveNumber(readSearchParam(source, 'priceMin'))
  const priceMax = parsePositiveNumber(readSearchParam(source, 'priceMax'))

  return {
    ...(readSearchParam(source, 'market') ? { market: readSearchParam(source, 'market') } : {}),
    ...(durationMin === undefined ? {} : { durationMin }),
    ...(durationMax === undefined ? {} : { durationMax }),
    ...(priceMin === undefined ? {} : { priceMin }),
    ...(priceMax === undefined ? {} : { priceMax }),
    ...(sort === 'next-departure' || sort === 'price' || sort === 'title' ? { sort } : {}),
  }
}

const queryDocs = async (
  payload: Payload,
  collection: 'pages' | 'tour-departures' | 'tour-products',
  where: unknown,
) =>
  payload.find({
    collection,
    depth: 2,
    draft: false,
    limit: 1000,
    overrideAccess: true,
    pagination: false,
    where: where as never,
  })

export const queryWingsGoTourCatalog = async ({
  filters = {},
  limit = WINGSGO_CATALOG_BATCH_SIZE,
  now = new Date(),
  offset = 0,
  page,
  payload,
  site,
}: {
  filters?: WingsGoCatalogFilters
  limit?: number
  now?: Date
  offset?: number
  page: WingsGoCatalogPage
  payload: Payload
  site: { code: string; id: number | string }
}): Promise<WingsGoCatalogData> => {
  if (site.code !== 'wings-go' || page.pathname !== '/tour' || !page.wingsGoTourCatalog?.enabled) {
    return { all: [], featured: [], hasMore: false, nextOffset: 0 }
  }

  const wrapperResult = await queryDocs(payload, 'pages', {
    and: [
      { _status: { equals: 'published' } },
      { site: { equals: site.id } },
      { pathname: { like: '/tour/%' } },
    ],
  })
  const wrappers = wrapperResult.docs as unknown as InventoryWrapper[]
  const wrapperIDs = wrappers.map((wrapper) => wrapper.id)
  if (wrapperIDs.length === 0) return { all: [], featured: [], hasMore: false, nextOffset: 0 }

  const productsResult = await queryDocs(payload, 'tour-products', {
    and: [
      { _status: { equals: 'published' } },
      { site: { equals: site.id } },
      { wrapperPage: { in: wrapperIDs } },
    ],
  })
  const products = productsResult.docs as unknown as InventoryProduct[]
  const productIDs = products.map((product) => product.id)
  if (productIDs.length === 0) return { all: [], featured: [], hasMore: false, nextOffset: 0 }

  const departuresResult = await queryDocs(payload, 'tour-departures', {
    and: [
      { _status: { equals: 'published' } },
      { site: { equals: site.id } },
      { tourProduct: { in: productIDs } },
      { departureDate: { greater_than: now.toISOString() } },
    ],
  })
  const departures = departuresResult.docs as unknown as InventoryDeparture[]
  const wrappersByID = new Map(wrappers.map((wrapper) => [String(wrapper.id), wrapper]))
  const departuresByProduct = new Map<string, InventoryDeparture[]>()
  for (const departure of departures) {
    const productID = relationID(departure.tourProduct)
    if (productID === null) continue
    const current = departuresByProduct.get(String(productID)) || []
    current.push(departure)
    departuresByProduct.set(String(productID), current)
  }

  const cards = products
    .map((product) =>
      buildCard({
        departures: departuresByProduct.get(String(product.id)) || [],
        now,
        product,
        wrapper: wrappersByID.get(String(relationID(product.wrapperPage))) || null,
      }),
    )
    .filter((card): card is WingsGoCatalogCard => Boolean(card))

  const configuredIDs = relationIDs(page.wingsGoTourCatalog.featuredTours)
  const configuredFeatured: WingsGoCatalogCard[] = []
  const configuredSeenIDs = new Set<string>()
  for (const id of configuredIDs) {
    const key = String(id)
    if (configuredSeenIDs.has(key)) continue
    const card = cards.find((candidate) => String(candidate.id) === key)
    if (card) {
      configuredSeenIDs.add(key)
      configuredFeatured.push(card)
    }
  }
  const fallback = selectWingsGoCatalogCards({
    cards,
    excludeIDs: configuredFeatured.map((card) => card.id),
    filters: {},
  }).cards
  const featured = [...configuredFeatured, ...fallback].slice(0, WINGSGO_CATALOG_MAX_FEATURED)
  const featuredIDs = featured.map((card) => card.id)
  const all = selectWingsGoCatalogCards({ cards, excludeIDs: featuredIDs, filters, limit, offset })

  return {
    all: all.cards,
    featured,
    hasMore: all.hasMore,
    nextOffset: offset + all.cards.length,
  }
}
