import { describe, expect, it } from 'vitest'

import { getWingsSideHiFiCta, getWingsSideHiFiNavItems } from '@/utilities/wingsSideHiFiNav'

describe('WingSide hi-fi nav IA (Bar B)', () => {
  it('exposes the locked 7-link primary nav without Search', () => {
    const items = getWingsSideHiFiNavItems('en')
    expect(items.map((item) => item.label)).toEqual([
      'Home',
      'Destinations',
      'Styles',
      'Packages',
      'Guide',
      'About',
      'Contact',
    ])
    expect(items.map((item) => item.href)).toEqual([
      '/',
      '/destinations',
      '/styles',
      '/packages',
      '/travel-guide',
      '/about-us',
      '/contact-us',
    ])
  })

  it('uses Plan trip as the primary CTA label in English', () => {
    expect(getWingsSideHiFiCta('en')).toEqual({ label: 'Plan trip', url: '/plan-your-trip' })
  })

  it('falls back to English for unknown locales', () => {
    expect(getWingsSideHiFiNavItems('fr')).toEqual(getWingsSideHiFiNavItems('en'))
  })
})
