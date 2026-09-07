import type { Metadata } from 'next'

import { RelatedPosts } from '@/blocks/RelatedPosts/Component'
import { PayloadRedirects } from '@/components/PayloadRedirects'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'
import RichText from '@/components/RichText'

import type { Post } from '@/payload-types'

import { PostHero } from '@/heros/PostHero'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { generateMeta } from '@/utilities/generateMeta'
import { isAuthorizedDraftMode } from '@/utilities/previewHandoff'
import {
  appendSiteWhere,
  getCurrentLocale,
  getCurrentSite,
  getCurrentSitePrefix,
} from '@/utilities/siteContext'
import { JsonLd } from '@/components/JsonLd'
import PageClient from './page.client'
import { LivePreviewListener } from '@/components/LivePreviewListener'
import {
  buildArticleJSONLD,
  buildBreadcrumbListJSONLD,
  buildWebPageJSONLD,
} from '@/utilities/structuredData'
import { buildPostBreadcrumbItems, type BreadcrumbPost } from '@/utilities/breadcrumbs'
import { getCurrentSiteSettings } from '@/utilities/getSiteSettings'
import { getPostCanonicalPath } from '@/utilities/siteURLs'
import type { SupportedLocaleCode } from '@/utilities/sitePaths'
import { getCanonicalSiteOrigin } from '@/utilities/siteSEO'
import { isWingsGroupV3PublicSurfacePathAllowed } from '@/wingsgroup/corporateRoutes'
import { notFound } from 'next/navigation'

type Args = {
  params: Promise<{
    slug?: string
  }>
}

export default async function Post({ params: paramsPromise }: Args) {
  const draft = await isAuthorizedDraftMode()
  const { slug = '' } = await paramsPromise
  const locale = await getCurrentLocale()
  const sitePrefix = await getCurrentSitePrefix()
  // Decode to support slugs with special characters
  const decodedSlug = decodeURIComponent(slug)
  const url = `${sitePrefix}/posts/${decodedSlug}`.replace(/\/+/g, '/')
  const settings = await getCurrentSiteSettings()
  const site = await getCurrentSite()
  if (
    !isWingsGroupV3PublicSurfacePathAllowed({
      locale,
      path: `/posts/${decodedSlug}`,
      settings,
      siteCode: site.code,
    })
  ) {
    notFound()
  }
  const post = await queryPostBySlug({ slug: decodedSlug, locale })

  if (!post) return <PayloadRedirects url={url} />

  const canonicalOrigin = getCanonicalSiteOrigin({ settings, site })
  const canonicalPath = getPostCanonicalPath(decodedSlug, locale)
  const breadcrumbItems = buildPostBreadcrumbItems({
    locale,
    post: post as BreadcrumbPost,
    settings,
  })

  return (
    <article className="pt-16 pb-16">
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
      <PageClient />

      {/* Allows redirects for valid pages too */}
      <PayloadRedirects disableNotFound url={url} />

      {draft && <LivePreviewListener />}

      <Breadcrumbs items={breadcrumbItems} />
      <PostHero locale={locale} post={post} />

      <div className="flex flex-col items-center gap-4 pt-8">
        <div className="container">
          <RichText className="max-w-[48rem] mx-auto" data={post.content} enableGutter={false} />
          {post.relatedPosts && post.relatedPosts.length > 0 && (
            <RelatedPosts
              className="mt-12 max-w-[52rem] lg:grid lg:grid-cols-subgrid col-start-1 col-span-3 grid-rows-[2fr]"
              docs={post.relatedPosts.filter((post) => typeof post === 'object')}
            />
          )}
        </div>
      </div>
    </article>
  )
}

export async function generateMetadata({
  params: paramsPromise,
}: Args): Promise<Metadata> {
  const { slug = '' } = await paramsPromise
  // Decode to support slugs with special characters
  const decodedSlug = decodeURIComponent(slug)
  const locale = await getCurrentLocale()
  const post = await queryPostBySlug({ slug: decodedSlug, locale })

  return generateMeta({
    doc: post,
    locale,
    path: getPostCanonicalPath(decodedSlug),
  })
}

const queryPostBySlug = async ({
  locale,
  slug,
}: {
  locale?: SupportedLocaleCode
  slug: string
}) => {
  const draft = await isAuthorizedDraftMode()

  const payload = await getPayload({ config: configPromise })
  const where = await appendSiteWhere(
    {
      slug: {
        equals: slug,
      },
    },
  )

  const result = await payload.find({
    collection: 'posts',
    draft,
    locale,
    limit: 1,
    overrideAccess: draft,
    pagination: false,
    where,
  })

  return result.docs?.[0] || null
}
