import config from '@payload-config'
import { headers } from 'next/headers'
import { createLocalReq, getPayload } from 'payload'

import type { Page, Post, Site } from '@/payload-types'
import {
  getPageCanonicalPath,
  getPostCanonicalPath,
  getPostPath,
  normalizeCanonicalPath,
} from '@/utilities/siteURLs'
import { getProductionPreviewOrigin } from '@/utilities/previewOrigin'
import { isPublicLocale, type SupportedLocaleCode, siteCodeToAliasMap } from '@/utilities/sitePaths'
import { loadCollection } from '@/utilities/siteReviewCollection'

type ReviewItem = {
  canonicalPath: string
  editPath: string
  id: number | string
  label: string
  locale: SupportedLocaleCode
  path: string
  previewOrigin?: string
  previewPath: string
  publicPath: string
  siteCode: string
  status?: string
  type: 'page' | 'post'
  updatedAt?: string
}

type ReviewSite = {
  children: ReviewItem[]
  code: string
  id: number | string
  label: string
  pathPrefix: string
}

type SourceName = 'pages' | 'posts' | 'sites'
type SourceState = 'error' | 'ready'

const getRelationID = (value: number | string | Site | null | undefined) => {
  if (value === null || value === undefined) return null
  return typeof value === 'object' ? value.id : value
}

const getReviewLocale = (site: Pick<Site, 'defaultLocale' | 'supportedLocales'>) => {
  if (isPublicLocale(site.defaultLocale) && site.supportedLocales.includes(site.defaultLocale)) {
    return site.defaultLocale
  }

  return (
    site.supportedLocales.find((locale): locale is SupportedLocaleCode => isPublicLocale(locale)) ||
    null
  )
}

const buildPreviewPath = ({
  canonicalPath,
  collection,
  documentID,
  locale,
}: {
  canonicalPath: string
  collection: 'pages' | 'posts'
  documentID: number | string
  locale: SupportedLocaleCode
}) => {
  const params = new URLSearchParams({
    collection,
    id: String(documentID),
    locale,
    path: canonicalPath,
  })

  return `/next/preview?${params.toString()}`
}

const getSitePathPrefix = (site?: Pick<Site, 'code'> | null) => {
  const alias = site?.code ? siteCodeToAliasMap[site.code] : undefined

  if (!alias || alias === 'wingsgroup') {
    return '/'
  }

  return `/${alias}`
}

const withSitePrefix = (site?: Pick<Site, 'code'> | null, path = '/') => {
  const prefix = getSitePathPrefix(site)
  const normalizedPath = normalizeCanonicalPath(path)

  if (prefix === '/') {
    return normalizedPath
  }

  return `${prefix}${normalizedPath === '/' ? '' : normalizedPath}`.replace(/\/+/g, '/')
}

const getTitle = (value: unknown, fallback: string) => {
  if (typeof value === 'string' && value.trim()) {
    return value
  }

  return fallback
}

const getStatus = (doc: { _status?: unknown }) =>
  typeof doc._status === 'string' ? doc._status : undefined

export async function GET(): Promise<Response> {
  try {
    const payload = await getPayload({ config })
    const requestHeaders = await headers()
    const { user } = await payload.auth({ headers: requestHeaders })

    if (!user) {
      return Response.json({ message: 'Bạn cần đăng nhập để xem site review.' }, { status: 401 })
    }

    const req = await createLocalReq({ user }, payload)
    const [siteResult, pageResult, postResult] = await Promise.allSettled([
      payload.find({
        collection: 'sites',
        depth: 0,
        limit: 100,
        overrideAccess: false,
        req,
        sort: 'name',
      }) as Promise<{ docs: Site[] }>,
      loadCollection<Page>({ collection: 'pages', payload, req }),
      loadCollection<Post>({ collection: 'posts', payload, req }),
    ])

    if (siteResult.status === 'rejected') {
      return Response.json(
        { message: 'Không tải được phạm vi site được phân quyền.' },
        { status: 500 },
      )
    }

    const sourceState: Record<SourceName, SourceState> = {
      pages: pageResult.status === 'fulfilled' ? 'ready' : 'error',
      posts: postResult.status === 'fulfilled' ? 'ready' : 'error',
      sites: 'ready',
    }
    const sourceErrors = (['pages', 'posts'] as const).flatMap((source) =>
      sourceState[source] === 'error' ? [source] : [],
    )
    const pages = pageResult.status === 'fulfilled' ? pageResult.value.docs : []
    const posts = postResult.status === 'fulfilled' ? postResult.value.docs : []

    const sitesByID = new Map<string, ReviewSite>()

    for (const site of siteResult.value.docs) {
      sitesByID.set(String(site.id), {
        children: [],
        code: site.code,
        id: site.id,
        label: site.name || site.code || `Site ${site.id}`,
        pathPrefix: getSitePathPrefix(site),
      })
    }

    for (const page of pages) {
      const siteID = getRelationID(page.site)
      const group = siteID === null ? undefined : sitesByID.get(String(siteID))

      if (!group) continue

      const site = siteResult.value.docs.find(
        (candidate) => String(candidate.id) === String(siteID),
      )
      const locale = site ? getReviewLocale(site) : null
      if (!site || !locale) continue
      const canonicalPath = normalizeCanonicalPath(getPageCanonicalPath(page))
      const publicPath = getPageCanonicalPath(page, locale, site.defaultLocale)

      group.children.push({
        canonicalPath,
        editPath: `/admin/collections/pages/${page.id}`,
        id: page.id,
        label: getTitle(page.title, `Trang ${page.id}`),
        locale,
        path: withSitePrefix(site, publicPath),
        previewOrigin:
          process.env.NODE_ENV === 'production'
            ? getProductionPreviewOrigin(group.code) || undefined
            : undefined,
        previewPath: buildPreviewPath({
          canonicalPath,
          collection: 'pages',
          documentID: page.id,
          locale,
        }),
        publicPath,
        siteCode: group.code,
        status: getStatus(page),
        type: 'page',
        updatedAt: page.updatedAt,
      })
    }

    for (const post of posts) {
      const siteID = getRelationID(post.site)
      const group = siteID === null ? undefined : sitesByID.get(String(siteID))

      if (!group) continue

      const site = siteResult.value.docs.find(
        (candidate) => String(candidate.id) === String(siteID),
      )
      const locale = site ? getReviewLocale(site) : null
      if (!site || !locale) continue
      const canonicalPath = normalizeCanonicalPath(getPostPath(post.slug))
      const publicPath = getPostCanonicalPath(post.slug, locale, site.defaultLocale)

      group.children.push({
        canonicalPath,
        editPath: `/admin/collections/posts/${post.id}`,
        id: post.id,
        label: getTitle(post.title, `Bài viết ${post.id}`),
        locale,
        path: withSitePrefix(site, publicPath),
        previewOrigin:
          process.env.NODE_ENV === 'production'
            ? getProductionPreviewOrigin(group.code) || undefined
            : undefined,
        previewPath: buildPreviewPath({
          canonicalPath,
          collection: 'posts',
          documentID: post.id,
          locale,
        }),
        publicPath,
        siteCode: group.code,
        status: getStatus(post),
        type: 'post',
        updatedAt: post.updatedAt,
      })
    }

    const sites = Array.from(sitesByID.values()).map((site) => ({
      ...site,
      children: site.children.sort((left, right) => left.path.localeCompare(right.path, 'vi')),
    }))

    return Response.json(
      {
        generatedAt: new Date().toISOString(),
        sourceErrors,
        sourceState,
        sites,
      },
      { headers: { 'Cache-Control': 'private, no-store' } },
    )
  } catch {
    return Response.json({ message: 'Không tải được Site Review. Hãy thử lại.' }, { status: 500 })
  }
}
