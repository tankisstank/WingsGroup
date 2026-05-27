import type { Metadata } from 'next/types'

import { CollectionArchive } from '@/components/CollectionArchive'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'
import { Search } from '@/search/Component'
import PageClient from './page.client'
import { CardPostData } from '@/components/Card'
import { getCurrentLocale, getCurrentSite } from '@/utilities/siteContext'
import { generateMeta } from '@/utilities/generateMeta'

type Args = {
  searchParams: Promise<{
    q: string
    locale?: string
    site?: string
  }>
}
export default async function Page({ searchParams: searchParamsPromise }: Args) {
  const { locale: localeParam, q: query, site: siteCode } = await searchParamsPromise
  const payload = await getPayload({ config: configPromise })
  const locale = await getCurrentLocale(localeParam)
  const site = await getCurrentSite(siteCode)

  const posts = await payload.find({
    collection: 'search',
    depth: 1,
    limit: 12,
    locale,
    select: {
      title: true,
      slug: true,
      categories: true,
      meta: true,
    },
    // pagination: false reduces overhead if you don't need totalDocs
    pagination: false,
    ...((query || site)
      ? {
          where: {
            and: [
              ...(site
                ? [
                    {
                      site: {
                        equals: site.id,
                      },
                    },
                  ]
                : []),
              ...(query
                ? [
                    {
                      or: [
                        {
                          title: {
                            like: query,
                          },
                        },
                        {
                          'meta.description': {
                            like: query,
                          },
                        },
                        {
                          'meta.title': {
                            like: query,
                          },
                        },
                        {
                          slug: {
                            like: query,
                          },
                        },
                      ],
                    },
                  ]
                : []),
            ],
          },
        }
      : {}),
  })

  return (
    <div className="pt-24 pb-24">
      <PageClient />
      <div className="container mb-16">
        <div className="prose dark:prose-invert max-w-none text-center">
          <h1 className="mb-8 lg:mb-16">Search</h1>

          <div className="max-w-[50rem] mx-auto">
            <Search />
          </div>
        </div>
      </div>

      {posts.totalDocs > 0 ? (
        <CollectionArchive posts={posts.docs as CardPostData[]} />
      ) : (
        <div className="container">No results found.</div>
      )}
    </div>
  )
}

export async function generateMetadata({ searchParams }: Args): Promise<Metadata> {
  const { locale: localeParam, site: siteCode } = await searchParams
  await getCurrentLocale(localeParam)

  return {
    ...(await generateMeta({
      doc: {
        meta: {
          title: 'Search',
          description: 'Search public WingsTravel content.',
        },
        slug: 'search',
      },
      path: '/search',
      siteCode,
    })),
    robots: {
      index: false,
      follow: true,
    },
  }
}
