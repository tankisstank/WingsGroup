import { publicLocaleCodes, type SupportedLocaleCode } from '@/utilities/locales'

export const publicLocales = ['vi', 'en', 'it', 'es', 'pt'] as const satisfies readonly SupportedLocaleCode[]

export type PublicLocaleCode = (typeof publicLocales)[number]

export type LocalizedCopy<T> = Record<PublicLocaleCode, T>

export const assertPublicLocaleSourceMatches = (): void => {
  const configured = [...publicLocaleCodes].sort()
  const expected = [...publicLocales].sort()

  if (configured.join('|') !== expected.join('|')) {
    throw new Error(
      `Public locale copy contract is out of sync: expected ${expected.join(', ')}, got ${configured.join(', ')}`,
    )
  }
}

export const isPublicLocaleCode = (locale?: null | string): locale is PublicLocaleCode =>
  publicLocales.includes(locale as PublicLocaleCode)

export const getRequiredLocaleCopy = <T>(
  dictionary: LocalizedCopy<T>,
  locale: PublicLocaleCode,
): T => {
  const copy = dictionary[locale]

  if (!copy) {
    throw new Error(`Missing required public locale copy for ${locale}`)
  }

  return copy
}

export const getRuntimeLocaleCopy = <T>(
  dictionary: LocalizedCopy<T>,
  locale?: null | string,
): T => dictionary[isPublicLocaleCode(locale) ? locale : 'en']

export type PublicChromeCopy = {
  callToActionRegion: string
  footerNavigation: string
  relatedPagesHeading: string
  relatedPagesKicker: string
  skipToMain: string
  themeSelector: {
    ariaLabel: string
    auto: string
    dark: string
    light: string
    placeholder: string
  }
}

export const publicChromeCopy: LocalizedCopy<PublicChromeCopy> = {
  en: {
    callToActionRegion: 'Call to action',
    footerNavigation: 'Footer navigation',
    relatedPagesHeading: 'Related journeys',
    relatedPagesKicker: 'Continue exploring',
    skipToMain: 'Skip to main content',
    themeSelector: {
      ariaLabel: 'Select a theme',
      auto: 'Auto',
      dark: 'Dark',
      light: 'Light',
      placeholder: 'Theme',
    },
  },
  es: {
    callToActionRegion: 'Llamada a la acción',
    footerNavigation: 'Navegación del pie de página',
    relatedPagesHeading: 'Rutas relacionadas',
    relatedPagesKicker: 'Sigue explorando',
    skipToMain: 'Saltar al contenido principal',
    themeSelector: {
      ariaLabel: 'Seleccionar tema',
      auto: 'Automático',
      dark: 'Oscuro',
      light: 'Claro',
      placeholder: 'Tema',
    },
  },
  it: {
    callToActionRegion: "Invito all'azione",
    footerNavigation: 'Navigazione del piè di pagina',
    relatedPagesHeading: 'Percorsi correlati',
    relatedPagesKicker: 'Continua a esplorare',
    skipToMain: 'Vai al contenuto principale',
    themeSelector: {
      ariaLabel: 'Seleziona tema',
      auto: 'Automatico',
      dark: 'Scuro',
      light: 'Chiaro',
      placeholder: 'Tema',
    },
  },
  pt: {
    callToActionRegion: 'Chamada para ação',
    footerNavigation: 'Navegação do rodapé',
    relatedPagesHeading: 'Percursos relacionados',
    relatedPagesKicker: 'Continue a explorar',
    skipToMain: 'Saltar para o conteúdo principal',
    themeSelector: {
      ariaLabel: 'Selecionar tema',
      auto: 'Automático',
      dark: 'Escuro',
      light: 'Claro',
      placeholder: 'Tema',
    },
  },
  vi: {
    callToActionRegion: 'Kêu gọi hành động',
    footerNavigation: 'Điều hướng chân trang',
    relatedPagesHeading: 'Trang liên quan',
    relatedPagesKicker: 'Tiếp tục khám phá',
    skipToMain: 'Bỏ qua đến nội dung chính',
    themeSelector: {
      ariaLabel: 'Chọn giao diện',
      auto: 'Tự động',
      dark: 'Tối',
      light: 'Sáng',
      placeholder: 'Giao diện',
    },
  },
}
