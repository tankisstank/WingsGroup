import { getCurrentSiteSettings } from '@/utilities/getSiteSettings'
import { getCurrentLocale, getCurrentSite } from '@/utilities/siteContext'
import React from 'react'

import { ThemeSelector } from '@/providers/Theme/ThemeSelector'
import { CMSLink } from '@/components/Link'
import { Logo } from '@/components/Logo/Logo'
import { SiteLink } from '@/components/SiteLink'
import { getWingsSideHiFiCopy } from '@/components/WingsSideHiFi/copy'
import { getRuntimeLocaleCopy, publicChromeCopy } from '@/i18n/publicCopy'
import { MailIcon, PhoneIcon } from 'lucide-react'

const wingSideFooterLinks = [
  { href: '/destinations', key: 'destinations' as const },
  { href: '/packages', key: 'packages' as const },
  { href: '/plan-your-trip', key: 'plan' as const },
  { href: '/contact-us', key: 'contact' as const },
]

export async function Footer() {
  const settings = await getCurrentSiteSettings()
  const site = await getCurrentSite()
  const locale = await getCurrentLocale()
  const chromeCopy = getRuntimeLocaleCopy(publicChromeCopy, locale)
  const isWingSide = site.code === 'wings-side'
  const hiFiCopy = isWingSide ? getWingsSideHiFiCopy(locale) : null

  const navItems = settings?.footerNavItems || []
  const wingSideLabels = hiFiCopy
    ? {
        contact: hiFiCopy.home.closeCtaSecondary,
        destinations: hiFiCopy.home.destKicker,
        packages: hiFiCopy.home.journeysKicker,
        plan: hiFiCopy.home.closeCta,
      }
    : null

  return (
    <footer className="site-footer mt-auto border-t" data-site-code={site.code}>
      <div className="container py-8 gap-8 flex flex-col md:flex-row md:justify-between">
        <div className="flex flex-col gap-2">
          <SiteLink className="flex items-center" href="/">
            <Logo
              accentColor={settings?.branding?.accentColor}
              brandColor={settings?.branding?.brandColor}
              logoText={settings?.branding?.logoText || settings?.siteName}
              siteCode={site.code}
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
          {isWingSide && wingSideLabels ? (
            <nav
              aria-label="WingSide shortcuts"
              className="ws-hifi-footer-links"
              data-testid="wingsside-hifi-footer"
            >
              {wingSideFooterLinks.map((item) => (
                <SiteLink href={item.href} key={item.href}>
                  {wingSideLabels[item.key]}
                </SiteLink>
              ))}
            </nav>
          ) : null}
        </div>

        {isWingSide ? (
          <div className="flex flex-col items-start gap-3 md:items-end">
            {/* Single footer composition for WingSide hi-fi — no CMS nav double IA. */}
            <ThemeSelector copy={chromeCopy.themeSelector} />
          </div>
        ) : (
          <div className="flex flex-col-reverse items-start gap-4 md:flex-row md:flex-wrap md:items-center md:justify-end">
            <ThemeSelector copy={chromeCopy.themeSelector} />
            <nav
              aria-label={chromeCopy.footerNavigation}
              className="flex flex-col gap-4 md:flex-row md:flex-wrap md:justify-end"
            >
              {navItems.map(({ link }, i) => {
                return <CMSLink className="theme-nav-link" key={i} {...link} />
              })}
            </nav>
          </div>
        )}
      </div>
    </footer>
  )
}
