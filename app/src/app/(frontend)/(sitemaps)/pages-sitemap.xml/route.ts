import { getServerSideSitemap } from 'next-sitemap'
import { getPayload } from 'payload'
import config from '@payload-config'
import { unstable_cache } from 'next/cache.js'
import { getCanonicalURL, getPageCanonicalPath, getSiteId, getSiteSettingForSite } from '@/utilities/siteURLs'
import { supportedLocaleCodes } from '@/utilities/sitePaths'

const getPagesSitemap = unstable_cache(
  async () => {
    const payload = await getPayload({ config })

    const dateFallback = new Date().toISOString()
    const sitemap = []

    for (const locale of supportedLocaleCodes) {
      const settings = await payload.find({
        collection: 'site-settings',
        depth: 1,
        limit: 1000,
        locale,
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

      sitemap.push(
        ...settings.docs.map((setting) => ({
          loc: getCanonicalURL({
            locale,
            path: '/posts',
            settings: setting,
          }),
          lastmod: setting.updatedAt || dateFallback,
        })),
      )

      const results = await payload.find({
        collection: 'pages',
        overrideAccess: false,
        draft: false,
        depth: 1,
        limit: 1000,
        locale,
        pagination: false,
        where: {
          _status: {
            equals: 'published',
          },
        },
        select: {
          slug: true,
          pathname: true,
          site: true,
          updatedAt: true,
        },
      })

      sitemap.push(
        ...results.docs
          .filter((page) => Boolean(page?.pathname || page?.slug))
          .map((page) => {
            const siteSettings = getSiteSettingForSite(page.site, settingsBySiteId)

            return {
              loc: getCanonicalURL({
                locale,
                path: getPageCanonicalPath(page),
                settings: siteSettings,
              }),
              lastmod: page.updatedAt || dateFallback,
            }
          }),
      )
    }

    return sitemap.filter(
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
