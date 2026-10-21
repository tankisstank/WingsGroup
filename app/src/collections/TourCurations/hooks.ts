import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionBeforeChangeHook,
  CollectionBeforeDeleteHook,
} from 'payload'
import { revalidatePath } from 'next/cache.js'

import { publicLocaleCodes } from '@/utilities/sitePaths'
import { ensureRedisConnected, getSharedRedisClient } from '@/infrastructure/redis/client'

type Relation = number | string | { id?: number | string | null } | null | undefined

const relationID = (value: Relation): number | string | undefined => {
  if (typeof value === 'number' || typeof value === 'string') return value
  if (value && typeof value === 'object' && 'id' in value && value.id != null) return value.id
  return undefined
}

const relationIDs = (value: unknown): Array<number | string> =>
  (Array.isArray(value) ? value : [])
    .map((item) => relationID(item as Relation))
    .filter((id): id is number | string => id !== undefined)

/**
 * Ensures that for any given site, only one TourCurations record has `isDefault: true`.
 * If the current document is marked as default, all other curations of the same site
 * are updated to `isDefault: false`.
 */
export const enforceSingleDefaultPerSite: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  req,
}) => {
  if (data?.isDefault) {
    const rawSite = data.site ?? originalDoc?.site
    const siteID = relationID(rawSite as Relation)
    if (siteID) {
      const currentID = originalDoc?.id
      const existing = await req.payload.find({
        collection: 'tour-curations',
        depth: 0,
        limit: 100,
        overrideAccess: true,
        req,
        where: {
          and: [
            { site: { equals: siteID } },
            { isDefault: { equals: true } },
            ...(currentID ? [{ id: { not_equals: currentID } }] : []),
          ],
        },
      })

      for (const otherDoc of existing.docs) {
        await req.payload.update({
          collection: 'tour-curations',
          id: otherDoc.id,
          data: { isDefault: false },
          overrideAccess: true,
          req,
        })
      }
    }
  }
  return data
}

/**
 * Validates that curated tours do not exceed 6 items, contain no duplicate IDs,
 * and belong to the same site.
 */
export const validateTourCurationTours: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  req,
}) => {
  const rawSite = data?.site ?? originalDoc?.site
  const siteID = relationID(rawSite as Relation)
  const rawFeatured =
    data?.featuredTours !== undefined ? data?.featuredTours : originalDoc?.featuredTours
  const selectedIDs = relationIDs(rawFeatured)

  if (selectedIDs.length > 6) {
    throw new Error('Bộ sưu tập tour chỉ được chọn tối đa 6 tour nổi bật.')
  }

  const uniqueIDs = new Set(selectedIDs.map(String))
  if (uniqueIDs.size !== selectedIDs.length) {
    throw new Error('Không được chọn trùng lặp tour trong bộ sưu tập.')
  }

  if (selectedIDs.length > 0 && siteID) {
    const products = await req.payload.find({
      collection: 'tour-products',
      depth: 0,
      limit: selectedIDs.length,
      overrideAccess: true,
      pagination: false,
      req,
      where: {
        and: [{ id: { in: selectedIDs } }, { site: { equals: siteID } }],
      },
    })

    if (products.docs.length !== selectedIDs.length) {
      throw new Error('Tất cả các tour trong bộ sưu tập phải thuộc cùng site đã chọn.')
    }
  }

  return data
}

/**
 * Prevents accidental deletion of a curation if it is marked as default
 * or if it is actively bound to any page.
 */
export const preventCurationDelete: CollectionBeforeDeleteHook = async ({
  id,
  req,
}) => {
  try {
    const doc = await req.payload.findByID({
      collection: 'tour-curations',
      depth: 0,
      id,
      overrideAccess: true,
      req,
    })

    if (doc?.isDefault) {
      throw new Error('Không thể xóa bộ sưu tập đang được thiết lập làm mặc định của site. Vui lòng đặt bộ khác làm mặc định trước.')
    }

    const bindingPages = await req.payload.find({
      collection: 'pages',
      depth: 0,
      limit: 1,
      overrideAccess: true,
      pagination: false,
      req,
      where: {
        'wingsGoTourCatalog.curation': { equals: id },
      },
    })

    if (bindingPages.docs.length > 0) {
      const pagePath = bindingPages.docs[0]?.pathname || 'trang'
      throw new Error(`Không thể xóa bộ sưu tập vì đang được sử dụng bởi trang (${pagePath}). Vui lòng gỡ liên kết trước khi xóa.`)
    }
  } catch (err: any) {
    // If it's our deliberate validation error, re-throw it
    if (err?.message?.startsWith('Không thể xóa bộ sưu tập')) {
      throw err
    }
    // Otherwise allow during migrations or when table doesn't exist
  }
}

export const clearRedisCurationCache = async (siteID?: number | string) => {
  if (!process.env.REDIS_URL || siteID == null) return
  try {
    const redis = getSharedRedisClient()
    await ensureRedisConnected(redis)
    const pattern = `*wingsgo-curation:${siteID}:*`
    let cursor = '0'
    do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100)
      cursor = nextCursor
      if (keys.length > 0) {
        await redis.del(...keys)
      }
    } while (cursor !== '0')
  } catch {
    // Graceful fallback when Redis is unavailable or offline
  }
}

const safeRevalidatePath = (path: string) => {
  try {
    revalidatePath(path)
  } catch {
    // Gracefully ignore when executed outside Next.js static generation context
  }
}

const revalidateCurationSurfaces = async ({
  curationID,
  payload,
}: {
  curationID?: number | string
  payload: Parameters<CollectionAfterChangeHook>[0]['req']['payload']
}) => {
  // Revalidate common catalog and home surfaces
  safeRevalidatePath('/')
  safeRevalidatePath('/tour')
  for (const locale of publicLocaleCodes) {
    safeRevalidatePath(`/${locale}`)
    safeRevalidatePath(`/${locale}/tour`)
  }

  // Revalidate any pages binding this curation specifically
  if (curationID) {
    try {
      const bindingPages = await payload.find({
        collection: 'pages',
        depth: 0,
        limit: 1000,
        pagination: false,
        overrideAccess: true,
        where: {
          'wingsGoTourCatalog.curation': { equals: curationID },
        },
      })
      for (const page of bindingPages.docs) {
        if (page.pathname) {
          safeRevalidatePath(page.pathname)
          for (const locale of publicLocaleCodes) {
            safeRevalidatePath(`/${locale}${page.pathname}`)
          }
        }
      }
    } catch {
      // Ignore during initial migrations
    }
  }
}

export const revalidateTourCuration: CollectionAfterChangeHook = async ({
  doc,
  req: { context, payload },
}) => {
  if (context?.disableRevalidate) return doc
  const siteID = relationID(doc?.site as Relation)
  await clearRedisCurationCache(siteID)
  await revalidateCurationSurfaces({ curationID: doc?.id, payload })
  return doc
}

export const revalidateTourCurationDelete: CollectionAfterDeleteHook = async ({
  doc,
  req: { context, payload },
}) => {
  if (context?.disableRevalidate) return doc
  const siteID = relationID(doc?.site as Relation)
  await clearRedisCurationCache(siteID)
  await revalidateCurationSurfaces({ curationID: doc?.id, payload })
  return doc
}
