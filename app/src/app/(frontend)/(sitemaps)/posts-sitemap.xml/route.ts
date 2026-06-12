import { getServerSideSitemap } from 'next-sitemap'
import { getPayload } from 'payload'
import config from '@payload-config'
import { unstable_cache } from 'next/cache.js'
import { getCanonicalURL, getPostCanonicalPath, getSiteId, getSiteSettingForSite } from '@/utilities/siteURLs'
import { supportedLocaleCodes } from '@/utilities/sitePaths'

const getPostsSitemap = unstable_cache(
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

      const results = await payload.find({
        collection: 'posts',
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
          site: true,
          updatedAt: true,
        },
      })

      sitemap.push(
        ...results.docs
          .filter((post) => Boolean(post?.slug))
          .map((post) => {
            const siteSettings = getSiteSettingForSite(post.site, settingsBySiteId)

            return {
              loc: getCanonicalURL({
                locale,
                path: getPostCanonicalPath(post.slug),
                settings: siteSettings,
              }),
              lastmod: post.updatedAt || dateFallback,
            }
          }),
      )
    }

    return sitemap.filter(
      (entry, index, entries) => entries.findIndex((candidate) => candidate.loc === entry.loc) === index,
    )
  },
  ['posts-sitemap'],
  {
    tags: ['posts-sitemap'],
  },
)

export async function GET() {
  const sitemap = await getPostsSitemap()

  return getServerSideSitemap(sitemap)
}
