import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { appendSiteWhere, getCurrentSite } from '@/utilities/siteContext'
import type { SupportedLocaleCode } from '@/utilities/sitePaths'

import {
  toBusinessCalendarDay,
  businessCalendarMonth,
  daysUntilBusinessDay,
} from './businessCalendar'
import { normalizeGovernedTourPrice } from './currency'
import { isDepartureVerificationCurrent } from './departureCommerce'
import { normalizeEditorialBadges } from './editorialBadges'
import { getWingsGoScheduleCopy } from './wingsGoScheduleCopy'
import { getDepartureCityCode, getCompactDurationLabel, getTourRouteTitle } from './wingsGoDisplay'
import { normalizeTourPublicText } from './utils'
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
  status?: string
  q?: string
  sort?: 'date' | 'price'
  view?: 'date' | 'tour'
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
// Internal helpers
// ---------------------------------------------------------------------------

const tourDeparturesCollection = 'tour-departures' as never

const asDoc = <T extends object>(value: T | number | string | null | undefined): T | null =>
  value && typeof value === 'object' ? value : null

const foldVietnamese = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim()

/**
 * Derive schedule availability following the 5-step table in design.md (R2).
 */
const deriveScheduleAvailability = (
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
const buildSearchText = (
  tourTitle: string,
  market: string | null,
  airlineLabel: string | null,
): string => {
  const parts = [tourTitle, market, airlineLabel].filter(Boolean).join(' ')
  return foldVietnamese(parts)
}

/**
 * Validate and extract media for a tour, checking site ownership.
 */
const extractTourMedia = (
  media: Record<string, any> | null | undefined,
  siteId: number | string,
): { url: string; alt: string } | null => {
  if (!media || typeof media !== 'object') return null
  // Media must belong to the same site
  const mediaSiteId =
    media.site && typeof media.site === 'object' ? media.site.id : media.site
  if (mediaSiteId != null && String(mediaSiteId) !== String(siteId)) return null
  // Must have a valid URL
  if (!media.url || typeof media.url !== 'string') return null
  return { url: media.url, alt: media.alt || '' }
}

/**
 * Generate all month keys between two YYYY-MM strings, inclusive.
 */
const generateMonthRange = (first: string, last: string): string[] => {
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

// ---------------------------------------------------------------------------
// Main snapshot function
// ---------------------------------------------------------------------------

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
  if (!site?.id) return null

  const siteId = site.id
  const copy = getWingsGoScheduleCopy(locale)
  const today = toBusinessCalendarDay(now)
  if (!today) {
    // Fail closed: cannot determine business day
    console.error('[wingsGoSchedule] toBusinessCalendarDay returned null for', now.toISOString())
    return {
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
      initialFilters: {},
    }
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
      // Fetch VI versions of those products
      const viResult = await payload.find({
        collection: 'tour-products' as never,
        depth: 1,
        draft: false,
        locale: 'vi' as any,
        limit: 0,
        overrideAccess: false,
        pagination: false,
        where: {
          id: { in: Array.from(productIds) },
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
  const monthSet = new Set<string>()
  const marketSet = new Set<string>()
  const airlineMap = new Map<string, { key: string; label: string }>()
  let maxVerifiedAt: number | null = null
  const departureCityCodes: (string | null)[] = []

  const enPrefix = locale === 'en' ? '/en' : ''

  for (const doc of allDocs) {
    // Validate product: must be a populated object, published, same site
    const rawProduct = asDoc<Record<string, any>>(doc.tourProduct)
    if (!rawProduct) continue

    const productSiteId =
      rawProduct.site && typeof rawProduct.site === 'object'
        ? rawProduct.site.id
        : rawProduct.site
    if (productSiteId != null && String(productSiteId) !== String(siteId)) continue
    if (!draft && rawProduct._status && rawProduct._status !== 'published') continue

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

    // Badge always from EN strict read (the rawProduct already has EN badges from the main query)
    const { editorialBadges, hasHotEditorialBadge } = normalizeEditorialBadges(
      rawProduct.editorialBadges,
      'en',
    )

    // Extract and validate media
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

    // Departure-level processing
    const departureDay = toBusinessCalendarDay(doc.departureDate)
    if (!departureDay) continue

    const monthKey = businessCalendarMonth(departureDay)
    if (!monthKey) continue
    monthSet.add(monthKey)

    const returnDay = doc.returnDate ? toBusinessCalendarDay(doc.returnDate) : null
    const daysUntil = daysUntilBusinessDay(doc.departureDate, now)
    if (daysUntil === null || daysUntil < 0) continue

    // Commerce verification using the same `now`
    const hasFreshnessGovernance = Boolean(doc.verifiedAt || doc.expiresAt)
    const commerceVerified =
      draft ||
      ((doc.commerceVerified === undefined || doc.commerceVerified === true) &&
        (hasFreshnessGovernance
          ? isDepartureVerificationCurrent(doc, now.getTime())
          : doc.commerceVerified === true))

    // Derive availability
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

    // Price governance
    const governed = normalizeGovernedTourPrice({
      currency: doc.currency,
      value: doc.priceFrom,
    })

    // canPromote mirrors normalizeDepartureCard logic
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

    // canHoldSeat: verified, not sold-out, future (>= 0), has governed price
    const canHoldSeat =
      commerceVerified === true &&
      doc.availabilityStatus !== 'sold-out' &&
      daysUntil >= 0 &&
      governed !== null

    // CTA
    const ctaLabel = doc.ctaLabelOverride || (canHoldSeat ? copy.ctaHoldSeat : copy.ctaRequestQuote)
    const ctaHref = `/lien-he?intent=${canHoldSeat ? 'hold-seat' : 'inquiry'}&tour=${slug}&tourId=${productId}&departureId=${doc.id}&departureDate=${departureDay}&source=schedule`

    // Departure city
    const departureCityCode = getDepartureCityCode(doc.departureCity)
    departureCityCodes.push(departureCityCode)

    // Airline
    let airlineEntry: { key: string; label: string } | null = null
    if (doc.airline && typeof doc.airline === 'string' && doc.airline.trim()) {
      const label = doc.airline.trim()
      const key = `raw:${label.toLowerCase()}`
      airlineEntry = { key, label }
      if (!airlineMap.has(key)) {
        airlineMap.set(key, airlineEntry)
      }
    }

    // Market tracking
    if (market) {
      marketSet.add(market)
    }

    // Promo label
    const promoLabel = canPromote ? doc.promoLabel || null : null

    // Urgency label
    const urgencyLabel = commerceVerified ? doc.urgencyLabel || null : null

    // Track verifiedAt for stats
    if (commerceVerified && doc.verifiedAt) {
      const vAt = Date.parse(doc.verifiedAt)
      if (Number.isFinite(vAt) && (maxVerifiedAt === null || vAt > maxVerifiedAt)) {
        maxVerifiedAt = vAt
      }
    }

    // Search text
    const searchText = buildSearchText(productTitle, market, airlineEntry?.label || null)

    rows.push({
      id: String(doc.id),
      tourId: productId,
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
      canHoldSeat,
      ctaLabel,
      ctaHref,
      isFeatured: Boolean(doc.isFeatured),
      searchText,
    })
  }

  // Sort rows: by departureDay then by id
  rows.sort((a, b) => {
    const dayCmp = a.departureDay.localeCompare(b.departureDay)
    if (dayCmp !== 0) return dayCmp
    return a.id.localeCompare(b.id)
  })

  // Generate months range (all months from first to last, including gaps)
  const sortedMonths = Array.from(monthSet).sort()
  const months =
    sortedMonths.length >= 2
      ? generateMonthRange(sortedMonths[0], sortedMonths[sortedMonths.length - 1])
      : sortedMonths

  // Markets list with labels
  const resolvedLocale = locale === 'en' ? 'en' : 'vi'
  const markets = Array.from(marketSet)
    .sort()
    .map((value) => ({
      value,
      label: WINGSGO_MARKET_LABELS[value]?.[resolvedLocale] || copy.marketOther,
    }))

  // Airlines list
  const airlines = Array.from(airlineMap.values()).sort((a, b) =>
    a.label.localeCompare(b.label),
  )

  // Stats
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

  // Shared departure city: only if ALL rows have the same code
  let sharedDepartureCity: string | null = null
  if (departureCityCodes.length > 0) {
    const unique = new Set(departureCityCodes.filter(Boolean))
    if (unique.size === 1) {
      sharedDepartureCity = Array.from(unique)[0]
    }
  }

  // Verified day: max verifiedAt among verified departures
  const verifiedDay = maxVerifiedAt !== null ? toBusinessCalendarDay(new Date(maxVerifiedAt)) : null

  const stats: WingsGoScheduleStats = {
    openCount,
    tourCount: tourIds.size,
    pricedCount,
    nearestDay,
    yearRange,
    sharedDepartureCity,
    verifiedDay,
  }

  // Phase 1A: marketCards and initialFilters are placeholders
  const marketCards: WingsGoScheduleMarketCard[] = []
  const initialFilters: ScheduleFilters = {}

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
