import { getServerSideSitemap } from 'next-sitemap'
import { getPayload } from 'payload'
import config from '@payload-config'
import { unstable_cache } from 'next/cache'
import { getCanonicalURL, getPostCanonicalPath, getSiteId, getSiteSettingForSite } from '@/utilities/siteURLs'

const getPostsSitemap = unstable_cache(
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
      collection: 'posts',
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

    const sitemap = results.docs
      .filter((post) => Boolean(post?.slug))
      .map((post) => {
        const siteSettings = getSiteSettingForSite(post.site, settingsBySiteId)

        return {
          loc: getCanonicalURL({
            path: getPostCanonicalPath(post.slug),
            settings: siteSettings,
          }),
          lastmod: post.updatedAt || dateFallback,
        }
      })

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
