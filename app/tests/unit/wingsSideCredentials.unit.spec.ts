import { describe, expect, it } from 'vitest'

import {
  buildVerifiedWingsSideHiFiHomeCredentials,
  buildWingsSideCredentialsBlock,
  loadWingsSideCredentialManifest,
  summarizeWingsSideCredentials,
} from '../../scripts/lib/wingsSideCredentials'

describe('WingSide photographed credential catalog', () => {
  it('keeps 24 traceable records with an explicit editorial review split', async () => {
    const manifest = await loadWingsSideCredentialManifest()
    const summary = summarizeWingsSideCredentials(manifest)

    expect(summary.total).toBe(24)
    expect(summary.verified).toBe(21)
    expect(summary.needsReview).toBe(3)
    expect(summary.oldestYear).toBe(2001)
    expect(summary.newestYear).toBe(2025)
    expect(summary.issuers).toEqual(
      expect.arrayContaining(['ANA', 'Asiana Airlines', 'Korean Air', 'VietJet Air']),
    )
  })

  it('builds a CMS block with complete Media and source traceability', async () => {
    const manifest = await loadWingsSideCredentialManifest()
    const mediaIDs = new Map(manifest.items.map((item, index) => [item.id, index + 1]))
    const block = buildWingsSideCredentialsBlock({ locale: 'vi', manifest, mediaIDs })

    expect(block.blockType).toBe('credentialsCarousel')
    expect(block.items).toHaveLength(24)
    expect(block.items.every((item) => item.image && item.issuer && item.recipient)).toBe(true)
    expect(block.items.map((item) => item.sourceFilename)).toContain('IMG_8399.JPG')
  })

  it('maps only reviewed facts into the smaller Home HiFi credential schema', async () => {
    const manifest = await loadWingsSideCredentialManifest()
    const cards = buildVerifiedWingsSideHiFiHomeCredentials(manifest)
    const verified = manifest.items.filter((item) => item.reviewStatus === 'verified')

    expect(cards).toHaveLength(21)
    expect(cards).toEqual(
      verified.map((item) => ({
        body: item.description,
        kind: item.kind,
        mark: item.mark,
        micro: item.label,
        title: item.title,
      })),
    )
    expect(cards.some((card) => card.title === 'Top travel agent recognition')).toBe(false)
  })
})
