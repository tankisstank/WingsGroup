import type { SupportedLocaleCode } from './sitePaths'
import { getCopyLocale } from './locales'

export type WingsSideHiFiNavItem = {
  href: string
  label: string
}

/** Locked 8-page product nav from wingside-hifi-fix-8pages.html (no Search, no mega). */
const navByLocale: Partial<Record<SupportedLocaleCode, WingsSideHiFiNavItem[]>> = {
  en: [
    { href: '/', label: 'Home' },
    { href: '/destinations', label: 'Destinations' },
    { href: '/styles', label: 'Styles' },
    { href: '/journeys', label: 'Journeys' },
    { href: '/packages', label: 'Packages' },
    { href: '/travel-guide', label: 'Guide' },
    { href: '/about-us', label: 'About' },
    { href: '/contact-us', label: 'Contact' },
  ],
  vi: [
    { href: '/', label: 'Trang chủ' },
    { href: '/destinations', label: 'Điểm đến' },
    { href: '/styles', label: 'Phong cách' },
    { href: '/journeys', label: 'Hành trình' },
    { href: '/packages', label: 'Gói tour' },
    { href: '/travel-guide', label: 'Cẩm nang' },
    { href: '/about-us', label: 'Về chúng tôi' },
    { href: '/contact-us', label: 'Liên hệ' },
  ],
  it: [
    { href: '/', label: 'Home' },
    { href: '/destinations', label: 'Destinazioni' },
    { href: '/styles', label: 'Stili' },
    { href: '/journeys', label: 'Viaggi' },
    { href: '/packages', label: 'Pacchetti' },
    { href: '/travel-guide', label: 'Guida' },
    { href: '/about-us', label: 'Chi siamo' },
    { href: '/contact-us', label: 'Contatti' },
  ],
  es: [
    { href: '/', label: 'Inicio' },
    { href: '/destinations', label: 'Destinos' },
    { href: '/styles', label: 'Estilos' },
    { href: '/journeys', label: 'Viajes' },
    { href: '/packages', label: 'Paquetes' },
    { href: '/travel-guide', label: 'Guía' },
    { href: '/about-us', label: 'Nosotros' },
    { href: '/contact-us', label: 'Contacto' },
  ],
  pt: [
    { href: '/', label: 'Início' },
    { href: '/destinations', label: 'Destinos' },
    { href: '/styles', label: 'Estilos' },
    { href: '/journeys', label: 'Viagens' },
    { href: '/packages', label: 'Pacotes' },
    { href: '/travel-guide', label: 'Guia' },
    { href: '/about-us', label: 'Sobre' },
    { href: '/contact-us', label: 'Contacto' },
  ],
}

export const getWingsSideHiFiNavItems = (locale?: null | string): WingsSideHiFiNavItem[] => {
  if (locale && locale in navByLocale) {
    return navByLocale[locale as SupportedLocaleCode] || navByLocale.en!
  }
  return navByLocale[getCopyLocale(locale)] || navByLocale.en!
}

export const wingsSideHiFiCtaByLocale: Partial<
  Record<SupportedLocaleCode, { label: string; url: string }>
> = {
  en: { label: 'Plan trip', url: '/plan-your-trip' },
  vi: { label: 'Lên kế hoạch', url: '/plan-your-trip' },
  it: { label: 'Pianifica', url: '/plan-your-trip' },
  es: { label: 'Planifica', url: '/plan-your-trip' },
  pt: { label: 'Planear', url: '/plan-your-trip' },
}

export const getWingsSideHiFiCta = (locale?: null | string) => {
  if (locale && locale in wingsSideHiFiCtaByLocale) {
    return wingsSideHiFiCtaByLocale[locale as SupportedLocaleCode]!
  }
  return wingsSideHiFiCtaByLocale[getCopyLocale(locale)] || wingsSideHiFiCtaByLocale.en!
}
