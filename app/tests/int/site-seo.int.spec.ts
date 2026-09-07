import { describe, expect, it } from 'vitest'

import {
  buildArticleJSONLD,
  buildBreadcrumbListJSONLD,
  buildOrganizationJSONLD,
  buildWebPageJSONLD,
  buildWebSiteJSONLD,
  stringifyJSONLD,
} from '@/utilities/structuredData'
import {
  buildConfiguredCanonicalURL,
  buildConfiguredAbsoluteMediaURL,
  getPageCanonicalPath,
  getPostCanonicalPath,
  getSiteSettingForSite,
  normalizeConfiguredCanonicalOrigin,
} from '@/utilities/siteURLs'
import { getCanonicalSiteOrigin } from '@/utilities/siteSEO'
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
    expect(buildConfiguredCanonicalURL({ path: getPageCanonicalPath('home'), settings })).toBe(
      'https://wingsgroup.com',
    )
    expect(buildConfiguredCanonicalURL({ path: getPageCanonicalPath('about'), settings })).toBe(
      'https://wingsgroup.com/about',
    )
    expect(
      buildConfiguredCanonicalURL({ path: getPageCanonicalPath('/destinations/ha-noi'), settings }),
    ).toBe('https://wingsgroup.com/destinations/ha-noi')
    expect(buildConfiguredCanonicalURL({ path: getPostCanonicalPath('launch'), settings })).toBe(
      'https://wingsgroup.com/posts/launch',
    )
    expect(buildConfiguredCanonicalURL({ locale: 'en', path: '/', settings })).toBe(
      'https://wingsgroup.com',
    )
    expect(buildConfiguredCanonicalURL({ locale: 'vi', path: '/', settings })).toBe(
      'https://wingsgroup.com/vi',
    )
  })

  it('normalizes canonical domains before metadata and sitemap use', () => {
    expect(normalizeConfiguredCanonicalOrigin('wingsgo.vn/')).toBe('https://wingsgo.vn')
    expect(normalizeConfiguredCanonicalOrigin('https://wingscare.wingsgroup.vn///')).toBe(
      'https://wingscare.wingsgroup.vn',
    )
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

    expect(buildConfiguredCanonicalURL({ path: '/about', settings })).toBe(
      'https://wingsgroup.com/about',
    )
    expect(buildConfiguredCanonicalURL({ path: '/about', settings: wingsGoSettings })).toBe(
      'https://wingsgo.vn/about',
    )
  })

  it('keeps configured canonical helpers distinct from safe public canonical origin selection', () => {
    const localConfiguredSettings = {
      ...settings,
      site: 2,
      siteName: 'WingsGo',
      seo: {
        canonicalDomain: 'http://localhost:3000',
        defaultDescription: 'WingsGo travel services',
        defaultTitle: 'WingsGo',
      },
    } as const

    expect(buildConfiguredCanonicalURL({ path: '/about', settings: localConfiguredSettings })).toBe(
      'http://localhost:3000/about',
    )

    expect(
      getCanonicalSiteOrigin({
        settings: localConfiguredSettings,
        site: {
          additionalDomains: [{ domain: 'www.wingsgo.vn' }],
          primaryDomain: 'wingsgo.vn',
        },
      }),
    ).toBe('https://wingsgo.vn')
  })

  it('builds configured media URLs without double-prefixing an absolute governed derivative', () => {
    expect(
      buildConfiguredAbsoluteMediaURL({
        media: {
          id: 9,
          url: '/media/plain.png',
          sizes: {
            og: {
              url: '/media/plain-og.png',
            },
          },
        } as never,
        settings,
      }),
    ).toBe('https://wingsgroup.com/media/plain-og.png')

    expect(
      buildConfiguredAbsoluteMediaURL({
        media: {
          id: 10,
          url: 'https://wingsgroup.vn/media/wingsgroup-journey-guide-1440.webp',
          sizes: {
            og: {
              url: 'https://wingsgroup.vn/media/wingsgroup-journey-guide-1440.webp',
            },
          },
        } as never,
        settings,
      }),
    ).toBe('https://wingsgroup.vn/media/wingsgroup-journey-guide-1440.webp')
  })

  it('allows route-level SEO consumers to override canonical origin safely', () => {
    expect(
      buildWebPageJSONLD({
        canonicalOrigin: 'https://wingsgo.vn',
        path: '/en/about',
        settings,
        title: 'About',
      }).url,
    ).toBe('https://wingsgo.vn/en/about')

    expect(
      buildArticleJSONLD({
        canonicalOrigin: 'https://wingsgo.vn',
        path: '/en/posts/launch',
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
          title: 'Launch',
          updatedAt: '2026-05-27T00:00:00.000Z',
          createdAt: '2026-05-27T00:00:00.000Z',
        } as Post,
        settings,
      }).publisher,
    ).toEqual({ '@id': 'https://wingsgo.vn#organization' })

    expect(buildOrganizationJSONLD(settings, { canonicalOrigin: 'https://wingsgo.vn' }).url).toBe(
      'https://wingsgo.vn',
    )
    expect(buildWebSiteJSONLD(settings, { canonicalOrigin: 'https://wingsgo.vn' }).url).toBe(
      'https://wingsgo.vn',
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
