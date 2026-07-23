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
  getFutureDepartures,
  getLowestPrice,
  getNextDeparture,
  groupDeparturesByMonth,
  marketRouteSlugToKey,
} from './utils'

const tourProductsCollection = 'tour-products' as never
const tourDeparturesCollection = 'tour-departures' as never
const tourCampaignsCollection = 'tour-campaigns' as never
const departureVariantsCollection = 'departure-variants' as never

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
  fallbackLocale,
  limit = 20,
  locale,
  where,
}: {
  collection: never
  depth?: number
  draft: boolean
  fallbackLocale?: SupportedLocaleCode | false
  limit?: number
  locale?: SupportedLocaleCode
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
    pagination: false,
    where: scopedWhere,
  })
}

const asDoc = <T extends object>(value: T | number | string | null | undefined): T | null =>
  value && typeof value === 'object' ? value : null

const normalizeTourProductCard = (
  tour: Record<string, any> | number | string | null | undefined,
) => {
  const doc = asDoc<Record<string, any>>(tour)

  if (!doc) {
    return tour || null
  }

  return {
    durationDays: doc.durationDays,
    durationNights: doc.durationNights,
    heroMedia: doc.heroMedia,
    id: doc.id,
    market: doc.market,
    marketCard: doc.marketCard || null,
    slug: doc.slug,
    summary: doc.summary,
    title: doc.title,
  }
}

const normalizeVariantCard = (
  variant: Record<string, any> | number | string | null | undefined,
) => {
  const doc = asDoc<Record<string, any>>(variant)

  if (!doc) {
    return variant || null
  }

  return {
    id: doc.id,
    label: doc.label,
    variantKey: doc.variantKey,
  }
}

const normalizeDepartureCard = (departure: Record<string, any>): DepartureCardViewModel => ({
  airline: departure.airline,
  availabilityBadge: departure.availabilityBadge,
  availabilityStatus: departure.availabilityStatus,
  ctaLabelOverride: departure.ctaLabelOverride,
  currency: departure.currency,
  departureCity: departure.departureCity,
  departureDate: departure.departureDate,
  depositNote: departure.depositNote,
  holdNote: departure.holdNote,
  id: departure.id,
  isFeatured: departure.isFeatured,
  note: departure.note,
  priceFrom: departure.priceFrom,
  promoLabel: departure.promoLabel,
  returnDate: departure.returnDate,
  tourProduct: normalizeTourProductCard(departure.tourProduct),
  urgencyLabel: departure.urgencyLabel,
  variantRef: normalizeVariantCard(departure.variantRef),
})

const mergeTourVariant = ({
  tour,
  variant,
}: {
  tour: Record<string, any>
  variant?: null | Record<string, any>
}) => {
  if (!variant) {
    return {
      builderConfig: tour.bcfg || null,
      sectionOrder: normalizeSectionIDs(tour.sectionOrder || defaultTourSectionOrder),
      sectionVisibility: normalizeSectionIDs(
        tour.sectionVisibility || defaultTourSectionVisibility,
      ),
      tour,
    }
  }

  const itineraryDays = Array.isArray(tour.itineraryDays) ? [...tour.itineraryDays] : []
  const overrides = Array.isArray(variant.itineraryDayOverrides)
    ? variant.itineraryDayOverrides
    : []

  for (const override of overrides) {
    const index = itineraryDays.findIndex(
      (day) => String(day.dayNumber) === String(override.dayNumber),
    )

    if (index >= 0) {
      itineraryDays[index] = {
        ...itineraryDays[index],
        ...Object.fromEntries(
          Object.entries(override).filter(
            ([, value]) => value !== null && value !== undefined && value !== '',
          ),
        ),
      }
    }
  }

  const variantRouteViz = variant.rvo || {}
  const routeViz = {
    ...(tour.routeViz || {}),
    ...variantRouteViz,
    stops: variantRouteViz.st || variantRouteViz.stops || tour.routeViz?.stops || [],
  }

  const servicesSummary = {
    ...(tour.servicesSummary || {}),
    ...(variant.servicesOverride || {}),
  }

  const mergedTour = {
    ...tour,
    summary: variant.summaryOverride || tour.summary,
    heroMedia: variant.heroMediaOverride || tour.heroMedia,
    itineraryDays,
    routeViz,
    servicesSummary,
    variantLabel: variant.label || null,
    variantMeta: variant,
  }

  return {
    builderConfig: tour.bcfg || null,
    sectionOrder: normalizeSectionIDs(tour.sectionOrder || defaultTourSectionOrder),
    sectionVisibility: normalizeSectionIDs(tour.sectionVisibility || defaultTourSectionVisibility),
    tour: mergedTour,
  }
}

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

  return (result.docs as any[])
    .filter((variant) => variant.status !== 'archived')
    .sort((left, right) => Number(left.displayPriority || 0) - Number(right.displayPriority || 0))
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
    variants[0] ||
    null

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
        limit: 3,
        locale,
        where: {
          and: [
            { id: { not_equals: tour.id } },
            { market: { equals: tour.market } },
            { wrapperPage: { exists: true } },
          ],
        },
      })
  const relatedTours = configuredRelated.length
    ? configuredRelated.slice(0, 3)
    : (relatedResult?.docs || []).map(normalizeTourProductCard).filter(Boolean).slice(0, 3)

  const featuredDepartures = getFutureDepartures(
    departures.filter(
      (departure) => departure.isFeatured || departure.availabilityStatus === 'open',
    ),
  )

  return {
    builderConfig: resolved.builderConfig,
    departures,
    featuredDepartures:
      featuredDepartures.length > 0
        ? featuredDepartures
        : getFutureDepartures(departures).slice(0, 4),
    nextDeparture:
      getNextDeparture(departures) ||
      (typeof tour.priceFrom === 'number'
        ? { priceFrom: tour.priceFrom, currency: tour.currency || 'USD' }
        : null),
    sectionOrder: resolved.sectionOrder,
    sectionVisibility: resolved.sectionVisibility,
    tour: {
      ...resolvedTour,
      relatedTours,
    },
    variants,
  }
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
    limit: 100,
    locale,
    where: {
      tourProduct: {
        in: (toursResult.docs as any[]).map((tour) => tour.id),
      },
    },
  })

  const allDepartures = sortDepartures(departuresResult.docs as any[]).map(normalizeDepartureCard)
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

      return {
        ...tour,
        departureCount: linkedVisible.length,
        hasFutureDepartures,
        lowestPrice: getLowestPrice(linkedVisible),
        nextDeparture: getNextDeparture(linkedVisible),
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
    departures: sortDepartures(departureResult.docs as any[]).map(normalizeDepartureCard),
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

  const departures = sortDepartures(result.docs as any[]).map(normalizeDepartureCard)
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
    trustSignals: [
      'Gi├í c├┤ng khai theo tß╗½ng ─æß╗út mß╗ƒ b├ín',
      'Giß╗» chß╗ù sau khi sales x├íc nhß║¡n tß╗ôn chß╗ù',
      'Hß╗ù trß╗ú visa, hß╗ô s╞í v├á ─æiß╗üu phß╗æi tr╞░ß╗¢c ng├áy ─æi',
      '─Éiß╗üu h├ánh gß╗ìi x├íc nhß║¡n tr╞░ß╗¢c khi chß╗æt booking',
    ],
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
