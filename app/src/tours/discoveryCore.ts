import { isSupportedLocale } from '@/utilities/locales'

import {
  normalizeTourDestinationKeys,
  normalizeTourTravelStyleKeys,
  type TourDestinationKey,
  type TourTravelStyleKey,
} from './taxonomy'
import { normalizeSupportedTourCurrency, type SupportedTourCurrencyCode } from './currency'
import { sanitizeWingSidePublicText } from './wingsSideTourViewModel'

export const discoveryDurationCodes = ['1-7', '8-14', '15-plus'] as const
export type DiscoveryDurationCode = (typeof discoveryDurationCodes)[number]

export type DiscoveryQuery = {
  destination?: TourDestinationKey
  duration?: DiscoveryDurationCode
  q?: string
  style?: TourTravelStyleKey
  type?: DiscoveryTourType
  unknownValueCount: number
}

export const discoveryTourTypes = ['group', 'private'] as const
export type DiscoveryTourType = (typeof discoveryTourTypes)[number]
export type DiscoveryFilterKey = 'destination' | 'duration' | 'style' | 'type'

export type DiscoverySEO = {
  canonicalPath: '/journeys'
  robots: 'index,follow' | 'noindex,follow'
}

export type DiscoveryTourCard = {
  commerce?: { availability: string; canBook: boolean; departureDate: string; price: DiscoveryTourPriceState }
  currency: string | null
  destinationTags: TourDestinationKey[]
  duration: { days: number; nights: number | null }
  hero: { alt: string; url: string }
  href: string
  id: number | string
  price: DiscoveryTourPriceState
  priceFrom: number | null
  routeLabel?: string | null
  /** Locale-resolved searchable text; never displayed directly. */
  searchText?: string
  slug: string
  summary: string
  title: string
  tourType?: DiscoveryTourType
  travelStyles: TourTravelStyleKey[]
}

export type DiscoveryTourPriceState =
  | { currency: SupportedTourCurrencyCode; kind: 'from'; value: number }
  | { kind: 'on-request' }

export type DiscoveryResult = {
  appliedQuery: Omit<DiscoveryQuery, 'unknownValueCount'>
  items: DiscoveryTourCard[]
  relaxed: null | {
    removed: DiscoveryFilterKey
    query: Omit<DiscoveryQuery, 'unknownValueCount'>
  }
  total: number
  unknownValueCount: number
}

export type DiscoveryContext = {
  query: DiscoveryQuery
  result: DiscoveryResult
  seo: DiscoverySEO
}

export type RelationID = number | string
export type Relation = RelationID | { id?: RelationID | null } | null | undefined
export type DiscoveryPage = {
  _status?: null | string
  id?: RelationID | null
  pathname?: null | string
  site?: Relation
  slug?: null | string
}
export type DiscoveryMedia = {
  alt?: null | string
  site?: Relation
  url?: null | string
}
export type DiscoveryTourDoc = {
  activeDepartures?: Array<DiscoveryDepartureDoc> | null
  _status?: null | string
  destinationTags?: null | string[]
  durationDays?: null | number
  durationNights?: null | number
  heroMedia?: DiscoveryMedia | Relation
  id?: RelationID
  currency?: null | string
  priceFrom?: null | number
  routeLabel?: null | string
  primaryCTA?: { mode?: null | string } | null
  site?: Relation
  slug?: null | string
  summary?: null | string
  title?: null | string
  tourType?: null | string
  travelStyles?: null | string[]
  wrapperPage?: DiscoveryPage | Relation
}

export type DiscoveryWhere = {
  [key: string]: unknown
  and?: DiscoveryWhere[]
}

const scalarParamOrder = ['q', 'type', 'destination', 'style', 'duration'] as const

export const normalizeDiscoverySearch = (value: unknown): string | undefined => {
  const normalized = String(value || '').normalize('NFKC').replace(/\s+/gu, ' ').trim()
  return normalized ? Array.from(normalized).slice(0, 80).join('') : undefined
}
export type DiscoveryDepartureDoc = {
  availabilityBadge?: null | string
  availabilityStatus?: null | string
  currency?: null | string
  departureDate?: null | string
  priceBasis?: null | string
  priceFrom?: null | number
  site?: Relation
  tourProduct?: Relation
}

const isDiscoveryTourType = (value: string): value is DiscoveryTourType =>
  discoveryTourTypes.includes(value as DiscoveryTourType)

const relationID = (value: Relation): RelationID | null => {
  if (typeof value === 'number' || typeof value === 'string') return value
  if (value && (typeof value.id === 'number' || typeof value.id === 'string')) return value.id
  return null
}

const sameRelation = (left: Relation, right: Relation): boolean => {
  const leftID = relationID(left)
  const rightID = relationID(right)
  return leftID != null && rightID != null && String(leftID) === String(rightID)
}

const nonEmpty = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0

const projectPriceState = (tour: DiscoveryTourDoc): DiscoveryTourPriceState => {
  const currency = normalizeSupportedTourCurrency(tour.currency)
  if (
    typeof tour.priceFrom === 'number' &&
    Number.isFinite(tour.priceFrom) &&
    tour.priceFrom > 0 &&
    currency
  ) {
    return { currency, kind: 'from', value: tour.priceFrom }
  }

  return { kind: 'on-request' }
}

const projectGroupCommerce = (tour: DiscoveryTourDoc): DiscoveryTourCard['commerce'] | undefined => {
  if (tour.tourType !== 'group' || !Array.isArray(tour.activeDepartures)) return undefined
  const now = Date.now()
  const candidate = tour.activeDepartures
    .filter((departure) => {
      const date = Date.parse(departure.departureDate || '')
      return date > now && departure.priceBasis === 'per-person' &&
        (departure.availabilityStatus === 'open' || departure.availabilityStatus === 'limited') &&
        sameRelation(departure.site, tour.site)
    })
    .sort((a, b) => Date.parse(a.departureDate || '') - Date.parse(b.departureDate || ''))[0]
  if (!candidate) return undefined
  const currency = normalizeSupportedTourCurrency(candidate.currency)
  if (!currency || typeof candidate.priceFrom !== 'number' || !Number.isFinite(candidate.priceFrom) || candidate.priceFrom <= 0) return undefined
  const canBook = tour.primaryCTA?.mode === 'hold-seat'
  return {
    availability: candidate.availabilityBadge?.trim() || candidate.availabilityStatus || 'Open',
    canBook,
    departureDate: candidate.departureDate!,
    price: { currency, kind: 'from', value: candidate.priceFrom },
  }
}

const asPage = (value: DiscoveryTourDoc['wrapperPage']): DiscoveryPage | null =>
  value && typeof value === 'object' && ('pathname' in value || 'slug' in value) ? value : null

const asMedia = (value: DiscoveryTourDoc['heroMedia']): DiscoveryMedia | null =>
  value && typeof value === 'object' && 'url' in value ? value : null

const isKnownDestination = (value: string): value is TourDestinationKey => {
  try {
    normalizeTourDestinationKeys([value as TourDestinationKey])
    return true
  } catch {
    return false
  }
}

const isKnownStyle = (value: string): value is TourTravelStyleKey => {
  try {
    normalizeTourTravelStyleKeys([value as TourTravelStyleKey])
    return true
  } catch {
    return false
  }
}

export const isDiscoveryDurationCode = (value: string): value is DiscoveryDurationCode =>
  discoveryDurationCodes.includes(value as DiscoveryDurationCode)

const inputToSearchParams = (
  input?: URLSearchParams | Record<string, string | string[] | null | undefined>,
): URLSearchParams => {
  if (!input) return new URLSearchParams()
  if (input instanceof URLSearchParams) return input
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(input)) {
    if (Array.isArray(value)) {
      value.forEach((item) => params.append(key, item))
    } else if (value != null) {
      params.append(key, value)
    }
  }
  return params
}

export const normalizeDiscoveryQuery = (
  input?: URLSearchParams | Record<string, string | string[] | null | undefined>,
): DiscoveryQuery => {
  const params = inputToSearchParams(input)
  const query: DiscoveryQuery = { unknownValueCount: 0 }

  const normalizeScalar = <T extends string>({
    assign,
    isKnown,
    key,
  }: {
    assign: (value: T) => void
    isKnown: (value: string) => value is T
    key: (typeof scalarParamOrder)[number]
  }) => {
    let accepted = false
    for (const rawValue of params.getAll(key)) {
      const value = rawValue.trim()
      if (!accepted && isKnown(value)) {
        assign(value)
        accepted = true
      } else {
        query.unknownValueCount += 1
      }
    }
  }

  normalizeScalar({
    assign: (type) => {
      query.type = type
    },
    isKnown: isDiscoveryTourType,
    key: 'type',
  })
  const qValues = params.getAll('q')
  if (qValues.length) {
    const q = normalizeDiscoverySearch(qValues[0])
    if (q) query.q = q
    query.unknownValueCount += Math.max(0, qValues.length - 1)
  }
  normalizeScalar({
    assign: (destination) => {
      query.destination = destination
    },
    isKnown: isKnownDestination,
    key: 'destination',
  })
  normalizeScalar({
    assign: (style) => {
      query.style = style
    },
    isKnown: isKnownStyle,
    key: 'style',
  })
  normalizeScalar({
    assign: (duration) => {
      query.duration = duration
    },
    isKnown: isDiscoveryDurationCode,
    key: 'duration',
  })

  return query
}

export const stripDiscoveryQueryMeta = (
  query: DiscoveryQuery,
): Omit<DiscoveryQuery, 'unknownValueCount'> => {
  const { unknownValueCount: _unknownValueCount, ...safeQuery } = query
  return safeQuery
}

export const serializeDiscoveryQuery = (
  query: Omit<DiscoveryQuery, 'unknownValueCount'>,
): string => {
  const params = new URLSearchParams()
  for (const key of scalarParamOrder) {
    const value = query[key]
    if (value) params.set(key, value)
  }
  return params.toString()
}

export const buildDiscoveryHref = (
  query: Omit<DiscoveryQuery, 'unknownValueCount'>,
  basePath = '/journeys',
): string => {
  const serialized = serializeDiscoveryQuery(query)
  return serialized ? `${basePath}?${serialized}` : basePath
}

export const isDurationMatch = (
  durationDays: unknown,
  duration: DiscoveryDurationCode | undefined,
): boolean => {
  if (!duration) return true
  if (typeof durationDays !== 'number' || !Number.isFinite(durationDays)) return false
  if (duration === '1-7') return durationDays >= 1 && durationDays <= 7
  if (duration === '8-14') return durationDays >= 8 && durationDays <= 14
  return durationDays >= 15
}

export const isDiscoveryCardMatch = (
  card: Pick<DiscoveryTourCard, 'destinationTags' | 'duration' | 'summary' | 'title' | 'tourType' | 'travelStyles'> & { routeLabel?: string | null; searchText?: string },
  query: Omit<DiscoveryQuery, 'unknownValueCount'>,
): boolean =>
  (!query.type || (card.tourType || 'private') === query.type) &&
  (!query.q || `${card.title} ${card.summary} ${card.routeLabel || ''} ${card.searchText || ''} ${card.destinationTags.join(' ')} ${card.travelStyles.join(' ')}`.normalize('NFKC').toLocaleLowerCase().includes(query.q.toLocaleLowerCase())) &&
  (!query.destination || card.destinationTags.includes(query.destination)) &&
  (!query.style || card.travelStyles.includes(query.style)) &&
  isDurationMatch(card.duration.days, query.duration)

export const buildDiscoveryRelaxationPlan = (
  query: DiscoveryQuery,
): Array<{ query: Omit<DiscoveryQuery, 'unknownValueCount'>; removed: DiscoveryFilterKey }> => {
  const cumulativeQuery = stripDiscoveryQueryMeta(query)
  const plan: Array<{
    query: Omit<DiscoveryQuery, 'unknownValueCount'>
    removed: DiscoveryFilterKey
  }> = []

  for (const removed of ['duration', 'style', 'destination'] as const) {
    if (!cumulativeQuery[removed]) continue
    delete cumulativeQuery[removed]
    plan.push({ query: { ...cumulativeQuery }, removed })
  }

  return plan
}

export const getDiscoverySEOPolicy = (
  query: Omit<DiscoveryQuery, 'unknownValueCount'> & { unknownValueCount?: number },
): DiscoverySEO => ({
  canonicalPath: '/journeys',
  robots:
    serializeDiscoveryQuery(query) || (query.unknownValueCount ?? 0) > 0
      ? 'noindex,follow'
      : 'index,follow',
})

export const buildDiscoveryWhere = (
  query: Omit<DiscoveryQuery, 'unknownValueCount'>,
): DiscoveryWhere => {
  const conditions: DiscoveryWhere[] = [
    { _status: { equals: 'published' } },
    { wrapperPage: { exists: true } },
  ]

  if (query.destination) conditions.push({ destinationTags: { in: [query.destination] } })
  if (query.type) conditions.push({ tourType: { equals: query.type } })
  if (query.style) conditions.push({ travelStyles: { in: [query.style] } })
  if (query.duration === '1-7') {
    conditions.push({ durationDays: { greater_than_equal: 1 } })
    conditions.push({ durationDays: { less_than_equal: 7 } })
  }
  if (query.duration === '8-14') {
    conditions.push({ durationDays: { greater_than_equal: 8 } })
    conditions.push({ durationDays: { less_than_equal: 14 } })
  }
  if (query.duration === '15-plus') {
    conditions.push({ durationDays: { greater_than_equal: 15 } })
  }

  return { and: conditions }
}

const normalizeCanonicalPath = (path?: null | string): string => {
  if (!path || path === 'home') return '/'
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return normalizedPath.replace(/\/+/g, '/')
}

const getPageCanonicalPath = (value?: null | string | DiscoveryPage, locale?: null | string) => {
  let path = '/'

  if (!value) return path

  if (typeof value === 'object') {
    if (value.pathname) {
      path = normalizeCanonicalPath(value.pathname)
    } else if (value.slug && value.slug !== 'home') {
      path = normalizeCanonicalPath(value.slug)
    }
  } else if (value !== 'home') {
    path = normalizeCanonicalPath(value)
  }

  if (!locale || locale === 'en' || !isSupportedLocale(locale)) return path
  return `/${locale}${path === '/' ? '' : path}`.replace(/\/+/g, '/')
}

const sortDiscoveryCards = (cards: DiscoveryTourCard[]) =>
  [...cards].sort((left, right) => {
    const durationDelta = left.duration.days - right.duration.days
    if (durationDelta !== 0) return durationDelta
    return String(left.id).localeCompare(String(right.id), 'en', { numeric: true })
  })

export const sortProjectedDiscoveryCards = sortDiscoveryCards

export const projectDiscoveryTour = ({
  locale,
  site,
  tour,
}: {
  locale?: null | string
  site: Relation
  tour: DiscoveryTourDoc
}): DiscoveryTourCard | null => {
  const id = relationID(tour.id)
  if (id == null || tour._status !== 'published') return null
  if (!sameRelation(tour.site, site)) return null
  if (!nonEmpty(tour.title) || !nonEmpty(tour.summary) || !nonEmpty(tour.slug)) return null
  if (
    typeof tour.durationDays !== 'number' ||
    !Number.isFinite(tour.durationDays) ||
    tour.durationDays < 1
  ) {
    return null
  }

  const destinationTags = Array.isArray(tour.destinationTags)
    ? tour.destinationTags.filter((value): value is TourDestinationKey => isKnownDestination(value))
    : []
  const travelStyles = Array.isArray(tour.travelStyles)
    ? tour.travelStyles.filter((value): value is TourTravelStyleKey => isKnownStyle(value))
    : []
  if (destinationTags.length === 0 || travelStyles.length === 0) return null

  const wrapperPage = asPage(tour.wrapperPage)
  if (
    !wrapperPage ||
    wrapperPage._status !== 'published' ||
    !sameRelation(wrapperPage.site, site)
  ) {
    return null
  }

  const heroMedia = asMedia(tour.heroMedia)
  if (!heroMedia || !nonEmpty(heroMedia.url) || !nonEmpty(heroMedia.alt)) return null
  if (relationID(heroMedia.site as Relation) != null && !sameRelation(heroMedia.site, site))
    return null

  // Product-level `priceFrom` is never a per-person claim. Only a verified
  // departure with explicit `per-person` basis may become public commerce.
  const price: DiscoveryTourPriceState = { kind: 'on-request' }
  const publicSummary = sanitizeWingSidePublicText(tour.summary)
  const publicTitle = sanitizeWingSidePublicText(tour.title)
  if (!publicSummary || !publicTitle) return null

  return {
    ...(projectGroupCommerce(tour) ? { commerce: projectGroupCommerce(tour) } : {}),
    currency: normalizeSupportedTourCurrency(tour.currency),
    destinationTags: normalizeTourDestinationKeys(destinationTags),
    duration: {
      days: tour.durationDays,
      nights:
        typeof tour.durationNights === 'number' &&
        Number.isFinite(tour.durationNights) &&
        tour.durationNights >= 0
          ? tour.durationNights
          : null,
    },
    hero: {
      alt: heroMedia.alt.trim(),
      url: heroMedia.url.trim(),
    },
    href: getPageCanonicalPath(wrapperPage, locale),
    id,
    price,
    priceFrom: null,
    routeLabel: nonEmpty(tour.routeLabel) ? sanitizeWingSidePublicText(tour.routeLabel) || null : null,
    slug: tour.slug.trim(),
    summary: publicSummary,
    title: publicTitle,
    tourType: tour.tourType === 'group' ? 'group' : 'private',
    travelStyles: normalizeTourTravelStyleKeys(travelStyles),
  }
}
