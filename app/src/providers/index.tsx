import React from 'react'
import type { SupportedLocaleCode } from '@/utilities/locales'

import { HeaderThemeProvider } from './HeaderTheme'
import { ThemeProvider } from './Theme'
import { SitePathProvider } from './SitePath'

export const Providers: React.FC<{
  children: React.ReactNode
  publicLocale: SupportedLocaleCode
  publicPathname: string
}> = ({ children, publicLocale, publicPathname }) => {
  return (
    <SitePathProvider publicLocale={publicLocale} publicPathname={publicPathname}>
      <ThemeProvider>
        <HeaderThemeProvider>{children}</HeaderThemeProvider>
      </ThemeProvider>
    </SitePathProvider>
  )
}
