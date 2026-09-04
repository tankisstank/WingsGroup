import type { SupportedLocaleCode } from './sitePaths'

export const sharedZaloOa = {
  key: 'zalo',
  label: 'Zalo OA',
  displayName: 'Wingsgroup - Vietwings Travel',
  href: 'https://zalo.me/4142059657526524531',
  owner: 'WingsGroup Sales',
  sla: {
    en: 'Reply within 1 business day',
    vi: 'Phản hồi trong 1 ngày làm việc',
  },
} as const

// Child sites use the shared bottom-right contact FAB; do not expose Zalo in their top navigation.
const supportedSiteCodes = new Set(['wings-group'])

export const getSharedZaloCTA = (
  siteCode?: null | string,
  locale?: null | SupportedLocaleCode | string,
) => {
  if (!siteCode || !supportedSiteCodes.has(siteCode)) return null

  const resolvedLocale = locale === 'vi' ? 'vi' : 'en'
  return {
    ...sharedZaloOa,
    ariaLabel: resolvedLocale === 'vi' ? 'Mở Zalo OA' : 'Open Zalo OA',
    label: sharedZaloOa.label,
  }
}
