import type { Metadata } from 'next'

import type { Media, Page, Post, Config } from '../payload-types'
import type { SupportedLocaleCode } from './sitePaths'

import { mergeOpenGraph } from './mergeOpenGraph'
import { buildConfiguredAbsoluteMediaURL, getPageCanonicalPath } from './siteURLs'
import { getCurrentSiteSettings } from './getSiteSettings'
import { getCurrentSite } from './siteContext'
import { getCanonicalSiteOrigin, getSiteSitemapURL } from './siteSEO'
import { isPublicLocale } from './sitePaths'
import { WINGSGROUP_BRAND, isWingsGroupBrandSite } from '@/wingsgroup/brand'

const getImageURL = ({
  image,
  siteCode,
  settings,
}: {
  image?: Media | Config['db']['defaultIDType'] | null
  siteCode?: null | string
  settings?: Parameters<typeof buildConfiguredAbsoluteMediaURL>[0]['settings']
}) =>
  buildConfiguredAbsoluteMediaURL({
    fallbackPath: isWingsGroupBrandSite(siteCode)
      ? WINGSGROUP_BRAND.assets.ogImage
      : '/website-template-OG.webp',
    media: image,
    settings,
  })

export const generateMeta = async (args: {
  alternateLocales?: SupportedLocaleCode[]
  article?: {
    authors?: string[]
    modifiedTime?: null | string
    publishedTime?: null | string
  }
  doc: Partial<Page> | Partial<Post> | null
  locale?: null | string
  path?: null | string
  socialDescription?: null | string
  socialTitle?: null | string
}): Promise<Metadata> => {
  const { alternateLocales, article, doc, locale, path, socialDescription, socialTitle } = args
  const site = await getCurrentSite()
  const settings = await getCurrentSiteSettings()

  const ogImage = getImageURL({
    image: doc?.meta?.image || settings?.seo?.defaultImage,
    siteCode: site.code,
    settings,
  })
  const seoDefaultTitle = settings?.seo?.defaultTitle || settings?.siteName || 'WingsGroup'
  const seoTitleSuffix = settings?.seo?.titleSuffix
  const description =
    doc?.meta?.description || settings?.seo?.defaultDescription || settings?.tagline
  const titleBase = doc?.meta?.title || doc?.title || seoDefaultTitle
  const titleParts = [titleBase, seoTitleSuffix].filter(Boolean)
  const siteIdentity = settings?.siteName || seoDefaultTitle
  const normalizedTitle = titleParts
    .join(' ')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
  const normalizedIdentity = siteIdentity.toLowerCase().replace(/[^a-z0-9]/g, '')
  if (normalizedIdentity && !normalizedTitle.includes(normalizedIdentity)) {
    titleParts.push(siteIdentity)
  }
  const title = titleParts.join(' | ')

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
    defaultLocale: site.defaultLocale,
    locale: (locale as SupportedLocaleCode | null | undefined) || undefined,
    origin: canonicalOrigin,
    path: canonicalPath,
  })
  const siteLocales =
    alternateLocales || (isPublicLocale(locale) ? [locale as SupportedLocaleCode] : [])
  const languages = Object.fromEntries(
    siteLocales.map((publicLocale) => [
      publicLocale,
      getSiteSitemapURL({
        defaultLocale: site.defaultLocale,
        locale: publicLocale,
        origin: canonicalOrigin,
        path: canonicalPath,
      }),
    ]),
  )
  const defaultLocaleURL = siteLocales.includes(site.defaultLocale)
    ? getSiteSitemapURL({
        defaultLocale: site.defaultLocale,
        locale: site.defaultLocale,
        origin: canonicalOrigin,
        path: canonicalPath,
      })
    : null
  const socialMetadataTitle = socialTitle || titleBase
  const socialMetadataDescription = socialDescription || description || ''

  return {
    alternates: {
      canonical: canonicalURL,
      languages: defaultLocaleURL ? { ...languages, 'x-default': defaultLocaleURL } : languages,
    },
    description,
    metadataBase: new URL(canonicalOrigin),
    openGraph: mergeOpenGraph({
      ...(article
        ? {
            authors: article.authors,
            modifiedTime: article.modifiedTime || undefined,
            publishedTime: article.publishedTime || undefined,
            type: 'article' as const,
          }
        : {}),
      description: socialMetadataDescription,
      images: ogImage
        ? [
            {
              url: ogImage,
            },
          ]
        : undefined,
      siteName: settings?.siteName || seoDefaultTitle,
      title: socialMetadataTitle,
      url: canonicalURL,
    }),
    title,
    twitter: {
      card: 'summary_large_image',
      description: socialMetadataDescription,
      images: ogImage ? [ogImage] : undefined,
      title: socialMetadataTitle,
    },
  }
}
