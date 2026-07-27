import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getCurrentLocale: vi.fn(),
  getCurrentSite: vi.fn(),
  getCurrentSiteSettings: vi.fn(),
  getWingSideDiscoveryContext: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('notFound')
  }),
}))

vi.mock('@/tours/discovery', () => ({
  getWingSideDiscoveryContext: mocks.getWingSideDiscoveryContext,
}))

vi.mock('@/utilities/siteContext', () => ({
  getCurrentLocale: mocks.getCurrentLocale,
  getCurrentSite: mocks.getCurrentSite,
}))

vi.mock('@/utilities/getSiteSettings', () => ({
  getCurrentSiteSettings: mocks.getCurrentSiteSettings,
}))

import { generateMetadata } from '@/app/(frontend)/journeys/page'

describe('WingSide journeys metadata', () => {
  beforeEach(() => {
    mocks.getCurrentLocale.mockReset()
    mocks.getCurrentSite.mockReset()
    mocks.getCurrentSiteSettings.mockReset()
    mocks.getWingSideDiscoveryContext.mockReset()

    mocks.getCurrentLocale.mockResolvedValue('en')
    mocks.getCurrentSite.mockResolvedValue({
      additionalDomains: [],
      code: 'wing-side',
      defaultLocale: 'vi',
      id: 3,
      primaryDomain: 'wingside.vn',
      supportedLocales: ['vi', 'en', 'it', 'es', 'pt'],
    })
    mocks.getCurrentSiteSettings.mockResolvedValue({
      seo: { canonicalDomain: 'https://wingside.vn' },
      siteName: 'wingside.vn',
    })
    mocks.getWingSideDiscoveryContext.mockRejectedValue(new Error('inventory should not load'))
  })

  it('classifies filtered SEO from normalized params without loading discovery inventory', async () => {
    const metadata = await generateMetadata({
      searchParams: Promise.resolve({
        destination: 'hanoi',
        duration: '8-14',
        style: 'culture',
      }),
    })

    expect(mocks.getWingSideDiscoveryContext).not.toHaveBeenCalled()
    expect(metadata.alternates?.canonical).toBe('https://wingside.vn/journeys')
    expect(metadata.alternates?.languages).toMatchObject({
      en: 'https://wingside.vn/journeys',
      es: 'https://wingside.vn/es/journeys',
      it: 'https://wingside.vn/it/journeys',
      pt: 'https://wingside.vn/pt/journeys',
      vi: 'https://wingside.vn/vi/journeys',
    })
    expect(metadata.robots).toEqual({ follow: true, index: false })
  })

  it('keeps base journeys indexable through the same pure policy path', async () => {
    const metadata = await generateMetadata({ searchParams: Promise.resolve({}) })

    expect(mocks.getWingSideDiscoveryContext).not.toHaveBeenCalled()
    expect(metadata.alternates?.canonical).toBe('https://wingside.vn/journeys')
    expect(metadata.robots).toEqual({ follow: true, index: true })
  })

  it('keeps invalid-only queries canonical and noindex without inventory lookup', async () => {
    const metadata = await generateMetadata({
      searchParams: Promise.resolve({ destination: 'bogus', debug: 'raw-secret' }),
    })

    expect(mocks.getWingSideDiscoveryContext).not.toHaveBeenCalled()
    expect(metadata.alternates?.canonical).toBe('https://wingside.vn/journeys')
    expect(metadata.robots).toEqual({ follow: true, index: false })
  })
})
