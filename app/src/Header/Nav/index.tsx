'use client'

import React from 'react'

import type { Header as HeaderType } from '@/payload-types'

import { CMSLink } from '@/components/Link'
import { SiteLink } from '@/components/SiteLink'
import { SearchIcon } from 'lucide-react'

export const HeaderNav: React.FC<{ data: { navItems?: HeaderType['navItems'] } }> = ({ data }) => {
  const navItems = data?.navItems || []

  return (
    <nav aria-label="Primary navigation" className="flex gap-3 items-center">
      {navItems.map(({ link }, i) => {
        return <CMSLink className="theme-nav-link" key={i} {...link} appearance="link" />
      })}
      <SiteLink href="/search">
        <span className="sr-only">Search</span>
        <SearchIcon className="w-5 text-primary" />
      </SiteLink>
    </nav>
  )
}
