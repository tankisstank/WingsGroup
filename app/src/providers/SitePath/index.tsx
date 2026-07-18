'use client'

import { usePathname } from 'next/navigation'
import React, { createContext, useContext, useEffect, useState } from 'react'

import { isSupportedLocale, type SupportedLocaleCode } from '@/utilities/locales'
import { getLocaleFromPathname } from '@/utilities/sitePaths'

const SitePublicPathContext = createContext<string | null>(null)
const SitePublicLocaleContext = createContext<SupportedLocaleCode | null>(null)

export const SitePathProvider = ({
  children,
  publicLocale,
  publicPathname,
}: {
  children: React.ReactNode
  publicLocale: SupportedLocaleCode
  publicPathname: string
}) => (
  <SitePublicPathContext.Provider value={publicPathname}>
    <SitePublicLocaleContext.Provider value={publicLocale}>{children}</SitePublicLocaleContext.Provider>
  </SitePublicPathContext.Provider>
)

export const useSitePublicPathname = (): string => {
  const serverResolvedPathname = useContext(SitePublicPathContext)
  const nextPathname = usePathname()
  const [publicPathname, setPublicPathname] = useState<string | null>(null)

  useEffect(() => {
    setPublicPathname(window.location.pathname || '/')
  }, [nextPathname])

  // Next's router pathname can reflect the rewritten internal route instead of
  // the public browser URL for this multisite setup. The URL in the address
  // bar is the authoritative source after mount; the server-resolved public
  // pathname remains the stable SSR / pre-hydration fallback.
  return publicPathname || serverResolvedPathname || nextPathname || '/'
}

export const useSitePublicLocale = (): SupportedLocaleCode => {
  const serverResolvedLocale = useContext(SitePublicLocaleContext)
  const pathname = useSitePublicPathname()
  const pathnameLocale = getLocaleFromPathname(pathname)
  const [documentLocale, setDocumentLocale] = useState<SupportedLocaleCode | null>(null)

  useEffect(() => {
    const lang = document.documentElement.lang?.toLowerCase()
    setDocumentLocale(isSupportedLocale(lang) ? lang : null)
  }, [pathname])

  return pathnameLocale || documentLocale || serverResolvedLocale || 'vi'
}
