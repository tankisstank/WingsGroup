import type { SiteSetting } from '@/payload-types'

import { getPageCanonicalPath, getPostCanonicalPath } from './siteURLs'
import type { SupportedLocaleCode } from './sitePaths'

export type BreadcrumbItem = {
  label: string
  path: string
}

type BreadcrumbMeta = {
  breadcrumbLabel?: null | string
}

export type BreadcrumbPage = {
  meta?: BreadcrumbMeta | null
  pathname?: null | string
  slug?: null | string
  title?: null | string
  parentPage?: BreadcrumbPage | number | null
}

export type BreadcrumbPost = {
  meta?: BreadcrumbMeta | null
  slug?: null | string
  title?: null | string
}

const getPageLabel = (page: BreadcrumbPage, locale?: SupportedLocaleCode) =>
  page.meta?.breadcrumbLabel || page.title || (locale === 'en' ? 'Page' : 'Trang')

const pushAncestorBreadcrumbs = (
  items: BreadcrumbItem[],
  page?: BreadcrumbPage | number | null,
  locale?: SupportedLocaleCode,
) => {
  if (!page || typeof page !== 'object') {
    return
  }

  pushAncestorBreadcrumbs(items, page.parentPage, locale)

  const path = getPageCanonicalPath(page, locale)

  if (path !== '/') {
    items.push({
      label: getPageLabel(page, locale),
      path,
    })
  }
}

export const buildPageBreadcrumbItems = ({
  locale,
  page,
  settings,
}: {
  locale?: SupportedLocaleCode
  page: BreadcrumbPage
  settings?: null | SiteSetting
}): BreadcrumbItem[] => {
  const items: BreadcrumbItem[] = [
    {
      label: settings?.siteName || (locale === 'en' ? 'Home' : 'Trang chủ'),
      path: getPageCanonicalPath('/', locale),
    },
  ]

  pushAncestorBreadcrumbs(items, page.parentPage, locale)

  const currentPath = getPageCanonicalPath(page, locale)

  if (currentPath !== '/') {
    items.push({
      label: getPageLabel(page, locale),
      path: currentPath,
    })
  }

  return items
}

export const buildPostBreadcrumbItems = ({
  locale,
  post,
  settings,
}: {
  locale?: SupportedLocaleCode
  post: BreadcrumbPost
  settings?: null | SiteSetting
}): BreadcrumbItem[] => [
  {
    label: settings?.siteName || (locale === 'en' ? 'Home' : 'Trang chủ'),
    path: getPageCanonicalPath('/', locale),
  },
  {
    label: locale === 'en' ? 'Posts' : 'Bài viết',
    path: getPostCanonicalPath(null, locale),
  },
  {
    label: post.meta?.breadcrumbLabel || post.title || (locale === 'en' ? 'Post' : 'Bài viết'),
    path: getPostCanonicalPath(post.slug, locale),
  },
]
