import type { Metadata } from 'next'

import { generateCmsPageMetadataByPath, renderCmsPageByPath } from '@/app/(frontend)/cmsPage'
import { isSupportedLocale } from '@/utilities/sitePaths'

// CMS content, including governed media publication state, is resolved from
// the production tenant at request time. Static generation uses the build
// database and can otherwise freeze a pre-publication media state.
export const dynamic = 'force-dynamic'

type Args = {
  params: Promise<{
    slug?: string[]
  }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

export default async function Page({
  params: paramsPromise,
  searchParams: searchParamsPromise,
}: Args) {
  const { slug = [] } = await paramsPromise
  const requestedPath = getRequestedPathFromSlug(slug)

  return renderCmsPageByPath({ requestedPath, searchParams: searchParamsPromise })
}

export async function generateMetadata({
  params: paramsPromise,
  searchParams: searchParamsPromise,
}: Args): Promise<Metadata> {
  const { slug = [] } = await paramsPromise
  const requestedPath = getRequestedPathFromSlug(slug)

  return generateCmsPageMetadataByPath({
    requestedPath,
    searchParams: searchParamsPromise ? await searchParamsPromise : undefined,
  })
}

const getRequestedPathFromSlug = (slug: string[]) => {
  const decodedSegments = slug.map((segment) => decodeURIComponent(segment))
  const contentSegments = isSupportedLocale(decodedSegments[0])
    ? decodedSegments.slice(1)
    : decodedSegments

  return contentSegments.length > 0 ? `/${contentSegments.join('/')}` : '/'
}
