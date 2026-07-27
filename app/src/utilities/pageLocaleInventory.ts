import configPromise from '@payload-config'
import { getPayload } from 'payload'

import { getCurrentSite } from './siteContext'
import { isRuntimeResolvablePage } from './pageRuntimeResolvable'
import { getSiteSitemapLocales } from './siteSEO'
import type { SupportedLocaleCode } from './sitePaths'
import { hasMatchingWingSideTourWrapper } from '@/tours/wingsSideTourViewModel'

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
      select: {
        hero: true,
        layout: true,
        title: true,
      },
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

    if (
      await isRuntimeResolvablePage({
        getResolvedTourDetailBySlug: async ({ locale, slug }) => {
          const tourResult = await payload.find({
            collection: 'tour-products',
            depth: 0,
            draft: false,
            fallbackLocale: false,
            limit: 1,
            locale,
            overrideAccess: false,
            pagination: false,
            select: {
              wrapperPage: true,
            },
            where: {
              and: [
                { site: { equals: siteID } },
                { slug: { equals: slug } },
                { _status: { equals: 'published' } },
              ],
            },
          })
          const tour = tourResult.docs?.[0]

          return tour ? { tour } : null
        },
        hasMatchingWingSideTourWrapper,
        locale: candidateLocale,
        page: result.docs?.[0],
        pathname: normalizedPathname,
        siteCode: typeof site === 'object' ? site.code : undefined,
      })
    ) {
      publishedLocales.push(candidateLocale)
    }
  }

  return publishedLocales
}
