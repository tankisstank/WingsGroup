import type { CollectionBeforeChangeHook } from 'payload'

import type { Page } from '@/payload-types'

import { normalizeRelationID } from '@/access/roles'

const trimSlashes = (value: string) => value.replace(/^\/+|\/+$/g, '')

const normalizePagePath = (value?: null | string) => {
  if (!value || value === '/' || value === 'home') {
    return '/'
  }

  const normalized = trimSlashes(value)

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

  const nextSlug = typeof data?.slug === 'string' ? data.slug : originalDoc?.slug

  if (!nextSlug) {
    return data
  }

  const parentRelation = data?.parentPage ?? originalDoc?.parentPage
  const parentPageID = normalizeRelationID(parentRelation)

  if (nextSlug === 'home') {
    return {
      ...data,
      pathname: '/',
    }
  }

  if (!parentPageID) {
    return {
      ...data,
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
    ...data,
    pathname:
      parentPath === '/'
        ? normalizePagePath(nextSlug)
        : `${parentPath}/${trimSlashes(nextSlug)}`,
  }
}
