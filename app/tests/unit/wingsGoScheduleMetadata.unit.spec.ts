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
  hasWingsGoScheduleFilterParams,
  WINGSGO_SCHEDULE_FILTER_PARAMS,
} from '@/app/(frontend)/cmsPage'

describe('US-093 Phase 3: Departure schedule SEO and filtered URL robots', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getCurrentLocale.mockResolvedValue('vi')
    mocks.getCurrentSite.mockResolvedValue({ code: 'wings-go' })
    mocks.getCurrentSiteSettings.mockResolvedValue({})
    mocks.queryPageByPath.mockResolvedValue({ id: 1, title: 'Lịch khởi hành' })
    mocks.queryPublishedPageLocalesByExactPath.mockResolvedValue(['vi', 'en'])
    mocks.generateMeta.mockImplementation(
      ({ locale, path: _path }: { locale?: string; path?: string }) =>
        Promise.resolve({
          alternates: {
            canonical:
              locale === 'en'
                ? 'https://wingsgo.vn/en/lich-khoi-hanh'
                : 'https://wingsgo.vn/lich-khoi-hanh',
          },
          robots: { follow: true, index: true },
          title: 'Lịch khởi hành | WingsGo',
        }),
    )
  })

  describe('hasWingsGoScheduleFilterParams', () => {
    it('defines whitelist params correctly (market, month, airline, status, q, sort, view)', () => {
      expect(WINGSGO_SCHEDULE_FILTER_PARAMS).toEqual([
        'market',
        'month',
        'airline',
        'status',
        'q',
        'sort',
        'view',
      ])
    })

    it('returns true when any whitelist param is present', () => {
      expect(hasWingsGoScheduleFilterParams({ market: 'korea' })).toBe(true)
      expect(hasWingsGoScheduleFilterParams({ month: '2026-11' })).toBe(true)
      expect(hasWingsGoScheduleFilterParams({ airline: 'VJ' })).toBe(true)
      expect(hasWingsGoScheduleFilterParams({ status: 'open' })).toBe(true)
      expect(hasWingsGoScheduleFilterParams({ q: 'seoul' })).toBe(true)
      expect(hasWingsGoScheduleFilterParams({ sort: 'price' })).toBe(true)
      expect(hasWingsGoScheduleFilterParams({ view: 'tour' })).toBe(true)
    })

    it('returns true even for invalid whitelist values (per D9)', () => {
      expect(hasWingsGoScheduleFilterParams({ market: 'invalid_market_xyz' })).toBe(true)
      expect(hasWingsGoScheduleFilterParams({ status: 'not-a-status' })).toBe(true)
    })

    it('returns false when no params or only non-whitelist params are present', () => {
      expect(hasWingsGoScheduleFilterParams(null)).toBe(false)
      expect(hasWingsGoScheduleFilterParams(undefined)).toBe(false)
      expect(hasWingsGoScheduleFilterParams({})).toBe(false)
      expect(
        hasWingsGoScheduleFilterParams({
          utm_source: 'facebook',
          utm_medium: 'cpc',
          utm_campaign: 'promo',
        }),
      ).toBe(false)
    })

    it('returns false for empty string values', () => {
      expect(hasWingsGoScheduleFilterParams({ market: '', q: '' })).toBe(false)
      expect(hasWingsGoScheduleFilterParams({ airline: [] })).toBe(false)
    })
  })

  describe('generateCmsPageMetadataByPath on /lich-khoi-hanh', () => {
    it('keeps index: true when URL has no filters (clean canonical)', async () => {
      const meta = await generateCmsPageMetadataByPath({
        requestedPath: '/lich-khoi-hanh',
        searchParams: {},
      })
      expect(meta.robots).toEqual({ follow: true, index: true })
      expect(meta.alternates?.canonical).toBe('https://wingsgo.vn/lich-khoi-hanh')
    })

    it('keeps index: true when only tracking params (utm_*) are present', async () => {
      const meta = await generateCmsPageMetadataByPath({
        requestedPath: '/lich-khoi-hanh',
        searchParams: { utm_source: 'google', utm_medium: 'cpc' },
      })
      expect(meta.robots).toEqual({ follow: true, index: true })
      expect(meta.alternates?.canonical).toBe('https://wingsgo.vn/lich-khoi-hanh')
    })

    it('sets noindex, follow when ?view=tour is present', async () => {
      const meta = await generateCmsPageMetadataByPath({
        requestedPath: '/lich-khoi-hanh',
        searchParams: { view: 'tour' },
      })
      expect(meta.robots).toEqual({ follow: true, index: false })
      expect(meta.alternates?.canonical).toBe('https://wingsgo.vn/lich-khoi-hanh')
    })

    it('sets noindex, follow when ?sort=price is present', async () => {
      const meta = await generateCmsPageMetadataByPath({
        requestedPath: '/lich-khoi-hanh',
        searchParams: { sort: 'price' },
      })
      expect(meta.robots).toEqual({ follow: true, index: false })
      expect(meta.alternates?.canonical).toBe('https://wingsgo.vn/lich-khoi-hanh')
    })

    it('sets noindex, follow when invalid param value (?market=xyz) is present', async () => {
      const meta = await generateCmsPageMetadataByPath({
        requestedPath: '/lich-khoi-hanh',
        searchParams: { market: 'xyz' },
      })
      expect(meta.robots).toEqual({ follow: true, index: false })
      expect(meta.alternates?.canonical).toBe('https://wingsgo.vn/lich-khoi-hanh')
    })

    it('sets noindex, follow on EN page /en/lich-khoi-hanh with filter', async () => {
      mocks.getCurrentLocale.mockResolvedValue('en')
      const meta = await generateCmsPageMetadataByPath({
        requestedPath: '/en/lich-khoi-hanh',
        searchParams: { month: '2026-11' },
      })
      expect(meta.robots).toEqual({ follow: true, index: false })
      expect(meta.alternates?.canonical).toBe('https://wingsgo.vn/en/lich-khoi-hanh')
    })

    it('does NOT set noindex on non-WingsGo sites', async () => {
      mocks.getCurrentSite.mockResolvedValue({ code: 'wings-group' })
      const meta = await generateCmsPageMetadataByPath({
        requestedPath: '/lich-khoi-hanh',
        searchParams: { market: 'korea' },
      })
      expect(meta.robots).toEqual({ follow: true, index: true })
    })
  })
})
