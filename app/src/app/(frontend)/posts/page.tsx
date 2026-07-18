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

export const dynamic = 'force-dynamic'

export default async function Page() {
  const payload = await getPayload({ config: configPromise })
  const locale = await getCurrentLocale()
  const site = await getCurrentSite()
  const copy = {
    en: {
      title: 'Posts',
    },
    vi: {
      title: 'Bài viết',
    },
  }[getCopyLocale(locale)]

  const posts = await payload.find({
    collection: 'posts',
    depth: 1,
    limit: 12,
    locale,
    overrideAccess: false,
    select: {
      title: true,
      slug: true,
      categories: true,
      meta: true,
    },
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
        {posts.totalPages > 1 && posts.page && (
          <Pagination page={posts.page} totalPages={posts.totalPages} />
        )}
      </div>
    </div>
  )
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getCurrentLocale()
  const copy = {
    en: {
      description:
        'Read WingsGroup articles about tour planning, departure schedules, campaign guidance, and service updates across the travel ecosystem.',
      title: 'Posts',
    },
    vi: {
      description:
        'Đọc bài viết WingsGroup về kinh nghiệm chọn tour, lịch khởi hành, campaign du lịch và cập nhật dịch vụ trong hệ sinh thái.',
      title: 'Bài viết',
    },
  }[getCopyLocale(locale)]

  return generateMeta({
    doc: {
      meta: {
        title: copy.title,
        description: copy.description,
      },
      slug: 'posts',
    },
    locale,
    path: '/posts',
  })
}
