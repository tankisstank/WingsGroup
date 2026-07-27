import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  find: vi.fn(),
  loggerInfo: vi.fn(),
  site: { code: 'wing-side' as string, id: 3 },
}))

vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('payload', () => ({
  getPayload: vi.fn(async () => ({ find: mocks.find, logger: { info: mocks.loggerInfo } })),
}))
vi.mock('@/utilities/siteContext', () => ({
  appendSiteWhere: vi.fn(async (where?: Record<string, unknown>) => ({
    and: [{ site: { equals: mocks.site.id } }, where],
  })),
  getCurrentSite: vi.fn(async () => mocks.site),
}))

import { getWingSideDiscoveryContext } from '@/tours/discovery'

type FindArgs = {
  collection?: string
  depth?: number
  fallbackLocale?: false | string
  limit?: number
  locale?: string
  overrideAccess?: boolean
  pagination?: boolean
  select?: Record<string, unknown>
  where?: { and?: Array<Record<string, unknown>> }
}

type CandidateWrapper = number | string | { id?: number | string | null; pathname?: string | null }
type PageDoc = {
  _status: string
  id: number | string
  pathname: string
  site: number
  slug: string
}
const page = (overrides: Partial<PageDoc> = {}): PageDoc => ({
  _status: 'published',
  id: 101,
  pathname: '/tour/private-hanoi',
  site: 3,
  slug: 'private-hanoi',
  ...overrides,
})
const publicWrapper = (id = 101, pathname = '/tour/private-hanoi') => ({ id, pathname })
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
  wrapperPage: CandidateWrapper | null
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
  wrapperPage: publicWrapper(),
  ...overrides,
})

const innerWhere = (args: FindArgs) =>
  args.where?.and?.[1] as { and?: Array<Record<string, unknown>> }
const clauses = (args: FindArgs) => innerWhere(args)?.and || []
const rootClauses = (args: FindArgs) => args.where?.and || []
const clauseField = (clause: Record<string, unknown>) => Object.keys(clause)[0]
const clauseValue = (args: FindArgs, field: string) =>
  clauses(args).find((clause) => clauseField(clause) === field)?.[field] as
    | Record<string, unknown>
    | undefined
const rootClauseValue = (args: FindArgs, field: string) =>
  rootClauses(args).find((clause) => clauseField(clause) === field)?.[field] as
    | Record<string, unknown>
    | undefined

const matchesTourQuery = (doc: ProductDoc, args: FindArgs) => {
  if (doc.site !== (args.where?.and?.[0] as { site?: { equals?: number } })?.site?.equals)
    return false
  for (const clause of clauses(args)) {
    if ('_status' in clause && doc._status !== (clause._status as { equals: string }).equals)
      return false
    if ('wrapperPage' in clause && !doc.wrapperPage) return false
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

const matchesPageQuery = (doc: PageDoc, args: FindArgs) => {
  const idValues = (rootClauseValue(args, 'id') as { in?: Array<number | string> } | undefined)?.in
  const siteID = (rootClauseValue(args, 'site') as { equals?: number } | undefined)?.equals
  const status = (rootClauseValue(args, '_status') as { equals?: string } | undefined)?.equals

  return (
    (!idValues || idValues.map(String).includes(String(doc.id))) &&
    doc.site === siteID &&
    doc._status === status
  )
}

const mockDiscoveryFind = (tours: ProductDoc[], pages: PageDoc[] = []) => {
  mocks.find.mockImplementation(async (args: FindArgs) => {
    if (args.collection === 'pages') {
      return {
        docs: pages
          .filter((doc) => matchesPageQuery(doc, args))
          .map(({ id, pathname, slug }) => ({ id, pathname, slug })),
      }
    }

    return {
      docs: tours.filter((doc) => matchesTourQuery(doc, args)),
    }
  })
}

const collectionCalls = (collection: string) =>
  mocks.find.mock.calls
    .map(([args]) => args as FindArgs)
    .filter((args) => args.collection === collection)

const discoveryLogs = () =>
  mocks.loggerInfo.mock.calls.map(([fields, message]) => ({
    fields: fields as Record<string, unknown>,
    message,
  }))

describe('WingSide discovery server query contract', () => {
  beforeEach(() => {
    mocks.site = { code: 'wing-side', id: 3 }
    mocks.find.mockReset()
    mocks.loggerInfo.mockReset()
  })

  it('verifies access-stripped wrappers in one batched pages query and projects stable public results', async () => {
    const tours = [
      product({ durationDays: 8, id: 'b' }),
      product({ durationDays: 6, id: 20 }),
      product({
        durationDays: 6,
        id: 2,
        slug: 'private-hanoi-2',
        wrapperPage: publicWrapper(102, '/tour/private-hanoi-2'),
      }),
      product({ _status: 'draft', durationDays: 3, id: 1 }),
      product({ durationDays: 4, id: 3, site: 9 }),
    ]
    mockDiscoveryFind(tours, [page(), page({ id: 102, pathname: '/tour/private-hanoi-2' })])

    const context = await getWingSideDiscoveryContext({
      input: { destination: 'hanoi', duration: '1-7', style: 'culture' },
      locale: 'en',
    })

    expect(context.result.items.map(({ id }) => id)).toEqual([2, 20])
    expect(context.result.total).toBe(2)
    expect(context.result.items[0]).toMatchObject({
      hero: { url: '/media/hero.jpg' },
      href: '/tour/private-hanoi-2',
      title: 'Private Hanoi',
    })
    expect(context.result.items[0]).not.toHaveProperty('_status')
    expect(context.result.items[0]).not.toHaveProperty('wrapperPage')
    expect(context.result.relaxed).toBeNull()
    expect(discoveryLogs()).toHaveLength(1)
    expect(discoveryLogs()[0]).toMatchObject({
      fields: {
        action: 'wingsside_discovery_completed',
        destination_code: 'hanoi',
        duration_code: '1-7',
        invalid_filter_count: 0,
        relaxed: null,
        result_count: 2,
        source: 'journeys',
        style_code: 'culture',
        tenant_code: 'wing-side',
        tenant_outcome: 'accepted',
      },
      message: 'wingsside_discovery_completed',
    })
    expect(discoveryLogs()[0].fields.duration_ms).toEqual(expect.any(Number))

    const tourArgs = collectionCalls('tour-products')[0]
    expect(tourArgs).toMatchObject({
      collection: 'tour-products',
      depth: 2,
      draft: false,
      fallbackLocale: false,
      locale: 'en',
      overrideAccess: false,
      pagination: false,
      sort: ['durationDays', 'id'],
    })
    expect(clauseValue(tourArgs, 'destinationTags')).toEqual({ in: ['hanoi'] })
    expect(clauseValue(tourArgs, 'travelStyles')).toEqual({ in: ['culture'] })
    expect(clauses(tourArgs)).toContainEqual({ durationDays: { greater_than_equal: 1 } })
    expect(clauses(tourArgs)).toContainEqual({ durationDays: { less_than_equal: 7 } })

    expect(collectionCalls('pages')).toHaveLength(1)
    expect(collectionCalls('pages')[0]).toMatchObject({
      collection: 'pages',
      depth: 0,
      draft: false,
      fallbackLocale: false,
      limit: 2,
      locale: 'en',
      overrideAccess: false,
      pagination: false,
      select: { id: true, pathname: true, slug: true },
      where: {
        and: [
          { id: { in: [101, 102] } },
          { site: { equals: 3 } },
          { _status: { equals: 'published' } },
        ],
      },
    })
  })

  it('drops wrappers not returned by the constrained verification query', async () => {
    mockDiscoveryFind([product({ id: 99, wrapperPage: publicWrapper(999, '/tour/missing') })], [])

    const context = await getWingSideDiscoveryContext({ input: {}, locale: 'en' })

    expect(context.result.items).toEqual([])
    expect(context.result.total).toBe(0)
    expect(collectionCalls('tour-products')).toHaveLength(1)
    expect(collectionCalls('pages')).toHaveLength(1)
    expect(collectionCalls('pages')[0].where?.and).toContainEqual({ id: { in: [999] } })
  })

  it('uses AND semantics and relaxes duration first, then stops on the first non-empty set', async () => {
    const tours = [
      product({ destinationTags: ['hanoi'], durationDays: 20, id: 30, travelStyles: ['luxury'] }),
      product({ destinationTags: ['hanoi'], durationDays: 9, id: 31, travelStyles: ['culture'] }),
      product({ destinationTags: ['sapa'], durationDays: 9, id: 32, travelStyles: ['luxury'] }),
    ]
    mockDiscoveryFind(tours, [page()])

    const context = await getWingSideDiscoveryContext({
      input: { destination: 'hanoi', duration: '8-14', style: 'luxury' },
      locale: 'en',
    })

    expect(context.result.items.map(({ id }) => id)).toEqual([30])
    expect(context.result.relaxed).toEqual({
      removed: 'duration',
      query: { destination: 'hanoi', style: 'luxury' },
    })
    expect(discoveryLogs()).toHaveLength(1)
    expect(discoveryLogs()[0].fields).toMatchObject({
      destination_code: 'hanoi',
      duration_code: '8-14',
      invalid_filter_count: 0,
      relaxed: 'duration',
      result_count: 1,
      style_code: 'luxury',
      tenant_outcome: 'accepted',
    })
    expect(collectionCalls('tour-products')).toHaveLength(2)
    expect(collectionCalls('pages')).toHaveLength(1)
    expect(clauses(collectionCalls('tour-products')[0])).toContainEqual({
      durationDays: { greater_than_equal: 8 },
    })
    expect(
      clauses(collectionCalls('tour-products')[1]).some((clause) => 'durationDays' in clause),
    ).toBe(false)
  })

  it('continues zero-result relaxation cumulatively after duration is removed', async () => {
    const tours = [
      product({ destinationTags: ['hanoi'], durationDays: 20, id: 40, travelStyles: ['luxury'] }),
      product({ destinationTags: ['hanoi'], durationDays: 9, id: 41, travelStyles: ['family'] }),
      product({ destinationTags: ['sapa'], durationDays: 9, id: 42, travelStyles: ['culture'] }),
    ]
    mockDiscoveryFind(tours, [page()])

    const context = await getWingSideDiscoveryContext({
      input: { destination: 'hanoi', duration: '8-14', style: 'culture' },
      locale: 'en',
    })

    expect(context.result.items.map(({ id }) => id)).toEqual([41, 40])
    expect(context.result.relaxed).toEqual({
      removed: 'style',
      query: { destination: 'hanoi' },
    })
    expect(collectionCalls('tour-products')).toHaveLength(3)
    expect(collectionCalls('pages')).toHaveLength(1)

    const firstRelaxedClauses = clauses(collectionCalls('tour-products')[1])
    expect(firstRelaxedClauses).toContainEqual({ destinationTags: { in: ['hanoi'] } })
    expect(firstRelaxedClauses).toContainEqual({ travelStyles: { in: ['culture'] } })
    expect(firstRelaxedClauses.some((clause) => 'durationDays' in clause)).toBe(false)

    const secondRelaxedClauses = clauses(collectionCalls('tour-products')[2])
    expect(secondRelaxedClauses).toContainEqual({ destinationTags: { in: ['hanoi'] } })
    expect(secondRelaxedClauses.some((clause) => 'travelStyles' in clause)).toBe(false)
    expect(secondRelaxedClauses.some((clause) => 'durationDays' in clause)).toBe(false)
  })

  it('supports unfiltered base listing and never supplies static fallback cards', async () => {
    mockDiscoveryFind(
      [product({ id: 1, title: '' }), product({ heroMedia: null, id: 2 })],
      [page()],
    )

    const context = await getWingSideDiscoveryContext({ input: {}, locale: 'en' })

    expect(context.seo).toEqual({ canonicalPath: '/journeys', robots: 'index,follow' })
    expect(context.result.items).toEqual([])
    expect(context.result.total).toBe(0)
    expect(discoveryLogs()).toHaveLength(1)
    expect(discoveryLogs()[0].fields).toMatchObject({
      invalid_filter_count: 0,
      relaxed: null,
      result_count: 0,
      source: 'journeys',
      tenant_code: 'wing-side',
      tenant_outcome: 'accepted',
    })
    expect(discoveryLogs()[0].fields).not.toHaveProperty('destination_code')
    expect(discoveryLogs()[0].fields).not.toHaveProperty('duration_code')
    expect(discoveryLogs()[0].fields).not.toHaveProperty('style_code')
    expect(collectionCalls('tour-products')).toHaveLength(1)
    expect(collectionCalls('pages')).toHaveLength(1)
  })

  it('keeps invalid-only discovery URLs canonical and noindex without copying unrelated keys', async () => {
    mockDiscoveryFind([], [])

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
    expect(discoveryLogs()).toHaveLength(1)
    expect(discoveryLogs()[0].fields).toMatchObject({
      invalid_filter_count: 3,
      relaxed: null,
      result_count: 0,
      source: 'journeys',
      tenant_code: 'wing-side',
      tenant_outcome: 'accepted',
    })
    const serializedLog = JSON.stringify(discoveryLogs()[0])
    expect(serializedLog).not.toContain('raw-secret')
    expect(serializedLog).not.toContain('bogus-destination')
    expect(serializedLog).not.toContain('unknown')
    expect(serializedLog).not.toContain('99')
    expect(discoveryLogs()[0].fields).not.toHaveProperty('destination_code')
    expect(discoveryLogs()[0].fields).not.toHaveProperty('duration_code')
    expect(discoveryLogs()[0].fields).not.toHaveProperty('style_code')
    expect(collectionCalls('tour-products')).toHaveLength(1)
    expect(collectionCalls('pages')).toHaveLength(0)
    expect(clauses(collectionCalls('tour-products')[0])).toEqual([
      { _status: { equals: 'published' } },
      { wrapperPage: { exists: true } },
    ])
  })

  it('returns no results for non-WingSide tenants without querying tour-products', async () => {
    mocks.site = { code: 'wings-go', id: 4 }
    const consoleInfo = vi.spyOn(console, 'info').mockImplementation(() => undefined)

    const context = await getWingSideDiscoveryContext({
      input: { destination: 'hanoi' },
      locale: 'en',
    })

    expect(context.result.items).toEqual([])
    expect(context.seo).toEqual({ canonicalPath: '/journeys', robots: 'noindex,follow' })
    expect(mocks.find).not.toHaveBeenCalled()
    expect(discoveryLogs()).toHaveLength(0)
    expect(consoleInfo).toHaveBeenCalledTimes(1)
    const record = JSON.parse(String(consoleInfo.mock.calls[0]?.[0]))
    expect(record).toMatchObject({
      action: 'wingsside_discovery_completed',
      destination_code: 'hanoi',
      invalid_filter_count: 0,
      relaxed: null,
      result_count: 0,
      source: 'journeys',
      tenant_code: 'wings-go',
      tenant_outcome: 'rejected',
    })
    expect(record.duration_ms).toEqual(expect.any(Number))
    consoleInfo.mockRestore()
  })
})
