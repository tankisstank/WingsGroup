import { describe, expect, it } from 'vitest'

import {
  getWingsSideHiFiCriticalGaps,
  resolveWingsSideHiFiPageModel,
  resolveWingsSideHiFiRouteVariant,
  WINGSSIDE_HIFI_MANDATORY_SECTIONS,
  WINGSSIDE_HIFI_PATH_TO_VARIANT,
} from '@/utilities/wingsSideHiFiPageModel'
import { WINGSSIDE_HIFI_COMPOSER_ROUTES } from '@/utilities/wingsSideHiFiComposer'
import { WINGSSIDE_HIFI_ROUTE_VARIANTS } from '@/fields/wingsSideHiFi'

describe('WingsSideHiFiPageModel resolver', () => {
  it('maps all 8 locked hub paths to route variants', () => {
    expect(WINGSSIDE_HIFI_COMPOSER_ROUTES).toHaveLength(8)
    expect(WINGSSIDE_HIFI_ROUTE_VARIANTS).toHaveLength(8)
    for (const path of WINGSSIDE_HIFI_COMPOSER_ROUTES) {
      expect(WINGSSIDE_HIFI_PATH_TO_VARIANT[path]).toBeTruthy()
      expect(resolveWingsSideHiFiRouteVariant(`/wingsside${path === '/' ? '' : path}`)).toBe(
        WINGSSIDE_HIFI_PATH_TO_VARIANT[path],
      )
    }
  })

  it('returns null for non-hub routes', () => {
    expect(resolveWingsSideHiFiPageModel({ page: {}, publicPathname: '/wingsside/tour/x' })).toBeNull()
  })

  it('exposes stable ordered mandatory sections per variant', () => {
    expect(WINGSSIDE_HIFI_MANDATORY_SECTIONS.home.map((s) => s.id)).toContain('home-creds')
    expect(WINGSSIDE_HIFI_MANDATORY_SECTIONS.packages.map((s) => s.id)).toEqual([
      'pkg-hero',
      'pkg-grid',
      'pkg-close',
    ])
    expect(WINGSSIDE_HIFI_MANDATORY_SECTIONS.contact.map((s) => s.id)).toContain('contact-form')
  })

  it('detects missing critical content when hi-fi is enabled', () => {
    const model = resolveWingsSideHiFiPageModel({
      locale: 'en',
      page: {
        title: 'Packages',
        wingsSideHiFi: {
          enabled: true,
          routeVariant: 'packages',
          packages: {
            cards: [{ title: 'Only one' }, { title: 'Two' }, { title: 'Three' }],
          },
        },
      },
      publicPathname: '/wingsside/packages',
    })

    expect(model).not.toBeNull()
    expect(model!.routeVariant).toBe('packages')
    expect(model!.isValid).toBe(false)
    const gaps = getWingsSideHiFiCriticalGaps(model)
    expect(gaps.some((g) => g.code === 'packages_card_count')).toBe(true)
    expect(gaps.some((g) => g.field === 'pkg-close' || g.code === 'missing_mandatory_section')).toBe(
      true,
    )
  })

  it('selects locale via getCopyLocale path and accepts complete enabled model', () => {
    const model = resolveWingsSideHiFiPageModel({
      locale: 'it',
      page: {
        title: 'Contact',
        layout: [{ blockType: 'formBlock', form: 12 }],
        wingsSideHiFi: {
          enabled: true,
          routeVariant: 'contact',
          hero: { title: 'Tell us about your Vietnam journey' },
          contact: {
            channels: [{ label: 'Email', value: 'hello@example.com' }],
            channelsTitle: 'Channels',
            closingTitle: 'Prefer a structured brief?',
            form: 12,
            nextSteps: [{ title: 'We reply' }],
            nextTitle: 'Next',
          },
        },
      },
      publicPathname: '/wingsside/it/contact-us',
    })

    expect(model!.locale).toBe('it')
    expect(model!.routeVariant).toBe('contact')
    expect(model!.sections.every((s) => s.present)).toBe(true)
    expect(model!.isValid).toBe(true)
  })

  it('flags routeVariant mismatch as critical', () => {
    const model = resolveWingsSideHiFiPageModel({
      page: {
        title: 'Home',
        wingsSideHiFi: {
          enabled: true,
          routeVariant: 'packages',
          home: { pillarsTitle: 'x' },
        },
      },
      publicPathname: '/wingsside',
    })
    expect(model!.issues.some((i) => i.code === 'route_variant_mismatch')).toBe(true)
  })
})
