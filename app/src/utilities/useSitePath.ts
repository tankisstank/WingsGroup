'use client'

import { useCallback } from 'react'

import { getLocaleFromPathname, getSiteAliasFromPathname, prefixPathWithSite } from './sitePaths'
import { useSitePublicPathname } from '@/providers/SitePath'

export const useSitePath = () => {
  const pathname = useSitePublicPathname()
  const siteAlias = getSiteAliasFromPathname(pathname)
  const locale = getLocaleFromPathname(pathname)

  return useCallback(
    (path: string) => prefixPathWithSite(path, siteAlias, locale),
    [locale, siteAlias],
  )
}
