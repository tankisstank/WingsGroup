import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { revalidatePath, revalidateTag } from 'next/cache.js'

import type { Page } from '../../../payload-types'
import { getPageCanonicalPath } from '@/utilities/siteURLs'
import { publicLocaleCodes } from '@/utilities/sitePaths'
import {
  revalidateWingSideDiscovery,
  revalidateWingSideDiscoveryForTourDependency,
} from '../../Tours/hooks/revalidateTourContent'

const isWingSideHomeCuration = (page?: Page | null) => {
  const hifi = page?.wingsSideHiFi as { enabled?: boolean; routeVariant?: string } | undefined
  return hifi?.enabled && hifi.routeVariant === 'home'
}

const isTourCatalogDependencyPage = (page?: Page | null) => {
  const pathname = page?.pathname
  return pathname === '/tour' || pathname?.startsWith('/tour/')
}

const revalidateWingsGoTourCatalog = (page?: Page | null) => {
  if (!isTourCatalogDependencyPage(page)) return

  revalidatePath('/tour')
  for (const locale of publicLocaleCodes) {
    revalidatePath(`/${locale}/tour`)
  }
}

const revalidatePagePaths = (doc?: Page | null) => {
  const path = getPageCanonicalPath(doc)

  revalidatePath(path)

  for (const locale of publicLocaleCodes) {
    revalidatePath(getPageCanonicalPath(doc, locale))
  }

  return path
}

export const revalidatePage: CollectionAfterChangeHook<Page> = async ({
  doc,
  previousDoc,
  req: { payload, context },
}) => {
  if (!context.disableRevalidate) {
    if (isWingSideHomeCuration(doc) || isWingSideHomeCuration(previousDoc)) {
      revalidateWingSideDiscovery()
    }
    revalidateWingsGoTourCatalog(doc)
    revalidateWingsGoTourCatalog(previousDoc)
    await revalidateWingSideDiscoveryForTourDependency({
      field: 'wrapperPage',
      payload,
      value: doc.id,
    })
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
    // A deleted wrapper may already have been cleared from TourProduct by FK
    // cleanup, so invalidate the bounded WingSide discovery surface set.
    revalidateWingSideDiscovery()
    revalidateWingsGoTourCatalog(doc)
    revalidatePagePaths(doc)
    revalidateTag('pages-sitemap', 'max')
  }

  return doc
}
