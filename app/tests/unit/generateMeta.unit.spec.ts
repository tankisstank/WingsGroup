import { beforeEach, describe, expect, it, vi } from 'vitest'

import { loadMultisiteAuditInventory } from '../helpers/multisiteAuditInventory'

const mocks = vi.hoisted(() => ({
  getCurrentSite: vi.fn(),
  getCurrentSiteSettings: vi.fn(),
}))

vi.mock('@/utilities/siteContext', () => ({
  getCurrentSite: mocks.getCurrentSite,
}))

vi.mock('@/utilities/getSiteSettings', () => ({
  getCurrentSiteSettings: mocks.getCurrentSiteSettings,
}))

import { generateMeta } from '@/utilities/generateMeta'

const inventory = loadMultisiteAuditInventory()

describe('generateMeta multisite locale contract', () => {
  beforeEach(() => {
    mocks.getCurrentSite.mockReset()
    mocks.getCurrentSiteSettings.mockReset()
  })

  it('limits alternate languages to the current site public locales', async () => {
    for (const site of inventory.sites) {
      mocks.getCurrentSite.mockResolvedValue({
        additionalDomains: site.hosts
          .filter((host) => host !== site.primaryDomain)
          .map((domain) => ({ domain })),
        defaultLocale: site.defaultLocale,
        primaryDomain: site.primaryDomain,
        supportedLocales: site.supportedLocales,
      })
      mocks.getCurrentSiteSettings.mockResolvedValue({
        seo: {
          canonicalDomain: site.canonicalDomain,
          defaultDescription: `${site.name} description`,
          defaultTitle: site.name,
        },
        siteName: site.name,
      })

      const locale = site.publicLocales[0] || site.defaultLocale
      const path =
        site.nestedRouteSamples[locale] || Object.values(site.nestedRouteSamples)[0] || '/'
      const metadata = await generateMeta({
        alternateLocales: site.publicLocales,
        doc: {
          slug: path === '/' ? 'home' : path.replace(/^\//, ''),
          title: `${site.name} title`,
        },
        locale,
        path,
      })

      expect(metadata.alternates?.canonical, `${site.name} canonical`).toBe(
        `${site.canonicalDomain}${locale === site.defaultLocale ? `${path === '/' ? '' : path}` : `/${locale}${path === '/' ? '' : path}`}`.replace(
          /(?<!:)\/{2,}/g,
          '/',
        ),
      )
      expect(
        Object.keys(metadata.alternates?.languages || {}).sort(),
        `${site.name} alternates`,
      ).toEqual([...site.publicLocales, 'x-default'].sort())
    }
  })

  it('keeps locale alternates stable for non-default public locales', async () => {
    const site = inventory.sites.find((entry) => entry.name === 'wing-side')!

    mocks.getCurrentSite.mockResolvedValue({
      additionalDomains: site.hosts
        .filter((host) => host !== site.primaryDomain)
        .map((domain) => ({ domain })),
      defaultLocale: site.defaultLocale,
      primaryDomain: site.primaryDomain,
      supportedLocales: site.supportedLocales,
    })
    mocks.getCurrentSiteSettings.mockResolvedValue({
      seo: {
        canonicalDomain: site.canonicalDomain,
        defaultDescription: `${site.name} description`,
        defaultTitle: site.name,
      },
      siteName: site.name,
    })

    const metadata = await generateMeta({
      alternateLocales: site.publicLocales,
      doc: {
        pathname: '/about-us',
        title: 'About us',
      },
      locale: 'it',
      path: '/about-us',
    })

    expect(metadata.alternates?.canonical).toBe('https://wingside.vn/it/about-us')
    expect(metadata.alternates?.languages).toMatchObject({
      en: 'https://wingside.vn/about-us',
      es: 'https://wingside.vn/es/about-us',
      it: 'https://wingside.vn/it/about-us',
      pt: 'https://wingside.vn/pt/about-us',
      vi: 'https://wingside.vn/vi/about-us',
    })
  })

  it('builds the canonical Vietnamese ecosystem metadata without exposing English approval', async () => {
    mocks.getCurrentSite.mockResolvedValue({
      additionalDomains: [{ domain: 'www.wingsgroup.vn' }],
      defaultLocale: 'vi',
      primaryDomain: 'wingsgroup.vn',
      supportedLocales: ['vi', 'en'],
    })
    mocks.getCurrentSiteSettings.mockResolvedValue({
      seo: {
        canonicalDomain: 'https://wingsgroup.vn',
        defaultDescription: 'WingsGroup',
        defaultTitle: 'WingsGroup',
      },
      siteName: 'WingsGroup',
    })

    const metadata = await generateMeta({
      alternateLocales: ['vi'],
      doc: {
        pathname: '/he-sinh-thai',
        title: 'Hệ sinh thái WingsGroup',
      },
      locale: 'vi',
      path: '/he-sinh-thai',
    })

    expect(metadata.alternates?.canonical).toBe('https://wingsgroup.vn/he-sinh-thai')
    expect(metadata.alternates?.languages).toEqual({
      vi: 'https://wingsgroup.vn/he-sinh-thai',
      'x-default': 'https://wingsgroup.vn/he-sinh-thai',
    })
    expect(metadata.alternates?.languages).not.toHaveProperty('en')
  })

  it('omits unpublished locale alternates when route inventory is narrower than site locales', async () => {
    const site = inventory.sites.find((entry) => entry.name === 'wing-side')!

    mocks.getCurrentSite.mockResolvedValue({
      additionalDomains: site.hosts
        .filter((host) => host !== site.primaryDomain)
        .map((domain) => ({ domain })),
      defaultLocale: site.defaultLocale,
      primaryDomain: site.primaryDomain,
      supportedLocales: site.supportedLocales,
    })
    mocks.getCurrentSiteSettings.mockResolvedValue({
      seo: {
        canonicalDomain: site.canonicalDomain,
        defaultDescription: `${site.name} description`,
        defaultTitle: site.name,
      },
      siteName: site.name,
    })

    const metadata = await generateMeta({
      alternateLocales: ['en', 'vi'],
      doc: {
        pathname: '/contact-us',
        title: 'Contact',
      },
      locale: 'vi',
      path: '/contact-us',
    })

    expect(metadata.alternates?.canonical).toBe('https://wingside.vn/vi/contact-us')
    expect(metadata.alternates?.languages).toEqual({
      en: 'https://wingside.vn/contact-us',
      vi: 'https://wingside.vn/vi/contact-us',
      'x-default': 'https://wingside.vn/contact-us',
    })
    expect(metadata.alternates?.languages).not.toHaveProperty('it')
    expect(metadata.alternates?.languages).not.toHaveProperty('es')
    expect(metadata.alternates?.languages).not.toHaveProperty('pt')
  })

  it('does not infer full site alternates when a caller has no route inventory', async () => {
    const site = inventory.sites.find((entry) => entry.name === 'wing-side')!

    mocks.getCurrentSite.mockResolvedValue({
      additionalDomains: site.hosts
        .filter((host) => host !== site.primaryDomain)
        .map((domain) => ({ domain })),
      defaultLocale: site.defaultLocale,
      primaryDomain: site.primaryDomain,
      supportedLocales: site.supportedLocales,
    })
    mocks.getCurrentSiteSettings.mockResolvedValue({
      seo: {
        canonicalDomain: site.canonicalDomain,
        defaultDescription: `${site.name} description`,
        defaultTitle: site.name,
      },
      siteName: site.name,
    })

    const metadata = await generateMeta({
      doc: {
        pathname: '/draft-only-route',
        title: 'Draft only route',
      },
      locale: 'it',
      path: '/draft-only-route',
    })

    expect(metadata.alternates?.canonical).toBe('https://wingside.vn/it/draft-only-route')
    expect(metadata.alternates?.languages).toEqual({
      it: 'https://wingside.vn/it/draft-only-route',
    })
    expect(metadata.alternates?.languages).not.toHaveProperty('x-default')
    expect(metadata.alternates?.languages).not.toHaveProperty('en')
    expect(metadata.alternates?.languages).not.toHaveProperty('vi')
  })

  it('prioritizes the CMS SEO title and always identifies the current site', async () => {
    mocks.getCurrentSite.mockResolvedValue({
      defaultLocale: 'en',
      primaryDomain: 'wingside.vn',
      supportedLocales: ['vi', 'en'],
    })
    mocks.getCurrentSiteSettings.mockResolvedValue({
      seo: {
        canonicalDomain: 'https://wingside.vn',
        defaultDescription: 'Private Vietnam journeys planned by a local team.',
        defaultTitle: 'wingside.vn',
        titleSuffix: 'Tailor-made Vietnam journeys',
      },
      siteName: 'wingside.vn',
    })

    const metadata = await generateMeta({
      doc: {
        meta: { title: 'Vietnam destinations' },
        pathname: '/destinations',
        title: 'Destinations',
      },
      locale: 'en',
      path: '/destinations',
    })

    expect(metadata.title).toBe('Vietnam destinations | Tailor-made Vietnam journeys | wingside.vn')
  })

  it('makes unprefixed root English and /vi Vietnamese self-canonical with x-default', async () => {
    const site = inventory.sites.find((entry) => entry.name === 'wing-side')!

    mocks.getCurrentSite.mockResolvedValue({
      additionalDomains: [],
      defaultLocale: 'en',
      primaryDomain: site.primaryDomain,
      supportedLocales: site.supportedLocales,
    })
    mocks.getCurrentSiteSettings.mockResolvedValue({
      seo: {
        canonicalDomain: site.canonicalDomain,
        defaultDescription: `${site.name} description`,
        defaultTitle: site.name,
      },
      siteName: site.name,
    })

    const enRoot = await generateMeta({
      alternateLocales: ['en', 'vi'],
      doc: { pathname: '/', title: 'Home' },
      locale: 'en',
      path: '/',
    })
    const viRoot = await generateMeta({
      alternateLocales: ['en', 'vi'],
      doc: { pathname: '/', title: 'Trang chủ' },
      locale: 'vi',
      path: '/',
    })

    expect(enRoot.alternates?.canonical).toBe('https://wingside.vn')
    expect(viRoot.alternates?.canonical).toBe('https://wingside.vn/vi')
    expect(enRoot.alternates?.languages).toEqual({
      en: 'https://wingside.vn',
      vi: 'https://wingside.vn/vi',
      'x-default': 'https://wingside.vn',
    })
  })

  it('emits article OpenGraph and Twitter metadata from the article itself', async () => {
    mocks.getCurrentSite.mockResolvedValue({
      defaultLocale: 'vi',
      primaryDomain: 'wingsgroup.vn',
      supportedLocales: ['vi', 'en'],
    })
    mocks.getCurrentSiteSettings.mockResolvedValue({
      seo: {
        canonicalDomain: 'https://wingsgroup.vn',
        defaultDescription: 'Default description',
        defaultTitle: 'WingsGroup',
      },
      siteName: 'WingsGroup',
    })

    const metadata = await generateMeta({
      alternateLocales: ['vi'],
      article: {
        authors: ['Ban Biên tập WingsGroup'],
        modifiedTime: '2026-09-09T00:00:00.000Z',
        publishedTime: '2026-09-08T00:00:00.000Z',
      },
      doc: {
        meta: {
          description: 'Article description',
          image: { id: 1, url: '/media/article-og.webp' } as never,
          title: 'Article title',
        },
        title: 'Fallback article title',
      },
      locale: 'vi',
      path: '/tin-tuc/article',
      socialDescription: 'Article description',
      socialTitle: 'Article title',
    })

    expect(metadata.openGraph).toMatchObject({
      authors: ['Ban Biên tập WingsGroup'],
      modifiedTime: '2026-09-09T00:00:00.000Z',
      publishedTime: '2026-09-08T00:00:00.000Z',
      title: 'Article title',
      type: 'article',
    })
    expect(metadata.twitter).toMatchObject({
      card: 'summary_large_image',
      description: 'Article description',
      images: ['https://wingsgroup.vn/media/article-og.webp'],
      title: 'Article title',
    })
  })
})
