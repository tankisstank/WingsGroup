'use client'
import { useHeaderTheme } from '@/providers/HeaderTheme'
import { usePathname } from 'next/navigation'
import React, { useEffect, useState } from 'react'
import type { Header as HeaderType, Media } from '@/payload-types'
import type { SupportedLocaleCode } from '@/utilities/sitePaths'
import { Logo } from '@/components/Logo/Logo'
import { SiteLink } from '@/components/SiteLink'
import { HeaderNav } from './Nav'

interface HeaderClientProps {
  accentColor?: null | string
  brandColor?: null | string
  data: { navItems?: HeaderType['navItems'] }
  defaultLocale?: SupportedLocaleCode
  englishPublicationState?: 'approved' | 'hidden' | 'route-ready' | null
  logoImage?: Media | null
  logoText?: null | string
  primaryAction?: { label: string; url: string }
  publicPathname?: string
  resolvedLocale?: SupportedLocaleCode
  showSearch?: boolean
  siteID?: null | number | string
  siteName?: null | string
  siteCode?: string
  supportedLocales?: SupportedLocaleCode[]
  tagline?: null | string
  themeKey?: string
  wingsGroupV3Home?: boolean
  wingsGroupV3Surface?: boolean
}

export const HeaderClient: React.FC<HeaderClientProps> = ({
  accentColor,
  brandColor,
  data,
  defaultLocale,
  englishPublicationState,
  logoImage,
  logoText,
  primaryAction,
  publicPathname,
  resolvedLocale,
  showSearch,
  siteID,
  siteName,
  siteCode,
  supportedLocales,
  tagline,
  themeKey,
  wingsGroupV3Home = false,
  wingsGroupV3Surface = false,
}) => {
  const [theme, setTheme] = useState<string | null>(null)
  const { headerTheme, setHeaderTheme } = useHeaderTheme()
  const pathname = usePathname()
  useEffect(() => {
    setHeaderTheme(null)
  }, [pathname, setHeaderTheme])
  useEffect(() => {
    if (headerTheme && headerTheme !== theme) setTheme(headerTheme)
  }, [headerTheme, theme])
  return (
    <header
      className={`container site-header${wingsGroupV3Surface ? ' site-header--wingsgroup-v3' : ''}`}
      {...(wingsGroupV3Surface ? { 'data-od-id': 'site-header' } : {})}
      {...(theme ? { 'data-theme': theme } : {})}
    >
      <div className="site-header__bar flex justify-between">
        <div className="site-header__brand flex items-center gap-3">
          <SiteLink className="inline-flex items-center leading-none" href="/">
            <Logo
              accentColor={accentColor}
              brandColor={brandColor}
              loading="eager"
              logoImage={logoImage}
              logoText={logoText}
              priority="high"
              siteID={siteID}
              siteCode={siteCode}
              surface="header"
            />
          </SiteLink>
          {siteName ? (
            <div className="site-header__brand-copy hidden md:block">
              <div className="site-brand-kicker text-sm font-semibold">{siteName}</div>
              {tagline ? (
                <div className="site-header__tagline text-xs text-muted-foreground">{tagline}</div>
              ) : null}
            </div>
          ) : null}
        </div>
        <HeaderNav
          data={data}
          defaultLocale={defaultLocale}
          englishPublicationState={englishPublicationState}
          primaryAction={primaryAction}
          publicPathname={publicPathname}
          resolvedLocale={resolvedLocale}
          showSearch={showSearch}
          siteCode={siteCode}
          supportedLocales={supportedLocales}
          themeKey={themeKey}
          wingsGroupV3Home={wingsGroupV3Home}
          wingsGroupV3Surface={wingsGroupV3Surface}
        />
      </div>
    </header>
  )
}
