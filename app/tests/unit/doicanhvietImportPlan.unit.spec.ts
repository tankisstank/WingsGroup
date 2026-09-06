import { describe, expect, it } from 'vitest'

import { buildImportPlan, WINGS_GO_SITE_CODE } from '../../scripts/import-doicanhviet'
import type { NormalizedTour } from '../../scripts/lib/doicanhviet'

const record = (sourceId: string): NormalizedTour =>
  ({
    sourceId,
    sourceUrl: `https://doicanhviet.com/${sourceId}`,
    sourceFile: `${sourceId}.json`,
    sourceHash: `${sourceId}-hash`,
    kind: 'tour',
    title: `Tour ${sourceId}`,
    slug: sourceId,
    pathname: `/tour/${sourceId}`,
    market: 'vietnam',
    durationDays: 2,
    durationNights: 1,
    summary: 'Summary',
    priceFrom: 1000000,
    currency: 'VND',
    itineraryDays: [{ dayNumber: 1, title: 'Day 1', route: 'Hanoi', summary: 'Summary' }],
    departures: [
      {
        departureDate: '2030-01-02',
        returnDate: '2030-01-03',
        departureCity: 'Hanoi',
        priceFrom: 1000000,
        rawDate: '02/01/2030',
        rawRow: ['02/01/2030', '1000000'],
        currency: 'VND',
        availabilityStatus: 'open',
        isFeatured: true,
        sourceRowIndex: 1,
      },
    ],
    sourcePricing: { tables: [] },
    images: [],
    warnings: [],
    blockingErrors: [],
    sectionVisibility: ['facts', 'departures'],
    publishEligible: false,
    duplicateCandidates: [],
    source: {
      sourceSystem: 'doicanhviet',
      sourceId,
      sourceKey: `doicanhviet:${sourceId}`,
      sourceUrl: `https://doicanhviet.com/${sourceId}`,
      sourceHash: `${sourceId}-hash`,
    },
  }) as NormalizedTour

const decisions = {
  alpha: { action: 'create' as const, approved: true, approvedSlug: 'alpha-tour' },
}

describe('Doicanhviet importer plan contract', () => {
  it('defaults the deterministic dry-run plan to WingsGo and preserves evidence fields', () => {
    const plan = buildImportPlan({
      args: { 'dry-run': true },
      records: [record('alpha')],
      decisions,
    })

    expect(plan).toMatchObject({
      version: 1,
      mode: 'dry-run',
      dryRun: true,
      siteCode: WINGS_GO_SITE_CODE,
      selectionSource: 'all',
      selectedSourceIds: ['alpha'],
    })
    expect(plan.records[0]).toMatchObject({
      status: 'would-create',
      pagePath: '/tour/alpha-tour',
      departureDates: [
        {
          departureDate: '2030-01-02',
          returnDate: '2030-01-03',
          departureCity: 'Hanoi',
          currency: 'VND',
        },
      ],
    })
  })

  it('fails closed for a non-WingsGo site code', () => {
    expect(() =>
      buildImportPlan({
        args: { 'dry-run': true, 'site-code': 'wing-side' },
        records: [record('alpha')],
        decisions,
      }),
    ).toThrow('--site-code must be wings-go')
  })

  it('requires a bound source inventory hash when one is supplied', () => {
    expect(() =>
      buildImportPlan({
        args: {
          'dry-run': true,
          'source-inventory-hash': 'a'.repeat(64),
        },
        records: [record('alpha')],
        decisions,
      }),
    ).toThrow('not bound to normalized input')
  })

  it('rejects duplicate approved page slugs before any Payload work', () => {
    expect(() =>
      buildImportPlan({
        args: { 'dry-run': true },
        records: [record('alpha'), record('bravo')],
        decisions: {
          alpha: decisions.alpha,
          bravo: { action: 'create', approved: true, approvedSlug: 'alpha-tour' },
        },
      }),
    ).toThrow('Approved slug collision')
  })
})
