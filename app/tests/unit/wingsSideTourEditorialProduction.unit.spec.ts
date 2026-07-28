import { describe, expect, it } from 'vitest'

import type { Page, TourProduct } from '../../src/payload-types'
import {
  editorialSourceChecksum,
  editorialServiceLabelChecksum,
  type EditorialTourContent,
  type WingsSideTourEditorialCatalog,
} from '../../scripts/lib/wingsSideTourEditorialLocalization'
import {
  assertEditorialPlanShape,
  buildEditorialWriteData,
  buildEditorialWrapperWriteData,
  buildWingsSideTourEditorialPlan,
  editorialChecksum,
  normalizeEditorialSharedServices,
  validateWingsSideTourPublicInventory,
  wingsSideTourPublicLocales,
} from '../../scripts/lib/wingsSideTourEditorialProduction'

const content = (index: number, locale: string): EditorialTourContent => ({
  excludes: [
    {
      label: `${locale} exclusion ${index}`,
      sourceRowID: `exclude-${index}`,
      targetBucket: 'excludes',
    },
  ],
  includes: [
    {
      label: `${locale} inclusion ${index}`,
      sourceRowID: `include-${index}`,
      targetBucket: 'includes',
    },
  ],
  itineraryDays: [
    {
      accommodation: `${locale} hotel`,
      dayNumber: 1,
      meals: `${locale} breakfast`,
      route: `${locale} route ${index}`,
      summary: `${locale} day summary ${index}`,
      title: `${locale} day ${index}`,
      transport: `${locale} coach`,
    },
  ],
  meta: {
    breadcrumbLabel: `${locale} breadcrumb ${index}`,
    description: `${locale} description ${index}`,
    title: `${locale} meta ${index}`,
  },
  primaryCTALabel: `${locale} plan trip`,
  routeSummary: `${locale} route summary ${index}`,
  servicesSummary: {
    hotelSummary: `${locale} hotels`,
    mealsSummary: `${locale} meals`,
    operatorNotes: `${locale} notes`,
    transportSummary: `${locale} transport`,
  },
  summary: `${locale} tour summary ${index}`,
  title: `${locale} tour ${index}`,
})

const sourceTour = (index: number): TourProduct =>
  ({
    _status: 'published',
    bcfg: { template: 'dense-retail-default' },
    createdAt: '2026-01-01T00:00:00.000Z',
    durationDays: 1,
    durationNights: 0,
    excludes: [],
    factSummary: { groupSizeSummary: 'Private', routeSummary: `English route ${index}` },
    id: index,
    includes: [
      { id: `include-${index}`, label: `English inclusion ${index}` },
      { id: `exclude-${index}`, label: `Travel Insurance ${index}` },
    ],
    itineraryDays: [
      {
        dayNumber: 1,
        id: `day-${index}`,
        media: 900 + index,
        notes: 'Keep this operational note',
        route: `English route ${index}`,
        summary: `English day summary ${index}`,
        title: `English day ${index}`,
      },
    ],
    market: 'vietnam',
    meta: { image: 500 + index, title: `English meta ${index}` },
    primaryCTA: { href: '/plan-your-trip', label: 'Plan my trip', mode: 'inquiry' },
    servicesSummary: {
      notes: [{ id: `service-${index}`, label: 'Keep non-localized service note' }],
    },
    site: 7,
    slug: `tour-${index}`,
    summary: `English tour summary ${index}`,
    title: `English tour ${index}`,
    updatedAt: '2026-01-01T00:00:00.000Z',
    wrapperPage: 100 + index,
  }) as TourProduct

const sourceWrapper = (index: number): Page =>
  ({
    _status: 'published',
    createdAt: '2026-01-01T00:00:00.000Z',
    hero: { type: 'none' },
    id: 100 + index,
    layout: [
      {
        blockType: 'content',
        columns: [
          {
            enableLink: false,
            id: '6a5b1b8bb69251003de23bce',
            richText: null,
            size: 'full',
          },
        ],
        id: '6a66ef81de75205341949cd3',
      },
    ],
    meta: { image: 700 + index, title: `English wrapper meta ${index}` },
    pathname: `/tour/tour-${index}`,
    site: 7,
    slug: `wing-side-tour-${index}`,
    title: `English wrapper ${index}`,
    updatedAt: '2026-01-01T00:00:00.000Z',
  }) as Page

const catalogAndSources = () => {
  const sources = Array.from({ length: 22 }, (_, index) => sourceTour(index + 1))
  const catalog: WingsSideTourEditorialCatalog = {
    pricingDispositions: sources.map((source) => ({
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
    targetLocales: ['vi', 'it', 'es', 'pt'],
    tours: sources.map((source, index) => ({
      locales: {
        es: content(index + 1, 'es'),
        it: content(index + 1, 'it'),
        pt: content(index + 1, 'pt'),
        vi: content(index + 1, 'vi'),
      },
      slug: source.slug,
      sourceChecksum: editorialSourceChecksum(source),
    })),
    version: 2,
  }
  return { catalog, sources }
}

describe('WingSide tour editorial production plan', () => {
  it('preserves array IDs and non-localized operational fields in write data', () => {
    const source = sourceTour(1)
    const normalizedServices = normalizeEditorialSharedServices({
      content: content(1, 'pt'),
      dispositions: catalogAndSources().catalog.pricingDispositions,
      slug: source.slug,
      source,
    })
    const data = buildEditorialWriteData({
      content: content(1, 'pt'),
      source: {
        ...source,
        excludes: normalizedServices.excludes,
        includes: normalizedServices.includes,
      },
    })
    const day = (data.itineraryDays as Array<Record<string, unknown>>)[0]!

    expect(day).toMatchObject({
      id: 'day-1',
      media: 901,
      notes: 'Keep this operational note',
      title: 'pt day 1',
    })
    expect(data.includes).toEqual([{ id: 'include-1', label: 'pt inclusion 1' }])
    expect(data.excludes).toEqual([{ id: 'exclude-1', label: 'pt exclusion 1' }])
    expect(data.primaryCTA).toMatchObject({ href: '/plan-your-trip', label: 'pt plan trip' })
    expect(data.meta).toMatchObject({ image: 501, title: 'pt meta 1' })
    expect(data.servicesSummary).toMatchObject({
      notes: [{ id: 'service-1', label: 'Keep non-localized service note' }],
      operatorNotes: 'pt notes',
    })
    expect(
      buildEditorialWrapperWriteData({
        content: content(1, 'pt'),
        source: sourceWrapper(1),
      }),
    ).toMatchObject({
      layout: [
        {
          blockType: 'content',
          columns: [{ enableLink: false, richText: null, size: 'full' }],
        },
      ],
      meta: { image: 701, title: 'pt meta 1' },
      title: 'pt tour 1',
    })
  })

  it.each([
    'Peak season surcharge applies',
    'A fuel surcharge will be applied if fuel prices rise',
    'Compulsory dinner at the hotel',
  ])('fails plan normalization closed for unlocalized pricing disclosure: %s', (label) => {
    const source = sourceTour(1) as TourProduct & {
      includes: Array<{ id: string; label: string }>
    }
    source.includes.push({ id: 'pricing-disclosure-1', label })
    const localized = content(1, 'vi')
    localized.includes.push({
      label: 'Khoản phụ phí',
      sourceRowID: 'pricing-disclosure-1',
      targetBucket: 'includes',
    })

    expect(() =>
      normalizeEditorialSharedServices({
        content: localized,
        dispositions: [],
        slug: source.slug,
        source,
      }),
    ).toThrow(/requires approved localized disposition/u)
  })

  it('builds an exact 22 by 4 drift-checked plan', () => {
    const { catalog, sources } = catalogAndSources()
    const beforeByKey = new Map<string, TourProduct>()
    const wrapperBeforeByKey = new Map<string, Page>()
    for (const source of sources) {
      for (const locale of ['vi', 'it', 'es', 'pt']) {
        beforeByKey.set(`${locale}:${source.slug}`, source)
        wrapperBeforeByKey.set(`${locale}:${source.slug}`, {
          ...sourceWrapper(source.id as number),
          layout: null,
          meta: null,
          title: null,
        } as unknown as Page)
      }
    }
    const plan = buildWingsSideTourEditorialPlan({
      beforeByKey,
      catalog,
      createdAt: '2026-07-26T00:00:00.000Z',
      releaseSourceCommit: 'a'.repeat(40),
      runID: 'test-run',
      siteID: 7,
      sourceTours: sources,
      sourceWrappers: new Map(
        sources.map((source) => [source.slug, sourceWrapper(source.id as number)]),
      ),
      wrapperBeforeByKey,
      wrapperPageIDs: new Map(sources.map((source) => [source.slug, source.wrapperPage as number])),
    })

    expect(plan.entries).toHaveLength(88)
    expect(plan.sharedServiceEntries).toHaveLength(22)
    expect(plan.serviceRowLedger).toHaveLength(22)
    expect(plan.serviceRowLedger[0]).toMatchObject({
      afterCount: 2,
      beforeCount: 2,
      beforeRowIDs: ['include-1', 'exclude-1'],
    })
    expect([...plan.serviceRowLedger[0]!.afterRowIDs].sort()).toEqual(
      [...plan.serviceRowLedger[0]!.beforeRowIDs].sort(),
    )
    expect(plan.sharedServiceEntries[0]!.before).toMatchObject({
      excludes: [],
      includes: expect.any(Array),
    })
    expect(plan.sharedServiceEntries[0]!.after).toMatchObject({
      excludes: [expect.objectContaining({ id: 'exclude-1' })],
      includes: [expect.objectContaining({ id: 'include-1' })],
    })
    expect(new Set(plan.entries.map(({ locale, slug }) => `${locale}:${slug}`)).size).toBe(88)
    expect(() => assertEditorialPlanShape(plan)).not.toThrow()
    expect(
      plan.entries.every(
        ({ afterChecksum, after, wrapperAfter }) =>
          afterChecksum === editorialChecksum({ tour: after, wrapper: wrapperAfter }),
      ),
    ).toBe(true)
    expect(plan.entries[0]!.wrapperBefore.title).toBeNull()
    expect(plan.entries[0]!.wrapperAfter.title).toBe('vi tour 1')
  })

  it('rejects aggregate plan tampering', () => {
    const { catalog, sources } = catalogAndSources()
    const beforeByKey = new Map<string, TourProduct>()
    const wrapperBeforeByKey = new Map<string, Page>()
    for (const source of sources) {
      for (const locale of ['vi', 'it', 'es', 'pt']) {
        beforeByKey.set(`${locale}:${source.slug}`, source)
        wrapperBeforeByKey.set(`${locale}:${source.slug}`, sourceWrapper(source.id as number))
      }
    }
    const plan = buildWingsSideTourEditorialPlan({
      beforeByKey,
      catalog,
      createdAt: '2026-07-26T00:00:00.000Z',
      releaseSourceCommit: 'a'.repeat(40),
      runID: 'test-run',
      siteID: 7,
      sourceTours: sources,
      sourceWrappers: new Map(
        sources.map((source) => [source.slug, sourceWrapper(source.id as number)]),
      ),
      wrapperBeforeByKey,
      wrapperPageIDs: new Map(sources.map((source) => [source.slug, source.wrapperPage as number])),
    })
    plan.entries[0]!.wrapperAfter.title = 'tampered wrapper'

    expect(() => assertEditorialPlanShape(plan)).toThrow('entry checksum mismatch')
  })

  it('fails closed on locale service-shape and row-identity drift', () => {
    const build = ({
      catalog,
      sources,
      mutateBefore,
    }: {
      catalog: WingsSideTourEditorialCatalog
      sources: TourProduct[]
      mutateBefore?: (before: TourProduct, locale: string, slug: string) => TourProduct
    }) => {
      const beforeByKey = new Map<string, TourProduct>()
      const wrapperBeforeByKey = new Map<string, Page>()
      for (const source of sources) {
        for (const locale of ['vi', 'it', 'es', 'pt']) {
          beforeByKey.set(
            `${locale}:${source.slug}`,
            mutateBefore ? mutateBefore(source, locale, source.slug) : source,
          )
          wrapperBeforeByKey.set(`${locale}:${source.slug}`, sourceWrapper(source.id as number))
        }
      }
      return buildWingsSideTourEditorialPlan({
        beforeByKey,
        catalog,
        createdAt: '2026-07-26T00:00:00.000Z',
        releaseSourceCommit: 'a'.repeat(40),
        runID: 'guard-test',
        siteID: 7,
        sourceTours: sources,
        sourceWrappers: new Map(
          sources.map((source) => [source.slug, sourceWrapper(source.id as number)]),
        ),
        wrapperBeforeByKey,
        wrapperPageIDs: new Map(
          sources.map((source) => [source.slug, source.wrapperPage as number]),
        ),
      })
    }

    const shapeFixture = catalogAndSources()
    shapeFixture.catalog.tours[0]!.locales.pt.excludes.push({
      label: 'pt extra exclusion',
      sourceRowID: 'unknown-row',
      targetBucket: 'excludes',
    })
    expect(() => build(shapeFixture)).toThrow(
      'does not preserve exact source row IDs',
    )

    const identityFixture = catalogAndSources()
    expect(() =>
      build({
        ...identityFixture,
        mutateBefore: (before, locale, slug) =>
          locale === 'vi' && slug === 'tour-1'
            ? ({
                ...before,
                includes: [{ id: 'unexpected-row', label: 'Unexpected' }],
              } as TourProduct)
            : before,
      }),
    ).toThrow('Localized service row identity drift')

    const missingIDFixture = catalogAndSources()
    delete (missingIDFixture.sources[0]!.includes?.[0] as { id?: unknown }).id
    missingIDFixture.catalog.tours[0]!.sourceChecksum = editorialSourceChecksum(
      missingIDFixture.sources[0]!,
    )
    expect(() => build(missingIDFixture)).toThrow('service row is missing a stable ID')
  })

  it('requires the same 22 public listing and detail slugs in every locale', () => {
    const slugs = Array.from({ length: 22 }, (_, index) => `tour-${index + 1}`)
    const listingSlugsByLocale = Object.fromEntries(
      wingsSideTourPublicLocales.map((locale) => [locale, [...slugs]]),
    ) as Record<(typeof wingsSideTourPublicLocales)[number], string[]>
    const detailSlugsByLocale = Object.fromEntries(
      wingsSideTourPublicLocales.map((locale) => [locale, [...slugs]]),
    ) as Record<(typeof wingsSideTourPublicLocales)[number], string[]>

    expect(
      validateWingsSideTourPublicInventory({
        detailSlugsByLocale,
        expectedSlugs: slugs,
        listingSlugsByLocale,
      }),
    ).toEqual([])

    listingSlugsByLocale.vi = slugs.slice(1)
    const findings = validateWingsSideTourPublicInventory({
      detailSlugsByLocale,
      expectedSlugs: slugs,
      listingSlugsByLocale,
    })
    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          locale: 'vi',
          message: 'Public detail exists but is absent from the same-locale listing',
          slugs: ['tour-1'],
        }),
      ]),
    )
  })
})
