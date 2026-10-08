import type { CollectionBeforeChangeHook } from 'payload'

import type { Page } from '@/payload-types'

import { normalizeRelationID } from '@/access/roles'

import { vietnameseSlugify } from '@/utilities/slugify'

const trimSlashes = (value: string) => value.replace(/^\/+|\/+$/g, '')

const normalizePagePath = (value?: null | string) => {
  if (!value || value === '/' || value === 'home') {
    return '/'
  }

  const normalized = trimSlashes(value)
    .split('/')
    .map((segment) => (segment === 'home' ? 'home' : vietnameseSlugify(segment)))
    .filter(Boolean)
    .join('/')

  return normalized ? `/${normalized}` : '/'
}

export const syncPagePathname: CollectionBeforeChangeHook<Page> = async ({
  data,
  originalDoc,
  req,
}) => {
  if (typeof data?.pathname === 'string' && data.pathname.trim().length > 0) {
    return {
      ...data,
      pathname: normalizePagePath(data.pathname),
    }
  }

  const rawSlug =
    typeof data?.slug === 'string' && data.slug.trim().length > 0
      ? data.slug
      : typeof originalDoc?.slug === 'string' && originalDoc.slug.trim().length > 0
        ? originalDoc.slug
        : typeof data?.title === 'string' && data.title.trim().length > 0
          ? vietnameseSlugify(data.title)
          : ''

  if (!rawSlug) {
    return data
  }

  const nextSlug = rawSlug === 'home' ? 'home' : vietnameseSlugify(rawSlug)

  const updatedData: Page = {
    ...data,
    ...(data?.slug ? {} : { slug: nextSlug }),
  } as Page

  const parentRelation = data?.parentPage ?? originalDoc?.parentPage
  const parentPageID = normalizeRelationID(parentRelation)

  if (nextSlug === 'home') {
    return {
      ...updatedData,
      pathname: '/',
    }
  }

  if (!parentPageID) {
    return {
      ...updatedData,
      pathname: normalizePagePath(nextSlug),
    }
  }

  const parentPage = await req.payload.findByID({
    collection: 'pages',
    id: parentPageID,
    depth: 0,
    overrideAccess: true,
    req,
  })

  const parentPath = normalizePagePath(parentPage?.pathname || parentPage?.slug || '')

  return {
    ...updatedData,
    pathname:
      parentPath === '/'
        ? normalizePagePath(nextSlug)
        : `${parentPath}/${trimSlashes(nextSlug)}`,
  }
}
