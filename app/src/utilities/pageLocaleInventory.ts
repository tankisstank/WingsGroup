import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { getCurrentSite } from './siteContext'
import { getSiteSitemapLocales } from './siteSEO'
import type { SupportedLocaleCode } from './sitePaths'

type PayloadLike = Pick<Awaited<ReturnType<typeof getPayload>>, 'find'>

const normalizePathname = (pathname: string): string => {
  if (!pathname || pathname === '/') return '/'
  return pathname.startsWith('/') ? pathname.replace(/\/+$/, '') || '/' : `/${pathname}`
}

export const queryPublishedPageLocalesByExactPath = async ({
  payload: payloadOverride,
  requestedPath,
}: {
  payload?: PayloadLike
  requestedPath: string
}): Promise<SupportedLocaleCode[]> => {
  const payload = payloadOverride || (await getPayload({ config: configPromise }))
  const site = await getCurrentSite()
  const locales = getSiteSitemapLocales(site)
  const normalizedPathname = normalizePathname(requestedPath)
  const siteID = typeof site === 'object' && site ? site.id : site
  const publishedLocales: SupportedLocaleCode[] = []

  for (const candidateLocale of locales) {
    const result = await payload.find({
      collection: 'pages',
      depth: 0,
      draft: false,
      fallbackLocale: false,
      limit: 1,
      locale: candidateLocale,
      overrideAccess: false,
      pagination: false,
      where: {
        and: [
          {
            site: {
              equals: siteID,
            },
          },
          {
            pathname: {
              equals: normalizedPathname,
            },
          },
          {
            _status: {
              equals: 'published',
            },
          },
        ],
      },
    })

    if (result.docs?.[0]) {
      publishedLocales.push(candidateLocale)
    }
  }

  return publishedLocales
}
