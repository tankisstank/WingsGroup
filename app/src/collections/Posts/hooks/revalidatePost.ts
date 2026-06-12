import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { revalidatePath, revalidateTag } from 'next/cache.js'

import type { Post } from '../../../payload-types'
import { supportedLocaleCodes } from '@/utilities/sitePaths'
import { getPostCanonicalPath } from '@/utilities/siteURLs'

const revalidatePostPaths = (slug?: null | string) => {
  const path = getPostCanonicalPath(slug)

  revalidatePath(path)

  for (const locale of supportedLocaleCodes) {
    revalidatePath(getPostCanonicalPath(slug, locale))
  }

  return path
}

export const revalidatePost: CollectionAfterChangeHook<Post> = ({
  doc,
  previousDoc,
  req: { payload, context },
}) => {
  if (!context.disableRevalidate) {
    if (doc._status === 'published') {
      const path = revalidatePostPaths(doc.slug)

      payload.logger.info(`Revalidating post at path: ${path}`)

      revalidateTag('posts-sitemap', 'max')
    }

    // If the post was previously published, we need to revalidate the old path
    if (previousDoc._status === 'published' && doc._status !== 'published') {
      const oldPath = revalidatePostPaths(previousDoc.slug)

      payload.logger.info(`Revalidating old post at path: ${oldPath}`)

      revalidateTag('posts-sitemap', 'max')
    }
  }
  return doc
}

export const revalidateDelete: CollectionAfterDeleteHook<Post> = ({ doc, req: { context } }) => {
  if (!context.disableRevalidate) {
    revalidatePostPaths(doc?.slug)

    revalidateTag('posts-sitemap', 'max')
  }

  return doc
}
