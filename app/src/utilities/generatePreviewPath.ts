import { PreviewSearchParams } from '@/app/(frontend)/next/preview/route'
import { normalizeRelationID } from '@/access/roles'
import type { Site } from '@/payload-types'
import { PayloadRequest } from 'payload'
import { prefixCanonicalPathWithLocale } from './siteURLs'
import { defaultSiteCode, prefixPathWithSite, siteCodeToAliasMap } from './sitePaths'

type PreviewCollection = 'pages' | 'posts' | 'tour-campaigns' | 'tour-products'

const collectionPrefixMap: Record<PreviewCollection, string> = {
  posts: '/posts',
  pages: '',
  'tour-campaigns': '/campaign',
  'tour-products': '/tour',
}

type Props = {
  collection: PreviewCollection
  pathname?: null | string
  site?: null | number | Site
  slug: string
  req: PayloadRequest
}

const resolveSiteAlias = async ({
  req,
  site,
}: Pick<Props, 'req' | 'site'>): Promise<string | undefined> => {
  if (!site) {
    return undefined
  }

  if (typeof site === 'object' && 'code' in site && typeof site.code === 'string') {
    return site.code === defaultSiteCode ? undefined : siteCodeToAliasMap[site.code]
  }

  const siteID = normalizeRelationID(site)

  if (!siteID) {
    return undefined
  }

  const siteDoc = await req.payload.findByID({
    collection: 'sites',
    depth: 0,
    id: siteID,
    req,
  })

  return siteDoc?.code && siteDoc.code !== defaultSiteCode
    ? siteCodeToAliasMap[siteDoc.code]
    : undefined
}

export const generatePreviewPath = async ({
  collection,
  pathname,
  req,
  site,
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
  const localizedPath = prefixCanonicalPathWithLocale(rawPath, req.locale)
  const siteAlias = await resolveSiteAlias({ req, site })
  const siteAwarePath = prefixPathWithSite(localizedPath, siteAlias)
  const encodedPath = siteAwarePath
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
