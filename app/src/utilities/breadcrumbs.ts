import type { SiteSetting } from '@/payload-types'

import { getPageCanonicalPath, getPostCanonicalPath } from './siteURLs'

export type BreadcrumbItem = {
  label: string
  path: string
}

type BreadcrumbMeta = {
  breadcrumbLabel?: null | string
}

export type BreadcrumbPage = {
  meta?: BreadcrumbMeta | null
  slug?: null | string
  title?: null | string
  parentPage?: BreadcrumbPage | number | null
}

export type BreadcrumbPost = {
  meta?: BreadcrumbMeta | null
  slug?: null | string
  title?: null | string
}

const getPageLabel = (page: BreadcrumbPage) => page.meta?.breadcrumbLabel || page.title || 'Page'

export const buildPageBreadcrumbItems = ({
  page,
  settings,
}: {
  page: BreadcrumbPage
  settings?: null | SiteSetting
}): BreadcrumbItem[] => {
  const items: BreadcrumbItem[] = [
    {
      label: settings?.siteName || 'Home',
      path: '/',
    },
  ]

  const parentPage = page.parentPage

  if (parentPage && typeof parentPage === 'object' && parentPage.slug && parentPage.slug !== 'home') {
    items.push({
      label: getPageLabel(parentPage),
      path: getPageCanonicalPath(parentPage.slug),
    })
  }

  if (page.slug && page.slug !== 'home') {
    items.push({
      label: getPageLabel(page),
      path: getPageCanonicalPath(page.slug),
    })
  }

  return items
}

export const buildPostBreadcrumbItems = ({
  post,
  settings,
}: {
  post: BreadcrumbPost
  settings?: null | SiteSetting
}): BreadcrumbItem[] => [
  {
    label: settings?.siteName || 'Home',
    path: '/',
  },
  {
    label: 'Posts',
    path: '/posts',
  },
  {
    label: post.meta?.breadcrumbLabel || post.title || 'Post',
    path: getPostCanonicalPath(post.slug),
  },
]
