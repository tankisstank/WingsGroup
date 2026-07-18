import type { Page } from '@/payload-types'

import React from 'react'

import { SiteLink } from '@/components/SiteLink'
import { getPageCanonicalPath } from '@/utilities/siteURLs'
import type { SupportedLocaleCode } from '@/utilities/sitePaths'
import { getRuntimeLocaleCopy, publicChromeCopy } from '@/i18n/publicCopy'
import { ArrowRightIcon, CompassIcon } from 'lucide-react'

type RelatedPage = Pick<Page, 'slug' | 'title'> & {
  meta?: {
    description?: null | string
  } | null
  pathname?: null | string
}

const compactDescription = (value?: null | string) => {
  const text = String(value || '')
    .replace(/\s+/g, ' ')
    .replace(/\b(?:bay\s+)?(?:vna|vj|vn)\b/giu, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()

  if (!text) return null

  const beforeOperationalDetails = text
    .split(/\b(?:Thời gian|Hàng không|Khởi hành)\s*:/iu)[0]
    ?.trim()
  const summary = beforeOperationalDetails || text

  return summary.length > 160 ? `${summary.slice(0, 157).replace(/\s+\S*$/, '')}...` : summary
}

export const RelatedPages = ({
  locale = 'vi',
  pages,
}: {
  locale?: SupportedLocaleCode
  pages?: Array<number | RelatedPage> | null
}) => {
  const relatedPages = pages?.filter((page): page is RelatedPage => typeof page === 'object') || []
  const copy = getRuntimeLocaleCopy(publicChromeCopy, locale)

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
              {copy.relatedPagesKicker}
            </p>
            <h2 className="text-xl font-semibold" id="related-pages-heading">
              {copy.relatedPagesHeading}
            </h2>
          </div>
        </div>
        <ul className="grid gap-4 md:grid-cols-2">
          {relatedPages.map((page) => (
            <li className="site-related-pages__item" key={page.pathname || page.slug}>
              <SiteLink
                className="site-related-pages__link block h-full no-underline"
                href={getPageCanonicalPath(page)}
              >
                <span className="inline-flex items-center gap-2 font-semibold">
                  {page.title}
                  <ArrowRightIcon aria-hidden="true" className="h-4 w-4" />
                </span>
                {compactDescription(page.meta?.description) ? (
                  <span className="mt-1 block text-sm text-muted-foreground">
                    {compactDescription(page.meta?.description)}
                  </span>
                ) : null}
              </SiteLink>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  )
}
