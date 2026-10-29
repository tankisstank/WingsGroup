import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getCurrentLocale: vi.fn(),
  getCurrentSite: vi.fn(),
  getCurrentSiteSettings: vi.fn(),
  generateMeta: vi.fn(),
  queryPageByPath: vi.fn(),
  queryPublishedPageLocalesByExactPath: vi.fn(),
}))

vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('payload', () => ({ getPayload: vi.fn() }))
vi.mock('@payloadcms/ui', () => ({}))
vi.mock('@payloadcms/ui/icons/Copy', () => ({ CopyIcon: () => null }))

vi.mock('@/utilities/siteContext', () => ({
  getCurrentLocale: mocks.getCurrentLocale,
  getCurrentSite: mocks.getCurrentSite,
  getCurrentSitePrefix: vi.fn(() => ''),
}))

vi.mock('@/utilities/getSiteSettings', () => ({
  getCurrentSiteSettings: mocks.getCurrentSiteSettings,
}))

vi.mock('@/utilities/cmsPageQuery', () => ({
  queryPageByPath: mocks.queryPageByPath,
}))

vi.mock('@/utilities/pageLocaleInventory', () => ({
  queryPublishedPageLocalesByExactPath: mocks.queryPublishedPageLocalesByExactPath,
}))

vi.mock('@/utilities/generateMeta', () => ({
  generateMeta: mocks.generateMeta,
}))

import {
  generateCmsPageMetadataByPath,
  hasWingsGoCatalogFilterParams,
  WINGSGO_CATALOG_FILTER_PARAMS,
} from '@/app/(frontend)/cmsPage'

describe('US-092 Phase 3: Tour catalog SEO and filtered URL robots', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getCurrentLocale.mockResolvedValue('vi')
    mocks.getCurrentSite.mockResolvedValue({ code: 'wings-go' })
    mocks.getCurrentSiteSettings.mockResolvedValue({})
    mocks.queryPageByPath.mockResolvedValue({ id: 1, title: 'Tour' })
    mocks.queryPublishedPageLocalesByExactPath.mockResolvedValue(['vi', 'en'])
    mocks.generateMeta.mockImplementation(({ locale, path: _path }: { locale?: string; path?: string }) =>
      Promise.resolve({
        alternates: {
          canonical:
            locale === 'en'
              ? 'https://wingsgo.vn/en/tour'
              : 'https://wingsgo.vn/tour',
        },
        title: 'Tour Catalog',
      }),
    )
  })

  describe('hasWingsGoCatalogFilterParams helper', () => {
    it('returns false for undefined or empty searchParams', () => {
      expect(hasWingsGoCatalogFilterParams()).toBe(false)
      expect(hasWingsGoCatalogFilterParams({})).toBe(false)
      expect(hasWingsGoCatalogFilterParams({ market: '' })).toBe(false)
    })

    it('returns false for unrelated query params', () => {
      expect(
        hasWingsGoCatalogFilterParams({
          fbclid: '12345',
          utm_source: 'google',
        }),
      ).toBe(false)
    })

    it.each(WINGSGO_CATALOG_FILTER_PARAMS)(
      'returns true when %s param is present',
      (paramKey) => {
        expect(hasWingsGoCatalogFilterParams({ [paramKey]: 'test-value' })).toBe(true)
      },
    )
  })

  describe('generateCmsPageMetadataByPath', () => {
    it('unfiltered /tour on wings-go remains indexable without robots override', async () => {
      const meta = await generateCmsPageMetadataByPath({
        requestedPath: '/tour',
      })
      expect(meta.robots).toBeUndefined()
      expect(meta.alternates?.canonical).toBe('https://wingsgo.vn/tour')
    })

    it.each(WINGSGO_CATALOG_FILTER_PARAMS)(
      'sets robots noindex, follow when %s param is present on wings-go /tour',
      async (paramKey) => {
        const meta = await generateCmsPageMetadataByPath({
          requestedPath: '/tour',
          searchParams: { [paramKey]: 'val' },
        })
        expect(meta.robots).toEqual({
          follow: true,
          index: false,
        })
        // Canonical stays clean
        expect(meta.alternates?.canonical).toBe('https://wingsgo.vn/tour')
      },
    )

    it('EN /en/tour with filtered params sets noindex, follow and keeps clean /en/tour canonical', async () => {
      mocks.getCurrentLocale.mockResolvedValue('en')
      const meta = await generateCmsPageMetadataByPath({
        requestedPath: '/tour',
        searchParams: { market: 'korea' },
      })
      expect(meta.robots).toEqual({
        follow: true,
        index: false,
      })
      expect(meta.alternates?.canonical).toBe('https://wingsgo.vn/en/tour')
    })

    it('does not apply noindex, follow for other sites such as wing-side', async () => {
      mocks.getCurrentSite.mockResolvedValue({ code: 'wing-side' })
      const meta = await generateCmsPageMetadataByPath({
        requestedPath: '/tour',
        searchParams: { market: 'korea' },
      })
      expect(meta.robots).toBeUndefined()
    })

    it('does not apply noindex, follow for non-catalog paths on wings-go', async () => {
      const meta = await generateCmsPageMetadataByPath({
        requestedPath: '/about',
        searchParams: { market: 'korea' },
      })
      expect(meta.robots).toBeUndefined()
    })
  })
})
