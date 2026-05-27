'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React from 'react'

import { getLocaleFromPathname, getSiteAliasFromPathname, prefixPathWithSite } from '@/utilities/sitePaths'

type Props = React.ComponentProps<typeof Link>

export const SiteLink: React.FC<Props> = ({ href, ...props }) => {
  const pathname = usePathname()
  const siteAlias = getSiteAliasFromPathname(pathname)
  const locale = getLocaleFromPathname(pathname)
  const resolvedHref =
    typeof href === 'string' ? prefixPathWithSite(href, siteAlias, locale) : href

  return <Link href={resolvedHref} {...props} />
}
