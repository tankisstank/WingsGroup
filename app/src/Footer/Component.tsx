import { getCurrentSiteSettings } from '@/utilities/getSiteSettings'
import { getCurrentLocale, getCurrentSite } from '@/utilities/siteContext'
import React from 'react'

import { ThemeSelector } from '@/providers/Theme/ThemeSelector'
import { CMSLink } from '@/components/Link'
import { Logo } from '@/components/Logo/Logo'
import { SiteLink } from '@/components/SiteLink'
import { getWingsSideHiFiCopy } from '@/components/WingsSideHiFi/copy'
import { getRuntimeLocaleCopy, publicChromeCopy } from '@/i18n/publicCopy'
import { getWingsSideHiFiNavItems } from '@/utilities/wingsSideHiFiNav'
import { MailIcon, PhoneIcon } from 'lucide-react'

export async function Footer() {
  const settings = await getCurrentSiteSettings()
  const site = await getCurrentSite()
  const locale = await getCurrentLocale()
  const chromeCopy = getRuntimeLocaleCopy(publicChromeCopy, locale)
  const isWingSide = site.code === 'wing-side'
  const hiFiCopy = isWingSide ? getWingsSideHiFiCopy(locale) : null
  const wingSideNav = isWingSide ? getWingsSideHiFiNavItems(locale) : null

  const navItems = settings?.footerNavItems || []

  return (
    <footer
      className={
        isWingSide
          ? 'site-footer site-footer--wingsside-hifi mt-auto border-t'
          : 'site-footer mt-auto border-t'
      }
      data-site-code={site.code}
      data-testid={isWingSide ? 'wingsside-hifi-footer' : undefined}
    >
      {isWingSide ? (
        <div className="container ws-hifi-footer">
          <div className="ws-hifi-footer__brand">
            <SiteLink className="flex items-center" href="/">
              <Logo
                accentColor={settings?.branding?.accentColor}
                brandColor={settings?.branding?.brandColor}
                logoText={settings?.branding?.logoText || settings?.siteName || 'Wingside'}
                siteCode={site.code}
              />
            </SiteLink>
            <p className="ws-hifi-footer__descriptor">
              {settings?.tagline ||
                hiFiCopy?.home.closeLede ||
                'Private Vietnam journeys planned with a local desk.'}
            </p>
            {settings?.supportEmail || settings?.supportPhone ? (
              <div className="site-footer__contacts ws-hifi-footer__contacts">
                {settings.supportEmail ? (
                  <a href={`mailto:${settings.supportEmail}`}>
                    <MailIcon aria-hidden="true" className="h-4 w-4" />
                    {settings.supportEmail}
                  </a>
                ) : null}
                {settings.supportPhone ? (
                  <a href={`tel:${settings.supportPhone.replace(/[^\d+]/g, '')}`}>
                    <PhoneIcon aria-hidden="true" className="h-4 w-4" />
                    {settings.supportPhone}
                  </a>
                ) : null}
              </div>
            ) : null}
          </div>
          <nav aria-label={chromeCopy.footerNavigation} className="ws-hifi-footer-links">
            {(wingSideNav || []).slice(1).map((item) => (
              <SiteLink href={item.href} key={item.href}>
                {item.label}
              </SiteLink>
            ))}
            <SiteLink className="ws-hifi-footer-links__cta" href="/plan-your-trip">
              {hiFiCopy?.home.planTripCta || 'Plan trip'}
            </SiteLink>
          </nav>
        </div>
      ) : (
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
            {settings?.siteName ? (
              <div className="text-sm font-semibold">{settings.siteName}</div>
            ) : null}
            {settings?.tagline ? (
              <div className="text-sm text-muted-foreground">{settings.tagline}</div>
            ) : null}
            {settings?.footerNote ? (
              <div className="text-xs text-muted-foreground max-w-md">{settings.footerNote}</div>
            ) : null}
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
        </div>
      )}
    </footer>
  )
}
