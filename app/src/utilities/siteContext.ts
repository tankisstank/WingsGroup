import type { Site } from '@/payload-types'

import configPromise from '@payload-config'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { getPayload, type Where } from 'payload'
import { domainCandidates } from './siteDomains'
import {
  getSharedCachedValue,
} from '@/infrastructure/cache/sharedCache'
import { invalidateSitesCache } from '@/infrastructure/cache/tenantCache'
import {
  allSiteAliasToCodeMap,
  defaultSiteCode,
  isSupportedLocale,
  type SupportedLocaleCode,
} from './sitePaths'

type SiteCacheResult = null | Site
const allowedRouteSiteCodes = new Set<string>(Object.values(allSiteAliasToCodeMap))

export const invalidateSiteContextCache = (): Promise<void> => {
  return invalidateSitesCache()
}

const getSiteByCode = async (code: string): Promise<SiteCacheResult> => {
  const payload = await getPayload({ config: configPromise })
  const result = await payload.find({
    collection: 'sites',
    depth: 0,
    limit: 1,
    // Server-only tenant-directory lookup. The site code is restricted to the
    // local registry before this call and never comes from an untrusted header.
    overrideAccess: true,
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
    // Server-only host resolution must inspect active tenant domains while the
    // Sites collection itself remains non-enumerable to anonymous callers.
    overrideAccess: true,
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
  if (!allowedRouteSiteCodes.has(code)) {
    return Promise.resolve(null)
  }

  return getSharedCachedValue({
    load: () => getSiteByCode(code),
    namespace: 'sites',
    tenant: code,
    variant: 'active',
  })
}

const getMemoizedActiveSites = (): Promise<Site[]> => {
  return getSharedCachedValue({
    load: getActiveSites,
    namespace: 'sites',
    tenant: 'directory',
    variant: 'active',
  })
}

const getSiteByHosts = async (hosts: string[]): Promise<SiteCacheResult> => {
  const eligibleHosts = hosts.filter((host) => host !== 'localhost' && host !== '127.0.0.1')

  if (eligibleHosts.length === 0) {
    return null
  }

  const sites = await getMemoizedActiveSites()

  return (
    sites.find((site) => {
      const domains = [
        ...domainCandidates(site.primaryDomain),
        ...((site.additionalDomains || []) as Array<{ domain?: null | string }>).flatMap(
          ({ domain }) => domainCandidates(domain),
        ),
      ]

      return domains.some((domain) => eligibleHosts.includes(domain))
    }) || null
  )
}

const isLocalBootstrapHost = (host?: null | string): boolean =>
  !host || host === 'localhost' || host === '127.0.0.1' || host === '::1'

export const getCurrentSite = async (): Promise<Site> => {
  const requestHeaders = await headers()
  const hasTrustedProxyContext = requestHeaders.get('x-site-context-source') === 'proxy'
  const routeSiteCode = hasTrustedProxyContext ? requestHeaders.get('x-site-code') : null
  const requestHost = hasTrustedProxyContext ? requestHeaders.get('x-site-host') : null
  const isLocalBootstrapRequest =
    process.env.NODE_ENV !== 'production' && isLocalBootstrapHost(requestHost)

  // Path aliases are a local-development routing convenience only. On deployed
  // hosts, the domain is authoritative and a mismatched alias must never switch
  // tenants.
  if (isLocalBootstrapRequest && routeSiteCode && allowedRouteSiteCodes.has(routeSiteCode)) {
    const site = await getMemoizedSiteByCode(routeSiteCode)
    if (site) return site
    notFound()
  }

  const siteFromHost = requestHost ? await getSiteByHosts([requestHost]) : null

  if (siteFromHost) {
    if (routeSiteCode && routeSiteCode !== siteFromHost.code) {
      notFound()
    }

    return siteFromHost
  }

  if (isLocalBootstrapRequest) {
    const defaultSite = await getMemoizedSiteByCode(defaultSiteCode)
    if (defaultSite) return defaultSite
  }

  notFound()
}

export const getCurrentSitePrefix = async (): Promise<string> => {
  const requestHeaders = await headers()

  return requestHeaders.get('x-site-context-source') === 'proxy'
    ? requestHeaders.get('x-site-prefix') || ''
    : ''
}

export const getCurrentPublicPathname = async (): Promise<string> => {
  const requestHeaders = await headers()

  return requestHeaders.get('x-public-path') || '/'
}

export const getCurrentLocale = async (): Promise<SupportedLocaleCode> => {
  const requestHeaders = await headers()
  const headerLocale =
    requestHeaders.get('x-site-context-source') === 'proxy'
      ? requestHeaders.get('x-locale')
      : null

  if (isSupportedLocale(headerLocale)) {
    return headerLocale
  }

  const site = await getCurrentSite()

  if (
    site?.code === 'wing-side' &&
    requestHeaders.get('x-site-context-source') === 'proxy' &&
    isSupportedLocale('en')
  ) {
    return 'en'
  }

  return site?.defaultLocale || 'vi'
}

export const appendSiteWhere = async (
  where?: Where,
): Promise<Where> => {
  const site = await getCurrentSite()

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
