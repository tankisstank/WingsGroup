import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getCurrentLocale: vi.fn(),
  getCurrentPublicPathname: vi.fn(),
  getCurrentSite: vi.fn(),
  getCurrentSiteSettings: vi.fn(),
}))

vi.mock('@/utilities/getSiteSettings', () => ({
  getCurrentSiteSettings: mocks.getCurrentSiteSettings,
}))

vi.mock('@/utilities/siteContext', () => ({
  getCurrentLocale: mocks.getCurrentLocale,
  getCurrentPublicPathname: mocks.getCurrentPublicPathname,
  getCurrentSite: mocks.getCurrentSite,
}))

import { Header } from '@/Header/Component'

describe('Header site identity', () => {
  beforeEach(() => {
    mocks.getCurrentLocale.mockResolvedValue('en')
    mocks.getCurrentPublicPathname.mockResolvedValue('/')
    mocks.getCurrentSiteSettings.mockResolvedValue({
      branding: { themeKey: 'custom' },
      headerNavItems: [],
      siteName: 'Custom visual theme',
    })
  })

  it('keeps WingSide consultative behavior when its visual theme is custom', async () => {
    mocks.getCurrentSite.mockResolvedValue({ code: 'wings-side' })

    const header = await Header()

    expect(header.props).toMatchObject({
      primaryAction: { label: 'Plan trip', url: '/plan-your-trip' },
      siteCode: 'wings-side',
      themeKey: 'custom',
    })
    expect(header.props.primaryAction.url).not.toBe('/lien-he')
  })

  it('does not give a custom-themed non-WingSide site WingSide behavior', async () => {
    mocks.getCurrentSite.mockResolvedValue({ code: 'wings-plus' })

    const header = await Header()

    expect(header.props).toMatchObject({
      primaryAction: { label: 'Request proposal', url: '/request-proposal' },
      siteCode: 'wings-plus',
      themeKey: 'custom',
    })
  })
})
