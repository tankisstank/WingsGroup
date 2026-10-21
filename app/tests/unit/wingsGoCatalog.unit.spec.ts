import { describe, expect, it, vi } from 'vitest'

import {
  getWingsGoFeaturedTours,
  isEligibleWingsGoCatalogProduct,
  queryWingsGoTourCatalog,
  selectWingsGoCatalogCards,
  WINGSGO_CATALOG_MAX_INVENTORY,
} from '@/tours/wingsGoCatalog'
import { validateWingsGoTourCatalog } from '@/collections/Pages/hooks/validateWingsGoTourCatalog'

const product = (overrides: Record<string, unknown> = {}) => ({
  _status: 'published',
  durationDays: 5,
  durationNights: 4,
  id: 1,
  market: 'korea',
  slug: 'seoul-5n4d',
  site: 7,
  title: 'Seoul 5N4D',
  ...overrides,
})

const wrapper = (overrides: Record<string, unknown> = {}) => ({
  _status: 'published',
  id: 9,
  pathname: '/tour/seoul-5n4d',
  site: 7,
  ...overrides,
})

const departure = (overrides: Record<string, unknown> = {}) => ({
  availabilityStatus: 'open',
  commerceVerified: true,
  currency: 'VND',
  _status: 'published',
  departureDate: '2026-10-01T00:00:00.000Z',
  id: 11,
  site: 7,
  tourProduct: 1,
  ...overrides,
})

const card = (id: number, date: string, title = `Tour ${id}`) => ({
  duration: { days: 5, nights: 4 },
  href: `/tour/tour-${id}`,
  id,
  image: null,
  market: 'korea',
  nextDeparture: { airline: null, date, departureCity: null },
  price: { kind: 'contact' as const, label: 'Liên hệ' },
  slug: `tour-${id}`,
  summary: '',
  title,
})

describe('WingsGo dynamic catalog constraints', () => {
  it('requires the WingsGo site, published product and wrapper, and a future published departure', () => {
    const args = {
      departures: [departure()],
      now: new Date('2026-01-01T00:00:00.000Z'),
      product: product(),
      siteCode: 'wings-go',
      wrapper: wrapper(),
    }
    expect(isEligibleWingsGoCatalogProduct(args)).toBe(true)
    expect(isEligibleWingsGoCatalogProduct({ ...args, siteCode: 'wing-side' })).toBe(false)
    expect(
      isEligibleWingsGoCatalogProduct({ ...args, product: product({ _status: 'draft' }) }),
    ).toBe(false)
    expect(
      isEligibleWingsGoCatalogProduct({ ...args, wrapper: wrapper({ _status: 'draft' }) }),
    ).toBe(false)
    expect(
      isEligibleWingsGoCatalogProduct({
        ...args,
        departures: [departure({ departureDate: '2025-01-01T00:00:00.000Z' })],
      }),
    ).toBe(false)
  })

  it('orders by next departure, then title, then id and pages exactly six cards', () => {
    const cards = [
      card(3, '2026-03-01T00:00:00.000Z', 'Same'),
      card(2, '2026-03-01T00:00:00.000Z', 'Same'),
      card(1, '2026-02-01T00:00:00.000Z'),
      card(4, '2026-04-01T00:00:00.000Z'),
      card(5, '2026-05-01T00:00:00.000Z'),
      card(6, '2026-06-01T00:00:00.000Z'),
      card(7, '2026-07-01T00:00:00.000Z'),
    ]
    const result = selectWingsGoCatalogCards({ cards, limit: 6 })
    expect(result.cards.map(({ id }) => id)).toEqual([1, 2, 3, 4, 5, 6])
    expect(result.hasMore).toBe(true)
  })

  it('excludes featured ids, dedupes the returned page, and applies catalog filters', () => {
    const cards = [
      card(1, '2026-02-01T00:00:00.000Z'),
      card(2, '2026-03-01T00:00:00.000Z'),
      card(3, '2026-04-01T00:00:00.000Z'),
    ]
    const result = selectWingsGoCatalogCards({
      cards: [...cards, cards[1]!],
      excludeIDs: [1],
      filters: { durationMin: 5, market: 'korea' },
      limit: 6,
    })
    expect(result.cards.map(({ id }) => id)).toEqual([2, 3])
    expect(result.cards.some(({ id }) => id === 1)).toBe(false)
  })

  it('queries only the WingsGo inventory and returns a six-card canonical page without duplicates', async () => {
    const products = Array.from({ length: 8 }, (_, index) =>
      product({
        id: index + 1,
        slug: `tour-${index + 1}`,
        title: `Tour ${index + 1}`,
        wrapperPage: index + 101,
      }),
    )
    const wrappers = products.map((item) => ({
      _status: 'published',
      id: 100 + Number(item.id),
      pathname: `/tour/${item.slug}`,
      site: 7,
    }))
    const departures = products.map((item, index) => ({
      ...departure({ id: index + 201, tourProduct: item.id }),
      departureDate: `2026-${String(index + 2).padStart(2, '0')}-01T00:00:00.000Z`,
    }))
    const calls: Array<{ collection: string; limit: number }> = []
    const payload = {
      find: vi.fn(async ({ collection, limit }: { collection: string; limit: number }) => {
        calls.push({ collection, limit })
        if (collection === 'pages') return { docs: wrappers }
        if (collection === 'tour-products') return { docs: products }
        if (collection === 'tour-curations') return { docs: [] }
        return { docs: departures }
      }),
    }

    const result = await queryWingsGoTourCatalog({
      limit: 6,
      now: new Date('2026-01-01T00:00:00.000Z'),
      offset: 0,
      page: {
        id: 99,
        pathname: '/tour',
        site: 7,
        wingsGoTourCatalog: { enabled: true, featuredTours: [{ id: 1 }, { id: 1 }] },
      },
      payload: payload as never,
      site: { code: 'wings-go', id: 7 },
    })

    expect(WINGSGO_CATALOG_MAX_INVENTORY).toBe(200)
    expect(calls).toEqual([
      { collection: 'pages', limit: WINGSGO_CATALOG_MAX_INVENTORY },
      { collection: 'tour-products', limit: WINGSGO_CATALOG_MAX_INVENTORY },
      { collection: 'tour-departures', limit: WINGSGO_CATALOG_MAX_INVENTORY },
      { collection: 'tour-curations', limit: 1 },
    ])
    expect(result.featured.map(({ id }) => id)).toEqual([1, 2, 3, 4, 5, 6])
    expect(result.all.map(({ id }) => id)).toEqual([7, 8])
    expect(new Set(result.all.map(({ id }) => id)).size).toBe(result.all.length)
    expect(result.all.every(({ href, slug }) => href === `/tour/${slug}`)).toBe(true)
  })

  it('parses URL filters without allowing invalid or unsafe pagination values', async () => {
    const { parseWingsGoCatalogFilters } = await import('@/tours/wingsGoCatalog')
    expect(
      parseWingsGoCatalogFilters(
        new URLSearchParams('market=korea&durationMin=4&priceMax=20000000&sort=price'),
      ),
    ).toEqual({
      durationMin: 4,
      market: 'korea',
      priceMax: 20000000,
      sort: 'price',
    })
    expect(
      parseWingsGoCatalogFilters(new URLSearchParams('durationMin=-1&sort=DROP TABLE')),
    ).toEqual({})
  })

  it('omits cross-site hero and gallery URLs from the catalog DTO', async () => {
    const catalogProduct = product({
      gallery: [{ alt: 'cross-site gallery', site: 8, url: '/media/cross-site-gallery.jpg' }],
      heroMedia: { alt: 'cross-site hero', site: 8, url: '/media/cross-site-hero.jpg' },
      wrapperPage: 9,
    })
    const payload = {
      find: vi.fn(async ({ collection }: { collection: string }) => {
        if (collection === 'pages') return { docs: [wrapper()] }
        if (collection === 'tour-products') return { docs: [catalogProduct] }
        return { docs: [departure()] }
      }),
    }

    const result = await queryWingsGoTourCatalog({
      now: new Date('2026-01-01T00:00:00.000Z'),
      page: {
        id: 99,
        pathname: '/tour',
        site: 7,
        wingsGoTourCatalog: { enabled: true, featuredTours: [1] },
      },
      payload: payload as never,
      site: { code: 'wings-go', id: 7 },
    })

    expect(result.featured[0]?.image).toBeNull()
    expect(JSON.stringify(result)).not.toContain('cross-site')
  })

  it('normalizes Payload media file URLs to the public media route', async () => {
    const catalogProduct = product({
      heroMedia: { alt: 'hero', site: 7, url: '/api/media/file/hero.jpg' },
      wrapperPage: 9,
    })
    const payload = {
      find: vi.fn(async ({ collection }: { collection: string }) => {
        if (collection === 'pages') return { docs: [wrapper()] }
        if (collection === 'tour-products') return { docs: [catalogProduct] }
        return { docs: [departure()] }
      }),
    }

    const result = await queryWingsGoTourCatalog({
      now: new Date('2026-01-01T00:00:00.000Z'),
      page: {
        id: 99,
        pathname: '/tour',
        site: 7,
        wingsGoTourCatalog: { enabled: true, featuredTours: [1] },
      },
      payload: payload as never,
      site: { code: 'wings-go', id: 7 },
    })

    expect(result.featured[0]?.image).toEqual({ alt: 'hero', url: '/media/hero.jpg' })
  })

  it('rejects malformed curation before it can be persisted', async () => {
    const req = {
      locale: 'vi',
      payload: {
        find: vi.fn(async ({ collection }: { collection: string }) =>
          collection === 'tour-products' ? { docs: [product({ wrapperPage: 9 })] } : { docs: [] },
        ),
        findByID: vi.fn(async ({ collection }: { collection: string }) => {
          if (collection === 'sites') return { code: 'wings-go' }
          return wrapper()
        }),
      },
    }
    const baseArgs = {
      originalDoc: undefined,
      req,
    }

    await expect(
      validateWingsGoTourCatalog({
        ...baseArgs,
        data: {
          pathname: '/tour',
          site: 7,
          wingsGoTourCatalog: { enabled: true, featuredTours: [1, 2, 3, 4, 5, 6, 7] },
        },
      } as never),
    ).rejects.toThrow('tối đa 6')

    req.payload.find.mockResolvedValueOnce({
      docs: [product({ wrapperPage: 9 })],
    })
    await expect(
      validateWingsGoTourCatalog({
        ...baseArgs,
        data: {
          pathname: '/tour',
          site: 7,
          wingsGoTourCatalog: { enabled: true, featuredTours: [1] },
        },
      } as never),
    ).rejects.toThrow('khởi hành tương lai')
  })

  it('loads featured tours via getWingsGoFeaturedTours helper with locale and promoLabel', async () => {
    const products = [
      product({ id: 1, slug: 'tour-1', title: 'Tour Seoul', wrapperPage: 101 }),
      product({ id: 2, slug: 'tour-2', title: 'Tour Tokyo', wrapperPage: 102 }),
    ]
    const wrappers = [
      wrapper({ id: 101, pathname: '/tour/tour-1' }),
      wrapper({ id: 102, pathname: '/tour/tour-2' }),
    ]
    const departures = [
      {
        ...departure({ id: 201, priceFrom: 12000000, promoLabel: 'Mùa hoa anh đào', tourProduct: 1 }),
        departureDate: '2026-11-01T00:00:00.000Z',
      },
      {
        ...departure({ id: 202, promoLabel: null, tourProduct: 2 }),
        departureDate: '2026-11-05T00:00:00.000Z',
      },
    ]

    const receivedLocales: string[] = []
    const payload = {
      find: vi.fn(
        async ({
          collection,
          locale,
          where,
        }: {
          collection: string
          locale?: string
          where?: { and?: Array<{ pathname?: { equals?: string } }> }
        }) => {
          if (locale) receivedLocales.push(locale)
          if (collection === 'pages') {
            const hasCatalogPath = where?.and?.some(
              (cond) => cond.pathname?.equals === '/tour',
            )
            if (hasCatalogPath) {
              return {
                docs: [
                  {
                    id: 99,
                    pathname: '/tour',
                    site: 7,
                    wingsGoTourCatalog: { enabled: true, featuredTours: [{ id: 1 }] },
                  },
                ],
              }
            }
            return { docs: wrappers }
          }
          if (collection === 'tour-products') return { docs: products }
          return { docs: departures }
        },
      ),
    }

    const featured = await getWingsGoFeaturedTours({
      limit: 3,
      locale: 'en',
      payload: payload as never,
      site: { code: 'wings-go', id: 7 },
    })

    expect(featured).toHaveLength(2)
    expect(featured[0].id).toBe(1)
    expect(featured[0].slug).toBe('tour-1')
    expect(featured[0].nextDeparture.promoLabel).toBe('Mùa hoa anh đào')
    expect(featured[1].id).toBe(2)
    expect(featured[1].nextDeparture.promoLabel).toBeNull()
    expect(receivedLocales).toContain('en')
  })

  it('returns empty array when catalog is disabled or catalog page is missing', async () => {
    const payloadMissing = {
      find: vi.fn(async () => ({ docs: [] })),
    }

    const featuredMissing = await getWingsGoFeaturedTours({
      payload: payloadMissing as never,
      site: { code: 'wings-go', id: 7 },
    })
    expect(featuredMissing).toEqual([])

    const payloadDisabled = {
      find: vi.fn(async ({ collection }: { collection: string }) => {
        if (collection === 'pages') {
          return {
            docs: [
              {
                id: 99,
                pathname: '/tour',
                site: 7,
                wingsGoTourCatalog: { enabled: false, featuredTours: [{ id: 1 }] },
              },
            ],
          }
        }
        return { docs: [] }
      }),
    }

    const featuredDisabled = await getWingsGoFeaturedTours({
      payload: payloadDisabled as never,
      site: { code: 'wings-go', id: 7 },
    })
    expect(featuredDisabled).toEqual([])
  })

  describe('WingsGo promotion and discount rules (US-083)', () => {
    it('derives verified pricing from the stored verification window without a schema flag', async () => {
      const payload = {
        find: vi.fn(async ({ collection }: { collection: string }) => {
          if (collection === 'pages') return { docs: [wrapper()] }
          if (collection === 'tour-products') return { docs: [product({ wrapperPage: 9 })] }
          if (collection === 'tour-curations') return { docs: [] }
          return { docs: [departure({
            commerceVerified: undefined,
            verifiedAt: '2025-12-01T00:00:00.000Z',
            expiresAt: '2026-02-01T00:00:00.000Z',
            priceFrom: 12000000,
            originalPrice: 15000000,
            promoLabel: 'Verified promotion',
          })] }
        }),
      }
      const result = await queryWingsGoTourCatalog({
        limit: 6,
        now: new Date('2026-01-01T00:00:00.000Z'),
        offset: 0,
        page: { id: 99, pathname: '/tour', site: 7, wingsGoTourCatalog: { enabled: true } },
        payload: payload as never,
        site: { code: 'wings-go', id: 7 },
      })
      const resultCard = [...result.featured, ...result.all][0]
      expect(resultCard.price).toEqual({
        kind: 'verified', currency: 'VND', value: 12000000, originalPrice: 15000000,
      })
      expect(resultCard.nextDeparture.promoLabel).toBe('Verified promotion')
    })

    it.each([
      { priceFrom: 0 },
      { priceFrom: 12000000, verifiedAt: '2025-01-01', expiresAt: '2025-12-31' },
    ])('suppresses promotion for contact-only pricing: %j', async (overrides) => {
      const payload = {
        find: vi.fn(async ({ collection }: { collection: string }) => {
          if (collection === 'pages') return { docs: [wrapper()] }
          if (collection === 'tour-products') return { docs: [product({ wrapperPage: 9 })] }
          if (collection === 'tour-curations') return { docs: [] }
          return { docs: [departure({ originalPrice: 15000000, promoLabel: 'Sale', ...overrides })] }
        }),
      }
      const result = await queryWingsGoTourCatalog({
        limit: 6,
        now: new Date('2026-01-01T00:00:00.000Z'),
        offset: 0,
        page: { id: 99, pathname: '/tour', site: 7, wingsGoTourCatalog: { enabled: true } },
        payload: payload as never,
        site: { code: 'wings-go', id: 7 },
      })
      const resultCard = [...result.featured, ...result.all][0]
      expect(resultCard.price.kind).toBe('contact')
      expect(resultCard.nextDeparture.promoLabel).toBeNull()
    })

    it('enforces same-departure rule for price, discount, and promoLabel', async () => {
      const tour = product({ id: 50, slug: 'same-departure-tour', title: 'Tour Độc Đáo', wrapperPage: 150 })
      const wrap = wrapper({ id: 150, pathname: '/tour/same-departure-tour' })
      const deps = [
        departure({
          id: 501,
          tourProduct: 50,
          departureDate: '2026-11-01T00:00:00.000Z',
          priceFrom: 12000000,
          originalPrice: 15000000,
          currency: 'VND',
          promoLabel: 'Ưu đãi mùa thu',
          commerceVerified: true,
          availabilityStatus: 'open',
        }),
        departure({
          id: 502,
          tourProduct: 50,
          departureDate: '2026-12-01T00:00:00.000Z',
          priceFrom: 20000000,
          originalPrice: 25000000,
          currency: 'VND',
          promoLabel: 'Ưu đãi Giáng sinh',
          commerceVerified: true,
          availabilityStatus: 'open',
        }),
      ]

      const payload = {
        find: vi.fn(async ({ collection }: { collection: string }) => {
          if (collection === 'pages') return { docs: [wrap] }
          if (collection === 'tour-products') return { docs: [tour] }
          if (collection === 'tour-curations') return { docs: [] }
          return { docs: deps }
        }),
      }

      const result = await queryWingsGoTourCatalog({
        limit: 6,
        now: new Date('2026-01-01T00:00:00.000Z'),
        offset: 0,
        page: {
          id: 99,
          pathname: '/tour',
          site: 7,
          wingsGoTourCatalog: { enabled: true, featuredTours: [] },
        },
        payload: payload as never,
        site: { code: 'wings-go', id: 7 },
      })

      const card = [...result.featured, ...result.all].find((c) => c.id === 50)
      expect(card).toBeDefined()
      expect(card?.price).toEqual({
        currency: 'VND',
        kind: 'verified',
        originalPrice: 15000000,
        value: 12000000,
      })
      expect(card?.nextDeparture.date).toBe('2026-11-01T00:00:00.000Z')
      expect(card?.nextDeparture.promoLabel).toBe('Ưu đãi mùa thu')
    })

    it('suppresses discount and promoLabel when departure is sold-out', async () => {
      const tour = product({ id: 51, slug: 'sold-out-tour', title: 'Tour Hết Chỗ', wrapperPage: 151 })
      const wrap = wrapper({ id: 151, pathname: '/tour/sold-out-tour' })
      const deps = [
        departure({
          id: 511,
          tourProduct: 51,
          departureDate: '2026-11-01T00:00:00.000Z',
          priceFrom: 12000000,
          originalPrice: 15000000,
          currency: 'VND',
          promoLabel: 'Flash sale',
          commerceVerified: true,
          availabilityStatus: 'sold-out',
        }),
      ]

      const payload = {
        find: vi.fn(async ({ collection }: { collection: string }) => {
          if (collection === 'pages') return { docs: [wrap] }
          if (collection === 'tour-products') return { docs: [tour] }
          if (collection === 'tour-curations') return { docs: [] }
          return { docs: deps }
        }),
      }

      const result = await queryWingsGoTourCatalog({
        limit: 6,
        now: new Date('2026-01-01T00:00:00.000Z'),
        offset: 0,
        page: {
          id: 99,
          pathname: '/tour',
          site: 7,
          wingsGoTourCatalog: { enabled: true, featuredTours: [] },
        },
        payload: payload as never,
        site: { code: 'wings-go', id: 7 },
      })

      const card = [...result.featured, ...result.all].find((c) => c.id === 51)
      expect(card).toBeDefined()
      expect(card?.price).toEqual({
        currency: 'VND',
        kind: 'verified',
        originalPrice: null,
        value: 12000000,
      })
      expect(card?.nextDeparture.promoLabel).toBeNull()
    })

    it('degrades to contact price when commerceVerified is false or unverified', async () => {
      const tour = product({ id: 52, slug: 'unverified-tour', title: 'Tour Chưa Xác Thực', wrapperPage: 152 })
      const wrap = wrapper({ id: 152, pathname: '/tour/unverified-tour' })
      const deps = [
        departure({
          id: 521,
          tourProduct: 52,
          departureDate: '2026-11-01T00:00:00.000Z',
          priceFrom: 12000000,
          originalPrice: 15000000,
          currency: 'VND',
          promoLabel: 'Super Sale',
          commerceVerified: false,
          availabilityStatus: 'open',
        }),
      ]

      const payload = {
        find: vi.fn(async ({ collection }: { collection: string }) => {
          if (collection === 'pages') return { docs: [wrap] }
          if (collection === 'tour-products') return { docs: [tour] }
          if (collection === 'tour-curations') return { docs: [] }
          return { docs: deps }
        }),
      }

      const result = await queryWingsGoTourCatalog({
        limit: 6,
        now: new Date('2026-01-01T00:00:00.000Z'),
        offset: 0,
        page: {
          id: 99,
          pathname: '/tour',
          site: 7,
          wingsGoTourCatalog: { enabled: true, featuredTours: [] },
        },
        payload: payload as never,
        site: { code: 'wings-go', id: 7 },
      })

      const card = [...result.featured, ...result.all].find((c) => c.id === 52)
      expect(card).toBeDefined()
      expect(card?.price).toEqual({
        kind: 'contact',
        label: 'Liên hệ để nhận giá mới nhất',
      })
      expect(card?.nextDeparture.promoLabel).toBeNull()
    })

    it('validates currency matching and price inversion rules', async () => {
      const tourMismatched = product({ id: 53, slug: 'currency-mismatch', title: 'Tour Mismatched', wrapperPage: 153 })
      const tourInverted = product({ id: 54, slug: 'price-inverted', title: 'Tour Inverted', wrapperPage: 154 })
      const wrapMismatched = wrapper({ id: 153, pathname: '/tour/currency-mismatch' })
      const wrapInverted = wrapper({ id: 154, pathname: '/tour/price-inverted' })

      const deps = [
        // Currency mismatch: currency VND, originalCurrency USD
        departure({
          id: 531,
          tourProduct: 53,
          departureDate: '2026-11-01T00:00:00.000Z',
          priceFrom: 12000000,
          originalPrice: 500,
          currency: 'VND',
          originalCurrency: 'USD',
          commerceVerified: true,
          availabilityStatus: 'open',
        }),
        // Inverted: originalPrice <= priceFrom
        departure({
          id: 541,
          tourProduct: 54,
          departureDate: '2026-11-01T00:00:00.000Z',
          priceFrom: 15000000,
          originalPrice: 15000000,
          currency: 'VND',
          commerceVerified: true,
          availabilityStatus: 'open',
        }),
      ]

      const payload = {
        find: vi.fn(async ({ collection }: { collection: string }) => {
          if (collection === 'pages') return { docs: [wrapMismatched, wrapInverted] }
          if (collection === 'tour-products') return { docs: [tourMismatched, tourInverted] }
          if (collection === 'tour-curations') return { docs: [] }
          return { docs: deps }
        }),
      }

      const result = await queryWingsGoTourCatalog({
        limit: 6,
        now: new Date('2026-01-01T00:00:00.000Z'),
        offset: 0,
        page: {
          id: 99,
          pathname: '/tour',
          site: 7,
          wingsGoTourCatalog: { enabled: true, featuredTours: [] },
        },
        payload: payload as never,
        site: { code: 'wings-go', id: 7 },
      })

      const cardMismatched = [...result.featured, ...result.all].find((c) => c.id === 53)
      expect(cardMismatched?.price).toEqual({
        currency: 'VND',
        kind: 'verified',
        originalPrice: null,
        value: 12000000,
      })

      const cardInverted = [...result.featured, ...result.all].find((c) => c.id === 54)
      expect(cardInverted?.price).toEqual({
        currency: 'VND',
        kind: 'verified',
        originalPrice: null,
        value: 15000000,
      })
    })
  })
})
