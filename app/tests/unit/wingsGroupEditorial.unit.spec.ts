import { describe, expect, it } from 'vitest'

import type { Media, Post } from '@/payload-types'
import {
  applyWingsGroupEditorialPublicCopy,
  formatWingsGroupEditorialDate,
  getGovernedEditorialAuthorNames,
  getWingsGroupEditorialOpenGraphMedia,
  getWingsGroupEditorialPostPath,
  isGovernedWingsGroupEditorialPost,
  resolveWingsGroupEditorialMedia,
  selectWingsGroupEditorialRelatedPosts,
  WINGSGROUP_TRUST_ARTICLE_SLUG,
} from '@/utilities/wingsGroupEditorial'

type TestPost = Pick<Post, '_status' | 'content' | 'site' | 'slug' | 'title' | 'populatedAuthors'>

const post = (overrides: Partial<TestPost> = {}): TestPost => ({
  _status: 'published',
  content: {
    root: {
      children: [],
      direction: 'ltr',
      format: '',
      indent: 0,
      type: 'root',
      version: 1,
    },
  },
  populatedAuthors: [{ id: 'author-1', name: 'Editorial team' }],
  site: 9,
  slug: 'governed-article',
  title: 'Governed article',
  ...overrides,
})

const sha = 'a'.repeat(64)
const governedMedia = (overrides: Partial<Media> = {}): Media => {
  const base = {
    alt: 'A traveller preparing for a journey',
    createdAt: '2026-08-23T00:00:00.000Z',
    governance: {
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
          format: 'webp',
          height: 533,
          sha256: sha,
          url: 'https://media.wingsgroup.vn/journey-800.webp',
          width: 800,
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
    },
    id: 44,
    site: { code: 'wings-group', id: 9 },
    updatedAt: '2026-08-23T00:00:00.000Z',
    url: '/media/journey-guide.png',
  } as Media

  return {
    ...base,
    ...overrides,
    governance: { ...base.governance, ...overrides.governance },
  } as Media
}

describe('WingsGroup v3 editorial eligibility', () => {
  it('uses the canonical Vietnamese archive path for article links', () => {
    expect(getWingsGroupEditorialPostPath()).toBe('/tin-tuc')
    expect(getWingsGroupEditorialPostPath('governed-article')).toBe('/tin-tuc/governed-article')
  })

  it('formats publication dates for the active editorial locale', () => {
    expect(formatWingsGroupEditorialDate('2026-08-23T00:00:00.000Z', 'vi')).toBe('23/08/2026')
    expect(formatWingsGroupEditorialDate('2026-08-23T00:00:00.000Z', 'en')).toBe('23/08/2026')
  })

  it('accepts only published, complete, same-site posts', () => {
    expect(isGovernedWingsGroupEditorialPost(post(), 9)).toBe(true)
    expect(isGovernedWingsGroupEditorialPost(post({ _status: 'draft' }), 9)).toBe(false)
    expect(isGovernedWingsGroupEditorialPost(post({ site: 10 }), 9)).toBe(false)
    expect(isGovernedWingsGroupEditorialPost(post({ content: null as never }), 9)).toBe(false)
    expect(isGovernedWingsGroupEditorialPost(post({ title: '' }), 9)).toBe(false)
  })

  it('exposes author names only from the governed populated author projection', () => {
    expect(getGovernedEditorialAuthorNames(post())).toEqual(['Editorial team'])
    expect(getGovernedEditorialAuthorNames({ populatedAuthors: [] })).toEqual([])
    expect(
      getGovernedEditorialAuthorNames({ populatedAuthors: [{ id: '1', name: '  ' }] }),
    ).toEqual([])
  })

  it('uses published site-scoped media fields before the governed editorial fallback', () => {
    const fieldMedia = governedMedia({ id: 45 })
    const fallback = governedMedia({ id: 46 })
    const fallbackMap = new Map([['wingsgroup-journey-guide.png', fallback]])

    expect(
      resolveWingsGroupEditorialMedia(
        { heroImage: fallback, meta: { image: fieldMedia }, slug: WINGSGROUP_TRUST_ARTICLE_SLUG },
        fallbackMap,
      ),
    ).toBe(fieldMedia)
    expect(
      resolveWingsGroupEditorialMedia(
        {
          heroImage: governedMedia({
            governance: { publicationState: 'pending' },
          }),
          meta: {},
          slug: WINGSGROUP_TRUST_ARTICLE_SLUG,
        },
        fallbackMap,
      ),
    ).toBe(fallback)
  })

  it('fails closed when neither the post nor fallback has published governed media', () => {
    expect(
      resolveWingsGroupEditorialMedia(
        { heroImage: null, meta: {}, slug: WINGSGROUP_TRUST_ARTICLE_SLUG },
        new Map([
          [
            'wingsgroup-journey-guide.png',
            governedMedia({ governance: { publicationState: 'pending' } }),
          ],
        ]),
      ),
    ).toBeNull()
  })

  it('uses the widest verified WebP derivative for public OG metadata', () => {
    expect(getWingsGroupEditorialOpenGraphMedia(governedMedia())?.url).toBe(
      'https://media.wingsgroup.vn/journey-1200.webp',
    )
  })

  it('prioritizes explicit related posts and excludes the current article', () => {
    const current = { id: 1, relatedPosts: [3] } as Post
    const candidates = [
      { id: 1, slug: 'current' },
      { id: 2, slug: 'recent' },
      { id: 3, slug: 'selected' },
    ] as Post[]

    expect(
      selectWingsGroupEditorialRelatedPosts(current, candidates).map((item) => item.slug),
    ).toEqual(['selected', 'recent'])
  })

  it('replaces the audited trust article in both locales with practical public guidance', () => {
    const unsafe = {
      ...post(),
      id: 1,
      meta: { description: 'Legacy implementation note' },
      slug: WINGSGROUP_TRUST_ARTICLE_SLUG,
      title: 'Old trust title',
    } as Post

    for (const locale of ['vi', 'en'] as const) {
      const rewritten = applyWingsGroupEditorialPublicCopy(unsafe, locale)
      const publicText = JSON.stringify(rewritten)

      expect(publicText).not.toMatch(/Root site|legacy site|website cũ|development note/i)
      expect(publicText).toMatch(/cơ quan có thẩm quyền|competent authorities/i)
      expect(rewritten.title).not.toBe('Old trust title')
    }
  })
})
