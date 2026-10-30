import { describe, expect, it } from 'vitest'

import {
  formatShortTourPrice,
  getCompactDurationLabel,
  getDepartureCityCode,
  getDepartureStub,
  getShortDepartureDate,
  getTourRouteTitle,
  toTitleCaseWord,
} from '@/tours/wingsGoDisplay'

describe('wingsGoDisplay', () => {
  it('maps known departure cities to airport codes', () => {
    expect(getDepartureCityCode('Hà Nội')).toBe('HAN')
    expect(getDepartureCityCode('TP.HCM / Hà Nội')).toBe('SGN / HAN')
    expect(getDepartureCityCode('Ho Chi Minh City')).toBe('SGN')
    expect(getDepartureCityCode('Cần Thơ')).toBe('Cần Thơ')
    expect(getDepartureCityCode(null)).toBeNull()
  })

  it('formats compact durations per locale', () => {
    expect(getCompactDurationLabel(6, 5, 'vi')).toBe('6N5Đ')
    expect(getCompactDurationLabel(6, 5, 'en')).toBe('6D5N')
    expect(getCompactDurationLabel(null, 5, 'vi')).toBeNull()
  })

  it('formats short prices in millions', () => {
    expect(formatShortTourPrice(23_900_000, 'vi')).toBe('23,9 triệu')
    expect(formatShortTourPrice(19_000_000, 'vi')).toBe('19 triệu')
    expect(formatShortTourPrice(23_900_000, 'en')).toBe('VND 23.9M')
  })

  it('reads departure days on the Vietnam business calendar', () => {
    expect(getDepartureStub('2026-11-23T17:00:00.000Z', 'vi')).toEqual({
      day: '24',
      month: 'Th11',
      weekday: 'Thứ 3',
    })
    expect(getDepartureStub('2026-11-24T00:00:00.000Z', 'en')).toEqual({
      day: '24',
      month: 'Nov',
      weekday: 'Tue',
    })
    expect(getShortDepartureDate('2026-12-04T17:00:00.000Z')).toBe('05/12')
    expect(getDepartureStub('not-a-date')).toBeNull()
  })

  it('preserves uppercase duration code with punctuation and allowlist acronyms (S2)', () => {
    expect(toTitleCaseWord('6N5Đ:')).toBe('6N5Đ:')
    expect(toTitleCaseWord('(5N4D)')).toBe('(5N4D)')
    expect(toTitleCaseWord('5N4Đ,')).toBe('5N4Đ,')
    expect(toTitleCaseWord('UNESCO:')).toBe('UNESCO:')
    expect(toTitleCaseWord('HÀN')).toBe('Hàn')
    expect(getTourRouteTitle('TOUR HÀN QUỐC 6N5Đ: BUSAN – NAMI')).toBe('Tour Hàn Quốc 6N5Đ: Busan · Nami')
  })

  it('turns long uppercase titles into route titles', () => {
    expect(getTourRouteTitle('HÀ NỘI – BUSAN – GYEONGJU – SEOUL – ĐẢO NAMI', 'Hà Nội')).toBe(
      'Busan · Gyeongju · Seoul · Đảo Nami',
    )
    expect(getTourRouteTitle('Hà Nội - Seoul - Nami VNA')).toBe('Seoul · Nami VNA')
    expect(getTourRouteTitle('TP.HCM - Bắc Kinh', 'TP.HCM / Hà Nội')).toBe('Bắc Kinh')
    expect(getTourRouteTitle('Osaka · Kyoto')).toBe('Osaka · Kyoto')
  })
})
