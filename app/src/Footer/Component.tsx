import { getCurrentSiteSettings } from '@/utilities/getSiteSettings'
import React from 'react'

import { ThemeSelector } from '@/providers/Theme/ThemeSelector'
import { CMSLink } from '@/components/Link'
import { Logo } from '@/components/Logo/Logo'
import { SiteLink } from '@/components/SiteLink'
import { MailIcon, PhoneIcon } from 'lucide-react'

export async function Footer() {
  const settings = await getCurrentSiteSettings()

  const navItems = settings?.footerNavItems || []

  return (
    <footer className="site-footer mt-auto border-t">
      <div className="container py-8 gap-8 flex flex-col md:flex-row md:justify-between">
        <div className="flex flex-col gap-2">
          <SiteLink className="flex items-center" href="/">
            <Logo
              accentColor={settings?.branding?.accentColor}
              brandColor={settings?.branding?.brandColor}
              logoText={settings?.branding?.logoText || settings?.siteName}
            />
          </SiteLink>
          {settings?.siteName ? <div className="text-sm font-semibold">{settings.siteName}</div> : null}
          {settings?.tagline ? <div className="text-sm text-muted-foreground">{settings.tagline}</div> : null}
          {settings?.footerNote ? <div className="text-xs text-muted-foreground max-w-md">{settings.footerNote}</div> : null}
          {settings?.supportEmail || settings?.supportPhone ? (
            <div className="site-footer__contacts">
              {settings.supportEmail ? (
                <span>
                  <MailIcon aria-hidden="true" className="h-4 w-4" />
                  {settings.supportEmail}
                </span>
              ) : null}
              {settings.supportPhone ? (
                <span>
                  <PhoneIcon aria-hidden="true" className="h-4 w-4" />
                  {settings.supportPhone}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col-reverse items-start gap-4 md:flex-row md:flex-wrap md:items-center md:justify-end">
          <ThemeSelector />
          <nav aria-label="Footer navigation" className="flex flex-col gap-4 md:flex-row md:flex-wrap md:justify-end">
            {navItems.map(({ link }, i) => {
              return <CMSLink className="theme-nav-link" key={i} {...link} />
            })}
          </nav>
        </div>
      </div>
    </footer>
  )
}
