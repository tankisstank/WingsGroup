import type { Site } from '@/payload-types'

import configPromise from '@payload-config'
import { headers } from 'next/headers'
import { unstable_cache } from 'next/cache'
import { getPayload, type Where } from 'payload'
import { isSupportedLocale, type SupportedLocaleCode } from './sitePaths'

type SiteCacheResult = null | Site

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

const getCachedSiteByCode = (code: string) =>
  unstable_cache(async () => getSiteByCode(code), ['site', code], {
    tags: [`site_${code}`],
  })

export const getCurrentSite = async (siteCodeFromArgs?: string | null): Promise<SiteCacheResult> => {
  const requestHeaders = await headers()
  const siteCode = siteCodeFromArgs || requestHeaders.get('x-site-code')

  if (!siteCode) {
    return null
  }

  return getCachedSiteByCode(siteCode)()
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
