import { HeaderClient } from './Component.client'
import { getCurrentSiteSettings } from '@/utilities/getSiteSettings'
import { resolveHeaderPrimaryAction } from '@/utilities/headerPrimaryActions'
import { getCurrentLocale, getCurrentPublicPathname, getCurrentSite } from '@/utilities/siteContext'
import { defaultThemeKey } from '@/utilities/themeTokens'
import React from 'react'

export async function Header() {
  const settings = await getCurrentSiteSettings()
  const site = await getCurrentSite()
  const locale = await getCurrentLocale()
  const publicPathname = await getCurrentPublicPathname()
  const siteName = settings?.siteName || ''
  const logoText = settings?.branding?.logoText || settings?.siteName
  const themeKey = settings?.branding?.themeKey || defaultThemeKey
  const primaryAction = resolveHeaderPrimaryAction(site.code, locale)

  return (
    <HeaderClient
      data={{
        navItems: settings?.headerNavItems || [],
      }}
      accentColor={settings?.branding?.accentColor}
      brandColor={settings?.branding?.brandColor}
      logoImage={
        settings?.branding?.logoImage && typeof settings.branding.logoImage === 'object'
          ? settings.branding.logoImage
          : null
      }
      logoText={logoText}
      primaryAction={primaryAction}
      publicPathname={publicPathname}
      resolvedLocale={locale}
      siteName={siteName}
      siteCode={site.code}
      tagline={settings?.tagline}
      themeKey={themeKey}
    />
  )
}
