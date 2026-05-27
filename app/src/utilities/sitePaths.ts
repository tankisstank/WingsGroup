export const siteAliasToCodeMap = {
  wingstravel: 'wings-travel',
  wingsgo: 'wings-go',
  wingscare: 'wings-care',
  wingsinsurance: 'wings-insurance',
} as const

export type SiteAlias = keyof typeof siteAliasToCodeMap

export const siteCodeToAliasMap = Object.fromEntries(
  Object.entries(siteAliasToCodeMap).map(([alias, code]) => [code, alias]),
) as Record<string, string>

export const knownSiteAliases = Object.keys(siteAliasToCodeMap) as SiteAlias[]
export const supportedLocaleCodes = ['vi', 'en'] as const

export type SupportedLocaleCode = (typeof supportedLocaleCodes)[number]

export const isSupportedLocale = (value?: null | string): value is SupportedLocaleCode =>
  Boolean(value && supportedLocaleCodes.includes(value as SupportedLocaleCode))

export const getSiteAliasFromPathname = (pathname: string): SiteAlias | null => {
  const [firstSegment] = pathname.split('/').filter(Boolean)

  if (!firstSegment) {
    return null
  }

  return knownSiteAliases.includes(firstSegment as SiteAlias) ? (firstSegment as SiteAlias) : null
}

export const getLocaleFromPathname = (pathname: string): SupportedLocaleCode | null => {
  const segments = pathname.split('/').filter(Boolean)
  const localeCandidate = knownSiteAliases.includes(segments[0] as SiteAlias)
    ? segments[1]
    : segments[0]

  return isSupportedLocale(localeCandidate) ? localeCandidate : null
}

export const normalizeSiteAwarePath = (path: string): string => {
  if (!path) {
    return '/'
  }

  if (/^https?:\/\//.test(path)) {
    return path
  }

  return path.startsWith('/') ? path : `/${path}`
}

export const prefixPathWithSite = (
  path: string,
  siteAlias?: null | string,
  locale?: null | string,
): string => {
  const normalizedPath = normalizeSiteAwarePath(path)

  if (!siteAlias || /^https?:\/\//.test(normalizedPath)) {
    return normalizedPath
  }

  const localePrefix = isSupportedLocale(locale) ? `/${locale}` : ''
  const sitePrefix = `/${siteAlias}${localePrefix}`

  if (
    normalizedPath === '/' ||
    normalizedPath.startsWith('/admin') ||
    normalizedPath.startsWith('/api') ||
    normalizedPath.startsWith('/next')
  ) {
    return `${sitePrefix}${normalizedPath === '/' ? '' : normalizedPath}`
  }

  if (normalizedPath.startsWith(`/${siteAlias}`)) {
    return normalizedPath
  }

  return `${sitePrefix}${normalizedPath}`
}
