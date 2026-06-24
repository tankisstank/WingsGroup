import { HeaderClient } from './Component.client'
import { getCurrentSiteSettings } from '@/utilities/getSiteSettings'
import { getCurrentLocale } from '@/utilities/siteContext'
import React from 'react'

export async function Header() {
  const settings = await getCurrentSiteSettings()
  const locale = await getCurrentLocale()
  const siteName = settings?.siteName || ''
  const logoText = settings?.branding?.logoText || settings?.siteName
  const themeKey = settings?.branding?.themeKey || 'wings-group'
  const primaryActions: Record<string, Record<'en' | 'vi', { label: string; url: string }>> = {
    'wings-care': {
      en: { label: 'Contact', url: '/contact' },
      vi: { label: 'Liên hệ', url: '/contact' },
    },
    'wings-go': {
      en: { label: 'Reserve', url: '/lien-he' },
      vi: { label: 'Giữ chỗ', url: '/lien-he' },
    },
    'wings-group': {
      en: { label: 'Contact', url: '/lien-he' },
      vi: { label: 'Liên hệ', url: '/lien-he' },
    },
    'wings-pass': {
      en: { label: 'Book service', url: '/contact' },
      vi: { label: 'Đặt dịch vụ', url: '/contact' },
    },
    'wings-plus': {
      en: { label: 'Request proposal', url: '/request-proposal' },
      vi: { label: 'Gửi yêu cầu', url: '/request-proposal' },
    },
    'wings-side': {
      en: { label: 'Plan your trip', url: '/plan-your-trip' },
      vi: { label: 'Lên kế hoạch', url: '/plan-your-trip' },
    },
  }
  const primaryAction = primaryActions[themeKey]?.[locale] || primaryActions['wings-group'][locale]

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
      resolvedLocale={locale}
      siteName={siteName}
      tagline={settings?.tagline}
    />
  )
}
