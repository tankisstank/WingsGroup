import type { Metadata } from 'next/types'

import { CollectionArchive } from '@/components/CollectionArchive'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'
import { Search } from '@/search/Component'
import PageClient from './page.client'
import { CardPostData } from '@/components/Card'
import { getCurrentLocale, getCurrentSite } from '@/utilities/siteContext'
import { resolveSiteInquiryContactPath } from '@/utilities/siteContactPaths'
import { generateMeta } from '@/utilities/generateMeta'
import { CMSLink } from '@/components/Link'
import { getSearchCopy, searchMetadataCopy, searchPageCopyByLocale } from '@/i18n/searchCopy'
import { CompassIcon, HeadphonesIcon, MapPinnedIcon, PlaneIcon } from 'lucide-react'

type Args = {
  searchParams: Promise<{
    q: string
  }>
}

export default async function Page({ searchParams: searchParamsPromise }: Args) {
  const { q: query } = await searchParamsPromise
  const payload = await getPayload({ config: configPromise })
  const locale = await getCurrentLocale()
  const site = await getCurrentSite()
  const contactPath = resolveSiteInquiryContactPath(site?.code)
  const copy = getSearchCopy(searchPageCopyByLocale, locale)

  const posts = await payload.find({
    collection: 'posts',
    depth: 1,
    limit: 12,
    locale,
    select: {
      title: true,
      slug: true,
      categories: true,
      meta: true,
    },
    ...(query || site
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
    <div className="site-search-page pb-24 pt-24">
      <PageClient />
      <div className="container mb-16">
        <div className="site-search-hero">
          <p className="site-brand-kicker mb-3 text-xs font-semibold uppercase tracking-[0.24em]">
            {copy.kicker}
          </p>
          <h1>{copy.heading}</h1>
          <p>{copy.paragraph}</p>

          <div className="mx-auto mt-8 max-w-[54rem]">
            <Search />
          </div>

          <div className="site-search-suggestions" aria-label={copy.searchAria}>
            {[
              { icon: PlaneIcon, label: copy.suggestions[0] },
              { icon: MapPinnedIcon, label: copy.suggestions[1] },
              { icon: CompassIcon, label: copy.suggestions[2] },
              { icon: HeadphonesIcon, label: copy.suggestions[3] },
            ].map(({ icon: Icon, label }) => (
              <span key={label}>
                <Icon aria-hidden="true" className="h-4 w-4" />
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {posts.totalDocs > 0 ? (
        <CollectionArchive posts={posts.docs as CardPostData[]} />
      ) : (
        <div className="container">
          <div className="site-empty-state">
            <div className="site-panel-icon">
              <HeadphonesIcon aria-hidden="true" className="h-5 w-5" />
            </div>
            <h2>{copy.emptyHeading}</h2>
            <p>{copy.emptyText}</p>
            <CMSLink appearance="default" label={copy.cta} type="custom" url={contactPath} />
          </div>
        </div>
      )}
    </div>
  )
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getCurrentLocale()
  const copy = getSearchCopy(searchMetadataCopy, locale)

  return {
    ...(await generateMeta({
      doc: {
        meta: {
          title: copy.title,
          description: copy.description,
        },
        slug: 'search',
      },
      locale,
      path: '/search',
    })),
    robots: {
      index: false,
      follow: true,
    },
  }
}
