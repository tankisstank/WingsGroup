import { getServerSideSitemap } from 'next-sitemap'
import { getPayload } from 'payload'
import config from '@payload-config'
import { unstable_cache } from 'next/cache'
import { getCanonicalURL, getPageCanonicalPath, getSiteId, getSiteSettingForSite } from '@/utilities/siteURLs'

const getPagesSitemap = unstable_cache(
  async () => {
    const payload = await getPayload({ config })

    const settings = await payload.find({
      collection: 'site-settings',
      depth: 1,
      limit: 1000,
      pagination: false,
    })

    const settingsBySiteId = new Map(
      settings.docs
        .map((setting) => {
          const siteId = getSiteId(setting.site)

          return siteId ? ([siteId, setting] as const) : null
        })
        .filter((entry): entry is readonly [number, (typeof settings.docs)[number]] =>
          Boolean(entry),
        ),
    )

    const results = await payload.find({
      collection: 'pages',
      overrideAccess: false,
      draft: false,
      depth: 1,
      limit: 1000,
      pagination: false,
      where: {
        _status: {
          equals: 'published',
        },
      },
      select: {
        slug: true,
        site: true,
        updatedAt: true,
      },
    })

    const dateFallback = new Date().toISOString()

    const archiveSitemap = settings.docs.map((setting) => ({
      loc: getCanonicalURL({ path: '/posts', settings: setting }),
      lastmod: setting.updatedAt || dateFallback,
    }))

    const pageSitemap = results.docs
      .filter((page) => Boolean(page?.slug))
      .map((page) => {
        const siteSettings = getSiteSettingForSite(page.site, settingsBySiteId)

        return {
          loc: getCanonicalURL({
            path: getPageCanonicalPath(page.slug),
            settings: siteSettings,
          }),
          lastmod: page.updatedAt || dateFallback,
        }
      })

    return [
      ...archiveSitemap,
      ...pageSitemap,
    ].filter(
      (entry, index, entries) => entries.findIndex((candidate) => candidate.loc === entry.loc) === index,
    )
  },
  ['pages-sitemap'],
  {
    tags: ['pages-sitemap'],
  },
)

export async function GET() {
  const sitemap = await getPagesSitemap()

  return getServerSideSitemap(sitemap)
}
