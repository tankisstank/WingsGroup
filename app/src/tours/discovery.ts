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
  type DiscoveryPage,
  type DiscoveryQuery,
  type DiscoveryTourCard,
  type DiscoveryTourDoc,
  type RelationID,
} from './discoveryCore'

export * from './discoveryCore'

const pagesCollection = 'pages' as never
const tourProductsCollection = 'tour-products' as never
const wingSideSiteCode = 'wing-side'

type VerifiedWrapperPage = DiscoveryPage & { _status: 'published'; site: Site }

const getRelationID = (
  value: DiscoveryTourDoc['wrapperPage'] | DiscoveryPage | null | undefined,
): RelationID | null => {
  if (typeof value === 'number' || typeof value === 'string') return value
  if (value && (typeof value.id === 'number' || typeof value.id === 'string')) return value.id
  return null
}

const verifyWrapperPages = async ({
  locale,
  payload,
  site,
  tours,
}: {
  locale?: SupportedLocaleCode
  payload: Awaited<ReturnType<typeof getPayload>>
  site: Site
  tours: DiscoveryTourDoc[]
}): Promise<Map<string, VerifiedWrapperPage>> => {
  const wrapperIDs = [
    ...new Set(
      tours
        .map((tour) => getRelationID(tour.wrapperPage))
        .filter((id): id is RelationID => id != null),
    ),
  ]

  if (wrapperIDs.length === 0) return new Map()

  const result = await payload.find({
    collection: pagesCollection,
    depth: 0,
    draft: false,
    fallbackLocale: false,
    limit: wrapperIDs.length,
    locale,
    overrideAccess: false,
    pagination: false,
    select: {
      id: true,
      pathname: true,
      slug: true,
    } as never,
    where: {
      and: [
        { id: { in: wrapperIDs } },
        { site: { equals: site.id } },
        { _status: { equals: 'published' } },
      ],
    },
  })

  return new Map(
    (result.docs as DiscoveryPage[]).flatMap((page) => {
      const id = getRelationID(page)
      if (id == null) return []
      return [[String(id), { ...page, _status: 'published' as const, site }]]
    }),
  )
}

const withVerifiedWrapperPages = (
  tours: DiscoveryTourDoc[],
  verifiedWrappers: Map<string, VerifiedWrapperPage>,
): DiscoveryTourDoc[] =>
  tours.map((tour) => {
    const wrapperID = getRelationID(tour.wrapperPage)
    const verifiedWrapper = wrapperID == null ? null : verifiedWrappers.get(String(wrapperID))

    return verifiedWrapper ? { ...tour, wrapperPage: verifiedWrapper } : tour
  })

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
    depth: 2,
    draft: false,
    fallbackLocale: false,
    limit,
    locale,
    overrideAccess: false,
    pagination: false,
    sort: ['durationDays', 'id'] as never,
    where: scopedWhere,
  })

  const candidateTours = result.docs as DiscoveryTourDoc[]
  const verifiedWrappers = await verifyWrapperPages({
    locale,
    payload,
    site,
    tours: candidateTours,
  })

  return sortProjectedDiscoveryCards(
    withVerifiedWrapperPages(candidateTours, verifiedWrappers)
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
