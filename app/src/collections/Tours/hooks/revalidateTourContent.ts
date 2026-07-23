import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { revalidatePath } from 'next/cache.js'

import { publicLocaleCodes } from '@/utilities/sitePaths'

const marketSlugByKey: Record<string, string> = {
  china: 'trung-quoc',
  japan: 'nhat-ban',
  korea: 'han-quoc',
}

const basePaths = ['/tour', '/thi-truong', '/campaign', '/lich-khoi-hanh']

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

  return doc
}

export const revalidateTourProductDelete: CollectionAfterDeleteHook = ({ doc, req: { context } }) => {
  if (!context.disableRevalidate) {
    revalidateMany([...basePaths, doc?.slug ? `/tour/${doc.slug}` : null])
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
