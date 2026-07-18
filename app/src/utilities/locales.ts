export const localeCodes = ['vi', 'en', 'it', 'es', 'pt', 'ja', 'ko', 'fr', 'de'] as const

export type SupportedLocaleCode = (typeof localeCodes)[number]

export type LocaleDirection = 'ltr' | 'rtl'
export const copyLocaleCodes = ['en', 'vi'] as const
export type CopyLocaleCode = 'en' | 'vi'

export type LocaleMetadata = {
  code: SupportedLocaleCode
  direction: LocaleDirection
  fallbackLocale: SupportedLocaleCode
  isAdsReady: boolean
  isCmsEnabled: boolean
  isPublicEnabled: boolean
  label: string
}

export const localeMetadata = [
  {
    code: 'vi',
    direction: 'ltr',
    fallbackLocale: 'vi',
    isAdsReady: false,
    isCmsEnabled: true,
    isPublicEnabled: true,
    label: 'Tiếng Việt',
  },
  {
    code: 'en',
    direction: 'ltr',
    fallbackLocale: 'en',
    isAdsReady: true,
    isCmsEnabled: true,
    isPublicEnabled: true,
    label: 'English',
  },
  {
    code: 'it',
    direction: 'ltr',
    fallbackLocale: 'en',
    isAdsReady: true,
    isCmsEnabled: true,
    isPublicEnabled: true,
    label: 'Italiano',
  },
  {
    code: 'es',
    direction: 'ltr',
    fallbackLocale: 'en',
    isAdsReady: true,
    isCmsEnabled: true,
    isPublicEnabled: true,
    label: 'Español',
  },
  {
    code: 'pt',
    direction: 'ltr',
    fallbackLocale: 'en',
    isAdsReady: true,
    isCmsEnabled: true,
    isPublicEnabled: true,
    label: 'Português',
  },
  {
    code: 'ja',
    direction: 'ltr',
    fallbackLocale: 'en',
    isAdsReady: false,
    isCmsEnabled: true,
    isPublicEnabled: false,
    label: '日本語',
  },
  {
    code: 'ko',
    direction: 'ltr',
    fallbackLocale: 'en',
    isAdsReady: false,
    isCmsEnabled: true,
    isPublicEnabled: false,
    label: '한국어',
  },
  {
    code: 'fr',
    direction: 'ltr',
    fallbackLocale: 'en',
    isAdsReady: false,
    isCmsEnabled: true,
    isPublicEnabled: false,
    label: 'Français',
  },
  {
    code: 'de',
    direction: 'ltr',
    fallbackLocale: 'en',
    isAdsReady: false,
    isCmsEnabled: true,
    isPublicEnabled: false,
    label: 'Deutsch',
  },
] as const satisfies readonly LocaleMetadata[]

export const cmsEnabledLocaleMetadata = localeMetadata.filter((locale) => locale.isCmsEnabled)
export const publicLocaleMetadata = localeMetadata.filter((locale) => locale.isPublicEnabled)
export const adsReadyLocaleMetadata = localeMetadata.filter((locale) => locale.isAdsReady)

export const cmsEnabledLocaleCodes = cmsEnabledLocaleMetadata.map((locale) => locale.code)
export const publicLocaleCodes = publicLocaleMetadata.map((locale) => locale.code)
export const adsReadyLocaleCodes = adsReadyLocaleMetadata.map((locale) => locale.code)

export const localeMetadataByCode = Object.fromEntries(
  localeMetadata.map((locale) => [locale.code, locale]),
) as Record<SupportedLocaleCode, LocaleMetadata>

export const isSupportedLocale = (value?: null | string): value is SupportedLocaleCode =>
  Boolean(value && localeCodes.includes(value as SupportedLocaleCode))

export const isPublicLocale = (value?: null | string): value is SupportedLocaleCode =>
  isSupportedLocale(value) && localeMetadataByCode[value].isPublicEnabled

export const getLocaleFallback = (locale?: null | string): SupportedLocaleCode =>
  isSupportedLocale(locale) ? localeMetadataByCode[locale].fallbackLocale : 'en'

export const isCopyLocale = (value?: null | string): value is CopyLocaleCode =>
  Boolean(value && copyLocaleCodes.includes(value as CopyLocaleCode))

export const getCopyLocale = (locale?: null | string): CopyLocaleCode => {
  const fallbackLocale = getLocaleFallback(locale)

  return isCopyLocale(fallbackLocale) ? fallbackLocale : 'en'
}

export const localeSelectOptions = cmsEnabledLocaleMetadata.map((locale) => ({
  label: locale.label,
  value: locale.code,
}))
