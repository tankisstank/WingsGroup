import configPromise from '@payload-config'
import { getPayload } from 'payload'
import type { Where } from 'payload'

import type { Site } from '@/payload-types'
import { appendSiteWhere, getCurrentSite } from '@/utilities/siteContext'
import type { SupportedLocaleCode } from '@/utilities/sitePaths'

import {
  buildDiscoveryRelaxationPlan,
  buildDiscoveryWhere,
  getDiscoverySEOPolicy,
  isDurationMatch,
  normalizeDiscoveryQuery,
  projectDiscoveryTour,
  serializeDiscoveryQuery,
  sortProjectedDiscoveryCards,
  stripDiscoveryQueryMeta,
  type DiscoveryContext,
  type DiscoveryQuery,
  type DiscoveryTourCard,
  type DiscoveryTourDoc,
} from './discoveryCore'

export * from './discoveryCore'

const tourProductsCollection = 'tour-products' as never
const wingSideSiteCode = 'wing-side'

const discoveryTourSelect = {
  _status: true,
  destinationTags: true,
  durationDays: true,
  durationNights: true,
  heroMedia: {
    alt: true,
    site: true,
    url: true,
  },
  site: true,
  slug: true,
  summary: true,
  title: true,
  travelStyles: true,
  wrapperPage: {
    _status: true,
    pathname: true,
    site: true,
    slug: true,
  },
}
const queryDiscoveryCards = async ({
  locale,
  limit,
  query,
  site,
}: {
  locale?: SupportedLocaleCode
  limit: number
  query: Omit<DiscoveryQuery, 'unknownValueCount'>
  site: Site
}): Promise<DiscoveryTourCard[]> => {
  const payload = await getPayload({ config: configPromise })
  const scopedWhere = await appendSiteWhere(buildDiscoveryWhere(query) as Where)
  const result = await payload.find({
    collection: tourProductsCollection,
    depth: 1,
    draft: false,
    fallbackLocale: false,
    limit,
    locale,
    overrideAccess: false,
    pagination: false,
    select: discoveryTourSelect as never,
    sort: ['durationDays', 'id'] as never,
    where: scopedWhere,
  })

  return sortProjectedDiscoveryCards(
    (result.docs as DiscoveryTourDoc[])
      .map((tour) => projectDiscoveryTour({ locale, site, tour }))
      .filter((card): card is DiscoveryTourCard => Boolean(card))
      .filter((card) => isDurationMatch(card.duration.days, query.duration)),
  )
}

export const getWingSideDiscoveryContext = async ({
  input,
  limit = 60,
  locale,
}: {
  input?: URLSearchParams | Record<string, string | string[] | null | undefined>
  limit?: number
  locale?: SupportedLocaleCode
} = {}): Promise<DiscoveryContext> => {
  const site = await getCurrentSite()
  const query = normalizeDiscoveryQuery(input)
  const safeQuery = stripDiscoveryQueryMeta(query)
  const seo = getDiscoverySEOPolicy(query)

  if (site.code !== wingSideSiteCode) {
    return {
      query,
      result: {
        appliedQuery: safeQuery,
        items: [],
        relaxed: null,
        total: 0,
        unknownValueCount: query.unknownValueCount,
      },
      seo,
    }
  }

  const exactItems = await queryDiscoveryCards({ locale, limit, query: safeQuery, site })
  if (exactItems.length > 0 || serializeDiscoveryQuery(safeQuery) === '') {
    return {
      query,
      result: {
        appliedQuery: safeQuery,
        items: exactItems,
        relaxed: null,
        total: exactItems.length,
        unknownValueCount: query.unknownValueCount,
      },
      seo,
    }
  }

  for (const relaxed of buildDiscoveryRelaxationPlan(query)) {
    const items = await queryDiscoveryCards({ locale, limit, query: relaxed.query, site })
    if (items.length === 0) continue
    return {
      query,
      result: {
        appliedQuery: relaxed.query,
        items,
        relaxed,
        total: items.length,
        unknownValueCount: query.unknownValueCount,
      },
      seo,
    }
  }

  return {
    query,
    result: {
      appliedQuery: safeQuery,
      items: [],
      relaxed: null,
      total: 0,
      unknownValueCount: query.unknownValueCount,
    },
    seo,
  }
}
