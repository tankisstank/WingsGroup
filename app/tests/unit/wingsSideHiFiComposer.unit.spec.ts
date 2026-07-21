import { describe, expect, it } from 'vitest'

import {
  filterCmsLayoutBlocksForHiFiComposer,
  isWingsSideHiFiComposerRoute,
  shouldUseWingsSideHiFiComposer,
  wingsSideHiFiRequiredOdIds,
  WINGSSIDE_HIFI_COMPOSER_ROUTES,
} from '@/utilities/wingsSideHiFiComposer'
import {
  getWingsSideHiFiPublicUrl,
  WINGSSIDE_HIFI_HOME_JOURNEY_COUNT,
  wingsSideHiFiAssets,
  wingsSideHiFiCardBindings,
} from '@/utilities/wingsSideHiFiMedia'

describe('WingSide HiFi composer (Bar B)', () => {
  it('covers the locked 8 hub routes', () => {
    expect(WINGSSIDE_HIFI_COMPOSER_ROUTES).toHaveLength(8)
    expect(isWingsSideHiFiComposerRoute('/packages')).toBe(true)
    expect(isWingsSideHiFiComposerRoute('/tour/foo')).toBe(false)
  })

  it('enables composer only for wings-side hub paths', () => {
    expect(shouldUseWingsSideHiFiComposer('wings-side', '/wingsside/en/packages')).toBe(true)
    expect(shouldUseWingsSideHiFiComposer('wings-side', '/wingsside')).toBe(true)
    expect(shouldUseWingsSideHiFiComposer('wings-go', '/wingsside/packages')).toBe(false)
    expect(shouldUseWingsSideHiFiComposer('wings-side', '/wingsside/en/tour/x')).toBe(false)
  })

  it('keeps only form blocks when filtering CMS layout', () => {
    const filtered = filterCmsLayoutBlocksForHiFiComposer([
      { blockType: 'featureGrid' },
      { blockType: 'formBlock' },
      { blockType: 'mediaBlock' },
      { blockType: 'form' },
    ] as never)
    expect(filtered.map((block) => block.blockType)).toEqual(['formBlock', 'form'])
  })

  it('requires home credentials od-id in inventory contract', () => {
    expect(wingsSideHiFiRequiredOdIds['/']).toContain('home-creds')
  })
})

describe('WingSide HiFi media bindings', () => {
  it('exposes public URLs for every catalog asset', () => {
    for (const key of Object.keys(wingsSideHiFiAssets) as Array<keyof typeof wingsSideHiFiAssets>) {
      expect(getWingsSideHiFiPublicUrl(key)).toMatch(/^\/wingsside-hifi\/.+\.(jpg|png)$/)
    }
  })

  it('binds destination/style/package grids to licensed assets', () => {
    expect(wingsSideHiFiCardBindings.destinations).toHaveLength(6)
    expect(wingsSideHiFiCardBindings.styles).toHaveLength(6)
    expect(wingsSideHiFiCardBindings.packages).toHaveLength(5)
    // Home shows 3 sample journeys; packages route still seeds 5.
    expect(WINGSSIDE_HIFI_HOME_JOURNEY_COUNT).toBe(3)
    expect(wingsSideHiFiCardBindings.styles.map((c) => c.href)).toEqual(
      expect.arrayContaining(['/styles/luxury', '/styles#wellness', '/styles#business']),
    )
    expect(new Set(wingsSideHiFiCardBindings.styles.map((c) => c.href)).size).toBe(6)
    expect(wingsSideHiFiCardBindings.destinations.every((card) => card.asset in wingsSideHiFiAssets)).toBe(
      true,
    )
  })
})
