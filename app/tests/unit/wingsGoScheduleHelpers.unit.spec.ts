import { describe, expect, it, vi } from 'vitest'

vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('payload', () => ({ getPayload: vi.fn() }))

import {
  canHoldSeat,
  getPriorityMarketDeparture,
  getTourInquiryPath,
} from '@/tours/utils'
import {
  normalizeScheduleAirline,
  getTourRouteTitle,
} from '@/tours/wingsGoDisplay'
import {
  foldVietnameseText,
  parseScheduleFilters,
  filterScheduleRows,
  countScheduleFacets,
  sortScheduleRows,
  groupScheduleRowsByTour,
  deriveScheduleAvailability,
  type WingsGoScheduleRow,
  type WingsGoScheduleTour,
  type ScheduleFilters,
} from '@/tours/wingsGoSchedule'

const copy = {
  statusOpen: 'Mở bán',
  statusLimited: 'Sắp hết chỗ',
  statusSoldOut: 'Đã kín',
  statusQuote: 'Liên hệ báo giá',
}

describe('US-093 Phase 1B - normalizeScheduleAirline', () => {
  it('normalizes all 21 baseline airline strings from phase0-baseline.md into 11 airlines', () => {
    // 1. VIETNAM AIRLINES (VN) -> VN
    expect(normalizeScheduleAirline('VIETNAM AIRLINES (VN)')).toEqual({
      key: 'VN',
      label: 'Vietnam Airlines',
    })
    // 2. ' Emirates 5*' -> EK
    expect(normalizeScheduleAirline(' Emirates 5*')).toEqual({
      key: 'EK',
      label: 'Emirates',
    })
    // 3. 'VIETNAM AIRLINES (VNA)' -> VN
    expect(normalizeScheduleAirline('VIETNAM AIRLINES (VNA)')).toEqual({
      key: 'VN',
      label: 'Vietnam Airlines',
    })
    // 4. 'AIR CHINA (CA)' -> CA
    expect(normalizeScheduleAirline('AIR CHINA (CA)')).toEqual({
      key: 'CA',
      label: 'Air China',
    })
    // 5. 'Parata Air (WE)' -> WE
    expect(normalizeScheduleAirline('Parata Air (WE)')).toEqual({
      key: 'WE',
      label: 'Parata Air',
    })
    // 6. 'Vietjet' -> VJ
    expect(normalizeScheduleAirline('Vietjet')).toEqual({
      key: 'VJ',
      label: 'Vietjet Air',
    })
    // 7. 'VIETJET AIR (VJ) ' -> VJ
    expect(normalizeScheduleAirline('VIETJET AIR (VJ) ')).toEqual({
      key: 'VJ',
      label: 'Vietjet Air',
    })
    // 8. 'VIETJET AIR (VJ)' -> VJ
    expect(normalizeScheduleAirline('VIETJET AIR (VJ)')).toEqual({
      key: 'VJ',
      label: 'Vietjet Air',
    })
    // 9. 'AIR CHINA ' -> CA
    expect(normalizeScheduleAirline('AIR CHINA ')).toEqual({
      key: 'CA',
      label: 'Air China',
    })
    // 10. 'Vietnam Airlines' -> VN
    expect(normalizeScheduleAirline('Vietnam Airlines')).toEqual({
      key: 'VN',
      label: 'Vietnam Airlines',
    })
    // 11. 'VIETTRAVEL AIRLINES (VU)' -> VU
    expect(normalizeScheduleAirline('VIETTRAVEL AIRLINES (VU)')).toEqual({
      key: 'VU',
      label: 'Vietravel Airlines',
    })
    // 12. 'VIETNAM AIRLINES ' -> VN
    expect(normalizeScheduleAirline('VIETNAM AIRLINES ')).toEqual({
      key: 'VN',
      label: 'Vietnam Airlines',
    })
    // 13. 'Vietjet (về chuyến 06h25)' -> VJ
    expect(normalizeScheduleAirline('Vietjet (về chuyến 06h25)')).toEqual({
      key: 'VJ',
      label: 'Vietjet Air',
    })
    // 14. 'Vietnam Airline' -> VN
    expect(normalizeScheduleAirline('Vietnam Airline')).toEqual({
      key: 'VN',
      label: 'Vietnam Airlines',
    })
    // 15. 'SUN PHUQUOC AIRWAYS (9G)' -> 9G
    expect(normalizeScheduleAirline('SUN PHUQUOC AIRWAYS (9G)')).toEqual({
      key: '9G',
      label: 'Sun PhuQuoc Airways',
    })
    // 16. 'Vietnam Airlines ' -> VN
    expect(normalizeScheduleAirline('Vietnam Airlines ')).toEqual({
      key: 'VN',
      label: 'Vietnam Airlines',
    })
    // 17. '"' (quote only) -> null
    expect(normalizeScheduleAirline('"')).toBeNull()
    // 18. 'Jeju Air' -> 7C
    expect(normalizeScheduleAirline('Jeju Air')).toEqual({
      key: '7C',
      label: 'Jeju Air',
    })
    // 19. 'ALL NIPPON AIRWAYS (NH)' -> NH
    expect(normalizeScheduleAirline('ALL NIPPON AIRWAYS (NH)')).toEqual({
      key: 'NH',
      label: 'All Nippon Airways',
    })
    // 20. 'Turkish Airlines (TK)' -> TK
    expect(normalizeScheduleAirline('Turkish Airlines (TK)')).toEqual({
      key: 'TK',
      label: 'Turkish Airlines',
    })
    // 21. 'THAI AIRASIA (FD)' -> FD
    expect(normalizeScheduleAirline('THAI AIRASIA (FD)')).toEqual({
      key: 'FD',
      label: 'Thai AirAsia',
    })
  })

  it('handles unrecognized airlines and multi-match strings', () => {
    // Unrecognized airline keeps raw key
    expect(normalizeScheduleAirline('Bamboo Airways')).toEqual({
      key: 'raw:bamboo airways',
      label: 'Bamboo Airways',
    })

    // Substring AirAsia without Thai does not match FD
    expect(normalizeScheduleAirline('AirAsia')).toEqual({
      key: 'raw:airasia',
      label: 'AirAsia',
    })

    // String matching multiple airlines falls back to raw key
    expect(normalizeScheduleAirline('Vietnam Airlines and Vietjet')).toEqual({
      key: 'raw:vietnam airlines and vietjet',
      label: 'Vietnam Airlines and Vietjet',
    })

    // Empty, spaces, quotes, null, undefined
    expect(normalizeScheduleAirline('')).toBeNull()
    expect(normalizeScheduleAirline('   ')).toBeNull()
    expect(normalizeScheduleAirline('""')).toBeNull()
    expect(normalizeScheduleAirline("''")).toBeNull()
    expect(normalizeScheduleAirline(null)).toBeNull()
    expect(normalizeScheduleAirline(undefined)).toBeNull()
  })
})

describe('US-093 Phase 1B - canHoldSeat', () => {
  const now = new Date('2027-05-20T03:00:00.000Z')

  it('returns true when all 4 conditions are met', () => {
    expect(
      canHoldSeat(
        {
          commerceVerified: true,
          availabilityStatus: 'open',
          departureDate: '2027-05-25T00:00:00.000Z',
          currency: 'VND',
          priceFrom: 18000000,
        },
        now,
      ),
    ).toBe(true)

    // limited status is eligible
    expect(
      canHoldSeat(
        {
          commerceVerified: true,
          availabilityStatus: 'limited',
          departureDate: '2027-05-20T00:00:00.000Z', // today on VN calendar
          currency: 'USD',
          priceFrom: 1200,
        },
        now,
      ),
    ).toBe(true)
  })

  it('fails if any of the 4 conditions is not met', () => {
    // 1. Not commerceVerified
    expect(
      canHoldSeat(
        {
          commerceVerified: false,
          availabilityStatus: 'open',
          departureDate: '2027-05-25T00:00:00.000Z',
          currency: 'VND',
          priceFrom: 18000000,
        },
        now,
      ),
    ).toBe(false)

    // 2. availabilityStatus is sold-out
    expect(
      canHoldSeat(
        {
          commerceVerified: true,
          availabilityStatus: 'sold-out',
          departureDate: '2027-05-25T00:00:00.000Z',
          currency: 'VND',
          priceFrom: 18000000,
        },
        now,
      ),
    ).toBe(false)

    // 3. Past departure (yesterday)
    expect(
      canHoldSeat(
        {
          commerceVerified: true,
          availabilityStatus: 'open',
          departureDate: '2027-05-18T00:00:00.000Z',
          currency: 'VND',
          priceFrom: 18000000,
        },
        now,
      ),
    ).toBe(false)

    // 4. Invalid price (0, negative, NaN, missing currency)
    expect(
      canHoldSeat(
        {
          commerceVerified: true,
          availabilityStatus: 'open',
          departureDate: '2027-05-25T00:00:00.000Z',
          currency: 'VND',
          priceFrom: 0,
        },
        now,
      ),
    ).toBe(false)

    expect(
      canHoldSeat(
        {
          commerceVerified: true,
          availabilityStatus: 'open',
          departureDate: '2027-05-25T00:00:00.000Z',
          currency: 'EUR', // unsupported currency
          priceFrom: 1000,
        },
        now,
      ),
    ).toBe(false)

    expect(canHoldSeat(null, now)).toBe(false)
  })
})

describe('US-093 Phase 1B - deriveScheduleAvailability', () => {
  it('implements the 5-step state resolution', () => {
    // Step 1: not commerce verified -> quote
    expect(
      deriveScheduleAvailability(
        {
          commerceVerified: false,
          availabilityStatus: 'open',
          priceFrom: 15000000,
          currency: 'VND',
        },
        copy,
      ),
    ).toEqual({ availability: 'quote', label: 'Liên hệ báo giá' })

    // Step 1 precedes Step 2: sold-out but unverified -> quote
    expect(
      deriveScheduleAvailability(
        {
          commerceVerified: false,
          availabilityStatus: 'sold-out',
          priceFrom: 15000000,
          currency: 'VND',
        },
        copy,
      ),
    ).toEqual({ availability: 'quote', label: 'Liên hệ báo giá' })

    // Step 2: verified + sold-out (with price) -> sold-out
    expect(
      deriveScheduleAvailability(
        {
          commerceVerified: true,
          availabilityStatus: 'sold-out',
          priceFrom: 15000000,
          currency: 'VND',
        },
        copy,
      ),
    ).toEqual({ availability: 'sold-out', label: 'Đã kín' })

    // Step 2: verified + sold-out (without price) -> sold-out
    expect(
      deriveScheduleAvailability(
        {
          commerceVerified: true,
          availabilityStatus: 'sold-out',
          priceFrom: 0,
          currency: 'VND',
        },
        copy,
      ),
    ).toEqual({ availability: 'sold-out', label: 'Đã kín' })

    // Step 3: verified but no valid price -> quote
    expect(
      deriveScheduleAvailability(
        {
          commerceVerified: true,
          availabilityStatus: 'open',
          priceFrom: 0,
          currency: 'VND',
        },
        copy,
      ),
    ).toEqual({ availability: 'quote', label: 'Liên hệ báo giá' })

    // Step 4: verified, has price, limited -> limited
    expect(
      deriveScheduleAvailability(
        {
          commerceVerified: true,
          availabilityStatus: 'limited',
          priceFrom: 12000000,
          currency: 'VND',
        },
        copy,
      ),
    ).toEqual({ availability: 'limited', label: 'Sắp hết chỗ' })

    // Step 5: verified, has price, open -> open
    expect(
      deriveScheduleAvailability(
        {
          commerceVerified: true,
          availabilityStatus: 'open',
          priceFrom: 12000000,
          currency: 'VND',
        },
        copy,
      ),
    ).toEqual({ availability: 'open', label: 'Mở bán' })

    // Step 5: verified, has price, status unset/null -> open
    expect(
      deriveScheduleAvailability(
        {
          commerceVerified: true,
          availabilityStatus: null,
          priceFrom: 12000000,
          currency: 'VND',
        },
        copy,
      ),
    ).toEqual({ availability: 'open', label: 'Mở bán' })
  })

  it('respects custom availabilityBadge without changing state enum', () => {
    expect(
      deriveScheduleAvailability(
        {
          commerceVerified: true,
          availabilityStatus: 'open',
          priceFrom: 15000000,
          currency: 'VND',
        },
        copy,
        'Chỉ còn 3 chỗ cuối',
      ),
    ).toEqual({ availability: 'open', label: 'Chỉ còn 3 chỗ cuối' })
  })
})

describe('US-093 Phase 1B - parseScheduleFilters', () => {
  const facts = {
    validMarkets: ['china', 'japan', 'korea'],
    validMonths: ['2027-05', '2027-06', '2027-07'],
    validAirlines: ['VN', 'VJ', 'raw:custom'],
  }

  it('parses valid whitelist params and sets default sort/view', () => {
    const filters = parseScheduleFilters(
      {
        market: 'japan',
        month: '2027-05',
        airline: 'VN',
        status: 'open',
        q: 'Tokyo Cherry',
        sort: 'price',
        view: 'tour',
      },
      facts,
    )

    expect(filters).toEqual({
      market: 'japan',
      month: '2027-05',
      airline: 'VN',
      status: 'open',
      q: 'Tokyo Cherry',
      sort: 'price',
      view: 'tour',
    })
  })

  it('drops invalid values, unknown params and array values', () => {
    const filters = parseScheduleFilters(
      {
        market: ['japan', 'korea'], // array is dropped
        month: 'invalid-month',
        airline: 'UNKNOWN_AIRLINE',
        status: 'fake-status',
        q: 'A'.repeat(120), // truncated to 80
        unknownParam: 'evil',
      },
      facts,
    )

    expect(filters).toEqual({
      q: 'A'.repeat(80),
      sort: 'date',
      view: 'date',
    })
  })
})

describe('US-093 Phase 1B - filterScheduleRows and countScheduleFacets', () => {
  const sampleTours: Record<string, WingsGoScheduleTour> = {
    'tour-1': {
      id: 'tour-1',
      slug: 'tokyo-fuji',
      href: '/tour/tokyo-fuji',
      title: 'Tokyo - Núi Phú Sĩ',
      routeTitle: 'Tokyo · Núi Phú Sĩ',
      market: 'japan',
      durationLabel: '5N4Đ',
      media: null,
      badges: [],
      hasHot: false,
    },
    'tour-2': {
      id: 'tour-2',
      slug: 'beijing-shanghai',
      href: '/tour/beijing-shanghai',
      title: 'Bắc Kinh - Thượng Hải',
      routeTitle: 'Bắc Kinh · Thượng Hải',
      market: 'china',
      durationLabel: '6N5Đ',
      media: null,
      badges: [],
      hasHot: false,
    },
  }

  const sampleRows: WingsGoScheduleRow[] = [
    {
      id: 'r1',
      tourId: 'tour-1',
      departureDay: '2027-05-10',
      returnDay: '2027-05-15',
      monthKey: '2027-05',
      daysUntilDeparture: 10,
      departureCityCode: 'HAN',
      airline: { key: 'VN', label: 'Vietnam Airlines' },
      availability: 'open',
      availabilityLabel: 'Mở bán',
      price: { value: 20000000, currency: 'VND', original: null },
      promoLabel: null,
      urgencyLabel: null,
      canHoldSeat: true,
      ctaLabel: 'Giữ chỗ',
      ctaHref: '/lien-he?intent=hold-seat',
      isFeatured: false,
      searchText: foldVietnameseText('Tokyo Núi Phú Sĩ japan Vietnam Airlines'),
    },
    {
      id: 'r2',
      tourId: 'tour-1',
      departureDay: '2027-06-12',
      returnDay: '2027-06-17',
      monthKey: '2027-06',
      daysUntilDeparture: 42,
      departureCityCode: 'HAN',
      airline: { key: 'VJ', label: 'Vietjet Air' },
      availability: 'limited',
      availabilityLabel: 'Sắp hết chỗ',
      price: { value: 18000000, currency: 'VND', original: null },
      promoLabel: null,
      urgencyLabel: null,
      canHoldSeat: true,
      ctaLabel: 'Giữ chỗ',
      ctaHref: '/lien-he?intent=hold-seat',
      isFeatured: false,
      searchText: foldVietnameseText('Tokyo Núi Phú Sĩ japan Vietjet Air'),
    },
    {
      id: 'r3',
      tourId: 'tour-2',
      departureDay: '2027-05-20',
      returnDay: '2027-05-26',
      monthKey: '2027-05',
      daysUntilDeparture: 20,
      departureCityCode: 'SGN',
      airline: { key: 'VN', label: 'Vietnam Airlines' },
      availability: 'sold-out',
      availabilityLabel: 'Đã kín',
      price: { value: 15000000, currency: 'VND', original: null },
      promoLabel: null,
      urgencyLabel: null,
      canHoldSeat: false,
      ctaLabel: 'Liên hệ',
      ctaHref: '/lien-he?intent=inquiry',
      isFeatured: false,
      searchText: foldVietnameseText('Bắc Kinh Thượng Hải china Vietnam Airlines'),
    },
  ]

  it('filters rows using AND logic', () => {
    // Filter by market=japan and month=2027-05
    const filtered = filterScheduleRows(
      sampleRows,
      { market: 'japan', month: '2027-05', sort: 'date', view: 'date' },
      sampleTours,
    )
    expect(filtered.map((r) => r.id)).toEqual(['r1'])

    // Filter by text search 'phu si' (accent insensitive)
    const textFiltered = filterScheduleRows(
      sampleRows,
      { q: 'phu si', sort: 'date', view: 'date' },
      sampleTours,
    )
    expect(textFiltered.map((r) => r.id)).toEqual(['r1', 'r2'])
  })

  it('counts facets omitting the active dimension being counted', () => {
    const activeFilters: ScheduleFilters = {
      market: 'japan',
      month: '2027-05',
      sort: 'date',
      view: 'date',
    }

    const facets = countScheduleFacets(sampleRows, activeFilters, sampleTours)

    // Month facet ignores active month filter (so it counts both 2027-05 and 2027-06 for market=japan)
    expect(facets.months['2027-05']).toBe(1)
    expect(facets.months['2027-06']).toBe(1)

    // Market facet ignores active market filter (so it counts both japan and china for month=2027-05)
    expect(facets.markets['japan']).toBe(1)
    expect(facets.markets['china']).toBe(1)

    // Airline facet respects both market=japan AND month=2027-05
    expect(facets.airlines['VN']).toBe(1)
    expect(facets.airlines['VJ']).toBeUndefined()
  })
})

describe('US-093 Phase 1B - sortScheduleRows', () => {
  const rowsToSort: WingsGoScheduleRow[] = [
    {
      id: 'r-noprice',
      tourId: 't1',
      departureDay: '2027-05-10',
      monthKey: '2027-05',
      price: null,
    } as any,
    {
      id: 'r-usd-1500',
      tourId: 't1',
      departureDay: '2027-05-15',
      monthKey: '2027-05',
      price: { value: 1500, currency: 'USD' } as any,
    } as any,
    {
      id: 'r-usd-800',
      tourId: 't1',
      departureDay: '2027-06-01',
      monthKey: '2027-06',
      price: { value: 800, currency: 'USD' } as any,
    } as any,
    {
      id: 'r-vnd-25m',
      tourId: 't1',
      departureDay: '2027-05-12',
      monthKey: '2027-05',
      price: { value: 25000000, currency: 'VND' } as any,
    } as any,
    {
      id: 'r-vnd-18m-b',
      tourId: 't1',
      departureDay: '2027-05-20',
      monthKey: '2027-05',
      price: { value: 18000000, currency: 'VND' } as any,
    } as any,
    {
      id: 'r-vnd-18m-a',
      tourId: 't1',
      departureDay: '2027-05-08',
      monthKey: '2027-05',
      price: { value: 18000000, currency: 'VND' } as any,
    } as any,
  ]

  it('sorts by date ascending with id tie-breaker', () => {
    const sorted = sortScheduleRows(rowsToSort, 'date')
    expect(sorted.map((r) => r.id)).toEqual([
      'r-vnd-18m-a', // 2027-05-08
      'r-noprice',   // 2027-05-10
      'r-vnd-25m',   // 2027-05-12
      'r-usd-1500',  // 2027-05-15
      'r-vnd-18m-b', // 2027-05-20
      'r-usd-800',   // 2027-06-01
    ])
  })

  it('sorts by price: VND asc, then USD asc, then no price; tie breaker by date then id', () => {
    const sorted = sortScheduleRows(rowsToSort, 'price')
    expect(sorted.map((r) => r.id)).toEqual([
      'r-vnd-18m-a', // VND 18m, 2027-05-08
      'r-vnd-18m-b', // VND 18m, 2027-05-20
      'r-vnd-25m',   // VND 25m
      'r-usd-800',   // USD 800
      'r-usd-1500',  // USD 1500
      'r-noprice',   // no price
    ])
  })
})

describe('US-093 Phase 1B - groupScheduleRowsByTour', () => {
  const tours: Record<string, WingsGoScheduleTour> = {
    'tour-1': { id: 'tour-1', title: 'Tour 1' } as any,
    'tour-2': { id: 'tour-2', title: 'Tour 2' } as any,
  }

  const rows: WingsGoScheduleRow[] = [
    {
      id: 'r1',
      tourId: 'tour-1',
      departureDay: '2027-05-10',
      canHoldSeat: false, // sold-out, cheapest price but cannot hold seat
      price: { value: 10000000, currency: 'VND', original: null },
    } as any,
    {
      id: 'r2',
      tourId: 'tour-1',
      departureDay: '2027-05-15',
      canHoldSeat: true,
      price: { value: 14000000, currency: 'VND', original: 18000000 },
      promoLabel: 'Giảm 4 triệu',
    } as any,
    {
      id: 'r3',
      tourId: 'tour-1',
      departureDay: '2027-05-20',
      canHoldSeat: true,
      price: { value: 16000000, currency: 'VND', original: null },
    } as any,
    {
      id: 'r4',
      tourId: 'tour-2',
      departureDay: '2027-06-01',
      canHoldSeat: true,
      price: { value: 950, currency: 'USD', original: null },
    } as any,
  ]

  it('derives "Giá từ" strictly from canHoldSeat rows, preferring VND and preserving promo', () => {
    const groups = groupScheduleRowsByTour(rows, tours)
    expect(groups).toHaveLength(2)

    // Tour 1: skips r1 (10m, canHoldSeat: false); selects r2 (14m VND) over r3 (16m VND)
    const g1 = groups.find((g) => g.tour.id === 'tour-1')
    expect(g1).toBeDefined()
    expect(g1?.priceFrom).toEqual({
      value: 14000000,
      currency: 'VND',
      original: 18000000,
    })
    expect(g1?.chosenRow?.id).toBe('r2')
    expect(g1?.rows).toHaveLength(3)

    // Tour 2: selects USD
    const g2 = groups.find((g) => g.tour.id === 'tour-2')
    expect(g2).toBeDefined()
    expect(g2?.priceFrom?.currency).toBe('USD')
    expect(g2?.priceFrom?.value).toBe(950)
  })
})

describe('US-093 Phase 1B - getPriorityMarketDeparture', () => {
  const departures = [
    {
      id: 'dep-soldout',
      departureDate: '2027-05-10T00:00:00.000Z',
      tourProduct: { id: 101, market: 'japan' },
      availabilityStatus: 'sold-out',
      airline: 'Vietnam Airlines',
      currency: 'VND',
      priceFrom: 15000000,
      isFeatured: false,
    },
    {
      id: 'dep-today-vn',
      departureDate: '2027-05-19T17:00:00.000Z', // 00:00 ICT on 2027-05-20
      tourProduct: { id: 102, market: 'japan' },
      availabilityStatus: 'open',
      airline: 'Vietnam Airlines',
      currency: 'VND',
      priceFrom: 16000000,
      isFeatured: false,
    },
    {
      id: 'dep-future-limited',
      departureDate: '2027-05-25T00:00:00.000Z',
      tourProduct: { id: 103, market: 'japan' },
      availabilityStatus: 'limited',
      airline: 'Vietnam Airlines',
      currency: 'VND',
      priceFrom: 18000000,
      isFeatured: false,
    },
  ] as any[]

  it('selects priority departure without choosing sold-out, respecting now in VN calendar', () => {
    const now = new Date('2027-05-20T03:00:00.000Z')
    // Limited departure has highest priority (limited=1)
    const priority = getPriorityMarketDeparture(departures, 'japan', now)
    expect(priority?.id).toBe('dep-future-limited')
  })

  it('includes today departure on VN calendar when now is passed', () => {
    const now = new Date('2027-05-20T03:00:00.000Z')
    const onlyOpenAndSoldOut = [departures[0], departures[1]]
    // dep-soldout is skipped; dep-today-vn (17:00Z previous day = today VN) is eligible and selected
    const priority = getPriorityMarketDeparture(onlyOpenAndSoldOut, 'japan', now)
    expect(priority?.id).toBe('dep-today-vn')
  })
})

describe('US-093 Phase 1B - getTourRouteTitle', () => {
  it('preserves uppercase duration codes 5N4Đ / 5N4D in all-caps titles', () => {
    expect(getTourRouteTitle('THÁI LAN 5N4Đ')).toBe('Thái Lan 5N4Đ')
    expect(getTourRouteTitle('ĐÀI LOAN 5N4D')).toBe('Đài Loan 5N4D')
  })

  it('preserves acronyms in allowlist such as UNESCO, VNA, VJ', () => {
    expect(getTourRouteTitle('DI SẢN UNESCO')).toBe('Di Sản UNESCO')
    expect(getTourRouteTitle('HÀ NỘI – SEOUL VNA', 'Hà Nội')).toBe('Seoul VNA')
  })

  it('does not split hyphens without spaces such as Shirakawa-go', () => {
    const title = 'Nagoya – Kyoto – Làng Cổ Shirakawa-go – Matsumoto – Fuji Mt. – Tokyo'
    expect(getTourRouteTitle(title)).toBe(
      'Nagoya · Kyoto · Làng Cổ Shirakawa-go · Matsumoto · Fuji Mt. · Tokyo',
    )
  })

  it('leaves mixed-case and complex tour names intact', () => {
    expect(getTourRouteTitle('BTS World Tour ‘Arirang’ In Kaohsiung, Taiwan')).toBe(
      'BTS World Tour ‘Arirang’ In Kaohsiung, Taiwan',
    )
    expect(getTourRouteTitle('Bắc Kinh – Vạn Lý Trường Thành – Cố Cung · No Shop')).toBe(
      'Bắc Kinh · Vạn Lý Trường Thành · Cố Cung · No Shop',
    )
  })
})

describe('US-093 Phase 1B - getTourInquiryPath', () => {
  it('normalizes departureDate to Vietnam calendar day', () => {
    const path = getTourInquiryPath({
      departureDate: '2027-05-19T17:00:00.000Z', // 00:00 ICT on May 20
      departureId: 55,
      intent: 'hold-seat',
      tourSlug: 'tokyo-fuji',
      source: 'schedule',
    })

    expect(path).toContain('departureDate=2027-05-20')
    expect(path).toContain('intent=hold-seat')
    expect(path).toContain('departureId=55')
  })
})
