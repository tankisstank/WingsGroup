import type { Metadata } from 'next/types'

import { CollectionArchive } from '@/components/CollectionArchive'
import { PageRange } from '@/components/PageRange'
import { Pagination } from '@/components/Pagination'
import { getCurrentLocale, getCurrentSite } from '@/utilities/siteContext'
import { generateMeta } from '@/utilities/generateMeta'
import { getCopyLocale } from '@/utilities/locales'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'
import PageClient from './page.client'
import { notFound } from 'next/navigation'
import { getCurrentSiteSettings } from '@/utilities/getSiteSettings'
import { isWingsGroupV3PublicSurfacePathAllowed } from '@/wingsgroup/corporateRoutes'

export const dynamic = 'force-dynamic'

type Args = {
  params: Promise<{
    pageNumber: string
  }>
}

export default async function Page({ params: paramsPromise }: Args) {
  const { pageNumber } = await paramsPromise
  const payload = await getPayload({ config: configPromise })
  const locale = await getCurrentLocale()
  const site = await getCurrentSite()
  const settings = await getCurrentSiteSettings()
  if (
    !isWingsGroupV3PublicSurfacePathAllowed({
      locale,
      path: `/posts/page/${pageNumber}`,
      settings,
      siteCode: site.code,
    })
  ) {
    notFound()
  }
  const copy = {
    en: {
      title: 'Posts',
    },
    vi: {
      title: 'Bài viết',
    },
  }[getCopyLocale(locale)]

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
          <h1>{copy.title}</h1>
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
}: Args): Promise<Metadata> {
  const { pageNumber } = await paramsPromise
  const locale = await getCurrentLocale()
  const copy = {
    en: {
      description: 'Paginated travel articles and updates.',
      title: `Posts Page ${pageNumber || ''}`,
    },
    vi: {
      description: 'Danh sách bài viết và cập nhật theo trang.',
      title: `Trang bài viết ${pageNumber || ''}`,
    },
  }[getCopyLocale(locale)]

  return generateMeta({
    doc: {
      meta: {
        title: copy.title,
        description: copy.description,
      },
      slug: `posts/page/${pageNumber || ''}`,
    },
    locale,
    path: `/posts/page/${pageNumber || ''}`,
  })
}
