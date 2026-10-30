import { describe, expect, it } from 'vitest'

import { getLowestPrice } from '@/tours/utils'

describe('US-093 getLowestPrice - finite positive number governance', () => {
  it('returns null for null, undefined, or empty departures', () => {
    expect(getLowestPrice(null)).toBeNull()
    expect(getLowestPrice(undefined)).toBeNull()
    expect(getLowestPrice([])).toBeNull()
  })

  it('filters out 0, negative values, NaN, and Infinity', () => {
    const departures = [
      { priceFrom: 0 },
      { priceFrom: -1000000 },
      { priceFrom: NaN },
      { priceFrom: Infinity },
      { priceFrom: -Infinity },
      { priceFrom: null },
      { priceFrom: undefined },
    ]
    expect(getLowestPrice(departures)).toBeNull()
  })

  it('returns the lowest positive finite price when mixed with invalid prices', () => {
    const departures = [
      { priceFrom: 0 },
      { priceFrom: 25000000 },
      { priceFrom: NaN },
      { priceFrom: 18900000 },
      { priceFrom: Infinity },
      { priceFrom: null },
    ]
    expect(getLowestPrice(departures)).toBe(18900000)
  })

  it('returns the single valid price when only one departure has valid price', () => {
    const departures = [
      { priceFrom: 0 },
      { priceFrom: 12500000 },
    ]
    expect(getLowestPrice(departures)).toBe(12500000)
  })

  it('handles departures with currency fields (preserves numeric minimum)', () => {
    // Note: getLowestPrice only operates on priceFrom values; caller handles currency grouping
    const departures = [
      { priceFrom: 500, currency: 'USD' },
      { priceFrom: 10000000, currency: 'VND' },
      { priceFrom: 0, currency: 'VND' },
    ]
    expect(getLowestPrice(departures)).toBe(500)
  })
})
