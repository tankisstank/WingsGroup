import { describe, expect, it, vi } from 'vitest'

import {
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
})
