import type { Site } from '@/payload-types'
import { PayloadRequest } from 'payload'

import type { PreviewCollection } from './previewHandoff'
import { isSupportedLocale } from './sitePaths'

const collectionPrefixMap: Record<PreviewCollection, string> = {
  posts: '/posts',
  pages: '',
  'tour-campaigns': '/campaign',
  'tour-products': '/tour',
}

type Props = {
  collection: PreviewCollection
  id?: null | number | string
  pathname?: null | string
  site?: null | number | Site
  slug: string
  req: PayloadRequest
}

export const generatePreviewPath = async ({
  collection,
  id,
  pathname,
  req,
  slug,
}: Props) => {
  if (slug === undefined || slug === null) {
    return null
  }

  // Encode to support slugs with special characters
  const rawPath =
    collection === 'pages' && pathname
      ? pathname
      : `${collectionPrefixMap[collection]}/${slug}`.replace(/\/+/g, '/')
  // Locale routing is resolved from the target Site. Do not manufacture a
  // `/vi` prefix for a default-locale production pathname.
  const localizedPath = rawPath
  // The CMS endpoint resolves the document again under the authenticated user
  // and determines the real site domain. Aliases are deliberately excluded:
  // they are only valid in local development and are rejected in production.
  const encodedPath = localizedPath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')

  const encodedParams = new URLSearchParams({
    collection,
    id: id === undefined || id === null ? '' : String(id),
    path: encodedPath,
  })
  if (isSupportedLocale(req.locale)) {
    encodedParams.set('locale', req.locale)
  }

  const url = `/next/preview?${encodedParams.toString()}`

  return url
}
