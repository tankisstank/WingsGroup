import { describe, expect, it, vi } from 'vitest'

vi.mock('@payload-config', () => ({ default: {} }))

import { selectMarketNextDeparture } from '@/tours/queries'
import type { DepartureCardViewModel } from '@/tours/types'

describe('selectMarketNextDeparture alignment with commercial departures', () => {
  it('prefers the first verified departure with valid governed price over an earlier unverified departure', () => {
    const unverifiedEarly: DepartureCardViewModel = {
      id: 101,
      departureDate: '2027-04-10',
      availabilityStatus: 'open',
      commerceVerified: false,
      currency: 'VND',
      priceFrom: null,
    }

    const verifiedCommercial: DepartureCardViewModel = {
      id: 102,
      departureDate: '2027-04-20',
      availabilityStatus: 'open',
      commerceVerified: true,
      currency: 'VND',
      priceFrom: 18990000,
      originalPrice: 20990000,
      promoLabel: 'Ưu đãi mùa hoa',
    }

    const linkedFuture = [unverifiedEarly, verifiedCommercial]
    const linkedVisible = [unverifiedEarly, verifiedCommercial]

    const selected = selectMarketNextDeparture(linkedFuture, linkedVisible)
    expect(selected).toBeDefined()
    expect(selected?.id).toBe(102)
    expect(selected?.priceFrom).toBe(18990000)
    expect(selected?.originalPrice).toBe(20990000)
    expect(selected?.promoLabel).toBe('Ưu đãi mùa hoa')
  })

  it('skips departures with unsupported currency like JPY and selects the valid VND departure', () => {
    const jpyDeparture: DepartureCardViewModel = {
      id: 161,
      departureDate: '2027-04-12',
      availabilityStatus: 'open',
      commerceVerified: true,
      currency: 'JPY',
      priceFrom: 150000,
    }

    const vndDeparture: DepartureCardViewModel = {
      id: 162,
      departureDate: '2027-04-22',
      availabilityStatus: 'open',
      commerceVerified: true,
      currency: 'VND',
      priceFrom: 23990000,
      originalPrice: 25990000,
      promoLabel: 'Hoa anh đào',
    }

    const linkedFuture = [jpyDeparture, vndDeparture]
    const linkedVisible = [jpyDeparture, vndDeparture]

    const selected = selectMarketNextDeparture(linkedFuture, linkedVisible)
    expect(selected?.id).toBe(162)
    expect(selected?.currency).toBe('VND')
    expect(selected?.priceFrom).toBe(23990000)
    expect(selected?.originalPrice).toBe(25990000)
    expect(selected?.promoLabel).toBe('Hoa anh đào')
  })

  it('skips sold-out departures even if verified and selects the next available commercial departure', () => {
    const soldOutVerified: DepartureCardViewModel = {
      id: 151,
      departureDate: '2027-04-15',
      availabilityStatus: 'sold-out',
      commerceVerified: true,
      currency: 'VND',
      priceFrom: 17990000,
      originalPrice: 19990000,
    }

    const openVerified: DepartureCardViewModel = {
      id: 152,
      departureDate: '2027-04-25',
      availabilityStatus: 'open',
      commerceVerified: true,
      currency: 'VND',
      priceFrom: 18990000,
      originalPrice: 20990000,
    }

    const linkedFuture = [soldOutVerified, openVerified]
    const linkedVisible = [soldOutVerified, openVerified]

    const selected = selectMarketNextDeparture(linkedFuture, linkedVisible)
    expect(selected?.id).toBe(152)
    expect(selected?.priceFrom).toBe(18990000)
  })

  it('preserves single departure identity and never mixes originalPrice or promoLabel across departures', () => {
    const depA: DepartureCardViewModel = {
      id: 201,
      departureDate: '2027-05-01',
      availabilityStatus: 'open',
      commerceVerified: true,
      currency: 'VND',
      priceFrom: 25000000,
      originalPrice: 28000000,
      promoLabel: 'Promo A',
    }

    const depB: DepartureCardViewModel = {
      id: 202,
      departureDate: '2027-05-15',
      availabilityStatus: 'open',
      commerceVerified: true,
      currency: 'VND',
      priceFrom: 22000000,
      originalPrice: 24000000,
      promoLabel: 'Promo B',
    }

    const linkedFuture = [depA, depB]
    const linkedVisible = [depA, depB]

    const selected = selectMarketNextDeparture(linkedFuture, linkedVisible)
    expect(selected?.id).toBe(201)
    expect(selected?.priceFrom).toBe(25000000)
    expect(selected?.originalPrice).toBe(28000000)
    expect(selected?.promoLabel).toBe('Promo A')
  })

  it('falls back to getNextDeparture(linkedVisible) when no future departure has verified governed price', () => {
    const unverifiedA: DepartureCardViewModel = {
      id: 301,
      departureDate: '2027-06-01',
      availabilityStatus: 'open',
      commerceVerified: false,
      currency: 'VND',
      priceFrom: 30000000,
    }

    const unverifiedB: DepartureCardViewModel = {
      id: 302,
      departureDate: '2027-06-15',
      availabilityStatus: 'open',
      commerceVerified: false,
      currency: 'VND',
      priceFrom: 29000000,
    }

    const linkedFuture = [unverifiedA, unverifiedB]
    const linkedVisible = [unverifiedA, unverifiedB]

    const selected = selectMarketNextDeparture(linkedFuture, linkedVisible)
    expect(selected).toBeDefined()
    expect(selected?.id).toBe(302) // getNextDeparture picks lowest price among open
  })

  it('falls back to getNextDeparture when linkedFuture is empty', () => {
    const pastDeparture: DepartureCardViewModel = {
      id: 401,
      departureDate: '2020-01-01',
      availabilityStatus: 'open',
      commerceVerified: true,
      currency: 'VND',
      priceFrom: 10000000,
    }

    const linkedFuture: DepartureCardViewModel[] = []
    const linkedVisible = [pastDeparture]

    const selected = selectMarketNextDeparture(linkedFuture, linkedVisible)
    // getNextDeparture on past departures returns null
    expect(selected).toBeNull()
  })

  it('returns null when linkedVisible is empty', () => {
    const selected = selectMarketNextDeparture([], [])
    expect(selected).toBeNull()
  })
})
