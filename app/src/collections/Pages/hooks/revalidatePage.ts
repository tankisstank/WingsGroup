import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { revalidatePath, revalidateTag } from 'next/cache.js'

import type { Page } from '../../../payload-types'
import { getPageCanonicalPath } from '@/utilities/siteURLs'
import { supportedLocaleCodes } from '@/utilities/sitePaths'

const revalidatePagePaths = (doc?: Page | null) => {
  const path = getPageCanonicalPath(doc)

  revalidatePath(path)

  for (const locale of supportedLocaleCodes) {
    revalidatePath(getPageCanonicalPath(doc, locale))
  }

  return path
}

export const revalidatePage: CollectionAfterChangeHook<Page> = ({
  doc,
  previousDoc,
  req: { payload, context },
}) => {
  if (!context.disableRevalidate) {
    if (doc._status === 'published') {
      const path = revalidatePagePaths(doc)

      payload.logger.info(`Revalidating page at path: ${path}`)

      revalidateTag('pages-sitemap', 'max')
    }

    // If the page was previously published, we need to revalidate the old path
    if (previousDoc?._status === 'published' && doc._status !== 'published') {
      const oldPath = revalidatePagePaths(previousDoc)

      payload.logger.info(`Revalidating old page at path: ${oldPath}`)

      revalidateTag('pages-sitemap', 'max')
    }
  }
  return doc
}

export const revalidateDelete: CollectionAfterDeleteHook<Page> = ({ doc, req: { context } }) => {
  if (!context.disableRevalidate) {
    revalidatePagePaths(doc)
    revalidateTag('pages-sitemap', 'max')
  }

  return doc
}
