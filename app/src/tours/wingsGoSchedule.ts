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

export * from './wingsGoScheduleModel'
import {
  type ScheduleMoney,
  type ScheduleSnapshotFacts,
  type WingsGoScheduleTour,
  type WingsGoScheduleRow,
  type WingsGoScheduleMarketCard,
  type WingsGoScheduleStats,
  type WingsGoScheduleSnapshot,
  asDoc,
  buildSearchText,
  buildScheduleMonths,
  compareScheduleIds,
  deriveScheduleAvailability,
  getScheduleMarketLabel,
  parseScheduleFilters,
} from './wingsGoScheduleModel'

const tourDeparturesCollection = 'tour-departures' as never

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
 * F2: Build a single schedule row from normalized departure doc and tour info.
 */
export const buildScheduleRow = ({
  doc,
  tour,
  now = new Date(),
  copy,
  draft = false,
  locale = 'vi',
}: {
  doc: Record<string, any>
  tour: Pick<WingsGoScheduleTour, 'id' | 'slug' | 'title' | 'market'>
  now?: Date
  copy: ReturnType<typeof getWingsGoScheduleCopy>
  draft?: boolean
  locale?: 'vi' | 'en'
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

  const ctaLabel = canHoldSeatValue
    ? doc.ctaLabelOverride || copy.ctaHoldSeat
    : copy.ctaRequestQuote
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
  // Urgency copy ("Ưu tiên giữ chỗ sớm") only makes sense when the seat can be held.
  const urgencyLabel = canHoldSeatValue ? doc.urgencyLabel || null : null
  const resolvedLocale = locale || (copy.marketOther === 'Other destinations' ? 'en' : 'vi')
  const marketLabel = getScheduleMarketLabel(tour.market, resolvedLocale, copy)
  const searchText = buildSearchText(
    tour.title,
    tour.market,
    airlineEntry?.label || null,
    marketLabel,
  )

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
  const resolvedLocale = locale === 'en' ? 'en' : 'vi'
  const copy = getWingsGoScheduleCopy(resolvedLocale)
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

  // EN reads departures strictly so VI marketing copy (promo, urgency, badge, CTA) never
  // leaks. Airline and departure city are facts, not copy: fill them from the VI record
  // of the same departure so EN rows keep their airline, city code and airline filter.
  if (locale === 'en') {
    const missingFactIds = allDocs
      .filter((doc) => !doc.airline || !doc.departureCity)
      .map((doc) => doc.id)
    for (let offset = 0; offset < missingFactIds.length; offset += batchSize) {
      const viFacts = await payload.find({
        collection: tourDeparturesCollection,
        depth: 0,
        draft,
        limit: batchSize,
        locale: 'vi' as any,
        overrideAccess: draft,
        pagination: false,
        select: { airline: true, departureCity: true } as any,
        where: {
          and: [
            scopedWhere as any,
            { id: { in: missingFactIds.slice(offset, offset + batchSize) } },
          ],
        },
      })
      const factsById = new Map(
        ((viFacts.docs || []) as any[]).map((fact) => [String(fact.id), fact]),
      )
      for (const doc of allDocs) {
        const fact = factsById.get(String(doc.id))
        if (!fact) continue
        if (!doc.airline && fact.airline) doc.airline = fact.airline
        if (!doc.departureCity && fact.departureCity) doc.departureCity = fact.departureCity
      }
    }
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
      locale: resolvedLocale,
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
  // A market with no holdable departure gets no card (handoff §3.8); no fallback to unverified ones.
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
      const tourId = String(
        doc.tourProduct && typeof doc.tourProduct === 'object' ? doc.tourProduct.id : doc.tourProduct,
      )
      const tour = toursMap[tourId]
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
