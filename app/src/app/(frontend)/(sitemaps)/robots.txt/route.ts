import config from '@payload-config'
import { getPayload } from 'payload'

import { getCurrentSite } from '@/utilities/siteContext'
import { getCanonicalSiteOrigin } from '@/utilities/siteSEO'

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

  const body = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin/',
    'Disallow: /api/users/',
    'Disallow: /api/form-submissions/',
    'Disallow: /api/payload-preferences/',
    'Disallow: /next/',
    `Host: ${new URL(origin).host}`,
    `Sitemap: ${origin}/sitemap.xml`,
    '',
  ].join('\n')

  return new Response(body, {
    headers: {
      'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=60',
      'Content-Type': 'text/plain; charset=utf-8',
    },
  })
}

