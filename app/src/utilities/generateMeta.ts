import type { Metadata } from 'next'

import type { Media, Page, Post, Config } from '../payload-types'

import { mergeOpenGraph } from './mergeOpenGraph'
import {
  getAbsoluteMediaURL,
  getCanonicalURL,
  getPageCanonicalPath,
  normalizeCanonicalDomain,
} from './siteURLs'
import { getCurrentSiteSettings } from './getSiteSettings'

const getImageURL = ({
  image,
  settings,
}: {
  image?: Media | Config['db']['defaultIDType'] | null
  settings?: Parameters<typeof getAbsoluteMediaURL>[0]['settings']
}) => getAbsoluteMediaURL({ media: image, settings })

export const generateMeta = async (args: {
  doc: Partial<Page> | Partial<Post> | null
  locale?: null | string
  path?: null | string
  siteCode?: null | string
}): Promise<Metadata> => {
  const { doc, locale, path, siteCode } = args
  const settings = await getCurrentSiteSettings(siteCode)

  const ogImage = getImageURL({
    image: doc?.meta?.image || settings?.seo?.defaultImage,
    settings,
  })
  const seoDefaultTitle = settings?.seo?.defaultTitle || settings?.siteName || 'WingsGroup'
  const seoTitleSuffix = settings?.seo?.titleSuffix
  const description = doc?.meta?.description || settings?.seo?.defaultDescription || settings?.tagline
  const titleBase = doc?.title || doc?.meta?.title || seoDefaultTitle
  const title = [titleBase, seoTitleSuffix].filter(Boolean).join(' | ')

  const pageLikeDoc =
    doc && typeof doc === 'object' && ('pathname' in doc || 'slug' in doc)
      ? (doc as { pathname?: null | string; slug?: null | string })
      : undefined
  const canonicalPath = path || getPageCanonicalPath(pageLikeDoc || doc?.slug || '')
  const canonicalURL = getCanonicalURL({ locale, path: canonicalPath, settings })

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
