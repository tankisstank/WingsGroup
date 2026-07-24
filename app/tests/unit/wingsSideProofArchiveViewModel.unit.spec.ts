import { describe, expect, it } from 'vitest'

import type { CredentialsCarouselBlock } from '@/payload-types'
import {
  buildProofImageAlt,
  mapCredentialsBlockToProofRecords,
} from '@/components/WingsSideHiFi/proofArchiveViewModel'

const labels = {
  appointmentType: 'Airline appointment',
  awardType: 'Performance award',
  missingField: 'Not stated on document',
}

const media = (id: string) =>
  ({
    alt: id,
    height: 1200,
    id,
    url: `/${id}.jpg`,
    width: 900,
  }) as unknown as CredentialsCarouselBlock['items'][number]['image']

const row = (
  id: string,
  overrides: Partial<CredentialsCarouselBlock['items'][number]> = {},
): CredentialsCarouselBlock['items'][number] => ({
  description: `Summary ${id}`,
  id,
  image: media(id),
  issuer: `Issuer ${id}`,
  kind: 'cert',
  label: 'Certificate',
  mark: 'CERT',
  recipient: `Recipient ${id}`,
  recognitionYear: 2025,
  reviewStatus: 'verified',
  title: `Title ${id}`,
  ...overrides,
})

describe('WingsSide Proof Archive view model', () => {
  it('maps 24 CMS rows into the 21 public verified proof records', () => {
    const items = [
      ...Array.from({ length: 21 }, (_, index) =>
        row(`verified-${index + 1}`, {
          kind: index % 2 === 0 ? 'cert' : 'award',
          recognitionYear: index % 3 === 0 ? undefined : 2025,
        }),
      ),
      row('needs-review', { reviewStatus: 'needs-review' }),
      row('member-row', { kind: 'member' }),
      row('iso-row', { kind: 'iso' }),
    ]
    const block = { blockType: 'credentialsCarousel', items } as CredentialsCarouselBlock

    const records = mapCredentialsBlockToProofRecords(block, labels)

    expect(items).toHaveLength(24)
    expect(records).toHaveLength(21)
    expect(records.map((record) => record.id)).not.toContain('needs-review')
    expect(records.map((record) => record.category)).toEqual(
      expect.arrayContaining(['appointment', 'award']),
    )
  })

  it('suppresses unsupported, unverified, missing-image, and unstable-id rows', () => {
    const block = {
      blockType: 'credentialsCarousel',
      items: [
        row('verified'),
        row('needs-review', { reviewStatus: 'needs-review' }),
        row('member', { kind: 'member' }),
        row('iso', { kind: 'iso' }),
        row('missing-image', { image: undefined }),
        row('', { title: 'No id' }),
      ],
    } as CredentialsCarouselBlock

    const records = mapCredentialsBlockToProofRecords(block, labels)

    expect(records.map((record) => record.id)).toEqual(['verified'])
  })

  it('uses neutral localized display text and generated active image alt', () => {
    const block = {
      blockType: 'credentialsCarousel',
      items: [
        row('verified', {
          description: '',
          issuer: '',
          recipient: '',
          recognitionYear: undefined,
          title: '',
        }),
      ],
    } as CredentialsCarouselBlock

    const [record] = mapCredentialsBlockToProofRecords(block, labels)

    expect(record).toMatchObject({
      awardedEntity: 'Not stated on document',
      issuer: 'Not stated on document',
      summary: 'Not stated on document',
      title: 'Not stated on document',
      year: null,
    })
    expect(record?.imageAlt).toBe(
      'Not stated on document airline appointment issued to Not stated on document, Not stated on document',
    )
  })

  it('builds active document alt from issuer, proof type, entity, and year', () => {
    expect(
      buildProofImageAlt(
        {
          awardedEntity: 'Vietwings Travel',
          category: 'award',
          issuer: 'Air China',
          year: '2025',
        },
        labels,
      ),
    ).toBe('Air China performance award issued to Vietwings Travel, 2025')
  })
})
