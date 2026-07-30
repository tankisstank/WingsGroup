import { describe, expect, it } from 'vitest'

import {
  buildUs055RehearsalHomeCredentials,
  buildWingsSideCredentialsBlock,
  loadWingsSideCredentialManifest,
  summarizeWingsSideCredentials,
  US055_REHEARSAL_HOME_CREDENTIAL_SOURCE_CHECKSUM,
  US055_REHEARSAL_HOME_CREDENTIAL_SOURCE_IDS,
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

  it('maps only the two identity-safe historical Vietwings sources into the local fixture', async () => {
    const manifest = await loadWingsSideCredentialManifest()
    const cards = buildUs055RehearsalHomeCredentials(manifest)
    const selected = US055_REHEARSAL_HOME_CREDENTIAL_SOURCE_IDS.map((id) => {
      const item = manifest.items.find((candidate) => candidate.id === id)
      expect(item, `missing fixture source ${id}`).toBeDefined()
      return item!
    })

    expect(US055_REHEARSAL_HOME_CREDENTIAL_SOURCE_IDS).toEqual([
      'vietjet-vietwings-authorized-agent-2022',
      'air-china-outstanding-contribution-2025',
    ])
    expect(US055_REHEARSAL_HOME_CREDENTIAL_SOURCE_CHECKSUM).toBe(
      '5dd835e0887b5a5c7a723a89b64be4e218c8862381fe664fbc4d64907b495466',
    )
    expect(
      selected.map(({ id, issuer, recognitionYear, recipient, referenceCode }) => ({
        id,
        issuer,
        recognitionYear,
        recipient,
        referenceCode,
      })),
    ).toEqual([
      {
        id: 'vietjet-vietwings-authorized-agent-2022',
        issuer: 'VietJet Air',
        recognitionYear: 2022,
        recipient: 'Vietwings Travel JSC',
        referenceCode: 'VJC 37410015',
      },
      {
        id: 'air-china-outstanding-contribution-2025',
        issuer: 'Air China',
        recognitionYear: 2025,
        recipient: 'Vietwings',
        referenceCode: undefined,
      },
    ])
    expect(cards).toEqual(
      selected.map((item) => ({
        body: item.description,
        kind: item.kind,
        mark: item.mark,
        micro: item.label,
        title: item.title,
      })),
    )
    expect(cards).toHaveLength(2)
  })

  it.each([
    ['title', 'Drifted title'],
    ['description', 'Drifted description'],
    ['kind', 'award'],
    ['mark', 'DRIFT'],
    ['label', 'Drifted label'],
    ['issuedOn', '2022-10-02'],
    ['sourceFilename', 'DRIFT.JPG'],
    ['recipient', 'Golden Flight'],
    ['issuer', 'Drifted issuer'],
    ['recognitionYear', 2023],
    ['referenceCode', 'DRIFT'],
    ['reviewStatus', 'needs-review'],
  ] as const)('fails closed when approved source field %s drifts', async (field, value) => {
    const manifest = await loadWingsSideCredentialManifest()
    const vietJetIndex = manifest.items.findIndex(
      (item) => item.id === 'vietjet-vietwings-authorized-agent-2022',
    )
    const drifted = structuredClone(manifest)
    Object.assign(drifted.items[vietJetIndex]!, { [field]: value })
    expect(() => buildUs055RehearsalHomeCredentials(drifted)).toThrow(
      'approved source fields drifted',
    )
  })

  it('rejects source ID drift and never selects ambiguous recipients', async () => {
    const manifest = await loadWingsSideCredentialManifest()
    const drifted = structuredClone(manifest)
    drifted.items.find(
      (item) => item.id === 'vietjet-vietwings-authorized-agent-2022',
    )!.id = 'drifted-source-id'
    expect(() => buildUs055RehearsalHomeCredentials(drifted)).toThrow('missing source')

    expect(US055_REHEARSAL_HOME_CREDENTIAL_SOURCE_IDS).not.toContain(
      'bamboo-vietwings-authorized-agent',
    )
    expect(
      US055_REHEARSAL_HOME_CREDENTIAL_SOURCE_IDS.some((id) => id.includes('golden-flight')),
    ).toBe(false)
  })
})
