import type { FAQBlock, Media, Page, Post, SiteSetting } from '@/payload-types'
import { WINGSGROUP_LEGAL_IDENTITY } from '@/wingsgroup/corporateRoutes'

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
  '@type': string | string[]
  [key: string]: JsonLdValue | undefined
}

export type JSONLD = JsonLdNode

type BreadcrumbItem = {
  name: string
  path?: string
  url?: string
}

const buildUrlFromOrigin = (origin: string, path = '/') => {
  const normalizedPath = normalizeCanonicalPath(path) || '/'

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
  options?: { canonicalOrigin?: null | string; siteCode?: null | string },
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

  const isWingsGroup = options?.siteCode === 'wings-group'

  return {
    '@id': `${siteUrl}#organization`,
    '@type': isWingsGroup ? ['Organization', 'TravelAgency'] : 'Organization',
    name: siteName,
    url: siteUrl,
    ...(isWingsGroup
      ? {
          address: {
            '@type': 'PostalAddress',
            addressCountry: 'VN',
            addressLocality: 'Hà Nội',
            streetAddress: WINGSGROUP_LEGAL_IDENTITY.registeredOffice,
          },
          identifier: WINGSGROUP_LEGAL_IDENTITY.licenceNumber,
          legalName: WINGSGROUP_LEGAL_IDENTITY.legalEntityName,
          ...(settings?.supportEmail ? { email: settings.supportEmail } : {}),
          ...(settings?.supportPhone ? { telephone: settings.supportPhone } : {}),
          hasCredential: {
            '@type': 'Permit',
            identifier: WINGSGROUP_LEGAL_IDENTITY.licenceNumber,
            name: 'International tour operator licence',
          },
        }
      : {}),
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

/**
 * Emits semantic FAQPage data only for CMS FAQ blocks that are rendered as
 * visible question-and-answer content. Search engines may choose not to show
 * FAQ rich results for commercial sites, but the markup remains an accurate
 * machine-readable representation of the page.
 */
export const buildFAQPageJSONLD = (
  blocks?: readonly unknown[] | null,
): JsonLdNode | null => {
  const mainEntity = (blocks || [])
    .filter(
      (block): block is FAQBlock =>
        Boolean(block) && typeof block === 'object' && (block as FAQBlock).blockType === 'faq',
    )
    .flatMap((block) => block.items || [])
    .map((item) => ({
      answer: item.answer?.trim(),
      question: item.question?.trim(),
    }))
    .filter(
      (item): item is { answer: string; question: string } =>
        Boolean(item.question) && Boolean(item.answer),
    )
    .map((item) => ({
      '@type': 'Question' as const,
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer' as const,
        text: item.answer,
      },
    }))

  return mainEntity.length
    ? {
        '@type': 'FAQPage',
        mainEntity,
      }
    : null
}

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
