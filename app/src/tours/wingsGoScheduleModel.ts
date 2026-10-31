import { normalizeGovernedTourPrice } from './currency'
import { WINGSGO_MARKET_LABELS } from './wingsGoCatalogCopy'

// ---------------------------------------------------------------------------
// DTO Types (US-093 design.md contract)
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
  /** Faint photo behind the month chart: a same-site tour hero image, or null. */
  chartBackdrop: { url: string; alt: string } | null
  stats: WingsGoScheduleStats
  initialFilters: ScheduleFilters
}

// ---------------------------------------------------------------------------
// Pure Helpers (Client & Server Safe)
// ---------------------------------------------------------------------------

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
 * Deterministic day of week abbreviation for a YYYY-MM-DD string.
 * Completely timezone-neutral, 0 hydration mismatch risk.
 */
export const getScheduleWeekdayAbbr = (dayString: string, locale: 'vi' | 'en' = 'vi'): string => {
  const parts = dayString.split('-').map(Number)
  if (parts.length < 3 || Number.isNaN(parts[0]) || Number.isNaN(parts[1]) || Number.isNaN(parts[2])) {
    return ''
  }
  const dayOfWeek = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2])).getUTCDay()
  const viDays = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
  const enDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return locale === 'en' ? enDays[dayOfWeek] : viDays[dayOfWeek]
}

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
  // Editorial badge text only replaces the label of a sellable state (open/limited);
  // a stale "Đang mở bán" must never sit on a sold-out or quote-only departure.
  availabilityBadge?: string | null,
): { availability: ScheduleAvailability; label: string } => {
  // Step 1: not commerce verified → quote
  if (!departure.commerceVerified) {
    return {
      availability: 'quote',
      label: copy.statusQuote,
    }
  }

  // Step 2: verified + sold-out → sold-out
  if (departure.availabilityStatus === 'sold-out') {
    return {
      availability: 'sold-out',
      label: copy.statusSoldOut,
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
      label: copy.statusQuote,
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
 * Resolve display label for a market enum.
 */
export const getScheduleMarketLabel = (
  market: string | null | undefined,
  locale: 'vi' | 'en' = 'vi',
  copy?: { marketOther?: string },
): string => {
  if (!market) return ''
  if (market === 'other') {
    return copy?.marketOther || (locale === 'en' ? 'Other destinations' : 'Thị trường khác')
  }
  return WINGSGO_MARKET_LABELS[market]?.[locale] || market
}

/**
 * Build a search-friendly text for a row (tour title + market enum + market label + airline, folded).
 */
export const buildSearchText = (
  tourTitle: string,
  market: string | null,
  airlineLabel: string | null,
  marketLabel?: string | null,
): string => {
  const parts = [tourTitle, market, marketLabel, airlineLabel].filter(Boolean).join(' ')
  return foldVietnamese(parts)
}

/**
 * Pure adapter converting URLSearchParams to Record<string, string | string[]>
 * preserving repeated query keys as arrays, matching SSR searchParams contract.
 */
export const urlSearchParamsToRecord = (
  params: URLSearchParams,
): Record<string, string | string[]> => {
  const result: Record<string, string | string[]> = {}
  for (const key of params.keys()) {
    if (key in result) continue
    const all = params.getAll(key)
    result[key] = all.length > 1 ? all : all[0] ?? ''
  }
  return result
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
 * K2: Search matches tourTitle, market enum, market label (both VI and EN, plus 'other'), and airline.
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
        if (!tour) return false
        const marketLabels = tour.market
          ? [
              tour.market,
              tour.market === 'other' ? 'thi truong khac other destinations' : '',
              WINGSGO_MARKET_LABELS[tour.market]?.vi || '',
              WINGSGO_MARKET_LABELS[tour.market]?.en || '',
            ].filter(Boolean).join(' ')
          : ''
        const fallback = foldVietnameseText(`${tour.title} ${marketLabels}`)
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
 * Build schedule months array from rows, including empty gap months.
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
