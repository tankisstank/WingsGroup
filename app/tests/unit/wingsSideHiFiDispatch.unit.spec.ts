import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  buildWingsSideHiFiFallbackSource,
  isWingsSideHiFiB1Route,
  resolveWingsSideHiFiPageBodyModel,
  shouldRenderWingsSideHiFiPageBody,
  shouldUseWingsSideHiFiCopyFallback,
  WINGSSIDE_HIFI_B1_ROUTES,
} from '@/utilities/wingsSideHiFiDispatch'

describe('WingSide hi-fi official route dispatch', () => {
  const originalFallback = process.env.WINGSSIDE_HIFI_COPY_FALLBACK

  afterEach(() => {
    if (originalFallback === undefined) delete process.env.WINGSSIDE_HIFI_COPY_FALLBACK
    else process.env.WINGSSIDE_HIFI_COPY_FALLBACK = originalFallback
    vi.unstubAllEnvs()
  })

  it('wires all eight official hub routes', () => {
    expect(WINGSSIDE_HIFI_B1_ROUTES).toEqual([
      '/',
      '/plan-your-trip',
      '/destinations',
      '/styles',
      '/packages',
      '/travel-guide',
      '/about-us',
      '/contact-us',
    ])
    expect(isWingsSideHiFiB1Route('/')).toBe(true)
    expect(isWingsSideHiFiB1Route('/plan-your-trip')).toBe(true)
    expect(isWingsSideHiFiB1Route('/packages')).toBe(true)
    expect(isWingsSideHiFiB1Route('/tour/example')).toBe(false)
  })

  it('only renders hi-fi body for wing-side + official route + model', () => {
    const model = resolveWingsSideHiFiPageBodyModel({
      locale: 'en',
      page: {
        title: 'Home',
        wingsSideHiFi: {
          enabled: true,
          routeVariant: 'home',
          hero: { title: 'Tailor-made Vietnam journeys' },
          home: {
            pillarsTitle: 'Steps',
            pillars: [{ label: '1', title: 'Brief', body: 'Send brief' }],
            whyTitle: 'Why',
            whyCards: [{ title: 'A', body: 'B', cta: 'Go', href: '/' }],
            destTitle: 'Dest',
            stylesTitle: 'Styles',
            journeysTitle: 'Journeys',
            notes: [{ title: 'N', body: 'B' }],
            closeTitle: 'Close',
            related: [{ title: 'R', body: 'B', href: '/packages' }],
            credentials: [{ mark: 'X', title: 'T', body: 'B', kind: 'cert', micro: 'm' }],
          },
        },
      },
      publicPathname: '/',
    })

    expect(model).toBeTruthy()
    expect(
      shouldRenderWingsSideHiFiPageBody({
        model,
        publicPathname: '/',
        siteCode: 'wing-side',
      }),
    ).toBe(true)
    expect(
      shouldRenderWingsSideHiFiPageBody({
        model,
        publicPathname: '/',
        siteCode: 'wings-go',
      }),
    ).toBe(false)
    expect(
      shouldRenderWingsSideHiFiPageBody({
        model,
        publicPathname: '/packages',
        siteCode: 'wing-side',
      }),
    ).toBe(true)
    expect(
      shouldRenderWingsSideHiFiPageBody({
        model,
        publicPathname: '/tour/example',
        siteCode: 'wing-side',
      }),
    ).toBe(false)
  })

  it('never lets Copy.ts fallback override CMS-enabled documents', () => {
    process.env.WINGSSIDE_HIFI_COPY_FALLBACK = 'true'
    expect(
      shouldUseWingsSideHiFiCopyFallback({
        page: { wingsSideHiFi: { enabled: true } },
      }),
    ).toBe(false)

    const cmsTitle = 'CMS Home Title'
    const model = resolveWingsSideHiFiPageBodyModel({
      locale: 'en',
      page: {
        title: 'Home',
        wingsSideHiFi: {
          enabled: true,
          routeVariant: 'home',
          hero: { title: cmsTitle },
          home: {
            pillarsTitle: 'Steps',
            pillars: [{ label: '1', title: 'Brief', body: 'Send' }],
            whyTitle: 'Why',
            destTitle: 'Dest',
            stylesTitle: 'Styles',
            journeysTitle: 'Journeys',
            notes: [{ title: 'N', body: 'B' }],
            closeTitle: 'Close',
            related: [{ title: 'R', body: 'B', href: '/' }],
            credentials: [{ mark: 'X', title: 'T', body: 'B', kind: 'cert', micro: 'm' }],
          },
        },
      },
      publicPathname: '/',
    })
    expect(model?.hero.title).toBe(cmsTitle)
  })

  it('plan fallback uses dedicated plan heroTitle, not stepsTitle', () => {
    process.env.WINGSSIDE_HIFI_COPY_FALLBACK = 'true'
    vi.stubEnv('NODE_ENV', 'development')
    const model = resolveWingsSideHiFiPageBodyModel({
      locale: 'en',
      page: { wingsSideHiFi: { enabled: false } },
      publicPathname: '/plan-your-trip',
    })
    expect(model?.hero.title).toBe('Plan your Vietnam journey with a local team')
    expect(model?.hero.title).not.toBe('Four steps from brief to private route')
    expect(model?.hero.primaryCta?.label).toBe('Share your brief')
    expect(model?.routeContent?.heroLede).toMatch(/Custom routes, hotels, and pacing/i)
    expect(model?.routeContent?.heroLede).not.toMatch(/One local planning desk/i)
  })

  it('fail-closed Copy fallback only when explicitly allowed and CMS not enabled', () => {
    vi.stubEnv('NODE_ENV', 'development')
    process.env.WINGSSIDE_HIFI_COPY_FALLBACK = 'true'
    expect(
      shouldUseWingsSideHiFiCopyFallback({ page: { wingsSideHiFi: { enabled: false } } }),
    ).toBe(true)

    vi.stubEnv('NODE_ENV', 'production')
    delete process.env.WINGSSIDE_HIFI_COPY_FALLBACK
    expect(
      shouldUseWingsSideHiFiCopyFallback({ page: { wingsSideHiFi: { enabled: false } } }),
    ).toBe(false)

    const fallback = buildWingsSideHiFiFallbackSource('en', '/')
    expect(fallback.wingsSideHiFi?.enabled).toBe(true)
    expect(fallback.wingsSideHiFi?.routeVariant).toBe('home')
  })
})
