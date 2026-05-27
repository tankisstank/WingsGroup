import { HeaderClient } from './Component.client'
import { getCurrentSiteSettings } from '@/utilities/getSiteSettings'
import React from 'react'

export async function Header() {
  const settings = await getCurrentSiteSettings()

  return (
    <HeaderClient
      data={{
        navItems: settings?.headerNavItems || [],
      }}
      accentColor={settings?.branding?.accentColor}
      brandColor={settings?.branding?.brandColor}
      logoText={settings?.branding?.logoText || settings?.siteName}
      siteName={settings?.siteName}
      tagline={settings?.tagline}
    />
  )
}
