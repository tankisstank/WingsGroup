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
    label: 'Tiếng Việt (vi)',
  },
  {
    code: 'en',
    direction: 'ltr',
    fallbackLocale: 'en',
    isAdsReady: true,
    isCmsEnabled: true,
    isPublicEnabled: true,
    label: 'Tiếng Anh (en)',
  },
  {
    code: 'it',
    direction: 'ltr',
    fallbackLocale: 'en',
    isAdsReady: true,
    isCmsEnabled: true,
    isPublicEnabled: true,
    label: 'Tiếng Ý (it)',
  },
  {
    code: 'es',
    direction: 'ltr',
    fallbackLocale: 'en',
    isAdsReady: true,
    isCmsEnabled: true,
    isPublicEnabled: true,
    label: 'Tiếng Tây Ban Nha (es)',
  },
  {
    code: 'pt',
    direction: 'ltr',
    fallbackLocale: 'en',
    isAdsReady: true,
    isCmsEnabled: true,
    isPublicEnabled: true,
    label: 'Tiếng Bồ Đào Nha (pt)',
  },
  {
    code: 'ja',
    direction: 'ltr',
    fallbackLocale: 'en',
    isAdsReady: false,
    isCmsEnabled: true,
    isPublicEnabled: false,
    label: 'Tiếng Nhật (ja)',
  },
  {
    code: 'ko',
    direction: 'ltr',
    fallbackLocale: 'en',
    isAdsReady: false,
    isCmsEnabled: true,
    isPublicEnabled: false,
    label: 'Tiếng Hàn (ko)',
  },
  {
    code: 'fr',
    direction: 'ltr',
    fallbackLocale: 'en',
    isAdsReady: false,
    isCmsEnabled: true,
    isPublicEnabled: false,
    label: 'Tiếng Pháp (fr)',
  },
  {
    code: 'de',
    direction: 'ltr',
    fallbackLocale: 'en',
    isAdsReady: false,
    isCmsEnabled: true,
    isPublicEnabled: false,
    label: 'Tiếng Đức (de)',
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

/**
 * Payload appends the locale code to every non-code label in its native
 * selector. Keep the public/content labels unchanged and adapt only the
 * value crossing the Payload localization boundary.
 */
export const getPayloadLocaleLabel = (locale: Pick<LocaleMetadata, 'code' | 'label'>): string =>
  locale.label.endsWith(` (${locale.code})`)
    ? locale.label.slice(0, -` (${locale.code})`.length)
    : locale.label

export const isSupportedLocale = (value?: null | string): value is SupportedLocaleCode =>
  Boolean(value && localeCodes.includes(value as SupportedLocaleCode))

export const isPublicLocale = (value?: null | string): value is SupportedLocaleCode =>
  isSupportedLocale(value) && localeMetadataByCode[value].isPublicEnabled

export const getLocaleFallback = (locale?: null | string): SupportedLocaleCode =>
  isSupportedLocale(locale) ? localeMetadataByCode[locale].fallbackLocale : 'en'

export const isCopyLocale = (value?: null | string): value is CopyLocaleCode =>
  Boolean(value && copyLocaleCodes.includes(value as CopyLocaleCode))

export const getPublicLocaleMetadataForSite = (
  supportedLocales?: null | readonly string[],
): LocaleMetadata[] => {
  if (!supportedLocales?.length) {
    return []
  }

  const siteLocales = new Set(supportedLocales)

  return publicLocaleMetadata.filter((locale) => siteLocales.has(locale.code))
}

export const getCopyLocale = (locale?: null | string): CopyLocaleCode => {
  const fallbackLocale = getLocaleFallback(locale)

  return isCopyLocale(fallbackLocale) ? fallbackLocale : 'en'
}

export const localeSelectOptions = cmsEnabledLocaleMetadata.map((locale) => ({
  label: locale.label,
  value: locale.code,
}))
