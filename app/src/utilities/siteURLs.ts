import type { Config, Media, Site, SiteSetting } from '@/payload-types'

import { getServerSideURL } from './getURL'
import { isSupportedLocale, type SupportedLocaleCode } from './sitePaths'

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '')

export const normalizeConfiguredCanonicalOrigin = (domain?: null | string): string => {
  const fallback = getServerSideURL()
  const rawDomain = domain || fallback
  const withProtocol = /^https?:\/\//.test(rawDomain) ? rawDomain : `https://${rawDomain}`

  return trimTrailingSlash(withProtocol)
}

export const normalizeCanonicalPath = (path?: null | string): string => {
  if (!path || path === 'home') {
    return '/'
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  return normalizedPath.replace(/\/+/g, '/')
}

export const prefixCanonicalPathWithLocale = (
  path?: null | string,
  locale?: null | string,
): string => {
  const normalizedPath = normalizeCanonicalPath(path)

  if (!isSupportedLocale(locale)) {
    return normalizedPath
  }

  if (locale === 'en') {
    return normalizedPath
  }

  return `/${locale}${normalizedPath === '/' ? '' : normalizedPath}`.replace(/\/+/g, '/')
}

export const buildConfiguredCanonicalURL = ({
  locale,
  path,
  settings,
}: {
  locale?: null | SupportedLocaleCode | string
  path?: null | string
  settings?: null | Pick<SiteSetting, 'seo'>
}) => {
  const baseURL = normalizeConfiguredCanonicalOrigin(settings?.seo?.canonicalDomain)
  const normalizedPath = prefixCanonicalPathWithLocale(path, locale)

  return `${baseURL}${normalizedPath === '/' ? '' : normalizedPath}`
}

export const buildConfiguredAbsoluteMediaURL = ({
  fallbackPath = '/website-template-OG.webp',
  media,
  settings,
}: {
  fallbackPath?: string
  media?: Config['db']['defaultIDType'] | Media | null
  settings?: null | Pick<SiteSetting, 'seo'>
}) => {
  const baseURL = normalizeConfiguredCanonicalOrigin(settings?.seo?.canonicalDomain)

  if (media && typeof media === 'object' && 'url' in media && media.url) {
    const mediaPath = media.sizes?.og?.url || media.url

    if (/^https?:\/\//i.test(mediaPath)) return mediaPath

    return `${baseURL}${mediaPath}`
  }

  return `${baseURL}${fallbackPath}`
}

type PagePathValue =
  | null
  | string
  | {
      pathname?: null | string
      slug?: null | string
    }

export const getPageCanonicalPath = (value?: PagePathValue, locale?: null | string) => {
  let path = '/'

  if (!value) {
    return prefixCanonicalPathWithLocale(path, locale)
  }

  if (typeof value === 'object') {
    if (value.pathname) {
      path = normalizeCanonicalPath(value.pathname)
      return prefixCanonicalPathWithLocale(path, locale)
    }

    if (!value.slug || value.slug === 'home') {
      return prefixCanonicalPathWithLocale(path, locale)
    }

    path = normalizeCanonicalPath(value.slug)
    return prefixCanonicalPathWithLocale(path, locale)
  }

  if (value === 'home') {
    return prefixCanonicalPathWithLocale(path, locale)
  }

  path = normalizeCanonicalPath(value)
  return prefixCanonicalPathWithLocale(path, locale)
}

export const getPostCanonicalPath = (slug?: null | string, locale?: null | string) => {
  const path = slug ? `/posts/${slug}` : '/posts'

  return prefixCanonicalPathWithLocale(path, locale)
}

export const getPostPath = (slug?: null | string) => {
  if (!slug) {
    return '/posts'
  }

  return `/posts/${slug}`
}

export const getTourProductPath = (slug?: null | string, locale?: null | string) => {
  const path = slug ? `/tour/${slug}` : '/tour'

  return prefixCanonicalPathWithLocale(path, locale)
}

export const getTourCampaignPath = (slug?: null | string, locale?: null | string) => {
  const path = slug ? `/campaign/${slug}` : '/campaign'

  return prefixCanonicalPathWithLocale(path, locale)
}

export const getSiteId = (site?: null | number | Site): number | null => {
  if (!site) {
    return null
  }

  return typeof site === 'number' ? site : site.id
}

export const getSiteSettingForSite = <T extends Pick<SiteSetting, 'site'>>(
  site?: null | number | Site,
  settingsBySiteId?: Map<number, T>,
): T | null => {
  const siteId = getSiteId(site)

  return siteId ? settingsBySiteId?.get(siteId) || null : null
}
