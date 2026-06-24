import type { Media, Page, Post, SiteSetting } from '@/payload-types'

import { getAbsoluteMediaURL, getCanonicalURL, getPageCanonicalPath } from './siteURLs'

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

export const buildCanonicalUrl = (settings: SiteSetting | null | undefined, path = '/') => {
  return getCanonicalURL({ path, settings })
}

const getMediaUrl = (media?: Media | number | null, settings?: SiteSetting | null) => {
  if (!media || typeof media !== 'object' || !('url' in media) || !media.url) {
    return null
  }

  return getAbsoluteMediaURL({ media, settings })
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

export const buildOrganizationJSONLD = (settings?: SiteSetting | null): JsonLdNode => {
  const siteName = settings?.siteName || settings?.seo?.defaultTitle || 'WingsGroup'
  const siteUrl = buildCanonicalUrl(settings)
  const logo = getMediaUrl(settings?.branding?.logoImage, settings)

  return {
    '@id': `${siteUrl}#organization`,
    '@type': 'Organization',
    name: siteName,
    url: siteUrl,
    ...(logo ? { logo } : {}),
    ...(settings?.supportEmail || settings?.supportPhone
      ? {
          contactPoint: [
            {
              '@type': 'ContactPoint',
              ...(settings.supportEmail ? { email: settings.supportEmail } : {}),
              ...(settings.supportPhone ? { telephone: settings.supportPhone } : {}),
              contactType: 'customer support',
            },
          ],
        }
      : {}),
  }
}

export const buildWebSiteJSONLD = (settings?: SiteSetting | null): JsonLdNode => {
  const siteName = settings?.siteName || settings?.seo?.defaultTitle || 'WingsGroup'
  const siteUrl = buildCanonicalUrl(settings)

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

export const buildSiteJsonLd = (settings?: SiteSetting | null): JsonLdNode[] => {
  return [buildOrganizationJSONLD(settings), buildWebSiteJSONLD(settings)]
}

export const buildWebPageJSONLD = ({
  description,
  path = '/',
  settings,
  title,
}: {
  description?: null | string
  path?: null | string
  settings?: SiteSetting | null
  title: string
}): JsonLdNode => {
  const url = buildCanonicalUrl(settings, path || '/')
  const siteUrl = buildCanonicalUrl(settings)

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
      item: item.url || buildCanonicalUrl(settings, item.path || '/'),
    })),
  }
}

export const buildBreadcrumbListJsonLd = buildBreadcrumbListJSONLD

export const buildPageJsonLd = ({
  page,
  path,
  settings,
}: {
  page: Page
  path?: string
  settings?: SiteSetting | null
}): JsonLdNode[] => {
  const image = getMediaUrl(page.meta?.image || page.hero?.media, settings)

  return [
    {
      ...buildWebPageJSONLD({
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
  path,
  post,
  settings,
}: {
  path?: string
  post: Post
  settings?: SiteSetting | null
}): JsonLdNode => {
  const url = buildCanonicalUrl(settings, path || `/posts/${post.slug}`)
  const siteUrl = buildCanonicalUrl(settings)
  const image = getMediaUrl(post.meta?.image || post.heroImage, settings)
  const description = post.meta?.description || settings?.seo?.defaultDescription || settings?.tagline || undefined
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
  post,
  path,
  settings,
}: {
  post: Post
  path?: string
  settings?: SiteSetting | null
}): JsonLdNode[] => {
  const url = buildCanonicalUrl(settings, path || `/posts/${post.slug}`)
  const siteUrl = buildCanonicalUrl(settings)
  const image = getMediaUrl(post.meta?.image || post.heroImage, settings)
  const description = post.meta?.description || settings?.seo?.defaultDescription || settings?.tagline || undefined
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

  const article = buildArticleJSONLD({ path, post, settings })

  return [webPage, article]
}
