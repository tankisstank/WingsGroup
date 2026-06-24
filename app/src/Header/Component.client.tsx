'use client'
import { useHeaderTheme } from '@/providers/HeaderTheme'
import { usePathname } from 'next/navigation'
import React, { useEffect, useState } from 'react'

import type { Header as HeaderType, Media } from '@/payload-types'

import { Logo } from '@/components/Logo/Logo'
import { SiteLink } from '@/components/SiteLink'
import { HeaderNav } from './Nav'

interface HeaderClientProps {
  accentColor?: null | string
  brandColor?: null | string
  data: {
    navItems?: HeaderType['navItems']
  }
  logoImage?: Media | null
  logoText?: null | string
  primaryAction?: {
    label: string
    url: string
  }
  resolvedLocale?: 'en' | 'vi'
  siteName?: null | string
  tagline?: null | string
}

export const HeaderClient: React.FC<HeaderClientProps> = ({
  accentColor,
  brandColor,
  data,
  logoImage,
  logoText,
  primaryAction,
  resolvedLocale,
  siteName,
  tagline,
}) => {
  /* Storing the value in a useState to avoid hydration errors */
  const [theme, setTheme] = useState<string | null>(null)
  const { headerTheme, setHeaderTheme } = useHeaderTheme()
  const pathname = usePathname()

  useEffect(() => {
    setHeaderTheme(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  useEffect(() => {
    if (headerTheme && headerTheme !== theme) setTheme(headerTheme)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headerTheme])

  return (
    <header className="container site-header" {...(theme ? { 'data-theme': theme } : {})}>
      <div className="site-header__bar py-8 flex justify-between border-b">
        <div className="site-header__brand flex items-center gap-3">
          <SiteLink href="/">
            <Logo
              accentColor={accentColor}
              brandColor={brandColor}
              loading="eager"
              logoImage={logoImage}
              logoText={logoText}
              priority="high"
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
        <HeaderNav data={data} primaryAction={primaryAction} resolvedLocale={resolvedLocale} />
      </div>
    </header>
  )
}
