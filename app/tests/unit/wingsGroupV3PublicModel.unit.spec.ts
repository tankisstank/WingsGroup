import { describe, expect, it } from 'vitest'

import {
  composeWingsGroupHomeBlocks,
  getApprovedProofRecords,
  getWingsGroupHomeSection,
  isWingsGroupPublishedMedia,
  normalizeWingSidePath,
  resolveEcosystemCTA,
  resolveSafeHeroLinks,
} from '@/components/WingsGroupV3/model'
import type { Media, Page, WingsGroupEcosystemBlock } from '@/payload-types'

const sha = 'a'.repeat(64)

const governedMedia = (overrides: Partial<Media> = {}): Media =>
  ({
    alt: 'A governed WingsGroup editorial scene',
    createdAt: '2026-08-14T00:00:00.000Z',
    governance: {
      derivativeState: 'verified',
      managedBy: 'wingsgroup-v3',
      publicationState: 'published',
      responsiveDerivatives: [
        { format: 'webp', sha256: sha, url: 'https://cdn.example/a.webp', width: 1280 },
        { format: 'avif', sha256: sha, url: 'https://cdn.example/a.avif', width: 1280 },
      ],
      rightsState: 'approved',
    },
    id: 1,
    site: 1,
    updatedAt: '2026-08-14T00:00:00.000Z',
    url: '/media/a.png',
    ...overrides,
  }) as Media

const profile = (
  overrides: Partial<WingsGroupEcosystemBlock['profiles'][number]> = {},
): WingsGroupEcosystemBlock['profiles'][number] => ({
  brandKey: 'wing-side',
  brandName: 'WingSide',
  cta: {
    label: 'Explore WingSide',
    state: 'contact-fallback',
  },
  description: 'Private journeys designed around the traveller.',
  proofState: 'pending',
  serviceScope: [{ label: 'Private journeys' }],
  stageMedia: governedMedia(),
  ...overrides,
})

describe('WingsGroup v3 public view model', () => {
  it('requires the complete media publication contract', () => {
    expect(isWingsGroupPublishedMedia(governedMedia())).toBe(true)
    expect(
      isWingsGroupPublishedMedia(
        governedMedia({ governance: { managedBy: 'wingsgroup-v3', publicationState: 'ready' } }),
      ),
    ).toBe(false)
    expect(isWingsGroupPublishedMedia(governedMedia({ alt: '' }))).toBe(false)
  })

  it('fails deep links closed and never emits the legacy WingSide slug', () => {
    expect(
      resolveEcosystemCTA(
        profile({
          cta: { label: 'WingSide', state: 'approved-deep-link', url: 'https://wingside.vn' },
        }),
        'en',
      ),
    ).toEqual({
      href: '/lien-he#contact-form',
      isFallback: true,
      label: 'WingSide',
    })

    expect(
      resolveEcosystemCTA(
        profile({
          cta: {
            canonicalEvidence: 'canonical-check',
            httpEvidence: 'http-200',
            label: 'WingSide',
            owner: 'Destination owner',
            ownerApprovalEvidence: 'owner-approval',
            state: 'approved-deep-link',
            trackingEvidence: 'tracking-qa',
            url: 'https://wingside.vn',
          },
        }),
      ),
    ).toMatchObject({ href: 'https://wingside.vn', isFallback: false })

    expect(normalizeWingSidePath('/wingsside/tour?source=home')).toBe('/wing-side/tour?source=home')
    expect(
      resolveSafeHeroLinks(
        [
          {
            link: { label: 'Legacy', type: 'custom', url: '/wingsside/tour' },
          },
        ],
        'en',
      )[0].url,
    ).toBe('/wing-side/tour')
  })

  it('publishes proof only with complete evidence and non-editorial proof media', () => {
    const approved = {
      context: 'Licence register, 2026',
      evidenceDate: '2026-08-14T00:00:00.000Z',
      key: 'licence',
      kind: 'licence' as const,
      media: governedMedia({ governance: { ...governedMedia().governance, usageScope: null } }),
      mediaProvenanceReference: 'proof-ledger:licence',
      permissionEvidence: 'legal-owner-approval',
      permissionState: 'approved' as const,
      publicationState: 'approved' as const,
      sourceIssuer: 'Tourism authority',
      title: 'International travel licence',
    }

    expect(getApprovedProofRecords([approved])).toHaveLength(1)
    expect(
      getApprovedProofRecords([
        approved,
        { ...approved, key: 'pending', publicationState: 'pending' },
        {
          ...approved,
          key: 'editorial-image',
          media: governedMedia({
            governance: { ...governedMedia().governance, usageScope: 'editorial-service' },
          }),
        },
      ]),
    ).toEqual([approved])
  })

  it('enforces the public home order and omits duplicate or unrecognized routers', () => {
    const block = (blockType: string, blockName?: string) =>
      ({ blockName, blockType }) as Page['layout'][number]
    const ecosystem = block('wingsGroupEcosystem')
    const trust = block('infoStrip')
    const proof = block('wingsGroupProofArchive')
    const editorial = block('archive')
    const contact = block('formBlock')
    const blocks = [contact, block('featureGrid'), proof, ecosystem, trust, editorial, trust]

    expect(composeWingsGroupHomeBlocks(blocks)).toEqual([
      ecosystem,
      trust,
      proof,
      editorial,
      contact,
    ])
    expect(composeWingsGroupHomeBlocks(blocks).map(getWingsGroupHomeSection)).toEqual([
      'ecosystem',
      'trust',
      'proof',
      'editorial',
      'contact',
    ])
  })
})
