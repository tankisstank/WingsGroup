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
import type { HotlineItem } from '@/utilities/siteHotlines'
import { formatHotlineDisplay, resolveSiteHotlines } from '@/utilities/siteHotlines'
import { ChevronDownIcon, FileTextIcon, Globe2Icon, MenuIcon, PhoneIcon, SearchIcon, XIcon } from 'lucide-react'
import { useSitePath } from '@/utilities/useSitePath'
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

const resolveHotlineItemLabel = (
  label: string | undefined,
  index: number,
  locale: SupportedLocaleCode,
): string => {
  if (locale === 'en') {
    if (!label || label === 'Tư vấn tour') return 'Tour consultation'
    if (label === 'Hỗ trợ dịch vụ') return 'Travel support'
    return label
  }
  return label || (index === 0 ? 'Tư vấn tour' : 'Hỗ trợ dịch vụ')
}

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
  hotlines?: HotlineItem[]
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
  hotlines,
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
  const [isHotlinesOpen, setIsHotlinesOpen] = useState(false)
  const [isMobileHotlinesOpen, setIsMobileHotlinesOpen] = useState(false)
  const [clientReady, setClientReady] = useState(false)
  const [locationSuffix, setLocationSuffix] = useState('')
  const headerNavRef = useRef<HTMLDivElement>(null)
  const hotlineToggleRef = useRef<HTMLButtonElement>(null)
  const hotlineDropdownRef = useRef<HTMLDivElement>(null)
  const mobileHotlineToggleRef = useRef<HTMLButtonElement>(null)
  const mobileHotlineDropdownRef = useRef<HTMLDivElement>(null)
  const mobileNavToggleRef = useRef<HTMLButtonElement>(null)
  const toSitePath = useSitePath()

  const resolvedHotlines =
    hotlines !== undefined ? hotlines : resolveSiteHotlines(undefined, siteCode)
  const mainHotline = resolvedHotlines[0]
  const secondaryHotlines = resolvedHotlines.slice(1)

  useEffect(() => {
    if (!isHotlinesOpen && !isMobileHotlinesOpen) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        if (isHotlinesOpen) {
          setIsHotlinesOpen(false)
          hotlineToggleRef.current?.focus()
        }
        if (isMobileHotlinesOpen) {
          setIsMobileHotlinesOpen(false)
          mobileHotlineToggleRef.current?.focus()
        }
      }
    }
    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (
        hotlineDropdownRef.current &&
        !hotlineDropdownRef.current.contains(target) &&
        hotlineToggleRef.current &&
        !hotlineToggleRef.current.contains(target)
      ) {
        setIsHotlinesOpen(false)
      }
      if (
        mobileHotlineDropdownRef.current &&
        !mobileHotlineDropdownRef.current.contains(target) &&
        mobileHotlineToggleRef.current &&
        !mobileHotlineToggleRef.current.contains(target)
      ) {
        setIsMobileHotlinesOpen(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handleMouseDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleMouseDown)
    }
  }, [isHotlinesOpen, isMobileHotlinesOpen])

  const handleInquiryClick = () => {
    setIsHotlinesOpen(false)
    setIsMobileHotlinesOpen(false)
    setIsOpen(false)
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem('wingsgroup-contact-focus', 'contact-form')
    }
  }
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
    !isWingsGroupV3Surface &&
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
      if (event.key === 'Escape') {
        event.preventDefault()
        setIsOpen(false)
        mobileNavToggleRef.current?.focus()
      }
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
      {switcherLocales.map((metadata, index) => {
        const isWingsGroupSite = siteCode === 'wings-group'
        const label =
          siteCode === 'wings-go' || isWingsGroupSite
            ? metadata.code.toUpperCase()
            : metadata.label
        const accessibleLabel = isWingsGroupSite
          ? getNativeLocaleLabel(metadata.code, metadata.label)
          : metadata.label
        const href = buildLocaleSwitchHref(
          `${localeSwitchPathname}${clientReady ? locationSuffix : ''}`,
          metadata.code,
          defaultLocale,
        )

        return (
          <React.Fragment key={metadata.code}>
            {isWingsGroupSite && index > 0 ? (
              <span aria-hidden="true" className="site-language-switcher__divider select-none text-xs text-muted-foreground/60">/</span>
            ) : null}
            <a
              aria-current={metadata.code === resolvedLocale ? 'page' : undefined}
              aria-label={accessibleLabel}
              className="site-language-switcher__link"
              data-locale-code={metadata.code}
              href={href}
              key={metadata.code}
              onClick={navigateAndCloseMobile}
              title={metadata.label}
            >
              {label}
            </a>
          </React.Fragment>
        )
      })}
      {isWingsGroupV3Surface && englishPublicationState === 'hidden' ? (
        <>
          <span aria-hidden="true" className="site-language-switcher__divider select-none text-xs text-muted-foreground/60">/</span>
          <span
            aria-disabled="true"
            aria-label="English — Sắp có"
            className="site-language-switcher__link site-language-switcher__link--pending"
            title="English — Sắp có"
          >
            EN
          </span>
        </>
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
        {isWingsGroupV3Surface ? (
          <div className="wingsgroup-contact-zone relative inline-flex items-center">
            <div className="wingsgroup-split-call inline-flex items-stretch">
              {mainHotline ? (
                <a
                  aria-label={
                    resolvedLocale === 'en'
                      ? `Call now ${formatHotlineDisplay(mainHotline.normalized)}`
                      : `Gọi ngay ${formatHotlineDisplay(mainHotline.normalized)}`
                  }
                  className="wingsgroup-call-link"
                  href={mainHotline.href}
                >
                  <PhoneIcon aria-hidden="true" className="h-4 w-4 shrink-0" />
                  <span className="wingsgroup-call-copy">
                    <span className="wingsgroup-call-caption">
                      {resolvedLocale === 'en' ? 'Call now' : 'Gọi ngay'}
                    </span>
                    <span className="wingsgroup-call-number">
                      {formatHotlineDisplay(mainHotline.normalized)}
                    </span>
                  </span>
                </a>
              ) : null}
              <button
                ref={hotlineToggleRef}
                aria-controls="wingsgroup-header-contact-dropdown"
                aria-expanded={isHotlinesOpen}
                aria-label={
                  resolvedLocale === 'en'
                    ? 'Choose a contact channel'
                    : 'Chọn kênh liên hệ'
                }
                className="wingsgroup-split-toggle"
                onClick={() => setIsHotlinesOpen((prev) => !prev)}
                type="button"
              >
                <ChevronDownIcon
                  aria-hidden="true"
                  className={`h-4 w-4 transition-transform duration-150 ${isHotlinesOpen ? 'rotate-180' : ''}`}
                />
              </button>
            </div>
            {isHotlinesOpen ? (
              <div
                id="wingsgroup-header-contact-dropdown"
                ref={hotlineDropdownRef}
                className="wingsgroup-contact-popup"
              >
                <p className="wingsgroup-popup-label">
                  {resolvedLocale === 'en' ? 'Choose a contact channel' : 'Chọn kênh liên hệ'}
                </p>
                {secondaryHotlines.map((item, index) => {
                  const itemLabel = resolveHotlineItemLabel(item.label, index, resolvedLocale)
                  return (
                    <a
                      key={item.normalized}
                      aria-label={
                        resolvedLocale === 'en'
                          ? `Call ${itemLabel} ${formatHotlineDisplay(item.normalized)}`
                          : `Gọi ${itemLabel} ${formatHotlineDisplay(item.normalized)}`
                      }
                      className="wingsgroup-channel"
                      href={item.href}
                      onClick={() => setIsHotlinesOpen(false)}
                    >
                      <span className="wingsgroup-channel-mark" aria-hidden="true">
                        <PhoneIcon className="h-4 w-4" />
                      </span>
                      <span className="wingsgroup-channel-copy">
                        <b>{formatHotlineDisplay(item.normalized)}</b>
                        <small>{itemLabel}</small>
                      </span>
                    </a>
                  )
                })}
                {secondaryHotlines.length > 0 ? <div className="wingsgroup-popup-divider" /> : null}
                {sharedZaloCTA ? (
                  <a
                    aria-label={resolvedLocale === 'en' ? 'Chat on Zalo' : 'Chat Zalo'}
                    className="wingsgroup-channel"
                    href={sharedZaloCTA.href}
                    onClick={() => setIsHotlinesOpen(false)}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <span className="wingsgroup-channel-mark" aria-hidden="true">Z</span>
                    <span className="wingsgroup-channel-copy">
                      <b>{resolvedLocale === 'en' ? 'Chat on Zalo' : 'Chat Zalo'}</b>
                      <small>{resolvedLocale === 'en' ? 'Message the WingsGroup team' : 'Nhắn tin với WingsGroup'}</small>
                    </span>
                  </a>
                ) : null}
                <a
                  aria-label={resolvedLocale === 'en' ? 'Send an inquiry' : 'Gửi nhu cầu'}
                  className="wingsgroup-channel"
                  href={toSitePath('/lien-he#contact-form')}
                  onClick={handleInquiryClick}
                >
                  <span className="wingsgroup-channel-mark" aria-hidden="true">
                    <FileTextIcon className="h-4 w-4" />
                  </span>
                  <span className="wingsgroup-channel-copy">
                    <b>{resolvedLocale === 'en' ? 'Send an inquiry' : 'Gửi nhu cầu'}</b>
                    <small>{resolvedLocale === 'en' ? 'Let our specialists get back to you' : 'Để chuyên viên liên hệ với bạn'}</small>
                  </span>
                </a>
              </div>
            ) : null}
          </div>
        ) : isWingsGo && mainHotline ? (
          <div className="relative inline-flex items-center">
            <a
              aria-label={
                resolvedLocale === 'en'
                  ? `Call WingsGo ${formatHotlineDisplay(mainHotline.normalized)}`
                  : `Gọi hotline WingsGo ${formatHotlineDisplay(mainHotline.normalized)}`
              }
              className={`inline-flex min-h-10 shrink-0 items-center gap-1 whitespace-nowrap border border-[var(--site-border)] px-3 text-sm font-semibold text-[var(--site-brand)] no-underline ${secondaryHotlines.length > 0 ? 'rounded-l-full border-r-0' : 'rounded-full'}`}
              href={mainHotline.href}
            >
              <span aria-hidden="true">☎</span>
              <span>{formatHotlineDisplay(mainHotline.normalized)}</span>
            </a>
            {secondaryHotlines.length > 0 ? (
              <>
                <button
                  ref={hotlineToggleRef}
                  aria-controls="wingsgo-header-hotlines-dropdown"
                  aria-expanded={isHotlinesOpen}
                  aria-label={
                    resolvedLocale === 'en'
                      ? 'Additional hotlines'
                      : 'Danh sách hotline bổ sung'
                  }
                  className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-r-full border border-[var(--site-border)] px-2 text-xs font-semibold text-[var(--site-brand)] transition hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--site-accent)]"
                  onClick={() => setIsHotlinesOpen((prev) => !prev)}
                  type="button"
                >
                  <span aria-hidden="true">{isHotlinesOpen ? '▲' : '▼'}</span>
                </button>
                {isHotlinesOpen ? (
                  <div
                    id="wingsgo-header-hotlines-dropdown"
                    ref={hotlineDropdownRef}
                    className="absolute right-0 top-full z-50 mt-1 min-w-[200px] rounded-xl border border-[var(--site-border)] bg-background p-2 shadow-lg"
                  >
                    {secondaryHotlines.map((item) => (
                      <a
                        key={item.normalized}
                        className="flex min-h-9 items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold text-foreground no-underline transition hover:bg-muted/50"
                        href={item.href}
                        onClick={() => setIsHotlinesOpen(false)}
                      >
                        <span aria-hidden="true">📞</span>
                        <span>
                          {item.label
                            ? `${item.label}: ${formatHotlineDisplay(item.normalized)}`
                            : formatHotlineDisplay(item.normalized)}
                        </span>
                      </a>
                    ))}
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
        ) : null}
        {!isWingsGroupV3Surface && sharedZaloCTA ? (
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

      <div className="flex items-center gap-1.5 sm:gap-2 xl:hidden">
        {isWingsGroupV3Surface ? (
          <div className="wingsgroup-contact-zone wingsgroup-contact-zone--mobile relative inline-flex items-center">
            <div className="wingsgroup-split-call wingsgroup-split-call--mobile inline-flex items-stretch">
              {mainHotline ? (
                <a
                  aria-label={
                    resolvedLocale === 'en'
                      ? `Call now ${formatHotlineDisplay(mainHotline.normalized)}`
                      : `Gọi ngay ${formatHotlineDisplay(mainHotline.normalized)}`
                  }
                  className="wingsgroup-call-link wingsgroup-call-link--mobile"
                  href={mainHotline.href}
                >
                  <PhoneIcon aria-hidden="true" className="h-4 w-4 shrink-0" />
                  <span className="wingsgroup-call-number">
                    {resolvedLocale === 'en' ? 'Call now' : 'Gọi ngay'}
                  </span>
                </a>
              ) : null}
              <button
                ref={mobileHotlineToggleRef}
                aria-controls="wingsgroup-mobile-contact-dropdown"
                aria-expanded={isMobileHotlinesOpen}
                aria-label={
                  resolvedLocale === 'en'
                    ? 'Choose a contact channel'
                    : 'Chọn kênh liên hệ'
                }
                className="wingsgroup-split-toggle wingsgroup-split-toggle--mobile"
                onClick={() => setIsMobileHotlinesOpen((prev) => !prev)}
                type="button"
              >
                <ChevronDownIcon
                  aria-hidden="true"
                  className={`h-4 w-4 transition-transform duration-150 ${isMobileHotlinesOpen ? 'rotate-180' : ''}`}
                />
              </button>
            </div>
            {isMobileHotlinesOpen ? (
              <div
                id="wingsgroup-mobile-contact-dropdown"
                ref={mobileHotlineDropdownRef}
                className="wingsgroup-contact-popup wingsgroup-contact-popup--mobile"
              >
                <p className="wingsgroup-popup-label">
                  {resolvedLocale === 'en' ? 'Choose a contact channel' : 'Chọn kênh liên hệ'}
                </p>
                {secondaryHotlines.map((item, index) => {
                  const itemLabel = resolveHotlineItemLabel(item.label, index, resolvedLocale)
                  return (
                    <a
                      key={item.normalized}
                      aria-label={
                        resolvedLocale === 'en'
                          ? `Call ${itemLabel} ${formatHotlineDisplay(item.normalized)}`
                          : `Gọi ${itemLabel} ${formatHotlineDisplay(item.normalized)}`
                      }
                      className="wingsgroup-channel"
                      href={item.href}
                      onClick={() => setIsMobileHotlinesOpen(false)}
                    >
                      <span className="wingsgroup-channel-mark" aria-hidden="true">
                        <PhoneIcon className="h-4 w-4" />
                      </span>
                      <span className="wingsgroup-channel-copy">
                        <b>{formatHotlineDisplay(item.normalized)}</b>
                        <small>{itemLabel}</small>
                      </span>
                    </a>
                  )
                })}
                {secondaryHotlines.length > 0 ? <div className="wingsgroup-popup-divider" /> : null}
                {sharedZaloCTA ? (
                  <a
                    aria-label={resolvedLocale === 'en' ? 'Chat on Zalo' : 'Chat Zalo'}
                    className="wingsgroup-channel"
                    href={sharedZaloCTA.href}
                    onClick={() => setIsMobileHotlinesOpen(false)}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <span className="wingsgroup-channel-mark" aria-hidden="true">Z</span>
                    <span className="wingsgroup-channel-copy">
                      <b>{resolvedLocale === 'en' ? 'Chat on Zalo' : 'Chat Zalo'}</b>
                      <small>{resolvedLocale === 'en' ? 'Message the WingsGroup team' : 'Nhắn tin với WingsGroup'}</small>
                    </span>
                  </a>
                ) : null}
                <a
                  aria-label={resolvedLocale === 'en' ? 'Send an inquiry' : 'Gửi nhu cầu'}
                  className="wingsgroup-channel"
                  href={toSitePath('/lien-he#contact-form')}
                  onClick={handleInquiryClick}
                >
                  <span className="wingsgroup-channel-mark" aria-hidden="true">
                    <FileTextIcon className="h-4 w-4" />
                  </span>
                  <span className="wingsgroup-channel-copy">
                    <b>{resolvedLocale === 'en' ? 'Send an inquiry' : 'Gửi nhu cầu'}</b>
                    <small>{resolvedLocale === 'en' ? 'Let our specialists get back to you' : 'Để chuyên viên liên hệ với bạn'}</small>
                  </span>
                </a>
              </div>
            ) : null}
          </div>
        ) : (
          <>
            {shouldRenderPrimaryAction && resolvedPrimaryAction ? (
              <SiteLink
                className="site-header-cta site-header-cta--mobile"
                data-wingsgroup-consultation-trigger={isWingsGroupV3Surface ? 'true' : undefined}
                href={resolvedPrimaryAction.url}
              >
                {resolvedPrimaryAction.label}
              </SiteLink>
            ) : null}
            {isWingsGo && mainHotline ? (
              <a
                aria-label={
                  resolvedLocale === 'en'
                    ? `Call WingsGo ${formatHotlineDisplay(mainHotline.normalized)}`
                    : `Gọi hotline WingsGo ${formatHotlineDisplay(mainHotline.normalized)}`
                }
                className="site-icon-button"
                href={mainHotline.href}
                title={formatHotlineDisplay(mainHotline.normalized)}
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
          </>
        )}
        {!isWingsSide && !isWingsGo && showSearch ? (
          <SiteLink className="site-icon-button" href="/search">
            <span className="sr-only">{copy.search}</span>
            <SearchIcon aria-hidden="true" className="h-5 w-5" />
          </SiteLink>
        ) : null}
        <button
          ref={mobileNavToggleRef}
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
          {isWingsGroupV3Surface ? (
            <>
              <div className="wingsgroup-drawer-divider my-2 border-t border-[var(--site-border,#dedbd3)]" />
              {mainHotline ? (
                <a
                  className="site-mobile-nav__link font-semibold"
                  href={mainHotline.href}
                  onClick={() => setIsOpen(false)}
                >
                  <PhoneIcon aria-hidden="true" className="mr-2 inline-block h-4 w-4" />
                  {resolvedLocale === 'en'
                    ? `Call now: ${formatHotlineDisplay(mainHotline.normalized)}`
                    : `Gọi ngay: ${formatHotlineDisplay(mainHotline.normalized)}`}
                </a>
              ) : null}
              {secondaryHotlines.map((item, index) => {
                const itemLabel = resolveHotlineItemLabel(item.label, index, resolvedLocale)
                return (
                  <a
                    key={item.normalized}
                    className="site-mobile-nav__link"
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                  >
                    <PhoneIcon aria-hidden="true" className="mr-2 inline-block h-4 w-4" />
                    {itemLabel}: {formatHotlineDisplay(item.normalized)}
                  </a>
                )
              })}
              {sharedZaloCTA ? (
                <a
                  aria-label={sharedZaloCTA.ariaLabel}
                  className="site-mobile-nav__link"
                  href={sharedZaloCTA.href}
                  rel="noopener noreferrer"
                  target="_blank"
                  onClick={() => setIsOpen(false)}
                >
                  <span className="mr-2 inline-flex h-4 w-4 items-center justify-center rounded border border-current text-xs font-bold">Z</span>
                  {resolvedLocale === 'en' ? 'Chat on Zalo' : 'Chat Zalo'}
                </a>
              ) : null}
              <a
                className="site-mobile-nav__link"
                href={toSitePath('/lien-he#contact-form')}
                onClick={handleInquiryClick}
              >
                <FileTextIcon aria-hidden="true" className="mr-2 inline-block h-4 w-4" />
                {resolvedLocale === 'en' ? 'Send an inquiry' : 'Gửi nhu cầu'}
              </a>
            </>
          ) : (
            <>
              {isWingsGo
                ? resolvedHotlines.map((item) => (
                    <a
                      key={item.normalized}
                      className="site-mobile-nav__link"
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                    >
                      ☎{' '}
                      {item.label
                        ? `${item.label}: ${formatHotlineDisplay(item.normalized)}`
                        : resolvedLocale === 'en'
                          ? `Call ${formatHotlineDisplay(item.normalized)}`
                          : `Gọi ${formatHotlineDisplay(item.normalized)}`}
                    </a>
                  ))
                : null}
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
            </>
          )}
          {languageSwitcher}
        </nav>
      ) : null}
    </div>
  )
}
