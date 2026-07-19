'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'

import type { Header as HeaderType } from '@/payload-types'

import { CMSLink } from '@/components/Link'
import { SiteLink } from '@/components/SiteLink'
import { useSitePublicPathname } from '@/providers/SitePath'
import { getCopyLocale, publicLocaleMetadata } from '@/utilities/locales'
import { buildLocaleSwitchHref, type SupportedLocaleCode } from '@/utilities/sitePaths'
import { ChevronDownIcon, Globe2Icon, MenuIcon, SearchIcon, XIcon } from 'lucide-react'

type WingsSideMegaMenuGroup = {
  items: Array<{
    description: string
    label: string
    url: string
  }>
  title: string
}

const megaMenuPanelID = 'site-mega-menu-panel'

const wingsSideMegaMenuGroupsByLocale: Partial<
  Record<SupportedLocaleCode, WingsSideMegaMenuGroup[]>
> = {
  en: [
    {
      items: [
        {
          description: 'Vietnam route ideas by place',
          label: 'All destinations',
          url: '/destinations',
        },
        {
          description: 'Heritage, food, and the northern gateway',
          label: 'Ha Noi',
          url: '/destinations/ha-noi',
        },
        {
          description: 'Cruise rhythm and seascape contrast',
          label: 'Ha Long',
          url: '/destinations/ha-long',
        },
        {
          description: 'Central Vietnam heritage pairing',
          label: 'Hue and Hoi An',
          url: '/destinations/hue',
        },
      ],
      title: 'Destinations',
    },
    {
      items: [
        { description: 'Refined pacing, hotels, hosting', label: 'Luxury', url: '/styles/luxury' },
        { description: 'Balanced days for mixed ages', label: 'Family', url: '/styles/family' },
        {
          description: 'Stories, context, food, heritage',
          label: 'Culture',
          url: '/styles/culture',
        },
        { description: 'More active route rhythm', label: 'Adventure', url: '/styles/adventure' },
      ],
      title: 'Travel styles',
    },
    {
      items: [
        {
          description: 'A multi-region first trip frame',
          label: 'Vietnam highlights',
          url: '/packages/vietnam-highlights',
        },
        {
          description: 'North Vietnam in tighter focus',
          label: 'Northern Vietnam',
          url: '/packages/northern-vietnam',
        },
        {
          description: 'A softer heritage-led route',
          label: 'Central heritage',
          url: '/packages/central-heritage',
        },
        {
          description: 'Send a short planning brief',
          label: 'Plan your trip',
          url: '/plan-your-trip',
        },
      ],
      title: 'Sample itineraries',
    },
  ],
  es: [
    {
      items: [
        {
          description: 'Ideas de ruta por destino',
          label: 'Todos los destinos',
          url: '/destinations',
        },
        {
          description: 'Patrimonio, gastronomía y puerta norte',
          label: 'Hanói',
          url: '/destinations/ha-noi',
        },
        {
          description: 'Ritmo de crucero y paisaje marino',
          label: 'Ha Long',
          url: '/destinations/ha-long',
        },
        {
          description: 'Patrimonio del centro de Vietnam',
          label: 'Hue y Hoi An',
          url: '/destinations/hue',
        },
      ],
      title: 'Destinos',
    },
    {
      items: [
        {
          description: 'Ritmo cuidado, hoteles y anfitrionía',
          label: 'Lujo',
          url: '/styles/luxury',
        },
        {
          description: 'Días equilibrados para distintas edades',
          label: 'Familia',
          url: '/styles/family',
        },
        {
          description: 'Historias, contexto, comida y patrimonio',
          label: 'Cultura',
          url: '/styles/culture',
        },
        { description: 'Un ritmo de ruta más activo', label: 'Aventura', url: '/styles/adventure' },
      ],
      title: 'Estilos de viaje',
    },
    {
      items: [
        {
          description: 'Un primer viaje por varias regiones',
          label: 'Vietnam esencial',
          url: '/packages/vietnam-highlights',
        },
        {
          description: 'El norte de Vietnam con más foco',
          label: 'Norte de Vietnam',
          url: '/packages/northern-vietnam',
        },
        {
          description: 'Una ruta patrimonial más pausada',
          label: 'Patrimonio central',
          url: '/packages/central-heritage',
        },
        {
          description: 'Envía un breve resumen de viaje',
          label: 'Planifica tu viaje',
          url: '/plan-your-trip',
        },
      ],
      title: 'Itinerarios de muestra',
    },
  ],
  it: [
    {
      items: [
        {
          description: 'Idee di itinerario per destinazione',
          label: 'Tutte le destinazioni',
          url: '/destinations',
        },
        {
          description: 'Patrimonio, cucina e porta del nord',
          label: 'Hanoi',
          url: '/destinations/ha-noi',
        },
        {
          description: 'Ritmo di crociera e paesaggi marini',
          label: 'Ha Long',
          url: '/destinations/ha-long',
        },
        {
          description: 'Patrimonio del Vietnam centrale',
          label: 'Hue e Hoi An',
          url: '/destinations/hue',
        },
      ],
      title: 'Destinazioni',
    },
    {
      items: [
        {
          description: 'Ritmo raffinato, hotel e accoglienza',
          label: 'Lusso',
          url: '/styles/luxury',
        },
        {
          description: 'Giornate equilibrate per età diverse',
          label: 'Famiglia',
          url: '/styles/family',
        },
        {
          description: 'Storie, contesto, cucina e patrimonio',
          label: 'Cultura',
          url: '/styles/culture',
        },
        {
          description: 'Un ritmo di viaggio più attivo',
          label: 'Avventura',
          url: '/styles/adventure',
        },
      ],
      title: 'Stili di viaggio',
    },
    {
      items: [
        {
          description: 'Un primo viaggio attraverso più regioni',
          label: 'Vietnam essenziale',
          url: '/packages/vietnam-highlights',
        },
        {
          description: 'Nord del Vietnam con focus più stretto',
          label: 'Vietnam del Nord',
          url: '/packages/northern-vietnam',
        },
        {
          description: 'Una rotta culturale più morbida',
          label: 'Patrimonio centrale',
          url: '/packages/central-heritage',
        },
        {
          description: 'Invia un breve brief di viaggio',
          label: 'Pianifica il viaggio',
          url: '/plan-your-trip',
        },
      ],
      title: 'Itinerari di esempio',
    },
  ],
  pt: [
    {
      items: [
        {
          description: 'Ideias de rota por destino',
          label: 'Todos os destinos',
          url: '/destinations',
        },
        {
          description: 'Património, gastronomia e porta do norte',
          label: 'Hanói',
          url: '/destinations/ha-noi',
        },
        {
          description: 'Ritmo de cruzeiro e paisagem marítima',
          label: 'Ha Long',
          url: '/destinations/ha-long',
        },
        {
          description: 'Património do Vietname central',
          label: 'Hue e Hoi An',
          url: '/destinations/hue',
        },
      ],
      title: 'Destinos',
    },
    {
      items: [
        {
          description: 'Ritmo cuidado, hotéis e acolhimento',
          label: 'Luxo',
          url: '/styles/luxury',
        },
        {
          description: 'Dias equilibrados para várias idades',
          label: 'Família',
          url: '/styles/family',
        },
        {
          description: 'Histórias, contexto, comida e património',
          label: 'Cultura',
          url: '/styles/culture',
        },
        {
          description: 'Um ritmo de viagem mais ativo',
          label: 'Aventura',
          url: '/styles/adventure',
        },
      ],
      title: 'Estilos de viagem',
    },
    {
      items: [
        {
          description: 'Uma primeira viagem por várias regiões',
          label: 'Vietname essencial',
          url: '/packages/vietnam-highlights',
        },
        {
          description: 'Norte do Vietname com foco mais preciso',
          label: 'Norte do Vietname',
          url: '/packages/northern-vietnam',
        },
        {
          description: 'Uma rota patrimonial mais suave',
          label: 'Património central',
          url: '/packages/central-heritage',
        },
        {
          description: 'Envie um breve pedido de planeamento',
          label: 'Planear a viagem',
          url: '/plan-your-trip',
        },
      ],
      title: 'Itinerários de exemplo',
    },
  ],
  vi: [
    {
      items: [
        {
          description: 'Gợi ý tuyến Việt Nam theo điểm đến',
          label: 'Tất cả điểm đến',
          url: '/destinations',
        },
        {
          description: 'Di sản, ẩm thực và cửa ngõ miền Bắc',
          label: 'Hà Nội',
          url: '/destinations/ha-noi',
        },
        {
          description: 'Nhịp du thuyền và cảnh quan biển',
          label: 'Hạ Long',
          url: '/destinations/ha-long',
        },
        {
          description: 'Cặp di sản miền Trung',
          label: 'Huế và Hội An',
          url: '/destinations/hue',
        },
      ],
      title: 'Điểm đến',
    },
    {
      items: [
        { description: 'Nhịp tinh tế, khách sạn và host', label: 'Cao cấp', url: '/styles/luxury' },
        {
          description: 'Ngày đi cân bằng cho nhiều độ tuổi',
          label: 'Gia đình',
          url: '/styles/family',
        },
        {
          description: 'Câu chuyện, bối cảnh, ẩm thực, di sản',
          label: 'Văn hóa',
          url: '/styles/culture',
        },
        { description: 'Nhịp tuyến năng động hơn', label: 'Phiêu lưu', url: '/styles/adventure' },
      ],
      title: 'Phong cách du lịch',
    },
    {
      items: [
        {
          description: 'Khung chuyến đầu tiên qua nhiều vùng',
          label: 'Điểm nổi bật Việt Nam',
          url: '/packages/vietnam-highlights',
        },
        {
          description: 'Tập trung hơn vào miền Bắc',
          label: 'Miền Bắc Việt Nam',
          url: '/packages/northern-vietnam',
        },
        {
          description: 'Tuyến di sản nhẹ nhàng hơn',
          label: 'Di sản miền Trung',
          url: '/packages/central-heritage',
        },
        {
          description: 'Gửi brief lập kế hoạch ngắn',
          label: 'Lên kế hoạch',
          url: '/plan-your-trip',
        },
      ],
      title: 'Hành trình mẫu',
    },
  ],
}

export const HeaderNav: React.FC<{
  data: { navItems?: HeaderType['navItems'] }
  primaryAction?: {
    label: string
    url: string
  }
  publicPathname?: string
  resolvedLocale?: SupportedLocaleCode
  siteCode?: string
  themeKey?: string
}> = ({ data, primaryAction, publicPathname, resolvedLocale = 'vi', siteCode, themeKey }) => {
  const navItems = data?.navItems || []
  const [isOpen, setIsOpen] = useState(false)
  const [isMegaOpen, setIsMegaOpen] = useState(false)
  const [clientReady, setClientReady] = useState(false)
  const [locationSuffix, setLocationSuffix] = useState('')
  const headerNavRef = useRef<HTMLDivElement>(null)
  const megaMenuRef = useRef<HTMLDivElement>(null)
  const pathname = useSitePublicPathname()
  const searchParams = useSearchParams()
  const localeSwitchPathname = pathname || publicPathname || '/'
  const isWingsSide = siteCode ? siteCode === 'wings-side' : themeKey === 'wings-side'
  const shouldRenderPrimaryAction =
    primaryAction &&
    !navItems.some(({ link }) => {
      const label = link?.label?.trim().toLowerCase()
      const url = link?.url?.replace(/\/+$/, '') || '/'
      const primaryLabel = primaryAction.label.trim().toLowerCase()
      const primaryURL = primaryAction.url.replace(/\/+$/, '') || '/'

      return label === primaryLabel || url === primaryURL
    })
  const copyByLocale: Partial<
    Record<
      SupportedLocaleCode,
      {
        closeNavigation: string
        languageSwitcher: string
        megaMenu: string
        openNavigation: string
        search: string
      }
    >
  > = {
    en: {
      closeNavigation: 'Close navigation',
      languageSwitcher: 'Language switcher',
      megaMenu: 'Plan Vietnam',
      openNavigation: 'Open navigation',
      search: 'Search',
    },
    vi: {
      closeNavigation: 'Đóng điều hướng',
      languageSwitcher: 'Chọn ngôn ngữ',
      megaMenu: 'Lên kế hoạch Việt Nam',
      openNavigation: 'Mở điều hướng',
      search: 'Tìm kiếm',
    },
    it: {
      closeNavigation: 'Chiudi navigazione',
      languageSwitcher: 'Selettore lingua',
      megaMenu: 'Pianifica il Vietnam',
      openNavigation: 'Apri navigazione',
      search: 'Cerca',
    },
    es: {
      closeNavigation: 'Cerrar navegación',
      languageSwitcher: 'Selector de idioma',
      megaMenu: 'Planifica Vietnam',
      openNavigation: 'Abrir navegación',
      search: 'Buscar',
    },
    pt: {
      closeNavigation: 'Fechar navegação',
      languageSwitcher: 'Seletor de idioma',
      megaMenu: 'Planear o Vietname',
      openNavigation: 'Abrir navegação',
      search: 'Pesquisar',
    },
  }
  const copy =
    copyByLocale[resolvedLocale] || copyByLocale[getCopyLocale(resolvedLocale)] || copyByLocale.en!
  const megaMenuGroups =
    wingsSideMegaMenuGroupsByLocale[resolvedLocale] ||
    wingsSideMegaMenuGroupsByLocale[getCopyLocale(resolvedLocale)] ||
    wingsSideMegaMenuGroupsByLocale.en!
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
    if (!isMegaOpen) {
      return
    }

    const closeIfOutside = (event: PointerEvent | FocusEvent) => {
      const target = event.target

      if (!(target instanceof Node) || megaMenuRef.current?.contains(target)) {
        return
      }

      setIsMegaOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMegaOpen(false)
      }
    }

    document.addEventListener('pointerdown', closeIfOutside)
    document.addEventListener('focusin', closeIfOutside)
    document.addEventListener('keydown', closeOnEscape)

    return () => {
      document.removeEventListener('pointerdown', closeIfOutside)
      document.removeEventListener('focusin', closeIfOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [isMegaOpen])

  useEffect(() => {
    setIsOpen(false)
    setIsMegaOpen(false)
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
      {publicLocaleMetadata.map((metadata) => {
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
    </nav>
  )

  const megaMenu = isWingsSide ? (
    <div className="site-mega-menu" data-open={isMegaOpen ? 'true' : 'false'} ref={megaMenuRef}>
      <button
        aria-controls={megaMenuPanelID}
        aria-expanded={isMegaOpen}
        className="theme-nav-link site-mega-menu__trigger"
        onClick={() => setIsMegaOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setIsMegaOpen(false)
        }}
        type="button"
      >
        {copy.megaMenu}
        <ChevronDownIcon aria-hidden="true" className="h-4 w-4" />
      </button>
      {isMegaOpen ? (
        <div
          aria-label={copy.megaMenu}
          className="site-mega-menu__panel"
          id={megaMenuPanelID}
          role="region"
        >
          {megaMenuGroups.map((group) => (
            <section className="site-mega-menu__group" key={group.title}>
              <h3>{group.title}</h3>
              {group.items.map((item) => (
                <SiteLink
                  className="site-mega-menu__item"
                  href={item.url}
                  key={`${group.title}-${item.url}`}
                  onClick={() => setIsMegaOpen(false)}
                >
                  <strong>{item.label}</strong>
                  <span>{item.description}</span>
                </SiteLink>
              ))}
            </section>
          ))}
        </div>
      ) : null}
    </div>
  ) : null

  return (
    <div className="site-header__nav" ref={headerNavRef}>
      <nav aria-label="Primary navigation" className="hidden items-center gap-3 xl:flex">
        {navItems.map(({ link }, i) => {
          return (
            <CMSLink
              className="theme-nav-link site-header__primary-link"
              key={i}
              {...link}
              appearance="link"
            />
          )
        })}
        {megaMenu}
        {shouldRenderPrimaryAction ? (
          <SiteLink className="site-header-cta" href={primaryAction.url}>
            {primaryAction.label}
          </SiteLink>
        ) : null}
        <SiteLink className="site-icon-button" href="/search">
          <span className="sr-only">{copy.search}</span>
          <SearchIcon aria-hidden="true" className="h-5 w-5" />
        </SiteLink>
        {languageSwitcher}
      </nav>

      <div className="flex items-center gap-2 xl:hidden">
        {shouldRenderPrimaryAction ? (
          <SiteLink className="site-header-cta site-header-cta--mobile" href={primaryAction.url}>
            {primaryAction.label}
          </SiteLink>
        ) : null}
        <SiteLink className="site-icon-button" href="/search">
          <span className="sr-only">{copy.search}</span>
          <SearchIcon aria-hidden="true" className="h-5 w-5" />
        </SiteLink>
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
          {navItems.map(({ link }, i) => {
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
          {isWingsSide ? (
            <div className="site-mobile-nav__mega">
              <p>{copy.megaMenu}</p>
              {megaMenuGroups.flatMap((group) =>
                group.items.map((item) => (
                  <SiteLink
                    className="site-mobile-nav__link"
                    href={item.url}
                    key={`${group.title}-${item.url}`}
                    onClick={navigateAndCloseMobile}
                  >
                    {item.label}
                  </SiteLink>
                )),
              )}
            </div>
          ) : null}
          {shouldRenderPrimaryAction ? (
            <SiteLink
              className="site-mobile-nav__link site-mobile-nav__link--primary"
              href={primaryAction.url}
              onClick={navigateAndCloseMobile}
            >
              {primaryAction.label}
            </SiteLink>
          ) : null}
          {languageSwitcher}
        </nav>
      ) : null}
    </div>
  )
}
