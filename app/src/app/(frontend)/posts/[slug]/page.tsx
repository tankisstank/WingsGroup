import type { Metadata } from 'next'

import { RelatedPosts } from '@/blocks/RelatedPosts/Component'
import { PayloadRedirects } from '@/components/PayloadRedirects'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { draftMode } from 'next/headers'
import React, { cache } from 'react'
import RichText from '@/components/RichText'

import type { Post } from '@/payload-types'

import { PostHero } from '@/heros/PostHero'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { generateMeta } from '@/utilities/generateMeta'
import { appendSiteWhere, getCurrentLocale, getCurrentSitePrefix } from '@/utilities/siteContext'
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

export async function generateStaticParams() {
  const payload = await getPayload({ config: configPromise })
  const posts = await payload.find({
    collection: 'posts',
    draft: false,
    limit: 1000,
    overrideAccess: false,
    pagination: false,
    select: {
      slug: true,
    },
  })

  const params = posts.docs.map(({ slug }) => {
    return { slug }
  })

  return params
}

type Args = {
  params: Promise<{
    slug?: string
  }>
  searchParams?: Promise<{
    site?: string
    siteAlias?: string
    locale?: SupportedLocaleCode
  }>
}

export default async function Post({ params: paramsPromise, searchParams }: Args) {
  const { isEnabled: draft } = await draftMode()
  const { slug = '' } = await paramsPromise
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const locale = await getCurrentLocale(resolvedSearchParams?.locale)
  const sitePrefix = await getCurrentSitePrefix(resolvedSearchParams?.siteAlias)
  // Decode to support slugs with special characters
  const decodedSlug = decodeURIComponent(slug)
  const url = `${sitePrefix}/posts/${decodedSlug}`.replace(/\/+/g, '/')
  const post = await queryPostBySlug({ slug: decodedSlug, siteCode: resolvedSearchParams?.site, locale })

  if (!post) return <PayloadRedirects url={url} />

  const settings = await getCurrentSiteSettings(resolvedSearchParams?.site)
  const canonicalPath = getPostCanonicalPath(decodedSlug)
  const breadcrumbItems = buildPostBreadcrumbItems({ post: post as BreadcrumbPost, settings })

  return (
    <article className="pt-16 pb-16">
      <JsonLd
        data={[
          buildWebPageJSONLD({
            description: post.meta?.description,
            path: canonicalPath,
            settings,
            title: post.meta?.title || post.title,
          }),
          buildArticleJSONLD({ path: canonicalPath, post, settings }),
          buildBreadcrumbListJSONLD(
            breadcrumbItems.map((item) => ({ name: item.label, path: item.path })),
            settings,
          ),
        ]}
      />
      <PageClient />

      {/* Allows redirects for valid pages too */}
      <PayloadRedirects disableNotFound url={url} />

      {draft && <LivePreviewListener />}

      <Breadcrumbs items={breadcrumbItems} />
      <PostHero post={post} />

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
  searchParams,
}: Args): Promise<Metadata> {
  const { slug = '' } = await paramsPromise
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  // Decode to support slugs with special characters
  const decodedSlug = decodeURIComponent(slug)
  const locale = await getCurrentLocale(resolvedSearchParams?.locale)
  const post = await queryPostBySlug({ slug: decodedSlug, siteCode: resolvedSearchParams?.site, locale })

  return generateMeta({
    doc: post,
    path: getPostCanonicalPath(decodedSlug),
    siteCode: resolvedSearchParams?.site,
  })
}

const queryPostBySlug = cache(
  async ({
    locale,
    siteCode,
    slug,
  }: {
    locale?: SupportedLocaleCode
    siteCode?: string
    slug: string
  }) => {
    const { isEnabled: draft } = await draftMode()

    const payload = await getPayload({ config: configPromise })
    const where = await appendSiteWhere(
      {
        slug: {
          equals: slug,
        },
      },
      siteCode,
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
  },
)
