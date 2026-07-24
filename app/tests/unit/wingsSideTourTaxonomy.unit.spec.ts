import { describe, expect, it, vi } from 'vitest'

import {
  assertTourTaxonomyPlanRecords,
  assertTourTaxonomyScope,
  buildTourTaxonomyPlanRecords,
  classifyTourTaxonomyState,
  validateTourTaxonomyMappings,
  wingsSideTourTaxonomyBatchID,
  wingsSideTourTaxonomyExpectedCount,
  wingsSideTourTaxonomyMappings,
  wingsSideTourTaxonomySiteCode,
  type TourTaxonomyDocument,
} from '../../scripts/lib/wingsSideTourTaxonomy'
import { transitionTourTaxonomy } from '../../scripts/lib/wingsSideTourTaxonomyRuntime'
import {
  buildTourTaxonomyWhere,
  normalizeTourDestinationKeys,
  normalizeTourTravelStyleKeys,
} from '@/tours/taxonomy'

const siteID = 3

const documents = (): TourTaxonomyDocument[] =>
  wingsSideTourTaxonomyMappings.map((mapping, index) => ({
    _status: 'published',
    destinationTags: [],
    id: index + 1,
    site: siteID,
    slug: `tour-${index + 1}`,
    sourceProvenance: {
      importBatchId: wingsSideTourTaxonomyBatchID,
      sourceHash: `hash-${index + 1}`,
      sourceId: mapping.sourceID,
    },
    taxonomyProvenance: null,
    travelStyles: [],
    wrapperPage: 1001 + index,
  }))

const wrapperSites = () =>
  new Map(
    Array.from({ length: wingsSideTourTaxonomyExpectedCount }, (_, index) => [
      String(1001 + index),
      siteID,
    ]),
  )

describe('WingSide tour taxonomy planner', () => {
  it('validates all 22 evidence-backed mappings and deterministic key order', () => {
    expect(() => validateTourTaxonomyMappings()).not.toThrow()
    expect(wingsSideTourTaxonomySiteCode).toBe('wing-side')
    expect(wingsSideTourTaxonomyMappings).toHaveLength(22)
    expect(normalizeTourDestinationKeys(['hoian', 'hanoi'])).toEqual(['hanoi', 'hoian'])
    expect(normalizeTourTravelStyleKeys(['adventure', 'culture'])).toEqual(['culture', 'adventure'])
  })

  it('builds a complete deterministic plan with no title matching', () => {
    const scoped = assertTourTaxonomyScope({
      documents: documents(),
      siteID,
      wrapperSiteByID: wrapperSites(),
    })
    const plan = buildTourTaxonomyPlanRecords(scoped)

    expect(plan).toHaveLength(22)
    expect(plan.every(({ action }) => action === 'update')).toBe(true)
    expect(
      plan.every(({ after }) => after.destinationTags.length && after.travelStyles.length),
    ).toBe(true)
    expect(() => assertTourTaxonomyPlanRecords(plan)).not.toThrow()
    expect(classifyTourTaxonomyState({ documents: scoped, records: plan })).toBe('before')
  })

  it('fails closed on count, batch, site and mapping drift', () => {
    const missing = documents().slice(1)
    expect(() =>
      assertTourTaxonomyScope({
        documents: missing,
        siteID,
        wrapperSiteByID: wrapperSites(),
      }),
    ).toThrow('Expected 22 scoped TourProducts')

    const wrongSite = documents()
    wrongSite[0].site = 99
    expect(() =>
      assertTourTaxonomyScope({
        documents: wrongSite,
        siteID,
        wrapperSiteByID: wrapperSites(),
      }),
    ).toThrow('belongs to another site')

    const wrongBatch = documents()
    wrongBatch[0].sourceProvenance!.importBatchId = 'other'
    expect(() =>
      assertTourTaxonomyScope({
        documents: wrongBatch,
        siteID,
        wrapperSiteByID: wrapperSites(),
      }),
    ).toThrow('belongs to another batch')
  })

  it('rejects unknown, duplicate and empty taxonomy filters', () => {
    expect(() => normalizeTourDestinationKeys(['hanoi', 'hanoi'])).toThrow('unique')
    expect(() => normalizeTourTravelStyleKeys(['unknown' as never])).toThrow('Unknown')
    expect(() => buildTourTaxonomyWhere({})).toThrow('At least one')
    expect(buildTourTaxonomyWhere({ destination: 'hanoi', travelStyle: 'culture' })).toEqual({
      and: [{ destinationTags: { in: ['hanoi'] } }, { travelStyles: { in: ['culture'] } }],
    })
  })

  it('restores prior values after an injected partial apply failure', async () => {
    const current = documents()
    const plan = buildTourTaxonomyPlanRecords(
      assertTourTaxonomyScope({
        documents: current,
        siteID,
        wrapperSiteByID: wrapperSites(),
      }),
    )
    const update = vi.fn(async ({ data, id }: { data: Record<string, unknown>; id: number }) => {
      const target = current.find((document) => document.id === id)!
      Object.assign(target, structuredClone(data))
      return target
    })
    const payload = {
      collections: { 'tour-products': { config: { versions: { drafts: true } } } },
      update,
    } as never

    await expect(
      transitionTourTaxonomy({
        failAfterUpdates: 2,
        loadDocuments: async () => current,
        payload,
        records: plan,
        req: {} as never,
        side: 'after',
      }),
    ).rejects.toThrow('Injected taxonomy failure after 2 updates')
    expect(classifyTourTaxonomyState({ documents: current, records: plan })).toBe('before')
    expect(update).toHaveBeenCalledTimes(4)
  })
})
