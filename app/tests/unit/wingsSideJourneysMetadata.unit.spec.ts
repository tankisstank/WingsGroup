import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getCurrentLocale: vi.fn(),
  getCurrentSite: vi.fn(),
  getCurrentSiteSettings: vi.fn(),
  generateCmsPageMetadataByPath: vi.fn(),
  getWingSideDiscoveryContext: vi.fn(),
  renderCmsPageByPath: vi.fn(),
}))

vi.mock('@/tours/discovery', () => ({
  getWingSideDiscoveryContext: mocks.getWingSideDiscoveryContext,
}))

vi.mock('@/app/(frontend)/cmsPage', () => ({
  generateCmsPageMetadataByPath: mocks.generateCmsPageMetadataByPath,
  renderCmsPageByPath: mocks.renderCmsPageByPath,
}))

vi.mock('@/app/(frontend)/journeys/WingSideJourneysClient', () => ({
  WingSideJourneysClient: ({ locale }: { locale: string }) =>
    React.createElement('main', { 'data-testid': 'wingsside-journeys' }, `WingSide ${locale}`),
}))

vi.mock('@/utilities/siteContext', () => ({
  getCurrentLocale: mocks.getCurrentLocale,
  getCurrentSite: mocks.getCurrentSite,
}))

vi.mock('@/utilities/getSiteSettings', () => ({
  getCurrentSiteSettings: mocks.getCurrentSiteSettings,
}))

import JourneysPage, { generateMetadata } from '@/app/(frontend)/journeys/page'

describe('WingSide journeys route', () => {
  beforeEach(() => {
    mocks.getCurrentLocale.mockReset()
    mocks.getCurrentSite.mockReset()
    mocks.generateCmsPageMetadataByPath.mockReset()
    mocks.getCurrentSiteSettings.mockReset()
    mocks.getWingSideDiscoveryContext.mockReset()
    mocks.renderCmsPageByPath.mockReset()

    mocks.getCurrentLocale.mockResolvedValue('en')
    mocks.getCurrentSite.mockResolvedValue({
      additionalDomains: [],
      code: 'wing-side',
      defaultLocale: 'en',
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


  it('keeps WingSide supported locales on guided discovery render', async () => {
    mocks.getWingSideDiscoveryContext.mockResolvedValue({ discovery: 'context' })

    const element = await JourneysPage({ searchParams: Promise.resolve({}) })

    expect(mocks.renderCmsPageByPath).not.toHaveBeenCalled()
    expect(mocks.getWingSideDiscoveryContext).toHaveBeenCalledWith({ input: {}, locale: 'en' })
    expect(React.isValidElement(element)).toBe(true)
    expect((element as React.ReactElement).props).toMatchObject({ locale: 'en' })
  })

  it('delegates another tenant published CMS /journeys render and metadata', async () => {
    const cmsElement = React.createElement('article', { 'data-testid': 'cms-journeys' }, 'Journeys')
    const cmsMetadata = {
      description: 'Generic tenant journeys page',
      title: 'Journeys | WingsGo',
    }
    mocks.getCurrentSite.mockResolvedValue({
      additionalDomains: [],
      code: 'wingsgo',
      defaultLocale: 'vi',
      id: 2,
      primaryDomain: 'wingsgo.test',
      supportedLocales: ['vi', 'en'],
    })
    mocks.renderCmsPageByPath.mockResolvedValue(cmsElement)
    mocks.generateCmsPageMetadataByPath.mockResolvedValue(cmsMetadata)

    const searchParams = Promise.resolve({ ref: 'newsletter' })
    const rendered = await JourneysPage({ searchParams })
    const metadata = await generateMetadata({ searchParams: Promise.resolve({}) })

    expect(rendered).toBe(cmsElement)
    expect(metadata).toBe(cmsMetadata)
    expect(mocks.renderCmsPageByPath).toHaveBeenCalledWith({
      requestedPath: '/journeys',
      searchParams,
    })
    expect(mocks.generateCmsPageMetadataByPath).toHaveBeenCalledWith({ requestedPath: '/journeys' })
    expect(mocks.getWingSideDiscoveryContext).not.toHaveBeenCalled()
  })

  it('keeps absent non-WingSide CMS /journeys fail-closed through catch-all behavior', async () => {
    const failClosedElement = React.createElement('div', { 'data-testid': 'payload-redirects' })
    mocks.getCurrentSite.mockResolvedValue({
      additionalDomains: [],
      code: 'wingspass',
      defaultLocale: 'vi',
      id: 6,
      primaryDomain: 'wingspass.test',
      supportedLocales: ['vi', 'en'],
    })
    mocks.renderCmsPageByPath.mockResolvedValue(failClosedElement)

    const rendered = await JourneysPage({ searchParams: Promise.resolve({}) })

    expect(rendered).toBe(failClosedElement)
    expect(mocks.renderCmsPageByPath).toHaveBeenCalledWith({
      requestedPath: '/journeys',
      searchParams: expect.any(Promise),
    })
    expect(mocks.getWingSideDiscoveryContext).not.toHaveBeenCalled()
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
