export const siteAliasToCodeMap = {
  wingsgroup: 'wings-group',
  wingsgo: 'wings-go',
  'wing-side': 'wing-side',
  wingspass: 'wings-pass',
  wingsplus: 'wings-plus',
  wingscare: 'wings-care',
} as const

export type SiteAlias = keyof typeof siteAliasToCodeMap

export const legacySiteAliasToCodeMap = {
  wingstravel: 'wings-group',
  wingsside: 'wing-side',
} as const

export const legacySiteAliasRedirectMap = {
  wingsside: 'wing-side',
} as const

export const allSiteAliasToCodeMap = {
  ...siteAliasToCodeMap,
  ...legacySiteAliasToCodeMap,
} as const

export const defaultSiteAlias = 'wingsgroup' as const
export const defaultSiteCode = siteAliasToCodeMap[defaultSiteAlias]

export type SiteRouteAlias = keyof typeof allSiteAliasToCodeMap

export const siteCodeToAliasMap = Object.fromEntries(
  Object.entries(siteAliasToCodeMap).map(([alias, code]) => [code, alias]),
) as Record<string, SiteAlias>

export const knownSiteAliases = Object.keys(allSiteAliasToCodeMap) as SiteRouteAlias[]

export {
  cmsEnabledLocaleCodes as supportedLocaleCodes,
  isPublicLocale,
  isSupportedLocale,
  publicLocaleCodes,
  type SupportedLocaleCode,
} from './locales'

import { isSupportedLocale, type SupportedLocaleCode } from './locales'

const nonSiteAwareHrefPatterns = [
  /^https?:\/\//i,
  /^mailto:/i,
  /^tel:/i,
  /^javascript:/i,
  /^#/,
] as const

const isNonSiteAwareHref = (value: string) =>
  nonSiteAwareHrefPatterns.some((pattern) => pattern.test(value))

const splitPathSuffix = (value: string) => {
  const queryIndex = value.indexOf('?')
  const hashIndex = value.indexOf('#')
  const suffixIndexCandidates = [queryIndex, hashIndex].filter((index) => index >= 0)
  const suffixIndex = suffixIndexCandidates.length > 0 ? Math.min(...suffixIndexCandidates) : -1

  return suffixIndex >= 0
    ? {
        pathname: value.slice(0, suffixIndex) || '/',
        suffix: value.slice(suffixIndex),
      }
    : {
        pathname: value,
        suffix: '',
      }
}

export const getSiteAliasFromPathname = (pathname: string): SiteRouteAlias | null => {
  const [firstSegment] = pathname.split('/').filter(Boolean)

  if (!firstSegment) {
    return null
  }

  return knownSiteAliases.includes(firstSegment as SiteRouteAlias)
    ? (firstSegment as SiteRouteAlias)
    : null
}

export const getLocaleFromPathname = (pathname: string): SupportedLocaleCode | null => {
  const segments = pathname.split('/').filter(Boolean)
  const localeCandidate = knownSiteAliases.includes(segments[0] as SiteRouteAlias)
    ? segments[1]
    : segments[0]

  return isSupportedLocale(localeCandidate) ? localeCandidate : null
}

/**
 * Returns the route inside a site's public content tree.
 *
 * Middleware-facing pathnames can contain a local site alias and/or a locale
 * prefix. UI styling should not have to repeat those routing permutations, so
 * layouts expose this normalized identity once through `data-public-route`.
 */
export const getPublicRoutePathname = (pathname: string): string => {
  const { pathname: pathnameWithoutSuffix } = splitPathSuffix(normalizeSiteAwarePath(pathname))
  const segments = pathnameWithoutSuffix.split('/').filter(Boolean)

  if (knownSiteAliases.includes(segments[0] as SiteRouteAlias)) {
    segments.shift()
  }

  if (isSupportedLocale(segments[0])) {
    segments.shift()
  }

  return segments.length > 0 ? `/${segments.join('/')}` : '/'
}

export const normalizeSiteAwarePath = (path: string): string => {
  if (!path) {
    return '/'
  }

  if (isNonSiteAwareHref(path)) {
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

  if (isNonSiteAwareHref(normalizedPath)) {
    return normalizedPath
  }

  const { pathname, suffix } = splitPathSuffix(normalizedPath)

  if (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/next')
  ) {
    return normalizedPath
  }

  const localePrefix = isSupportedLocale(locale) ? `/${locale}` : ''
  const sitePrefix = siteAlias ? `/${siteAlias}${localePrefix}` : localePrefix

  if (!sitePrefix) {
    return normalizedPath
  }

  if (
    pathname === sitePrefix ||
    pathname.startsWith(`${sitePrefix}/`) ||
    (siteAlias && pathname.startsWith(`/${siteAlias}`))
  ) {
    return normalizedPath
  }

  const normalizedSegments = pathname.split('/').filter(Boolean)
  const leadingLocale = normalizedSegments[0]

  if (siteAlias && isSupportedLocale(leadingLocale)) {
    return `/${siteAlias}${pathname}`.replace(/\/+/g, '/') + suffix
  }

  return `${sitePrefix}${pathname === '/' ? '' : pathname}` + suffix
}

export const buildLocaleSwitchHref = (
  pathname: string,
  targetLocale: SupportedLocaleCode,
  defaultLocale?: SupportedLocaleCode,
): string => {
  const { pathname: rawPathname, suffix } = splitPathSuffix(pathname)
  const normalizedPathname = normalizeSiteAwarePath(rawPathname)

  if (isNonSiteAwareHref(normalizedPathname)) {
    return normalizedPathname
  }

  const siteAlias = getSiteAliasFromPathname(normalizedPathname)
  const currentLocale = getLocaleFromPathname(normalizedPathname)
  const segments = normalizedPathname.split('/').filter(Boolean)
  const restSegments = siteAlias ? segments.slice(1) : segments
  const pathWithoutLocale =
    currentLocale && restSegments[0] === currentLocale ? restSegments.slice(1) : restSegments
  const sitePrefix = siteAlias ? `/${siteAlias}` : ''
  const restPath = pathWithoutLocale.length > 0 ? `/${pathWithoutLocale.join('/')}` : ''

  if (targetLocale === defaultLocale) {
    return `${sitePrefix}${restPath || '/'}`.replace(/\/+/g, '/') + suffix
  }

  return `${sitePrefix}/${targetLocale}${restPath}`.replace(/\/+/g, '/') + suffix
}
