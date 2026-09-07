import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { revalidatePath } from 'next/cache.js'

import { publicLocaleCodes, siteCodeToAliasMap } from '@/utilities/sitePaths'

const marketSlugByKey: Record<string, string> = {
  china: 'trung-quoc',
  japan: 'nhat-ban',
  korea: 'han-quoc',
}

const basePaths = ['/tour', '/thi-truong', '/campaign', '/lich-khoi-hanh']
export const wingsSideDiscoveryPaths = ['/', '/destinations', '/styles'] as const
const wingsSidePublicPrefix = `/${siteCodeToAliasMap['wing-side']}`

const revalidateLocalizedPath = (path: string) => {
  revalidatePath(path)

  for (const locale of publicLocaleCodes) {
    revalidatePath(`/${locale}${path === '/' ? '' : path}`.replace(/\/+/g, '/'))
  }
}

const revalidateMany = (paths: Array<null | string | undefined>) => {
  for (const path of paths) {
    if (!path) {
      continue
    }

    revalidateLocalizedPath(path)
  }
}

type Relation = number | string | { id?: number | string | null } | null | undefined

const relationID = (value: Relation) =>
  typeof value === 'number' || typeof value === 'string' ? value : value?.id ?? null

const homeSelectsTour = (page: { wingsSideHiFi?: unknown }, tourID: number | string) => {
  const home = (page.wingsSideHiFi as { home?: Record<string, unknown> } | undefined)?.home
  if (!home) return false
  const selections = [
    ...(Array.isArray(home.destinationTourSelections) ? home.destinationTourSelections : []),
    ...(Array.isArray(home.styleTourSelections) ? home.styleTourSelections : []),
    ...(Array.isArray(home.featuredJourneySelections) ? home.featuredJourneySelections : []),
  ] as Array<{ tour?: Relation }>
  return selections.some((selection) => String(relationID(selection?.tour)) === String(tourID))
}

/** Revalidate only the WingSide discovery surfaces that use a curated tour. */
export const revalidateWingSideDiscovery = () => {
  revalidateMany([...wingsSideDiscoveryPaths])
  for (const path of wingsSideDiscoveryPaths) {
    const suffix = path === '/' ? '' : path
    revalidatePath(`${wingsSidePublicPrefix}${suffix}`)
    for (const locale of publicLocaleCodes) {
      revalidatePath(`${wingsSidePublicPrefix}/${locale}${suffix}`)
    }
  }
}

const revalidateWingSideDiscoveryForTour = async ({
  payload,
  site,
  tourID,
}: {
  payload: Parameters<CollectionAfterChangeHook>[0]['req']['payload']
  site: Relation
  tourID: number | string
}) => {
  const siteID = relationID(site)
  if (siteID === null) return
  const pages = await payload.find({
    collection: 'pages' as never,
    depth: 0,
    limit: 2,
    pagination: false,
    where: {
      and: [
        { site: { equals: siteID } },
        { 'wingsSideHiFi.enabled': { equals: true } },
        { 'wingsSideHiFi.routeVariant': { equals: 'home' } },
      ],
    },
  })
  const selectedByWingSideHome = (pages.docs as Array<{ wingsSideHiFi?: unknown }>).some((page) => {
    const hifi = page.wingsSideHiFi as { enabled?: boolean; routeVariant?: string } | undefined
    return hifi?.enabled && hifi.routeVariant === 'home' && homeSelectsTour(page, tourID)
  })
  if (selectedByWingSideHome) revalidateWingSideDiscovery()
}

export const revalidateWingSideDiscoveryForTourDependency = async ({
  field,
  payload,
  value,
}: {
  field: 'heroMedia' | 'wrapperPage'
  payload: Parameters<CollectionAfterChangeHook>[0]['req']['payload']
  value: number | string
}) => {
  const tours = await payload.find({
    collection: 'tour-products' as never,
    depth: 0,
    limit: 1000,
    pagination: false,
    where: { [field]: { equals: value } },
  })
  await Promise.all(
    (tours.docs as Array<{ id: number | string; site?: Relation }>).map((tour) =>
      revalidateWingSideDiscoveryForTour({
        payload,
        site: tour.site,
        tourID: tour.id,
      }),
    ),
  )
}

export const revalidateTourProduct: CollectionAfterChangeHook = async ({
  doc,
  req: { payload, context },
}) => {
  if (context.disableRevalidate) {
    return doc
  }

  const campaignResult = await payload.find({
    collection: 'tour-campaigns' as never,
    depth: 0,
    limit: 20,
    pagination: false,
    where: {
      linkedTours: {
        in: [doc.id],
      },
    },
  })

  const campaignPaths = (campaignResult.docs as Array<{ slug?: string }>).map(
    (campaign) => `/campaign/${campaign.slug}`,
  )

  revalidateMany([
    ...basePaths,
    `/tour/${doc.slug}`,
    doc.market ? `/thi-truong/${marketSlugByKey[String(doc.market)]}` : null,
    ...campaignPaths,
  ])
  await revalidateWingSideDiscoveryForTour({ payload, site: doc.site as Relation, tourID: doc.id })

  return doc
}

export const revalidateTourProductDelete: CollectionAfterDeleteHook = async ({ doc, req: { context } }) => {
  if (!context.disableRevalidate) {
    revalidateMany([...basePaths, doc?.slug ? `/tour/${doc.slug}` : null])
    // Relationship cleanup may already have set the curated Page reference to
    // null by the time an afterDelete hook runs, so dependency lookup cannot
    // reliably find the deleted ID. Invalidate the small WingSide surface set.
    if (relationID(doc?.site as Relation) !== null) revalidateWingSideDiscovery()
  }

  return doc
}

export const revalidateTourDeparture: CollectionAfterChangeHook = async ({
  doc,
  req: { payload, context },
}) => {
  if (context.disableRevalidate) {
    return doc
  }

  const product =
    typeof doc.tourProduct === 'object' && doc.tourProduct
      ? doc.tourProduct
      : await payload.findByID({
          collection: 'tour-products' as never,
          depth: 0,
          id: doc.tourProduct,
        })

  const campaignResult = await payload.find({
    collection: 'tour-campaigns' as never,
    depth: 0,
    limit: 20,
    pagination: false,
    where: {
      or: [
        {
          featuredDepartures: {
            in: [doc.id],
          },
        },
        ...(product
          ? [
              {
                linkedTours: {
                  in: [product.id],
                },
              },
            ]
          : []),
      ],
    },
  })

  revalidateMany([
    ...basePaths,
    (product as { slug?: string } | null)?.slug ? `/tour/${(product as { slug?: string }).slug}` : null,
    (product as { market?: string } | null)?.market
      ? `/thi-truong/${marketSlugByKey[String((product as { market?: string }).market)]}`
      : null,
    ...(campaignResult.docs as Array<{ slug?: string }>).map((campaign) => `/campaign/${campaign.slug}`),
  ])

  return doc
}

export const revalidateTourDepartureDelete: CollectionAfterDeleteHook = ({ doc, req: { context } }) => {
  if (!context.disableRevalidate) {
    revalidateMany(basePaths)
  }

  return doc
}

export const revalidateTourVariant: CollectionAfterChangeHook = async ({
  doc,
  req: { payload, context },
}) => {
  if (context.disableRevalidate) {
    return doc
  }

  const product =
    typeof doc.tourProduct === 'object' && doc.tourProduct
      ? doc.tourProduct
      : await payload.findByID({
          collection: 'tour-products' as never,
          depth: 0,
          id: doc.tourProduct,
        })

  revalidateMany([
    ...basePaths,
    (product as { slug?: string } | null)?.slug ? `/tour/${(product as { slug?: string }).slug}` : null,
    (product as { market?: string } | null)?.market
      ? `/thi-truong/${marketSlugByKey[String((product as { market?: string }).market)]}`
      : null,
  ])

  return doc
}

export const revalidateTourVariantDelete: CollectionAfterDeleteHook = ({ doc, req: { context } }) => {
  if (!context.disableRevalidate) {
    revalidateMany(basePaths)
  }

  return doc
}

export const revalidateTourCampaign: CollectionAfterChangeHook = ({ doc, req: { context } }) => {
  if (!context.disableRevalidate) {
    revalidateMany([...basePaths, `/campaign/${doc.slug}`])
  }

  return doc
}

export const revalidateTourCampaignDelete: CollectionAfterDeleteHook = ({ doc, req: { context } }) => {
  if (!context.disableRevalidate) {
    revalidateMany([...basePaths, doc?.slug ? `/campaign/${doc.slug}` : null])
  }

  return doc
}
