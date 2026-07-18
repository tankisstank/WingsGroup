import config from '@payload-config'
import { getServerSideSitemap } from 'next-sitemap'
import { getPayload } from 'payload'

import { getCurrentSite } from '@/utilities/siteContext'
import { getPageCanonicalPath } from '@/utilities/siteURLs'
import {
  getCanonicalSiteOrigin,
  getSiteSitemapLocales,
  getSiteSitemapURL,
} from '@/utilities/siteSEO'

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
  const origin = getCanonicalSiteOrigin({
    requestOrigin: new URL(request.url).origin,
    settings: settings.docs[0],
    site,
  })
  const dateFallback = new Date().toISOString()
  const sitemap = []

  for (const locale of getSiteSitemapLocales(site)) {
    sitemap.push({
      loc: getSiteSitemapURL({ locale, origin, path: '/posts' }),
      lastmod: settings.docs[0]?.updatedAt || dateFallback,
    })

    const results = await payload.find({
      collection: 'pages',
      overrideAccess: false,
      draft: false,
      depth: 0,
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
        slug: true,
        pathname: true,
        updatedAt: true,
      },
    })

    sitemap.push(
      ...results.docs
        .filter((page) => Boolean(page?.pathname || page?.slug))
        .map((page) => ({
          loc: getSiteSitemapURL({
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
