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

const supportedSiteCodes = new Set(['wings-group', 'wings-go'])

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
