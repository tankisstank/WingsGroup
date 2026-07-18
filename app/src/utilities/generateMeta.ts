import type { Metadata } from 'next'

import type { Media, Page, Post, Config } from '../payload-types'
import type { SupportedLocaleCode } from './sitePaths'

import { mergeOpenGraph } from './mergeOpenGraph'
import {
  buildConfiguredAbsoluteMediaURL,
  getPageCanonicalPath,
} from './siteURLs'
import { getCurrentSiteSettings } from './getSiteSettings'
import { getCurrentSite } from './siteContext'
import { getCanonicalSiteOrigin, getSiteSitemapLocales, getSiteSitemapURL } from './siteSEO'

const getImageURL = ({
  image,
  settings,
}: {
  image?: Media | Config['db']['defaultIDType'] | null
  settings?: Parameters<typeof buildConfiguredAbsoluteMediaURL>[0]['settings']
}) => buildConfiguredAbsoluteMediaURL({ media: image, settings })

export const generateMeta = async (args: {
  doc: Partial<Page> | Partial<Post> | null
  locale?: null | string
  path?: null | string
}): Promise<Metadata> => {
  const { doc, locale, path } = args
  const site = await getCurrentSite()
  const settings = await getCurrentSiteSettings()

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
  const canonicalOrigin = getCanonicalSiteOrigin({
    settings,
    site,
  })
  const canonicalURL = getSiteSitemapURL({
    locale: (locale as SupportedLocaleCode | null | undefined) || undefined,
    origin: canonicalOrigin,
    path: canonicalPath,
  })
  const siteLocales = getSiteSitemapLocales(site)
  const languages = Object.fromEntries(
    siteLocales.map((publicLocale) => [
      publicLocale,
      getSiteSitemapURL({ locale: publicLocale, origin: canonicalOrigin, path: canonicalPath }),
    ]),
  )

  return {
    alternates: {
      canonical: canonicalURL,
      languages,
    },
    description,
    metadataBase: new URL(canonicalOrigin),
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
