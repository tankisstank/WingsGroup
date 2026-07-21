import { getCopyLocale, type CopyLocaleCode, type SupportedLocaleCode } from './locales'

export type HeaderPrimaryAction = {
  label: string
  url: string
}

type HeaderPrimaryActionMap = Record<CopyLocaleCode, HeaderPrimaryAction> &
  Partial<Record<SupportedLocaleCode, HeaderPrimaryAction>>

const defaultHeaderPrimaryActions: HeaderPrimaryActionMap = {
  en: { label: 'Contact', url: '/lien-he' },
  vi: { label: 'Liên hệ', url: '/lien-he' },
}

export const headerPrimaryActionsByThemeKey: Record<string, HeaderPrimaryActionMap> = {
  'wings-care': {
    en: { label: 'Contact', url: '/contact' },
    vi: { label: 'Liên hệ', url: '/contact' },
  },
  'wings-go': {
    en: { label: 'Reserve', url: '/lien-he' },
    vi: { label: 'Giữ chỗ', url: '/lien-he' },
  },
  'wings-group': defaultHeaderPrimaryActions,
  'wings-pass': {
    en: { label: 'Book service', url: '/contact' },
    vi: { label: 'Đặt dịch vụ', url: '/contact' },
  },
  'wings-plus': {
    en: { label: 'Request proposal', url: '/request-proposal' },
    vi: { label: 'Gửi yêu cầu', url: '/request-proposal' },
  },
  'wings-side': {
    en: { label: 'Plan trip', url: '/plan-your-trip' },
    es: { label: 'Planifica', url: '/plan-your-trip' },
    it: { label: 'Pianifica', url: '/plan-your-trip' },
    pt: { label: 'Planear', url: '/plan-your-trip' },
    vi: { label: 'Lên kế hoạch', url: '/plan-your-trip' },
  },
}

export const resolveHeaderPrimaryAction = (
  themeKey: null | string | undefined,
  locale?: null | string,
): HeaderPrimaryAction => {
  const resolvedCopyLocale = getCopyLocale(locale)
  const actionMap =
    (themeKey && headerPrimaryActionsByThemeKey[themeKey]) || defaultHeaderPrimaryActions

  return actionMap[locale as SupportedLocaleCode] || actionMap[resolvedCopyLocale]
}
