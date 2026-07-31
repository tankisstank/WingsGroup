import { describe, expect, it } from 'vitest'

import {
  buildDepartureInventoryIdentity,
  isDepartureVerificationCurrent,
} from '@/tours/departureCommerce'
import {
  buildDiscoveryWhere,
  isDiscoveryCardMatch,
  projectDiscoveryTour,
  type DiscoveryTourCard,
} from '@/tours/discoveryCore'

const isoFromNow = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString()

const hybridTour = (departure: Record<string, unknown>) => ({
  _status: 'published',
  activeDepartures: [departure],
  currency: 'USD',
  destinationTags: ['hanoi'],
  durationDays: 9,
  durationNights: 8,
  heroMedia: { alt: 'Northern Vietnam', site: 3, url: '/media/north.jpg' },
  id: 65,
  primaryCTA: { mode: 'hold-seat' },
  site: 3,
  slug: 'northern-vietnam',
  summary: 'A shared departure or a private journey around your dates.',
  title: 'Northern Vietnam',
  tourType: 'hybrid',
  travelStyles: ['culture'],
  wrapperPage: {
    _status: 'published',
    pathname: '/tour/northern-vietnam',
    site: 3,
  },
})

describe('WingSide hybrid commerce freshness contract', () => {
  it('includes hybrid products in both public type filters', () => {
    const hybridCard: Pick<
      DiscoveryTourCard,
      'destinationTags' | 'duration' | 'summary' | 'title' | 'tourType' | 'travelStyles'
    > = {
      destinationTags: ['hanoi'],
      duration: { days: 9, nights: 8 },
      summary: 'Shared or private.',
      title: 'Northern Vietnam',
      tourType: 'hybrid' as const,
      travelStyles: ['culture'],
    }

    expect(isDiscoveryCardMatch(hybridCard, { type: 'group' })).toBe(true)
    expect(isDiscoveryCardMatch(hybridCard, { type: 'private' })).toBe(true)
    expect(buildDiscoveryWhere({ type: 'group' }).and).toContainEqual({
      or: [{ tourType: { equals: 'group' } }, { tourType: { equals: 'hybrid' } }],
    })
    expect(buildDiscoveryWhere({ type: 'private' }).and).toContainEqual({
      or: [
        { tourType: { equals: 'private' } },
        { tourType: { equals: 'hybrid' } },
        { tourType: { exists: false } },
      ],
    })
  })

  it('publishes current verified hybrid inventory but never marks it bookable', () => {
    const card = projectDiscoveryTour({
      locale: 'en',
      site: { id: 3 },
      tour: hybridTour({
        availabilityBadge: 'Open',
        availabilityStatus: 'open',
        currency: 'USD',
        departureDate: isoFromNow(30 * 86_400_000),
        expiresAt: isoFromNow(2 * 86_400_000),
        priceBasis: 'per-person',
        priceFrom: 1699,
        site: 3,
        verifiedAt: isoFromNow(-86_400_000),
      }),
    })

    expect(card?.tourType).toBe('hybrid')
    expect(card?.commerce).toMatchObject({
      canBook: false,
      price: { currency: 'USD', kind: 'from', value: 1699 },
    })
  })

  it('fails closed when the verification window is missing, expired, or future-dated', () => {
    expect(isDepartureVerificationCurrent({})).toBe(false)
    expect(
      isDepartureVerificationCurrent({
        expiresAt: isoFromNow(-1),
        verifiedAt: isoFromNow(-86_400_000),
      }),
    ).toBe(false)
    expect(
      isDepartureVerificationCurrent({
        expiresAt: isoFromNow(86_400_000),
        verifiedAt: isoFromNow(60_000),
      }),
    ).toBe(false)

    const card = projectDiscoveryTour({
      site: 3,
      tour: hybridTour({
        availabilityStatus: 'open',
        currency: 'USD',
        departureDate: isoFromNow(30 * 86_400_000),
        expiresAt: isoFromNow(-1),
        priceBasis: 'per-person',
        priceFrom: 1699,
        site: 3,
        verifiedAt: isoFromNow(-86_400_000),
      }),
    })
    expect(card?.tourType).toBe('hybrid')
    expect(card?.commerce).toBeUndefined()
  })

  it('builds one UTC date identity per site, tour and variant', () => {
    expect(
      buildDepartureInventoryIdentity({
        departureDate: '2026-10-03T23:30:00-07:00',
        site: { id: 3 },
        tourProduct: 65,
        variantKey: '  Deluxe  Cabin ',
      }),
    ).toBe('s:3|t:65|d:2026-10-04|v:key:deluxe-cabin')

    expect(
      buildDepartureInventoryIdentity({
        departureDate: '2026-10-04',
        site: 3,
        tourProduct: { id: 65 },
        variantKey: 'ignored',
        variantRef: 9,
      }),
    ).toBe('s:3|t:65|d:2026-10-04|v:ref:9')
  })
})
