import { describe, expect, it } from 'vitest'

import type { TourResolvedData } from '@/tours/types'
import {
  buildWingSideTourCTA,
  buildWingSideTourViewModel,
  deriveWingSideRoute,
  getWingSideTourCopy,
  hasMatchingWingSideTourWrapper,
  mapWingSideGallery,
  sanitizeWingSidePublicText,
} from '@/tours/wingsSideTourViewModel'

const media = (id: number, alt = `Image ${id}`) => ({ alt, id, url: `/media/${id}.jpg` })
const data = (overrides: Record<string, unknown> = {}): TourResolvedData => ({
  builderConfig: null,
  departures: [],
  featuredDepartures: [],
  nextDeparture: null,
  sectionOrder: [],
  sectionVisibility: [],
  tour: {
    durationDays: 5,
    durationNights: 4,
    gallery: [media(1), media(2), media(2), media(3)],
    heroMedia: media(1),
    id: 498,
    itineraryDays: [
      { dayNumber: 1, route: 'Ho Chi Minh City → Phu Quoc', summary: 'Fly south.', title: 'Arrival' },
      { dayNumber: 2, route: 'Phu Quoc – Southern island', summary: 'Explore.', title: 'Island day' },
    ],
    slug: 'romantic-getaway',
    summary: 'A private island journey.',
    title: 'Romantic Getaway',
    ...overrides,
  },
  variants: [],
})

describe('WingSide tour view model', () => {
  it('uses Contact when either price or a future departure is missing', () => {
    const now = new Date('2026-07-18T12:00:00Z')
    expect(buildWingSideTourViewModel({ data: data({ priceFrom: 1200 }), locale: 'en', now }).priceState.kind).toBe('contact')

    const noPrice = data()
    noPrice.departures = [{ departureDate: '2026-08-01', id: 1 }]
    expect(buildWingSideTourViewModel({ data: noPrice, locale: 'en', now }).priceState.kind).toBe('contact')
  })

  it('shows only real future departure data when price and date both exist', () => {
    const input = data({ currency: 'USD', priceFrom: 1400 })
    input.departures = [
      { departureDate: '2026-07-17', id: 1, priceFrom: 1000 },
      { currency: 'USD', departureDate: '2026-07-18', id: 2, priceFrom: 1250 },
    ]
    const vm = buildWingSideTourViewModel({ data: input, locale: 'en', now: new Date('2026-07-18T23:00:00Z') })
    expect(vm.priceState).toMatchObject({ kind: 'available', price: 1250 })
    expect(vm.priceState.departures.map(({ id }) => id)).toEqual([2])
  })

  it('never borrows another departure price for an unpriced date or currency', () => {
    const input = data({ currency: null, priceFrom: null })
    input.departures = [
      { currency: 'USD', departureDate: '2026-08-01', id: 1 },
      { currency: 'EUR', departureDate: '2026-08-02', id: 2, priceFrom: 1200 },
      { currency: 'GBP', departureDate: '2026-08-03', id: 3, priceFrom: 1300 },
    ]
    const vm = buildWingSideTourViewModel({ data: input, locale: 'en', now: new Date('2026-07-18') })
    expect(vm.priceState.kind).toBe('available')
    expect(vm.priceState.departures).toEqual([
      expect.objectContaining({ currency: 'EUR', id: 2, price: 1200 }),
      expect.objectContaining({ currency: 'GBP', id: 3, price: 1300 }),
    ])
  })

  it('builds the approved consultation URL with tour context and intent', () => {
    expect(buildWingSideTourCTA('romantic-getaway', 498)).toBe(
      '/contact-us?intent=inquiry&source=tour-detail&tour=romantic-getaway&tourId=498',
    )
    expect(buildWingSideTourCTA('romantic-getaway', 498, 'contact')).toBe(
      '/contact-us?intent=contact&source=tour-detail-contact&tour=romantic-getaway&tourId=498',
    )
  })

  it('requires the TourProduct to point at the published Page wrapper', () => {
    expect(hasMatchingWingSideTourWrapper({ wrapperPage: { id: 909 } }, 909)).toBe(true)
    expect(hasMatchingWingSideTourWrapper({ wrapperPage: 909 }, '909')).toBe(true)
    expect(hasMatchingWingSideTourWrapper({ wrapperPage: 910 }, 909)).toBe(false)
    expect(hasMatchingWingSideTourWrapper({}, 909)).toBe(false)
  })

  it('falls back unsupported locale copy to English, never Vietnamese', () => {
    expect(getWingSideTourCopy('fr')).toBe(getWingSideTourCopy('en'))
    expect(getWingSideTourCopy('fr').request).toBe('Request consultation')
    expect(getWingSideTourCopy('it')).toMatchObject({ dayLabel: 'Giorno', durationLabel: 'Durata' })
  })

  it('uses configured stops first and otherwise derives a deduplicated itinerary route', () => {
    const stops = [{ label: 'Hue', order: 2 }, { label: 'Da Nang', order: 1 }]
    expect(deriveWingSideRoute({ routeViz: { stops } })).toEqual(['Da Nang', 'Hue'])
    expect(stops.map(({ label }) => label)).toEqual(['Hue', 'Da Nang'])
    expect(deriveWingSideRoute(data().tour)).toEqual([
      'Ho Chi Minh City',
      'Phu Quoc',
      'Southern island',
    ])
  })

  it('maps only the product gallery, deduplicates it, and excludes the hero', () => {
    const mapped = mapWingSideGallery(data().tour)
    expect((mapped.heroMedia as { id: number }).id).toBe(1)
    expect(mapped.gallery.map(({ id }) => id)).toEqual([2, 3])
  })

  it('omits invalid duration and uses a day-owned gallery fallback', () => {
    const vm = buildWingSideTourViewModel({
      data: data({
        durationDays: 0,
        durationNights: 0,
        itineraryDays: [{ dayNumber: 1, gallery: [media(8)], route: 'Hanoi', summary: 'Arrive.' }],
      }),
      locale: 'en',
    })
    expect(vm.duration).toBeNull()
    expect(vm.itinerary[0]?.media).toMatchObject({ id: 8 })
  })

  it('removes only exact known technical sentences and preserves editorial wording', () => {
    expect(
      sanitizeWingSidePublicText(
        'A flexible journey. Imported from BestPrice Travel raw crawl for WingSide editorial review. Sales teams support your planning.',
      ),
    ).toBe('A flexible journey. Sales teams support your planning.')
    expect(
      sanitizeWingSidePublicText(
        'First paragraph.\n\nBESTPRICE   SOURCE DOES NOT PROVIDE FIXED FUTURE DEPARTURE DATES IN THIS RAW BATCH.\nSecond paragraph stays.',
      ),
    ).toBe('First paragraph. Second paragraph stays.')
  })
})
