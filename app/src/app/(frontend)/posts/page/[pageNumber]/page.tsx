import type { Metadata } from 'next/types'

import { CollectionArchive } from '@/components/CollectionArchive'
import { PageRange } from '@/components/PageRange'
import { Pagination } from '@/components/Pagination'
import { getCurrentLocale, getCurrentSite } from '@/utilities/siteContext'
import { generateMeta } from '@/utilities/generateMeta'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'
import PageClient from './page.client'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

type Args = {
  params: Promise<{
    pageNumber: string
  }>
  searchParams?: Promise<{
    locale?: string
    site?: string
  }>
}

export default async function Page({ params: paramsPromise, searchParams }: Args) {
  const { pageNumber } = await paramsPromise
  const payload = await getPayload({ config: configPromise })
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const locale = await getCurrentLocale(resolvedSearchParams?.locale)
  const site = await getCurrentSite(resolvedSearchParams?.site)

  const sanitizedPageNumber = Number(pageNumber)

  if (!Number.isInteger(sanitizedPageNumber)) notFound()

  const posts = await payload.find({
    collection: 'posts',
    depth: 1,
    limit: 12,
    locale,
    page: sanitizedPageNumber,
    overrideAccess: false,
    ...(site
      ? {
          where: {
            site: {
              equals: site.id,
            },
          },
        }
      : {}),
  })

  return (
    <div className="pt-24 pb-24">
      <PageClient />
      <div className="container mb-16">
        <div className="prose dark:prose-invert max-w-none">
          <h1>{locale === 'en' ? 'Posts' : 'Bài viết'}</h1>
          {site ? <p>{site.name}</p> : null}
        </div>
      </div>

      <div className="container mb-8">
        <PageRange
          collection="posts"
          currentPage={posts.page}
          limit={12}
          totalDocs={posts.totalDocs}
        />
      </div>

      <CollectionArchive posts={posts.docs} />

      <div className="container">
        {posts?.page && posts?.totalPages > 1 && (
          <Pagination page={posts.page} totalPages={posts.totalPages} />
        )}
      </div>
    </div>
  )
}

export async function generateMetadata({
  params: paramsPromise,
  searchParams,
}: Args): Promise<Metadata> {
  const { pageNumber } = await paramsPromise
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const locale = await getCurrentLocale(resolvedSearchParams?.locale)

  return generateMeta({
    doc: {
      meta: {
        title:
          locale === 'en'
            ? `Posts Page ${pageNumber || ''}`
            : `Trang bài viết ${pageNumber || ''}`,
        description:
          locale === 'en'
            ? 'Paginated travel articles and updates.'
            : 'Danh sách bài viết và cập nhật theo trang.',
      },
      slug: `posts/page/${pageNumber || ''}`,
    },
    locale,
    path: `/posts/page/${pageNumber || ''}`,
    siteCode: resolvedSearchParams?.site,
  })
}
