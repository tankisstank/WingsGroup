import { defaultTourSectionOrder, defaultTourSectionVisibility, normalizeSectionIDs } from '@/tours/sectionRegistry'
import {
  getFutureDepartures,
  getNextDeparture,
  getTourInquiryPath,
  groupDeparturesByMonth,
} from '@/tours/utils'
import { describe, expect, it } from 'vitest'

describe('tour detail builder registry', () => {
  it('keeps the governed default section order and visibility aligned', () => {
    expect(defaultTourSectionOrder).toEqual([
      'hero',
      'facts',
      'reviews',
      'why-choose',
      'route',
      'itinerary',
      'services',
      'departures',
      'faq',
      'related',
      'sticky-cta',
    ])

    expect(defaultTourSectionVisibility).toEqual(defaultTourSectionOrder)
  })

  it('filters unknown section IDs but preserves valid editor selections', () => {
    expect(
      normalizeSectionIDs([
        'hero',
        'includes',
        'services',
        'departures',
        'not-a-section',
      ] as string[]),
    ).toEqual(['hero', 'services', 'departures'])
  })

  it('falls back to the governed default order when no valid sections remain', () => {
    expect(normalizeSectionIDs(['includes', 'legacy-only'] as string[])).toEqual(
      defaultTourSectionOrder,
    )
  })
})

describe('tour detail builder inquiry and departure utilities', () => {
  it('builds a machine-readable inquiry path with optional context', () => {
    expect(
      getTourInquiryPath({
        departureId: 42,
        intent: 'hold-seat',
        source: 'tour-detail-departures',
        tourId: 7,
        tourSlug: 'shizuoka-nui-phu-si-tokyo-5n4d',
      }),
    ).toBe(
      '/lien-he?intent=hold-seat&tour=shizuoka-nui-phu-si-tokyo-5n4d&tourId=7&departureId=42&source=tour-detail-departures',
    )
  })

  it('prefers future departures when deriving next departure and month groups', () => {
    const departures = [
      { departureDate: '2026-06-20T00:00:00.000Z', id: 'past' },
      { departureDate: '2026-07-15T00:00:00.000Z', id: 'next' },
      { departureDate: '2026-08-02T00:00:00.000Z', id: 'later' },
    ]

    expect(getFutureDepartures(departures).map((item) => item.id)).toEqual(['next', 'later'])
    expect(getNextDeparture(departures)?.id).toBe('next')
    expect(groupDeparturesByMonth(getFutureDepartures(departures)).map((group) => group.key)).toEqual([
      '2026-07',
      '2026-08',
    ])
  })
})
