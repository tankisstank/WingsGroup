'use client'

import { usePathname } from 'next/navigation'

import { getLocaleFromPathname, getSiteAliasFromPathname, prefixPathWithSite } from './sitePaths'

export const useSitePath = () => {
  const pathname = usePathname()
  const siteAlias = getSiteAliasFromPathname(pathname)
  const locale = getLocaleFromPathname(pathname)

  return (path: string) => prefixPathWithSite(path, siteAlias, locale)
}
