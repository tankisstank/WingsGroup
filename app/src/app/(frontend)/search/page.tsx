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
import { CMSLink } from '@/components/Link'
import { CompassIcon, HeadphonesIcon, MapPinnedIcon, PlaneIcon } from 'lucide-react'

const contactPathBySiteCode: Record<string, string> = {
  'wings-care': '/contact',
  'wings-go': '/lien-he',
  'wings-pass': '/contact',
  'wings-plus': '/request-proposal',
  'wings-side': '/contact-us',
  'wings-group': '/lien-he',
}

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
  const contactPath = contactPathBySiteCode[site?.code || 'wings-group'] || '/lien-he'
  const copy =
    locale === 'en'
      ? {
          cta: 'Request consultation',
          emptyHeading: 'No matching result found',
          emptyText:
            'The content may not be published yet, or the request may need a consultation based on actual inventory and schedule. Send an inquiry so the WingsGroup team can review and respond with a suitable direction.',
          heading: 'Search tours, destinations, and campaigns quickly',
          kicker: 'Search WingsGroup',
          paragraph:
            'Enter a market, travel season, city, or travel type. If the right content is not available yet, send a request so the team can review the relevant schedule and package options.',
          searchAria: 'Search suggestions',
          suggestions: ['Korea tours', 'Jeju / Seoul', 'Vietnam inbound', 'Private consultation'],
        }
      : {
          cta: 'Gửi yêu cầu tư vấn',
          emptyHeading: 'Chưa tìm thấy kết quả phù hợp',
          emptyText:
            'Có thể nội dung chưa được publish hoặc cần tư vấn theo lịch khởi hành thực tế. Gửi yêu cầu để team WingsGroup kiểm tra và phản hồi phương án phù hợp.',
          heading: 'Tìm nhanh tour, điểm đến và chiến dịch',
          kicker: 'Tìm kiếm WingsGroup',
          paragraph:
            'Nhập thị trường, mùa đi, thành phố hoặc loại trải nghiệm. Nếu chưa tìm thấy nội dung phù hợp, hãy gửi yêu cầu để đội ngũ tư vấn kiểm tra lịch và gói phù hợp.',
          searchAria: 'Gợi ý tìm kiếm',
          suggestions: ['Tour Hàn Quốc', 'Jeju / Seoul', 'Vietnam inbound', 'Tư vấn riêng'],
        }

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

export async function generateMetadata({ searchParams }: Args): Promise<Metadata> {
  const { locale: localeParam, site: siteCode } = await searchParams
  const locale = await getCurrentLocale(localeParam)

  return {
    ...(await generateMeta({
      doc: {
        meta: {
          title: locale === 'en' ? 'Search' : 'Tìm kiếm',
          description:
            locale === 'en'
              ? 'Search WingsGroup tours, destinations, seasonal campaigns, departure schedules, and travel service articles across the public site.'
              : 'Tìm kiếm tour, điểm đến, campaign theo mùa, lịch khởi hành và bài viết dịch vụ du lịch trên WingsGroup.',
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
