import 'dotenv/config'

import { getPayload } from 'payload'

import config from '../src/payload.config'
import { supportedLocaleCodes, type SupportedLocaleCode } from '../src/utilities/sitePaths'

type AuditIssue = {
  collection: string
  field: string
  id: number | string
  locale: SupportedLocaleCode
  site: string
  title?: null | string
}

const hasText = (value: unknown) => typeof value === 'string' && value.trim().length > 0
const hasArray = (value: unknown) => Array.isArray(value) && value.length > 0
const hasObject = (value: unknown) => Boolean(value && typeof value === 'object')

const pushIssue = (
  issues: AuditIssue[],
  args: Omit<AuditIssue, 'collection' | 'locale' | 'site'> & {
    collection: string
    locale: SupportedLocaleCode
    site: string
  },
) => {
  issues.push(args)
}

const main = async () => {
  const payload = await getPayload({ config })
  const issues: AuditIssue[] = []
  const duplicateURLs = new Map<string, Array<number | string>>()

  const sites = await payload.find({
    collection: 'sites',
    depth: 0,
    limit: 100,
    pagination: false,
    where: {
      isActive: {
        equals: true,
      },
    },
  })

  for (const site of sites.docs) {
    const locales = (site.supportedLocales || supportedLocaleCodes) as SupportedLocaleCode[]

    for (const locale of locales) {
      const pages = await payload.find({
        collection: 'pages',
        depth: 0,
        fallbackLocale: false,
        limit: 1000,
        locale,
        pagination: false,
        overrideAccess: true,
        where: {
          site: {
            equals: site.id,
          },
        },
      })

      for (const page of pages.docs) {
        const title = page.title
        const pageKey = `${site.code}:${locale}:${page.pathname || page.slug}`
        duplicateURLs.set(pageKey, [...(duplicateURLs.get(pageKey) || []), page.id])

        if (!hasText(page.title)) {
          pushIssue(issues, { collection: 'pages', field: 'title', id: page.id, locale, site: site.code, title })
        }
        if (!hasText(page.slug)) {
          pushIssue(issues, { collection: 'pages', field: 'slug', id: page.id, locale, site: site.code, title })
        }
        if (!hasText(page.pathname)) {
          pushIssue(issues, { collection: 'pages', field: 'pathname', id: page.id, locale, site: site.code, title })
        }
        if (!hasObject(page.hero)) {
          pushIssue(issues, { collection: 'pages', field: 'hero', id: page.id, locale, site: site.code, title })
        }
        if (!hasArray(page.layout)) {
          pushIssue(issues, { collection: 'pages', field: 'layout', id: page.id, locale, site: site.code, title })
        }
        if (!hasText(page.meta?.title)) {
          pushIssue(issues, { collection: 'pages', field: 'meta.title', id: page.id, locale, site: site.code, title })
        }
        if (!hasText(page.meta?.description)) {
          pushIssue(issues, {
            collection: 'pages',
            field: 'meta.description',
            id: page.id,
            locale,
            site: site.code,
            title,
          })
        }
      }

      const posts = await payload.find({
        collection: 'posts',
        depth: 0,
        fallbackLocale: false,
        limit: 1000,
        locale,
        pagination: false,
        overrideAccess: true,
        where: {
          site: {
            equals: site.id,
          },
        },
      })

      for (const post of posts.docs) {
        const title = post.title
        const postKey = `${site.code}:${locale}:posts/${post.slug}`
        duplicateURLs.set(postKey, [...(duplicateURLs.get(postKey) || []), post.id])

        if (!hasText(post.title)) {
          pushIssue(issues, { collection: 'posts', field: 'title', id: post.id, locale, site: site.code, title })
        }
        if (!hasText(post.slug)) {
          pushIssue(issues, { collection: 'posts', field: 'slug', id: post.id, locale, site: site.code, title })
        }
        if (!hasObject(post.content)) {
          pushIssue(issues, { collection: 'posts', field: 'content', id: post.id, locale, site: site.code, title })
        }
        if (!hasText(post.meta?.title)) {
          pushIssue(issues, { collection: 'posts', field: 'meta.title', id: post.id, locale, site: site.code, title })
        }
        if (!hasText(post.meta?.description)) {
          pushIssue(issues, {
            collection: 'posts',
            field: 'meta.description',
            id: post.id,
            locale,
            site: site.code,
            title,
          })
        }
      }

      const settings = await payload.find({
        collection: 'site-settings',
        depth: 0,
        fallbackLocale: false,
        limit: 10,
        locale,
        pagination: false,
        overrideAccess: true,
        where: {
          site: {
            equals: site.id,
          },
        },
      })

      for (const setting of settings.docs) {
        const title = setting.siteName
        if (!hasText(setting.tagline)) {
          pushIssue(issues, { collection: 'site-settings', field: 'tagline', id: setting.id, locale, site: site.code, title })
        }
        if (!hasText(setting.seo?.defaultTitle)) {
          pushIssue(issues, { collection: 'site-settings', field: 'seo.defaultTitle', id: setting.id, locale, site: site.code, title })
        }
        if (!hasText(setting.seo?.defaultDescription)) {
          pushIssue(issues, {
            collection: 'site-settings',
            field: 'seo.defaultDescription',
            id: setting.id,
            locale,
            site: site.code,
            title,
          })
        }
        if (!hasArray(setting.headerNavItems)) {
          pushIssue(issues, { collection: 'site-settings', field: 'headerNavItems', id: setting.id, locale, site: site.code, title })
        }
        if (!hasArray(setting.footerNavItems)) {
          pushIssue(issues, { collection: 'site-settings', field: 'footerNavItems', id: setting.id, locale, site: site.code, title })
        }
      }
    }
  }

  for (const [urlKey, ids] of duplicateURLs.entries()) {
    if (ids.length > 1) {
      for (const id of ids) {
        const [site, locale] = urlKey.split(':') as [string, SupportedLocaleCode]
        pushIssue(issues, {
          collection: 'routing',
          field: `duplicate:${urlKey}`,
          id,
          locale,
          site,
        })
      }
    }
  }

  if (issues.length > 0) {
    console.table(issues)
    throw new Error(`Locale audit failed with ${issues.length} issue(s).`)
  }

  payload.logger.info('Locale audit passed for all active sites.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
