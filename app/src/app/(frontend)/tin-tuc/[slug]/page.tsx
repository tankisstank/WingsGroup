import type { Metadata } from 'next'
import { draftMode } from 'next/headers'
import { notFound } from 'next/navigation'
import React from 'react'

import RichText from '@/components/RichText'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { JsonLd } from '@/components/JsonLd'
import { LivePreviewListener } from '@/components/LivePreviewListener'
import { getCurrentLocale, getCurrentSite } from '@/utilities/siteContext'
import { getCurrentSiteSettings } from '@/utilities/getSiteSettings'
import { generateMeta } from '@/utilities/generateMeta'
import { getCanonicalSiteOrigin } from '@/utilities/siteSEO'
import {
  getGovernedEditorialAuthorNames,
  getWingsGroupEditorialPostPath,
  queryWingsGroupEditorialPosts,
} from '@/utilities/wingsGroupEditorial'
import {
  buildArticleJSONLD,
  buildBreadcrumbListJSONLD,
  buildWebPageJSONLD,
} from '@/utilities/structuredData'
import { WINGSGROUP_EDITORIAL_ARCHIVE_PATH } from '@/utilities/wingsGroupEditorial'
import { isWingsGroupV3ExactPublicInventoryEnabled } from '@/wingsgroup/corporateRoutes'
import { formatDateTime } from '@/utilities/formatDateTime'
import type { SupportedLocaleCode } from '@/utilities/sitePaths'

type Args = {
  params: Promise<{ slug: string }>
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
    (!draft && locale !== 'vi')
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

export default async function Page({ params: paramsPromise }: Args) {
  const { slug } = await paramsPromise
  const article = await getArticle(decodeURIComponent(slug))
  if (!article) notFound()

  const { draft, locale, post, settings, site } = article
  const canonicalOrigin = getCanonicalSiteOrigin({ settings, site })
  const canonicalPath = getWingsGroupEditorialPostPath(post.slug)
  const authorNames = getGovernedEditorialAuthorNames(post)
  const breadcrumbItems = [
    { label: settings?.siteName || 'WingsGroup', path: '/' },
    {
      label: locale === 'en' ? 'News and insights' : 'Tin tức',
      path: WINGSGROUP_EDITORIAL_ARCHIVE_PATH,
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
          buildArticleJSONLD({ canonicalOrigin, path: canonicalPath, post, settings }),
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
      <header className="container wingsgroup-v3-editorial-article__header">
        <p className="wingsgroup-v3-editorial-article__eyebrow">
          {locale === 'en' ? 'Editorial' : 'Biên tập'}
        </p>
        <h1>{post.title}</h1>
        <div className="wingsgroup-v3-editorial-article__meta">
          {post.publishedAt ? (
            <time dateTime={post.publishedAt}>{formatDateTime(post.publishedAt)}</time>
          ) : null}
          {authorNames.length > 0 ? (
            <span>
              {locale === 'en' ? 'By' : 'Tác giả'}: {authorNames.join(', ')}
            </span>
          ) : null}
          <span>{locale === 'en' ? 'Source: WingsGroup' : 'Nguồn: WingsGroup'}</span>
        </div>
      </header>
      <div className="container wingsgroup-v3-editorial-article__body">
        <RichText data={post.content} enableGutter={false} />
      </div>
    </article>
  )
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  const { slug } = await paramsPromise
  const article = await getArticle(decodeURIComponent(slug))
  if (!article) return { robots: { follow: false, index: false } }

  return generateMeta({
    doc: article.post,
    locale: article.locale as SupportedLocaleCode,
    path: getWingsGroupEditorialPostPath(article.post.slug),
  })
}
