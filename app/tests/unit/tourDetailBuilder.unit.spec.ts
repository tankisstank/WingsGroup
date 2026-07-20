import { defaultTourSectionOrder, defaultTourSectionVisibility, normalizeSectionIDs } from '@/tours/sectionRegistry'
import {
  getFutureDepartures,
  getMealChipFlags,
  getNextDeparture,
  getTourInquiryPath,
  getTourPricePosture,
  getTourRouteChips,
  groupDeparturesByMonth,
  resolveConsultativeCtaHref,
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

  it('uses site-aware contact paths for Wingside consultative inquiries', () => {
    expect(
      getTourInquiryPath({
        intent: 'inquiry',
        siteCode: 'wings-side',
        source: 'tour-detail-hero',
        tourSlug: 'best-of-northern-vietnam',
      }),
    ).toBe(
      '/contact-us?intent=inquiry&tour=best-of-northern-vietnam&source=tour-detail-hero',
    )
  })

  it('parses meal chips and route chips without inventing content', () => {
    expect(getMealChipFlags('Breakfast / Lunch / Dinner')).toEqual({
      breakfast: true,
      dinner: true,
      lunch: true,
    })
    expect(getMealChipFlags('Ăn sáng / trưa')).toEqual({
      breakfast: true,
      dinner: false,
      lunch: true,
    })
    expect(
      getTourRouteChips({
        routeViz: {
          stops: [{ label: 'Hanoi' }, { label: 'Sapa' }, { label: 'Halong' }],
        },
      }),
    ).toEqual(['Hanoi', 'Sapa', 'Halong'])
    expect(getTourPricePosture({ locale: 'en' }).value).toContain('24h')
    expect(getTourPricePosture({ locale: 'en', priceFrom: 1200, currency: 'USD' }).label).toBe(
      'From',
    )
  })

  it('honors external consultative CTA hrefs but rebuilds bare contact shells', () => {
    const fallback =
      '/contact-us?intent=inquiry&tour=best-of-northern-vietnam&source=tour-detail-hero'

    expect(
      resolveConsultativeCtaHref({
        cmsHref: 'https://wa.me/84123456789',
        fallbackPath: fallback,
      }),
    ).toBe('https://wa.me/84123456789')

    expect(
      resolveConsultativeCtaHref({
        cmsHref: '/contact-us?intent=inquiry&tour=demo',
        fallbackPath: fallback,
      }),
    ).toBe('/contact-us?intent=inquiry&tour=demo')

    expect(
      resolveConsultativeCtaHref({
        cmsHref: '/lien-he',
        fallbackPath: fallback,
      }),
    ).toBe(fallback)

    expect(resolveConsultativeCtaHref({ cmsHref: null, fallbackPath: fallback })).toBe(fallback)
  })

  it('prefers future departures when deriving next departure and month groups', () => {
    const now = new Date()
    const past = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 10))
    const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 15))
    const later = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 2, 2))
    const toIso = (date: Date) => date.toISOString()
    const monthKey = (date: Date) =>
      `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`

    const departures = [
      { departureDate: toIso(past), id: 'past' },
      { departureDate: toIso(next), id: 'next' },
      { departureDate: toIso(later), id: 'later' },
    ]

    expect(getFutureDepartures(departures).map((item) => item.id)).toEqual(['next', 'later'])
    expect(getNextDeparture(departures)?.id).toBe('next')
    expect(groupDeparturesByMonth(getFutureDepartures(departures)).map((group) => group.key)).toEqual([
      monthKey(next),
      monthKey(later),
    ])
  })
})
