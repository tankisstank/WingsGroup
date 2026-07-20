import React from 'react'

import { SiteLink } from '@/components/SiteLink'
import type { BreadcrumbItem } from '@/utilities/breadcrumbs'

export const Breadcrumbs = ({
  className,
  items,
}: {
  className?: string
  items: BreadcrumbItem[]
}) => {
  if (items.length < 2) {
    return null
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className={
        className || 'container pt-8 text-sm text-muted-foreground'
      }
    >
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((item, index) => {
          const isLast = index === items.length - 1

          return (
            <li className="flex items-center gap-2" key={`${item.path}-${index}`}>
              {index > 0 ? <span aria-hidden="true">/</span> : null}
              {isLast ? (
                <span aria-current="page" className="text-foreground">
                  {item.label}
                </span>
              ) : (
                <SiteLink className="theme-nav-link" href={item.path}>
                  {item.label}
                </SiteLink>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
