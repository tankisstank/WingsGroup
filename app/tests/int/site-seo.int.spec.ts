import { describe, expect, it } from 'vitest'

import { buildArticleJSONLD, buildBreadcrumbListJSONLD, stringifyJSONLD } from '@/utilities/structuredData'
import {
  getCanonicalURL,
  getPageCanonicalPath,
  getPostCanonicalPath,
  getSiteSettingForSite,
  normalizeCanonicalDomain,
} from '@/utilities/siteURLs'
import type { Post } from '@/payload-types'

const settings = {
  id: 1,
  createdAt: '2026-05-27T00:00:00.000Z',
  site: 1,
  siteName: 'WingsGroup',
  branding: {
    faviconImage: 1,
    themeKey: 'wings-group',
  },
  updatedAt: '2026-05-27T00:00:00.000Z',
  seo: {
    canonicalDomain: 'https://wingsgroup.com',
    defaultDescription: 'Travel services',
    defaultTitle: 'WingsGroup',
  },
} as const

describe('site SEO utilities', () => {
  it('normalizes page and post canonical URLs', () => {
    expect(getCanonicalURL({ path: getPageCanonicalPath('home'), settings })).toBe(
      'https://wingsgroup.com',
    )
    expect(getCanonicalURL({ path: getPageCanonicalPath('about'), settings })).toBe(
      'https://wingsgroup.com/about',
    )
    expect(getCanonicalURL({ path: getPageCanonicalPath('/destinations/ha-noi'), settings })).toBe(
      'https://wingsgroup.com/destinations/ha-noi',
    )
    expect(getCanonicalURL({ path: getPostCanonicalPath('launch'), settings })).toBe(
      'https://wingsgroup.com/posts/launch',
    )
  })

  it('normalizes canonical domains before metadata and sitemap use', () => {
    expect(normalizeCanonicalDomain('wingsgo.vn/')).toBe('https://wingsgo.vn')
    expect(normalizeCanonicalDomain('https://wingscare.vn///')).toBe('https://wingscare.vn')
  })

  it('keeps canonical URLs separated per site settings', () => {
    const wingsGoSettings = {
      ...settings,
      site: 2,
      siteName: 'WingsGo',
      seo: {
        canonicalDomain: 'https://wingsgo.vn',
        defaultDescription: 'WingsGo travel services',
        defaultTitle: 'WingsGo',
      },
    } as const

    expect(getCanonicalURL({ path: '/about', settings })).toBe('https://wingsgroup.com/about')
    expect(getCanonicalURL({ path: '/about', settings: wingsGoSettings })).toBe(
      'https://wingsgo.vn/about',
    )
  })

  it('resolves sitemap settings by site id', () => {
    const settingsBySiteId = new Map([[settings.site, settings]])

    expect(getSiteSettingForSite(settings.site, settingsBySiteId)?.siteName).toBe('WingsGroup')
    expect(getSiteSettingForSite({ id: settings.site } as never, settingsBySiteId)?.siteName).toBe(
      'WingsGroup',
    )
  })

  it('builds breadcrumb JSON-LD with canonical item URLs', () => {
    const data = buildBreadcrumbListJSONLD(
      [
        { name: 'Home', path: '/' },
        { name: 'Posts', path: '/posts' },
      ],
      settings,
    )

    expect(data?.['@type']).toBe('BreadcrumbList')
    expect(data?.itemListElement).toEqual([
      {
        '@type': 'ListItem',
        item: 'https://wingsgroup.com',
        name: 'Home',
        position: 1,
      },
      {
        '@type': 'ListItem',
        item: 'https://wingsgroup.com/posts',
        name: 'Posts',
        position: 2,
      },
    ])
  })

  it('serializes JSON-LD safely for script injection', () => {
    const data = buildArticleJSONLD({
      path: '/posts/launch',
      post: {
        id: 1,
        slug: 'launch',
        content: {
          root: {
            type: 'root',
            children: [],
            direction: 'ltr',
            format: '',
            indent: 0,
            version: 1,
          },
        },
        site: 1,
        title: 'Launch <content>',
        updatedAt: '2026-05-27T00:00:00.000Z',
        createdAt: '2026-05-27T00:00:00.000Z',
      } as Post,
      settings,
    })

    expect(stringifyJSONLD(data)).toContain('\\u003ccontent>')
  })
})
