import type { Metadata } from 'next'

import { PayloadRedirects } from '@/components/PayloadRedirects'
import configPromise from '@payload-config'
import { getPayload, type RequiredDataFromCollectionSlug } from 'payload'
import { draftMode } from 'next/headers'
import React, { cache } from 'react'
import { homeStatic } from '@/endpoints/seed/home-static'

import { RenderBlocks } from '@/blocks/RenderBlocks'
import { RenderHero } from '@/heros/RenderHero'
import { Breadcrumbs } from '@/components/Breadcrumbs'
import { generateMeta } from '@/utilities/generateMeta'
import { appendSiteWhere, getCurrentLocale, getCurrentSitePrefix } from '@/utilities/siteContext'
import { JsonLd } from '@/components/JsonLd'
import PageClient from './page.client'
import { LivePreviewListener } from '@/components/LivePreviewListener'
import { RelatedPages } from '@/components/RelatedPages'
import { buildBreadcrumbListJSONLD, buildWebPageJSONLD } from '@/utilities/structuredData'
import { buildPageBreadcrumbItems, type BreadcrumbPage } from '@/utilities/breadcrumbs'
import { getCurrentSiteSettings } from '@/utilities/getSiteSettings'
import { getPageCanonicalPath } from '@/utilities/siteURLs'
import type { SupportedLocaleCode } from '@/utilities/sitePaths'

export async function generateStaticParams() {
  const payload = await getPayload({ config: configPromise })
  const pages = await payload.find({
    collection: 'pages',
    draft: false,
    limit: 1000,
    overrideAccess: false,
    pagination: false,
    select: {
      slug: true,
    },
  })

  const params = pages.docs
    ?.filter((doc) => {
      return doc.slug !== 'home'
    })
    .map(({ slug }) => {
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

export default async function Page({ params: paramsPromise, searchParams }: Args) {
  const { isEnabled: draft } = await draftMode()
  const { slug = 'home' } = await paramsPromise
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const locale = await getCurrentLocale(resolvedSearchParams?.locale)
  const sitePrefix = await getCurrentSitePrefix(resolvedSearchParams?.siteAlias)
  // Decode to support slugs with special characters
  const decodedSlug = decodeURIComponent(slug)
  const url =
    decodedSlug === 'home'
      ? sitePrefix || '/'
      : `${sitePrefix}/${decodedSlug}`.replace(/\/+/g, '/')
  let page: RequiredDataFromCollectionSlug<'pages'> | null

  page = await queryPageBySlug({
    slug: decodedSlug,
    siteCode: resolvedSearchParams?.site,
    locale,
  })

  // Remove this code once your website is seeded
  if (!page && slug === 'home') {
    page = homeStatic
  }

  if (!page) {
    return <PayloadRedirects url={url} />
  }

  const { hero, layout } = page
  const settings = await getCurrentSiteSettings(resolvedSearchParams?.site)
  const canonicalPath = getPageCanonicalPath(decodedSlug)
  const breadcrumbItems = buildPageBreadcrumbItems({ page: page as BreadcrumbPage, settings })
  const relatedPages = (page as { relatedPages?: Parameters<typeof RelatedPages>[0]['pages'] })
    .relatedPages

  return (
    <article className="pt-16 pb-24">
      <JsonLd
        data={[
          buildWebPageJSONLD({
            description: page.meta?.description,
            path: canonicalPath,
            settings,
            title: page.meta?.title || page.title,
          }),
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
      <RenderHero {...hero} />
      <RenderBlocks blocks={layout} />
      <RelatedPages pages={relatedPages} />
    </article>
  )
}

export async function generateMetadata({
  params: paramsPromise,
  searchParams,
}: Args): Promise<Metadata> {
  const { slug = 'home' } = await paramsPromise
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const locale = await getCurrentLocale(resolvedSearchParams?.locale)
  // Decode to support slugs with special characters
  const decodedSlug = decodeURIComponent(slug)
  const page = await queryPageBySlug({
    slug: decodedSlug,
    siteCode: resolvedSearchParams?.site,
    locale,
  })

  return generateMeta({
    doc: page,
    path: getPageCanonicalPath(decodedSlug),
    siteCode: resolvedSearchParams?.site,
  })
}

const queryPageBySlug = cache(
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
    const candidateSlugs = siteCode ? [slug, `${siteCode}-${slug}`] : [slug]
    const where = await appendSiteWhere(
      {
        slug: {
          in: candidateSlugs,
        },
      },
      siteCode,
    )

    const result = await payload.find({
      collection: 'pages',
      draft,
      locale,
      limit: 1,
      pagination: false,
      overrideAccess: draft,
      where,
    })

    return result.docs?.[0] || null
  },
)
