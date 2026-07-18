import {
  getLocaleFromPathname,
  getSiteAliasFromPathname,
  type SupportedLocaleCode,
} from './sitePaths'

export const WINGSSIDE_SPECIALS_DISMISSED_KEY = 'wingside-promo-dismissed'

export const shouldRenderWingsSideSpecials = (siteCode: string, publicPathname: string): boolean =>
  siteCode === 'wings-side' && isWingsSideSpecialsHomePathname(publicPathname)

export const isWingsSideSpecialsHomePathname = (pathname: string): boolean => {
  const segments = pathname.split('/').filter(Boolean)
  const siteAlias = getSiteAliasFromPathname(pathname)
  const locale = getLocaleFromPathname(pathname)
  const contentSegments = segments.slice(siteAlias ? 1 : 0)

  if (locale && contentSegments[0] === locale) contentSegments.shift()

  return contentSegments.length === 0
}

export type WingsSideSpecialsCopy = {
  ariaLabel: string
  badge: string
  closeLabel: string
  ctaLabel: string
  items: readonly [string, string, string]
  title: string
}

const copyByLocale = {
  en: {
    ariaLabel: 'Specials — hot tours and packages',
    badge: '// HOT  LIMITED',
    closeLabel: 'Dismiss specials',
    ctaLabel: 'Go to hot tours and packages',
    items: ['Deals', 'Hot tours', 'Exclusive packs'],
    title: 'SPECIALS.',
  },
  es: {
    ariaLabel: 'Especiales — tours y paquetes destacados',
    badge: '// HOT  LIMITED',
    closeLabel: 'Cerrar especiales',
    ctaLabel: 'Ver tours y paquetes destacados',
    items: ['Ofertas', 'Tours destacados', 'Packs exclusivos'],
    title: 'SPECIALS.',
  },
  it: {
    ariaLabel: 'Speciali — tour e pacchetti del momento',
    badge: '// HOT  LIMITED',
    closeLabel: 'Chiudi gli speciali',
    ctaLabel: 'Vai ai tour e pacchetti del momento',
    items: ['Offerte', 'Tour del momento', 'Pacchetti esclusivi'],
    title: 'SPECIALS.',
  },
  pt: {
    ariaLabel: 'Especiais — tours e pacotes em destaque',
    badge: '// HOT  LIMITED',
    closeLabel: 'Fechar especiais',
    ctaLabel: 'Ver tours e pacotes em destaque',
    items: ['Ofertas', 'Tours em destaque', 'Pacotes exclusivos'],
    title: 'SPECIALS.',
  },
  vi: {
    ariaLabel: 'Ưu đãi — tour và gói nổi bật',
    badge: '// HOT  LIMITED',
    closeLabel: 'Đóng ưu đãi',
    ctaLabel: 'Xem tour và gói nổi bật',
    items: ['Ưu đãi', 'Tour nổi bật', 'Gói độc quyền'],
    title: 'SPECIALS.',
  },
} as const satisfies Partial<Record<SupportedLocaleCode, WingsSideSpecialsCopy>>

export const getWingsSideSpecialsCopy = (
  locale?: null | string,
): WingsSideSpecialsCopy =>
  locale && locale in copyByLocale
    ? copyByLocale[locale as keyof typeof copyByLocale]
    : copyByLocale.en

type SessionStorageLike = Pick<Storage, 'getItem' | 'setItem'>

export const isWingsSideSpecialsDismissed = (storage?: null | SessionStorageLike): boolean => {
  if (!storage) return false

  try {
    return storage.getItem(WINGSSIDE_SPECIALS_DISMISSED_KEY) === '1'
  } catch {
    return false
  }
}

export const dismissWingsSideSpecials = (storage?: null | SessionStorageLike): void => {
  if (!storage) return

  try {
    storage.setItem(WINGSSIDE_SPECIALS_DISMISSED_KEY, '1')
  } catch {
    // Storage can be disabled by browser privacy settings. Dismiss for this render regardless.
  }
}
