import type { Page } from '@/payload-types'

import React from 'react'

import { SiteLink } from '@/components/SiteLink'
import { getPageCanonicalPath } from '@/utilities/siteURLs'
import { ArrowRightIcon, CompassIcon } from 'lucide-react'

type RelatedPage = Pick<Page, 'slug' | 'title'> & {
  meta?: {
    description?: null | string
  } | null
  pathname?: null | string
}

export const RelatedPages = ({
  locale = 'vi',
  pages,
}: {
  locale?: 'en' | 'vi'
  pages?: Array<number | RelatedPage> | null
}) => {
  const relatedPages = pages?.filter((page): page is RelatedPage => typeof page === 'object') || []
  const copy =
    locale === 'en'
      ? {
          heading: 'Related pages',
          kicker: 'Continue exploring',
        }
      : {
          heading: 'Trang liên quan',
          kicker: 'Tiếp tục khám phá',
        }

  if (relatedPages.length === 0) {
    return null
  }

  return (
    <aside aria-labelledby="related-pages-heading" className="container mt-12">
      <div className="site-related-pages rounded-[var(--site-radius)] border bg-card p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="site-panel-icon">
            <CompassIcon aria-hidden="true" className="h-5 w-5" />
          </div>
          <div>
            <p className="site-brand-kicker text-xs font-semibold uppercase tracking-[0.18em]">
              {copy.kicker}
            </p>
            <h2 className="text-xl font-semibold" id="related-pages-heading">
              {copy.heading}
            </h2>
          </div>
        </div>
        <ul className="grid gap-4 md:grid-cols-2">
          {relatedPages.map((page) => (
            <li className="site-related-pages__item" key={page.pathname || page.slug}>
              <SiteLink className="inline-flex items-center gap-2 font-semibold no-underline" href={getPageCanonicalPath(page)}>
                {page.title}
                <ArrowRightIcon aria-hidden="true" className="h-4 w-4" />
              </SiteLink>
              {page.meta?.description ? (
                <p className="mt-1 text-sm text-muted-foreground">{page.meta.description}</p>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  )
}
