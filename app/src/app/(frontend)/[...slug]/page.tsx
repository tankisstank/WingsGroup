import type { Metadata } from 'next'

import { PayloadRedirects } from '@/components/PayloadRedirects'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { draftMode } from 'next/headers'
import React from 'react'

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

type Args = {
  params: Promise<{
    slug?: string[]
  }>
  searchParams?: Promise<{
    site?: string
    siteAlias?: string
    locale?: SupportedLocaleCode
  }>
}

export default async function Page({ params: paramsPromise, searchParams }: Args) {
  const { isEnabled: draft } = await draftMode()
  const { slug = [] } = await paramsPromise
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const locale = await getCurrentLocale(resolvedSearchParams?.locale)
  const sitePrefix = await getCurrentSitePrefix(resolvedSearchParams?.siteAlias)
  const decodedSegments = slug.map((segment) => decodeURIComponent(segment))
  const requestedPath = decodedSegments.length > 0 ? `/${decodedSegments.join('/')}` : '/'
  const url = `${sitePrefix}${requestedPath === '/' ? '' : requestedPath}`.replace(/\/+/g, '/')
  const page = await queryPageByPath({
    locale,
    requestedPath,
    siteCode: resolvedSearchParams?.site,
  })

  if (!page) {
    return <PayloadRedirects url={url} />
  }

  const { hero, layout } = page
  const settings = await getCurrentSiteSettings(resolvedSearchParams?.site)
  const canonicalPath = getPageCanonicalPath(page, locale)
  const breadcrumbItems = buildPageBreadcrumbItems({
    locale,
    page: page as BreadcrumbPage,
    settings,
  })
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
  const { slug = [] } = await paramsPromise
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const locale = await getCurrentLocale(resolvedSearchParams?.locale)
  const decodedSegments = slug.map((segment) => decodeURIComponent(segment))
  const requestedPath = decodedSegments.length > 0 ? `/${decodedSegments.join('/')}` : '/'
  const page = await queryPageByPath({
    locale,
    requestedPath,
    siteCode: resolvedSearchParams?.site,
  })

  return generateMeta({
    doc: page,
    locale,
    path: requestedPath,
    siteCode: resolvedSearchParams?.site,
  })
}

const queryPageByPath = async ({
  locale,
  requestedPath,
  siteCode,
}: {
  locale?: SupportedLocaleCode
  requestedPath: string
  siteCode?: string
}) => {
  const { isEnabled: draft } = await draftMode()
  const payload = await getPayload({ config: configPromise })
  const segments = requestedPath.split('/').filter(Boolean)
  const candidateSlug = segments[segments.length - 1] || 'home'
  const candidateSlugs = siteCode ? [candidateSlug, `${siteCode}-${candidateSlug}`] : [candidateSlug]
  const where = await appendSiteWhere(
    {
      or: [
        {
          pathname: {
            equals: requestedPath,
          },
        },
        {
          slug: {
            in: candidateSlugs,
          },
        },
      ],
    },
    siteCode,
  )

  const result = await payload.find({
    collection: 'pages',
    draft,
    locale,
    depth: 3,
    limit: 1,
    pagination: false,
    overrideAccess: draft,
    where,
  })

  return result.docs?.[0] || null
}
