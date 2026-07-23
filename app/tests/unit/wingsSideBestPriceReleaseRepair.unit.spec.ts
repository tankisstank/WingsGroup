import { describe, expect, it } from 'vitest'

import { bestPriceMediaFilename, type BestPriceNormalizedTour } from '../../scripts/lib/bestprice22'
import {
  assertReleaseRepairPlanRecords,
  assertReleaseRepairScope,
  buildReleaseRepairPlanRecords,
  classifyReleaseRepairState,
  releaseRepairMediaUpdateData,
  releaseRepairPlanRepresentsOnlyFieldUpdates,
  releaseRepairProductUpdateData,
  releaseRepairTransitionDecision,
  releaseRepairWrapperUpdateData,
  type ReleaseRepairAggregate,
  type ReleaseRepairPlanRecord,
} from '../../scripts/lib/wingsSideBestPriceReleaseRepair'
import {
  wingsSideBestPriceCleanupBatchID,
  wingsSideBestPriceTechnicalCopy,
} from '../../scripts/lib/wingsSideBestPriceCleanup'

const siteID = 3

const normalizedTour = (index: number, genericAlt = true): BestPriceNormalizedTour => {
  const suffix = String(index).padStart(2, '0')
  const sourceId = `vietnam-tours--release-repair-${suffix}`
  const title = `Release repair journey ${suffix}`

  return {
    blockingErrors: [],
    category: 'vietnam-tours',
    currency: 'USD',
    durationDays: 2,
    durationNights: 1,
    excludes: ['International flights', 'Travel insurance'],
    futureDepartures: [],
    images: [
      {
        alt: genericAlt ? 'img-video' : `Rice terraces for journey ${suffix}`,
        hash: `abcdef${suffix}`,
        localPath: `images\\bestprice\\${sourceId}\\01.jpg`,
        sourceKey: `bestpricetravel:${sourceId}:media:1-abcdef${suffix}`,
        sourceUrl: `https://source.invalid/${sourceId}/01.jpg`,
      },
    ],
    includes: ['Local guide', 'Private transfers'],
    itineraryDays: [
      {
        dayNumber: 1,
        route: 'Hanoi - Sapa',
        summary: 'Travel north.',
        title: 'Hanoi to Sapa',
      },
    ],
    market: 'vietnam',
    matchedDocument: `release-repair-${suffix}.docx`,
    priceFrom: null,
    publishEligible: true,
    sectionVisibility: ['facts', 'itinerary', 'services', 'related', 'sticky-cta'],
    slug: `release-repair-journey-${suffix}`,
    sourceFile: 'bestprice_tours.json',
    sourceHash: `source-hash-${suffix}`,
    sourceId,
    sourceUrl: `https://www.bestpricetravel.com/vietnam-tours/release-repair-${suffix}.html`,
    summary: `A memorable experience. Socialize with local hosts ${suffix}.`,
    title,
    warnings: [],
  }
}

const aggregate = (index: number, genericAlt = true): ReleaseRepairAggregate => {
  const normalized = normalizedTour(index, genericAlt)
  const productID = 400 + index
  const wrapperID = 800 + index
  const heroID = 1200 + index
  const firstImage = normalized.images[0]

  return {
    hero: {
      alt: genericAlt ? 'img-video' : firstImage.alt,
      filename: bestPriceMediaFilename(normalized.sourceId, 0, firstImage),
      id: heroID,
      site: siteID,
      updatedAt: '2026-07-17T00:00:00.000Z',
    },
    normalized,
    product: {
      _status: 'published',
      excludes: [],
      factSummary: {
        operatorNote: wingsSideBestPriceTechnicalCopy.factSummaryOperatorNote,
      },
      heroMedia: heroID,
      id: productID,
      includes: [
        { label: 'International flights' },
        { label: 'Travel insurance' },
        { label: 'Local guide' },
        { label: 'Private transfers' },
      ],
      meta: { description: 'A memorable experience.Socialize with local hosts.' },
      servicesSummary: {
        notes: [
          { label: 'Keep this public note.' },
          { label: wingsSideBestPriceTechnicalCopy.servicesSummaryNoteLabel },
        ],
        operatorNotes: wingsSideBestPriceTechnicalCopy.servicesSummaryOperatorNotes,
      },
      site: siteID,
      slug: normalized.slug,
      sourceProvenance: {
        importBatchId: wingsSideBestPriceCleanupBatchID,
        sourceHash: normalized.sourceHash,
        sourceId: normalized.sourceId,
      },
      summary: 'A memorable experience.Socialize with local hosts.',
      tourCode: `BPT-${normalized.sourceId}`,
      updatedAt: '2026-07-17T00:00:00.000Z',
      wrapperPage: wrapperID,
    },
    wrapper: {
      id: wrapperID,
      meta: { description: 'A memorable experience.Socialize with local hosts.' },
      site: siteID,
      slug: `wing-side-${normalized.slug}`,
      updatedAt: '2026-07-17T00:00:00.000Z',
    },
  }
}

const aggregates = () => Array.from({ length: 22 }, (_, index) => aggregate(index + 1))

const clone = <T>(value: T): T => structuredClone(value)

const applySnapshot = (
  current: ReleaseRepairAggregate,
  record: ReleaseRepairPlanRecord,
  side: 'after' | 'before',
): ReleaseRepairAggregate => {
  const next = clone(current)
  const target = record[side]
  next.product.summary = target.productSummary.value
  next.product.meta = {
    ...(next.product.meta || {}),
    description: target.productMetaDescription.value,
  }
  next.product.includes = clone(target.includes.value)
  next.product.excludes = clone(target.excludes.value)
  next.product.factSummary = {
    ...(next.product.factSummary || {}),
    operatorNote: target.factSummaryOperatorNote.value,
  }
  next.product.servicesSummary = {
    ...(next.product.servicesSummary || {}),
    notes: clone(target.servicesSummaryNotes.value),
    operatorNotes: target.servicesSummaryOperatorNotes.value,
  }
  next.wrapper.meta = {
    ...(next.wrapper.meta || {}),
    description: target.wrapperMetaDescription.value,
  }
  next.hero.alt = target.heroMediaAlt.value
  return next
}

describe('WingsSide BestPrice exact-scope release repair planner', () => {
  it('accepts exactly 22 valid same-tenant aggregates and plans only field updates', () => {
    const scoped = assertReleaseRepairScope({ aggregates: aggregates(), siteID })
    const plan = buildReleaseRepairPlanRecords({ aggregates: scoped, siteID })

    expect(scoped).toHaveLength(22)
    expect(plan).toHaveLength(22)
    expect(plan.every(({ action }) => action === 'update')).toBe(true)
    expect(releaseRepairPlanRepresentsOnlyFieldUpdates(plan)).toBe(true)
    expect(() => assertReleaseRepairPlanRecords(plan)).not.toThrow()
  })

  it.each([
    ['product tenant', (items: ReleaseRepairAggregate[]) => (items[0].product.site = 99)],
    ['wrapper tenant', (items: ReleaseRepairAggregate[]) => (items[0].wrapper.site = 99)],
    ['hero tenant', (items: ReleaseRepairAggregate[]) => (items[0].hero.site = 99)],
    [
      'batch',
      (items: ReleaseRepairAggregate[]) =>
        (items[0].product.sourceProvenance!.importBatchId = 'wrong-batch'),
    ],
    [
      'wrapper relation',
      (items: ReleaseRepairAggregate[]) => (items[0].product.wrapperPage = 99999),
    ],
    ['hero relation', (items: ReleaseRepairAggregate[]) => (items[0].product.heroMedia = 99999)],
    ['hero filename', (items: ReleaseRepairAggregate[]) => (items[0].hero.filename = 'wrong.jpg')],
  ])('rejects invalid %s scope', (_label, mutate) => {
    const items = aggregates()
    mutate(items)
    expect(() => buildReleaseRepairPlanRecords({ aggregates: items, siteID })).toThrow()
  })

  it.each([
    ['slug', (items: ReleaseRepairAggregate[]) => (items[1].product.slug = items[0].product.slug)],
    [
      'tourCode',
      (items: ReleaseRepairAggregate[]) => (items[1].product.tourCode = items[0].product.tourCode),
    ],
    [
      'sourceId',
      (items: ReleaseRepairAggregate[]) =>
        (items[1].product.sourceProvenance!.sourceId = items[0].product.sourceProvenance!.sourceId),
    ],
    ['wrapper', (items: ReleaseRepairAggregate[]) => (items[1].wrapper.id = items[0].wrapper.id)],
    ['hero', (items: ReleaseRepairAggregate[]) => (items[1].hero.id = items[0].hero.id)],
  ])('rejects duplicate %s values', (_label, mutate) => {
    const items = aggregates()
    mutate(items)
    expect(() => assertReleaseRepairScope({ aggregates: items, siteID })).toThrow(/duplicate/iu)
  })

  it('rejects a missing target field because exact rollback would be impossible', () => {
    const items = aggregates()
    delete items[0].hero.alt

    expect(() => buildReleaseRepairPlanRecords({ aggregates: items, siteID })).toThrow(
      /present must be true/iu,
    )
  })

  it('accepts the production legacy dcv filename when its deterministic suffix matches', () => {
    const items = aggregates()
    for (const item of items) {
      item.hero.filename = item.hero.filename!.replace(/^bpt-/u, 'dcv-')
    }

    expect(() => buildReleaseRepairPlanRecords({ aggregates: items, siteID })).not.toThrow()
  })

  it('derives governed copy, service classification, and generic hero alt from source', () => {
    const plan = buildReleaseRepairPlanRecords({ aggregates: aggregates(), siteID })
    const first = plan[0].after

    expect(first.productSummary.value).toBe(
      'A memorable experience. Socialize with local hosts 01.',
    )
    expect(first.productMetaDescription.value).toBe(first.productSummary.value)
    expect(first.wrapperMetaDescription.value).toBe(first.productSummary.value)
    expect(first.includes.value).toEqual([{ label: 'Local guide' }, { label: 'Private transfers' }])
    expect(first.excludes.value).toEqual([
      { label: 'International flights' },
      { label: 'Travel insurance' },
    ])
    expect(first.factSummaryOperatorNote.value).toBeNull()
    expect(first.servicesSummaryOperatorNotes.value).toBeNull()
    expect(first.servicesSummaryNotes.value).toEqual([{ label: 'Keep this public note.' }])
    expect(first.heroMediaAlt.value).toBe('Release repair journey 01')
  })

  it('preserves a meaningful source hero alt', () => {
    const items = aggregates()
    items[0] = aggregate(1, false)
    const plan = buildReleaseRepairPlanRecords({ aggregates: items, siteID })

    expect(plan[0].after.heroMediaAlt.value).toBe('Rice terraces for journey 01')
  })

  it('rejects tampered plan snapshots and checksums', () => {
    const plan = buildReleaseRepairPlanRecords({ aggregates: aggregates(), siteID })
    plan[0].after.productSummary.value = 'Tampered'

    expect(() => assertReleaseRepairPlanRecords(plan)).toThrow(/integrity validation/iu)
  })

  it('classifies before, after, mixed, and unknown drift states', () => {
    const before = aggregates()
    const plan = buildReleaseRepairPlanRecords({ aggregates: before, siteID })
    const after = before.map((item, index) => applySnapshot(item, plan[index], 'after'))
    const mixed = after.map((item, index) =>
      index === 0 ? applySnapshot(item, plan[index], 'before') : item,
    )
    const drifted = clone(before)
    drifted[0].product.summary = 'Unplanned concurrent edit'

    expect(classifyReleaseRepairState({ aggregates: before, records: plan, siteID })).toBe('before')
    expect(classifyReleaseRepairState({ aggregates: after, records: plan, siteID })).toBe('after')
    expect(classifyReleaseRepairState({ aggregates: mixed, records: plan, siteID })).toBe('mixed')
    expect(classifyReleaseRepairState({ aggregates: drifted, records: plan, siteID })).toBe(
      'unknown',
    )
  })

  it('builds symmetric apply and rollback payloads from exact snapshots', () => {
    const items = aggregates()
    const plan = buildReleaseRepairPlanRecords({ aggregates: items, siteID })
    const item = items[0]
    const record = plan[0]

    const applyProduct = releaseRepairProductUpdateData(
      item.product,
      record.after,
      record.changedPaths,
    )
    const rollbackProduct = releaseRepairProductUpdateData(
      applySnapshot(item, record, 'after').product,
      record.before,
      record.changedPaths,
    )
    const applyWrapper = releaseRepairWrapperUpdateData(
      item.wrapper,
      record.after,
      record.changedPaths,
    )
    const rollbackWrapper = releaseRepairWrapperUpdateData(
      applySnapshot(item, record, 'after').wrapper,
      record.before,
      record.changedPaths,
    )
    const applyMedia = releaseRepairMediaUpdateData(item.hero, record.after, record.changedPaths)
    const rollbackMedia = releaseRepairMediaUpdateData(
      applySnapshot(item, record, 'after').hero,
      record.before,
      record.changedPaths,
    )

    expect(applyProduct.summary).toBe(record.after.productSummary.value)
    expect(rollbackProduct.summary).toBe(record.before.productSummary.value)
    expect(applyWrapper.meta?.description).toBe(record.after.wrapperMetaDescription.value)
    expect(rollbackWrapper.meta?.description).toBe(record.before.wrapperMetaDescription.value)
    expect(applyMedia.alt).toBe(record.after.heroMediaAlt.value)
    expect(rollbackMedia.alt).toBe(record.before.heroMediaAlt.value)
    expect(releaseRepairTransitionDecision('apply', 'before')).toEqual({
      desiredState: 'after',
      resumed: false,
    })
    expect(releaseRepairTransitionDecision('rollback', 'after')).toEqual({
      desiredState: 'before',
      resumed: false,
    })
  })
})
