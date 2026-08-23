import { describe, expect, it } from 'vitest'

import {
  areAllHeroMediaGoverned,
  composeWingsGroupHomeBlocks,
  getApprovedProofRecords,
  getWingsGroupSwitcherLocales,
  getWingsGroupHomeSection,
  isGovernedEditorialPost,
  isSafeSameSiteHref,
  isWingsGroupDevelopmentMedia,
  isWingsGroupV3HomeLayout,
  isWingsGroupPublishedMedia,
  normalizeWingSidePath,
  resolveWingsGroupEcosystemProfiles,
  resolveGovernedEditorialSelection,
  resolveEcosystemCTA,
  resolveSafeHeroLinks,
  WINGSGROUP_CAPABILITY_ROWS,
  WINGSGROUP_PROFILE_ORDER,
} from '@/components/WingsGroupV3/model'
import type {
  ArchiveBlock,
  Media,
  Page,
  Post,
  Site,
  WingsGroupEcosystemBlock,
} from '@/payload-types'
import { localeMetadata } from '@/utilities/locales'

const sha = 'a'.repeat(64)
const site = (code = 'wings-group'): Site =>
  ({
    code,
    createdAt: '2026-08-14T00:00:00.000Z',
    defaultLocale: 'vi',
    id: code === 'wings-group' ? 1 : 2,
    name: code,
    primaryDomain: `${code}.example`,
    supportedLocales: ['vi', 'en'],
    updatedAt: '2026-08-14T00:00:00.000Z',
  }) as Site

const governedMedia = (overrides: Partial<Media> = {}): Media => {
  const base = {
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
      provenanceReference: 'docs/product/wingsgroup-v3-media-manifest.json#media-a',
      rightsEvidence: 'stakeholder-rights-approval',
      rightsState: 'approved',
      sourceArchiveSha256: sha,
      sourceAttachmentId: 'attachment-1',
      sourceFileSha256: sha,
      sourceIdentity: `attachment-1:${sha}`,
    },
    id: 1,
    site: site(),
    updatedAt: '2026-08-14T00:00:00.000Z',
    url: '/media/a.png',
  } as Media

  return {
    ...base,
    ...overrides,
    governance: { ...base.governance, ...overrides.governance },
  } as Media
}

const editorialPost = (overrides: Partial<Post> = {}): Post => ({
  _status: 'published',
  authors: [1],
  categories: [
    {
      createdAt: '2026-08-14T00:00:00.000Z',
      id: 1,
      site: site(),
      slug: 'insights',
      title: 'Insights',
      updatedAt: '2026-08-14T00:00:00.000Z',
    },
  ],
  content: { root: {} } as never,
  createdAt: '2026-08-14T00:00:00.000Z',
  id: 1,
  meta: {
    image: governedMedia({
      governance: { ...governedMedia().governance, usageScope: 'editorial-service' },
    }),
  },
  populatedAuthors: [{ id: '1', name: 'WingsGroup Editorial Team' }],
  publishedAt: '2026-08-14T00:00:00.000Z',
  site: site(),
  slug: 'considered-travel',
  title: 'Considered travel',
  updatedAt: '2026-08-14T00:00:00.000Z',
  ...overrides,
})

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
  it('keeps the ecosystem and capability projections in governed branded order', () => {
    const shuffledProfiles = [
      profile({ brandKey: 'wingscare', brandName: 'WingsCare' }),
      profile({ brandKey: 'wingsgo', brandName: 'WingsGo' }),
      profile({ brandKey: 'wingsplus', brandName: 'WingsPlus' }),
      profile({ brandKey: 'wingspass', brandName: 'WingsPass' }),
      profile({ brandKey: 'wing-side', brandName: 'WingSide' }),
    ]

    expect(
      resolveWingsGroupEcosystemProfiles(shuffledProfiles).map(({ brandKey }) => brandKey),
    ).toEqual(WINGSGROUP_PROFILE_ORDER)
    expect(WINGSGROUP_CAPABILITY_ROWS.vi.map(({ title }) => title)).toEqual([
      'WingsGo',
      'WingSide',
      'WingsPass',
      'WingsPlus',
      'WingsCare',
    ])
    expect(WINGSGROUP_CAPABILITY_ROWS.en.map(({ title }) => title)).toEqual([
      'WingsGo',
      'WingSide',
      'WingsPass',
      'WingsPlus',
      'WingsCare',
    ])
  })

  it('requires the complete media publication contract', () => {
    expect(isWingsGroupPublishedMedia(governedMedia())).toBe(true)
    expect(
      isWingsGroupPublishedMedia(
        governedMedia({ governance: { managedBy: 'wingsgroup-v3', publicationState: 'ready' } }),
      ),
    ).toBe(false)
    expect(isWingsGroupPublishedMedia(governedMedia({ alt: '' }))).toBe(false)
    expect(isWingsGroupPublishedMedia(governedMedia({ site: site('wings-go') }))).toBe(false)
    expect(
      isWingsGroupPublishedMedia(
        governedMedia({ governance: { ...governedMedia().governance, rightsEvidence: '' } }),
      ),
    ).toBe(false)
    expect(
      isWingsGroupPublishedMedia(
        governedMedia({
          governance: {
            ...governedMedia().governance,
            responsiveDerivatives: [
              { format: 'webp', sha256: 'bad', url: '//evil.example/a.webp', width: 1280 },
              { format: 'avif', sha256: sha, url: 'https://cdn.example/a.avif', width: 1280 },
            ],
          },
        }),
      ),
    ).toBe(false)
  })

  it('allows the governed development handoff only through the preview predicate', () => {
    const pendingDevelopmentMedia = governedMedia({
      governance: {
        ...governedMedia().governance,
        derivativeState: 'pending',
        publicationState: 'pending',
        responsiveDerivatives: [],
        usageScope: 'editorial-service',
      },
    })

    expect(isWingsGroupDevelopmentMedia(pendingDevelopmentMedia)).toBe(true)
    expect(isWingsGroupPublishedMedia(pendingDevelopmentMedia)).toBe(false)
  })

  it('rejects scheme-relative, backslash, control and encoded externalization paths', () => {
    for (const unsafe of [
      '//evil.example/path',
      '/\\evil.example/path',
      '/safe\nnext',
      '/%2f%2fevil.example',
      '/%5cevil.example',
    ]) {
      expect(isSafeSameSiteHref(unsafe)).toBe(false)
      expect(
        resolveEcosystemCTA(
          profile({ cta: { contactPath: unsafe, label: 'Contact', state: 'contact-fallback' } }),
        ).href,
      ).toBe('/lien-he#contact-form')
      expect(
        resolveSafeHeroLinks([{ link: { label: 'Unsafe', type: 'custom', url: unsafe } }])[0].url,
      ).toBe('#ecosystem')
    }
    expect(isSafeSameSiteHref('/lien-he?source=home#contact-form')).toBe(true)
    expect(isSafeSameSiteHref('#ecosystem')).toBe(true)
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
    const blocks = [contact, block('featureGrid'), proof, ecosystem, trust, editorial]

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
    expect(isWingsGroupV3HomeLayout(blocks)).toBe(true)
    expect(isWingsGroupV3HomeLayout(blocks.filter((item) => item !== contact))).toBe(false)
    expect(isWingsGroupV3HomeLayout([...blocks, trust])).toBe(false)
  })

  it('gates every populated hero media relation as one fail-closed set', () => {
    const hero = {
      media: governedMedia(),
      slides: [
        {
          media: governedMedia({ id: 2 }),
          mobileMedia: governedMedia({ id: 3 }),
        },
      ],
      supportingMedia: [governedMedia({ id: 4 })],
      type: 'highImpact' as const,
      video: { poster: governedMedia({ id: 5 }) },
    } as Page['hero']

    expect(areAllHeroMediaGoverned(hero)).toBe(true)
    expect(
      areAllHeroMediaGoverned({
        ...hero,
        supportingMedia: [governedMedia({ site: site('wings-care') })],
      }),
    ).toBe(false)
    expect(areAllHeroMediaGoverned({ type: 'highImpact' } as Page['hero'])).toBe(false)
  })

  it('shows route-ready English in the WingsGroup shell while editorial approval remains separate', () => {
    const locales = localeMetadata.filter((item) => item.code === 'vi' || item.code === 'en')
    expect(getWingsGroupSwitcherLocales([...locales], 'hidden').map((item) => item.code)).toEqual([
      'vi',
    ])
    expect(
      getWingsGroupSwitcherLocales([...locales], 'route-ready').map((item) => item.code),
    ).toEqual(['vi', 'en'])
    expect(getWingsGroupSwitcherLocales([...locales], 'approved').map((item) => item.code)).toEqual(
      ['vi', 'en'],
    )
  })

  it('accepts exactly three fully governed editorial posts and rejects arbitrary selections', () => {
    const block = {
      blockType: 'archive',
      limit: 3,
      populateBy: 'collection',
    } as ArchiveBlock
    const posts = [
      editorialPost({ id: 1 }),
      editorialPost({ id: 2, slug: 'two' }),
      editorialPost({ id: 3, slug: 'three' }),
    ]

    expect(posts.every(isGovernedEditorialPost)).toBe(true)
    expect(resolveGovernedEditorialSelection(block, posts)).toHaveLength(3)
    expect(resolveGovernedEditorialSelection({ ...block, limit: 4 }, posts)).toEqual([])
    expect(
      resolveGovernedEditorialSelection(block, [
        posts[0],
        editorialPost({ id: 4, site: site('wings-go') }),
        posts[2],
      ]),
    ).toEqual([])
    expect(
      resolveGovernedEditorialSelection(block, [
        posts[0],
        editorialPost({ id: 5, populatedAuthors: [] }),
        posts[2],
      ]),
    ).toEqual([])
  })
})
