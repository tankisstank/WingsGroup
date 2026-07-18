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
      const path = site.nestedRouteSamples[locale] || Object.values(site.nestedRouteSamples)[0] || '/'
      const metadata = await generateMeta({
        doc: {
          slug: path === '/' ? 'home' : path.replace(/^\//, ''),
          title: `${site.name} title`,
        },
        locale,
        path,
      })

      expect(metadata.alternates?.canonical, `${site.name} canonical`).toBe(
        `${site.canonicalDomain}${locale === 'vi' ? `${path === '/' ? '' : path}` : `/${locale}${path === '/' ? '' : path}`}`.replace(
          /(?<!:)\/{2,}/g,
          '/',
        ),
      )
      expect(
        Object.keys(metadata.alternates?.languages || {}).sort(),
        `${site.name} alternates`,
      ).toEqual([...site.publicLocales].sort())
    }
  })

  it('keeps locale alternates stable for non-default public locales', async () => {
    const site = inventory.sites.find((entry) => entry.name === 'wings-side')!

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
        pathname: '/about-us',
        title: 'About us',
      },
      locale: 'it',
      path: '/about-us',
    })

    expect(metadata.alternates?.canonical).toBe('https://wingside.vn/it/about-us')
    expect(metadata.alternates?.languages).toMatchObject({
      en: 'https://wingside.vn/en/about-us',
      es: 'https://wingside.vn/es/about-us',
      it: 'https://wingside.vn/it/about-us',
      pt: 'https://wingside.vn/pt/about-us',
      vi: 'https://wingside.vn/about-us',
    })
  })
})
