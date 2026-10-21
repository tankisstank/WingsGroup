import { getCurrentSiteSettings } from '@/utilities/getSiteSettings'
import { getCurrentLocale, getCurrentPublicPathname, getCurrentSite } from '@/utilities/siteContext'
import { getPublicRoutePathname } from '@/utilities/sitePaths'
import React from 'react'

import { ThemeSelector } from '@/providers/Theme/ThemeSelector'
import { CMSLink } from '@/components/Link'
import { Logo } from '@/components/Logo/Logo'
import { SiteLink } from '@/components/SiteLink'
import { getWingsSideHiFiCopy } from '@/components/WingsSideHiFi/copy'
import { getRuntimeLocaleCopy, publicChromeCopy } from '@/i18n/publicCopy'
import { getWingsSideHiFiNavItems } from '@/utilities/wingsSideHiFiNav'
import { getSharedZaloCTA } from '@/utilities/sharedConsultationChannels'
import { MapPinIcon, PhoneIcon } from 'lucide-react'
import { WINGSGROUP_LEGAL_IDENTITY, isWingsGroupV3SurfacePath } from '@/wingsgroup/corporateRoutes'
import { isWingsGroupBrandSite } from '@/wingsgroup/brand'
import { ProtectedEmailLink } from '@/components/ProtectedEmailLink'
import { formatHotlineDisplay, resolveSiteHotlines } from '@/utilities/siteHotlines'

export async function Footer() {
  const settings = await getCurrentSiteSettings()
  const site = await getCurrentSite()
  const locale = await getCurrentLocale()
  const publicPathname = await getCurrentPublicPathname()
  const publicRoute = getPublicRoutePathname(publicPathname)
  const hotlines = resolveSiteHotlines(settings, site.code)
  const chromeCopy = getRuntimeLocaleCopy(publicChromeCopy, locale)
  const isWingSide = site.code === 'wing-side'
  const isWingsGo = site.code === 'wings-go'
  const isWingsGroup = site.code === 'wings-group'
  const wingsGoRegisteredOffice =
    settings?.registeredOfficeAddress ||
    (isWingsGo ? WINGSGROUP_LEGAL_IDENTITY.registeredOffice : null)
  const wingsGoTravelOffice =
    settings?.travelOfficeAddress || (isWingsGo ? WINGSGROUP_LEGAL_IDENTITY.travelOffice : null)
  const isWingsGroupV3Surface =
    isWingsGroup &&
    settings?.wingsGroupV3?.enabled === true &&
    isWingsGroupV3SurfacePath(publicRoute)
  const wingsGroupIdentity = isWingsGroup
    ? {
        ...WINGSGROUP_LEGAL_IDENTITY,
        registeredOffice:
          settings?.wingsGroupV3?.legalIdentity?.registeredOffice ||
          WINGSGROUP_LEGAL_IDENTITY.registeredOffice,
        travelOffice:
          settings?.wingsGroupV3?.legalIdentity?.travelOffice ||
          WINGSGROUP_LEGAL_IDENTITY.travelOffice,
      }
    : null
  const sharedZaloCTA = getSharedZaloCTA(site.code, locale)
  const hiFiCopy = isWingSide ? getWingsSideHiFiCopy(locale) : null
  const wingSideNav = isWingSide ? getWingsSideHiFiNavItems(locale) : null
  const wingSideFooterCopy = isWingSide ? getWingSideFooterCopy(locale) : null

  const navItems = (settings?.footerNavItems || []).filter(({ link }) => {
    if (!isWingsGo) return true
    const label = String(link?.label || '').trim().toLowerCase()
    const url = String(link?.url || '').replace(/\/+$/, '') || '/'
    return label !== 'liên hệ' && label !== 'contact' && url !== '/lien-he'
  })
  const salesEmail =
    settings?.salesEmail && settings.salesEmail !== settings.supportEmail
      ? settings.salesEmail
      : null
  const hasConfiguredLogoImage = Boolean(
    settings?.branding?.logoImage &&
    typeof settings.branding.logoImage === 'object' &&
    'url' in settings.branding.logoImage &&
    settings.branding.logoImage.url,
  )
  const usesWingsGroupBrandFallback = isWingsGroupBrandSite(site.code) && !hasConfiguredLogoImage

  return (
    <footer
      className={
        isWingSide
          ? 'site-footer site-footer--wingsside-hifi mt-auto border-t'
          : `site-footer mt-auto border-t${isWingsGroupV3Surface ? ' site-footer--wingsgroup-v3' : ''}`
      }
      data-site-code={site.code}
      data-testid={isWingSide ? 'wingsside-hifi-footer' : undefined}
    >
      {isWingSide ? (
        <div className="container ws-hifi-footer" data-testid="wingside-footer-columns">
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
                {settings?.supportEmail ? (
                  <ProtectedEmailLink email={settings.supportEmail} />
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
          <nav aria-label={chromeCopy.footerNavigation} className="ws-hifi-footer-columns">
            <section>
              <h2>{wingSideFooterCopy!.explore}</h2>
              {(wingSideNav || []).slice(1, 4).map((item) => (
                <SiteLink href={item.href} key={item.href}>
                  {item.label}
                </SiteLink>
              ))}
            </section>
            <section>
              <h2>{wingSideFooterCopy!.travel}</h2>
              {navItems.map(({ link }, index) => (
                <CMSLink className="ws-hifi-footer-link" key={index} {...link} />
              ))}
              <SiteLink href="/plan-your-trip">
                {hiFiCopy?.home.planTripCta || wingSideFooterCopy!.plan}
              </SiteLink>
            </section>
            <section>
              <h2>{wingSideFooterCopy!.help}</h2>
              <SiteLink href="/contact-us">{wingSideFooterCopy!.contact}</SiteLink>
              {sharedZaloCTA ? (
                <a href={sharedZaloCTA.href} rel="noopener noreferrer" target="_blank">
                  {sharedZaloCTA.label}
                </a>
              ) : null}
              {settings?.supportEmail ? (
                <ProtectedEmailLink email={settings.supportEmail} />
              ) : null}
              {settings?.supportPhone ? (
                <a href={`tel:${settings.supportPhone.replace(/[^\d+]/g, '')}`}>
                  {settings.supportPhone}
                </a>
              ) : null}
            </section>
          </nav>
        </div>
      ) : (
        <div className="container py-8 gap-8 flex flex-col md:flex-row md:justify-between">
          <div className="flex flex-col gap-2">
            <SiteLink className="flex items-center" href="/">
              <Logo
                accentColor={settings?.branding?.accentColor}
                brandColor={settings?.branding?.brandColor}
                logoImage={
                  settings?.branding?.logoImage && typeof settings.branding.logoImage === 'object'
                    ? settings.branding.logoImage
                    : null
                }
                logoText={settings?.branding?.logoText || settings?.siteName}
                siteCode={site.code}
              />
            </SiteLink>
            {settings?.siteName ? (
              <div className="text-sm font-semibold">{settings.siteName}</div>
            ) : null}
            {settings?.tagline && !usesWingsGroupBrandFallback ? (
              <div className="text-sm text-muted-foreground">{settings.tagline}</div>
            ) : null}
            {settings?.footerNote ? (
              <div className="max-w-md text-sm text-muted-foreground">{settings.footerNote}</div>
            ) : null}
            {isWingsGo &&
            (wingsGoRegisteredOffice || wingsGoTravelOffice) ? (
              <address className="flex max-w-md flex-col gap-2 text-sm text-muted-foreground not-italic">
                {wingsGoRegisteredOffice ? (
                  <div className="flex items-start gap-2">
                    <MapPinIcon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      {locale === 'en' ? 'Head office: ' : 'Trụ sở chính: '}
                      {wingsGoRegisteredOffice}
                    </span>
                  </div>
                ) : null}
                {wingsGoTravelOffice ? (
                  <div className="flex items-start gap-2">
                    <MapPinIcon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      {locale === 'en' ? 'Travel office: ' : 'Văn phòng du lịch: '}
                      {wingsGoTravelOffice}
                    </span>
                  </div>
                ) : null}
              </address>
            ) : null}
            {isWingsGo ? (
              <p className="max-w-md text-sm leading-6 text-muted-foreground">
                {locale === 'en'
                  ? 'Where will your next trip take you? Tell WingsGo where, when, and your budget—we will find a suitable itinerary.'
                  : 'Chuyến đi tiếp theo của bạn sẽ ở đâu? Bạn chỉ cần cho WingsGo biết: Muốn đi đâu; Muốn đi khi nào; Ngân sách bao nhiêu - WingsGo tìm hành trình phù hợp cho bạn!'}
              </p>
            ) : null}
            {wingsGroupIdentity ? (
              <address className="flex flex-col gap-2 text-sm text-muted-foreground not-italic">
                <div className="flex items-start gap-2">
                  <MapPinIcon aria-hidden="true" className="h-4 w-4 shrink-0" />
                  <span>
                    {locale === 'en'
                      ? 'Head Office: 2nd Floor, 28B Alley 44 Hao Nam, O Cho Dua, Dong Da, Hanoi, Vietnam'
                      : `Trụ sở chính: ${wingsGroupIdentity.registeredOffice}`}
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPinIcon aria-hidden="true" className="h-4 w-4 shrink-0" />
                  <span>
                    {locale === 'en'
                      ? 'Travel Office: 12th Floor, Ngoc Khanh Plaza, 1 Pham Huy Thong, Giang Vo, Hanoi, Vietnam'
                      : `Văn phòng du lịch: ${wingsGroupIdentity.travelOffice}`}
                  </span>
                </div>
              </address>
            ) : null}
            {settings?.supportEmail || salesEmail || (isWingsGo || isWingsGroup ? hotlines.length > 0 : Boolean(settings?.supportPhone)) ? (
              <div className="site-footer__contacts">
                {settings?.supportEmail ? (
                  <ProtectedEmailLink email={settings.supportEmail} />
                ) : null}
                {salesEmail ? (
                  <ProtectedEmailLink email={salesEmail} />
                ) : null}
                {isWingsGroup && hotlines.length > 0 ? (
                  hotlines.map((item) => (
                    <a className="wingsgroup-footer__phone" href={item.href} key={item.normalized}>
                      <PhoneIcon aria-hidden="true" className="h-4 w-4" />
                      <span>
                        {item.label
                          ? `${item.label}: ${formatHotlineDisplay(item.normalized)}`
                          : formatHotlineDisplay(item.normalized)}
                      </span>
                    </a>
                  ))
                ) : isWingsGo && hotlines[0] ? (
                  <a className="wingsgo-footer__phone" href={hotlines[0].href}>
                    <PhoneIcon aria-hidden="true" className="h-4 w-4" />
                    {formatHotlineDisplay(hotlines[0].normalized)}
                  </a>
                ) : settings?.supportPhone ? (
                  <a href={`tel:${settings.supportPhone.replace(/[^\d+]/g, '')}`}>
                    <PhoneIcon aria-hidden="true" className="h-4 w-4" />
                    {settings.supportPhone}
                  </a>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="flex flex-col-reverse items-start gap-4 md:flex-row md:flex-wrap md:items-center md:justify-end">
            {!isWingsGroup ? <ThemeSelector copy={chromeCopy.themeSelector} /> : null}
            <nav
              aria-label={chromeCopy.footerNavigation}
              className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-center md:justify-end"
            >
              {navItems.map(({ link }, i) => {
                return <CMSLink className="theme-nav-link" key={i} {...link} />
              })}
              {isWingsGroupV3Surface ? (
                <SiteLink className="theme-nav-link" href="/chinh-sach-bao-mat">
                  {locale === 'en' ? 'Customer Privacy Policy' : 'Chính sách bảo mật khách hàng'}
                </SiteLink>
              ) : null}
              {sharedZaloCTA ? (
                <a
                  className="theme-nav-link"
                  href={sharedZaloCTA.href}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {sharedZaloCTA.label}
                </a>
              ) : null}
              {isWingsGroupV3Surface ? (
                <SiteLink
                  className="site-header-cta site-footer-cta font-bold text-sm px-4 py-2 rounded shadow-sm inline-flex items-center gap-1.5"
                  data-wingsgroup-consultation-trigger="true"
                  href="/lien-he#contact-form"
                >
                  <PhoneIcon aria-hidden="true" className="h-4 w-4" />
                  {locale === 'en' ? '24/7 CONSULTATION' : 'LIÊN HỆ TƯ VẤN 24/7'}
                </SiteLink>
              ) : null}
            </nav>
            {isWingsGo ? (
              <div className="flex flex-col items-start gap-2">
                {sharedZaloCTA ? (
                  <a
                    className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--site-brand)] px-5 text-sm font-semibold text-white no-underline"
                    href={sharedZaloCTA.href}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {locale === 'en' ? 'Get Tour Advice' : 'Nhận tư vấn Tour'}
                  </a>
                ) : null}
                {hotlines.map((item, idx) => (
                  <a
                    key={item.normalized}
                    className="text-sm font-semibold text-[var(--site-brand)]"
                    href={item.href}
                  >
                    {item.label
                      ? `${item.label}: ${formatHotlineDisplay(item.normalized)}`
                      : idx === 0
                        ? locale === 'en'
                          ? `Call now: ${formatHotlineDisplay(item.normalized)}`
                          : `Hotline: ${formatHotlineDisplay(item.normalized)}`
                        : formatHotlineDisplay(item.normalized)}
                  </a>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </footer>
  )
}

const getWingSideFooterCopy = (locale: string) =>
  ({
    en: {
      contact: 'Contact us',
      explore: 'Explore',
      help: 'Need a hand?',
      plan: 'Plan trip',
      travel: 'Travel with us',
    },
    vi: {
      contact: 'Liên hệ',
      explore: 'Khám phá',
      help: 'Cần hỗ trợ?',
      plan: 'Lên kế hoạch',
      travel: 'Đi cùng chúng tôi',
    },
    it: {
      contact: 'Contattaci',
      explore: 'Esplora',
      help: 'Serve aiuto?',
      plan: 'Pianifica',
      travel: 'Viaggia con noi',
    },
    es: {
      contact: 'Contáctanos',
      explore: 'Explora',
      help: '¿Necesitas ayuda?',
      plan: 'Planifica',
      travel: 'Viaja con nosotros',
    },
    pt: {
      contact: 'Contacte-nos',
      explore: 'Explorar',
      help: 'Precisa de ajuda?',
      plan: 'Planear',
      travel: 'Viaje connosco',
    },
  })[locale] || {
    contact: 'Contact us',
    explore: 'Explore',
    help: 'Need a hand?',
    plan: 'Plan trip',
    travel: 'Travel with us',
  }
