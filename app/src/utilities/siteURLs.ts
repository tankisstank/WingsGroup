import type { Site, SiteSetting } from '@/payload-types'

import { getServerSideURL } from './getURL'

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '')

export const normalizeCanonicalDomain = (domain?: null | string): string => {
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

export const getCanonicalURL = ({
  path,
  settings,
}: {
  path?: null | string
  settings?: null | Pick<SiteSetting, 'seo'>
}) => {
  const baseURL = normalizeCanonicalDomain(settings?.seo?.canonicalDomain)
  const normalizedPath = normalizeCanonicalPath(path)

  return `${baseURL}${normalizedPath === '/' ? '' : normalizedPath}`
}

export const getPageCanonicalPath = (slug?: null | string) => {
  if (!slug || slug === 'home') {
    return '/'
  }

  return `/${slug}`
}

export const getPostCanonicalPath = (slug?: null | string) => {
  if (!slug) {
    return '/posts'
  }

  return `/posts/${slug}`
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
