import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Page, TourProduct } from '../../src/payload-types'
import {
  editorialServiceLabelChecksum,
  editorialSourceChecksum,
  type EditorialTourContent,
  type WingsSideTourEditorialCatalog,
} from '../../scripts/lib/wingsSideTourEditorialLocalization'
import { editorialChecksum } from '../../scripts/lib/wingsSideTourEditorialProduction'

const transactions = vi.hoisted(() => ({
  commit: vi.fn(),
  init: vi.fn(),
  kill: vi.fn(),
}))

vi.mock('payload', () => ({
  commitTransaction: transactions.commit,
  initTransaction: transactions.init,
  killTransaction: transactions.kill,
}))

import {
  applyWingsSideTourEditorialProductionPlan,
  createWingsSideTourEditorialProductionPlan,
  rollbackWingsSideTourEditorialProductionPlan,
  verifyWingsSideTourEditorialProductionPlan,
} from '../../scripts/lib/wingsSideTourEditorialProductionRuntime'

const locales = ['vi', 'it', 'es', 'pt'] as const

const localizedContent = (index: number, locale: string): EditorialTourContent => ({
  excludes: [
    {
      label: `${locale} excluded ${index}`,
      sourceRowID: `exclude-${index}`,
      targetBucket: 'excludes',
    },
  ],
  includes: [
    {
      label: `${locale} included ${index}`,
      sourceRowID: `include-${index}`,
      targetBucket: 'includes',
    },
  ],
  itineraryDays: [
    {
      dayNumber: 1,
      route: `${locale} route ${index}`,
      summary: `${locale} detailed day summary ${index}`,
      title: `${locale} day title ${index}`,
    },
  ],
  meta: {
    breadcrumbLabel: `${locale} breadcrumb ${index}`,
    description: `${locale} meta description ${index}`,
    title: `${locale} meta title ${index}`,
  },
  primaryCTALabel: `${locale} plan journey`,
  routeSummary: `${locale} route summary ${index}`,
  servicesSummary: {
    hotelSummary: `${locale} hotel summary`,
    mealsSummary: `${locale} meals summary`,
    operatorNotes: `${locale} operator notes`,
    transportSummary: `${locale} transport summary`,
  },
  summary: `${locale} editorial tour summary ${index}`,
  title: `${locale} editorial tour title ${index}`,
})

const sourceTour = (index: number): TourProduct =>
  ({
    _status: 'published',
    bcfg: { template: 'dense-retail-default' },
    createdAt: '2026-01-01T00:00:00.000Z',
    durationDays: 1,
    durationNights: 0,
    excludes: [],
    id: index,
    includes: [
      { id: `include-${index}`, label: `English included ${index}` },
      { id: `exclude-${index}`, label: `Travel Insurance ${index}` },
    ],
    itineraryDays: [
      {
        dayNumber: 1,
        id: `day-${index}`,
        route: `English route ${index}`,
        summary: `English detailed day summary ${index}`,
        title: `English day title ${index}`,
      },
    ],
    market: 'vietnam',
    primaryCTA: { label: 'Plan my journey', mode: 'inquiry' },
    site: 7,
    slug: `tour-${index}`,
    summary: `English editorial tour summary ${index}`,
    title: `English editorial tour title ${index}`,
    updatedAt: '2026-01-01T00:00:00.000Z',
    wrapperPage: 100 + index,
  }) as TourProduct

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

const sourceWrapper = (index: number): Page =>
  ({
    _status: 'published',
    createdAt: '2026-01-01T00:00:00.000Z',
    hero: { type: 'none' },
    id: 100 + index,
    layout: [{ blockType: 'content', columns: [] }],
    meta: { image: 900 + index, title: `English wrapper meta ${index}` },
    pathname: `/tour/tour-${index}`,
    site: 7,
    slug: `wing-side-tour-${index}`,
    title: `English wrapper ${index}`,
    updatedAt: '2026-01-01T00:00:00.000Z',
  }) as Page

const fixture = ({ mutateEnglishOnLocalizedArrayWrite = false } = {}) => {
  const sources = Array.from({ length: 22 }, (_, index) => sourceTour(index + 1))
  const sourceWrappers = Array.from({ length: 22 }, (_, index) => sourceWrapper(index + 1))
  const approvalArtifactID = 'transaction-runtime-fixture'
  type ApprovalCompatibleCatalog = WingsSideTourEditorialCatalog & {
    approvalManifest: {
      approvalArtifactID: string
      approvedAt: string
      approvedBy: string
      checksum: string
      expectedPricingDisclosureCount: number
      trustedApprovers: string[]
      version: 1
    }
    pricingDispositions: Array<
      WingsSideTourEditorialCatalog['pricingDispositions'][number] & {
        approvalArtifactID: string
      }
    >
  }
  const catalog = {
    approvalManifest: {
      approvalArtifactID,
      approvedAt: '2026-07-28T00:00:00.000Z',
      approvedBy: 'content-owner',
      checksum: '',
      expectedPricingDisclosureCount: sources.length,
      trustedApprovers: ['content-owner'],
      version: 1,
    },
    pricingDispositions: sources.map((source) => ({
      approvalArtifactID,
      approvedAt: '2026-07-28T00:00:00.000Z',
      approvedBy: 'content-owner',
      approvedTargetBucket: 'excludes',
      rationale: 'Travel insurance is excluded.',
      slug: source.slug,
      sourceBucket: 'includes',
      sourceLabel: `Travel Insurance ${source.id}`,
      sourceLabelChecksum: editorialServiceLabelChecksum(`Travel Insurance ${source.id}`),
      sourceRowID: `exclude-${source.id}`,
    })),
    sourceLocale: 'en',
    targetLocales: [...locales],
    tours: sources.map((source, index) => ({
      locales: Object.fromEntries(
        locales.map((locale) => [locale, localizedContent(index + 1, locale)]),
      ) as Record<(typeof locales)[number], EditorialTourContent>,
      slug: source.slug,
      sourceChecksum: editorialSourceChecksum(source),
    })),
    version: 2,
  } as ApprovalCompatibleCatalog
  catalog.approvalManifest.checksum = editorialChecksum({
    governedLocaleLabels: catalog.pricingDispositions
      .map(({ slug, sourceRowID }) => {
        const catalogTour = catalog.tours.find((entry) => entry.slug === slug)!
        return {
          labels: Object.fromEntries(
            locales.map((locale) => {
              const content = catalogTour.locales[locale]
              const row = [...content.includes, ...content.excludes].find(
                (candidate) => candidate.sourceRowID === sourceRowID,
              )
              return [locale, row?.label || '']
            }),
          ),
          slug,
          sourceRowID,
        }
      })
      .sort((left, right) =>
        `${left.slug}:${left.sourceRowID}`.localeCompare(`${right.slug}:${right.sourceRowID}`),
      ),
    manifest: {
      approvalArtifactID: catalog.approvalManifest.approvalArtifactID,
      approvedAt: catalog.approvalManifest.approvedAt,
      approvedBy: catalog.approvalManifest.approvedBy,
      expectedPricingDisclosureCount:
        catalog.approvalManifest.expectedPricingDisclosureCount,
      trustedApprovers: [...catalog.approvalManifest.trustedApprovers].sort(),
      version: catalog.approvalManifest.version,
    },
    pricingDispositions: [...catalog.pricingDispositions].sort((left, right) =>
      `${left.slug}:${left.sourceRowID}`.localeCompare(`${right.slug}:${right.sourceRowID}`),
    ),
  })
  let state = Object.fromEntries([
    ['en', sources],
    ...locales.map((locale) => [locale, clone(sources)]),
  ]) as Record<'en' | (typeof locales)[number], TourProduct[]>
  let wrappers = Object.fromEntries([
    ['en', sourceWrappers],
    ...locales.map((locale) => [
      locale,
      sourceWrappers.map((page) => ({
        ...clone(page),
        layout: null,
        meta: null,
        title: null,
      })),
    ]),
  ]) as Record<'en' | (typeof locales)[number], Page[]>
  let transactionSnapshot: { state: typeof state; wrappers: typeof wrappers } | null = null
  const req = {} as { transactionID?: string }

  transactions.init.mockImplementation(async () => {
    transactionSnapshot = clone({ state, wrappers })
    req.transactionID = 'transaction'
    return true
  })
  transactions.commit.mockImplementation(async () => {
    transactionSnapshot = null
    delete req.transactionID
  })
  transactions.kill.mockImplementation(async () => {
    state = clone(transactionSnapshot!.state)
    wrappers = clone(transactionSnapshot!.wrappers)
    transactionSnapshot = null
    delete req.transactionID
  })

  const payload = {
    collections: {
      pages: {
        config: {
          fields: [
            { localized: true, name: 'title', required: true },
            {
              tabs: [
                {
                  fields: [{ localized: true, name: 'layout', required: true }],
                },
              ],
            },
          ],
          versions: true,
        },
      },
      'tour-products': { config: { versions: true } },
    },
    find: vi.fn(async (args: { collection: string; locale?: keyof typeof state }) => {
      if (args.collection === 'sites') return { docs: [{ id: 7 }] }
      if (args.collection === 'tour-products') return { docs: clone(state[args.locale || 'en']) }
      throw new Error(`Unexpected collection ${args.collection}`)
    }),
    findByID: vi.fn(
      async (args: { id: number | string; locale: 'en' | (typeof locales)[number] }) =>
        clone(wrappers[args.locale].find((page) => String(page.id) === String(args.id))!),
    ),
    update: vi.fn(
      async (args: {
        collection: 'pages' | 'tour-products'
        data: Record<string, unknown>
        id: number | string
        locale: (typeof locales)[number]
      }) => {
        if (args.collection === 'pages') {
          const index = wrappers[args.locale].findIndex(
            (page) => String(page.id) === String(args.id),
          )
          wrappers[args.locale][index] = {
            ...wrappers[args.locale][index]!,
            ...clone(args.data),
          } as Page
          return clone(wrappers[args.locale][index])
        }
        const index = state[args.locale].findIndex((tour) => String(tour.id) === String(args.id))
        state[args.locale][index] = {
          ...state[args.locale][index]!,
          ...clone(args.data),
        } as TourProduct
        if (
          mutateEnglishOnLocalizedArrayWrite &&
          String(args.locale) !== 'en' &&
          ('includes' in args.data || 'excludes' in args.data)
        ) {
          const englishIndex = state.en.findIndex((tour) => String(tour.id) === String(args.id))
          state.en[englishIndex] = {
            ...state.en[englishIndex]!,
            ...(args.data.includes ? { includes: clone(args.data.includes) } : {}),
            ...(args.data.excludes ? { excludes: clone(args.data.excludes) } : {}),
          } as TourProduct
        }
        return clone(state[args.locale][index])
      },
    ),
  }
  return {
    catalog,
    payload,
    req,
    state: () => state,
    wrappers: () => wrappers,
  }
}

describe('WingSide tour editorial production transaction runtime', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rolls back injected failure and supports idempotent apply and rollback', async () => {
    const { catalog, payload, req, state, wrappers } = fixture()
    const plan = await createWingsSideTourEditorialProductionPlan({
      catalog,
      createdAt: '2026-07-26T00:00:00.000Z',
      payload: payload as never,
      releaseSourceCommit: 'a'.repeat(40),
      req: req as never,
      runID: 'transaction-proof',
    })
    const before = clone(state())

    await expect(
      applyWingsSideTourEditorialProductionPlan({
        catalog,
        failAfterUpdates: 2,
        payload: payload as never,
        plan,
        req: req as never,
      }),
    ).rejects.toThrow('Injected tour editorial failure')
    await expect(
      verifyWingsSideTourEditorialProductionPlan({
        expectedState: 'before',
        payload: payload as never,
        plan,
        req: req as never,
      }),
    ).resolves.toEqual({ checked: 110, state: 'before' })
    expect(state().pt[0]!.primaryCTA.mode).toBe('inquiry')
    expect(state()).toEqual(before)
    expect(wrappers().pt[0]!.title).toBeNull()

    await expect(
      applyWingsSideTourEditorialProductionPlan({
        catalog,
        payload: payload as never,
        plan,
        req: req as never,
      }),
    ).resolves.toEqual({
      sharedUnchanged: 0,
      sharedUpdated: 22,
      unchanged: 0,
      updated: 88,
    })
    await expect(
      verifyWingsSideTourEditorialProductionPlan({
        expectedState: 'after',
        payload: payload as never,
        plan,
        req: req as never,
      }),
    ).resolves.toEqual({ checked: 110, state: 'after' })
    expect(wrappers().pt[0]).toMatchObject({
      layout: [{ blockType: 'content', columns: [] }],
      meta: { image: 901, title: 'pt meta title 1' },
      title: 'pt editorial tour title 1',
    })
    for (const locale of ['en', ...locales] as const) {
      expect(state()[locale][0]!.includes).toEqual([expect.objectContaining({ id: 'include-1' })])
      expect(state()[locale][0]!.excludes).toEqual([expect.objectContaining({ id: 'exclude-1' })])
    }
    expect(state().pt[0]!.includes?.[0]?.label).toBe('pt included 1')
    expect(state().pt[0]!.excludes?.[0]?.label).toBe('pt excluded 1')
    await expect(
      applyWingsSideTourEditorialProductionPlan({
        catalog,
        payload: payload as never,
        plan,
        req: req as never,
      }),
    ).resolves.toEqual({
      sharedUnchanged: 22,
      sharedUpdated: 0,
      unchanged: 88,
      updated: 0,
    })

    await expect(
      rollbackWingsSideTourEditorialProductionPlan({
        catalog,
        payload: payload as never,
        plan,
        req: req as never,
      }),
    ).resolves.toEqual({
      sharedUnchanged: 0,
      sharedUpdated: 22,
      unchanged: 0,
      updated: 88,
    })
    await expect(
      verifyWingsSideTourEditorialProductionPlan({
        expectedState: 'before',
        payload: payload as never,
        plan,
        req: req as never,
      }),
    ).resolves.toEqual({ checked: 110, state: 'before' })
    expect(state().pt[0]!.primaryCTA.mode).toBe('inquiry')
    for (const locale of ['en', ...locales] as const) {
      expect(state()[locale][0]!.includes?.map(({ id }) => id)).toEqual(['include-1', 'exclude-1'])
      expect(state()[locale][0]!.excludes).toEqual([])
    }
    expect(wrappers().pt[0]).toMatchObject({
      layout: null,
      meta: {
        breadcrumbLabel: null,
        description: null,
        image: 901,
        title: null,
      },
      title: null,
    })
    await expect(
      rollbackWingsSideTourEditorialProductionPlan({
        catalog,
        payload: payload as never,
        plan,
        req: req as never,
      }),
    ).resolves.toEqual({
      sharedUnchanged: 22,
      sharedUpdated: 0,
      unchanged: 88,
      updated: 0,
    })
    expect(payload.collections.pages.config.fields[0]!.required).toBe(true)
    expect(payload.collections.pages.config.fields[1]!.tabs?.[0]?.fields?.[0]?.required).toBe(true)
  })

  it('refuses unavailable transactions before any write', async () => {
    const { catalog, payload, req, state } = fixture()
    const plan = await createWingsSideTourEditorialProductionPlan({
      catalog,
      payload: payload as never,
      releaseSourceCommit: 'a'.repeat(40),
      req: req as never,
      runID: 'transaction-unavailable',
    })
    const before = clone(state())
    transactions.init.mockResolvedValueOnce(false)

    await expect(
      applyWingsSideTourEditorialProductionPlan({
        catalog,
        payload: payload as never,
        plan,
        req: req as never,
      }),
    ).rejects.toThrow('did not start the required tour editorial transaction')
    expect(state()).toEqual(before)
    expect(payload.update).not.toHaveBeenCalled()
  })

  it('refuses mixed shared-service state', async () => {
    const { catalog, payload, req } = fixture()
    const plan = await createWingsSideTourEditorialProductionPlan({
      catalog,
      payload: payload as never,
      releaseSourceCommit: 'a'.repeat(40),
      req: req as never,
      runID: 'mixed-state',
    })
    const first = plan.sharedServiceEntries[0]!
    await (
      payload.update as unknown as (args: Record<string, unknown>) => Promise<unknown>
    )({
      collection: 'tour-products',
      data: first.after as never,
      id: first.tourID,
      locale: 'en',
    })

    await expect(
      applyWingsSideTourEditorialProductionPlan({
        catalog,
        payload: payload as never,
        plan,
        req: req as never,
      }),
    ).rejects.toThrow('refused mixed shared service state')
  })

  it('repairs English commercial arrays when a localized array write leaks into the English row', async () => {
    const { catalog, payload, req, state } = fixture({ mutateEnglishOnLocalizedArrayWrite: true })
    const plan = await createWingsSideTourEditorialProductionPlan({
      catalog,
      createdAt: '2026-07-26T00:00:00.000Z',
      payload: payload as never,
      releaseSourceCommit: 'a'.repeat(40),
      req: req as never,
      runID: 'localized-array-leak-proof',
    })

    await expect(
      applyWingsSideTourEditorialProductionPlan({
        catalog,
        payload: payload as never,
        plan,
        req: req as never,
      }),
    ).resolves.toEqual({
      sharedUnchanged: 0,
      sharedUpdated: 22,
      unchanged: 0,
      updated: 88,
    })
    await expect(
      verifyWingsSideTourEditorialProductionPlan({
        catalog,
        expectedState: 'after',
        payload: payload as never,
        plan,
        req: req as never,
      }),
    ).resolves.toEqual({ checked: 110, state: 'after' })
    expect(state().en[0]!.includes).toEqual([{ id: 'include-1', label: 'English included 1' }])
  })
})
