import { describe, expect, it } from 'vitest'
import { getNextDeparture } from '@/tours/utils'

describe('getNextDeparture best price selection logic', () => {
  it('selects the departure with the lowest priceFrom among open sellable departures', () => {
    const departures = [
      {
        id: 211,
        departureDate: '2027-02-06',
        priceFrom: 49900000,
        availabilityStatus: 'open',
        commerceVerified: true,
      },
      {
        id: 212,
        departureDate: '2027-02-07',
        priceFrom: 49900000,
        availabilityStatus: 'open',
        commerceVerified: true,
      },
      {
        id: 213,
        departureDate: '2027-02-08',
        priceFrom: 47900000,
        availabilityStatus: 'open',
        commerceVerified: true,
      },
      {
        id: 214,
        departureDate: '2027-02-10',
        priceFrom: 45900000,
        availabilityStatus: 'open',
        commerceVerified: true,
      },
    ]

    const next = getNextDeparture(departures)
    expect(next).not.toBeNull()
    expect(next?.id).toBe(214)
    expect(next?.priceFrom).toBe(45900000)
  })

  it('picks earlier date if multiple departures share the lowest price', () => {
    const departures = [
      {
        id: 301,
        departureDate: '2027-03-15',
        priceFrom: 45900000,
        availabilityStatus: 'open',
        commerceVerified: true,
      },
      {
        id: 302,
        departureDate: '2027-03-10',
        priceFrom: 45900000,
        availabilityStatus: 'open',
        commerceVerified: true,
      },
      {
        id: 303,
        departureDate: '2027-03-01',
        priceFrom: 49900000,
        availabilityStatus: 'open',
        commerceVerified: true,
      },
    ]

    const next = getNextDeparture(departures)
    expect(next?.id).toBe(302)
    expect(next?.departureDate).toBe('2027-03-10')
  })

  it('skips sold-out departures even if they have lower price', () => {
    const departures = [
      {
        id: 401,
        departureDate: '2027-04-01',
        priceFrom: 39900000,
        availabilityStatus: 'sold-out',
        commerceVerified: true,
      },
      {
        id: 402,
        departureDate: '2027-04-10',
        priceFrom: 45900000,
        availabilityStatus: 'open',
        commerceVerified: true,
      },
    ]

    const next = getNextDeparture(departures)
    expect(next?.id).toBe(402)
    expect(next?.priceFrom).toBe(45900000)
  })
})
