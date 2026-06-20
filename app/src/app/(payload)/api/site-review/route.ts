import config from '@payload-config'
import { headers } from 'next/headers'
import { createLocalReq, getPayload } from 'payload'
import type { Payload } from 'payload'

import type { Page, Post, Site } from '@/payload-types'
import {
  getPageCanonicalPath,
  getPostPath,
  normalizeCanonicalPath,
} from '@/utilities/siteURLs'
import { siteCodeToAliasMap } from '@/utilities/sitePaths'

type ReviewItem = {
  editPath: string
  id: number | string
  label: string
  path: string
  status?: string
  type: 'page' | 'post'
  updatedAt?: string
}

type ReviewSite = {
  children: ReviewItem[]
  code?: string
  id: number | string
  label: string
  pathPrefix: string
}

const getRelationID = (value: number | string | Site | null | undefined) => {
  if (!value) return null
  return typeof value === 'object' ? value.id : value
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

const loadCollection = async <T extends Page | Post>({
  collection,
  payload,
  req,
}: {
  collection: 'pages' | 'posts'
  payload: Payload
  req: Awaited<ReturnType<typeof createLocalReq>>
}) =>
  payload.find({
    collection,
    depth: 1,
    limit: 1000,
    overrideAccess: false,
    req,
    sort: collection === 'pages' ? 'pathname' : 'slug',
  }) as unknown as Promise<{ docs: T[] }>

export async function GET(): Promise<Response> {
  const payload = await getPayload({ config })
  const requestHeaders = await headers()
  const { user } = await payload.auth({ headers: requestHeaders })

  if (!user) {
    return Response.json({ message: 'Bạn cần đăng nhập để xem site review.' }, { status: 401 })
  }

  const req = await createLocalReq({ user }, payload)
  const [siteResult, pageResult, postResult] = await Promise.all([
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

  const sitesByID = new Map<number | string, ReviewSite>()

  for (const site of siteResult.docs) {
    sitesByID.set(site.id, {
      children: [],
      code: site.code,
      id: site.id,
      label: site.name || site.code || `Site ${site.id}`,
      pathPrefix: getSitePathPrefix(site),
    })
  }

  for (const page of pageResult.docs) {
    const siteID = getRelationID(page.site)
    const site = typeof page.site === 'object' ? page.site : null
    const group = siteID ? sitesByID.get(siteID) : undefined

    if (!group) continue

    group.children.push({
      editPath: `/admin/collections/pages/${page.id}`,
      id: page.id,
      label: getTitle(page.title, `Trang ${page.id}`),
      path: withSitePrefix(site, getPageCanonicalPath(page)),
      status: getStatus(page),
      type: 'page',
      updatedAt: page.updatedAt,
    })
  }

  for (const post of postResult.docs) {
    const siteID = getRelationID(post.site)
    const site = typeof post.site === 'object' ? post.site : null
    const group = siteID ? sitesByID.get(siteID) : undefined

    if (!group) continue

    group.children.push({
      editPath: `/admin/collections/posts/${post.id}`,
      id: post.id,
      label: getTitle(post.title, `Bài viết ${post.id}`),
      path: withSitePrefix(site, getPostPath(post.slug)),
      status: getStatus(post),
      type: 'post',
      updatedAt: post.updatedAt,
    })
  }

  const sites = Array.from(sitesByID.values()).map((site) => ({
    ...site,
    children: site.children.sort((left, right) => left.path.localeCompare(right.path, 'vi')),
  }))

  return Response.json({
    generatedAt: new Date().toISOString(),
    sites,
  })
}
