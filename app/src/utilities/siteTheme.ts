import type { SiteSetting } from '@/payload-types'
import type React from 'react'

export const defaultSiteBrandColor = '#0F172A'
export const defaultSiteAccentColor = '#F59E0B'

export const getSiteThemeTokens = (settings?: null | SiteSetting) => {
  const brandColor = settings?.branding?.brandColor || defaultSiteBrandColor
  const accentColor = settings?.branding?.accentColor || defaultSiteAccentColor

  return {
    accentColor,
    brandColor,
    style: {
      '--site-brand': brandColor,
      '--site-accent': accentColor,
    } as React.CSSProperties,
    themeName: settings?.siteName || 'WingsTravel',
  }
}
