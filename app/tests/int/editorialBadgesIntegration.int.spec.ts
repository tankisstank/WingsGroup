import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  find: vi.fn(),
  siteID: 7, // WingsGo tenant site ID
}))

vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('payload', () => ({ getPayload: vi.fn(async () => ({ find: mocks.find })) }))
vi.mock('@/utilities/siteContext', () => ({
  appendSiteWhere: vi.fn(async (where?: Record<string, unknown>) => ({
    and: [{ site: { equals: mocks.siteID } }, where],
  })),
  getCurrentSite: vi.fn(async () => ({ code: 'wings-go', id: mocks.siteID })),
}))

import { getToursByMarketRoute } from '@/tours/queries'
import { queryWingsGoTourCatalog } from '@/tours/wingsGoCatalog'

const sampleTours = [
  {
    _status: 'published',
    id: 101,
    site: 7, // wings-go
    slug: 'korea-golden-route',
    title: 'Cung đường vàng Hàn Quốc',
    summary: 'Seoul - Nami - Everland',
    market: 'korea',
    durationDays: 5,
    durationNights: 4,
    wrapperPage: 901,
    editorialBadges: [
      { kind: 'hot', label: 'Tour hot' },
      { kind: 'specialized', label: 'Specialize' },
    ],
  },
  {
    _status: 'published',
    id: 102,
    site: 7, // wings-go
    slug: 'japan-cherry-blossom',
    title: 'Nhật Bản mùa hoa anh đào',
    summary: 'Tokyo - Phú Sĩ - Kyoto',
    market: 'japan',
    durationDays: 6,
    durationNights: 5,
    wrapperPage: 902,
    editorialBadges: [
      { kind: 'vip', label: 'VIP' },
    ],
  },
  {
    _status: 'published',
    id: 301,
    site: 3, // wing-side (different tenant!)
    slug: 'wingside-private-tour',
    title: 'Tour riêng WingSide',
    market: 'korea',
    editorialBadges: [{ kind: 'hot', label: 'Hot WingSide' }],
  },
]

const sampleDepartures = [
  {
    _status: 'published',
    id: 501,
    site: 7,
    tourProduct: 101,
    departureDate: '2030-04-10T00:00:00.000Z',
    priceFrom: 18900000,
    originalPrice: 22000000,
    currency: 'VND',
    commerceVerified: true,
    availabilityStatus: 'open',
    promoLabel: 'Giảm 3.1 triệu',
    airline: 'Vietnam Airlines',
    departureCity: 'Hà Nội',
  },
]

describe('US-084 Tour Editorial Badges Integration Tests', () => {
  beforeEach(() => {
    mocks.siteID = 7
    mocks.find.mockReset()
    mocks.find.mockImplementation(async ({ collection, where }: any) => {
      if (collection === 'tour-products') {
        const siteFilter = where?.and?.[0]?.site?.equals ?? mocks.siteID
        const marketFilter = where?.and?.[1]?.market?.equals
        const docs = sampleTours.filter(
          (t) => t.site === siteFilter && (!marketFilter || t.market === marketFilter),
        )
        return { docs }
      }
      if (collection === 'tour-departures') {
        return { docs: sampleDepartures }
      }
      if (collection === 'pages') {
        return {
          docs: [
            {
              id: 99,
              _status: 'published',
              pathname: '/tour',
              site: 7,
              wingsGoTourCatalog: { enabled: true, featuredTours: [{ id: 101 }] },
            },
            { id: 901, _status: 'published', pathname: '/tour/korea-golden-route', site: 7 },
            { id: 902, _status: 'published', pathname: '/tour/japan-cherry-blossom', site: 7 },
          ],
        }
      }
      return { docs: [] }
    })
  })

  it('queries market route and maps typed editorial badges and commercial promotions into shared DTO', async () => {
    const result = await getToursByMarketRoute({
      draft: false,
      locale: 'vi',
      marketRouteSlug: 'han-quoc',
    })

    expect(result).not.toBeNull()
    expect(result?.marketKey).toBe('korea')
    expect(result?.tours).toHaveLength(1)

    const tour = result!.tours[0]
    expect(tour.id).toBe(101)
    expect(tour.slug).toBe('korea-golden-route')

    // Editorial badges DTO
    expect(tour.hasHotEditorialBadge).toBe(true)
    expect(tour.editorialBadges).toEqual([
      { kind: 'hot', label: 'Tour hot' },
      { kind: 'specialized', label: 'Specialize' },
    ])

    // Commercial promo remains separate
    expect(tour.nextDeparture?.promoLabel).toBe('Giảm 3.1 triệu')
    expect(tour.nextDeparture?.priceFrom).toBe(18900000)
  })

  it('preserves tenant isolation: WingsGo queries never leak tours from other site tenants', async () => {
    const result = await getToursByMarketRoute({
      draft: false,
      locale: 'vi',
      marketRouteSlug: 'han-quoc',
    })

    const tourIDs = result!.tours.map((t) => t.id)
    // WingsGo tours are included
    expect(tourIDs).toContain(101)
    // WingSide tour (id: 301, site: 3) MUST NOT leak into WingsGo
    expect(tourIDs).not.toContain(301)
  })

  it('guarantees no price or discount inference from editorialBadges', async () => {
    const result = await getToursByMarketRoute({
      draft: false,
      locale: 'vi',
      marketRouteSlug: 'han-quoc',
    })

    const tour = result!.tours[0]
    // Badges must not override or create price fields
    expect(tour.editorialBadges).toBeDefined()
    expect((tour.editorialBadges![0] as any).price).toBeUndefined()
    expect((tour.editorialBadges![0] as any).originalPrice).toBeUndefined()
    expect((tour.editorialBadges![0] as any).promoLabel).toBeUndefined()
  })

  it('maps catalog cards via queryWingsGoTourCatalog with shared editorialBadges DTO', async () => {
    const catalogResult = await queryWingsGoTourCatalog({
      locale: 'vi',
      now: new Date('2026-10-21T00:00:00.000Z'),
      page: {
        id: 99,
        pathname: '/tour',
        wingsGoTourCatalog: { enabled: true, featuredTours: [{ id: 101 }] },
      } as any,
      payload: { find: mocks.find } as any,
      site: { code: 'wings-go', id: 7 },
    })

    expect(catalogResult.featured.length).toBeGreaterThan(0)
    const featuredCard = catalogResult.featured[0]
    expect(featuredCard.id).toBe(101)
    expect(featuredCard.hasHotEditorialBadge).toBe(true)
    expect(featuredCard.editorialBadges).toEqual([
      { kind: 'hot', label: 'Tour hot' },
      { kind: 'specialized', label: 'Specialize' },
    ])
    // Commercial promoLabel is preserved on nextDeparture
    expect(featuredCard.nextDeparture.promoLabel).toBe('Giảm 3.1 triệu')
  })

  it('guarantees zero Vietnamese fallback on English market route when tour only has Vietnamese badge', async () => {
    // Add a tour with Vietnamese-only badge (object format as Payload returns when fallbackLocale is false)
    const tourWithViOnlyBadge = {
      _status: 'published',
      id: 105,
      site: 7,
      slug: 'vietnam-only-badge-tour',
      title: 'Tour with Vi Only Badge',
      market: 'korea',
      durationDays: 5,
      durationNights: 4,
      editorialBadges: [
        { kind: 'hot', label: { vi: 'Tour hot tiếng Việt' } },
        { kind: 'specialized', label: { vi: 'Chuyên tour tiếng Việt' } },
      ],
    }

    mocks.find.mockImplementation(async ({ collection, fallbackLocale, locale }: any) => {
      if (collection === 'tour-products') {
        // When locale is 'en', fallbackLocale MUST be false!
        expect(fallbackLocale).toBe(false)
        expect(locale).toBe('en')
        return { docs: [tourWithViOnlyBadge] }
      }
      if (collection === 'tour-departures') {
        return { docs: [] }
      }
      return { docs: [] }
    })

    const result = await getToursByMarketRoute({
      draft: false,
      locale: 'en',
      marketRouteSlug: 'han-quoc',
    })

    expect(result).not.toBeNull()
    const mappedTour = result!.tours[0]
    expect(mappedTour.hasHotEditorialBadge).toBe(false)
    expect(mappedTour.editorialBadges).toEqual([])
  })
});
