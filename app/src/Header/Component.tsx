import { HeaderClient } from './Component.client'
import { getCurrentSiteSettings } from '@/utilities/getSiteSettings'
import React from 'react'

export async function Header() {
  const settings = await getCurrentSiteSettings()
  const siteName = settings?.siteName || ''
  const logoText = settings?.branding?.logoText || settings?.siteName
  const normalizedName = `${siteName} ${logoText || ''}`.toLowerCase()
  const primaryAction = normalizedName.includes('wingsgo')
    ? { label: 'Giữ chỗ', url: '/lien-he' }
    : normalizedName.includes('wingsside')
      ? { label: 'Plan your trip', url: '/plan-your-trip' }
      : { label: 'Liên hệ', url: '/lien-he' }

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
      siteName={siteName}
      tagline={settings?.tagline}
    />
  )
}
