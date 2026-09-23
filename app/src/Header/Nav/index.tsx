'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'

import type { Header as HeaderType } from '@/payload-types'

import { CMSLink } from '@/components/Link'
import { SiteLink } from '@/components/SiteLink'
import { useSitePublicPathname } from '@/providers/SitePath'
import { getCopyLocale, getPublicLocaleMetadataForSite } from '@/utilities/locales'
import {
  buildLocaleSwitchHref,
  getPublicRoutePathname,
  type SupportedLocaleCode,
} from '@/utilities/sitePaths'
import { getWingsSideHiFiCta, getWingsSideHiFiNavItems } from '@/utilities/wingsSideHiFiNav'
import { getSharedZaloCTA } from '@/utilities/sharedConsultationChannels'
import { Globe2Icon, MenuIcon, SearchIcon, XIcon } from 'lucide-react'
import { getWingsGroupSwitcherLocales } from '@/components/WingsGroupV3/model'

const WINGSGO_NAV = [
  { href: '/', label: 'Trang chủ' },
  { href: '/thi-truong', label: 'Thị trường' },
  { href: '/lich-khoi-hanh', label: 'Lịch khởi hành' },
  { href: '/campaign', label: 'Tour theo mùa' },
  { href: '/tour', label: 'Tour' },
] as const

const WINGSGO_NAV_EN = [
  { href: '/', label: 'Home' },
  { href: '/thi-truong', label: 'Destinations' },
  { href: '/lich-khoi-hanh', label: 'Departure schedule' },
  { href: '/campaign', label: 'Seasonal tours' },
  { href: '/tour', label: 'Tours' },
] as const

export const WINGSGROUP_HOME_NAV = [
  { href: '/#home', label: 'Trang chủ' },
  { href: '/nang-luc-dich-vu', label: 'Dịch vụ' },
  { href: '/he-sinh-thai', label: 'Hệ sinh thái' },
  { href: '/ve-wingsgroup', label: 'Về WingsGroup' },
  { href: '/tin-tuc', label: 'Cẩm nang' },
  { href: '/#contact', label: 'Liên hệ' },
] as const

export const WINGSGROUP_V3_ROUTE_NAV = [
  // Keep the same information architecture away from the home surface while
  // using the governed corporate routes.
  { href: '/#home', label: 'Trang chủ' },
  { href: '/nang-luc-dich-vu', label: 'Dịch vụ' },
  { href: '/he-sinh-thai', label: 'Hệ sinh thái' },
  { href: '/ve-wingsgroup', label: 'Về WingsGroup' },
  { href: '/tin-tuc', label: 'Cẩm nang' },
  { href: '/#contact', label: 'Liên hệ' },
] as const

const WINGSGROUP_HOME_NAV_EN = [
  { href: '/#home', label: 'Home' },
  { href: '/nang-luc-dich-vu', label: 'Services' },
  { href: '/he-sinh-thai', label: 'Our ecosystem' },
  { href: '/ve-wingsgroup', label: 'About WingsGroup' },
  { href: '/tin-tuc', label: 'Journal' },
  { href: '/#contact', label: 'Contact' },
] as const

const WINGSGROUP_V3_ROUTE_NAV_EN = [
  { href: '/#home', label: 'Home' },
  { href: '/nang-luc-dich-vu', label: 'Services' },
  { href: '/he-sinh-thai', label: 'Our ecosystem' },
  { href: '/ve-wingsgroup', label: 'About WingsGroup' },
  { href: '/tin-tuc', label: 'Journal' },
  { href: '/#contact', label: 'Contact' },
] as const

export const getWingsGroupHomeNav = (locale: SupportedLocaleCode) =>
  locale === 'en' ? WINGSGROUP_HOME_NAV_EN : WINGSGROUP_HOME_NAV

export const getWingsGroupV3RouteNav = (locale: SupportedLocaleCode) =>
  locale === 'en' ? WINGSGROUP_V3_ROUTE_NAV_EN : WINGSGROUP_V3_ROUTE_NAV

const getNativeLocaleLabel = (code: SupportedLocaleCode, fallback: string): string => {
  if (code === 'en') return 'ENGLISH (en)'
  if (code === 'vi') return 'Tiếng Việt (vi)'

  try {
    const label = new Intl.DisplayNames([code], { type: 'language' }).of(code)
    return label ? `${label[0]!.toLocaleUpperCase(code)}${label.slice(1)}` : fallback
  } catch {
    return fallback
  }
}

export const HeaderNav: React.FC<{
  data: { navItems?: HeaderType['navItems'] }
  defaultLocale?: SupportedLocaleCode
  englishPublicationState?: 'approved' | 'hidden' | 'route-ready' | null
  primaryAction?: {
    label: string
    url: string
  }
  publicPathname?: string
  resolvedLocale?: SupportedLocaleCode
  showSearch?: boolean
  siteCode?: string
  supportedLocales?: SupportedLocaleCode[]
  themeKey?: string
  wingsGroupV3Home?: boolean
  wingsGroupV3Surface?: boolean
}> = ({
  data,
  defaultLocale,
  englishPublicationState,
  primaryAction,
  publicPathname,
  resolvedLocale = 'vi',
  showSearch = true,
  siteCode,
  supportedLocales,
  themeKey,
  wingsGroupV3Home,
  wingsGroupV3Surface,
}) => {
  const navItems = data?.navItems || []
  const isWingsGo = siteCode === 'wings-go'
  const wingsGoNav = resolvedLocale === 'en' ? WINGSGO_NAV_EN : WINGSGO_NAV
  const [isOpen, setIsOpen] = useState(false)
  const [clientReady, setClientReady] = useState(false)
  const [locationSuffix, setLocationSuffix] = useState('')
  const headerNavRef = useRef<HTMLDivElement>(null)
  const pathname = useSitePublicPathname()
  const searchParams = useSearchParams()
  const localeSwitchPathname = pathname || publicPathname || '/'
  const availableLocales = getPublicLocaleMetadataForSite(supportedLocales)
  const switcherLocales =
    siteCode === 'wings-group'
      ? getWingsGroupSwitcherLocales(availableLocales, englishPublicationState)
      : availableLocales
  const isWingsSide = siteCode ? siteCode === 'wing-side' : themeKey === 'wings-side'
  const normalizedPublicPathname = getPublicRoutePathname(pathname || publicPathname || '/')
  const isWingsGroupHome =
    wingsGroupV3Home ?? (siteCode === 'wings-group' && normalizedPublicPathname === '/')
  const isWingsGroupV3Surface = wingsGroupV3Surface ?? isWingsGroupHome
  const wingsGroupHomeNav = getWingsGroupHomeNav(resolvedLocale)
  const wingsGroupRouteNav = getWingsGroupV3RouteNav(resolvedLocale)
  const wingsSideHiFiNav = isWingsSide ? getWingsSideHiFiNavItems(resolvedLocale) : null
  const wingsSideHiFiCta = isWingsSide ? getWingsSideHiFiCta(resolvedLocale) : null
  const resolvedPrimaryAction = wingsSideHiFiCta || primaryAction
  const sharedZaloCTA = getSharedZaloCTA(siteCode, resolvedLocale)
  const shouldRenderPrimaryAction =
    !isWingsGo &&
    resolvedPrimaryAction &&
    !(wingsSideHiFiNav
      ? wingsSideHiFiNav.some(
          (item) =>
            item.label.trim().toLowerCase() === resolvedPrimaryAction.label.trim().toLowerCase() ||
            (item.href.replace(/\/+$/, '') || '/') ===
              (resolvedPrimaryAction.url.replace(/\/+$/, '') || '/'),
        )
      : navItems.some(({ link }) => {
          const label = link?.label?.trim().toLowerCase()
          const url = link?.url?.replace(/\/+$/, '') || '/'
          const primaryLabel = resolvedPrimaryAction.label.trim().toLowerCase()
          const primaryURL = resolvedPrimaryAction.url.replace(/\/+$/, '') || '/'

          return label === primaryLabel || url === primaryURL
        }))
  const copyByLocale: Partial<
    Record<
      SupportedLocaleCode,
      {
        closeNavigation: string
        languageSwitcher: string
        openNavigation: string
        search: string
      }
    >
  > = {
    en: {
      closeNavigation: 'Close navigation',
      languageSwitcher: 'Language switcher',
      openNavigation: 'Open navigation',
      search: 'Search',
    },
    vi: {
      closeNavigation: 'Đóng điều hướng',
      languageSwitcher: 'Chọn ngôn ngữ',
      openNavigation: 'Mở điều hướng',
      search: 'Tìm kiếm',
    },
    it: {
      closeNavigation: 'Chiudi navigazione',
      languageSwitcher: 'Selettore lingua',
      openNavigation: 'Apri navigazione',
      search: 'Cerca',
    },
    es: {
      closeNavigation: 'Cerrar navegación',
      languageSwitcher: 'Selector de idioma',
      openNavigation: 'Abrir navegación',
      search: 'Buscar',
    },
    pt: {
      closeNavigation: 'Fechar navegação',
      languageSwitcher: 'Seletor de idioma',
      openNavigation: 'Abrir navegação',
      search: 'Pesquisar',
    },
  }
  const copy =
    copyByLocale[resolvedLocale] || copyByLocale[getCopyLocale(resolvedLocale)] || copyByLocale.en!
  const maybeSmoothScrollToContact = (event: React.MouseEvent<HTMLAnchorElement>): boolean => {
    if (
      !isWingsGroupHome ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return false
    }

    const targetURL = new URL(event.currentTarget.href, window.location.href)
    const currentURL = new URL(window.location.href)
    if (
      targetURL.origin !== currentURL.origin ||
      targetURL.pathname !== currentURL.pathname ||
      targetURL.hash !== '#contact'
    ) {
      return false
    }

    const contact = document.getElementById('contact')
    if (!contact) return false

    event.preventDefault()
    setIsOpen(false)
    contact.scrollIntoView({ behavior: 'smooth' })

    const suffix = `${currentURL.search}#contact`
    window.history.pushState(window.history.state, '', `${currentURL.pathname}${suffix}`)
    setLocationSuffix(suffix)
    return true
  }

  const navigateAndCloseMobile: React.MouseEventHandler<HTMLAnchorElement> = (event) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      return

    if (maybeSmoothScrollToContact(event)) return

    event.preventDefault()
    setIsOpen(false)
    window.location.assign(event.currentTarget.href)
  }

  useEffect(() => {
    const syncSuffix = () => {
      setLocationSuffix(`${window.location.search}${window.location.hash}`)
    }

    setClientReady(true)
    syncSuffix()
    window.addEventListener('hashchange', syncSuffix)
    window.addEventListener('popstate', syncSuffix)

    return () => {
      window.removeEventListener('hashchange', syncSuffix)
      window.removeEventListener('popstate', syncSuffix)
    }
  }, [])

  useEffect(() => {
    if (!clientReady) {
      return
    }

    setLocationSuffix(`${window.location.search}${window.location.hash}`)
  }, [clientReady, searchParams])

  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!isOpen) return

    const closeMobileNavigation = (event: PointerEvent | FocusEvent) => {
      const target = event.target

      if (!(target instanceof Node) || headerNavRef.current?.contains(target)) return

      setIsOpen(false)
    }
    const closeMobileNavigationOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }

    document.addEventListener('pointerdown', closeMobileNavigation)
    document.addEventListener('focusin', closeMobileNavigation)
    document.addEventListener('keydown', closeMobileNavigationOnEscape)

    return () => {
      document.removeEventListener('pointerdown', closeMobileNavigation)
      document.removeEventListener('focusin', closeMobileNavigation)
      document.removeEventListener('keydown', closeMobileNavigationOnEscape)
    }
  }, [isOpen])

  const languageSwitcher = (
    <nav
      aria-label={copy.languageSwitcher}
      className="site-language-switcher"
      data-client-ready={clientReady ? 'true' : 'false'}
    >
      <Globe2Icon aria-hidden="true" className="h-4 w-4" />
      {switcherLocales.map((metadata) => {
        const label =
          siteCode === 'wings-go'
            ? metadata.code.toUpperCase()
            : siteCode === 'wings-group'
            ? getNativeLocaleLabel(metadata.code, metadata.label)
            : metadata.label
        const href = buildLocaleSwitchHref(
          `${localeSwitchPathname}${clientReady ? locationSuffix : ''}`,
          metadata.code,
          defaultLocale,
        )

        return (
          <a
            aria-current={metadata.code === resolvedLocale ? 'page' : undefined}
            className="site-language-switcher__link"
            data-locale-code={metadata.code}
            href={href}
            key={metadata.code}
            onClick={navigateAndCloseMobile}
            title={metadata.label}
          >
            {label}
          </a>
        )
      })}
      {isWingsGroupV3Surface && englishPublicationState === 'hidden' ? (
        <span
          aria-disabled="true"
          className="site-language-switcher__link site-language-switcher__link--pending"
          title="English — Sắp có"
        >
          ENGLISH (en)
        </span>
      ) : null}
    </nav>
  )

  return (
    <div
      className={isWingsGo ? 'site-header__nav site-header__nav--wingsgo' : 'site-header__nav'}
      data-hifi-nav={isWingsSide ? 'true' : 'false'}
      ref={headerNavRef}
    >
      <nav
        aria-label="Primary navigation"
        className={`hidden items-center ${isWingsGo ? 'gap-2' : 'gap-3'} xl:flex`}
      >
        {isWingsGo
          ? wingsGoNav.map((item) => {
              const currentPath = getPublicRoutePathname(pathname || publicPathname || '/')
              const isActive =
                item.href === '/'
                  ? currentPath === '/'
                  : currentPath === item.href || currentPath.startsWith(`${item.href}/`)
              return (
                <SiteLink
                  aria-current={isActive ? 'page' : undefined}
                  className="theme-nav-link site-header__primary-link"
                  data-active={isActive ? 'true' : 'false'}
                  href={item.href}
                  key={item.href}
                >
                  {item.label}
                </SiteLink>
              )
            })
          : isWingsGroupHome
          ? wingsGroupHomeNav.map((item) => (
              <SiteLink
                aria-current={
                  item.href === getPublicRoutePathname(pathname || publicPathname || '/')
                    ? 'page'
                    : undefined
                }
                className="theme-nav-link site-header__primary-link"
                data-active={
                  item.href === getPublicRoutePathname(pathname || publicPathname || '/')
                    ? 'true'
                    : 'false'
                }
                href={item.href}
                key={item.href}
                onClick={maybeSmoothScrollToContact}
              >
                {item.label}
              </SiteLink>
            ))
          : isWingsGroupV3Surface
            ? wingsGroupRouteNav.map((item) => (
                <SiteLink
                  aria-current={
                    item.href === getPublicRoutePathname(pathname || publicPathname || '/')
                      ? 'page'
                      : undefined
                  }
                  className="theme-nav-link site-header__primary-link"
                  data-active={
                    item.href === getPublicRoutePathname(pathname || publicPathname || '/')
                      ? 'true'
                      : 'false'
                  }
                  href={item.href}
                  key={item.href}
                  onClick={maybeSmoothScrollToContact}
                >
                  {item.label}
                </SiteLink>
              ))
            : wingsSideHiFiNav
              ? wingsSideHiFiNav.map((item) => {
                  const itemPath = item.href.replace(/\/+$/, '') || '/'
                  const currentPath = getPublicRoutePathname(pathname || publicPathname || '/')
                  const isActive = itemPath === currentPath
                  return (
                    <SiteLink
                      aria-current={isActive ? 'page' : undefined}
                      className="theme-nav-link site-header__primary-link"
                      data-active={isActive ? 'true' : 'false'}
                      href={item.href}
                      key={item.href}
                    >
                      {item.label}
                    </SiteLink>
                  )
                })
              : navItems.map(({ link }, i) => {
                  return (
                    <CMSLink
                      className="theme-nav-link site-header__primary-link"
                      key={i}
                      {...link}
                      appearance="link"
                    />
                  )
                })}
        {shouldRenderPrimaryAction && resolvedPrimaryAction ? (
          <SiteLink
            className="site-header-cta"
            data-wingsgroup-consultation-trigger={isWingsGroupV3Surface ? 'true' : undefined}
            href={resolvedPrimaryAction.url}
          >
            {resolvedPrimaryAction.label}
          </SiteLink>
        ) : null}
        {isWingsGo ? (
          <a
            aria-label={resolvedLocale === 'en' ? 'Call WingsGo 0912 910 101' : 'Gọi hotline WingsGo 0912 910 101'}
            className="inline-flex min-h-10 shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-[var(--site-border)] px-3 text-sm font-semibold text-[var(--site-brand)] no-underline"
            href="tel:0912910101"
          >
            <span aria-hidden="true">☎</span>
            <span>0912 910 101</span>
          </a>
        ) : null}
        {sharedZaloCTA ? (
          <a
            aria-label={sharedZaloCTA.ariaLabel}
            className="site-header-zalo-link"
            href={sharedZaloCTA.href}
            rel="noopener noreferrer"
            target="_blank"
          >
            {sharedZaloCTA.label}
          </a>
        ) : null}
        {!isWingsSide && !isWingsGo && showSearch ? (
          <SiteLink className="site-icon-button" href="/search">
            <span className="sr-only">{copy.search}</span>
            <SearchIcon aria-hidden="true" className="h-5 w-5" />
          </SiteLink>
        ) : null}
        {languageSwitcher}
      </nav>

      <div className="flex items-center gap-2 xl:hidden">
        {shouldRenderPrimaryAction && resolvedPrimaryAction ? (
          <SiteLink
            className="site-header-cta site-header-cta--mobile"
            data-wingsgroup-consultation-trigger={isWingsGroupV3Surface ? 'true' : undefined}
            href={resolvedPrimaryAction.url}
          >
            {resolvedPrimaryAction.label}
          </SiteLink>
        ) : null}
        {isWingsGo ? (
          <a
            aria-label={resolvedLocale === 'en' ? 'Call WingsGo 0912 910 101' : 'Gọi hotline WingsGo 0912 910 101'}
            className="site-icon-button"
            href="tel:0912910101"
            title="0912 910 101"
          >
            <span aria-hidden="true">☎</span>
          </a>
        ) : null}
        {sharedZaloCTA ? (
          <a
            aria-label={sharedZaloCTA.ariaLabel}
            className="site-header-zalo-link site-header-zalo-link--mobile"
            href={sharedZaloCTA.href}
            rel="noopener noreferrer"
            target="_blank"
          >
            {sharedZaloCTA.label}
          </a>
        ) : null}
        {!isWingsSide && !isWingsGo && showSearch ? (
          <SiteLink className="site-icon-button" href="/search">
            <span className="sr-only">{copy.search}</span>
            <SearchIcon aria-hidden="true" className="h-5 w-5" />
          </SiteLink>
        ) : null}
        <button
          aria-controls="mobile-primary-navigation"
          aria-expanded={isOpen}
          aria-label={isOpen ? copy.closeNavigation : copy.openNavigation}
          className="site-icon-button"
          onClick={() => setIsOpen((value) => !value)}
          type="button"
        >
          {isOpen ? (
            <XIcon aria-hidden="true" className="h-5 w-5" />
          ) : (
            <MenuIcon aria-hidden="true" className="h-5 w-5" />
          )}
        </button>
      </div>

      {isOpen ? (
        <nav
          aria-label="Mobile primary navigation"
          className="site-mobile-nav"
          id="mobile-primary-navigation"
        >
          {isWingsGo
            ? wingsGoNav.map((item) => {
                const currentPath = getPublicRoutePathname(pathname || publicPathname || '/')
                const isActive =
                  item.href === '/'
                    ? currentPath === '/'
                    : currentPath === item.href || currentPath.startsWith(`${item.href}/`)
                return (
                  <SiteLink
                    aria-current={isActive ? 'page' : undefined}
                    className="site-mobile-nav__link"
                    data-active={isActive ? 'true' : 'false'}
                    href={item.href}
                    key={item.href}
                    onClick={navigateAndCloseMobile}
                  >
                    {item.label}
                  </SiteLink>
                )
              })
            : isWingsGroupHome
            ? wingsGroupHomeNav.map((item) => (
                <SiteLink
                  data-active={
                    item.href === getPublicRoutePathname(pathname || publicPathname || '/')
                      ? 'true'
                      : 'false'
                  }
                  className="site-mobile-nav__link"
                  href={item.href}
                  key={item.href}
                  onClick={navigateAndCloseMobile}
                >
                  {item.label}
                </SiteLink>
              ))
            : isWingsGroupV3Surface
              ? wingsGroupRouteNav.map((item) => (
                  <SiteLink
                    aria-current={
                      item.href === getPublicRoutePathname(pathname || publicPathname || '/')
                        ? 'page'
                        : undefined
                    }
                    className="site-mobile-nav__link"
                    data-active={
                      item.href === getPublicRoutePathname(pathname || publicPathname || '/')
                        ? 'true'
                        : 'false'
                    }
                    href={item.href}
                    key={item.href}
                    onClick={navigateAndCloseMobile}
                  >
                    {item.label}
                  </SiteLink>
                ))
              : wingsSideHiFiNav
                ? wingsSideHiFiNav.map((item) => {
                    const itemPath = item.href.replace(/\/+$/, '') || '/'
                    const currentPath = getPublicRoutePathname(pathname || publicPathname || '/')
                    const isActive = itemPath === currentPath
                    return (
                      <SiteLink
                        aria-current={isActive ? 'page' : undefined}
                        className="site-mobile-nav__link"
                        data-active={isActive ? 'true' : 'false'}
                        href={item.href}
                        key={item.href}
                        onClick={navigateAndCloseMobile}
                      >
                        {item.label}
                      </SiteLink>
                    )
                  })
                : navItems.map(({ link }, i) => {
                    return (
                      <CMSLink
                        appearance="inline"
                        className="site-mobile-nav__link"
                        key={i}
                        onClick={navigateAndCloseMobile}
                        {...link}
                      />
                    )
                  })}
          {isWingsGo ? (
            <a
              className="site-mobile-nav__link"
              href="tel:0912910101"
              onClick={() => setIsOpen(false)}
            >
              ☎ {resolvedLocale === 'en' ? 'Call 0912 910 101' : 'Gọi 0912 910 101'}
            </a>
          ) : null}
          {shouldRenderPrimaryAction && resolvedPrimaryAction ? (
            <SiteLink
              className="site-mobile-nav__link site-mobile-nav__link--primary"
              data-wingsgroup-consultation-trigger={isWingsGroupV3Surface ? 'true' : undefined}
              href={resolvedPrimaryAction.url}
              onClick={navigateAndCloseMobile}
            >
              {resolvedPrimaryAction.label}
            </SiteLink>
          ) : null}
          {sharedZaloCTA ? (
            <a
              aria-label={sharedZaloCTA.ariaLabel}
              className="site-mobile-nav__link site-mobile-nav__link--external"
              href={sharedZaloCTA.href}
              rel="noopener noreferrer"
              target="_blank"
              onClick={() => setIsOpen(false)}
            >
              {sharedZaloCTA.label}
            </a>
          ) : null}
          {languageSwitcher}
        </nav>
      ) : null}
    </div>
  )
}
