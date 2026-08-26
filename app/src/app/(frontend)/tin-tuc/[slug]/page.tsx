import type { Metadata } from 'next'
import { draftMode } from 'next/headers'
import { notFound } from 'next/navigation'
import React from 'react'

import { Breadcrumbs } from '@/components/Breadcrumbs'
import { JsonLd } from '@/components/JsonLd'
import { LivePreviewListener } from '@/components/LivePreviewListener'
import { WingsGroupEditorialArticle } from '@/components/WingsGroupV3/EditorialArticle'
import { getCurrentLocale, getCurrentSite } from '@/utilities/siteContext'
import { getCurrentSiteSettings } from '@/utilities/getSiteSettings'
import { generateMeta } from '@/utilities/generateMeta'
import { getCanonicalSiteOrigin } from '@/utilities/siteSEO'
import {
  getWingsGroupEditorialOpenGraphMedia,
  getWingsGroupEditorialPostPath,
  queryWingsGroupEditorialFallbackMedia,
  queryWingsGroupEditorialPosts,
  resolveWingsGroupEditorialMedia,
  selectWingsGroupEditorialRelatedPosts,
} from '@/utilities/wingsGroupEditorial'
import {
  buildArticleJSONLD,
  buildBreadcrumbListJSONLD,
  buildWebPageJSONLD,
} from '@/utilities/structuredData'
import { WINGSGROUP_EDITORIAL_ARCHIVE_PATH } from '@/utilities/wingsGroupEditorial'
import {
  isWingsGroupEnglishPublicRoute,
  isWingsGroupV3ExactPublicInventoryEnabled,
} from '@/wingsgroup/corporateRoutes'
import type { SupportedLocaleCode } from '@/utilities/sitePaths'
import { getPageCanonicalPath } from '@/utilities/siteURLs'

type Args = {
  params: Promise<{ slug: string }>
}

const decodeEditorialSlug = (slug: string) => {
  try {
    return decodeURIComponent(slug)
  } catch {
    notFound()
  }
}

const getArticle = async (slug: string) => {
  const [{ isEnabled: draft }, locale, site, settings] = await Promise.all([
    draftMode(),
    getCurrentLocale(),
    getCurrentSite(),
    getCurrentSiteSettings(),
  ])

  if (
    site.code !== 'wings-group' ||
    !isWingsGroupV3ExactPublicInventoryEnabled({ settings, siteCode: site.code }) ||
    (!draft &&
      ((locale !== 'vi' && locale !== 'en') ||
        (locale === 'en' && !isWingsGroupEnglishPublicRoute({ path: '/tin-tuc', settings }))))
  ) {
    return null
  }

  const post = (
    await queryWingsGroupEditorialPosts({
      draft,
      locale,
      slug,
    })
  )[0]

  return post ? { draft, locale, post, settings, site } : null
}

const getArticlePresentation = async (
  post: Awaited<ReturnType<typeof queryWingsGroupEditorialPosts>>[number],
  locale: 'en' | 'vi',
) => {
  const [fallbackMedia, candidates] = await Promise.all([
    queryWingsGroupEditorialFallbackMedia({ locale }),
    queryWingsGroupEditorialPosts({ locale }),
  ])
  const heroMedia = resolveWingsGroupEditorialMedia(post, fallbackMedia)
  const relatedItems = selectWingsGroupEditorialRelatedPosts(post, candidates).map(
    (relatedPost) => ({
      media: resolveWingsGroupEditorialMedia(relatedPost, fallbackMedia),
      post: relatedPost,
    }),
  )

  return { heroMedia, relatedItems }
}

export default async function Page({ params: paramsPromise }: Args) {
  const { slug } = await paramsPromise
  const article = await getArticle(decodeEditorialSlug(slug))
  if (!article) notFound()

  const { draft, locale, post, settings, site } = article
  const resolvedLocale = locale === 'en' ? 'en' : 'vi'
  const { heroMedia, relatedItems } = await getArticlePresentation(post, resolvedLocale)
  const structuredMedia = getWingsGroupEditorialOpenGraphMedia(heroMedia) || heroMedia
  const structuredPost = structuredMedia
    ? {
        ...post,
        heroImage: heroMedia,
        meta: { ...(post.meta || {}), image: structuredMedia },
      }
    : post
  const canonicalOrigin = getCanonicalSiteOrigin({ settings, site })
  const canonicalPath = getPageCanonicalPath(
    { pathname: getWingsGroupEditorialPostPath(post.slug) },
    locale,
  )
  const archivePath = getPageCanonicalPath({ pathname: WINGSGROUP_EDITORIAL_ARCHIVE_PATH }, locale)
  const breadcrumbItems = [
    { label: settings?.siteName || 'WingsGroup', path: '/' },
    {
      label: locale === 'en' ? 'News and insights' : 'Tin tức',
      path: archivePath,
    },
    { label: post.meta?.breadcrumbLabel || post.title, path: canonicalPath },
  ]

  return (
    <article
      className="wingsgroup-v3-surface wingsgroup-v3-editorial-article"
      data-governed-editorial="true"
      data-testid="wingsgroup-editorial-article"
    >
      <JsonLd
        data={[
          buildWebPageJSONLD({
            canonicalOrigin,
            description: post.meta?.description,
            path: canonicalPath,
            settings,
            title: post.meta?.title || post.title,
          }),
          buildArticleJSONLD({
            canonicalOrigin,
            path: canonicalPath,
            post: structuredPost,
            settings,
          }),
          buildBreadcrumbListJSONLD(
            breadcrumbItems.map((item) => ({ name: item.label, path: item.path })),
            settings,
            { canonicalOrigin },
          ),
        ]}
      />
      {draft ? <LivePreviewListener /> : null}
      <Breadcrumbs
        className="wingsgroup-v3-breadcrumb container"
        items={breadcrumbItems}
        linkClassName="wingsgroup-v3-breadcrumb__link"
      />
      <WingsGroupEditorialArticle
        heroMedia={heroMedia}
        locale={resolvedLocale}
        post={post}
        relatedItems={relatedItems}
      />
    </article>
  )
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { slug } = await paramsPromise
  const article = await getArticle(decodeEditorialSlug(slug))
  if (!article) return { robots: { follow: false, index: false } }

  const locale = article.locale === 'en' ? 'en' : 'vi'
  const { heroMedia } = await getArticlePresentation(article.post, locale)
  const openGraphMedia = getWingsGroupEditorialOpenGraphMedia(heroMedia)
  const metadataPost = openGraphMedia
    ? {
        ...article.post,
        meta: { ...(article.post.meta || {}), image: openGraphMedia },
      }
    : article.post

  return generateMeta({
    doc: metadataPost,
    locale: article.locale as SupportedLocaleCode,
    path: getWingsGroupEditorialPostPath(article.post.slug),
  })
}
