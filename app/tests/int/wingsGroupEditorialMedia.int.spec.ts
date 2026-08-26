import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  find: vi.fn(),
  getCurrentSite: vi.fn(),
}))

vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('payload', () => ({ getPayload: vi.fn(async () => ({ find: mocks.find })) }))
vi.mock('@/utilities/siteContext', () => ({ getCurrentSite: mocks.getCurrentSite }))

import {
  getWingsGroupEditorialOpenGraphMedia,
  queryWingsGroupEditorialFallbackMedia,
  queryWingsGroupEditorialPosts,
  resolveWingsGroupEditorialMedia,
  WINGSGROUP_TRUST_ARTICLE_SLUG,
} from '@/utilities/wingsGroupEditorial'

const sha = 'a'.repeat(64)
const content = {
  root: {
    children: [{ children: [{ text: 'Root site legacy implementation note' }], type: 'paragraph' }],
    direction: 'ltr',
    format: '',
    indent: 0,
    type: 'root',
    version: 1,
  },
}

const media = (overrides: Record<string, unknown> = {}) => {
  const governance = {
    derivativeState: 'verified',
    managedBy: 'wingsgroup-v3',
    provenanceReference: 'docs/product/wingsgroup-v3-media-manifest.json#journey-guide',
    publicationState: 'published',
    responsiveDerivatives: [
      {
        format: 'webp',
        height: 800,
        sha256: sha,
        url: 'https://media.wingsgroup.vn/journey-1200.webp',
        width: 1200,
      },
      {
        format: 'avif',
        height: 800,
        sha256: sha,
        url: 'https://media.wingsgroup.vn/journey-1200.avif',
        width: 1200,
      },
    ],
    rightsEvidence: 'stakeholder approval',
    rightsState: 'approved',
    sourceArchiveSha256: sha,
    sourceAttachmentId: 'handoff-1',
    sourceFileSha256: sha,
    sourceFilename: 'wingsgroup-journey-guide.png',
    sourceIdentity: `handoff-1:${sha}`,
    usageScope: 'editorial-service',
  }

  const base = {
    alt: 'A traveller preparing the information needed for a journey',
    createdAt: '2026-08-23T00:00:00.000Z',
    id: 44,
    site: 9,
    updatedAt: '2026-08-23T00:00:00.000Z',
    url: '/media/journey-guide.png',
  }

  return {
    ...base,
    ...overrides,
    governance: {
      ...governance,
      ...((overrides.governance as Record<string, unknown> | undefined) || {}),
    },
  }
}

describe('WingsGroup editorial publication integration', () => {
  beforeEach(() => {
    mocks.find.mockReset()
    mocks.getCurrentSite.mockResolvedValue({ code: 'wings-group', id: 9 })
  })

  it('returns only published same-site posts and applies the approved VI/EN trust copy', async () => {
    mocks.find.mockResolvedValue({
      docs: [
        {
          _status: 'published',
          content,
          id: 1,
          meta: {},
          populatedAuthors: [{ id: '1', name: 'Editorial team' }],
          site: 9,
          slug: WINGSGROUP_TRUST_ARTICLE_SLUG,
          title: 'Unsafe title',
        },
        {
          _status: 'draft',
          content,
          id: 2,
          site: 9,
          slug: 'draft-story',
          title: 'Draft story',
        },
        {
          _status: 'published',
          content,
          id: 3,
          site: 10,
          slug: 'foreign-story',
          title: 'Foreign story',
        },
      ],
    })

    const viPosts = await queryWingsGroupEditorialPosts({ locale: 'vi' })
    const enPosts = await queryWingsGroupEditorialPosts({ locale: 'en' })

    expect(viPosts).toHaveLength(1)
    expect(enPosts).toHaveLength(1)
    expect(JSON.stringify(viPosts[0])).not.toMatch(/Root site|legacy implementation/i)
    expect(enPosts[0]?.title).toBe('What to verify before choosing a travel provider')
    expect(mocks.find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'posts',
        fallbackLocale: false,
        where: expect.objectContaining({ and: expect.any(Array) }),
      }),
    )
  })

  it('selects governed derivative metadata without bypassing anonymous Media access', async () => {
    mocks.find.mockResolvedValue({
      docs: [
        media(),
        media({
          governance: { publicationState: 'pending' },
          id: 45,
        }),
        media({ id: 46, site: 10 }),
      ],
    })

    const fallbackMedia = await queryWingsGroupEditorialFallbackMedia({ locale: 'vi' })
    const selected = resolveWingsGroupEditorialMedia(
      { heroImage: null, meta: {}, slug: WINGSGROUP_TRUST_ARTICLE_SLUG },
      fallbackMedia,
    )

    expect(fallbackMedia.size).toBe(1)
    expect(selected?.id).toBe(44)
    expect(getWingsGroupEditorialOpenGraphMedia(selected)?.url).toBe(
      'https://media.wingsgroup.vn/journey-1200.webp',
    )
    expect(mocks.find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'media',
        overrideAccess: false,
        where: expect.objectContaining({
          and: expect.arrayContaining([
            { 'governance.publicationState': { equals: 'published' } },
            { 'governance.usageScope': { equals: 'editorial-service' } },
          ]),
        }),
      }),
    )
  })
})
