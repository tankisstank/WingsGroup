import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { appendSiteWhere, getCurrentSite } from '@/utilities/siteContext'
import type { SupportedLocaleCode } from '@/utilities/sitePaths'
import { normalizePublicMediaURL } from '@/utilities/getMediaUrl'

import {
  toBusinessCalendarDay,
  businessCalendarMonth,
  daysUntilBusinessDay,
} from './businessCalendar'
import { normalizeGovernedTourPrice } from './currency'
import { isDepartureVerificationCurrent } from './departureCommerce'
import { normalizeEditorialBadges } from './editorialBadges'
import { getWingsGoScheduleCopy } from './wingsGoScheduleCopy'
import {
  getDepartureCityCode,
  getCompactDurationLabel,
  getTourRouteTitle,
  normalizeScheduleAirline,
} from './wingsGoDisplay'
import {
  canHoldSeat,
  getPriorityMarketDeparture,
  getTourInquiryPath,
  normalizeTourPublicText,
} from './utils'
import { WINGSGO_MARKET_LABELS } from './wingsGoCatalogCopy'
import { sanitizeWingSidePublicText } from './wingsSideTourViewModel'

// ---------------------------------------------------------------------------
// Types (design.md contract)
// ---------------------------------------------------------------------------

export type ScheduleAvailability = 'open' | 'limited' | 'sold-out' | 'quote'

export type ScheduleMoney = {
  value: number
  currency: 'VND' | 'USD'
  original: number | null
}

export type WingsGoScheduleTour = {
  id: string
  slug: string
  href: string
  title: string
  routeTitle: string
  market: string | null
  durationLabel: string | null
  media: { url: string; alt: string } | null
  badges: { kind: string; label: string }[]
  hasHot: boolean
}

export type WingsGoScheduleRow = {
  id: string
  tourId: string
  departureDay: string
  returnDay: string | null
  monthKey: string
  daysUntilDeparture: number
  departureCityCode: string | null
  airline: { key: string; label: string } | null
  availability: ScheduleAvailability
  availabilityLabel: string
  price: ScheduleMoney | null
  promoLabel: string | null
  urgencyLabel: string | null
  canHoldSeat: boolean
  ctaLabel: string
  ctaHref: string
  isFeatured: boolean
  searchText: string
}

export type WingsGoScheduleMarketCard = {
  market: string
  label: string
  rowId: string
  tourId: string
  departureCount: number
}

export type WingsGoScheduleStats = {
  openCount: number
  tourCount: number
  pricedCount: number
  nearestDay: string | null
  yearRange: { from: number; to: number } | null
  sharedDepartureCity: string | null
  verifiedDay: string | null
}

export type ScheduleFilters = {
  market?: string
  month?: string
  airline?: string
  status?: ScheduleAvailability
  q?: string
  sort: 'date' | 'price'
  view: 'date' | 'tour'
}

export type ScheduleSnapshotFacts = {
  validMarkets?: Iterable<string>
  validMonths?: Iterable<string>
  validAirlines?: Iterable<string>
}

export type ScheduleFacetCounts = {
  months: Record<string, number>
  markets: Record<string, number>
  airlines: Record<string, number>
  statuses: Record<ScheduleAvailability, number>
}

export type WingsGoScheduleTourGroup = {
  tour: WingsGoScheduleTour
  rows: WingsGoScheduleRow[]
  priceFrom: ScheduleMoney | null
  chosenRow: WingsGoScheduleRow | null
}

export type WingsGoScheduleSnapshot = {
  locale: 'vi' | 'en'
  todayDay: string
  tours: Record<string, WingsGoScheduleTour>
  rows: WingsGoScheduleRow[]
  months: string[]
  markets: { value: string; label: string }[]
  airlines: { key: string; label: string }[]
  marketCards: WingsGoScheduleMarketCard[]
  stats: WingsGoScheduleStats
  initialFilters: ScheduleFilters
}

// ---------------------------------------------------------------------------
// Pure helper functions (exported for F2 and Phase 1B)
// ---------------------------------------------------------------------------

const tourDeparturesCollection = 'tour-departures' as never

export const asDoc = <T extends object>(value: T | number | string | null | undefined): T | null =>
  value && typeof value === 'object' ? value : null

export const foldVietnameseText = (value?: string | null): string => {
  if (!value) return ''
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .trim()
}

export const foldVietnamese = foldVietnameseText

/**
 * Derive schedule availability following the 5-step table in design.md (R2).
 */
export const deriveScheduleAvailability = (
  departure: {
    commerceVerified: boolean
    availabilityStatus?: string | null
    priceFrom?: number | null
    currency?: string | null
  },
  copy: { statusOpen: string; statusLimited: string; statusSoldOut: string; statusQuote: string },
  availabilityBadge?: string | null,
): { availability: ScheduleAvailability; label: string } => {
  // Step 1: not commerce verified → quote
  if (!departure.commerceVerified) {
    return {
      availability: 'quote',
      label: availabilityBadge || copy.statusQuote,
    }
  }

  // Step 2: verified + sold-out → sold-out
  if (departure.availabilityStatus === 'sold-out') {
    return {
      availability: 'sold-out',
      label: availabilityBadge || copy.statusSoldOut,
    }
  }

  // Step 3: verified but no valid governed price → quote
  const governed = normalizeGovernedTourPrice({
    currency: departure.currency,
    value: departure.priceFrom,
  })
  if (!governed) {
    return {
      availability: 'quote',
      label: availabilityBadge || copy.statusQuote,
    }
  }

  // Step 4: verified, has price, limited
  if (departure.availabilityStatus === 'limited') {
    return {
      availability: 'limited',
      label: availabilityBadge || copy.statusLimited,
    }
  }

  // Step 5: verified, has price, open (or unset)
  return {
    availability: 'open',
    label: availabilityBadge || copy.statusOpen,
  }
}

/**
 * Build a search-friendly text for a row (tour name + market + airline, folded).
 */
export const buildSearchText = (
  tourTitle: string,
  market: string | null,
  airlineLabel: string | null,
): string => {
  const parts = [tourTitle, market, airlineLabel].filter(Boolean).join(' ')
  return foldVietnamese(parts)
}

/**
 * US-093 D9: Parse and whitelist schedule filters from searchParams.
 * Drops unknown parameters, arrays/repeated params, and invalid values.
 * Defaults sort to 'date' and view to 'date'.
 */
export const parseScheduleFilters = (
  searchParams?: Record<string, string | string[] | undefined> | null,
  facts?: ScheduleSnapshotFacts | null,
): ScheduleFilters => {
  const result: ScheduleFilters = {
    sort: 'date',
    view: 'date',
  }

  if (!searchParams || typeof searchParams !== 'object') {
    return result
  }

  const validMarkets = facts?.validMarkets ? new Set(facts.validMarkets) : null
  const validMonths = facts?.validMonths ? new Set(facts.validMonths) : null
  const validAirlines = facts?.validAirlines ? new Set(facts.validAirlines) : null

  const getSingleString = (param: string): string | null => {
    const val = searchParams[param]
    if (typeof val === 'string') {
      const trimmed = val.trim()
      return trimmed.length > 0 ? trimmed : null
    }
    return null
  }

  // 1. market
  const marketVal = getSingleString('market')
  if (marketVal && (!validMarkets || validMarkets.has(marketVal))) {
    result.market = marketVal
  }

  // 2. month (YYYY-MM)
  const monthVal = getSingleString('month')
  if (monthVal && /^\d{4}-\d{2}$/.test(monthVal) && (!validMonths || validMonths.has(monthVal))) {
    result.month = monthVal
  }

  // 3. airline
  const airlineVal = getSingleString('airline')
  if (airlineVal && (!validAirlines || validAirlines.has(airlineVal))) {
    result.airline = airlineVal
  }

  // 4. status
  const statusVal = getSingleString('status')
  if (statusVal && ['open', 'limited', 'sold-out', 'quote'].includes(statusVal)) {
    result.status = statusVal as ScheduleAvailability
  }

  // 5. q (max 80 chars)
  const qVal = getSingleString('q')
  if (qVal) {
    result.q = qVal.slice(0, 80)
  }

  // 6. sort
  const sortVal = getSingleString('sort')
  if (sortVal === 'price') {
    result.sort = 'price'
  }

  // 7. view
  const viewVal = getSingleString('view')
  if (viewVal === 'tour') {
    result.view = 'tour'
  }

  return result
}

/**
 * Filter schedule rows by applying active filters with AND logic.
 */
export const filterScheduleRows = (
  rows: WingsGoScheduleRow[],
  filters: ScheduleFilters,
  tours?: Record<string, WingsGoScheduleTour>,
): WingsGoScheduleRow[] => {
  const foldedQuery = filters.q ? foldVietnameseText(filters.q) : ''

  return rows.filter((row) => {
    if (filters.market) {
      const tour = tours?.[row.tourId]
      if (!tour || tour.market !== filters.market) return false
    }

    if (filters.month) {
      if (row.monthKey !== filters.month) return false
    }

    if (filters.airline) {
      if (row.airline?.key !== filters.airline) return false
    }

    if (filters.status) {
      if (row.availability !== filters.status) return false
    }

    if (foldedQuery) {
      if (!row.searchText.includes(foldedQuery)) {
        const tour = tours?.[row.tourId]
        const fallback = tour ? foldVietnameseText(`${tour.title} ${tour.market || ''}`) : ''
        if (!fallback.includes(foldedQuery)) return false
      }
    }

    return true
  })
}

/**
 * Count facets for each dimension, applying all active filters EXCEPT the dimension itself.
 */
export const countScheduleFacets = (
  rows: WingsGoScheduleRow[],
  activeFilters: ScheduleFilters,
  tours?: Record<string, WingsGoScheduleTour>,
): ScheduleFacetCounts => {
  const counts: ScheduleFacetCounts = {
    months: {},
    markets: {},
    airlines: {},
    statuses: {
      open: 0,
      limited: 0,
      'sold-out': 0,
      quote: 0,
    },
  }

  // 1. Months: all filters EXCEPT month
  const rowsNoMonth = filterScheduleRows(rows, { ...activeFilters, month: undefined }, tours)
  for (const r of rowsNoMonth) {
    if (r.monthKey) counts.months[r.monthKey] = (counts.months[r.monthKey] || 0) + 1
  }

  // 2. Markets: all filters EXCEPT market
  const rowsNoMarket = filterScheduleRows(rows, { ...activeFilters, market: undefined }, tours)
  for (const r of rowsNoMarket) {
    const tour = tours?.[r.tourId]
    if (tour?.market) counts.markets[tour.market] = (counts.markets[tour.market] || 0) + 1
  }

  // 3. Airlines: all filters EXCEPT airline
  const rowsNoAirline = filterScheduleRows(rows, { ...activeFilters, airline: undefined }, tours)
  for (const r of rowsNoAirline) {
    if (r.airline?.key) counts.airlines[r.airline.key] = (counts.airlines[r.airline.key] || 0) + 1
  }

  // 4. Statuses: all filters EXCEPT status
  const rowsNoStatus = filterScheduleRows(rows, { ...activeFilters, status: undefined }, tours)
  for (const r of rowsNoStatus) {
    if (r.availability) {
      counts.statuses[r.availability] = (counts.statuses[r.availability] || 0) + 1
    }
  }

  return counts
}

/**
 * Compare two schedule IDs: numeric if both are integers, otherwise string localeCompare.
 */
export const compareScheduleIds = (a: string, b: string): number => {
  const numA = Number(a)
  const numB = Number(b)
  if (Number.isInteger(numA) && Number.isInteger(numB)) {
    return numA - numB
  }
  return a.localeCompare(b)
}

/**
 * Sort schedule rows:
 * - date: departureDay asc, then id asc.
 * - price: VND asc, then USD asc, then no price; within group: price.value asc, then departureDay asc, then id asc.
 */
export const sortScheduleRows = (
  rows: WingsGoScheduleRow[],
  sort: 'date' | 'price' = 'date',
): WingsGoScheduleRow[] => {
  const list = [...rows]
  if (sort === 'date') {
    return list.sort((a, b) => {
      const dayCmp = a.departureDay.localeCompare(b.departureDay)
      if (dayCmp !== 0) return dayCmp
      return compareScheduleIds(a.id, b.id)
    })
  }

  const getPriceRank = (row: WingsGoScheduleRow): number => {
    if (!row.price || row.price.value === null || row.price.value === undefined) return 3
    if (row.price.currency === 'VND') return 0
    if (row.price.currency === 'USD') return 1
    return 2
  }

  return list.sort((a, b) => {
    const rankA = getPriceRank(a)
    const rankB = getPriceRank(b)
    if (rankA !== rankB) return rankA - rankB

    if (rankA < 3) {
      const diff = a.price!.value - b.price!.value
      if (diff !== 0) return diff
    }

    const dayCmp = a.departureDay.localeCompare(b.departureDay)
    if (dayCmp !== 0) return dayCmp
    return compareScheduleIds(a.id, b.id)
  })
}

/**
 * Group schedule rows by tour. "Giá từ" only considers rows where canHoldSeat is true.
 * Prioritizes VND over USD, preserves original and promo of the exact chosen row.
 */
export const groupScheduleRowsByTour = (
  rows: WingsGoScheduleRow[],
  tours: Record<string, WingsGoScheduleTour>,
): WingsGoScheduleTourGroup[] => {
  const groups = new Map<string, WingsGoScheduleRow[]>()

  for (const row of rows) {
    const list = groups.get(row.tourId)
    if (list) {
      list.push(row)
    } else {
      groups.set(row.tourId, [row])
    }
  }

  const result: WingsGoScheduleTourGroup[] = []

  for (const [tourId, tourRows] of groups.entries()) {
    const tour = tours[tourId]
    if (!tour) continue

    tourRows.sort((a, b) => {
      const d = a.departureDay.localeCompare(b.departureDay)
      if (d !== 0) return d
      return compareScheduleIds(a.id, b.id)
    })

    const holdSeatRows = tourRows.filter((r) => r.canHoldSeat && r.price)

    let chosenRow: WingsGoScheduleRow | null = null

    const vndRows = holdSeatRows.filter((r) => r.price?.currency === 'VND')
    if (vndRows.length > 0) {
      vndRows.sort((a, b) => {
        const pDiff = a.price!.value - b.price!.value
        if (pDiff !== 0) return pDiff
        const d = a.departureDay.localeCompare(b.departureDay)
        if (d !== 0) return d
        return compareScheduleIds(a.id, b.id)
      })
      chosenRow = vndRows[0]
    } else {
      const usdRows = holdSeatRows.filter((r) => r.price?.currency === 'USD')
      if (usdRows.length > 0) {
        usdRows.sort((a, b) => {
          const pDiff = a.price!.value - b.price!.value
          if (pDiff !== 0) return pDiff
          const d = a.departureDay.localeCompare(b.departureDay)
          if (d !== 0) return d
          return compareScheduleIds(a.id, b.id)
        })
        chosenRow = usdRows[0]
      } else if (holdSeatRows.length > 0) {
        holdSeatRows.sort((a, b) => {
          const pDiff = a.price!.value - b.price!.value
          if (pDiff !== 0) return pDiff
          const d = a.departureDay.localeCompare(b.departureDay)
          if (d !== 0) return d
          return compareScheduleIds(a.id, b.id)
        })
        chosenRow = holdSeatRows[0]
      }
    }

    result.push({
      tour,
      rows: tourRows,
      priceFrom: chosenRow?.price ?? null,
      chosenRow,
    })
  }

  return result
}

/**
 * Validate and extract media for a tour, checking site ownership.
 * F3: Media without site is rejected (null). Only accepted if site matches siteId.
 * C5: Trims, normalizes via normalizePublicMediaURL, rejects whitespace or malformed URLs,
 *     only accepts paths starting with '/' or valid 'https://' URLs.
 */
export const extractTourMedia = (
  media: Record<string, any> | null | undefined,
  siteId: number | string,
): { url: string; alt: string } | null => {
  if (!media || typeof media !== 'object') return null
  const mediaSiteId =
    media.site && typeof media.site === 'object' ? media.site.id : media.site
  // F3 fail closed: media without site or site mismatch -> return null
  if (mediaSiteId == null || String(mediaSiteId) !== String(siteId)) return null

  // Must have a valid URL string
  if (!media.url || typeof media.url !== 'string') return null
  const rawUrl = media.url.trim()
  if (!rawUrl) return null

  let normalizedUrl = ''
  if (rawUrl.startsWith('/')) {
    normalizedUrl = normalizePublicMediaURL(rawUrl)
  } else if (rawUrl.startsWith('https://')) {
    try {
      new URL(rawUrl)
      normalizedUrl = normalizePublicMediaURL(rawUrl)
    } catch {
      return null
    }
  } else {
    return null
  }

  if (!normalizedUrl) return null
  const alt = typeof media.alt === 'string' ? media.alt.trim() : ''
  return { url: normalizedUrl, alt }
}

/**
 * Generate all month keys between two YYYY-MM strings, inclusive.
 */
export const generateMonthRange = (first: string, last: string): string[] => {
  const months: string[] = []
  let [y, m] = first.split('-').map(Number)
  const [endY, endM] = last.split('-').map(Number)

  while (y < endY || (y === endY && m <= endM)) {
    months.push(`${y}-${String(m).padStart(2, '0')}`)
    m++
    if (m > 12) {
      m = 1
      y++
    }
  }
  return months
}

/**
 * F2: Build schedule months array from rows, including empty gap months.
 */
export const buildScheduleMonths = (
  rows: Array<Pick<WingsGoScheduleRow, 'monthKey'>>,
): string[] => {
  const monthSet = new Set<string>()
  for (const row of rows) {
    if (row.monthKey) monthSet.add(row.monthKey)
  }
  const sortedMonths = Array.from(monthSet).sort()
  if (sortedMonths.length === 0) return []
  if (sortedMonths.length === 1) return sortedMonths
  return generateMonthRange(sortedMonths[0], sortedMonths[sortedMonths.length - 1])
}

/**
 * F2: Build a single schedule row from normalized departure doc and tour info.
 */
export const buildScheduleRow = ({
  doc,
  tour,
  now = new Date(),
  copy,
  draft = false,
}: {
  doc: Record<string, any>
  tour: Pick<WingsGoScheduleTour, 'id' | 'slug' | 'title' | 'market'>
  now?: Date
  copy: ReturnType<typeof getWingsGoScheduleCopy>
  draft?: boolean
}): WingsGoScheduleRow | null => {
  const departureDay = toBusinessCalendarDay(doc.departureDate)
  if (!departureDay) return null

  const monthKey = businessCalendarMonth(departureDay)
  if (!monthKey) return null

  const returnDay = doc.returnDate ? toBusinessCalendarDay(doc.returnDate) : null
  const daysUntil = daysUntilBusinessDay(doc.departureDate, now)
  if (daysUntil === null || daysUntil < 0) return null

  const hasFreshnessGovernance = Boolean(doc.verifiedAt || doc.expiresAt)
  const commerceVerified =
    draft ||
    ((doc.commerceVerified === undefined || doc.commerceVerified === true) &&
      (hasFreshnessGovernance
        ? isDepartureVerificationCurrent(doc, now.getTime())
        : doc.commerceVerified === true))

  const { availability, label: availabilityLabel } = deriveScheduleAvailability(
    {
      commerceVerified,
      availabilityStatus: doc.availabilityStatus,
      priceFrom: doc.priceFrom,
      currency: doc.currency,
    },
    copy,
    commerceVerified ? doc.availabilityBadge : null,
  )

  const governed = normalizeGovernedTourPrice({
    currency: doc.currency,
    value: doc.priceFrom,
  })

  const canPromote =
    commerceVerified &&
    (draft || hasFreshnessGovernance || doc.commerceVerified === true) &&
    doc.availabilityStatus !== 'sold-out' &&
    Boolean(governed)

  const originalPrice =
    canPromote &&
    typeof doc.originalPrice === 'number' &&
    Number.isFinite(doc.originalPrice) &&
    doc.originalPrice > doc.priceFrom &&
    Boolean(doc.currency) &&
    (!doc.originalCurrency || doc.originalCurrency === doc.currency)
      ? doc.originalPrice
      : null

  const price: ScheduleMoney | null =
    governed && commerceVerified
      ? {
          value: governed.value,
          currency: governed.currency,
          original: originalPrice,
        }
      : null

  const canHoldSeatValue = canHoldSeat(
    {
      commerceVerified,
      availabilityStatus: doc.availabilityStatus,
      departureDate: doc.departureDate,
      currency: doc.currency,
      priceFrom: doc.priceFrom,
    },
    now,
  )

  const ctaLabel = doc.ctaLabelOverride || (canHoldSeatValue ? copy.ctaHoldSeat : copy.ctaRequestQuote)
  const ctaHref = getTourInquiryPath({
    intent: canHoldSeatValue ? 'hold-seat' : 'inquiry',
    tourSlug: tour.slug,
    tourId: tour.id,
    departureId: doc.id,
    departureDate: departureDay,
    source: 'schedule',
  })

  const departureCityCode = getDepartureCityCode(doc.departureCity)
  const airlineEntry = normalizeScheduleAirline(doc.airline)

  const promoLabel = canPromote ? doc.promoLabel || null : null
  const urgencyLabel = commerceVerified ? doc.urgencyLabel || null : null
  const searchText = buildSearchText(tour.title, tour.market, airlineEntry?.label || null)

  return {
    id: String(doc.id),
    tourId: tour.id,
    departureDay,
    returnDay,
    monthKey,
    daysUntilDeparture: daysUntil,
    departureCityCode,
    airline: airlineEntry,
    availability,
    availabilityLabel,
    price,
    promoLabel,
    urgencyLabel,
    canHoldSeat: canHoldSeatValue,
    ctaLabel,
    ctaHref,
    isFeatured: Boolean(doc.isFeatured),
    searchText,
  }
}

/**
 * F2: Compute schedule statistics from rows, tours, and max verified timestamp.
 */
export const computeScheduleStats = (
  rows: WingsGoScheduleRow[],
  tours?: Record<string, WingsGoScheduleTour>,
  maxVerifiedAt?: number | null,
): WingsGoScheduleStats => {
  const tourIds = new Set(rows.map((r) => r.tourId))
  const openCount = rows.filter(
    (r) => r.availability === 'open' || r.availability === 'limited',
  ).length
  const pricedCount = rows.filter((r) => r.price !== null).length
  const nearestDay = rows.length > 0 ? rows[0].departureDay : null

  let yearRange: { from: number; to: number } | null = null
  if (rows.length > 0) {
    const firstYear = Number(rows[0].departureDay.slice(0, 4))
    const lastYear = Number(rows[rows.length - 1].departureDay.slice(0, 4))
    yearRange = { from: firstYear, to: lastYear }
  }

  let sharedDepartureCity: string | null = null
  if (rows.length > 0) {
    const firstCity = rows[0].departureCityCode
    if (firstCity && rows.every((r) => r.departureCityCode === firstCity)) {
      sharedDepartureCity = firstCity
    }
  }

  const verifiedDay =
    maxVerifiedAt != null ? toBusinessCalendarDay(new Date(maxVerifiedAt)) : null

  return {
    openCount,
    tourCount: tours && Object.keys(tours).length > 0 ? Object.keys(tours).length : tourIds.size,
    pricedCount,
    nearestDay,
    yearRange,
    sharedDepartureCity,
    verifiedDay,
  }
}

// ---------------------------------------------------------------------------
// Main snapshot function
// ---------------------------------------------------------------------------

export const createEmptyScheduleSnapshot = (
  locale: SupportedLocaleCode = 'vi',
): WingsGoScheduleSnapshot => ({
  locale: locale === 'en' ? 'en' : 'vi',
  todayDay: '',
  tours: {},
  rows: [],
  months: [],
  markets: [],
  airlines: [],
  marketCards: [],
  stats: {
    openCount: 0,
    tourCount: 0,
    pricedCount: 0,
    nearestDay: null,
    yearRange: null,
    sharedDepartureCity: null,
    verifiedDay: null,
  },
  initialFilters: { sort: 'date', view: 'date' },
})

export const getWingsGoScheduleSnapshot = async ({
  locale = 'vi',
  draft = false,
  now = new Date(),
  searchParams,
}: {
  locale?: SupportedLocaleCode
  draft?: boolean
  now?: Date
  searchParams?: Record<string, string | string[] | undefined>
}): Promise<WingsGoScheduleSnapshot | null> => {
  const site = await getCurrentSite()
  if (!site?.id) {
    console.warn('[wingsGoSchedule] No site found for schedule snapshot')
    return createEmptyScheduleSnapshot(locale)
  }

  const siteId = site.id
  const copy = getWingsGoScheduleCopy(locale)
  const today = toBusinessCalendarDay(now)
  if (!today) {
    // Fail closed: cannot determine business day
    console.error('[wingsGoSchedule] toBusinessCalendarDay returned null for', String(now))
    return createEmptyScheduleSnapshot(locale)
  }

  // Query departures: published, from start of today VN, paginated
  const startOfToday = new Date(`${today}T00:00:00+07:00`).toISOString()
  const baseWhere: Record<string, unknown> = draft
    ? {}
    : {
        and: [
          { _status: { equals: 'published' } },
          { departureDate: { greater_than_equal: startOfToday } },
        ],
      }

  const payload = await getPayload({ config: configPromise })
  const scopedWhere = await appendSiteWhere(baseWhere as never)

  // Read all pages
  const allDocs: Record<string, any>[] = []
  const seenIds = new Set<string>()
  let currentPage = 1
  const batchSize = 250

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const result = await payload.find({
      collection: tourDeparturesCollection,
      depth: 2,
      draft,
      fallbackLocale: locale === 'en' ? false : ('vi' as any),
      limit: batchSize,
      locale,
      overrideAccess: draft,
      pagination: true,
      page: currentPage,
      sort: ['departureDate', 'id'] as any,
      where: scopedWhere,
      populate: {
        'tour-products': {
          id: true,
          site: true,
          _status: true,
          slug: true,
          title: true,
          market: true,
          durationDays: true,
          durationNights: true,
          heroMedia: true,
          editorialBadges: true,
        },
      } as any,
    })

    for (const doc of (result.docs || []) as any[]) {
      const id = String(doc.id)
      if (!seenIds.has(id)) {
        seenIds.add(id)
        allDocs.push(doc)
      }
    }

    if (!result.hasNextPage) break
    currentPage++
  }

  // Log warning if > 1000 departures
  if (allDocs.length > 1000) {
    console.warn(
      `[wingsGoSchedule] Site ${site.code} has ${allDocs.length} future departures (> 1000 threshold)`,
    )
  }

  // D11 locale fallback: if EN and some products have no title, fetch VI products
  let viProductsById: Map<string, Record<string, any>> | null = null
  if (locale === 'en') {
    const productIds = new Set<string>()
    for (const doc of allDocs) {
      const product = asDoc<Record<string, any>>(doc.tourProduct)
      if (product?.id && !product.title) {
        productIds.add(String(product.id))
      }
    }
    if (productIds.size > 0) {
      // F4: Scope by site and published for VI fallback query
      const viResult = await payload.find({
        collection: 'tour-products' as never,
        depth: 1,
        draft: false,
        locale: 'vi' as any,
        limit: 0,
        overrideAccess: false,
        pagination: false,
        where: {
          and: [
            { id: { in: Array.from(productIds) } },
            { site: { equals: siteId } },
            { _status: { equals: 'published' } },
          ],
        },
      })
      viProductsById = new Map(
        ((viResult.docs || []) as any[]).map((p) => [String(p.id), p]),
      )
    }
  }

  // Build tours map and rows
  const toursMap: Record<string, WingsGoScheduleTour> = {}
  const rows: WingsGoScheduleRow[] = []
  const marketSet = new Set<string>()
  const airlineMap = new Map<string, { key: string; label: string }>()
  let maxVerifiedAt: number | null = null

  const enPrefix = locale === 'en' ? '/en' : ''

  for (const doc of allDocs) {
    // Validate product: must be a populated object
    const rawProduct = asDoc<Record<string, any>>(doc.tourProduct)
    if (!rawProduct) continue

    // F3 fail-closed: product must belong to current site
    const productSiteId =
      rawProduct.site && typeof rawProduct.site === 'object'
        ? rawProduct.site.id
        : rawProduct.site
    if (productSiteId == null || String(productSiteId) !== String(siteId)) continue

    // F3 fail-closed: in non-draft mode, product must be published
    if (!draft && rawProduct._status !== 'published') continue

    const productId = String(rawProduct.id)

    // D11: EN products missing title → use VI content but keep EN badges
    let productTitle = normalizeTourPublicText(sanitizeWingSidePublicText(rawProduct.title))
    if (!productTitle && viProductsById) {
      const viProduct = viProductsById.get(productId)
      if (viProduct) {
        productTitle = normalizeTourPublicText(sanitizeWingSidePublicText(viProduct.title))
      }
    }
    if (!productTitle) productTitle = ''

    // Badge always from EN strict read
    const { editorialBadges, hasHotEditorialBadge } = normalizeEditorialBadges(
      rawProduct.editorialBadges,
      'en',
    )

    // F3: Extract and validate media (media without site is rejected)
    const heroMediaDoc = asDoc<Record<string, any>>(rawProduct.heroMedia)
    const media = extractTourMedia(heroMediaDoc, siteId)

    const slug = rawProduct.slug || ''
    const market = rawProduct.market || null
    const durationLabel = getCompactDurationLabel(
      rawProduct.durationDays,
      rawProduct.durationNights,
      locale === 'en' ? 'en' : 'vi',
    )

    // Build or reuse tour entry
    if (!toursMap[productId]) {
      toursMap[productId] = {
        id: productId,
        slug,
        href: `${enPrefix}/tour/${slug}`,
        title: productTitle,
        routeTitle: getTourRouteTitle(productTitle),
        market,
        durationLabel,
        media,
        badges: editorialBadges,
        hasHot: hasHotEditorialBadge,
      }
    }

    const tourEntry = toursMap[productId]

    // Build schedule row using F2 helper
    const row = buildScheduleRow({
      doc,
      tour: tourEntry,
      now,
      copy,
      draft,
    })

    if (!row) continue

    // Track verifiedAt for stats (C2: all currently verified departures regardless of price/sold-out)
    if (isDepartureVerificationCurrent(doc, now.getTime())) {
      if (doc.verifiedAt) {
        const vAt = Date.parse(doc.verifiedAt)
        if (Number.isFinite(vAt) && (maxVerifiedAt === null || vAt > maxVerifiedAt)) {
          maxVerifiedAt = vAt
        }
      }
    }

    // Airline tracking
    if (row.airline) {
      if (!airlineMap.has(row.airline.key)) {
        airlineMap.set(row.airline.key, row.airline)
      }
    }

    // Market tracking
    if (market) {
      marketSet.add(market)
    }

    rows.push(row)
  }

  // Sort rows: by departureDay then by id
  rows.sort((a, b) => {
    const dayCmp = a.departureDay.localeCompare(b.departureDay)
    if (dayCmp !== 0) return dayCmp
    return compareScheduleIds(a.id, b.id)
  })

  // F2: Build schedule months with gaps
  const months = buildScheduleMonths(rows)

  // Markets list with labels (C1: 'other' uses copy.marketOther)
  const resolvedLocale = locale === 'en' ? 'en' : 'vi'
  const markets = Array.from(marketSet)
    .sort()
    .map((value) => ({
      value,
      label:
        value === 'other'
          ? copy.marketOther
          : (WINGSGO_MARKET_LABELS[value]?.[resolvedLocale] || copy.marketOther),
    }))

  // Airlines list
  const airlines = Array.from(airlineMap.values()).sort((a, b) =>
    a.label.localeCompare(b.label),
  )

  // F2: Compute schedule stats
  const stats = computeScheduleStats(rows, toursMap, maxVerifiedAt)

  // Snapshot pre-filters canHoldSeat departures before populating marketCards (max 3)
  const canHoldSeatRowIds = new Set(rows.filter((r) => r.canHoldSeat).map((r) => r.id))
  const canHoldSeatDocs = allDocs.filter((doc) => canHoldSeatRowIds.has(String(doc.id)))

  const marketCards: WingsGoScheduleMarketCard[] = []
  for (const market of markets) {
    const marketRows = rows.filter((r) => {
      const tour = toursMap[r.tourId]
      return tour?.market === market.value
    })
    const departureCount = marketRows.length
    if (departureCount === 0) continue

    const marketDocs = canHoldSeatDocs.filter((doc) => {
      const tour = doc.tourProduct && typeof doc.tourProduct === 'object' ? doc.tourProduct : null
      return tour?.market === market.value
    })

    const priorityDep = getPriorityMarketDeparture(marketDocs as any, market.value, now)
    if (priorityDep) {
      marketCards.push({
        market: market.value,
        label: market.label,
        rowId: String(priorityDep.id),
        tourId: String(
          priorityDep.tourProduct && typeof priorityDep.tourProduct === 'object'
            ? priorityDep.tourProduct.id
            : priorityDep.tourProduct,
        ),
        departureCount,
      })
      if (marketCards.length >= 3) break
    }
  }

  // Initial filters parsed from URL searchParams
  const snapshotFacts: ScheduleSnapshotFacts = {
    validMarkets: markets.map((m) => m.value),
    validMonths: months,
    validAirlines: airlines.map((a) => a.key),
  }
  const initialFilters = parseScheduleFilters(searchParams, snapshotFacts)

  return {
    locale: locale === 'en' ? 'en' : 'vi',
    todayDay: today,
    tours: toursMap,
    rows,
    months,
    markets,
    airlines,
    marketCards,
    stats,
    initialFilters,
  }
}
