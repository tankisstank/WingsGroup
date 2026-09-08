import { getCurrentSiteSettings } from '@/utilities/getSiteSettings'
import { getCurrentSite } from '@/utilities/siteContext'
import { buildLlmsText } from '@/utilities/llms'
import { getCanonicalSiteOrigin } from '@/utilities/siteSEO'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const [site, settings] = await Promise.all([getCurrentSite(), getCurrentSiteSettings()])
  const origin = getCanonicalSiteOrigin({ requestOrigin: new URL(request.url).origin, settings, site })

  return new Response(buildLlmsText({ full: true, origin, settings, site }), {
    headers: {
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
      'Content-Type': 'text/markdown; charset=utf-8',
      Vary: 'Host',
    },
  })
}
