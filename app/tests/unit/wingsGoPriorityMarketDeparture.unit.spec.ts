import { describe, expect, it } from 'vitest'

import type { DepartureCardViewModel } from '@/tours/types'
import { getPriorityMarketDeparture } from '@/tours/utils'

const departure = (overrides: Partial<DepartureCardViewModel>): DepartureCardViewModel => ({
  airline: 'Vietnam Airlines',
  currency: 'VND',
  departureDate: '2099-01-01T00:00:00.000Z',
  flightNumber: 'VN123',
  priceFrom: 12000000,
  tourProduct: { market: 'korea' },
  ...overrides,
})

describe('getPriorityMarketDeparture', () => {
  it('prefers limited seats, then featured dates, within the requested market', () => {
    const featured = departure({ id: 'featured', isFeatured: true, departureDate: '2099-01-02' })
    const limited = departure({
      availabilityStatus: 'limited',
      id: 'limited',
      departureDate: '2099-01-03',
    })
    const nearest = departure({ id: 'nearest', departureDate: '2099-01-01' })
    const japan = departure({ id: 'japan', tourProduct: { market: 'japan' } })

    expect(getPriorityMarketDeparture([nearest, featured, limited, japan], 'korea')).toBe(limited)
    expect(getPriorityMarketDeparture([nearest, featured, japan], 'korea')).toBe(featured)
    expect(getPriorityMarketDeparture([nearest, japan], 'korea')).toBe(nearest)
  })

  it('skips future departures that are missing airline or price', () => {
    const missingAirline = departure({ airline: null, id: 'missing-airline' })
    const missingPrice = departure({ priceFrom: null, id: 'missing-price' })
    const complete = departure({ id: 'complete', departureDate: '2099-01-02' })

    expect(getPriorityMarketDeparture([missingAirline, complete], 'korea')).toBe(complete)
    expect(getPriorityMarketDeparture([missingPrice, complete], 'korea')).toBe(complete)
    expect(getPriorityMarketDeparture([missingAirline], 'korea')).toBeUndefined()
  })

  it('accepts valid departures where flight code is not yet assigned', () => {
    const noFlightCode = departure({
      airline: 'Vietjet Air',
      flightNumber: undefined,
      id: 'no-flight-code',
      priceFrom: 16500000,
    })

    expect(getPriorityMarketDeparture([noFlightCode], 'korea')).toBe(noFlightCode)
  })
})
