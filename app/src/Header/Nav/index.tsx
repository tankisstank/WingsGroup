'use client'

import React, { useState } from 'react'

import type { Header as HeaderType } from '@/payload-types'

import { CMSLink } from '@/components/Link'
import { SiteLink } from '@/components/SiteLink'
import { MenuIcon, SearchIcon, XIcon } from 'lucide-react'

export const HeaderNav: React.FC<{
  data: { navItems?: HeaderType['navItems'] }
  primaryAction?: {
    label: string
    url: string
  }
  resolvedLocale?: 'en' | 'vi'
}> = ({ data, primaryAction, resolvedLocale = 'vi' }) => {
  const navItems = data?.navItems || []
  const [isOpen, setIsOpen] = useState(false)
  const locale = resolvedLocale
  const shouldRenderPrimaryAction =
    primaryAction &&
    !navItems.some(({ link }) => {
      const label = link?.label?.trim().toLowerCase()
      const url = link?.url?.replace(/\/+$/, '') || '/'
      const primaryLabel = primaryAction.label.trim().toLowerCase()
      const primaryURL = primaryAction.url.replace(/\/+$/, '') || '/'

      return label === primaryLabel || url === primaryURL
    })
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
        {shouldRenderPrimaryAction ? (
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
        {shouldRenderPrimaryAction ? (
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
          {shouldRenderPrimaryAction ? (
            <SiteLink className="site-mobile-nav__link site-mobile-nav__link--primary" href={primaryAction.url}>
              {primaryAction.label}
            </SiteLink>
          ) : null}
        </nav>
      ) : null}
    </div>
  )
}
