import { describe, expect, it, vi } from 'vitest'

import {
  buildCatalogCursorContext,
  decodeCatalogCursor,
  encodeCatalogCursor,
  getWingsGoFeaturedTours,
  hasActiveCatalogFilters,
  parseWingsGoCatalogFilters,
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
  wrapperPage: 9 as any,
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

    it('suppresses discount and promoLabel and falls back to contact when departure is sold-out', async () => {
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
        kind: 'contact',
        label: 'Liên hệ để nhận giá mới nhất',
      })
      expect(card?.nextDeparture.promoLabel).toBeNull()
    })

    it('formats contact price in English when locale is en', async () => {
      const tour = product({ id: 511, slug: 'sold-out-tour-en', title: 'Sold Out Tour', wrapperPage: 1511 })
      const wrap = wrapper({ id: 1511, pathname: '/tour/sold-out-tour-en' })
      const deps = [
        departure({
          id: 5111,
          tourProduct: 511,
          departureDate: '2026-11-01T00:00:00.000Z',
          priceFrom: 12000000,
          originalPrice: 15000000,
          currency: 'VND',
          promoLabel: 'Sale',
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
        locale: 'en',
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

      const card = [...result.featured, ...result.all].find((c) => c.id === 511)
      expect(card).toBeDefined()
      expect(card?.price).toEqual({
        kind: 'contact',
        label: 'Contact us for latest pricing',
      })
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

  describe('WingsGo lowest price catalog card rules (US-091)', () => {
    it('reproduces product 132: shows 18.5m from 11 Dec 2026 while nextDeparture remains 10 Dec 2026', async () => {
      const tour = product({
        id: 132,
        slug: 'ha-noi-busan-seoul-truot-tuyet-incheon-tau-dien-ven-bien-vj',
        title: 'HÀ NỘI – BUSAN – SEOUL – TRƯỢT TUYẾT – INCHEON – TÀU ĐIỆN VEN BIỂN (VJ)',
        wrapperPage: 1320,
      })
      const wrap = wrapper({
        id: 1320,
        pathname: '/tour/ha-noi-busan-seoul-truot-tuyet-incheon-tau-dien-ven-bien-vj',
      })
      const deps = [
        departure({
          id: 208,
          tourProduct: 132,
          departureDate: '2026-12-10T00:00:00.000Z',
          departureCity: 'Hà Nội',
          airline: 'Vietjet (về chuyến 06h25)',
          priceFrom: 19900000,
          originalPrice: null,
          currency: 'VND',
          commerceVerified: true,
          availabilityStatus: 'open',
        }),
        departure({
          id: 204,
          tourProduct: 132,
          departureDate: '2026-12-11T00:00:00.000Z',
          departureCity: 'Hà Nội',
          airline: 'Vietjet',
          priceFrom: 18500000,
          originalPrice: null,
          currency: 'VND',
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
        now: new Date('2026-10-28T00:00:00.000Z'),
        offset: 0,
        page: {
          id: 99,
          pathname: '/tour',
          site: 7,
          wingsGoTourCatalog: { enabled: true, featuredTours: [132] },
        },
        payload: payload as never,
        site: { code: 'wings-go', id: 7 },
      })

      const card = [...result.featured, ...result.all].find((c) => c.id === 132)
      expect(card).toBeDefined()
      // Nearest future departure date remains preserved
      expect(card?.nextDeparture.date).toBe('2026-12-10T00:00:00.000Z')
      expect(card?.nextDeparture.airline).toBe('Vietjet (về chuyến 06h25)')
      expect(card?.nextDeparture.departureCity).toBe('Hà Nội')
      // Price displays the lowest verified future price (18.5m)
      expect(card?.price).toEqual({
        currency: 'VND',
        kind: 'verified',
        originalPrice: null,
        value: 18500000,
      })
    })

    it('selects cheaper later departure with discount and promoLabel while keeping nextDeparture independent', async () => {
      const tour = product({ id: 133, slug: 'tour-with-promo', title: 'Tour Có Ưu Đãi', wrapperPage: 1330 })
      const wrap = wrapper({ id: 1330, pathname: '/tour/tour-with-promo' })
      const deps = [
        departure({
          id: 301,
          tourProduct: 133,
          departureDate: '2026-11-01T00:00:00.000Z',
          airline: 'Vietnam Airlines',
          departureCity: 'Hà Nội',
          priceFrom: 20000000,
          originalPrice: null,
          currency: 'VND',
          commerceVerified: true,
          availabilityStatus: 'open',
        }),
        departure({
          id: 302,
          tourProduct: 133,
          departureDate: '2026-11-20T00:00:00.000Z',
          airline: 'Vietjet',
          departureCity: 'Đà Nẵng',
          priceFrom: 15000000,
          originalPrice: 18000000,
          promoLabel: 'Flash Sale 11.20',
          currency: 'VND',
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
        now: new Date('2026-10-01T00:00:00.000Z'),
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

      const card = [...result.featured, ...result.all].find((c) => c.id === 133)
      expect(card).toBeDefined()
      expect(card?.nextDeparture.date).toBe('2026-11-01T00:00:00.000Z')
      expect(card?.nextDeparture.airline).toBe('Vietnam Airlines')
      expect(card?.nextDeparture.departureCity).toBe('Hà Nội')
      expect(card?.nextDeparture.promoLabel).toBe('Flash Sale 11.20')
      expect(card?.price).toEqual({
        currency: 'VND',
        kind: 'verified',
        originalPrice: 18000000,
        value: 15000000,
      })
    })

    it('falls back to higher valid price when cheaper later departure is sold-out', async () => {
      const tour = product({ id: 134, slug: 'tour-sold-out-later', title: 'Tour Hết Chỗ Đợt Sau', wrapperPage: 1340 })
      const wrap = wrapper({ id: 1340, pathname: '/tour/tour-sold-out-later' })
      const deps = [
        departure({
          id: 401,
          tourProduct: 134,
          departureDate: '2026-11-05T00:00:00.000Z',
          priceFrom: 19900000,
          currency: 'VND',
          commerceVerified: true,
          availabilityStatus: 'open',
        }),
        departure({
          id: 402,
          tourProduct: 134,
          departureDate: '2026-11-15T00:00:00.000Z',
          priceFrom: 16500000,
          currency: 'VND',
          commerceVerified: true,
          availabilityStatus: 'sold-out', // Sold out should NOT be used
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
        now: new Date('2026-10-01T00:00:00.000Z'),
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

      const card = [...result.featured, ...result.all].find((c) => c.id === 134)
      expect(card).toBeDefined()
      expect(card?.nextDeparture.date).toBe('2026-11-05T00:00:00.000Z')
      expect(card?.price).toEqual({
        currency: 'VND',
        kind: 'verified',
        originalPrice: null,
        value: 19900000,
      })
    })

    it('preserves nearest departure date when earlier departure is sold-out and takes price from open later departure', async () => {
      const tour = product({ id: 135, slug: 'tour-sold-out-earlier', title: 'Tour Hết Chỗ Đợt Trước', wrapperPage: 1350 })
      const wrap = wrapper({ id: 1350, pathname: '/tour/tour-sold-out-earlier' })
      const deps = [
        departure({
          id: 501,
          tourProduct: 135,
          departureDate: '2026-11-01T00:00:00.000Z',
          airline: 'Bamboo Airways',
          departureCity: 'Hà Nội',
          priceFrom: 14000000,
          currency: 'VND',
          commerceVerified: true,
          availabilityStatus: 'sold-out',
        }),
        departure({
          id: 502,
          tourProduct: 135,
          departureDate: '2026-12-01T00:00:00.000Z',
          airline: 'Vietjet',
          departureCity: 'TP.HCM',
          priceFrom: 17500000,
          currency: 'VND',
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
        now: new Date('2026-10-01T00:00:00.000Z'),
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

      const card = [...result.featured, ...result.all].find((c) => c.id === 135)
      expect(card).toBeDefined()
      // Nearest departure remains 2026-11-01
      expect(card?.nextDeparture.date).toBe('2026-11-01T00:00:00.000Z')
      expect(card?.nextDeparture.airline).toBe('Bamboo Airways')
      expect(card?.nextDeparture.departureCity).toBe('Hà Nội')
      // Price takes the open departure (17.5m)
      expect(card?.price).toEqual({
        currency: 'VND',
        kind: 'verified',
        originalPrice: null,
        value: 17500000,
      })
    })

    it('falls back to contact pricing when all future departures are sold-out or unverified', async () => {
      const tour = product({ id: 136, slug: 'tour-all-sold-out', title: 'Tour Hết Chỗ Mọi Đợt', wrapperPage: 1360 })
      const wrap = wrapper({ id: 1360, pathname: '/tour/tour-all-sold-out' })
      const deps = [
        departure({
          id: 601,
          tourProduct: 136,
          departureDate: '2026-11-01T00:00:00.000Z',
          airline: 'Vietjet',
          departureCity: 'Hà Nội',
          priceFrom: 15000000,
          currency: 'VND',
          commerceVerified: true,
          availabilityStatus: 'sold-out',
        }),
        departure({
          id: 602,
          tourProduct: 136,
          departureDate: '2026-12-01T00:00:00.000Z',
          airline: 'Vietjet',
          departureCity: 'Hà Nội',
          priceFrom: 14000000,
          currency: 'VND',
          commerceVerified: false, // unverified
          availabilityStatus: 'open',
        }),
        departure({
          id: 603,
          tourProduct: 136,
          departureDate: '2026-12-15T00:00:00.000Z',
          airline: 'Vietjet',
          departureCity: 'Hà Nội',
          priceFrom: 13000000,
          currency: 'VND',
          verifiedAt: '2025-01-01T00:00:00.000Z',
          expiresAt: '2025-12-31T00:00:00.000Z', // expired
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
        now: new Date('2026-10-01T00:00:00.000Z'),
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

      const card = [...result.featured, ...result.all].find((c) => c.id === 136)
      expect(card).toBeDefined()
      // Nearest departure remains 2026-11-01
      expect(card?.nextDeparture.date).toBe('2026-11-01T00:00:00.000Z')
      expect(card?.nextDeparture.airline).toBe('Vietjet')
      expect(card?.nextDeparture.departureCity).toBe('Hà Nội')
      expect(card?.nextDeparture.promoLabel).toBeNull()
      // Price falls back to contact
      expect(card?.price).toEqual({
        kind: 'contact',
        label: 'Liên hệ để nhận giá mới nhất',
      })
    })

    it('ignores departures belonging to a different tour or site', async () => {
      const tour = product({ id: 137, slug: 'tour-correct', title: 'Tour Đúng Site', site: 7, wrapperPage: 1370 })
      const wrap = wrapper({ id: 1370, pathname: '/tour/tour-correct', site: 7 })
      const deps = [
        departure({
          id: 701,
          tourProduct: 137,
          site: 7,
          departureDate: '2026-11-10T00:00:00.000Z',
          priceFrom: 20000000,
          currency: 'VND',
          commerceVerified: true,
          availabilityStatus: 'open',
        }),
        // Cheaper departure belonging to different tour
        departure({
          id: 702,
          tourProduct: 999,
          site: 7,
          departureDate: '2026-11-12T00:00:00.000Z',
          priceFrom: 10000000,
          currency: 'VND',
          commerceVerified: true,
          availabilityStatus: 'open',
        }),
        // Cheaper departure belonging to different site
        departure({
          id: 703,
          tourProduct: 137,
          site: 8,
          departureDate: '2026-11-14T00:00:00.000Z',
          priceFrom: 9000000,
          currency: 'VND',
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
        now: new Date('2026-10-01T00:00:00.000Z'),
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

      const card = [...result.featured, ...result.all].find((c) => c.id === 137)
      expect(card).toBeDefined()
      expect(card?.price).toEqual({
        currency: 'VND',
        kind: 'verified',
        originalPrice: null,
        value: 20000000,
      })
    })
  })

  describe('US-092 Phase 1: snapshot, filter contract, and departure window', () => {
    describe('parseWingsGoCatalogFilters and hasActiveCatalogFilters', () => {
      const fixedNow = new Date('2026-05-15T10:00:00.000Z') // VN month: 2026-05

      it('accepts departureMonth only if within [current month, current month + 24]', () => {
        // current month
        expect(
          parseWingsGoCatalogFilters(new URLSearchParams('departureMonth=2026-05'), fixedNow),
        ).toEqual({ departureMonth: '2026-05' })

        // 24 months ahead (2028-05)
        expect(
          parseWingsGoCatalogFilters(new URLSearchParams('departureMonth=2028-05'), fixedNow),
        ).toEqual({ departureMonth: '2028-05' })

        // 1 month ahead
        expect(
          parseWingsGoCatalogFilters(new URLSearchParams('departureMonth=2026-06'), fixedNow),
        ).toEqual({ departureMonth: '2026-06' })

        // Past month: dropped
        expect(
          parseWingsGoCatalogFilters(new URLSearchParams('departureMonth=2026-04'), fixedNow),
        ).toEqual({})

        // 25 months ahead: dropped
        expect(
          parseWingsGoCatalogFilters(new URLSearchParams('departureMonth=2028-06'), fixedNow),
        ).toEqual({})

        // Malformed strings: dropped
        expect(
          parseWingsGoCatalogFilters(new URLSearchParams('departureMonth=2026-5'), fixedNow),
        ).toEqual({})
        expect(
          parseWingsGoCatalogFilters(new URLSearchParams('departureMonth=2026-13'), fixedNow),
        ).toEqual({})
        expect(
          parseWingsGoCatalogFilters(new URLSearchParams('departureMonth=invalid'), fixedNow),
        ).toEqual({})
      })

      it('accepts only the 4 canonical business seasons', () => {
        expect(parseWingsGoCatalogFilters(new URLSearchParams('season=spring'), fixedNow)).toEqual({
          season: 'spring',
        })
        expect(parseWingsGoCatalogFilters(new URLSearchParams('season=summer'), fixedNow)).toEqual({
          season: 'summer',
        })
        expect(parseWingsGoCatalogFilters(new URLSearchParams('season=autumn'), fixedNow)).toEqual({
          season: 'autumn',
        })
        expect(parseWingsGoCatalogFilters(new URLSearchParams('season=winter'), fixedNow)).toEqual({
          season: 'winter',
        })

        // Unknown or invalid casing
        expect(
          parseWingsGoCatalogFilters(new URLSearchParams('season=monsoon'), fixedNow),
        ).toEqual({})
        expect(
          parseWingsGoCatalogFilters(new URLSearchParams('season=SPRING'), fixedNow),
        ).toEqual({})
        expect(
          parseWingsGoCatalogFilters(new URLSearchParams('season=winter '), fixedNow),
        ).toEqual({})
      })

      it('whitelists market against TourProducts market values', () => {
        const allowedMarkets = [
          'korea',
          'japan',
          'china',
          'vietnam',
          'thailand',
          'cambodia',
          'laos',
          'myanmar',
          'indochina',
          'other',
        ]
        for (const m of allowedMarkets) {
          expect(parseWingsGoCatalogFilters(new URLSearchParams(`market=${m}`), fixedNow)).toEqual({
            market: m,
          })
        }

        // Unknown market dropped
        expect(parseWingsGoCatalogFilters(new URLSearchParams('market=mars'), fixedNow)).toEqual({})
        expect(parseWingsGoCatalogFilters(new URLSearchParams('market=europe'), fixedNow)).toEqual({})
      })

      it('recognizes active filters correctly while sort alone is not active', () => {
        expect(hasActiveCatalogFilters({})).toBe(false)
        expect(hasActiveCatalogFilters({ sort: 'price' })).toBe(false)
        expect(hasActiveCatalogFilters({ sort: 'next-departure' })).toBe(false)

        expect(hasActiveCatalogFilters({ market: 'korea' })).toBe(true)
        expect(hasActiveCatalogFilters({ departureMonth: '2026-06' })).toBe(true)
        expect(hasActiveCatalogFilters({ season: 'summer' })).toBe(true)
        expect(hasActiveCatalogFilters({ durationMin: 4 })).toBe(true)
        expect(hasActiveCatalogFilters({ durationMax: 8 })).toBe(true)
        expect(hasActiveCatalogFilters({ priceMin: 5000000 })).toBe(true)
        expect(hasActiveCatalogFilters({ priceMax: 20000000 })).toBe(true)
        expect(hasActiveCatalogFilters({ sort: 'price', market: 'japan' })).toBe(true)
      })
    })

    describe('departure window filtering and card building', () => {
      const fixedNow = new Date('2026-05-01T00:00:00.000Z')

      it('filters cards by month only and selects nearest departure and lowest price inside window', async () => {
        const tour = product({ id: 201, slug: 'tour-month', title: 'Tour Month', wrapperPage: 2010 })
        const wrap = wrapper({ id: 2010, pathname: '/tour/tour-month' })
        const deps = [
          departure({
            id: 2011,
            tourProduct: 201,
            departureDate: '2026-06-10T00:00:00.000Z',
            priceFrom: 18000000,
            commerceVerified: true,
            availabilityStatus: 'open',
          }),
          departure({
            id: 2012,
            tourProduct: 201,
            departureDate: '2026-07-05T00:00:00.000Z',
            priceFrom: 12000000,
            commerceVerified: true,
            availabilityStatus: 'open',
          }),
          departure({
            id: 2013,
            tourProduct: 201,
            departureDate: '2026-07-20T00:00:00.000Z',
            priceFrom: 15000000,
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
          filters: { departureMonth: '2026-07' },
          limit: 6,
          now: fixedNow,
          offset: 0,
          page: { id: 99, pathname: '/tour', site: 7, wingsGoTourCatalog: { enabled: true } },
          payload: payload as never,
          site: { code: 'wings-go', id: 7 },
        })

        expect(result.filtersActive).toBe(true)
        const match = result.all.find((c) => c.id === 201)
        expect(match).toBeDefined()
        // Nearest in July is July 5
        expect(match?.nextDeparture.date).toBe('2026-07-05T00:00:00.000Z')
        // Lowest price in July is 12,000,000 (from July 5)
        expect(match?.price).toEqual({
          currency: 'VND',
          kind: 'verified',
          originalPrice: null,
          value: 12000000,
        })
      })

      it('filters cards by season only and supports winter across year boundary (Dec, Jan, Feb)', async () => {
        const tour = product({ id: 202, slug: 'tour-winter', title: 'Tour Winter', wrapperPage: 2020 })
        const wrap = wrapper({ id: 2020, pathname: '/tour/tour-winter' })
        const deps = [
          departure({
            id: 2021,
            tourProduct: 202,
            departureDate: '2026-10-15T00:00:00.000Z', // Autumn
            priceFrom: 8000000,
            commerceVerified: true,
            availabilityStatus: 'open',
          }),
          departure({
            id: 2022,
            tourProduct: 202,
            departureDate: '2026-12-25T00:00:00.000Z', // Winter (Dec)
            priceFrom: 16000000,
            commerceVerified: true,
            availabilityStatus: 'open',
          }),
          departure({
            id: 2023,
            tourProduct: 202,
            departureDate: '2027-01-15T00:00:00.000Z', // Winter (Jan)
            priceFrom: 14000000,
            commerceVerified: true,
            availabilityStatus: 'open',
          }),
          departure({
            id: 2024,
            tourProduct: 202,
            departureDate: '2027-02-10T00:00:00.000Z', // Winter (Feb)
            priceFrom: 13000000,
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
          filters: { season: 'winter' },
          limit: 6,
          now: fixedNow,
          offset: 0,
          page: { id: 99, pathname: '/tour', site: 7, wingsGoTourCatalog: { enabled: true } },
          payload: payload as never,
          site: { code: 'wings-go', id: 7 },
        })

        const match = result.all.find((c) => c.id === 202)
        expect(match).toBeDefined()
        // Nearest in winter is 2026-12-25
        expect(match?.nextDeparture.date).toBe('2026-12-25T00:00:00.000Z')
        // Lowest valid price in winter is 13,000,000 (from 2027-02-10)
        expect(match?.price).toEqual({
          currency: 'VND',
          kind: 'verified',
          originalPrice: null,
          value: 13000000,
        })
      })

      it('filters cards by month AND season intersection, dropping products with empty intersection', async () => {
        const tourMatch = product({ id: 203, slug: 'tour-match', title: 'Tour Match', wrapperPage: 2030 })
        const wrapMatch = wrapper({ id: 2030, pathname: '/tour/tour-match' })
        const depsMatch = [
          departure({
            id: 2031,
            tourProduct: 203,
            departureDate: '2026-07-10T00:00:00.000Z', // July is summer
            priceFrom: 10000000,
            commerceVerified: true,
            availabilityStatus: 'open',
          }),
        ]

        const tourMismatch = product({ id: 204, slug: 'tour-mismatch', title: 'Tour Mismatch', wrapperPage: 2040 })
        const wrapMismatch = wrapper({ id: 2040, pathname: '/tour/tour-mismatch' })
        const depsMismatch = [
          departure({
            id: 2041,
            tourProduct: 204,
            departureDate: '2026-07-15T00:00:00.000Z', // July is summer, NOT winter
            priceFrom: 9000000,
            commerceVerified: true,
            availabilityStatus: 'open',
          }),
        ]

        const payload = {
          find: vi.fn(async ({ collection }: { collection: string }) => {
            if (collection === 'pages') return { docs: [wrapMatch, wrapMismatch] }
            if (collection === 'tour-products') return { docs: [tourMatch, tourMismatch] }
            if (collection === 'tour-curations') return { docs: [] }
            return { docs: [...depsMatch, ...depsMismatch] }
          }),
        }

        // July (summer) + summer -> match
        const resultMatch = await queryWingsGoTourCatalog({
          filters: { departureMonth: '2026-07', season: 'summer' },
          limit: 6,
          now: fixedNow,
          offset: 0,
          page: { id: 99, pathname: '/tour', site: 7, wingsGoTourCatalog: { enabled: true } },
          payload: payload as never,
          site: { code: 'wings-go', id: 7 },
        })
        expect(resultMatch.all.map((c) => c.id)).toContain(203)

        // July (summer) + winter -> contradictory intersection, 0 matching departures
        const resultContradictory = await queryWingsGoTourCatalog({
          filters: { departureMonth: '2026-07', season: 'winter' },
          limit: 6,
          now: fixedNow,
          offset: 0,
          page: { id: 99, pathname: '/tour', site: 7, wingsGoTourCatalog: { enabled: true } },
          payload: payload as never,
          site: { code: 'wings-go', id: 7 },
        })
        expect(resultContradictory.all).toHaveLength(0)
      })

      it('drops a product from catalog cards when it has no departures matching the window', async () => {
        const tour = product({ id: 205, slug: 'tour-no-deps', title: 'Tour No Deps', wrapperPage: 2050 })
        const wrap = wrapper({ id: 2050, pathname: '/tour/tour-no-deps' })
        const deps = [
          departure({
            id: 2051,
            tourProduct: 205,
            departureDate: '2026-06-01T00:00:00.000Z', // June (summer)
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
          filters: { departureMonth: '2026-11' }, // November
          limit: 6,
          now: fixedNow,
          offset: 0,
          page: { id: 99, pathname: '/tour', site: 7, wingsGoTourCatalog: { enabled: true } },
          payload: payload as never,
          site: { code: 'wings-go', id: 7 },
        })

        expect(result.all).toHaveLength(0)
      })

      it('matches budget filters (priceMin/Max) against the windowed price', async () => {
        const tour = product({ id: 206, slug: 'tour-budget', title: 'Tour Budget', wrapperPage: 2060 })
        const wrap = wrapper({ id: 2060, pathname: '/tour/tour-budget' })
        const deps = [
          departure({
            id: 2061,
            tourProduct: 206,
            departureDate: '2026-05-10T00:00:00.000Z', // May departure: cheap 10M
            priceFrom: 10000000,
            commerceVerified: true,
            availabilityStatus: 'open',
          }),
          departure({
            id: 2062,
            tourProduct: 206,
            departureDate: '2026-07-10T00:00:00.000Z', // July departure: expensive 25M
            priceFrom: 25000000,
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

        // Filtering for July (window price is 25M), budget max is 20M -> excluded
        const resultExcluded = await queryWingsGoTourCatalog({
          filters: { departureMonth: '2026-07', priceMax: 20000000 },
          limit: 6,
          now: fixedNow,
          offset: 0,
          page: { id: 99, pathname: '/tour', site: 7, wingsGoTourCatalog: { enabled: true } },
          payload: payload as never,
          site: { code: 'wings-go', id: 7 },
        })
        expect(resultExcluded.all).toHaveLength(0)

        // Filtering for July with budget max 30M -> included
        const resultIncluded = await queryWingsGoTourCatalog({
          filters: { departureMonth: '2026-07', priceMax: 30000000 },
          limit: 6,
          now: fixedNow,
          offset: 0,
          page: { id: 99, pathname: '/tour', site: 7, wingsGoTourCatalog: { enabled: true } },
          payload: payload as never,
          site: { code: 'wings-go', id: 7 },
        })
        expect(resultIncluded.all.map((c) => c.id)).toEqual([206])
      })

      it('falls back to contact pricing when windowed departures are sold-out or expired', async () => {
        const tour = product({ id: 207, slug: 'tour-sold-out-in-window', title: 'Tour Sold Out Window', wrapperPage: 2070 })
        const wrap = wrapper({ id: 2070, pathname: '/tour/tour-sold-out-in-window' })
        const deps = [
          departure({
            id: 2071,
            tourProduct: 207,
            departureDate: '2026-05-10T00:00:00.000Z', // May: valid 15M
            priceFrom: 15000000,
            commerceVerified: true,
            availabilityStatus: 'open',
          }),
          departure({
            id: 2072,
            tourProduct: 207,
            departureDate: '2026-06-15T00:00:00.000Z', // June: sold-out
            priceFrom: 10000000,
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
          filters: { departureMonth: '2026-06' },
          limit: 6,
          now: fixedNow,
          offset: 0,
          page: { id: 99, pathname: '/tour', site: 7, wingsGoTourCatalog: { enabled: true } },
          payload: payload as never,
          site: { code: 'wings-go', id: 7 },
        })

        const card = result.all.find((c) => c.id === 207)
        expect(card).toBeDefined()
        expect(card?.nextDeparture.date).toBe('2026-06-15T00:00:00.000Z')
        expect(card?.price).toEqual({
          kind: 'contact',
          label: 'Liên hệ để nhận giá mới nhất',
        })
      })
    })

    describe('one snapshot per request invariants', () => {
      it('calculates daysUntilDeparture using the same request now across the boundary', async () => {
        const tour = product({ id: 301, slug: 'tour-boundary', title: 'Tour Boundary', wrapperPage: 3010 })
        const wrap = wrapper({ id: 3010, pathname: '/tour/tour-boundary' })
        const deps = [
          departure({
            id: 3011,
            tourProduct: 301,
            departureDate: '2026-06-15T00:00:00.000Z',
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

        // Just before VN midnight: 2026-06-10T16:59:59Z is 23:59:59 in VN (2026-06-10) -> 5 days to June 15
        const resultBefore = await queryWingsGoTourCatalog({
          limit: 6,
          now: new Date('2026-06-10T16:59:59.000Z'),
          offset: 0,
          page: { id: 99, pathname: '/tour', site: 7, wingsGoTourCatalog: { enabled: true } },
          payload: payload as never,
          site: { code: 'wings-go', id: 7 },
        })
        const cardBefore = [...resultBefore.featured, ...resultBefore.all][0]
        expect(cardBefore?.nextDeparture.daysUntilDeparture).toBe(5)

        // At VN midnight: 2026-06-10T17:00:00Z is 00:00:00 in VN (2026-06-11) -> 4 days to June 15
        const resultAfter = await queryWingsGoTourCatalog({
          limit: 6,
          now: new Date('2026-06-10T17:00:00.000Z'),
          offset: 0,
          page: { id: 99, pathname: '/tour', site: 7, wingsGoTourCatalog: { enabled: true } },
          payload: payload as never,
          site: { code: 'wings-go', id: 7 },
        })
        const cardAfter = [...resultAfter.featured, ...resultAfter.all][0]
        expect(cardAfter?.nextDeparture.daysUntilDeparture).toBe(4)
      })

      it('keeps featured unaffected by active filters, while all includes featured when filters are active', async () => {
        const tourKorea = product({
          id: 310,
          market: 'korea',
          slug: 'tour-korea',
          title: 'Tour Korea',
          wrapperPage: 3100,
        })
        const tourJapan = product({
          id: 320,
          market: 'japan',
          slug: 'tour-japan',
          title: 'Tour Japan',
          wrapperPage: 3200,
        })
        const wrappers = [
          wrapper({ id: 3100, pathname: '/tour/tour-korea' }),
          wrapper({ id: 3200, pathname: '/tour/tour-japan' }),
        ]
        const deps = [
          departure({
            id: 3101,
            tourProduct: 310,
            departureDate: '2026-08-01T00:00:00.000Z',
            commerceVerified: true,
            availabilityStatus: 'open',
          }),
          departure({
            id: 3201,
            tourProduct: 320,
            departureDate: '2026-08-05T00:00:00.000Z',
            commerceVerified: true,
            availabilityStatus: 'open',
          }),
        ]

        const payload = {
          find: vi.fn(async ({ collection }: { collection: string }) => {
            if (collection === 'pages') return { docs: wrappers }
            if (collection === 'tour-products') return { docs: [tourKorea, tourJapan] }
            if (collection === 'tour-curations') return { docs: [] }
            return { docs: deps }
          }),
        }

        // Curation designates Tour Korea (310) as featured
        const page = {
          id: 99,
          pathname: '/tour',
          site: 7,
          wingsGoTourCatalog: { enabled: true, featuredTours: [310] },
        }

        // Case A: No filters active -> featured has [310, 320] (310 curated, 320 fallback), all excludes featured
        const resNoFilters = await queryWingsGoTourCatalog({
          filters: {},
          limit: 6,
          now: new Date('2026-05-01T00:00:00.000Z'),
          offset: 0,
          page,
          payload: payload as never,
          site: { code: 'wings-go', id: 7 },
        })
        expect(resNoFilters.filtersActive).toBe(false)
        expect(resNoFilters.featured.map((c) => c.id)).toEqual([310, 320])
        expect(resNoFilters.all).toEqual([])

        // Case B: Filter market=korea -> featured is STILL computed from unfiltered (remains [310, 320]),
        // and all includes 310 (does NOT exclude featured)
        const resFiltered = await queryWingsGoTourCatalog({
          filters: { market: 'korea' },
          limit: 6,
          now: new Date('2026-05-01T00:00:00.000Z'),
          offset: 0,
          page,
          payload: payload as never,
          site: { code: 'wings-go', id: 7 },
        })
        expect(resFiltered.filtersActive).toBe(true)
        expect(resFiltered.featured.map((c) => c.id)).toEqual([310, 320])
        expect(resFiltered.all.map((c) => c.id)).toEqual([310])
      })

      it('produces markets summaries with count, lowestPrice, and deterministic image selection', async () => {
        const tourKorea1 = product({
          heroMedia: { alt: 'seoul image', site: 7, url: '/media/seoul.jpg' },
          id: 331,
          market: 'korea',
          slug: 'seoul',
          wrapperPage: 3310,
        })
        const tourKorea2 = product({
          heroMedia: { alt: 'busan image', site: 7, url: '/media/busan.jpg' },
          id: 332,
          market: 'korea',
          slug: 'busan',
          wrapperPage: 3320,
        })
        const tourJapan = product({
          heroMedia: null, // no image
          id: 333,
          market: 'japan',
          slug: 'tokyo',
          wrapperPage: 3330,
        })

        const wrappers = [
          wrapper({ id: 3310, pathname: '/tour/seoul' }),
          wrapper({ id: 3320, pathname: '/tour/busan' }),
          wrapper({ id: 3330, pathname: '/tour/tokyo' }),
        ]
        const deps = [
          departure({
            id: 3311,
            tourProduct: 331,
            departureDate: '2026-08-01T00:00:00.000Z',
            priceFrom: 15000000,
            commerceVerified: true,
            availabilityStatus: 'open',
          }),
          departure({
            id: 3321,
            tourProduct: 332,
            departureDate: '2026-08-05T00:00:00.000Z',
            priceFrom: 12000000, // lowest for korea
            commerceVerified: true,
            availabilityStatus: 'open',
          }),
          departure({
            id: 3331,
            tourProduct: 333,
            departureDate: '2026-08-10T00:00:00.000Z',
            priceFrom: 20000000,
            commerceVerified: true,
            availabilityStatus: 'open',
          }),
        ]

        const payload = {
          find: vi.fn(async ({ collection }: { collection: string }) => {
            if (collection === 'pages') return { docs: wrappers }
            if (collection === 'tour-products') return { docs: [tourKorea1, tourKorea2, tourJapan] }
            if (collection === 'tour-curations') return { docs: [] }
            return { docs: deps }
          }),
        }

        const now = new Date('2026-05-01T00:00:00.000Z')
        const result = await queryWingsGoTourCatalog({
          limit: 6,
          now,
          offset: 0,
          page: { id: 99, pathname: '/tour', site: 7, wingsGoTourCatalog: { enabled: true } },
          payload: payload as never,
          site: { code: 'wings-go', id: 7 },
        })

        // Sorted by count desc, then market asc: korea (count: 2), then japan (count: 1)
        expect(result.markets.map((m) => m.market)).toEqual(['korea', 'japan'])
        expect(result.markets[0]?.count).toBe(2)
        expect(result.markets[0]?.lowestPrice?.value).toBe(12000000)
        expect(result.markets[0]?.image).not.toBeNull()

        expect(result.markets[1]?.count).toBe(1)
        expect(result.markets[1]?.lowestPrice?.value).toBe(20000000)
        expect(result.markets[1]?.image).toBeNull() // japan has no image

        // Deterministic image test: repeated calls with same now yield exact same image pick
        const result2 = await queryWingsGoTourCatalog({
          limit: 6,
          now,
          offset: 0,
          page: { id: 99, pathname: '/tour', site: 7, wingsGoTourCatalog: { enabled: true } },
          payload: payload as never,
          site: { code: 'wings-go', id: 7 },
        })
        expect(result2.markets[0]?.image).toEqual(result.markets[0]?.image)
      })

      it('derives upcoming as up to 6 unfiltered cards excluding featured, sorted by next-departure (D10)', async () => {
        // 14 products: 6 become featured (401..406), 8 remain (407..414)
        const products = Array.from({ length: 14 }, (_, i) =>
          product({ id: 401 + i, slug: `tour-${i}`, title: `Tour ${i}`, wrapperPage: 4010 + i }),
        )
        const wrappers = products.map((p) => wrapper({ id: p.wrapperPage, pathname: `/tour/${p.slug}` }))
        // Departures: Tour 13 has earliest date, Tour 0 has latest date
        const deps = products.map((p, i) =>
          departure({
            availabilityStatus: 'open',
            commerceVerified: true,
            departureDate: new Date(Date.UTC(2026, 14 - i, 1)).toISOString(),
            id: 501 + i,
            tourProduct: p.id,
          }),
        )

        const payload = {
          find: vi.fn(async ({ collection }: { collection: string }) => {
            if (collection === 'pages') return { docs: wrappers }
            if (collection === 'tour-products') return { docs: products }
            if (collection === 'tour-curations') return { docs: [] }
            return { docs: deps }
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

        // Featured has the 6 earliest departures: 414, 413, 412, 411, 410, 409
        expect(result.featured).toHaveLength(6)
        expect(result.featured.map((c) => c.id)).toEqual([414, 413, 412, 411, 410, 409])
        const featuredIds = new Set(result.featured.map((c) => c.id))

        // Upcoming has cap 6, and none of them are in featured (D10)
        expect(result.upcoming).toHaveLength(6)
        for (const card of result.upcoming) {
          expect(featuredIds.has(card.id)).toBe(false)
        }
        // Upcoming gets the next 6 earliest non-featured departures: 408, 407, 406, 405, 404, 403
        expect(result.upcoming.map((c) => c.id)).toEqual([408, 407, 406, 405, 404, 403])

        // When filters are active, upcoming is empty (D10)
        const filteredResult = await queryWingsGoTourCatalog({
          filters: { market: 'korea' },
          limit: 6,
          now: new Date('2026-01-01T00:00:00.000Z'),
          offset: 0,
          page: { id: 99, pathname: '/tour', site: 7, wingsGoTourCatalog: { enabled: true } },
          payload: payload as never,
          site: { code: 'wings-go', id: 7 },
        })
        expect(filteredResult.upcoming).toEqual([])
      })

      it('logs a console.warn without PII when any collection query hits WINGSGO_CATALOG_MAX_INVENTORY', async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
        const maxDocs = Array.from({ length: WINGSGO_CATALOG_MAX_INVENTORY }, (_, i) =>
          product({ id: 500 + i, wrapperPage: 5000 + i }),
        )
        const wrappers = maxDocs.map((p) => wrapper({ id: p.wrapperPage, pathname: `/tour/${p.slug}` }))
        const deps = maxDocs.map((p) => departure({ id: 6000 + p.id, tourProduct: p.id }))

        const payload = {
          find: vi.fn(async ({ collection }: { collection: string }) => {
            if (collection === 'pages') return { docs: wrappers }
            if (collection === 'tour-products') return { docs: maxDocs } // Exactly 200!
            if (collection === 'tour-curations') return { docs: [] }
            return { docs: deps }
          }),
        }

        await queryWingsGoTourCatalog({
          limit: 6,
          now: new Date('2026-01-01T00:00:00.000Z'),
          offset: 0,
          page: { id: 99, pathname: '/tour', site: 7, wingsGoTourCatalog: { enabled: true } },
          payload: payload as never,
          site: { code: 'wings-go', id: 7 },
        })

        expect(warnSpy).toHaveBeenCalled()
        const warnCall = warnSpy.mock.calls.find((call) =>
          String(call[0]).includes('tour-products'),
        )
        expect(warnCall).toBeDefined()
        expect(String(warnCall?.[0])).toContain('reached maximum cap (200)')
        expect(String(warnCall?.[0])).toContain('site 7')
        warnSpy.mockRestore()
      })

      it('ignores departures and products belonging to a different site', async () => {
        const tourSameSite = product({ id: 601, site: 7, slug: 'tour-same', wrapperPage: 6010 })
        const tourOtherSite = product({ id: 602, site: 8, slug: 'tour-other', wrapperPage: 6020 })
        const wrapSame = wrapper({ id: 6010, site: 7, pathname: '/tour/tour-same' })
        const wrapOther = wrapper({ id: 6020, site: 8, pathname: '/tour/tour-other' })

        const deps = [
          departure({
            id: 6011,
            site: 7,
            tourProduct: 601,
            departureDate: '2026-08-01T00:00:00.000Z',
            commerceVerified: true,
            availabilityStatus: 'open',
          }),
          departure({
            id: 6021,
            site: 8,
            tourProduct: 602,
            departureDate: '2026-08-01T00:00:00.000Z',
            commerceVerified: true,
            availabilityStatus: 'open',
          }),
        ]

        const payload = {
          find: vi.fn(async ({ collection }: { collection: string }) => {
            if (collection === 'pages') return { docs: [wrapSame, wrapOther] }
            if (collection === 'tour-products') return { docs: [tourSameSite, tourOtherSite] }
            if (collection === 'tour-curations') return { docs: [] }
            return { docs: deps }
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

        const allReturnedCards = [...result.featured, ...result.all]
        expect(allReturnedCards.map((c) => c.id)).toEqual([601])
        expect(allReturnedCards.some((c) => c.id === 602)).toBe(false)
      })
    })

    describe('homepage regression test (getWingsGoFeaturedTours)', () => {
      it('returns expected featured cards for homepage HighImpact consumption', async () => {
        const products = [
          product({ id: 701, slug: 'featured-1', title: 'Featured 1', wrapperPage: 7010 }),
          product({ id: 702, slug: 'featured-2', title: 'Featured 2', wrapperPage: 7020 }),
        ]
        const wrappers = products.map((p) => wrapper({ id: p.wrapperPage, pathname: `/tour/${p.slug}` }))
        const deps = products.map((p, i) =>
          departure({
            id: 7001 + i,
            tourProduct: p.id,
            departureDate: '2026-12-01T00:00:00.000Z',
            priceFrom: 15000000 + i * 1000000,
            commerceVerified: true,
            availabilityStatus: 'open',
          }),
        )

        const payload = {
          find: vi.fn(
            async ({
              collection,
              where,
            }: {
              collection: string
              where?: { and?: Array<{ pathname?: { equals?: string } }> }
            }) => {
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
                        _status: 'published',
                        wingsGoTourCatalog: { enabled: true, featuredTours: [701, 702] },
                      },
                    ],
                  }
                }
                return { docs: wrappers }
              }
              if (collection === 'tour-products') return { docs: products }
              if (collection === 'tour-curations') return { docs: [] }
              return { docs: deps }
            },
          ),
        }

        const featured = await getWingsGoFeaturedTours({
          limit: 6,
          locale: 'vi',
          payload: payload as never,
          site: { code: 'wings-go', id: 7 } as never,
        })

        expect(featured).toHaveLength(2)
        expect(featured[0]?.id).toBe(701)
        expect(featured[0]?.title).toBe('Featured 1')
        expect(featured[0]?.price.kind).toBe('verified')
        expect(featured[1]?.id).toBe(702)
        expect(featured[1]?.title).toBe('Featured 2')
      })

      it('calls curation resolution only once per call to getWingsGoFeaturedTours', async () => {
        let curationQueryCount = 0
        const products = [
          product({ id: 801, slug: 'featured-801', title: 'Featured 801', wrapperPage: 8010 }),
          product({ id: 802, slug: 'featured-802', title: 'Featured 802', wrapperPage: 8020 }),
        ]
        const wrappers = products.map((p) =>
          wrapper({ id: p.wrapperPage, pathname: `/tour/${p.slug}` }),
        )
        const deps = products.map((p, i) =>
          departure({
            id: 8001 + i,
            tourProduct: p.id,
            departureDate: '2026-12-01T00:00:00.000Z',
            priceFrom: 12000000,
            commerceVerified: true,
            availabilityStatus: 'open',
          }),
        )

        const payload = {
          find: vi.fn(
            async ({
              collection,
              where,
            }: {
              collection: string
              where?: { and?: Array<{ pathname?: { equals?: string } }> }
            }) => {
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
                        _status: 'published',
                        wingsGoTourCatalog: { curationSlot: 'homepage-slot', enabled: true },
                      },
                    ],
                  }
                }
                return { docs: wrappers }
              }
              if (collection === 'tour-curations') {
                curationQueryCount++
                return {
                  docs: [
                    {
                      id: 88,
                      _status: 'published',
                      featuredTours: [801, 802],
                      site: 7,
                      slot: 'homepage-slot',
                    },
                  ],
                }
              }
              if (collection === 'tour-products') return { docs: products }
              return { docs: deps }
            },
          ),
        }

        const featured = await getWingsGoFeaturedTours({
          limit: 4,
          locale: 'vi',
          payload: payload as never,
          site: { code: 'wings-go', id: 7 } as never,
        })

        expect(featured).toHaveLength(2)
        expect(curationQueryCount).toBe(1)
      })
    })

    describe('Phase 1b & 1c: Context-bound Keyset cursor and Codex gate fixes', () => {
      it('builds canonical cursor context hash based on siteID, locale, sort, and sorted filters', () => {
        const ctx1 = buildCatalogCursorContext({
          filters: { departureMonth: '2026-11', market: 'korea', sort: 'price' },
          locale: 'vi',
          siteID: 7,
        })
        const ctx2 = buildCatalogCursorContext({
          filters: { market: 'korea', departureMonth: '2026-11', sort: 'price' },
          locale: 'vi',
          siteID: 7,
        })
        // Filter key order does not alter the hash
        expect(ctx1).toBe(ctx2)
        expect(typeof ctx1).toBe('string')
        expect(ctx1.length).toBeLessThanOrEqual(16)

        // Different locale => different ctx
        const ctxEn = buildCatalogCursorContext({
          filters: { departureMonth: '2026-11', market: 'korea', sort: 'price' },
          locale: 'en',
          siteID: 7,
        })
        expect(ctxEn).not.toBe(ctx1)

        // Different site => different ctx
        const ctxSite8 = buildCatalogCursorContext({
          filters: { departureMonth: '2026-11', market: 'korea', sort: 'price' },
          locale: 'vi',
          siteID: 8,
        })
        expect(ctxSite8).not.toBe(ctx1)

        // Different sort => different ctx
        const ctxSortDate = buildCatalogCursorContext({
          filters: { departureMonth: '2026-11', market: 'korea', sort: 'next-departure' },
          locale: 'vi',
          siteID: 7,
        })
        expect(ctxSortDate).not.toBe(ctx1)

        // Different market filter => different ctx
        const ctxMarketJapan = buildCatalogCursorContext({
          filters: { departureMonth: '2026-11', market: 'japan', sort: 'price' },
          locale: 'vi',
          siteID: 7,
        })
        expect(ctxMarketJapan).not.toBe(ctx1)
      })

      it('encodes and decodes v2 catalog cursors with ctx and featured exclude array x', () => {
        const verifiedCard = {
          ...card(10, '2026-11-15T00:00:00.000Z', 'Seoul Delight'),
          price: { currency: 'VND', kind: 'verified' as const, originalPrice: null, value: 15900000 },
        }

        const encodedVerified = encodeCatalogCursor(verifiedCard, {
          ctx: 'ctx_abc123',
          featuredIDs: [1, 2],
          filtersActive: false,
          sort: 'price',
        })
        const decodedVerified = decodeCatalogCursor(encodedVerified)

        expect(decodedVerified).toEqual({
          ctx: 'ctx_abc123',
          date: '2026-11-15T00:00:00.000Z',
          id: 10,
          price: 15900000,
          sort: 'price',
          title: 'Seoul Delight',
          v: 2,
          x: ['1', '2'],
        })

        const contactCard = card(11, '2026-12-01T00:00:00.000Z', 'Jeju Island')
        const encodedContact = encodeCatalogCursor(contactCard, {
          ctx: 'ctx_def456',
          featuredIDs: [1, 2],
          filtersActive: true, // Filters active => x is empty
          sort: 'next-departure',
        })
        const decodedContact = decodeCatalogCursor(encodedContact)

        expect(decodedContact).toEqual({
          ctx: 'ctx_def456',
          date: '2026-12-01T00:00:00.000Z',
          id: 11,
          price: null,
          sort: 'next-departure',
          title: 'Jeju Island',
          v: 2,
          x: [],
        })
      })

      it('safely rejects tampered, oversized, v1, invalid version, or malformed cursors without throwing', () => {
        expect(decodeCatalogCursor(null)).toBeNull()
        expect(decodeCatalogCursor(undefined)).toBeNull()
        expect(decodeCatalogCursor('')).toBeNull()
        expect(decodeCatalogCursor(12345)).toBeNull()
        expect(decodeCatalogCursor('a'.repeat(1025))).toBeNull()
        expect(decodeCatalogCursor('tampered!characters==')).toBeNull()

        // v: 1 cursors MUST return null in Phase 1c
        const v1Cursor = Buffer.from(
          JSON.stringify({
            date: '2026-01-01',
            id: 1,
            price: null,
            sort: 'next-departure',
            title: 'T',
            v: 1,
          }),
        ).toString('base64url')
        expect(decodeCatalogCursor(v1Cursor)).toBeNull()

        // v: 3 cursor
        const v3Cursor = Buffer.from(
          JSON.stringify({
            ctx: 'ctx1',
            date: '2026-01-01',
            id: 1,
            price: null,
            sort: 'next-departure',
            title: 'T',
            v: 3,
            x: [],
          }),
        ).toString('base64url')
        expect(decodeCatalogCursor(v3Cursor)).toBeNull()

        // ctx too long (> 16 chars)
        const longCtx = Buffer.from(
          JSON.stringify({
            ctx: 'a'.repeat(17),
            date: '2026-01-01',
            id: 1,
            price: null,
            sort: 'next-departure',
            title: 'T',
            v: 2,
            x: [],
          }),
        ).toString('base64url')
        expect(decodeCatalogCursor(longCtx)).toBeNull()

        // x with invalid id format or > 6 items
        const invalidX = Buffer.from(
          JSON.stringify({
            ctx: 'ctx1',
            date: '2026-01-01',
            id: 1,
            price: null,
            sort: 'next-departure',
            title: 'T',
            v: 2,
            x: ['1', '2', '3', '4', '5', '6', '7'],
          }),
        ).toString('base64url')
        expect(decodeCatalogCursor(invalidX)).toBeNull()

        // Malformed JSON inside valid base64url
        const brokenJson = Buffer.from('{ bad json ').toString('base64url')
        expect(decodeCatalogCursor(brokenJson)).toBeNull()
      })

      it('ignores cursor and resets to start when cursor sort differs from request sort', () => {
        const cards = [
          card(1, '2026-03-01T00:00:00.000Z', 'A'),
          card(2, '2026-04-01T00:00:00.000Z', 'B'),
          card(3, '2026-05-01T00:00:00.000Z', 'C'),
        ]
        const cursorStub = {
          ctx: 'ctx1',
          date: '2026-04-01T00:00:00.000Z',
          id: 2,
          price: null,
          sort: 'price' as const, // Different from filter sort 'next-departure'
          title: 'B',
          v: 2 as const,
          x: [],
        }

        const result = selectWingsGoCatalogCards({
          after: cursorStub,
          cards,
          filters: { sort: 'next-departure' },
          limit: 2,
        })

        // Resets to beginning: returns card 1 and card 2
        expect(result.cards.map((c) => c.id)).toEqual([1, 2])
      })

      it('demonstrates cursor stability vs offset skip on inventory mutation (remove card on page 1)', () => {
        const originalCards = [
          card(1, '2026-01-01T00:00:00.000Z'),
          card(2, '2026-02-01T00:00:00.000Z'),
          card(3, '2026-03-01T00:00:00.000Z'),
          card(4, '2026-04-01T00:00:00.000Z'),
          card(5, '2026-05-01T00:00:00.000Z'),
          card(6, '2026-06-01T00:00:00.000Z'),
          card(7, '2026-07-01T00:00:00.000Z'),
          card(8, '2026-08-01T00:00:00.000Z'),
          card(9, '2026-09-01T00:00:00.000Z'),
          card(10, '2026-10-01T00:00:00.000Z'),
        ]

        // First page (limit 6)
        const page1 = selectWingsGoCatalogCards({ cards: originalCards, limit: 6, offset: 0 })
        expect(page1.cards.map((c) => c.id)).toEqual([1, 2, 3, 4, 5, 6])
        const page1LastCard = page1.cards[page1.cards.length - 1]!
        const cursor = decodeCatalogCursor(
          encodeCatalogCursor(page1LastCard, {
            ctx: 'ctx1',
            featuredIDs: [],
            filtersActive: false,
            sort: 'next-departure',
          }),
        )

        // Mutation between requests: Card 2 is removed from inventory
        const mutatedCards = originalCards.filter((c) => c.id !== 2)

        // Old offset approach (offset 6): Card 7 is SKIPPED because list shifted
        const offsetPage2 = selectWingsGoCatalogCards({ cards: mutatedCards, limit: 6, offset: 6 })
        expect(offsetPage2.cards.map((c) => c.id)).toEqual([8, 9, 10])
        expect(offsetPage2.cards.some((c) => c.id === 7)).toBe(false) // Regression proven!

        // New keyset cursor approach: Card 7 is preserved and returned in order
        const cursorPage2 = selectWingsGoCatalogCards({
          after: cursor,
          cards: mutatedCards,
          limit: 6,
        })
        expect(cursorPage2.cards.map((c) => c.id)).toEqual([7, 8, 9, 10])
      })

      it('demonstrates cursor stability vs offset skip when curation changes between requests', () => {
        const allCards = [
          card(1, '2026-01-01T00:00:00.000Z'),
          card(2, '2026-02-01T00:00:00.000Z'),
          card(3, '2026-03-01T00:00:00.000Z'),
          card(4, '2026-04-01T00:00:00.000Z'),
          card(5, '2026-05-01T00:00:00.000Z'),
          card(6, '2026-06-01T00:00:00.000Z'),
          card(7, '2026-07-01T00:00:00.000Z'),
          card(8, '2026-08-01T00:00:00.000Z'),
        ]

        // Page 1 excluded featured card 1
        const page1 = selectWingsGoCatalogCards({
          cards: allCards,
          excludeIDs: [1],
          limit: 4,
          offset: 0,
        })
        expect(page1.cards.map((c) => c.id)).toEqual([2, 3, 4, 5])
        const cursor = decodeCatalogCursor(
          encodeCatalogCursor(page1.cards[page1.cards.length - 1]!, {
            ctx: 'ctx1',
            featuredIDs: [1],
            filtersActive: false,
            sort: 'next-departure',
          }),
        )

        // Curation changes: card 1 is no longer featured.
        // With old offset + recomputed excludeIDs (excludeIDs is now []):
        // allCards[offset 4] returns card 5 (duplicate of page 1), and cards shift
        const offsetPage2 = selectWingsGoCatalogCards({
          cards: allCards,
          excludeIDs: [], // recomputed
          limit: 4,
          offset: 4,
        })
        expect(offsetPage2.cards.map((c) => c.id)).toEqual([5, 6, 7, 8]) // Card 5 duplicate!

        // With keyset cursor + cursor-embedded exclude IDs (cursor.x):
        const cursorPage2 = selectWingsGoCatalogCards({
          after: cursor,
          cards: allCards,
          excludeIDs: cursor!.x,
          limit: 4,
        })
        expect(cursorPage2.cards.map((c) => c.id)).toEqual([6, 7, 8]) // Clean continuation, no duplicate, no skip!
      })

      it('demonstrates cursor stability when a departure on a page-1 card expires between requests', () => {
        const originalCards = [
          card(1, '2026-01-01T00:00:00.000Z'),
          card(2, '2026-02-01T00:00:00.000Z'),
          card(3, '2026-03-01T00:00:00.000Z'),
          card(4, '2026-04-01T00:00:00.000Z'),
          card(5, '2026-05-01T00:00:00.000Z'),
          card(6, '2026-06-01T00:00:00.000Z'),
          card(7, '2026-07-01T00:00:00.000Z'),
          card(8, '2026-08-01T00:00:00.000Z'),
        ]

        const page1 = selectWingsGoCatalogCards({ cards: originalCards, limit: 6, offset: 0 })
        const cursor = decodeCatalogCursor(
          encodeCatalogCursor(page1.cards[page1.cards.length - 1]!, {
            ctx: 'ctx1',
            featuredIDs: [],
            filtersActive: false,
            sort: 'next-departure',
          }),
        )

        // Card 3 departure expired, leaving 7 cards total
        const expiredCards = originalCards.filter((c) => c.id !== 3)

        // Offset 6 skips card 7
        const offsetPage2 = selectWingsGoCatalogCards({ cards: expiredCards, limit: 6, offset: 6 })
        expect(offsetPage2.cards.map((c) => c.id)).toEqual([8])

        // Keyset cursor returns card 7 and 8
        const cursorPage2 = selectWingsGoCatalogCards({ after: cursor, cards: expiredCards, limit: 6 })
        expect(cursorPage2.cards.map((c) => c.id)).toEqual([7, 8])
      })

      it('P2.1: selects deterministic market image regardless of input card ordering', async () => {
        const createProductWithImage = (id: number, imgUrl: string) =>
          product({
            id,
            slug: `p-${id}`,
            title: `Product ${id}`,
            wrapperPage: id * 10,
            heroMedia: { site: 7, url: imgUrl },
          })

        const p1 = createProductWithImage(1, '/media/img1.jpg')
        const p2 = createProductWithImage(2, '/media/img2.jpg')
        const p3 = createProductWithImage(3, '/media/img3.jpg')

        const createPayload = (productList: typeof p1[]) => ({
          find: vi.fn(async ({ collection }: { collection: string }) => {
            if (collection === 'pages') {
              return {
                docs: [
                  {
                    id: 99,
                    pathname: '/tour',
                    site: 7,
                    _status: 'published',
                    wingsGoTourCatalog: { enabled: true },
                  },
                  ...productList.map((p) => wrapper({ id: p.wrapperPage, pathname: `/tour/${p.slug}` })),
                ],
              }
            }
            if (collection === 'tour-products') return { docs: productList }
            if (collection === 'tour-curations') return { docs: [] }
            return {
              docs: productList.map((p) =>
                departure({
                  id: 100 + p.id,
                  tourProduct: p.id,
                  departureDate: `2026-12-0${p.id}T00:00:00.000Z`,
                  commerceVerified: true,
                  availabilityStatus: 'open',
                }),
              ),
            }
          }),
        })

        // Run query with order [p1, p2, p3]
        const resultA = await queryWingsGoTourCatalog({
          now: new Date('2026-06-01T00:00:00.000Z'),
          page: { id: 99, pathname: '/tour', site: 7, wingsGoTourCatalog: { enabled: true } },
          payload: createPayload([p1, p2, p3]) as never,
          site: { code: 'wings-go', id: 7 },
        })

        // Run query with order [p3, p1, p2]
        const resultB = await queryWingsGoTourCatalog({
          now: new Date('2026-06-01T00:00:00.000Z'),
          page: { id: 99, pathname: '/tour', site: 7, wingsGoTourCatalog: { enabled: true } },
          payload: createPayload([p3, p1, p2]) as never,
          site: { code: 'wings-go', id: 7 },
        })

        const koreaMarketA = resultA.markets.find((m) => m.market === 'korea')
        const koreaMarketB = resultB.markets.find((m) => m.market === 'korea')

        expect(koreaMarketA?.image?.url).toBeTruthy()
        expect(koreaMarketA?.image?.url).toEqual(koreaMarketB?.image?.url)
      })

      it('P2.3: returns empty catalog when enabled is false, even if pathname is /tour', async () => {
        const payload = {
          find: vi.fn(async () => ({ docs: [] })),
        }

        const result = await queryWingsGoTourCatalog({
          page: { id: 99, pathname: '/tour', site: 7, wingsGoTourCatalog: { enabled: false } },
          payload: payload as never,
          site: { code: 'wings-go', id: 7 },
        })

        expect(result).toEqual({
          all: [],
          featured: [],
          filtersActive: false,
          hasMore: false,
          hero: [],
          markets: [],
          nextCursor: null,
          nextOffset: 0,
          upcoming: [],
        })
        expect(payload.find).not.toHaveBeenCalled()
      })

      it('P2.3: getWingsGoFeaturedTours still returns cards when catalog page has enabled=false', async () => {
        const products = [
          product({ id: 901, slug: 'featured-901', title: 'Featured 901', wrapperPage: 9010 }),
        ]
        const wrappers = [wrapper({ id: 9010, pathname: '/tour/featured-901' })]
        const deps = [
          departure({
            id: 9001,
            tourProduct: 901,
            departureDate: '2026-12-01T00:00:00.000Z',
            commerceVerified: true,
            availabilityStatus: 'open',
          }),
        ]

        const payload = {
          find: vi.fn(
            async ({
              collection,
              where,
            }: {
              collection: string
              where?: { and?: Array<{ pathname?: { equals?: string } }> }
            }) => {
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
                        _status: 'published',
                        wingsGoTourCatalog: { enabled: false, featuredTours: [901] },
                      },
                    ],
                  }
                }
                return { docs: wrappers }
              }
              if (collection === 'tour-products') return { docs: products }
              if (collection === 'tour-curations') return { docs: [] }
              return { docs: deps }
            },
          ),
        }

        const featured = await getWingsGoFeaturedTours({
          limit: 4,
          locale: 'vi',
          payload: payload as never,
          site: { code: 'wings-go', id: 7 } as never,
        })

        expect(featured).toHaveLength(1)
        expect(featured[0]?.id).toBe(901)
      })
    })

    describe('Phase 4: Integration-style tests (curation tiers, no duplicates, tenant isolation)', () => {
      const createTenTours = () => {
        const products = Array.from({ length: 14 }, (_, i) =>
          product({
            id: 301 + i,
            market: i % 2 === 0 ? 'korea' : 'japan',
            site: 7,
            slug: `tour-${301 + i}`,
            title: `Tour ${301 + i}`,
            wrapperPage: 3010 + i,
          }),
        )
        const wrappers = products.map((p) =>
          wrapper({ id: p.wrapperPage, pathname: `/tour/${p.slug}`, site: 7 }),
        )
        const deps = products.map((p, i) =>
          departure({
            availabilityStatus: 'open',
            commerceVerified: true,
            currency: 'VND',
            departureDate: `2026-11-${String(i + 1).padStart(2, '0')}T00:00:00.000Z`,
            id: 3001 + i,
            priceFrom: 10000000 + i * 500000,
            site: 7,
            tourProduct: p.id,
          }),
        )
        return { deps, products, wrappers }
      }

      it('Tier 1: Page curation feeds Hero /tour with curated cards', async () => {
        const { deps, products, wrappers } = createTenTours()
        const page = {
          id: 10,
          pathname: '/tour',
          site: 7,
          wingsGoTourCatalog: {
            curation: 501,
            enabled: true,
          },
        }

        const payload = {
          find: vi.fn(async ({ collection }: { collection: string }) => {
            if (collection === 'pages') return { docs: wrappers }
            if (collection === 'tour-products') return { docs: products }
            if (collection === 'tour-departures') return { docs: deps }
            if (collection === 'tour-curations') return { docs: [] }
            return { docs: [] }
          }),
          findByID: vi.fn(async ({ collection, id }: { collection: string; id: number | string }) => {
            if (collection === 'tour-curations' && Number(id) === 501) {
              return {
                id: 501,
                featuredTours: [305, 303, 301, 307, 309, 311],
                site: 7,
              }
            }
            return null
          }),
        }

        const catalog = await queryWingsGoTourCatalog({
          filters: {},
          limit: 6,
          locale: 'vi',
          now: new Date('2026-10-01T00:00:00.000Z'),
          page: page as never,
          payload: payload as never,
          site: { code: 'wings-go', id: 7 } as never,
        })

        expect(catalog.hero.map((c) => c.id)).toEqual([305, 303, 301])
        expect(catalog.featured.map((c) => c.id)).toEqual([305, 303, 301, 307, 309, 311])
      })

      it('Tier 2: Site default curation feeds Hero /tour when page curation is absent', async () => {
        const { deps, products, wrappers } = createTenTours()
        const page = {
          id: 10,
          pathname: '/tour',
          site: 7,
          wingsGoTourCatalog: {
            enabled: true,
          },
        }

        const payload = {
          find: vi.fn(
            async ({
              collection,
              where,
            }: {
              collection: string
              where?: { and?: Array<Record<string, unknown>> }
            }) => {
              if (collection === 'pages') return { docs: wrappers }
              if (collection === 'tour-products') return { docs: products }
              if (collection === 'tour-departures') return { docs: deps }
              if (collection === 'tour-curations') {
                const isDefault = where?.and?.some(
                  (cond) =>
                    typeof cond.isDefault === 'object' &&
                    cond.isDefault !== null &&
                    'equals' in cond.isDefault &&
                    (cond.isDefault as { equals?: unknown }).equals === true,
                )
              if (isDefault) {
                return {
                  docs: [
                    {
                      id: 601,
                      featuredTours: [304, 302, 306, 308, 310, 312],
                      isDefault: true,
                      site: 7,
                    },
                  ],
                }
              }
              return { docs: [] }
            }
            return { docs: [] }
          }),
          findByID: vi.fn().mockResolvedValue(null),
        }

        const catalog = await queryWingsGoTourCatalog({
          filters: {},
          limit: 6,
          locale: 'vi',
          now: new Date('2026-10-01T00:00:00.000Z'),
          page: page as never,
          payload: payload as never,
          site: { code: 'wings-go', id: 7 } as never,
        })

        expect(catalog.hero.map((c) => c.id)).toEqual([304, 302, 306])
        expect(catalog.featured.map((c) => c.id)).toEqual([304, 302, 306, 308, 310, 312])
      })

      it('Tier 3: Legacy featuredTours array on page feeds Hero /tour when curations are absent', async () => {
        const { deps, products, wrappers } = createTenTours()
        const page = {
          id: 10,
          pathname: '/tour',
          site: 7,
          wingsGoTourCatalog: {
            enabled: true,
            featuredTours: [308, 309, 310, 311, 312, 313],
          },
        }

        const payload = {
          find: vi.fn(async ({ collection }: { collection: string }) => {
            if (collection === 'pages') return { docs: wrappers }
            if (collection === 'tour-products') return { docs: products }
            if (collection === 'tour-departures') return { docs: deps }
            if (collection === 'tour-curations') return { docs: [] }
            return { docs: [] }
          }),
          findByID: vi.fn().mockResolvedValue(null),
        }

        const catalog = await queryWingsGoTourCatalog({
          filters: {},
          limit: 6,
          locale: 'vi',
          now: new Date('2026-10-01T00:00:00.000Z'),
          page: page as never,
          payload: payload as never,
          site: { code: 'wings-go', id: 7 } as never,
        })

        expect(catalog.hero.map((c) => c.id)).toEqual([308, 309, 310])
        expect(catalog.featured.map((c) => c.id)).toEqual([308, 309, 310, 311, 312, 313])
      })

      it('Tier 4: Algorithmic fallback feeds Hero /tour when no curation or legacy featuredTours exist', async () => {
        const { deps, products, wrappers } = createTenTours()
        const page = {
          id: 10,
          pathname: '/tour',
          site: 7,
          wingsGoTourCatalog: {
            enabled: true,
          },
        }

        const payload = {
          find: vi.fn(async ({ collection }: { collection: string }) => {
            if (collection === 'pages') return { docs: wrappers }
            if (collection === 'tour-products') return { docs: products }
            if (collection === 'tour-departures') return { docs: deps }
            if (collection === 'tour-curations') return { docs: [] }
            return { docs: [] }
          }),
          findByID: vi.fn().mockResolvedValue(null),
        }

        const catalog = await queryWingsGoTourCatalog({
          filters: {},
          limit: 6,
          locale: 'vi',
          now: new Date('2026-10-01T00:00:00.000Z'),
          page: page as never,
          payload: payload as never,
          site: { code: 'wings-go', id: 7 } as never,
        })

        // Algorithmic selects top 6 by earliest departure: 301, 302, 303, 304, 305, 306
        expect(catalog.hero.map((c) => c.id)).toEqual([301, 302, 303])
        expect(catalog.featured.map((c) => c.id)).toEqual([301, 302, 303, 304, 305, 306])
      })

      it('guarantees one snapshot with no duplicates across hero, featured remaining, all (p1 + p2), and upcoming excludes featured', async () => {
        const { deps, products, wrappers } = createTenTours()
        const page = {
          id: 10,
          pathname: '/tour',
          site: 7,
          wingsGoTourCatalog: {
            enabled: true,
            featuredTours: [301, 302, 303, 304, 305, 306],
          },
        }

        const payload = {
          find: vi.fn(async ({ collection }: { collection: string }) => {
            if (collection === 'pages') return { docs: wrappers }
            if (collection === 'tour-products') return { docs: products }
            if (collection === 'tour-departures') return { docs: deps }
            if (collection === 'tour-curations') return { docs: [] }
            return { docs: [] }
          }),
          findByID: vi.fn().mockResolvedValue(null),
        }

        // Page 1
        const catalogP1 = await queryWingsGoTourCatalog({
          filters: {},
          limit: 6,
          locale: 'vi',
          now: new Date('2026-10-01T00:00:00.000Z'),
          page: page as never,
          payload: payload as never,
          site: { code: 'wings-go', id: 7 } as never,
        })

        // Page 2 via cursor
        const catalogP2 = await queryWingsGoTourCatalog({
          cursor: catalogP1.nextCursor ?? undefined,
          filters: {},
          limit: 6,
          locale: 'vi',
          now: new Date('2026-10-01T00:00:00.000Z'),
          page: page as never,
          payload: payload as never,
          site: { code: 'wings-go', id: 7 } as never,
        })

        const heroIds = catalogP1.hero.map((c) => c.id)
        const featuredRemainingIds = catalogP1.featured.slice(catalogP1.hero.length).map((c) => c.id)
        const allP1Ids = catalogP1.all.map((c) => c.id)
        const allP2Ids = catalogP2.all.map((c) => c.id)

        expect(heroIds).toEqual([301, 302, 303])
        expect(featuredRemainingIds).toEqual([304, 305, 306])
        expect(allP1Ids).toEqual([307, 308, 309, 310, 311, 312])
        expect(allP2Ids).toEqual([313, 314])

        // Verify mutual disjointness across hero, featured remaining, all P1, all P2
        const allSeen = [...heroIds, ...featuredRemainingIds, ...allP1Ids, ...allP2Ids]
        const uniqueSeen = new Set(allSeen)
        expect(uniqueSeen.size).toBe(allSeen.length)

        // D10: upcoming excludes all featured cards (hero #1-#3 + featured #4-#6)
        expect(catalogP1.upcoming).toHaveLength(6)
        const featuredIds = new Set(catalogP1.featured.map((c) => String(c.id)))
        for (const upcomingCard of catalogP1.upcoming) {
          expect(featuredIds.has(String(upcomingCard.id))).toBe(false)
        }
        // Upcoming should take the earliest available non-featured tours: 307..312
        expect(catalogP1.upcoming.map((c) => c.id)).toEqual([307, 308, 309, 310, 311, 312])

        // D10: upcoming is empty when filtersActive is true
        const filteredCatalog = await queryWingsGoTourCatalog({
          filters: { market: 'korea' },
          limit: 6,
          locale: 'vi',
          now: new Date('2026-10-01T00:00:00.000Z'),
          page: page as never,
          payload: payload as never,
          site: { code: 'wings-go', id: 7 } as never,
        })
        expect(filteredCatalog.filtersActive).toBe(true)
        expect(filteredCatalog.upcoming).toEqual([])
      })

      it('enforces strict tenant isolation for products, departures, markets, and upcoming', async () => {
        // Multi-tenant fixtures
        const site7Products = [
          product({ id: 101, market: 'korea', site: 7, slug: 'tour-101', wrapperPage: 1010 }),
          product({ id: 102, market: 'japan', site: 7, slug: 'tour-102', wrapperPage: 1020 }),
        ]
        const site8Products = [
          product({ id: 201, market: 'taiwan', site: 8, slug: 'side-201', wrapperPage: 2010 }),
        ]
        const site9Products = [
          product({ id: 301, market: 'china', site: 9, slug: 'group-301', wrapperPage: 3010 }),
        ]

        const allProducts = [...site7Products, ...site8Products, ...site9Products]
        const allWrappers = allProducts.map((p) =>
          wrapper({ id: p.wrapperPage, pathname: `/tour/${p.slug}`, site: p.site }),
        )
        const allDepartures = allProducts.map((p, i) =>
          departure({
            availabilityStatus: 'open',
            commerceVerified: true,
            currency: 'VND',
            departureDate: `2026-11-${String(i + 1).padStart(2, '0')}T00:00:00.000Z`,
            id: 5001 + i,
            priceFrom: 10000000,
            site: p.site,
            tourProduct: p.id,
          }),
        )

        const payload = {
          find: vi.fn(
            async ({
              collection,
              where,
            }: {
              collection: string
              where?: { and?: Array<Record<string, unknown>> }
            }) => {
              // Find site filter in where clause
              const siteFilter = where?.and?.find(
                (cond) =>
                  typeof cond.site === 'object' &&
                  cond.site !== null &&
                  'equals' in cond.site &&
                  (cond.site as { equals?: unknown }).equals !== undefined,
              )
              const requestedSite = (siteFilter?.site as { equals?: unknown } | undefined)?.equals

            if (collection === 'pages') {
              return { docs: allWrappers.filter((w) => w.site === requestedSite) }
            }
            if (collection === 'tour-products') {
              return { docs: allProducts.filter((p) => p.site === requestedSite) }
            }
            if (collection === 'tour-departures') {
              return { docs: allDepartures.filter((d) => d.site === requestedSite) }
            }
            if (collection === 'tour-curations') return { docs: [] }
            return { docs: [] }
          }),
          findByID: vi.fn().mockResolvedValue(null),
        }

        const page = {
          id: 10,
          pathname: '/tour',
          site: 7,
          wingsGoTourCatalog: { enabled: true },
        }

        const catalog = await queryWingsGoTourCatalog({
          filters: {},
          limit: 6,
          locale: 'vi',
          now: new Date('2026-10-01T00:00:00.000Z'),
          page: page as never,
          payload: payload as never,
          site: { code: 'wings-go', id: 7 } as never,
        })

        // All returned IDs must be from site 7 (101, 102), never site 8 (201) or site 9 (301)
        const site7Ids = new Set([101, 102])
        for (const card of catalog.all) {
          expect(site7Ids.has(Number(card.id))).toBe(true)
        }
        for (const card of catalog.hero) {
          expect(site7Ids.has(Number(card.id))).toBe(true)
        }
        for (const card of catalog.featured) {
          expect(site7Ids.has(Number(card.id))).toBe(true)
        }
        for (const card of catalog.upcoming) {
          expect(site7Ids.has(Number(card.id))).toBe(true)
        }

        // Markets only contain site 7 markets
        const marketCodes = catalog.markets.map((m) => m.market)
        expect(marketCodes).toContain('korea')
        expect(marketCodes).toContain('japan')
        expect(marketCodes).not.toContain('taiwan')
        expect(marketCodes).not.toContain('china')
      })
    })
  })
})
