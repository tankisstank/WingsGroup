import configPromise from '@payload-config'
import { getPayload } from 'payload'
import type { Payload, Where } from 'payload'

import type { Site } from '@/payload-types'
import { logOperationalEvent } from '@/observability'
import { getCurrentSite } from '@/utilities/siteContext'
import type { SupportedLocaleCode } from '@/utilities/sitePaths'

import {
  buildDiscoveryWhere,
  getDiscoverySEOPolicy,
  isDiscoveryCardMatch,
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
type DiscoveryLogger = Pick<Payload['logger'], 'info'>

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
    if (wrapperID == null) return { ...tour, wrapperPage: null }

    const verifiedWrapper = verifiedWrappers.get(String(wrapperID))
    return { ...tour, wrapperPage: verifiedWrapper ?? null }
  })

const queryDiscoveryCards = async ({
  locale,
  limit,
  payload,
  query,
  site,
}: {
  locale?: SupportedLocaleCode
  limit: number
  payload: Payload
  query: Omit<DiscoveryQuery, 'unknownValueCount'>
  site: Site
}): Promise<DiscoveryTourCard[]> => {
  const scopedWhere: Where = {
    and: [
      {
        site: {
          equals: site.id,
        },
      },
      buildDiscoveryWhere(query) as Where,
    ],
  }
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
      // Payload should enforce the same AND query. Keep a projection-level
      // contract guard so an adapter or array-query regression cannot broaden
      // the public result set.
      .filter((card) => isDiscoveryCardMatch(card, query)),
  )
}

const logDiscoveryCompleted = ({
  durationMs,
  logger,
  query,
  result,
  tenantCode,
  tenantOutcome,
}: {
  durationMs: number
  logger?: DiscoveryLogger
  query: DiscoveryQuery
  result: DiscoveryContext['result']
  tenantCode: string
  tenantOutcome: 'accepted' | 'rejected'
}): void => {
  const fields = {
    action: 'wingsside_discovery_completed',
    ...(query.destination ? { destination_code: query.destination } : {}),
    ...(query.duration ? { duration_code: query.duration } : {}),
    duration_ms: durationMs,
    invalid_filter_count: query.unknownValueCount,
    relaxed: result.relaxed ? result.relaxed.removed : null,
    result_count: result.total,
    source: 'journeys',
    ...(query.style ? { style_code: query.style } : {}),
    tenant_code: tenantCode,
    tenant_outcome: tenantOutcome,
  }

  if (logger) {
    logger.info(fields, 'wingsside_discovery_completed')
    return
  }

  logOperationalEvent('info', 'wingsside_discovery_completed', fields)
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
  const startedAt = performance.now()
  const site = await getCurrentSite()
  const query = normalizeDiscoveryQuery(input)
  const safeQuery = stripDiscoveryQueryMeta(query)
  const seo = getDiscoverySEOPolicy(query)

  if (site.code !== wingSideSiteCode) {
    const context = {
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
    logDiscoveryCompleted({
      durationMs: Math.round(performance.now() - startedAt),
      query,
      result: context.result,
      tenantCode: site.code,
      tenantOutcome: 'rejected',
    })
    return context
  }

  const payload = await getPayload({ config: configPromise })
  const exactItems = await queryDiscoveryCards({ locale, limit, payload, query: safeQuery, site })
  if (exactItems.length > 0 || serializeDiscoveryQuery(safeQuery) === '') {
    const context = {
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
    logDiscoveryCompleted({
      durationMs: Math.round(performance.now() - startedAt),
      logger: payload.logger,
      query,
      result: context.result,
      tenantCode: site.code,
      tenantOutcome: 'accepted',
    })
    return context
  }

  const context = {
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
  logDiscoveryCompleted({
    durationMs: Math.round(performance.now() - startedAt),
    logger: payload.logger,
    query,
    result: context.result,
    tenantCode: site.code,
    tenantOutcome: 'accepted',
  })
  return context
}
