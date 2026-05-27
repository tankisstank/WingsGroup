import configPromise from '@payload-config'
import { type DataFromGlobalSlug, getPayload, type GlobalSlug } from 'payload'
import { unstable_cache } from 'next/cache'

async function getGlobal<T extends GlobalSlug>(slug: T, depth = 0): Promise<DataFromGlobalSlug<T>> {
  const payload = await getPayload({ config: configPromise })

  const global = await payload.findGlobal({
    slug,
    depth,
  })

  return global
}

/**
 * Returns a unstable_cache function mapped with the cache tag for the slug
 */
export const getCachedGlobal = <T extends GlobalSlug>(slug: T, depth = 0) =>
  unstable_cache(async () => getGlobal<T>(slug, depth), [slug], {
    tags: [`global_${slug}`],
  })
