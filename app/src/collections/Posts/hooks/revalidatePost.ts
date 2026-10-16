import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, Payload } from 'payload'

import { revalidatePath, revalidateTag } from 'next/cache.js'

import type { Post } from '../../../payload-types'
import { publicLocaleCodes } from '@/utilities/sitePaths'
import { getPostCanonicalPath } from '@/utilities/siteURLs'
import {
  WINGSGROUP_EDITORIAL_ARCHIVE_PATH,
  getWingsGroupEditorialPostPath,
} from '@/utilities/wingsGroupEditorial'
import { WINGSGROUP_SITE_CODE } from '@/wingsgroup/corporateRoutes'

const isWingsGroupPost = async (doc?: Post | null, payload?: Payload | null): Promise<boolean> => {
  if (!doc) return false
  const site = doc.site
  if (site && typeof site === 'object' && 'code' in site) {
    return site.code === WINGSGROUP_SITE_CODE
  }
  const siteID = typeof site === 'number' || typeof site === 'string' ? site : null
  if (!siteID || !payload) return false
  try {
    const siteDoc = await payload.findByID({ collection: 'sites', id: siteID, depth: 0 })
    return siteDoc?.code === WINGSGROUP_SITE_CODE
  } catch {
    return false
  }
}

const revalidatePostPaths = (slug?: null | string, isWingsGroup = false) => {
  const path = getPostCanonicalPath(slug)

  revalidatePath(path)

  for (const locale of publicLocaleCodes) {
    revalidatePath(getPostCanonicalPath(slug, locale))
  }

  if (isWingsGroup) {
    const editorialPath = getWingsGroupEditorialPostPath(slug)
    revalidatePath(editorialPath)
    revalidatePath(WINGSGROUP_EDITORIAL_ARCHIVE_PATH)

    for (const locale of publicLocaleCodes) {
      revalidatePath(`/${locale}${editorialPath}`.replace(/\/+/g, '/'))
      revalidatePath(`/${locale}${WINGSGROUP_EDITORIAL_ARCHIVE_PATH}`.replace(/\/+/g, '/'))
    }
  }

  return path
}

export const revalidatePost: CollectionAfterChangeHook<Post> = async ({
  doc,
  previousDoc,
  req: { payload, context },
}) => {
  if (!context.disableRevalidate) {
    const isWingsGroup =
      (await isWingsGroupPost(doc, payload)) ||
      (previousDoc ? await isWingsGroupPost(previousDoc, payload) : false)

    if (doc._status === 'published') {
      const path = revalidatePostPaths(doc.slug, isWingsGroup)

      payload.logger.info(`Revalidating post at path: ${path}`)

      revalidateTag('posts-sitemap', 'max')
    }

    // If the post was previously published, we need to revalidate the old path
    if (previousDoc._status === 'published' && doc._status !== 'published') {
      const oldPath = revalidatePostPaths(previousDoc.slug, isWingsGroup)

      payload.logger.info(`Revalidating old post at path: ${oldPath}`)

      revalidateTag('posts-sitemap', 'max')
    }
  }
  return doc
}

export const revalidateDelete: CollectionAfterDeleteHook<Post> = async ({
  doc,
  req: { context, payload },
}) => {
  if (!context.disableRevalidate) {
    const isWingsGroup = await isWingsGroupPost(doc, payload)
    revalidatePostPaths(doc?.slug, isWingsGroup)

    revalidateTag('posts-sitemap', 'max')
  }

  return doc
}
