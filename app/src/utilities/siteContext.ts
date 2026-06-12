import type { Site } from '@/payload-types'

import configPromise from '@payload-config'
import { headers } from 'next/headers'
import { getPayload, type Where } from 'payload'
import { defaultSiteCode, isSupportedLocale, type SupportedLocaleCode } from './sitePaths'

type SiteCacheResult = null | Site
const siteLookupCache = new Map<string, Promise<SiteCacheResult>>()
const activeSitesCache = new Map<string, Promise<Site[]>>()

const normalizeHost = (host?: null | string): string | null => {
  if (!host) {
    return null
  }

  const normalized = host.toLowerCase().split(':')[0]?.trim()

  return normalized || null
}

const domainCandidates = (domain?: null | string): string[] => {
  const normalized = normalizeHost(domain)

  if (!normalized) {
    return []
  }

  const candidates = [normalized]

  if (normalized.endsWith('.local')) {
    candidates.push(normalized.replace(/\.local$/, '.vn'))
  }

  return candidates
}

const getSiteByCode = async (code: string): Promise<SiteCacheResult> => {
  const payload = await getPayload({ config: configPromise })
  const result = await payload.find({
    collection: 'sites',
    depth: 0,
    limit: 1,
    pagination: false,
    where: {
      and: [
        {
          code: {
            equals: code,
          },
        },
        {
          isActive: {
            equals: true,
          },
        },
      ],
    },
  })

  return result.docs[0] || null
}

const getActiveSites = async (): Promise<Site[]> => {
  const payload = await getPayload({ config: configPromise })
  const result = await payload.find({
    collection: 'sites',
    depth: 0,
    limit: 100,
    pagination: false,
    where: {
      isActive: {
        equals: true,
      },
    },
  })

  return result.docs
}

const getMemoizedSiteByCode = (code: string): Promise<SiteCacheResult> => {
  const cached = siteLookupCache.get(code)

  if (cached) {
    return cached
  }

  const lookup = getSiteByCode(code).catch((error) => {
    siteLookupCache.delete(code)
    throw error
  })

  siteLookupCache.set(code, lookup)
  return lookup
}

const getMemoizedActiveSites = (): Promise<Site[]> => {
  const cacheKey = 'active-sites'
  const cached = activeSitesCache.get(cacheKey)

  if (cached) {
    return cached
  }

  const lookup = getActiveSites().catch((error) => {
    activeSitesCache.delete(cacheKey)
    throw error
  })

  activeSitesCache.set(cacheKey, lookup)
  return lookup
}

const getSiteByHost = async (host?: null | string): Promise<SiteCacheResult> => {
  const normalizedHost = normalizeHost(host)

  if (!normalizedHost || normalizedHost === 'localhost' || normalizedHost === '127.0.0.1') {
    return null
  }

  const sites = await getMemoizedActiveSites()

  return (
    sites.find((site) => {
      const domains = [
        ...domainCandidates(site.primaryDomain),
        ...((site.additionalDomains || []) as Array<{ domain?: null | string }>).flatMap(({ domain }) =>
          domainCandidates(domain),
        ),
      ]

      return domains.includes(normalizedHost)
    }) || null
  )
}

export const getCurrentSite = async (siteCodeFromArgs?: string | null): Promise<SiteCacheResult> => {
  const requestHeaders = await headers()
  const explicitSiteCode = siteCodeFromArgs || requestHeaders.get('x-site-code')

  if (explicitSiteCode) {
    return getMemoizedSiteByCode(explicitSiteCode)
  }

  const siteFromHost = await getSiteByHost(requestHeaders.get('host'))

  if (siteFromHost) {
    return siteFromHost
  }

  return getMemoizedSiteByCode(defaultSiteCode)
}

export const getCurrentSitePrefix = async (siteAliasFromArgs?: string | null): Promise<string> => {
  const requestHeaders = await headers()
  if (siteAliasFromArgs) {
    return `/${siteAliasFromArgs}`
  }

  return requestHeaders.get('x-site-prefix') || ''
}

export const getCurrentLocale = async (
  localeFromArgs?: string | null,
): Promise<SupportedLocaleCode> => {
  if (isSupportedLocale(localeFromArgs)) {
    return localeFromArgs
  }

  const requestHeaders = await headers()
  const headerLocale = requestHeaders.get('x-locale')

  if (isSupportedLocale(headerLocale)) {
    return headerLocale
  }

  const site = await getCurrentSite()

  return site?.defaultLocale || 'vi'
}

export const appendSiteWhere = async (
  where?: Where,
  siteCodeFromArgs?: string | null,
): Promise<Where | undefined> => {
  const site = await getCurrentSite(siteCodeFromArgs)

  if (!site) {
    return where
  }

  const siteConstraint: Where = {
    site: {
      equals: site.id,
    },
  }

  if (!where) {
    return siteConstraint
  }

  return {
    and: [siteConstraint, where],
  }
}
