import type { Site, SiteSetting } from '@/payload-types'

import { domainCandidates, normalizeHost } from './siteDomains'
import { isPublicLocale, type SupportedLocaleCode } from './sitePaths'
import { prefixCanonicalPathWithLocale } from './siteURLs'

const nonPublicHostPatterns = [
  /^localhost$/,
  /^127(?:\.\d{1,3}){3}$/,
  /^0\.0\.0\.0$/,
  /^\[?::1\]?$/,
  /(^|\.)example\.(?:com|net|org)$/,
  /\.invalid$/,
  /\.local$/,
]

export const isPublicSEOHost = (host?: null | string): boolean => {
  const normalized = normalizeHost(host)

  return Boolean(normalized && !nonPublicHostPatterns.some((pattern) => pattern.test(normalized)))
}

const parseOrigin = (value?: null | string): URL | null => {
  if (!value) {
    return null
  }

  const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`

  try {
    return new URL(candidate)
  } catch {
    return null
  }
}

const getPublicSiteHosts = (site: Pick<Site, 'additionalDomains' | 'primaryDomain'>) => {
  const hosts = new Set<string>()
  const domains = [
    site.primaryDomain,
    ...((site.additionalDomains || []) as Array<{ domain?: null | string }>).map(
      ({ domain }) => domain,
    ),
  ]

  for (const domain of domains) {
    for (const candidate of domainCandidates(domain)) {
      if (isPublicSEOHost(candidate)) {
        hosts.add(candidate)
      }
    }
  }

  return hosts
}

export const getCanonicalSiteOrigin = ({
  allowLocalRequestOrigin = process.env.NODE_ENV !== 'production',
  requestOrigin,
  settings,
  site,
}: {
  allowLocalRequestOrigin?: boolean
  requestOrigin?: null | string
  settings?: null | Pick<SiteSetting, 'seo'>
  site: Pick<Site, 'additionalDomains' | 'primaryDomain'>
}): string => {
  const publicSiteHosts = getPublicSiteHosts(site)
  const configuredOrigin = parseOrigin(settings?.seo?.canonicalDomain)
  const configuredHost = normalizeHost(configuredOrigin?.hostname)

  if (configuredOrigin && configuredHost && publicSiteHosts.has(configuredHost)) {
    return `https://${configuredHost}`
  }

  const primaryPublicHost = [...publicSiteHosts][0]

  if (primaryPublicHost) {
    return `https://${primaryPublicHost}`
  }

  const localOrigin = parseOrigin(requestOrigin)

  if (allowLocalRequestOrigin && localOrigin && !isPublicSEOHost(localOrigin.hostname)) {
    return localOrigin.origin
  }

  throw new Error('No safe canonical origin is configured for the current site')
}

export const getSiteSitemapLocales = (
  site: Pick<Site, 'defaultLocale' | 'supportedLocales'>,
): SupportedLocaleCode[] => {
  const locales = new Set(
    (site.supportedLocales || []).filter(isPublicLocale) as SupportedLocaleCode[],
  )

  if (isPublicLocale(site.defaultLocale)) {
    locales.add(site.defaultLocale)
  }

  return [...locales]
}

export const getSiteSitemapURL = ({
  defaultLocale = 'en',
  locale,
  origin,
  path,
}: {
  defaultLocale?: null | SupportedLocaleCode
  locale?: null | SupportedLocaleCode
  origin: string
  path?: null | string
}): string => {
  const normalizedPath = prefixCanonicalPathWithLocale(path, null)
  const localizedPath =
    !locale || locale === defaultLocale
      ? normalizedPath
      : `/${locale}${normalizedPath === '/' ? '' : normalizedPath}`.replace(/\/+/g, '/')

  return `${origin}${localizedPath === '/' ? '' : localizedPath}`
}
