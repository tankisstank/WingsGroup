import type { Page } from '@/payload-types'

import React from 'react'

import { SiteLink } from '@/components/SiteLink'
import { getPageCanonicalPath } from '@/utilities/siteURLs'

type RelatedPage = Pick<Page, 'slug' | 'title'> & {
  meta?: {
    description?: null | string
  } | null
}

export const RelatedPages = ({ pages }: { pages?: Array<number | RelatedPage> | null }) => {
  const relatedPages = pages?.filter((page): page is RelatedPage => typeof page === 'object') || []

  if (relatedPages.length === 0) {
    return null
  }

  return (
    <aside aria-labelledby="related-pages-heading" className="container mt-12">
      <div className="rounded-[var(--site-radius)] border bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold" id="related-pages-heading">
          Related pages
        </h2>
        <ul className="grid gap-4 md:grid-cols-2">
          {relatedPages.map((page) => (
            <li key={page.slug}>
              <SiteLink className="theme-nav-link font-medium" href={getPageCanonicalPath(page.slug)}>
                {page.title}
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
