import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  find: vi.fn(),
  site: { code: 'wing-side' as string, id: 3 },
}))

vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('payload', () => ({ getPayload: vi.fn(async () => ({ find: mocks.find })) }))
vi.mock('@/utilities/siteContext', () => ({
  appendSiteWhere: vi.fn(async (where?: Record<string, unknown>) => ({
    and: [{ site: { equals: mocks.site.id } }, where],
  })),
  getCurrentSite: vi.fn(async () => mocks.site),
}))

import { getWingSideDiscoveryContext } from '@/tours/discovery'

type FindArgs = {
  fallbackLocale?: false | string
  locale?: string
  overrideAccess?: boolean
  where?: { and?: Array<Record<string, unknown>> }
}

const page = (id = 3) => ({ _status: 'published', pathname: '/tour/private-hanoi', site: id })
const media = (id = 3) => ({ alt: 'Hero', site: id, url: '/media/hero.jpg' })
type ProductDoc = {
  _status: string
  destinationTags: string[]
  durationDays: number
  durationNights: number
  heroMedia: null | ReturnType<typeof media>
  id: number | string
  site: number
  slug: string
  summary: string
  title: string
  travelStyles: string[]
  wrapperPage: ReturnType<typeof page>
}

const product = (overrides: Partial<ProductDoc> = {}): ProductDoc => ({
  _status: 'published',
  destinationTags: ['hanoi'],
  durationDays: 6,
  durationNights: 5,
  heroMedia: media(),
  id: 10,
  site: 3,
  slug: 'private-hanoi',
  summary: 'A private Hanoi journey.',
  title: 'Private Hanoi',
  travelStyles: ['culture'],
  wrapperPage: page(),
  ...overrides,
})

const innerWhere = (args: FindArgs) =>
  args.where?.and?.[1] as { and?: Array<Record<string, unknown>> }
const clauses = (args: FindArgs) => innerWhere(args)?.and || []
const clauseField = (clause: Record<string, unknown>) => Object.keys(clause)[0]
const clauseValue = (args: FindArgs, field: string) =>
  clauses(args).find((clause) => clauseField(clause) === field)?.[field] as
    | Record<string, unknown>
    | undefined

const matchesQuery = (doc: ProductDoc, args: FindArgs) => {
  if (doc.site !== (args.where?.and?.[0] as { site?: { equals?: number } })?.site?.equals)
    return false
  for (const clause of clauses(args)) {
    if ('_status' in clause && doc._status !== (clause._status as { equals: string }).equals)
      return false
    if ('destinationTags' in clause) {
      const values = (clause.destinationTags as { in: string[] }).in || []
      if (!values.some((value) => doc.destinationTags.includes(value))) return false
    }
    if ('travelStyles' in clause) {
      const values = (clause.travelStyles as { in: string[] }).in || []
      if (!values.some((value) => doc.travelStyles.includes(value))) return false
    }
    if ('durationDays' in clause) {
      const duration = clause.durationDays as {
        greater_than_equal?: number
        less_than_equal?: number
      }
      if (duration.greater_than_equal != null && doc.durationDays < duration.greater_than_equal)
        return false
      if (duration.less_than_equal != null && doc.durationDays > duration.less_than_equal)
        return false
    }
  }
  return true
}

describe('WingSide discovery server query contract', () => {
  beforeEach(() => {
    mocks.site = { code: 'wing-side', id: 3 }
    mocks.find.mockReset()
  })

  it('queries WingSide published tours with fallback disabled and projects stable public results', async () => {
    const docs = [
      product({ durationDays: 8, id: 'b' }),
      product({ durationDays: 6, id: 20 }),
      product({
        durationDays: 6,
        id: 2,
        slug: 'private-hanoi-2',
        wrapperPage: { ...page(), pathname: '/tour/private-hanoi-2' },
      }),
      product({ _status: 'draft', durationDays: 3, id: 1 }),
      product({ durationDays: 4, id: 3, site: 9 }),
    ]
    mocks.find.mockImplementation(async (args: FindArgs) => ({
      docs: docs.filter((doc) => matchesQuery(doc, args)),
    }))

    const context = await getWingSideDiscoveryContext({
      input: { destination: 'hanoi', duration: '1-7', style: 'culture' },
      locale: 'en',
    })

    expect(context.result.items.map(({ id }) => id)).toEqual([2, 20])
    expect(context.result.items[0]).not.toHaveProperty('_status')
    expect(context.result.items[0]).not.toHaveProperty('wrapperPage')
    expect(context.result.relaxed).toBeNull()

    const args = mocks.find.mock.calls[0][0] as FindArgs
    expect(args).toMatchObject({
      draft: false,
      fallbackLocale: false,
      locale: 'en',
      overrideAccess: false,
      pagination: false,
      sort: ['durationDays', 'id'],
    })
    expect(clauseValue(args, 'destinationTags')).toEqual({ in: ['hanoi'] })
    expect(clauseValue(args, 'travelStyles')).toEqual({ in: ['culture'] })
    expect(clauses(args)).toContainEqual({ durationDays: { greater_than_equal: 1 } })
    expect(clauses(args)).toContainEqual({ durationDays: { less_than_equal: 7 } })
  })

  it('uses AND semantics and relaxes duration first, then stops on the first non-empty set', async () => {
    const docs = [
      product({ destinationTags: ['hanoi'], durationDays: 20, id: 30, travelStyles: ['luxury'] }),
      product({ destinationTags: ['hanoi'], durationDays: 9, id: 31, travelStyles: ['culture'] }),
      product({ destinationTags: ['sapa'], durationDays: 9, id: 32, travelStyles: ['luxury'] }),
    ]
    mocks.find.mockImplementation(async (args: FindArgs) => ({
      docs: docs.filter((doc) => matchesQuery(doc, args)),
    }))

    const context = await getWingSideDiscoveryContext({
      input: { destination: 'hanoi', duration: '8-14', style: 'luxury' },
      locale: 'en',
    })

    expect(context.result.items.map(({ id }) => id)).toEqual([30])
    expect(context.result.relaxed).toEqual({
      removed: 'duration',
      query: { destination: 'hanoi', style: 'luxury' },
    })
    expect(mocks.find).toHaveBeenCalledTimes(2)
    expect(clauses(mocks.find.mock.calls[0][0] as FindArgs)).toContainEqual({
      durationDays: { greater_than_equal: 8 },
    })
    expect(
      clauses(mocks.find.mock.calls[1][0] as FindArgs).some((clause) => 'durationDays' in clause),
    ).toBe(false)
  })

  it('continues zero-result relaxation cumulatively after duration is removed', async () => {
    const docs = [
      product({ destinationTags: ['hanoi'], durationDays: 20, id: 40, travelStyles: ['luxury'] }),
      product({ destinationTags: ['hanoi'], durationDays: 9, id: 41, travelStyles: ['family'] }),
      product({ destinationTags: ['sapa'], durationDays: 9, id: 42, travelStyles: ['culture'] }),
    ]
    mocks.find.mockImplementation(async (args: FindArgs) => ({
      docs: docs.filter((doc) => matchesQuery(doc, args)),
    }))

    const context = await getWingSideDiscoveryContext({
      input: { destination: 'hanoi', duration: '8-14', style: 'culture' },
      locale: 'en',
    })

    expect(context.result.items.map(({ id }) => id)).toEqual([41, 40])
    expect(context.result.relaxed).toEqual({
      removed: 'style',
      query: { destination: 'hanoi' },
    })
    expect(mocks.find).toHaveBeenCalledTimes(3)

    const firstRelaxedClauses = clauses(mocks.find.mock.calls[1][0] as FindArgs)
    expect(firstRelaxedClauses).toContainEqual({ destinationTags: { in: ['hanoi'] } })
    expect(firstRelaxedClauses).toContainEqual({ travelStyles: { in: ['culture'] } })
    expect(firstRelaxedClauses.some((clause) => 'durationDays' in clause)).toBe(false)

    const secondRelaxedClauses = clauses(mocks.find.mock.calls[2][0] as FindArgs)
    expect(secondRelaxedClauses).toContainEqual({ destinationTags: { in: ['hanoi'] } })
    expect(secondRelaxedClauses.some((clause) => 'travelStyles' in clause)).toBe(false)
    expect(secondRelaxedClauses.some((clause) => 'durationDays' in clause)).toBe(false)
  })
  it('supports unfiltered base listing and never supplies static fallback cards', async () => {
    mocks.find.mockResolvedValue({
      docs: [product({ id: 1, title: '' }), product({ heroMedia: null, id: 2 })],
    })

    const context = await getWingSideDiscoveryContext({ input: {}, locale: 'en' })

    expect(context.seo).toEqual({ canonicalPath: '/journeys', robots: 'index,follow' })
    expect(context.result.items).toEqual([])
    expect(context.result.total).toBe(0)
    expect(mocks.find).toHaveBeenCalledTimes(1)
  })

  it('keeps invalid-only discovery URLs canonical and noindex without copying unrelated keys', async () => {
    mocks.find.mockResolvedValue({ docs: [] })

    const context = await getWingSideDiscoveryContext({
      input: {
        debug: 'raw-secret',
        destination: 'bogus-destination',
        duration: '99',
        style: 'unknown',
      },
      locale: 'en',
    })

    expect(context.query).toEqual({ unknownValueCount: 3 })
    expect(context.result.appliedQuery).toEqual({})
    expect(context.result.unknownValueCount).toBe(3)
    expect(context.seo).toEqual({ canonicalPath: '/journeys', robots: 'noindex,follow' })
    expect(mocks.find).toHaveBeenCalledTimes(1)
    expect(clauses(mocks.find.mock.calls[0][0] as FindArgs)).toEqual([
      { _status: { equals: 'published' } },
      { wrapperPage: { exists: true } },
    ])
  })
  it('returns no results for non-WingSide tenants without querying tour-products', async () => {
    mocks.site = { code: 'wings-go', id: 4 }

    const context = await getWingSideDiscoveryContext({
      input: { destination: 'hanoi' },
      locale: 'en',
    })

    expect(context.result.items).toEqual([])
    expect(context.seo).toEqual({ canonicalPath: '/journeys', robots: 'noindex,follow' })
    expect(mocks.find).not.toHaveBeenCalled()
  })
})
