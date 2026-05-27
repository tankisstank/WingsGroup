import type { Metadata } from 'next'

import type { Media, Page, Post, Config } from '../payload-types'

import { mergeOpenGraph } from './mergeOpenGraph'
import { getCanonicalURL, getPageCanonicalPath, normalizeCanonicalDomain } from './siteURLs'
import { getServerSideURL } from './getURL'
import { getCurrentSiteSettings } from './getSiteSettings'

const getImageURL = (image?: Media | Config['db']['defaultIDType'] | null) => {
  const serverUrl = getServerSideURL()

  let url = serverUrl + '/website-template-OG.webp'

  if (image && typeof image === 'object' && 'url' in image) {
    const ogUrl = image.sizes?.og?.url

    url = ogUrl ? serverUrl + ogUrl : serverUrl + image.url
  }

  return url
}

export const generateMeta = async (args: {
  doc: Partial<Page> | Partial<Post> | null
  path?: null | string
  siteCode?: null | string
}): Promise<Metadata> => {
  const { doc, path, siteCode } = args
  const settings = await getCurrentSiteSettings(siteCode)

  const ogImage = getImageURL(doc?.meta?.image || settings?.seo?.defaultImage)
  const seoDefaultTitle = settings?.seo?.defaultTitle || settings?.siteName || 'WingsTravel'
  const seoTitleSuffix = settings?.seo?.titleSuffix
  const description = doc?.meta?.description || settings?.seo?.defaultDescription || settings?.tagline
  const titleBase = doc?.meta?.title || seoDefaultTitle
  const title = [titleBase, seoTitleSuffix].filter(Boolean).join(' | ')

  const slug = Array.isArray(doc?.slug) ? doc?.slug.join('/') : doc?.slug || ''
  const canonicalPath = path || getPageCanonicalPath(slug)
  const canonicalURL = getCanonicalURL({ path: canonicalPath, settings })

  return {
    alternates: {
      canonical: canonicalURL,
    },
    description,
    metadataBase: new URL(normalizeCanonicalDomain(settings?.seo?.canonicalDomain)),
    openGraph: mergeOpenGraph({
      description: description || '',
      images: ogImage
        ? [
            {
              url: ogImage,
            },
          ]
        : undefined,
      siteName: settings?.siteName || seoDefaultTitle,
      title,
      url: canonicalURL,
    }),
    title,
  }
}
