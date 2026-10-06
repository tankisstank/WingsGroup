import { describe, expect, it } from 'vitest'
import {
  filterDepartureVariants,
  getAvailabilityLabel,
  getFutureDepartures,
  getNextDeparture,
  getTourInquiryPath,
  resolveRetailCtaHref,
  selectPublishableDepartures,
} from '@/tours/utils'

describe('US-027 Slice 1: Data Guard and Integrity', () => {
  it('does not return false "Mở bán" when departure status is missing or undefined', () => {
    expect(getAvailabilityLabel(null, 'vi')).toBe('')
    expect(getAvailabilityLabel(undefined, 'vi')).toBe('')
    expect(getAvailabilityLabel('', 'vi')).toBe('')
    expect(getAvailabilityLabel(null, 'en')).toBe('')
  })

  it('correctly maps known availability statuses', () => {
    expect(getAvailabilityLabel('open', 'vi')).toBe('Mở bán')
    expect(getAvailabilityLabel('limited', 'vi')).toBe('Sắp hết chỗ')
    expect(getAvailabilityLabel('sold-out', 'vi')).toBe('Đã kín')

    expect(getAvailabilityLabel('open', 'en')).toBe('Open')
    expect(getAvailabilityLabel('limited', 'en')).toBe('Limited')
    expect(getAvailabilityLabel('sold-out', 'en')).toBe('Sold out')
  })

  it('getNextDeparture only returns future departures and does not fallback to past departures', () => {
    const pastDeparture = {
      departureDate: '2020-01-01T00:00:00.000Z',
      priceFrom: 10000000,
    }
    const futureDeparture = {
      departureDate: '2099-01-01T00:00:00.000Z',
      priceFrom: 20000000,
    }

    // Only past departures -> null, no false fallback
    expect(getNextDeparture([pastDeparture])).toBeNull()

    // Has future departure -> returns future
    expect(getNextDeparture([pastDeparture, futureDeparture])).toEqual(futureDeparture)

    // Empty list -> null
    expect(getNextDeparture([])).toBeNull()
    expect(getNextDeparture(null)).toBeNull()
  })

  it('filterDepartureVariants filters out inactive and archived variants in public mode while retaining active variants', () => {
    const rawVariants = [
      { id: 1, status: 'active', displayPriority: 1 },
      { id: 2, status: 'inactive', displayPriority: 0 },
      { id: 3, status: 'archived', displayPriority: 2 },
      { id: 4, status: 'active', displayPriority: 0 },
    ]

    // Public resolution logic: draft = false -> only active, sorted by priority
    const publicVariants = filterDepartureVariants(rawVariants, { draft: false })
    expect(publicVariants.map((v) => v.id)).toEqual([4, 1])

    // Draft resolution logic: draft = true -> status !== 'archived'
    const draftVariants = filterDepartureVariants(rawVariants, { draft: true })
    expect(draftVariants.map((v) => v.id)).toEqual([2, 4, 1])
  })

  it('filterDepartureVariants does not return inactive variants when no active variants exist in public mode', () => {
    const inactiveOnlyVariants = [
      { id: 2, status: 'inactive', displayPriority: 0, title: 'Inactive Variant' },
    ]

    // In public mode, result must be empty array
    const publicResult = filterDepartureVariants(inactiveOnlyVariants, { draft: false })
    expect(publicResult).toEqual([])

    // In draft mode, inactive variant is returned
    const draftResult = filterDepartureVariants(inactiveOnlyVariants, { draft: true })
    expect(draftResult.map((v) => v.id)).toEqual([2])
  })

  it('builds honest inquiry path when tour has no upcoming departures', () => {
    const noDepartureHref = getTourInquiryPath({
      departureId: undefined,
      departureDate: undefined,
      intent: 'inquiry',
      source: 'tour-detail-hero',
      tourId: 123,
      tourSlug: 'seoul-nami-5d4n',
    })

    expect(noDepartureHref).toContain('tour=seoul-nami-5d4n')
    expect(noDepartureHref).toContain('intent=inquiry')
    expect(noDepartureHref).not.toContain('departureId')
    expect(noDepartureHref).not.toContain('departureDate')

    const withDepartureHref = getTourInquiryPath({
      departureId: 456,
      departureDate: '2026-11-20',
      intent: 'hold-seat',
      source: 'tour-detail-hero',
      tourId: 123,
      tourSlug: 'seoul-nami-5d4n',
    })

    expect(withDepartureHref).toContain('departureDate=2026-11-20')
    expect(withDepartureHref).toContain('intent=hold-seat')
  })

  it('governs retail primary CTA href via resolveRetailCtaHref', () => {
    const fallbackPath = '/lien-he?intent=inquiry&tour=seoul-nami-5d4n'

    // When tour has no upcoming departures, cmsHref cannot override honest inquiry path
    expect(
      resolveRetailCtaHref({
        cmsHref: '/lien-he?intent=hold-seat',
        hasFutureDeparture: false,
        inquiryPath: fallbackPath,
      }),
    ).toBe(fallbackPath)

    // When tour has departures, honor external / tel / mailto
    expect(
      resolveRetailCtaHref({
        cmsHref: 'https://zalo.me/0123456789',
        hasFutureDeparture: true,
        inquiryPath: fallbackPath,
      }),
    ).toBe('https://zalo.me/0123456789')

    // When tour has departures and cmsHref has departureId matching expectedDepartureId, honor it
    expect(
      resolveRetailCtaHref({
        cmsHref: '/dat-tour?departureId=999',
        expectedDepartureId: 999,
        hasFutureDeparture: true,
        inquiryPath: fallbackPath,
      }),
    ).toBe('/dat-tour?departureId=999')

    // When cmsHref has wrong departureId, reject and fall back to inquiryPath
    expect(
      resolveRetailCtaHref({
        cmsHref: '/dat-tour?departureId=888',
        expectedDepartureId: 999,
        hasFutureDeparture: true,
        inquiryPath: fallbackPath,
      }),
    ).toBe(fallbackPath)

    // When cmsHref has empty departureId, reject and fall back to inquiryPath
    expect(
      resolveRetailCtaHref({
        cmsHref: '/dat-tour?departureId=',
        expectedDepartureId: 999,
        hasFutureDeparture: true,
        inquiryPath: fallbackPath,
      }),
    ).toBe(fallbackPath)

    // When cmsHref has departureId matching and departureDate matching, honor it
    expect(
      resolveRetailCtaHref({
        cmsHref: '/dat-tour?departureId=999&departureDate=2026-11-20',
        expectedDepartureDate: '2026-11-20',
        expectedDepartureId: 999,
        hasFutureDeparture: true,
        inquiryPath: fallbackPath,
      }),
    ).toBe('/dat-tour?departureId=999&departureDate=2026-11-20')

    // When cmsHref has wrong departureDate, reject and fall back to inquiryPath
    expect(
      resolveRetailCtaHref({
        cmsHref: '/dat-tour?departureId=999&departureDate=2020-01-01',
        expectedDepartureDate: '2026-11-20',
        expectedDepartureId: 999,
        hasFutureDeparture: true,
        inquiryPath: fallbackPath,
      }),
    ).toBe(fallbackPath)

    // Otherwise use inquiryPath
    expect(
      resolveRetailCtaHref({
        cmsHref: undefined,
        expectedDepartureDate: '2026-11-20',
        expectedDepartureId: 123,
        hasFutureDeparture: true,
        inquiryPath: '/lien-he?intent=hold-seat&departureId=123',
      }),
    ).toBe('/lien-he?intent=hold-seat&departureId=123')
  })

  it('filters out past and unverified departures for public catalog while retaining all in draft mode', () => {
    const pastDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
    const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    const futureDate2 = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString()

    const departures = [
      {
        id: 1,
        departureDate: pastDate,
        commerceVerified: true,
      },
      {
        id: 2,
        departureDate: futureDate,
        commerceVerified: false, // Unverified future departure
      },
      {
        id: 3,
        departureDate: futureDate2,
        commerceVerified: true, // Valid verified future departure
      },
    ]

    // Draft mode (draft = true): returns all departures
    const draftDepartures = selectPublishableDepartures(departures, { draft: true })
    expect(draftDepartures.length).toBe(3)

    // Public mode (draft = false): selectPublishableDepartures filters out past & unverified
    const validPublicDepartures = selectPublishableDepartures(departures, { draft: false })
    expect(validPublicDepartures.length).toBe(1)
    expect(validPublicDepartures[0].id).toBe(3)

    // nextDeparture must strictly resolve from validPublicDepartures in public mode
    expect(getNextDeparture(validPublicDepartures)?.id).toBe(3)
  })
})
