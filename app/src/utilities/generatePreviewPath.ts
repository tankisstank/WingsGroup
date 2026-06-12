import { PreviewSearchParams } from '@/app/(frontend)/next/preview/route'
import { PayloadRequest, CollectionSlug } from 'payload'
import { prefixCanonicalPathWithLocale } from './siteURLs'

const collectionPrefixMap: Partial<Record<CollectionSlug, string>> = {
  posts: '/posts',
  pages: '',
}

type Props = {
  collection: keyof typeof collectionPrefixMap
  pathname?: null | string
  slug: string
  req: PayloadRequest
}

export const generatePreviewPath = ({ collection, pathname, req, slug }: Props) => {
  if (slug === undefined || slug === null) {
    return null
  }

  // Encode to support slugs with special characters
  const rawPath =
    collection === 'pages' && pathname
      ? pathname
      : `${collectionPrefixMap[collection]}/${slug}`.replace(/\/+/g, '/')
  const localizedPath = prefixCanonicalPathWithLocale(rawPath, req.locale)
  const encodedPath = localizedPath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')

  const encodedParams = new URLSearchParams({
    path: encodedPath,
    previewSecret: process.env.PREVIEW_SECRET || '',
  } satisfies PreviewSearchParams)

  const url = `/next/preview?${encodedParams.toString()}`

  return url
}
