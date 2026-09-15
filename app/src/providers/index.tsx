import React from 'react'
import type { SupportedLocaleCode } from '@/utilities/locales'

import { HeaderThemeProvider } from './HeaderTheme'
import { ThemeProvider } from './Theme'
import { SitePathProvider } from './SitePath'

export const Providers: React.FC<{
  children: React.ReactNode
  publicLocale: SupportedLocaleCode
  publicPathname: string
  siteCode?: string
}> = ({ children, publicLocale, publicPathname, siteCode }) => {
  return (
    <SitePathProvider publicLocale={publicLocale} publicPathname={publicPathname}>
      <ThemeProvider siteCode={siteCode}>
        <HeaderThemeProvider>{children}</HeaderThemeProvider>
      </ThemeProvider>
    </SitePathProvider>
  )
}
