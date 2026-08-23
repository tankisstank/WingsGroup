import configPromise from '@payload-config'
import { getPayload } from 'payload'

import type { Post } from '@/payload-types'
import { getCurrentSite } from '@/utilities/siteContext'
import type { SupportedLocaleCode } from '@/utilities/sitePaths'

export const WINGSGROUP_EDITORIAL_ARCHIVE_PATH = '/tin-tuc' as const

export const getWingsGroupEditorialPostPath = (slug?: null | string): string =>
  slug ? `${WINGSGROUP_EDITORIAL_ARCHIVE_PATH}/${slug}` : WINGSGROUP_EDITORIAL_ARCHIVE_PATH

const relationID = (value: unknown): number | string | null =>
  value && typeof value === 'object' && 'id' in value
    ? ((value as { id?: number | string | null }).id ?? null)
    : typeof value === 'number' || typeof value === 'string'
      ? value
      : null

export const isGovernedWingsGroupEditorialPost = (
  post:
    | {
        _status?: unknown
        content?: unknown
        site?: unknown
        slug?: unknown
        title?: unknown
      }
    | null
    | undefined,
  siteID: number | string,
): boolean =>
  Boolean(
    post &&
    post._status === 'published' &&
    String(relationID(post.site)) === String(siteID) &&
    typeof post.slug === 'string' &&
    post.slug.trim() &&
    typeof post.title === 'string' &&
    post.title.trim() &&
    post.content,
  )

export const getGovernedEditorialAuthorNames = (post: Pick<Post, 'populatedAuthors'>): string[] =>
  (post.populatedAuthors || [])
    .map((author) => (typeof author?.name === 'string' ? author.name.trim() : ''))
    .filter(Boolean)

type QueryArgs = {
  draft?: boolean
  locale: SupportedLocaleCode
  slug?: string
}

export const queryWingsGroupEditorialPosts = async ({
  draft = false,
  locale,
  slug,
}: QueryArgs): Promise<Post[]> => {
  const site = await getCurrentSite()
  if (site.code !== 'wings-group') return []

  const payload = await getPayload({ config: configPromise })
  const result = await payload.find({
    collection: 'posts',
    depth: 1,
    draft,
    fallbackLocale: false,
    limit: slug ? 1 : 12,
    locale,
    overrideAccess: draft,
    pagination: false,
    sort: '-publishedAt',
    where: {
      and: [
        { site: { equals: site.id } },
        { _status: { equals: 'published' } },
        ...(slug ? [{ slug: { equals: slug } }] : []),
      ],
    },
  })

  return result.docs.filter((post) => isGovernedWingsGroupEditorialPost(post, site.id))
}
