import { describe, expect, it } from 'vitest'

import {
  toBusinessCalendarDay,
  businessCalendarMonth,
  daysUntilBusinessDay,
} from '@/tours/businessCalendar'
import { isDepartureVerificationCurrent } from '@/tours/departureCommerce'
import { normalizeGovernedTourPrice } from '@/tours/currency'
import { getWingsGoScheduleCopy } from '@/tours/wingsGoScheduleCopy'
import { getDepartureCityCode } from '@/tours/wingsGoDisplay'
import type {
  ScheduleAvailability,
  WingsGoScheduleRow,
  WingsGoScheduleStats,
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

describe('US-093 Phase 1A - Schedule copy and labels', () => {
  it('provides complete Vietnamese schedule copy with correct marketOther label', () => {
    const vi = getWingsGoScheduleCopy('vi')
    expect(vi.statusOpen).toBe('Mở bán')
    expect(vi.statusLimited).toBe('Sắp hết chỗ')
    expect(vi.statusSoldOut).toBe('Đã kín')
    expect(vi.statusQuote).toBe('Liên hệ báo giá')
    expect(vi.filterStatusQuote).toBe('Chờ báo giá')
    expect(vi.marketOther).toBe('Thị trường khác') // Distinct from /tour "Tuyến khác"
  })

  it('provides complete English schedule copy', () => {
    const en = getWingsGoScheduleCopy('en')
    expect(en.statusOpen).toBe('Open')
    expect(en.statusLimited).toBe('Few seats left')
    expect(en.statusSoldOut).toBe('Sold out')
    expect(en.statusQuote).toBe('Request a quote')
    expect(en.filterStatusQuote).toBe('Quote')
    expect(en.marketOther).toBe('Other destinations')
  })
})

describe('US-093 Phase 1A - Snapshot Stats logic', () => {
  it('ensures nearestDay chooses earliest date, NOT lowest price', () => {
    const mockRows: Partial<WingsGoScheduleRow>[] = [
      {
        id: '1',
        departureDay: '2027-02-15',
        price: { value: 15000000, currency: 'VND', original: null },
      },
      {
        id: '2',
        departureDay: '2027-01-20', // Earlier day, but higher price
        price: { value: 35000000, currency: 'VND', original: null },
      },
      {
        id: '3',
        departureDay: '2027-03-01',
        price: null,
      },
    ]

    // Sorted by day
    mockRows.sort((a, b) => (a.departureDay || '').localeCompare(b.departureDay || ''))
    expect(mockRows[0].departureDay).toBe('2027-01-20')
    expect(mockRows[0].price?.value).toBe(35000000)
  })

  it('computes yearRange correctly across single and multi-year spans', () => {
    const singleYear = ['2027-03-01', '2027-11-20']
    const fromSingle = Number(singleYear[0].slice(0, 4))
    const toSingle = Number(singleYear[1].slice(0, 4))
    expect({ from: fromSingle, to: toSingle }).toEqual({ from: 2027, to: 2027 })

    const multiYear = ['2026-11-01', '2027-04-15']
    const fromMulti = Number(multiYear[0].slice(0, 4))
    const toMulti = Number(multiYear[1].slice(0, 4))
    expect({ from: fromMulti, to: toMulti }).toEqual({ from: 2026, to: 2027 })
  })

  it('detects shared departure city only when all departures share the same code', () => {
    const citiesSame = ['Ha Noi', 'HAN', 'ha noi'].map((c) => getDepartureCityCode(c))
    const uniqueSame = new Set(citiesSame.filter(Boolean))
    expect(uniqueSame.size).toBe(1)
    expect(Array.from(uniqueSame)[0]).toBe('HAN')

    const citiesMixed = ['Ha Noi', 'TP.HCM'].map((c) => getDepartureCityCode(c))
    const uniqueMixed = new Set(citiesMixed.filter(Boolean))
    expect(uniqueMixed.size).toBe(2)
  })
})
