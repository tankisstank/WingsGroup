import { describe, expect, it } from 'vitest'

import {
  businessCalendarMonth,
  daysUntilBusinessDay,
  isBusinessSeason,
  seasonOfBusinessMonth,
  toBusinessCalendarDay,
} from '@/tours/businessCalendar'

describe('businessCalendar', () => {
  describe('toBusinessCalendarDay', () => {
    it('handles …T00:00:00.000Z correctly in Asia/Ho_Chi_Minh', () => {
      expect(toBusinessCalendarDay('2026-03-15T00:00:00.000Z')).toBe('2026-03-15')
    })

    it('handles …T12:00:00.000Z correctly in Asia/Ho_Chi_Minh', () => {
      expect(toBusinessCalendarDay('2026-03-15T12:00:00.000Z')).toBe('2026-03-15')
    })

    it('converts …T17:00:00.000Z (previous UTC day) to next VN day', () => {
      // 17:00:00 UTC + 7 hours = 00:00:00 on March 16 in VN
      expect(toBusinessCalendarDay('2026-03-15T17:00:00.000Z')).toBe('2026-03-16')
    })

    it('handles boundary 16:59:59Z vs 17:00:00Z', () => {
      // 16:59:59 UTC + 7 hours = 23:59:59 on March 15 in VN
      expect(toBusinessCalendarDay('2026-03-15T16:59:59.000Z')).toBe('2026-03-15')
      expect(toBusinessCalendarDay('2026-03-15T17:00:00.000Z')).toBe('2026-03-16')
    })

    it('handles month and year rollover (31 Dec → 1 Jan)', () => {
      // Dec 31 at 17:00Z rolls over to Jan 01 of the next year in VN
      expect(toBusinessCalendarDay('2026-12-31T17:00:00.000Z')).toBe('2027-01-01')
      // Dec 31 at 16:59:59Z stays on Dec 31
      expect(toBusinessCalendarDay('2026-12-31T16:59:59.000Z')).toBe('2026-12-31')
      // Month rollover within the same year (March 31 17:00Z -> April 01)
      expect(toBusinessCalendarDay('2026-03-31T17:00:00.000Z')).toBe('2026-04-01')
    })

    it('returns null on invalid input', () => {
      expect(toBusinessCalendarDay(null)).toBeNull()
      expect(toBusinessCalendarDay(undefined)).toBeNull()
      expect(toBusinessCalendarDay('')).toBeNull()
      expect(toBusinessCalendarDay('not-a-date')).toBeNull()
      expect(toBusinessCalendarDay(Number.NaN)).toBeNull()
      expect(toBusinessCalendarDay({})).toBeNull()
    })

    it('supports Date objects and timestamps', () => {
      const date = new Date('2026-03-15T17:00:00.000Z')
      expect(toBusinessCalendarDay(date)).toBe('2026-03-16')
      expect(toBusinessCalendarDay(date.getTime())).toBe('2026-03-16')
    })
  })

  describe('businessCalendarMonth', () => {
    it('returns YYYY-MM for valid dates and rollover timestamps', () => {
      expect(businessCalendarMonth('2026-03-15T00:00:00.000Z')).toBe('2026-03')
      expect(businessCalendarMonth('2026-03-31T17:00:00.000Z')).toBe('2026-04')
      expect(businessCalendarMonth('2026-12-31T17:00:00.000Z')).toBe('2027-01')
    })

    it('accepts existing YYYY-MM string directly', () => {
      expect(businessCalendarMonth('2026-05')).toBe('2026-05')
    })

    it('returns null on invalid input', () => {
      expect(businessCalendarMonth(null)).toBeNull()
      expect(businessCalendarMonth('invalid')).toBeNull()
      expect(businessCalendarMonth('2026-13')).toBeNull()
    })
  })

  describe('seasonOfBusinessMonth and isBusinessSeason', () => {
    it('maps months to four seasons according to VN calendar rules', () => {
      // Spring: 3, 4, 5
      expect(seasonOfBusinessMonth(3)).toBe('spring')
      expect(seasonOfBusinessMonth(4)).toBe('spring')
      expect(seasonOfBusinessMonth(5)).toBe('spring')
      expect(seasonOfBusinessMonth('2026-03')).toBe('spring')
      expect(seasonOfBusinessMonth('2026-05-31T10:00:00.000Z')).toBe('spring')

      // Summer: 6, 7, 8
      expect(seasonOfBusinessMonth(6)).toBe('summer')
      expect(seasonOfBusinessMonth(7)).toBe('summer')
      expect(seasonOfBusinessMonth(8)).toBe('summer')
      expect(seasonOfBusinessMonth('2026-07')).toBe('summer')

      // Autumn: 9, 10, 11
      expect(seasonOfBusinessMonth(9)).toBe('autumn')
      expect(seasonOfBusinessMonth(10)).toBe('autumn')
      expect(seasonOfBusinessMonth(11)).toBe('autumn')
      expect(seasonOfBusinessMonth('2026-10')).toBe('autumn')

      // Winter: 12, 1, 2 across year rollover
      expect(seasonOfBusinessMonth(12)).toBe('winter')
      expect(seasonOfBusinessMonth(1)).toBe('winter')
      expect(seasonOfBusinessMonth(2)).toBe('winter')
      expect(seasonOfBusinessMonth('2026-12')).toBe('winter')
      expect(seasonOfBusinessMonth('2027-01')).toBe('winter')
      expect(seasonOfBusinessMonth('2027-02')).toBe('winter')
    })

    it('resolves timezone-sensitive departure timestamps to correct season', () => {
      // Nov 30 at 17:00Z -> Dec 1 in VN (winter)
      expect(seasonOfBusinessMonth('2026-11-30T17:00:00.000Z')).toBe('winter')
      // Nov 30 at 16:59Z -> Nov 30 in VN (autumn)
      expect(seasonOfBusinessMonth('2026-11-30T16:59:59.000Z')).toBe('autumn')
    })

    it('validates season strings with isBusinessSeason', () => {
      expect(isBusinessSeason('spring')).toBe(true)
      expect(isBusinessSeason('summer')).toBe(true)
      expect(isBusinessSeason('autumn')).toBe(true)
      expect(isBusinessSeason('winter')).toBe(true)
      expect(isBusinessSeason('monsoon')).toBe(false)
      expect(isBusinessSeason(null)).toBe(false)
      expect(isBusinessSeason(undefined)).toBe(false)
    })

    it('returns null on invalid input', () => {
      expect(seasonOfBusinessMonth(0)).toBeNull()
      expect(seasonOfBusinessMonth(13)).toBeNull()
      expect(seasonOfBusinessMonth('invalid')).toBeNull()
      expect(seasonOfBusinessMonth(null)).toBeNull()
    })
  })

  describe('daysUntilBusinessDay', () => {
    it('calculates calendar-day differences accurately based on VN calendar', () => {
      const now = '2026-03-15T10:00:00.000Z' // 17:00 on 2026-03-15 VN
      // Same VN day
      expect(daysUntilBusinessDay('2026-03-15T00:00:00.000Z', now)).toBe(0)
      // Next day in VN (17:00Z on March 15 is March 16 VN)
      expect(daysUntilBusinessDay('2026-03-15T17:00:00.000Z', now)).toBe(1)
      // 5 days later
      expect(daysUntilBusinessDay('2026-03-20T00:00:00.000Z', now)).toBe(5)
      // In the past
      expect(daysUntilBusinessDay('2026-03-14T00:00:00.000Z', now)).toBe(-1)
    })

    it('handles year rollover difference correctly', () => {
      const now = '2026-12-31T05:00:00.000Z' // 2026-12-31 VN
      const target = '2027-01-01T00:00:00.000Z' // 2027-01-01 VN
      expect(daysUntilBusinessDay(target, now)).toBe(1)
    })

    it('returns null if either date is invalid', () => {
      expect(daysUntilBusinessDay(null, new Date())).toBeNull()
      expect(daysUntilBusinessDay('2026-03-15', 'invalid')).toBeNull()
    })
  })
})
