import {
  bindingSnapshotChecksum,
  deterministicHiFiFilename,
  readRelationAtPath,
  WINGSSIDE_HIFI_ROLLBACK_MEDIA_POLICY,
  wingsSideHiFiAssets,
  wingsSidePageMediaBindings,
  writeRelationAtPath,
} from '../../scripts/lib/wingssideHifiAssets'
import { describe, expect, it } from 'vitest'

describe('WingSide hi-fi asset binding plan', () => {
  it('retains report-created media on rollback so Payload version history remains valid', () => {
    expect(WINGSSIDE_HIFI_ROLLBACK_MEDIA_POLICY).toBe(
      'retain-report-created-media-for-payload-version-history',
    )
  })

  it('uses deterministic content-addressed filenames', () => {
    const digest = 'abcdef1234567890'
    expect(deterministicHiFiFilename('Hero Halong.JPG', digest)).toBe(
      'wingsside-hifi-hero-halong-abcdef123456.jpg',
    )
  })

  it('targets approved WingSide hub page hero/meta bindings across the 8-page funnel', () => {
    const paths = new Set(wingsSidePageMediaBindings.map(({ pagePath }) => pagePath))
    const targets = wingsSidePageMediaBindings.map(({ fieldPath, pagePath }) => `${pagePath}:${fieldPath}`)

    expect(paths.has('/')).toBe(true)
    expect(paths.has('/packages')).toBe(true)
    expect(paths.has('/destinations')).toBe(true)
    expect(paths.has('/styles')).toBe(true)
    expect(paths.has('/plan-your-trip')).toBe(true)
    expect(paths.has('/contact-us')).toBe(true)
    expect(new Set(targets).size).toBe(targets.length)
    expect(wingsSidePageMediaBindings.every(({ asset }) => asset in wingsSideHiFiAssets)).toBe(true)
  })

  it('reads and writes only the requested relationship field', () => {
    const page = {
      hero: { media: { id: 10 }, untouched: 'keep' },
      layout: [{ media: 20 }],
    }

    expect(readRelationAtPath(page, 'hero.media')).toBe(10)
    expect(readRelationAtPath(page, 'layout.0.media')).toBe(20)

    writeRelationAtPath(page, 'hero.media', 30)
    expect(page).toEqual({
      hero: { media: 30, untouched: 'keep' },
      layout: [{ media: 20 }],
    })
  })

  it('produces stable checksums regardless of property insertion order', () => {
    expect(bindingSnapshotChecksum({ b: 2, a: 1 })).toBe(
      bindingSnapshotChecksum({ a: 1, b: 2 }),
    )
  })
})
