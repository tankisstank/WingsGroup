import config from '@payload-config'
import { getPayload } from 'payload'

import { getCurrentSite } from '@/utilities/siteContext'
import { getCanonicalSiteOrigin } from '@/utilities/siteSEO'

export const dynamic = 'force-dynamic'

const xmlEscape = (value: string) =>
  value.replace(/[<>&'\"]/g, (character) => {
    const entities: Record<string, string> = {
      '"': '&quot;',
      '&': '&amp;',
      "'": '&apos;',
      '<': '&lt;',
      '>': '&gt;',
    }

    return entities[character] || character
  })

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
  const lastmod = site.updatedAt ? `<lastmod>${xmlEscape(site.updatedAt)}</lastmod>` : ''
  const sitemapEntries = ['pages-sitemap.xml', 'posts-sitemap.xml']
    .map(
      (pathname) =>
        `<sitemap><loc>${xmlEscape(`${origin}/${pathname}`)}</loc>${lastmod}</sitemap>`,
    )
    .join('')

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${sitemapEntries}</sitemapindex>`,
    {
      headers: {
        'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=60',
        'Content-Type': 'application/xml; charset=utf-8',
      },
    },
  )
}

