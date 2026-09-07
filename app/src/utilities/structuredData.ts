import type { Media, Page, Post, SiteSetting } from '@/payload-types'

import {
  buildConfiguredAbsoluteMediaURL,
  buildConfiguredCanonicalURL,
  getPageCanonicalPath,
  normalizeCanonicalPath,
} from './siteURLs'

type JsonLdValue =
  | boolean
  | JsonLdValue[]
  | number
  | string
  | null
  | {
      [key: string]: JsonLdValue | undefined
    }

export type JsonLdNode = {
  '@id'?: string
  '@type': string
  [key: string]: JsonLdValue | undefined
}

export type JSONLD = JsonLdNode

type BreadcrumbItem = {
  name: string
  path?: string
  url?: string
}

const buildUrlFromOrigin = (origin: string, path = '/') => {
  const normalizedPath = normalizeCanonicalPath(path).replace(/^\/vi(?=\/|$)/, '') || '/'

  return `${origin}${normalizedPath === '/' ? '' : normalizedPath}`
}

export const buildCanonicalUrl = (
  settings: SiteSetting | null | undefined,
  path = '/',
  options?: { canonicalOrigin?: null | string },
) => {
  const canonicalOrigin = options?.canonicalOrigin?.trim()

  return canonicalOrigin
    ? buildUrlFromOrigin(canonicalOrigin, path)
    : buildConfiguredCanonicalURL({ path, settings })
}

const getMediaUrl = (media?: Media | number | null, settings?: SiteSetting | null) => {
  if (!media || typeof media !== 'object' || !('url' in media) || !media.url) {
    return null
  }

  return buildConfiguredAbsoluteMediaURL({ media, settings })
}

export const serializeJsonLd = (data: JsonLdNode | JsonLdNode[]) =>
  JSON.stringify(
    {
      '@context': 'https://schema.org',
      '@graph': Array.isArray(data) ? data : [data],
    },
    null,
    2,
  ).replace(/</g, '\\u003c')

export const stringifyJSONLD = serializeJsonLd

export const buildOrganizationJSONLD = (
  settings?: SiteSetting | null,
  options?: { canonicalOrigin?: null | string },
): JsonLdNode => {
  const siteName = settings?.siteName || settings?.seo?.defaultTitle || 'WingsGroup'
  const siteUrl = buildCanonicalUrl(settings, '/', options)
  const logo = getMediaUrl(settings?.branding?.logoImage, settings)
  const contactPoints = [
    ...(settings?.supportEmail || settings?.supportPhone
      ? [
          {
            '@type': 'ContactPoint' as const,
            ...(settings.supportEmail ? { email: settings.supportEmail } : {}),
            ...(settings.supportPhone ? { telephone: settings.supportPhone } : {}),
            contactType: 'customer support',
          },
        ]
      : []),
    ...(settings?.salesEmail && settings.salesEmail !== settings.supportEmail
      ? [
          {
            '@type': 'ContactPoint' as const,
            email: settings.salesEmail,
            contactType: 'sales',
          },
        ]
      : []),
  ]

  return {
    '@id': `${siteUrl}#organization`,
    '@type': 'Organization',
    name: siteName,
    url: siteUrl,
    ...(logo ? { logo } : {}),
    ...(contactPoints.length ? { contactPoint: contactPoints } : {}),
  }
}

export const buildWebSiteJSONLD = (
  settings?: SiteSetting | null,
  options?: { canonicalOrigin?: null | string },
): JsonLdNode => {
  const siteName = settings?.siteName || settings?.seo?.defaultTitle || 'WingsGroup'
  const siteUrl = buildCanonicalUrl(settings, '/', options)

  return {
    '@id': `${siteUrl}#website`,
    '@type': 'WebSite',
    name: siteName,
    url: siteUrl,
    publisher: {
      '@id': `${siteUrl}#organization`,
    },
  }
}

export const buildSiteJsonLd = (
  settings?: SiteSetting | null,
  options?: { canonicalOrigin?: null | string },
): JsonLdNode[] => {
  return [buildOrganizationJSONLD(settings, options), buildWebSiteJSONLD(settings, options)]
}

export const buildWebPageJSONLD = ({
  canonicalOrigin,
  description,
  path = '/',
  settings,
  title,
}: {
  canonicalOrigin?: null | string
  description?: null | string
  path?: null | string
  settings?: SiteSetting | null
  title: string
}): JsonLdNode => {
  const url = buildCanonicalUrl(settings, path || '/', { canonicalOrigin })
  const siteUrl = buildCanonicalUrl(settings, '/', { canonicalOrigin })

  return {
    '@id': `${url}#webpage`,
    '@type': 'WebPage',
    name: title,
    description: description || settings?.seo?.defaultDescription || settings?.tagline || undefined,
    url,
    isPartOf: {
      '@id': `${siteUrl}#website`,
    },
    publisher: {
      '@id': `${siteUrl}#organization`,
    },
  }
}

export const buildBreadcrumbListJSONLD = (
  items: BreadcrumbItem[],
  settings?: SiteSetting | null,
  options?: { canonicalOrigin?: null | string },
): JsonLdNode | null => {
  if (items.length < 2) {
    return null
  }

  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url || buildCanonicalUrl(settings, item.path || '/', options),
    })),
  }
}

export const buildBreadcrumbListJsonLd = buildBreadcrumbListJSONLD

export const buildPageJsonLd = ({
  canonicalOrigin,
  page,
  path,
  settings,
}: {
  canonicalOrigin?: null | string
  page: Page
  path?: string
  settings?: SiteSetting | null
}): JsonLdNode[] => {
  const image = getMediaUrl(page.meta?.image || page.hero?.media, settings)

  return [
    {
      ...buildWebPageJSONLD({
        canonicalOrigin,
        description: page.meta?.description,
        path: path || getPageCanonicalPath(page),
        settings,
        title: page.meta?.title || page.title,
      }),
      ...(image ? { primaryImageOfPage: image } : {}),
      ...(page.publishedAt ? { datePublished: page.publishedAt } : {}),
      ...(page.updatedAt ? { dateModified: page.updatedAt } : {}),
    },
  ]
}

export const buildArticleJSONLD = ({
  canonicalOrigin,
  path,
  post,
  settings,
}: {
  canonicalOrigin?: null | string
  path?: string
  post: Post
  settings?: SiteSetting | null
}): JsonLdNode => {
  const url = buildCanonicalUrl(settings, path || `/posts/${post.slug}`, { canonicalOrigin })
  const siteUrl = buildCanonicalUrl(settings, '/', { canonicalOrigin })
  const image = getMediaUrl(post.meta?.image || post.heroImage, settings)
  const description =
    post.meta?.description || settings?.seo?.defaultDescription || settings?.tagline || undefined
  const name = post.meta?.title || post.title
  const authors = post.populatedAuthors?.map((author) => author.name).filter(Boolean)

  return {
    '@id': `${url}#article`,
    '@type': 'Article',
    headline: name,
    description,
    mainEntityOfPage: {
      '@id': `${url}#webpage`,
    },
    publisher: {
      '@id': `${siteUrl}#organization`,
    },
    ...(authors?.length
      ? {
          author: authors.map((author) => ({
            '@type': 'Person',
            name: author,
          })),
        }
      : {}),
    ...(image ? { image } : {}),
    ...(post.publishedAt ? { datePublished: post.publishedAt } : {}),
    ...(post.updatedAt ? { dateModified: post.updatedAt } : {}),
  }
}

export const buildPostJsonLd = ({
  canonicalOrigin,
  post,
  path,
  settings,
}: {
  canonicalOrigin?: null | string
  post: Post
  path?: string
  settings?: SiteSetting | null
}): JsonLdNode[] => {
  const url = buildCanonicalUrl(settings, path || `/posts/${post.slug}`, { canonicalOrigin })
  const siteUrl = buildCanonicalUrl(settings, '/', { canonicalOrigin })
  const image = getMediaUrl(post.meta?.image || post.heroImage, settings)
  const description =
    post.meta?.description || settings?.seo?.defaultDescription || settings?.tagline || undefined
  const name = post.meta?.title || post.title

  const webPage: JsonLdNode = {
    '@id': `${url}#webpage`,
    '@type': 'WebPage',
    name,
    description,
    url,
    isPartOf: {
      '@id': `${siteUrl}#website`,
    },
    publisher: {
      '@id': `${siteUrl}#organization`,
    },
    ...(image ? { primaryImageOfPage: image } : {}),
    ...(post.publishedAt ? { datePublished: post.publishedAt } : {}),
    ...(post.updatedAt ? { dateModified: post.updatedAt } : {}),
  }

  const article = buildArticleJSONLD({ canonicalOrigin, path, post, settings })

  return [webPage, article]
}
