'use client'

import React, { useState } from 'react'
import { usePathname } from 'next/navigation'

import type { Header as HeaderType } from '@/payload-types'

import { CMSLink } from '@/components/Link'
import { SiteLink } from '@/components/SiteLink'
import { getLocaleFromPathname } from '@/utilities/sitePaths'
import { MenuIcon, SearchIcon, XIcon } from 'lucide-react'

export const HeaderNav: React.FC<{
  data: { navItems?: HeaderType['navItems'] }
  primaryAction?: {
    label: string
    url: string
  }
}> = ({ data, primaryAction }) => {
  const navItems = data?.navItems || []
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const locale = getLocaleFromPathname(pathname) || 'vi'
  const copy =
    locale === 'en'
      ? {
          closeNavigation: 'Close navigation',
          openNavigation: 'Open navigation',
          search: 'Search',
        }
      : {
          closeNavigation: 'Đóng điều hướng',
          openNavigation: 'Mở điều hướng',
          search: 'Tìm kiếm',
        }

  return (
    <div className="site-header__nav">
      <nav aria-label="Primary navigation" className="hidden items-center gap-3 2xl:flex">
        {navItems.map(({ link }, i) => {
          return <CMSLink className="theme-nav-link" key={i} {...link} appearance="link" />
        })}
        {primaryAction ? (
          <SiteLink className="site-header-cta" href={primaryAction.url}>
            {primaryAction.label}
          </SiteLink>
        ) : null}
        <SiteLink className="site-icon-button" href="/search">
          <span className="sr-only">{copy.search}</span>
          <SearchIcon aria-hidden="true" className="h-5 w-5" />
        </SiteLink>
      </nav>

      <div className="flex items-center gap-2 2xl:hidden">
        {primaryAction ? (
          <SiteLink className="site-header-cta site-header-cta--mobile" href={primaryAction.url}>
            {primaryAction.label}
          </SiteLink>
        ) : null}
        <SiteLink className="site-icon-button" href="/search">
          <span className="sr-only">{copy.search}</span>
          <SearchIcon aria-hidden="true" className="h-5 w-5" />
        </SiteLink>
        <button
          aria-controls="mobile-primary-navigation"
          aria-expanded={isOpen}
          aria-label={isOpen ? copy.closeNavigation : copy.openNavigation}
          className="site-icon-button"
          onClick={() => setIsOpen((value) => !value)}
          type="button"
        >
          {isOpen ? (
            <XIcon aria-hidden="true" className="h-5 w-5" />
          ) : (
            <MenuIcon aria-hidden="true" className="h-5 w-5" />
          )}
        </button>
      </div>

      {isOpen ? (
        <nav
          aria-label="Mobile primary navigation"
          className="site-mobile-nav"
          id="mobile-primary-navigation"
        >
          {navItems.map(({ link }, i) => {
            return (
              <CMSLink appearance="inline" className="site-mobile-nav__link" key={i} {...link} />
            )
          })}
          {primaryAction ? (
            <SiteLink className="site-mobile-nav__link site-mobile-nav__link--primary" href={primaryAction.url}>
              {primaryAction.label}
            </SiteLink>
          ) : null}
        </nav>
      ) : null}
    </div>
  )
}
