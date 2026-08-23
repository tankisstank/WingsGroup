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
import { Globe2Icon, MenuIcon, SearchIcon, XIcon } from 'lucide-react'
import { getWingsGroupSwitcherLocales } from '@/components/WingsGroupV3/model'

export const WINGSGROUP_HOME_NAV = [
  { href: '#home', label: 'Trang chủ' },
  { href: '#services', label: 'Dịch vụ' },
  { href: '#about', label: 'Hệ sinh thái' },
  { href: '#trust', label: 'Về WingsGroup' },
  { href: '#news', label: 'Cẩm nang' },
  { href: '#contact', label: 'Liên hệ' },
] as const

export const WINGSGROUP_V3_ROUTE_NAV = [
  { href: '/', label: 'Trang chủ' },
  { href: '/nang-luc-dich-vu', label: 'Dịch vụ' },
  { href: '/he-sinh-thai', label: 'Hệ sinh thái' },
  { href: '/ve-wingsgroup', label: 'Về WingsGroup' },
  { href: '/tin-tuc', label: 'Cẩm nang' },
] as const

const WINGSGROUP_HOME_NAV_EN = [
  { href: '#home', label: 'Home' },
  { href: '#services', label: 'Services' },
  { href: '#about', label: 'Our ecosystem' },
  { href: '#trust', label: 'About WingsGroup' },
  { href: '#news', label: 'Journal' },
  { href: '#contact', label: 'Contact' },
] as const

const WINGSGROUP_V3_ROUTE_NAV_EN = [
  { href: '/', label: 'Home' },
  { href: '/nang-luc-dich-vu', label: 'Services' },
  { href: '/he-sinh-thai', label: 'Our ecosystem' },
  { href: '/ve-wingsgroup', label: 'About WingsGroup' },
  { href: '/tin-tuc', label: 'Journal' },
] as const

export const getWingsGroupHomeNav = (locale: SupportedLocaleCode) =>
  locale === 'en' ? WINGSGROUP_HOME_NAV_EN : WINGSGROUP_HOME_NAV

export const getWingsGroupV3RouteNav = (locale: SupportedLocaleCode) =>
  locale === 'en' ? WINGSGROUP_V3_ROUTE_NAV_EN : WINGSGROUP_V3_ROUTE_NAV

export const HeaderNav: React.FC<{
  data: { navItems?: HeaderType['navItems'] }
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
  const isWingsGroupHome =
    wingsGroupV3Home ?? (siteCode === 'wings-group' && publicPathname === '/')
  const isWingsGroupV3Surface = wingsGroupV3Surface ?? isWingsGroupHome
  const wingsGroupHomeNav = getWingsGroupHomeNav(resolvedLocale)
  const wingsGroupRouteNav = getWingsGroupV3RouteNav(resolvedLocale)
  const wingsSideHiFiNav = isWingsSide ? getWingsSideHiFiNavItems(resolvedLocale) : null
  const wingsSideHiFiCta = isWingsSide ? getWingsSideHiFiCta(resolvedLocale) : null
  const resolvedPrimaryAction = wingsSideHiFiCta || primaryAction
  const shouldRenderPrimaryAction =
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
  const navigateAndCloseMobile: React.MouseEventHandler<HTMLAnchorElement> = (event) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      return

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
        const href = buildLocaleSwitchHref(
          `${localeSwitchPathname}${clientReady ? locationSuffix : ''}`,
          metadata.code,
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
            {metadata.label}
          </a>
        )
      })}
      {isWingsGroupV3Surface && englishPublicationState === 'hidden' ? (
        <span
          aria-disabled="true"
          className="site-language-switcher__link site-language-switcher__link--pending"
          title="English — Sắp có"
        >
          EN
        </span>
      ) : null}
    </nav>
  )

  return (
    <div
      className="site-header__nav"
      data-hifi-nav={isWingsSide ? 'true' : 'false'}
      ref={headerNavRef}
    >
      <nav aria-label="Primary navigation" className="hidden items-center gap-3 xl:flex">
        {isWingsGroupHome
          ? wingsGroupHomeNav.map((item) => (
              <SiteLink
                className="theme-nav-link site-header__primary-link"
                href={item.href}
                key={item.href}
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
                  href={item.href}
                  key={item.href}
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
        {!isWingsSide && showSearch ? (
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
        {!isWingsSide && showSearch ? (
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
          {isWingsGroupHome
            ? wingsGroupHomeNav.map((item) => (
                <SiteLink
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
          {languageSwitcher}
        </nav>
      ) : null}
    </div>
  )
}
