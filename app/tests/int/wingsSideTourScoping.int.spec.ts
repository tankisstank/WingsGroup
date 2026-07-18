import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  find: vi.fn(),
  siteID: 3,
}))

vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('payload', () => ({ getPayload: vi.fn(async () => ({ find: mocks.find })) }))
vi.mock('@/utilities/siteContext', () => ({
  appendSiteWhere: vi.fn(async (where?: Record<string, unknown>) => ({
    and: [{ site: { equals: mocks.siteID } }, where],
  })),
  getCurrentSite: vi.fn(async () => ({ code: 'wings-side', id: mocks.siteID })),
}))

import { getResolvedTourDetailBySlug } from '@/tours/queries'
import { hasMatchingWingSideTourWrapper } from '@/tours/wingsSideTourViewModel'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const products = [
  { _status: 'published', id: 498, site: 3, slug: 'shared-slug', wrapperPage: 909 },
  { _status: 'published', id: 777, site: 2, slug: 'shared-slug', wrapperPage: 700 },
  { _status: 'draft', id: 499, site: 3, slug: 'draft-tour', wrapperPage: 910 },
]

type FindArgs = {
  collection: string
  draft: boolean
  overrideAccess: boolean
  where?: { and?: Array<Record<string, { equals?: number | string }>> }
}

const siteFromWhere = (where?: FindArgs['where']) => where?.and?.[0]?.site?.equals
const slugFromWhere = (where?: FindArgs['where']) => where?.and?.[1]?.slug?.equals

describe('WingSide structured tour query perimeter', () => {
  beforeEach(() => {
    mocks.siteID = 3
    mocks.find.mockReset()
    mocks.find.mockImplementation(async (args: FindArgs) => {
      if (args.collection === 'tour-products') {
        const doc = products.find(
          (product) =>
            product.site === siteFromWhere(args.where) &&
            product.slug === slugFromWhere(args.where) &&
            (args.draft || product._status === 'published'),
        )
        return { docs: doc ? [doc] : [] }
      }
      return { docs: [] }
    })
  })

  it('selects the same-slug TourProduct only from the current host tenant', async () => {
    const result = await getResolvedTourDetailBySlug({ draft: false, locale: 'en', slug: 'shared-slug' })
    const calls = mocks.find.mock.calls as unknown as Array<[FindArgs]>

    expect(result?.tour).toMatchObject({ id: 498, site: 3, wrapperPage: 909 })
    expect(result?.tour.id).not.toBe(777)
    expect(hasMatchingWingSideTourWrapper(result!.tour, 909)).toBe(true)
    expect(hasMatchingWingSideTourWrapper(result!.tour, 700)).toBe(false)
    expect(calls.every(([args]) => siteFromWhere(args.where) === 3)).toBe(true)
  })

  it('does not expose drafts and never overrides access on public queries', async () => {
    await expect(
      getResolvedTourDetailBySlug({ draft: false, locale: 'en', slug: 'draft-tour' }),
    ).resolves.toBeNull()
    const calls = mocks.find.mock.calls as unknown as Array<[FindArgs]>
    expect(calls.every(([args]) => args.overrideAccess === false)).toBe(true)
  })

  it('requests an explicit English content fallback only when the WingSide route asks for it', async () => {
    await getResolvedTourDetailBySlug({
      draft: false,
      fallbackLocale: 'en',
      locale: 'it',
      slug: 'shared-slug',
    })
    const calls = mocks.find.mock.calls as unknown as Array<[FindArgs & { fallbackLocale?: string }]>
    expect(calls.every(([args]) => args.fallbackLocale === 'en')).toBe(true)
  })

  it('keeps Page and Tour public queries site-scoped and wrapper-gated in the route source', () => {
    const source = readFileSync(
      join(process.cwd(), 'src', 'app', '(frontend)', '[...slug]', 'page.tsx'),
      'utf8',
    )
    expect(source).toContain('const where = await appendSiteWhere')
    expect(source).toContain('overrideAccess: draft')
    expect(source).toContain('hasMatchingWingSideTourWrapper(tourData.tour, wrapperPageID)')
    expect(source).toContain('notFound()')
    expect(source).toContain('<RelatedPages locale={locale} pages={relatedPages} />')
  })

  it('executes the pure wrapper boundary for match, mismatch, and missing relations', () => {
    expect(hasMatchingWingSideTourWrapper({ wrapperPage: { id: 909 } }, 909)).toBe(true)
    expect(hasMatchingWingSideTourWrapper({ wrapperPage: { id: 910 } }, 909)).toBe(false)
    expect(hasMatchingWingSideTourWrapper({}, 909)).toBe(false)
  })
})
