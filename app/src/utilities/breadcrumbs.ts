import type { SiteSetting } from '@/payload-types'

import { getCopyLocale } from './locales'
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

const breadcrumbCopy = {
  en: {
    home: 'Home',
    page: 'Page',
    post: 'Post',
    posts: 'Posts',
  },
  vi: {
    home: 'Trang chủ',
    page: 'Trang',
    post: 'Bài viết',
    posts: 'Bài viết',
  },
} as const

const getBreadcrumbCopy = (locale?: SupportedLocaleCode) =>
  breadcrumbCopy[getCopyLocale(locale ?? 'vi')]

const getPageLabel = (page: BreadcrumbPage, locale?: SupportedLocaleCode) =>
  page.meta?.breadcrumbLabel || page.title || getBreadcrumbCopy(locale).page

const pushAncestorBreadcrumbs = (
  items: BreadcrumbItem[],
  page?: BreadcrumbPage | number | null,
  locale?: SupportedLocaleCode,
  defaultLocale?: SupportedLocaleCode,
) => {
  if (!page || typeof page !== 'object') {
    return
  }

  pushAncestorBreadcrumbs(items, page.parentPage, locale, defaultLocale)

  const path = getPageCanonicalPath(page, locale, defaultLocale)

  if (path !== '/') {
    items.push({
      label: getPageLabel(page, locale),
      path,
    })
  }
}

export const buildPageBreadcrumbItems = ({
  defaultLocale,
  locale,
  page,
  settings,
}: {
  defaultLocale?: SupportedLocaleCode
  locale?: SupportedLocaleCode
  page: BreadcrumbPage
  settings?: null | SiteSetting
}): BreadcrumbItem[] => {
  const copy = getBreadcrumbCopy(locale)
  const items: BreadcrumbItem[] = [
    {
      label: settings?.siteName || copy.home,
      path: getPageCanonicalPath('/', locale, defaultLocale),
    },
  ]

  pushAncestorBreadcrumbs(items, page.parentPage, locale, defaultLocale)

  const currentPath = getPageCanonicalPath(page, locale, defaultLocale)

  if (currentPath !== '/') {
    items.push({
      label: getPageLabel(page, locale),
      path: currentPath,
    })
  }

  return items
}

export const buildPostBreadcrumbItems = ({
  defaultLocale,
  locale,
  post,
  settings,
}: {
  defaultLocale?: SupportedLocaleCode
  locale?: SupportedLocaleCode
  post: BreadcrumbPost
  settings?: null | SiteSetting
}): BreadcrumbItem[] => {
  const copy = getBreadcrumbCopy(locale)

  return [
    {
      label: settings?.siteName || copy.home,
      path: getPageCanonicalPath('/', locale, defaultLocale),
    },
    {
      label: copy.posts,
      path: getPostCanonicalPath(null, locale, defaultLocale),
    },
    {
      label: post.meta?.breadcrumbLabel || post.title || copy.post,
      path: getPostCanonicalPath(post.slug, locale, defaultLocale),
    },
  ]
}
