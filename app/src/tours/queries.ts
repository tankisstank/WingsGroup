import { normalizeEditorialBadges } from './editorialBadges'
import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { appendSiteWhere, getCurrentSite } from '@/utilities/siteContext'
import type { SupportedLocaleCode } from '@/utilities/sitePaths'
import {
  isConsultativeTourSiteCode,
  isRetailTourEnabledSiteCode,
  isStructuredTourDetailSiteCode,
} from '@/utilities/siteCapabilities'

import {
  defaultTourSectionOrder,
  defaultTourSectionVisibility,
  normalizeSectionIDs,
} from './sectionRegistry'
import type {
  DepartureCardViewModel,
  MarketPageViewModel,
  SchedulePageViewModel,
  TourCardViewModel,
  TourResolvedData,
} from './types'
import {
  filterDepartureVariants,
  getFutureDepartures,
  getLowestPrice,
  getNextDeparture,
  groupDeparturesByMonth,
  marketRouteSlugToKey,
  mergeTourVariant,
  normalizeTourPublicText,
  selectPublishableDepartures,
} from './utils'
import { isDepartureVerificationCurrent } from './departureCommerce'
import { normalizeGovernedTourPrice } from './currency'
import {
  buildTourTaxonomyWhere,
  type TourDestinationKey,
  type TourTravelStyleKey,
} from './taxonomy'
import { sanitizeWingSidePublicText } from './wingsSideTourViewModel'

const tourProductsCollection = 'tour-products' as never
const tourDeparturesCollection = 'tour-departures' as never
const tourCampaignsCollection = 'tour-campaigns' as never
const departureVariantsCollection = 'departure-variants' as never

export const scheduleTrustSignals = [
  'Giá công khai theo từng đợt mở bán',
  'Giữ chỗ sau khi sales xác nhận tồn chỗ',
  'Hỗ trợ visa, hồ sơ và điều phối trước ngày đi',
  'Điều hành gửi xác nhận trước khi chốt booking',
] as const

const sortDepartures = <T extends { departureDate?: null | string }>(departures: T[] = []) =>
  [...departures].sort((left, right) => {
    const leftTime = left.departureDate
      ? new Date(left.departureDate).getTime()
      : Number.MAX_SAFE_INTEGER
    const rightTime = right.departureDate
      ? new Date(right.departureDate).getTime()
      : Number.MAX_SAFE_INTEGER

    return leftTime - rightTime
  })

const queryCollection = async ({
  collection,
  depth = 2,
  draft,
  limit = 20,
  locale,
  fallbackLocale = locale === 'en' ? false : 'vi',
  page,
  pagination = false,
  populate,
  select,
  sort,
  where,
}: {
  collection: never
  depth?: number
  draft: boolean
  fallbackLocale?: SupportedLocaleCode | false
  limit?: number
  locale?: SupportedLocaleCode
  page?: number
  pagination?: boolean
  populate?: Record<string, unknown>
  select?: Record<string, unknown>
  sort?: string | string[]
  where: Record<string, unknown>
}): Promise<any> => {
  const payload = await getPayload({ config: configPromise })
  const scopedWhere = await appendSiteWhere(where as never)

  return payload.find({
    collection,
    depth,
    draft,
    fallbackLocale,
    limit,
    locale,
    overrideAccess: draft,
    pagination,
    where: scopedWhere,
    ...(page !== undefined && { page }),
    ...(populate && { populate }),
    ...(select && { select }),
    ...(sort && { sort }),
  } as any)
}


const asDoc = <T extends object>(value: T | number | string | null | undefined): T | null =>
  value && typeof value === 'object' ? value : null

const normalizeTourProductCard = (
  tour: Record<string, any> | number | string | null | undefined,
  locale?: SupportedLocaleCode,
) => {
  const doc = asDoc<Record<string, any>>(tour)

  if (!doc) {
    return tour || null
  }

  const { editorialBadges, hasHotEditorialBadge } = normalizeEditorialBadges(
    doc.editorialBadges,
    locale,
  )

  return {
    durationDays: doc.durationDays,
    durationNights: doc.durationNights,
    editorialBadges,
    hasHot: hasHotEditorialBadge,
    heroMedia: doc.heroMedia,
    id: doc.id,
    market: doc.market,
    marketCard: doc.marketCard || null,
    slug: doc.slug,
    summary: normalizeTourPublicText(sanitizeWingSidePublicText(doc.summary)),
    title: normalizeTourPublicText(sanitizeWingSidePublicText(doc.title)),
  }
}

const stringSet = (value: unknown): Set<string> =>
  new Set(
    (Array.isArray(value) ? value : [])
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
  )

const overlapCount = (left: Set<string>, right: Set<string>) => {
  let count = 0
  for (const value of left) {
    if (right.has(value)) count += 1
  }
  return count
}

/**
 * Deterministic fallback ranking for related journeys. Explicit CMS relations
 * bypass this function and always retain their configured order.
 */
export const rankRelatedTourFallbacks = (
  source: Record<string, any>,
  candidates: Record<string, any>[],
): Record<string, any>[] => {
  const sourceDestinations = stringSet(source.destinationTags)
  const sourceStyles = stringSet(source.travelStyles)
  const sourceDuration =
    typeof source.durationDays === 'number' && source.durationDays > 0 ? source.durationDays : null
  const sourceMarket = String(source.market || '')
    .trim()
    .toLowerCase()

  return [...candidates].sort((left, right) => {
    const destinationDelta =
      overlapCount(sourceDestinations, stringSet(right.destinationTags)) -
      overlapCount(sourceDestinations, stringSet(left.destinationTags))
    if (destinationDelta !== 0) return destinationDelta

    const regionDelta =
      Number(
        Boolean(sourceMarket) &&
          String(right.market || '')
            .trim()
            .toLowerCase() === sourceMarket,
      ) -
      Number(
        Boolean(sourceMarket) &&
          String(left.market || '')
            .trim()
            .toLowerCase() === sourceMarket,
      )
    if (regionDelta !== 0) return regionDelta

    const styleDelta =
      overlapCount(sourceStyles, stringSet(right.travelStyles)) -
      overlapCount(sourceStyles, stringSet(left.travelStyles))
    if (styleDelta !== 0) return styleDelta

    const durationDistance = (candidate: Record<string, any>) =>
      sourceDuration !== null &&
      typeof candidate.durationDays === 'number' &&
      candidate.durationDays > 0
        ? Math.abs(sourceDuration - candidate.durationDays)
        : Number.MAX_SAFE_INTEGER
    const durationDelta = durationDistance(left) - durationDistance(right)
    if (durationDelta !== 0) return durationDelta

    const stableKey = (candidate: Record<string, any>) =>
      String(candidate.slug || candidate.id || '')
        .trim()
        .toLowerCase()
    return stableKey(left).localeCompare(stableKey(right), 'en')
  })
}

export const selectRelatedTourCards = ({
  candidates,
  configured,
  source,
  locale,
}: {
  candidates: Record<string, any>[]
  configured: Record<string, any>[]
  source: Record<string, any>
  locale?: SupportedLocaleCode
}) =>
  configured.length > 0
    ? configured.slice(0, 3)
    : rankRelatedTourFallbacks(source, candidates)
        .map((item) => normalizeTourProductCard(item, locale))
        .filter(Boolean)
        .slice(0, 3)

const normalizeVariantCard = (
  variant: Record<string, any> | number | string | null | undefined,
  draft = false,
) => {
  const doc = asDoc<Record<string, any>>(variant)

  if (!doc) {
    return variant || null
  }

  // In public mode, variant must be active
  if (!draft && doc.status && doc.status !== 'active') {
    return null
  }

  return {
    id: doc.id,
    label: doc.label,
    variantKey: doc.variantKey,
  }
}

export const normalizeDepartureCard = (
  departure: Record<string, any>,
  draft = false,
  now?: Date,
  locale?: SupportedLocaleCode,
): DepartureCardViewModel => {
  const hasFreshnessGovernance = Boolean(departure.verifiedAt || departure.expiresAt)
  const commerceVerified =
    draft ||
    ((departure.commerceVerified === undefined || departure.commerceVerified === true) &&
      (hasFreshnessGovernance
        ? isDepartureVerificationCurrent(departure, now?.getTime())
        : departure.commerceVerified === true))
  const canPromote =
    commerceVerified &&
    (draft || hasFreshnessGovernance || departure.commerceVerified === true) &&
    departure.availabilityStatus !== 'sold-out' &&
    Boolean(normalizeGovernedTourPrice({ currency: departure.currency, value: departure.priceFrom }))
  const originalPrice =
    canPromote &&
    typeof departure.originalPrice === 'number' &&
    Number.isFinite(departure.originalPrice) &&
    departure.originalPrice > departure.priceFrom &&
    Boolean(departure.currency) &&
    (!departure.originalCurrency || departure.originalCurrency === departure.currency)
      ? departure.originalPrice
      : null

  return {
    airline: departure.airline,
    availabilityBadge: commerceVerified ? departure.availabilityBadge : null,
    availabilityStatus: commerceVerified ? departure.availabilityStatus : null,
    commerceVerified,
    ctaLabelOverride: commerceVerified ? departure.ctaLabelOverride : null,
    currency: departure.currency,
    departureCity: departure.departureCity,
    departureDate: departure.departureDate,
    depositNote: departure.depositNote,
    flightNumber: departure.flightNumber,
    holdNote: departure.holdNote,
    id: departure.id,
    isFeatured: departure.isFeatured,
    loyaltyPoints: commerceVerified ? departure.loyaltyPoints : null,
    note: departure.note,
    originalPrice,
    priceFrom: commerceVerified ? departure.priceFrom : null,
    promoLabel: canPromote ? departure.promoLabel : null,
    returnDate: departure.returnDate,
    tourProduct: normalizeTourProductCard(departure.tourProduct, locale),
    urgencyLabel: commerceVerified ? departure.urgencyLabel : null,
    variantRef: normalizeVariantCard(departure.variantRef, draft),
  }
}

export { mergeTourVariant }

export const getTourProductBySlug = async ({
  draft,
  fallbackLocale,
  locale,
  slug,
}: {
  draft: boolean
  fallbackLocale?: SupportedLocaleCode | false
  locale?: SupportedLocaleCode
  slug: string
}): Promise<any> => {
  const result = await queryCollection({
    collection: tourProductsCollection,
    depth: 2,
    draft,
    fallbackLocale,
    limit: 1,
    locale,
    where: {
      slug: {
        equals: slug,
      },
    },
  })

  return result.docs[0] || null
}

export const getTourProductsByTaxonomy = async ({
  destination,
  draft,
  fallbackLocale,
  limit = 20,
  locale,
  travelStyle,
}: {
  destination?: TourDestinationKey
  draft: boolean
  fallbackLocale?: SupportedLocaleCode | false
  limit?: number
  locale?: SupportedLocaleCode
  travelStyle?: TourTravelStyleKey
}) => {
  const result = await queryCollection({
    collection: tourProductsCollection,
    depth: 2,
    draft,
    fallbackLocale,
    limit,
    locale,
    where: buildTourTaxonomyWhere({ destination, travelStyle }),
  })

  return result.docs as any[]
}

export const getTourDeparturesForProduct = async ({
  draft,
  fallbackLocale,
  locale,
  tourProductId,
}: {
  draft: boolean
  fallbackLocale?: SupportedLocaleCode | false
  locale?: SupportedLocaleCode
  tourProductId: number | string
}): Promise<any[]> => {
  const result = await queryCollection({
    collection: tourDeparturesCollection,
    depth: 2,
    draft,
    fallbackLocale,
    limit: 50,
    locale,
    where: {
      tourProduct: {
        equals: tourProductId,
      },
    },
  })

  return sortDepartures(result.docs as any[])
    .map((departure) => normalizeDepartureCard(departure, draft, undefined, locale))
}

export const getDepartureVariantsForProduct = async ({
  draft,
  fallbackLocale,
  locale,
  tourProductId,
}: {
  draft: boolean
  fallbackLocale?: SupportedLocaleCode | false
  locale?: SupportedLocaleCode
  tourProductId: number | string
}) => {
  const result = await queryCollection({
    collection: departureVariantsCollection,
    depth: 2,
    draft,
    fallbackLocale,
    limit: 20,
    locale,
    where: {
      tourProduct: {
        equals: tourProductId,
      },
    },
  })

  return filterDepartureVariants(result.docs as any[], { draft })
}

export const getResolvedTourDetailBySlug = async ({
  draft,
  fallbackLocale,
  locale,
  slug,
}: {
  draft: boolean
  fallbackLocale?: SupportedLocaleCode | false
  locale?: SupportedLocaleCode
  slug: string
}): Promise<TourResolvedData | null> => {
  const tour = await getTourProductBySlug({
    draft,
    fallbackLocale,
    locale,
    slug,
  })

  if (!tour) {
    return null
  }

  const departures = await getTourDeparturesForProduct({
    draft,
    fallbackLocale,
    locale,
    tourProductId: tour.id,
  })

  const variants = await getDepartureVariantsForProduct({
    draft,
    fallbackLocale,
    locale,
    tourProductId: tour.id,
  })

  const featuredVariant =
    variants.find((variant) => variant.status === 'active' && variant.displayPriority === 0) ||
    variants.find((variant) => variant.status === 'active') ||
    (draft ? variants[0] || null : null)

  const resolved = mergeTourVariant({
    tour,
    variant: featuredVariant,
  })

  const resolvedTour = resolved.tour as Record<string, any>
  const configuredRelated = Array.isArray(resolvedTour.relatedTours)
    ? resolvedTour.relatedTours.filter((item: unknown) => item && typeof item === 'object')
    : []
  const relatedResult = configuredRelated.length
    ? null
    : await queryCollection({
        collection: tourProductsCollection,
        depth: 2,
        draft,
        fallbackLocale,
        limit: 100,
        locale,
        where: {
          and: [{ id: { not_equals: tour.id } }, { wrapperPage: { exists: true } }],
        },
      })
  const relatedTours = selectRelatedTourCards({
    candidates: relatedResult?.docs || [],
    configured: configuredRelated,
    source: resolvedTour,
    locale,
  })

  const validPublicDepartures = selectPublishableDepartures(departures, { draft })
  const featuredDepartures = validPublicDepartures.filter(
    (departure) => departure.isFeatured || departure.availabilityStatus === 'open',
  )

  return {
    builderConfig: resolved.builderConfig,
    departures: draft ? departures : getFutureDepartures(departures),
    featuredDepartures:
      featuredDepartures.length > 0
        ? featuredDepartures
        : validPublicDepartures.slice(0, 4),
    nextDeparture: getNextDeparture(validPublicDepartures),
    sectionOrder: resolved.sectionOrder,
    sectionVisibility: resolved.sectionVisibility,
    tour: {
      ...resolvedTour,
      relatedTours,
    },
    variants,
  }
}

export const selectMarketNextDeparture = (
  linkedFuture: DepartureCardViewModel[],
  linkedVisible: DepartureCardViewModel[],
): DepartureCardViewModel | null => {
  const preferredCommercialDeparture = linkedFuture.find(
    (departure) =>
      departure.commerceVerified === true &&
      departure.availabilityStatus !== 'sold-out' &&
      Boolean(
        normalizeGovernedTourPrice({
          currency: departure.currency,
          value: departure.priceFrom,
        }),
      ),
  )

  return preferredCommercialDeparture || getNextDeparture(linkedVisible)
}

export const getToursByMarketRoute = async ({
  draft,
  locale,
  marketRouteSlug,
}: {
  draft: boolean
  locale?: SupportedLocaleCode
  marketRouteSlug: string
}): Promise<MarketPageViewModel | null> => {
  const marketKey = marketRouteSlugToKey[marketRouteSlug]

  if (!marketKey) {
    return null
  }

  const toursResult = await queryCollection({
    collection: tourProductsCollection,
    depth: 2,
    draft,
    fallbackLocale: locale === 'en' ? false : 'vi',
    limit: 20,
    locale,
    where: {
      market: {
        equals: marketKey,
      },
    },
  })

  const departuresResult = await queryCollection({
    collection: tourDeparturesCollection,
    depth: 2,
    draft,
    fallbackLocale: locale === 'en' ? false : 'vi',
    limit: 100,
    locale,
    where: {
      tourProduct: {
        in: (toursResult.docs as any[]).map((tour) => tour.id),
      },
    },
  })

  const allDepartures = sortDepartures(departuresResult.docs as any[]).map((departure) =>
    normalizeDepartureCard(departure, draft, undefined, locale),
  )
  const futureDepartures = sortDepartures(getFutureDepartures(allDepartures))
  const visibleDepartures = futureDepartures.length > 0 ? futureDepartures : allDepartures

  return {
    departures: visibleDepartures,
    marketKey,
    tours: (toursResult.docs as any[]).map((tour): TourCardViewModel => {
      const linkedAll = allDepartures.filter((departure) => {
        const relation =
          typeof departure.tourProduct === 'object'
            ? departure.tourProduct?.id
            : departure.tourProduct

        return String(relation) === String(tour.id)
      })
      const linkedFuture = getFutureDepartures(linkedAll)
      const hasFutureDepartures = linkedFuture.length > 0
      const linkedVisible = hasFutureDepartures ? linkedFuture : linkedAll

      const { editorialBadges, hasHotEditorialBadge } = normalizeEditorialBadges(
        tour.editorialBadges,
        locale,
      )

      return {
        ...tour,
        departureCount: linkedVisible.length,
        editorialBadges,
        hasFutureDepartures,
        hasHotEditorialBadge: Boolean(hasHotEditorialBadge),
        lowestPrice: getLowestPrice(linkedVisible),
        nextDeparture: selectMarketNextDeparture(linkedFuture, linkedVisible),
      }
    }),
  }
}

export const getTourCampaignBySlug = async ({
  draft,
  locale,
  slug,
}: {
  draft: boolean
  locale?: SupportedLocaleCode
  slug: string
}): Promise<any> => {
  const result = await queryCollection({
    collection: tourCampaignsCollection,
    depth: 3,
    draft,
    limit: 1,
    locale,
    where: {
      slug: {
        equals: slug,
      },
    },
  })

  const campaign = (result.docs as any[])[0]

  if (!campaign) {
    return null
  }

  const linkedTourIDs =
    campaign.linkedTours
      ?.map((tour: { id?: number | string } | number | string) =>
        typeof tour === 'object' ? tour?.id : tour,
      )
      .filter(Boolean) || []

  const departureResult = await queryCollection({
    collection: tourDeparturesCollection,
    depth: 2,
    draft,
    limit: 100,
    locale,
    where: {
      tourProduct: {
        in: linkedTourIDs,
      },
    },
  })

  return {
    campaign,
    departures: sortDepartures(departureResult.docs as any[]).map((departure) =>
      normalizeDepartureCard(departure, draft, undefined, locale),
    ),
  }
}

export const getResolvedScheduleData = async ({
  draft,
  locale,
}: {
  draft: boolean
  locale?: SupportedLocaleCode
}): Promise<SchedulePageViewModel> => {
  const result = await queryCollection({
    collection: tourDeparturesCollection,
    depth: 3,
    draft,
    limit: 200,
    locale,
    where: {},
  })

  const departures = sortDepartures(result.docs as any[]).map((departure) =>
    normalizeDepartureCard(departure, draft, undefined, locale),
  )
  const futureDepartures = getFutureDepartures(departures)
  const visibleDepartures = futureDepartures.length > 0 ? futureDepartures : departures
  const featuredDepartures = visibleDepartures
    .filter((departure) => departure.isFeatured)
    .slice(0, 6)
  const markets = new Set(
    visibleDepartures
      .map((departure) => {
        const product = asDoc<Record<string, any>>(departure.tourProduct)

        return product?.market ? String(product.market) : null
      })
      .filter((value): value is string => Boolean(value)),
  )
  const airlines = new Set(
    visibleDepartures
      .map((departure) => departure.airline)
      .filter((value): value is string => Boolean(value)),
  )
  const statuses = new Set(
    visibleDepartures
      .map((departure) => departure.availabilityStatus)
      .filter((value): value is string => Boolean(value)),
  )

  return {
    departures: visibleDepartures,
    featuredDepartures:
      featuredDepartures.length > 0 ? featuredDepartures : visibleDepartures.slice(0, 6),
    filtersSeed: {
      airlines: Array.from(airlines),
      markets: Array.from(markets),
      statuses: Array.from(statuses),
    },
    groupedDepartures: groupDeparturesByMonth(visibleDepartures),
    heroStats: {
      lowestPrice: getLowestPrice(visibleDepartures),
      nextDeparture: getNextDeparture(departures),
      openCount: visibleDepartures.length,
    },
    trustSignals: [...scheduleTrustSignals],
  }
}

export const getSiteScheduleData = async ({
  draft,
  locale,
}: {
  draft: boolean
  locale?: SupportedLocaleCode
}): Promise<any[]> => {
  const schedule = await getResolvedScheduleData({
    draft,
    locale,
  })

  return schedule.departures
}

export const isWingsGoSite = async () => {
  const site = await getCurrentSite()

  return isRetailTourEnabledSiteCode(site?.code)
}

/** True when the current tenant may render structured tour detail pages. */
export const isStructuredTourDetailSite = async () => {
  const site = await getCurrentSite()

  return isStructuredTourDetailSiteCode(site?.code)
}

/** True for Wingside-style private/consultative tour UX (not retail hold-seat). */
export const isConsultativeTourSite = async () => {
  const site = await getCurrentSite()

  return isConsultativeTourSiteCode(site?.code)
}
