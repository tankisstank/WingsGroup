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

  it('enables composer only for wing-side hub paths', () => {
    expect(shouldUseWingsSideHiFiComposer('wing-side', '/wingsside/en/packages')).toBe(true)
    expect(shouldUseWingsSideHiFiComposer('wing-side', '/wingsside')).toBe(true)
    expect(shouldUseWingsSideHiFiComposer('wings-go', '/wingsside/packages')).toBe(false)
    expect(shouldUseWingsSideHiFiComposer('wing-side', '/wingsside/en/tour/x')).toBe(false)
  })

  it('keeps forms and reusable credentials blocks when filtering CMS layout', () => {
    const filtered = filterCmsLayoutBlocksForHiFiComposer([
      { blockType: 'featureGrid' },
      { blockType: 'formBlock' },
      { blockType: 'mediaBlock' },
      { blockType: 'form' },
      { blockType: 'credentialsCarousel' },
    ] as never)
    expect(filtered.map((block) => block.blockType)).toEqual([
      'formBlock',
      'form',
      'credentialsCarousel',
    ])
  })

  it('removes only the form consumed by a route conversion slot', () => {
    const filtered = filterCmsLayoutBlocksForHiFiComposer(
      [
        { blockType: 'formBlock', form: { id: 20 } },
        { blockType: 'formBlock', form: { id: 21 } },
        { blockType: 'credentialsCarousel' },
      ] as never,
      { id: 20 },
    )

    expect(filtered).toHaveLength(2)
    expect((filtered[0] as { form?: { id?: number } }).form?.id).toBe(21)
    expect(filtered[1]?.blockType).toBe('credentialsCarousel')
  })

  it('requires home credentials od-id in inventory contract', () => {
    expect(wingsSideHiFiRequiredOdIds['/']).toContain('home-creds')
  })

  it('publishes the card and conversion marker contract for all eight routes', () => {
    expect(wingsSideHiFiRequiredOdIds['/packages']).toEqual(
      expect.arrayContaining(['pkg-highlights', 'pkg-family', 'pkg-south', 'pkg-mid-cta']),
    )
    expect(wingsSideHiFiRequiredOdIds['/contact-us']).toEqual(
      expect.arrayContaining(['contact-form', 'contact-submit', 'channel-wa', 'contact-bridge']),
    )
    expect(wingsSideHiFiRequiredOdIds['/travel-guide']).toEqual(
      expect.arrayContaining(['note-1', 'note-2', 'note-3', 'guide-empty-rule']),
    )
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
    expect(wingsSideHiFiCardBindings.styles.map((c) => c.href)).toEqual([
      '/journeys?style=luxury',
      '/journeys?style=family',
      '/journeys?style=culture',
      '/journeys?style=adventure',
      '/journeys?style=wellness',
      '/journeys?style=romance',
    ])
    expect(new Set(wingsSideHiFiCardBindings.styles.map((c) => c.href)).size).toBe(6)
    expect(
      wingsSideHiFiCardBindings.destinations.every((card) => card.asset in wingsSideHiFiAssets),
    ).toBe(true)
  })
})
