import { describe, expect, it } from 'vitest'

import type { TourProduct } from '../../src/payload-types'
import {
  editorialSourceChecksum,
  type EditorialTourContent,
  type WingsSideTourEditorialCatalog,
} from '../../scripts/lib/wingsSideTourEditorialLocalization'
import {
  assertEditorialPlanShape,
  buildEditorialWriteData,
  buildWingsSideTourEditorialPlan,
  editorialChecksum,
  snapshotEditorialOwnedFields,
} from '../../scripts/lib/wingsSideTourEditorialProduction'

const content = (index: number, locale: string): EditorialTourContent => ({
  excludes: [`${locale} exclusion ${index}`],
  includes: [`${locale} inclusion ${index}`],
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
    excludes: [{ id: `exclude-${index}`, label: `English exclusion ${index}` }],
    factSummary: { groupSizeSummary: 'Private', routeSummary: `English route ${index}` },
    id: index,
    includes: [{ id: `include-${index}`, label: `English inclusion ${index}` }],
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

const catalogAndSources = () => {
  const sources = Array.from({ length: 22 }, (_, index) => sourceTour(index + 1))
  const catalog: WingsSideTourEditorialCatalog = {
    sourceLocale: 'en',
    targetLocales: ['vi', 'it', 'es', 'pt'],
    tours: sources.map((source, index) => ({
      locales: {
        es: content(index, 'es'),
        it: content(index, 'it'),
        pt: content(index, 'pt'),
        vi: content(index, 'vi'),
      },
      slug: source.slug,
      sourceChecksum: editorialSourceChecksum(source),
    })),
    version: 1,
  }
  return { catalog, sources }
}

describe('WingSide tour editorial production plan', () => {
  it('preserves array IDs and non-localized operational fields in write data', () => {
    const source = sourceTour(1)
    const data = buildEditorialWriteData({ content: content(1, 'pt'), source })
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
  })

  it('builds an exact 22 by 4 drift-checked plan', () => {
    const { catalog, sources } = catalogAndSources()
    const beforeByKey = new Map<string, TourProduct>()
    for (const source of sources) {
      for (const locale of ['vi', 'it', 'es', 'pt']) {
        beforeByKey.set(`${locale}:${source.slug}`, source)
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
      wrapperPageIDs: new Map(sources.map((source) => [source.slug, source.wrapperPage as number])),
    })

    expect(plan.entries).toHaveLength(88)
    expect(new Set(plan.entries.map(({ locale, slug }) => `${locale}:${slug}`)).size).toBe(88)
    expect(() => assertEditorialPlanShape(plan)).not.toThrow()
    expect(plan.entries.every(({ afterChecksum, after }) => afterChecksum === editorialChecksum(after))).toBe(
      true,
    )
  })

  it('rejects aggregate plan tampering', () => {
    const { catalog, sources } = catalogAndSources()
    const beforeByKey = new Map<string, TourProduct>()
    for (const source of sources) {
      for (const locale of ['vi', 'it', 'es', 'pt']) {
        beforeByKey.set(`${locale}:${source.slug}`, source)
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
      wrapperPageIDs: new Map(sources.map((source) => [source.slug, source.wrapperPage as number])),
    })
    plan.entries[0]!.afterChecksum = editorialChecksum(snapshotEditorialOwnedFields(sourceTour(1)))

    expect(() => assertEditorialPlanShape(plan)).toThrow('entry checksum mismatch')
  })
})
