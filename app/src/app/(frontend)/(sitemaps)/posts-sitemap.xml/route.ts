import config from '@payload-config'
import { getServerSideSitemap } from 'next-sitemap'
import { getPayload } from 'payload'

import { getCurrentSite } from '@/utilities/siteContext'
import {
  getWingsGroupEditorialPostPath,
  isGovernedWingsGroupEditorialPost,
} from '@/utilities/wingsGroupEditorial'
import { getPostCanonicalPath } from '@/utilities/siteURLs'
import {
  getCanonicalSiteOrigin,
  getSiteSitemapLocales,
  getSiteSitemapURL,
} from '@/utilities/siteSEO'
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
  const isExactWingsGroupInventory = isWingsGroupV3ExactPublicInventoryEnabled({
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

  for (const locale of isExactWingsGroupInventory
    ? (['vi'] as const)
    : getSiteSitemapLocales(site)) {
    const results = await payload.find({
      collection: 'posts',
      overrideAccess: false,
      draft: false,
      depth: isExactWingsGroupInventory ? 1 : 0,
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
        _status: true,
        content: true,
        site: true,
        slug: true,
        title: true,
        updatedAt: true,
      },
    })

    sitemap.push(
      ...results.docs
        .filter(
          (post) =>
            Boolean(post?.slug) &&
            (!isExactWingsGroupInventory || isGovernedWingsGroupEditorialPost(post, site.id)),
        )
        .map((post) => ({
          loc: getSiteSitemapURL({
            defaultLocale: site.defaultLocale,
            locale,
            origin,
            path: isExactWingsGroupInventory
              ? getWingsGroupEditorialPostPath(post.slug)
              : getPostCanonicalPath(post.slug),
          }),
          lastmod: post.updatedAt || dateFallback,
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
