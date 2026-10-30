import { describe, expect, it, vi } from 'vitest'

vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('payload', () => ({ getPayload: vi.fn() }))
vi.mock('@/utilities/siteContext', () => ({
  appendSiteWhere: vi.fn(),
  getCurrentSite: vi.fn(),
}))

import {
  toBusinessCalendarDay,
  businessCalendarMonth,
  daysUntilBusinessDay,
} from '@/tours/businessCalendar'
import { isDepartureVerificationCurrent } from '@/tours/departureCommerce'
import { getWingsGoScheduleCopy } from '@/tours/wingsGoScheduleCopy'
import { normalizeDepartureCard } from '@/tours/queries'
import {
  buildScheduleMonths,
  buildScheduleRow,
  computeScheduleStats,
  deriveScheduleAvailability,
  extractTourMedia,
  type WingsGoScheduleRow,
} from '@/tours/wingsGoSchedule'

describe('US-093 Phase 1A - Date boundary and Vietnam Business Calendar', () => {
  it('correctly maps 17:00Z on previous UTC day to today in Vietnam (+07:00)', () => {
    // 2026-10-29T17:00:00Z is 2026-10-30 00:00:00 in ICT (+07:00)
    const departureDate = '2026-10-29T17:00:00.000Z'
    const now = new Date('2026-10-30T03:00:00.000Z') // 10:00 AM ICT on Oct 30

    const departureDay = toBusinessCalendarDay(departureDate)
    const today = toBusinessCalendarDay(now)

    expect(departureDay).toBe('2026-10-30')
    expect(today).toBe('2026-10-30')

    const daysUntil = daysUntilBusinessDay(departureDate, now)
    expect(daysUntil).toBe(0) // Today! Not past!
  })

  it('filters out true past departures in Vietnam calendar', () => {
    // 2026-10-29T16:59:59Z is 2026-10-29 23:59:59 in ICT
    const pastDepartureDate = '2026-10-29T16:59:59.000Z'
    const now = new Date('2026-10-30T03:00:00.000Z')

    const departureDay = toBusinessCalendarDay(pastDepartureDate)
    expect(departureDay).toBe('2026-10-29')

    const daysUntil = daysUntilBusinessDay(pastDepartureDate, now)
    expect(daysUntil).toBe(-1) // In the past
  })

  it('handles month and year crossings in business calendar', () => {
    const endOfYear = '2026-12-31T17:00:00.000Z' // 2027-01-01 in ICT
    const day = toBusinessCalendarDay(endOfYear)
    const month = businessCalendarMonth(endOfYear)

    expect(day).toBe('2027-01-01')
    expect(month).toBe('2027-01')

    const now = new Date('2026-12-31T03:00:00.000Z') // 2026-12-31 in ICT
    expect(daysUntilBusinessDay(endOfYear, now)).toBe(1)
  })
})

describe('US-093 Phase 1A - Verification expiry exact boundaries', () => {
  it('marks departure verification current when now is within window', () => {
    const departure = {
      verifiedAt: '2026-10-01T00:00:00.000Z',
      expiresAt: '2026-10-31T00:00:00.000Z',
    }
    const inside = Date.parse('2026-10-15T00:00:00.000Z')
    expect(isDepartureVerificationCurrent(departure, inside)).toBe(true)
  })

  it('is valid at exact start of verifiedAt window', () => {
    const departure = {
      verifiedAt: '2026-10-01T00:00:00.000Z',
      expiresAt: '2026-10-31T00:00:00.000Z',
    }
    const exactStart = Date.parse('2026-10-01T00:00:00.000Z')
    expect(isDepartureVerificationCurrent(departure, exactStart)).toBe(true)
  })

  it('expires exactly when now equals expiresAt', () => {
    const departure = {
      verifiedAt: '2026-10-01T00:00:00.000Z',
      expiresAt: '2026-10-31T00:00:00.000Z',
    }
    const exactEnd = Date.parse('2026-10-31T00:00:00.000Z')
    expect(isDepartureVerificationCurrent(departure, exactEnd)).toBe(false)
  })

  it('rejects inverted or equal verification timestamps', () => {
    const inverted = {
      verifiedAt: '2026-10-31T00:00:00.000Z',
      expiresAt: '2026-10-01T00:00:00.000Z',
    }
    expect(isDepartureVerificationCurrent(inverted, Date.parse('2026-10-15T00:00:00.000Z'))).toBe(false)

    const equal = {
      verifiedAt: '2026-10-15T00:00:00.000Z',
      expiresAt: '2026-10-15T00:00:00.000Z',
    }
    expect(isDepartureVerificationCurrent(equal, Date.parse('2026-10-15T00:00:00.000Z'))).toBe(false)
  })
})

describe('US-093 Phase 1A - F2 Pure Functions & Stats Verification', () => {
  const copy = getWingsGoScheduleCopy('vi')

  it('buildScheduleMonths includes empty gap months between first and last departure', () => {
    const rows = [
      { monthKey: '2027-01' },
      { monthKey: '2027-04' },
      { monthKey: '2027-01' },
    ]
    const months = buildScheduleMonths(rows)
    expect(months).toEqual(['2027-01', '2027-02', '2027-03', '2027-04'])
  })

  it('buildScheduleMonths handles cross-year month spans', () => {
    const rows = [{ monthKey: '2026-11' }, { monthKey: '2027-02' }]
    const months = buildScheduleMonths(rows)
    expect(months).toEqual(['2026-11', '2026-12', '2027-01', '2027-02'])
  })

  it('deriveScheduleAvailability adheres strictly to the 5-step state decision table', () => {
    // 1. Unverified -> quote
    expect(
      deriveScheduleAvailability(
        { commerceVerified: false, availabilityStatus: 'open', priceFrom: 10000000, currency: 'VND' },
        copy,
      ),
    ).toEqual({ availability: 'quote', label: copy.statusQuote })

    // 2. Verified + sold-out (with or without price) -> sold-out
    expect(
      deriveScheduleAvailability(
        { commerceVerified: true, availabilityStatus: 'sold-out', priceFrom: 10000000, currency: 'VND' },
        copy,
      ),
    ).toEqual({ availability: 'sold-out', label: copy.statusSoldOut })

    expect(
      deriveScheduleAvailability(
        { commerceVerified: true, availabilityStatus: 'sold-out', priceFrom: null, currency: null },
        copy,
      ),
    ).toEqual({ availability: 'sold-out', label: copy.statusSoldOut })

    // 3. Verified but missing valid price -> quote
    expect(
      deriveScheduleAvailability(
        { commerceVerified: true, availabilityStatus: 'open', priceFrom: 0, currency: 'VND' },
        copy,
      ),
    ).toEqual({ availability: 'quote', label: copy.statusQuote })

    // 4. Verified + price + limited -> limited
    expect(
      deriveScheduleAvailability(
        { commerceVerified: true, availabilityStatus: 'limited', priceFrom: 15000000, currency: 'VND' },
        copy,
      ),
    ).toEqual({ availability: 'limited', label: copy.statusLimited })

    // 5. Verified + price + open (or empty) -> open
    expect(
      deriveScheduleAvailability(
        { commerceVerified: true, availabilityStatus: 'open', priceFrom: 15000000, currency: 'VND' },
        copy,
      ),
    ).toEqual({ availability: 'open', label: copy.statusOpen })
  })

  it('computeScheduleStats: nearestDay chooses earliest date regardless of price', () => {
    const rows: WingsGoScheduleRow[] = [
      {
        id: '1',
        tourId: 't1',
        departureDay: '2027-01-20', // Earlier day, higher price
        returnDay: null,
        monthKey: '2027-01',
        daysUntilDeparture: 20,
        departureCityCode: 'HAN',
        airline: null,
        availability: 'open',
        availabilityLabel: 'Mở bán',
        price: { value: 50000000, currency: 'VND', original: null },
        promoLabel: null,
        urgencyLabel: null,
        canHoldSeat: true,
        ctaLabel: 'Giữ chỗ',
        ctaHref: '#',
        isFeatured: false,
        searchText: '',
      },
      {
        id: '2',
        tourId: 't2',
        departureDay: '2027-03-10', // Later day, lower price
        returnDay: null,
        monthKey: '2027-03',
        daysUntilDeparture: 70,
        departureCityCode: 'HAN',
        airline: null,
        availability: 'limited',
        availabilityLabel: 'Sắp hết chỗ',
        price: { value: 12000000, currency: 'VND', original: null },
        promoLabel: null,
        urgencyLabel: null,
        canHoldSeat: true,
        ctaLabel: 'Giữ chỗ',
        ctaHref: '#',
        isFeatured: false,
        searchText: '',
      },
      {
        id: '3',
        tourId: 't3',
        departureDay: '2027-05-01',
        returnDay: null,
        monthKey: '2027-05',
        daysUntilDeparture: 120,
        departureCityCode: 'HAN',
        airline: null,
        availability: 'quote',
        availabilityLabel: 'Chờ báo giá',
        price: null,
        promoLabel: null,
        urgencyLabel: null,
        canHoldSeat: false,
        ctaLabel: 'Hỏi giá',
        ctaHref: '#',
        isFeatured: false,
        searchText: '',
      },
    ]

    const stats = computeScheduleStats(rows, undefined, Date.parse('2026-10-25T00:00:00.000Z'))
    expect(stats.nearestDay).toBe('2027-01-20')
    expect(stats.openCount).toBe(2) // 1 open + 1 limited
    expect(stats.pricedCount).toBe(2)
    expect(stats.tourCount).toBe(3)
    expect(stats.yearRange).toEqual({ from: 2027, to: 2027 })
    expect(stats.sharedDepartureCity).toBe('HAN') // All rows are HAN
    expect(stats.verifiedDay).toBe('2026-10-25')
  })

  it('computeScheduleStats: sets sharedDepartureCity to null when departure cities differ or are missing', () => {
    const rowsMixed: WingsGoScheduleRow[] = [
      {
        id: '1',
        tourId: 't1',
        departureDay: '2026-11-15',
        returnDay: null,
        monthKey: '2026-11',
        daysUntilDeparture: 15,
        departureCityCode: 'HAN',
        airline: null,
        availability: 'open',
        availabilityLabel: 'Mở bán',
        price: null,
        promoLabel: null,
        urgencyLabel: null,
        canHoldSeat: false,
        ctaLabel: 'Hỏi giá',
        ctaHref: '#',
        isFeatured: false,
        searchText: '',
      },
      {
        id: '2',
        tourId: 't2',
        departureDay: '2027-02-15',
        returnDay: null,
        monthKey: '2027-02',
        daysUntilDeparture: 105,
        departureCityCode: 'SGN', // Different city!
        airline: null,
        availability: 'open',
        availabilityLabel: 'Mở bán',
        price: null,
        promoLabel: null,
        urgencyLabel: null,
        canHoldSeat: false,
        ctaLabel: 'Hỏi giá',
        ctaHref: '#',
        isFeatured: false,
        searchText: '',
      },
    ]

    const stats = computeScheduleStats(rowsMixed)
    expect(stats.sharedDepartureCity).toBeNull()
    expect(stats.yearRange).toEqual({ from: 2026, to: 2027 })
  })

  it('buildScheduleRow produces a correct WingsGoScheduleRow from doc and tour', () => {
    const doc = {
      id: 501,
      departureDate: '2027-06-15T00:00:00.000Z',
      returnDate: '2027-06-20T00:00:00.000Z',
      commerceVerified: true,
      availabilityStatus: 'limited',
      priceFrom: 18900000,
      currency: 'VND',
      airline: 'Vietnam Airlines',
      departureCity: 'Ha Noi',
    }
    const tour = {
      id: 'tour-101',
      slug: 'japan-journey',
      title: 'Hành trình Nhật Bản',
      market: 'japan',
    }

    const row = buildScheduleRow({
      doc,
      tour,
      now: new Date('2027-01-01T00:00:00.000Z'),
      copy,
    })

    expect(row).not.toBeNull()
    expect(row?.tourId).toBe('tour-101')
    expect(row?.departureDay).toBe('2027-06-15')
    expect(row?.returnDay).toBe('2027-06-20')
    expect(row?.monthKey).toBe('2027-06')
    expect(row?.departureCityCode).toBe('HAN')
    expect(row?.availability).toBe('limited')
    expect(row?.canHoldSeat).toBe(true)
    expect(row?.ctaHref).toContain('departureId=501')
  })

  it('buildScheduleRow with 17:00Z departure produces VN calendar departureDay, correct intent, and respects ctaLabelOverride', () => {
    // 2027-05-19T17:00:00Z -> 2027-05-20 in ICT
    const baseDoc = {
      id: 502,
      departureDate: '2027-05-19T17:00:00.000Z',
      commerceVerified: true,
      availabilityStatus: 'open',
      priceFrom: 18900000,
      currency: 'VND',
      airline: 'Vietnam Airlines',
      departureCity: 'Ha Noi',
    }
    const tour = {
      id: 'tour-101',
      slug: 'japan-journey',
      title: 'Hành trình Nhật Bản',
      market: 'japan',
    }
    const now = new Date('2027-05-10T00:00:00.000Z')

    // 1. canHoldSeat = true -> intent=hold-seat
    const rowHold = buildScheduleRow({
      doc: baseDoc,
      tour,
      now,
      copy,
    })
    expect(rowHold?.departureDay).toBe('2027-05-20')
    expect(rowHold?.canHoldSeat).toBe(true)
    expect(rowHold?.ctaHref).toContain('departureDate=2027-05-20')
    expect(rowHold?.ctaHref).toContain('intent=hold-seat')
    expect(rowHold?.ctaLabel).toBe(copy.ctaHoldSeat)

    // 2. quote due to missing price -> intent=inquiry
    const rowQuote = buildScheduleRow({
      doc: { ...baseDoc, priceFrom: null },
      tour,
      now,
      copy,
    })
    expect(rowQuote?.canHoldSeat).toBe(false)
    expect(rowQuote?.ctaHref).toContain('departureDate=2027-05-20')
    expect(rowQuote?.ctaHref).toContain('intent=inquiry')
    expect(rowQuote?.ctaLabel).toBe(copy.ctaRequestQuote)

    // 3. sold-out -> intent=inquiry
    const rowSoldOut = buildScheduleRow({
      doc: { ...baseDoc, availabilityStatus: 'sold-out' },
      tour,
      now,
      copy,
    })
    expect(rowSoldOut?.canHoldSeat).toBe(false)
    expect(rowSoldOut?.ctaHref).toContain('intent=inquiry')

    // 4. ctaLabelOverride changes label, does NOT change intent
    const rowOverride = buildScheduleRow({
      doc: { ...baseDoc, ctaLabelOverride: 'Đặt chỗ ngay' },
      tour,
      now,
      copy,
    })
    expect(rowOverride?.canHoldSeat).toBe(true)
    expect(rowOverride?.ctaLabel).toBe('Đặt chỗ ngay')
    expect(rowOverride?.ctaHref).toContain('intent=hold-seat')
  })
})

describe('US-093 Phase 1A - F3 Media Fail-Closed Scope', () => {
  it('extractTourMedia returns null when media has no site or different site', () => {
    // Missing site
    expect(extractTourMedia({ url: '/photo.jpg' }, 7)).toBeNull()
    // Different site
    expect(extractTourMedia({ url: '/photo.jpg', site: 3 }, 7)).toBeNull()
    // Null media or invalid URL
    expect(extractTourMedia(null, 7)).toBeNull()
    expect(extractTourMedia({ site: 7, url: '' }, 7)).toBeNull()
    // Valid media matching site
    expect(extractTourMedia({ site: 7, url: '/photo.jpg', alt: 'Test' }, 7)).toEqual({
      url: '/photo.jpg',
      alt: 'Test',
    })
  })

  it('extractTourMedia trims URL, normalizes Payload media paths, and rejects malformed/whitespace URLs', () => {
    // Whitespace only
    expect(extractTourMedia({ site: 7, url: '   ' }, 7)).toBeNull()
    // Malformed URL
    expect(extractTourMedia({ site: 7, url: 'https:// invalid url' }, 7)).toBeNull()
    // Path /media/...
    expect(extractTourMedia({ site: 7, url: '  /media/banner.jpg  ', alt: '  Banner  ' }, 7)).toEqual({
      url: '/media/banner.jpg',
      alt: 'Banner',
    })
    // Path /api/media/file/... normalized to /media/...
    expect(extractTourMedia({ site: 7, url: '/api/media/file/banner.jpg' }, 7)).toEqual({
      url: '/media/banner.jpg',
      alt: '',
    })
    // Valid HTTPS URL
    expect(extractTourMedia({ site: 7, url: 'https://cdn.example.com/banner.jpg' }, 7)).toEqual({
      url: 'https://cdn.example.com/banner.jpg',
      alt: '',
    })
  })
})

describe('US-093 Phase 1A - F5 Locale propagation to normalizeTourProductCard', () => {
  it('normalizeDepartureCard with locale=en drops VI-only badge and does not leak Vietnamese', () => {
    const rawDeparture = {
      id: 99,
      departureDate: '2027-07-01T00:00:00.000Z',
      commerceVerified: true,
      availabilityStatus: 'open',
      priceFrom: 20000000,
      currency: 'VND',
      tourProduct: {
        id: 't-bilingual',
        title: 'Bilingual Tour',
        editorialBadges: [
          // Untranslated in EN (only VI string)
          { kind: 'hot', label: { vi: 'Tour hot tiếng Việt' } },
          // Translated in both
          { kind: 'specialized', label: { en: 'Expert Guide', vi: 'Chuyên gia' } },
        ],
      },
    }

    const cardEn = normalizeDepartureCard(rawDeparture, false, undefined, 'en')
    const badgesEn = (cardEn.tourProduct as any)?.editorialBadges || []

    // The VI-only badge should NOT leak into EN card
    expect(badgesEn.some((b: any) => b.label === 'Tour hot tiếng Việt')).toBe(false)
    expect(badgesEn).toEqual([{ kind: 'specialized', label: 'Expert Guide' }])

    // On VI locale, both badges should be present
    const cardVi = normalizeDepartureCard(rawDeparture, false, undefined, 'vi')
    const badgesVi = (cardVi.tourProduct as any)?.editorialBadges || []
    expect(badgesVi.length).toBe(2)
  })
})
