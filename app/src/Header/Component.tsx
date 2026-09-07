import { HeaderClient } from './Component.client'
import { getCurrentSiteSettings } from '@/utilities/getSiteSettings'
import { resolveHeaderPrimaryAction } from '@/utilities/headerPrimaryActions'
import { getCurrentLocale, getCurrentPublicPathname, getCurrentSite } from '@/utilities/siteContext'
import { defaultThemeKey } from '@/utilities/themeTokens'
import { isWingsGroupBrandSite } from '@/wingsgroup/brand'
import React from 'react'
import {
  isWingsGroupV3ExactPublicInventoryEnabled,
  isWingsGroupV3SurfacePath,
} from '@/wingsgroup/corporateRoutes'

export async function Header() {
  const settings = await getCurrentSiteSettings()
  const site = await getCurrentSite()
  const locale = await getCurrentLocale()
  const publicPathname = await getCurrentPublicPathname()
  const siteName = settings?.siteName || ''
  const logoText = settings?.branding?.logoText || settings?.siteName
  const hasConfiguredLogoImage = Boolean(
    settings?.branding?.logoImage &&
    typeof settings.branding.logoImage === 'object' &&
    'url' in settings.branding.logoImage &&
    settings.branding.logoImage.url,
  )
  const usesWingsGroupBrandFallback = isWingsGroupBrandSite(site.code) && !hasConfiguredLogoImage
  const themeKey = settings?.branding?.themeKey || defaultThemeKey
  const isWingsGroupHome =
    site.code === 'wings-group' &&
    publicPathname === '/' &&
    settings?.wingsGroupV3?.enabled === true
  const isWingsGroupV3Surface =
    site.code === 'wings-group' &&
    settings?.wingsGroupV3?.enabled === true &&
    isWingsGroupV3SurfacePath(publicPathname)
  const primaryAction = isWingsGroupV3Surface
    ? {
        label: locale === 'en' ? 'Speak with a specialist' : 'Trao đổi nhu cầu',
        url: '#consultation-dialog',
      }
    : resolveHeaderPrimaryAction(site.code, locale)

  return (
    <HeaderClient
      data={{ navItems: settings?.headerNavItems || [] }}
      englishPublicationState={settings?.wingsGroupV3?.englishPublicationState}
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
      showSearch={!isWingsGroupV3ExactPublicInventoryEnabled({ settings, siteCode: site.code })}
      siteID={site.id}
      siteName={siteName}
      siteCode={site.code}
      supportedLocales={site.supportedLocales}
      tagline={usesWingsGroupBrandFallback ? null : settings?.tagline}
      themeKey={themeKey}
      wingsGroupV3Home={isWingsGroupHome}
      wingsGroupV3Surface={isWingsGroupV3Surface}
    />
  )
}
