import config from '@payload-config'
import { getServerSideSitemap } from 'next-sitemap'
import { getPayload } from 'payload'

import { getCurrentSite } from '@/utilities/siteContext'
import { getPageCanonicalPath } from '@/utilities/siteURLs'
import { isRuntimeResolvablePage } from '@/utilities/pageRuntimeResolvable'
import {
  getCanonicalSiteOrigin,
  getSiteSitemapLocales,
  getSiteSitemapURL,
} from '@/utilities/siteSEO'
import { hasMatchingWingSideTourWrapper } from '@/tours/wingsSideTourViewModel'
import { isWingsGroupV3ExactPublicInventoryEnabled } from '@/wingsgroup/corporateRoutes'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const site = await getCurrentSite()

  if (!site) {
    return new Response('Not found', { status: 404 })
  }

  const payload = await getPayload({ config })
  const settings = await payload.find({
    collection: 'site-settings',
    depth: 0,
    limit: 1,
    pagination: false,
    where: {
      site: {
        equals: site.id,
      },
    },
  })
  const settingsDoc = settings.docs[0]
  const usesExactWingsGroupInventory = isWingsGroupV3ExactPublicInventoryEnabled({
    settings: settingsDoc,
    siteCode: site.code,
  })
  const origin = getCanonicalSiteOrigin({
    requestOrigin: new URL(request.url).origin,
    settings: settingsDoc,
    site,
  })
  const dateFallback = new Date().toISOString()
  const sitemap = []

  const sitemapLocales = usesExactWingsGroupInventory ? (['vi'] as const) : getSiteSitemapLocales(site)

  for (const locale of sitemapLocales) {
    if (!usesExactWingsGroupInventory) {
      sitemap.push({
        loc: getSiteSitemapURL({
          defaultLocale: site.defaultLocale,
          locale,
          origin,
          path: '/posts',
        }),
        lastmod: settingsDoc?.updatedAt || dateFallback,
      })
    }

    if (site.code === 'wing-side') {
      sitemap.push({
        loc: getSiteSitemapURL({
          defaultLocale: site.defaultLocale,
          locale,
          origin,
          path: '/journeys',
        }),
        lastmod: settingsDoc?.updatedAt || dateFallback,
      })
    }

    const results = await payload.find({
      collection: 'pages',
      overrideAccess: false,
      draft: false,
      depth: 0,
      fallbackLocale: false,
      limit: 1000,
      locale,
      pagination: false,
      where: {
        and: [
          {
            site: {
              equals: site.id,
            },
          },
          {
            _status: {
              equals: 'published',
            },
          },
        ],
      },
      select: {
        hero: true,
        layout: true,
        slug: true,
        pathname: true,
        title: true,
        updatedAt: true,
        wingsGroupRoute: true,
      },
    })
    const tourResults =
      site.code === 'wing-side'
        ? await payload.find({
            collection: 'tour-products',
            overrideAccess: false,
            draft: false,
            depth: 0,
            fallbackLocale: false,
            limit: 1000,
            locale,
            pagination: false,
            where: {
              and: [{ site: { equals: site.id } }, { _status: { equals: 'published' } }],
            },
            select: {
              slug: true,
              wrapperPage: true,
            },
          })
        : null
    const toursBySlug = new Map(
      (tourResults?.docs || []).flatMap((tour) =>
        typeof tour.slug === 'string' && tour.slug ? ([[tour.slug, tour]] as const) : [],
      ),
    )

    const resolvablePages = []
    for (const page of results.docs) {
      const path = getPageCanonicalPath(page)
      if (
        await isRuntimeResolvablePage({
          getResolvedTourDetailBySlug: async ({ slug }) => {
            const tour = toursBySlug.get(slug)
            return tour ? { tour } : null
          },
          hasMatchingWingSideTourWrapper,
          locale,
          page,
          pathname: path,
          settings: settingsDoc,
          siteCode: site.code,
        })
      ) {
        resolvablePages.push(page)
      }
    }

    sitemap.push(
      ...resolvablePages
        .filter((page) => Boolean(page?.pathname || page?.slug))
        .map((page) => ({
          loc: getSiteSitemapURL({
            defaultLocale: site.defaultLocale,
            locale,
            origin,
            path: getPageCanonicalPath(page),
          }),
          lastmod: page.updatedAt || dateFallback,
        })),
    )
  }

  return getServerSideSitemap(
    sitemap.filter(
      (entry, index, entries) =>
        entries.findIndex((candidate) => candidate.loc === entry.loc) === index,
    ),
  )
}
