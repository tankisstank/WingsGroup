import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getCurrentLocale: vi.fn(),
  getCurrentSite: vi.fn(),
  getPayload: vi.fn(),
  queryWingsGoTourCatalog: vi.fn(),
}))
const { getCurrentLocale, getCurrentSite, getPayload, queryWingsGoTourCatalog } = mocks

vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('payload', () => ({ getPayload: mocks.getPayload }))
vi.mock('@/utilities/siteContext', () => ({
  getCurrentLocale: mocks.getCurrentLocale,
  getCurrentSite: mocks.getCurrentSite,
}))
vi.mock('@/tours/wingsGoCatalog', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/tours/wingsGoCatalog')>()
  return {
    ...actual,
    queryWingsGoTourCatalog: mocks.queryWingsGoTourCatalog,
  }
})

const actualCatalog = await vi.importActual<typeof import('@/tours/wingsGoCatalog')>(
  '@/tours/wingsGoCatalog',
)

import { decodeCatalogCursor, type WingsGoCatalogData } from '@/tours/wingsGoCatalog'
import { GET } from '@/app/(payload)/api/wingsgo/tour-catalog/route'

describe('WingsGo tour catalog endpoint', () => {
  beforeEach(() => {
    getPayload.mockReset()
    queryWingsGoTourCatalog.mockReset()
    getCurrentLocale.mockResolvedValue('vi')
    getCurrentSite.mockResolvedValue({ code: 'wings-go', id: 7 })
  })

  it('rejects pagination larger than one server batch with 400 and Cache-Control: no-store', async () => {
    const response = await GET(new Request('http://localhost/api/wingsgo/tour-catalog?limit=7'))

    expect(response.status).toBe(400)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.json()).toEqual({ error: 'Invalid catalog pagination.' })
    expect(getPayload).not.toHaveBeenCalled()
  })

  it('returns a safe empty DTO when the published wrapper page is not enabled with Cache-Control: no-store', async () => {
    getPayload.mockResolvedValue({
      find: vi.fn().mockResolvedValue({ docs: [] }),
    })

    const response = await GET(
      new Request('http://localhost/api/wingsgo/tour-catalog?limit=6&offset=6'),
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.json()).toEqual({
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
  })

  it('marks the non-WingsGo empty response as non-cacheable too', async () => {
    getCurrentSite.mockResolvedValue({ code: 'wing-side', id: 8 })
    getPayload.mockResolvedValue({ find: vi.fn() })

    const response = await GET(new Request('http://localhost/api/wingsgo/tour-catalog'))

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.json()).toEqual({
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
  })

  it('marks the WingsGroup empty response as non-cacheable with empty hero, upcoming, markets', async () => {
    getCurrentSite.mockResolvedValue({ code: 'wings-group', id: 9 })
    getPayload.mockResolvedValue({ find: vi.fn() })

    const response = await GET(new Request('http://localhost/api/wingsgo/tour-catalog'))

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.json()).toEqual({
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
  })

  it('returns 200 success with Cache-Control: no-store and forwards locale to the query', async () => {
    getCurrentLocale.mockResolvedValue('vi')
    const mockFind = vi.fn().mockResolvedValue({
      docs: [{ id: 10, pathname: '/tour', wingsGoTourCatalog: { enabled: true } }],
    })
    getPayload.mockResolvedValue({ find: mockFind })
    const successData = {
      all: [{ id: 1, title: 'Tour 1' }],
      featured: [],
      hasMore: false,
      hero: [],
      nextOffset: 1,
    }
    queryWingsGoTourCatalog.mockResolvedValue(successData)

    const response = await GET(new Request('http://localhost/api/wingsgo/tour-catalog?limit=6'))

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.json()).toEqual(successData)

    expect(mockFind).toHaveBeenCalledWith(
      expect.objectContaining({
        fallbackLocale: 'vi',
        locale: 'vi',
      }),
    )
    expect(queryWingsGoTourCatalog).toHaveBeenCalledWith(
      expect.objectContaining({
        locale: 'vi',
        limit: 6,
      }),
    )
  })

  it('forwards explicit ?locale=en param to page lookup and catalog query', async () => {
    getCurrentLocale.mockResolvedValue('vi') // Default site locale is vi, but query param requests en
    const mockFind = vi.fn().mockResolvedValue({
      docs: [{ id: 10, pathname: '/tour', wingsGoTourCatalog: { enabled: true } }],
    })
    getPayload.mockResolvedValue({ find: mockFind })
    queryWingsGoTourCatalog.mockResolvedValue({
      all: [],
      featured: [],
      hasMore: false,
      hero: [],
      nextOffset: 0,
    })

    const response = await GET(
      new Request('http://localhost/api/wingsgo/tour-catalog?limit=6&locale=en'),
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')

    expect(mockFind).toHaveBeenCalledWith(
      expect.objectContaining({
        fallbackLocale: false,
        locale: 'en',
      }),
    )
    expect(queryWingsGoTourCatalog).toHaveBeenCalledWith(
      expect.objectContaining({
        locale: 'en',
        limit: 6,
      }),
    )
  })

  it('forwards departureMonth and season query params and returns Phase 1 DTO fields with Cache-Control: no-store', async () => {
    getCurrentLocale.mockResolvedValue('vi')
    const mockFind = vi.fn().mockResolvedValue({
      docs: [{ id: 10, pathname: '/tour', wingsGoTourCatalog: { enabled: true } }],
    })
    getPayload.mockResolvedValue({ find: mockFind })
    const successData = {
      all: [{ id: 2, title: 'Tour 2' }],
      featured: [{ id: 1, title: 'Tour 1' }],
      filtersActive: true,
      hasMore: false,
      hero: [],
      markets: [{ count: 1, image: null, lowestPrice: null, market: 'korea' }],
      nextOffset: 1,
      upcoming: [{ id: 2, title: 'Tour 2' }],
    }
    queryWingsGoTourCatalog.mockResolvedValue(successData)

    // Use current year-month relative to now (e.g. 2026-11)
    const response = await GET(
      new Request(
        'http://localhost/api/wingsgo/tour-catalog?limit=6&market=korea&departureMonth=2026-11&season=autumn',
      ),
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.json()).toEqual(successData)

    expect(queryWingsGoTourCatalog).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: expect.objectContaining({
          market: 'korea',
          season: 'autumn',
        }),
        limit: 6,
        now: expect.any(Date),
      }),
    )
  })

  it('forwards cursor query param to queryWingsGoTourCatalog', async () => {
    getCurrentLocale.mockResolvedValue('vi')
    const mockFind = vi.fn().mockResolvedValue({
      docs: [{ id: 10, pathname: '/tour', wingsGoTourCatalog: { enabled: true } }],
    })
    getPayload.mockResolvedValue({ find: mockFind })
    const successData = {
      all: [{ id: 2, title: 'Tour 2' }],
      featured: [],
      filtersActive: false,
      hasMore: false,
      hero: [],
      markets: [],
      nextCursor: null,
      nextOffset: 1,
      upcoming: [],
    }
    queryWingsGoTourCatalog.mockResolvedValue(successData)

    const response = await GET(
      new Request('http://localhost/api/wingsgo/tour-catalog?limit=6&cursor=valid_cursor_token'),
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.json()).toEqual(successData)

    expect(queryWingsGoTourCatalog).toHaveBeenCalledWith(
      expect.objectContaining({
        cursor: 'valid_cursor_token',
        limit: 6,
      }),
    )
  })

  it('returns safe empty DTO when published page has truthy non-boolean enabled (e.g. "true" or 1)', async () => {
    getCurrentLocale.mockResolvedValue('vi')
    const mockFind = vi.fn().mockResolvedValue({
      docs: [{ id: 10, pathname: '/tour', wingsGoTourCatalog: { enabled: 'true' } }],
    })
    getPayload.mockResolvedValue({ find: mockFind })

    const response = await GET(new Request('http://localhost/api/wingsgo/tour-catalog?limit=6'))

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.json()).toEqual({
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
    expect(queryWingsGoTourCatalog).not.toHaveBeenCalled()
  })

  it('returns safe empty DTO when published page has wingsGoTourCatalog.enabled = false', async () => {
    getCurrentLocale.mockResolvedValue('vi')
    const mockFind = vi.fn().mockResolvedValue({
      docs: [{ id: 10, pathname: '/tour', wingsGoTourCatalog: { enabled: false } }],
    })
    getPayload.mockResolvedValue({ find: mockFind })

    const response = await GET(new Request('http://localhost/api/wingsgo/tour-catalog?limit=6'))

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.json()).toEqual({
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
    expect(queryWingsGoTourCatalog).not.toHaveBeenCalled()
  })

  it('returns 500 with Cache-Control: no-store when catalog query throws', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const mockFind = vi.fn().mockResolvedValue({
      docs: [{ id: 10, pathname: '/tour', wingsGoTourCatalog: { enabled: true } }],
    })
    getPayload.mockResolvedValue({ find: mockFind })
    queryWingsGoTourCatalog.mockRejectedValue(new Error('simulated query failure'))

    const response = await GET(new Request('http://localhost/api/wingsgo/tour-catalog?limit=6'))

    expect(response.status).toBe(500)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.json()).toEqual({ error: 'Unable to load the WingsGo catalog.' })
  })

  describe('Real-path API tests (unmocked queryWingsGoTourCatalog)', () => {
    let productsDocs: Array<Record<string, unknown>> = []
    let wrappersDocs: Array<Record<string, unknown>> = []
    let departuresDocs: Array<Record<string, unknown>> = []
    let pageDoc: {
      _status: string
      id: number
      pathname: string
      site: number
      wingsGoTourCatalog: { enabled: boolean; featuredTours: number[] }
    } | null = null

    const setupFixtures = () => {
      productsDocs = Array.from({ length: 14 }, (_, i) => ({
        _status: 'published',
        durationDays: 5,
        durationNights: 4,
        id: i + 1,
        market: 'korea',
        site: 7,
        slug: `tour-${i + 1}`,
        title: `Tour ${i + 1}`,
        wrapperPage: (i + 1) * 10,
      }))
      wrappersDocs = Array.from({ length: 14 }, (_, i) => ({
        _status: 'published',
        id: (i + 1) * 10,
        pathname: `/tour/tour-${i + 1}`,
        site: 7,
      }))
      departuresDocs = Array.from({ length: 14 }, (_, i) => ({
        _status: 'published',
        availabilityStatus: 'open',
        commerceVerified: true,
        currency: 'VND',
        departureDate: `2026-11-${String(i + 1).padStart(2, '0')}T00:00:00.000Z`,
        id: 1000 + i + 1,
        priceFrom: 10000000 + (i + 1) * 100000,
        site: 7,
        tourProduct: i + 1,
      }))
      pageDoc = {
        _status: 'published',
        id: 10,
        pathname: '/tour',
        site: 7,
        wingsGoTourCatalog: {
          enabled: true,
          featuredTours: [1, 2, 3, 4, 5, 6],
        },
      }

      const mockFind = vi.fn(
        async ({
          collection,
          where,
        }: {
          collection: string
          where?: { and?: Array<{ pathname?: { equals?: string; like?: string } }> }
        }) => {
          if (collection === 'pages') {
            const isCatalogRoot = where?.and?.some(
              (cond) => cond.pathname?.equals === '/tour',
            )
            if (isCatalogRoot) {
              return { docs: pageDoc ? [pageDoc] : [] }
            }
            return { docs: wrappersDocs }
          }
          if (collection === 'tour-products') {
            return { docs: productsDocs }
          }
          if (collection === 'tour-departures') {
            return { docs: departuresDocs }
          }
          if (collection === 'tour-curations') {
            return { docs: [] }
          }
          return { docs: [] }
        },
      )
      getPayload.mockResolvedValue({ find: mockFind })
    }

    beforeEach(() => {
      queryWingsGoTourCatalog.mockImplementation(actualCatalog.queryWingsGoTourCatalog)
      getCurrentLocale.mockResolvedValue('vi')
      getCurrentSite.mockResolvedValue({ code: 'wings-go', id: 7 })
      setupFixtures()
    })

    it('pages through real inventory via nextCursor without duplicates or featured cards in all', async () => {
      const res1 = await GET(new Request('http://localhost/api/wingsgo/tour-catalog?limit=4'))
      expect(res1.status).toBe(200)
      expect(res1.headers.get('cache-control')).toBe('no-store')
      const page1 = (await res1.json()) as WingsGoCatalogData

      expect(page1.featured.map((c) => c.id)).toEqual([1, 2, 3, 4, 5, 6])
      expect(page1.all.map((c) => c.id)).toEqual([7, 8, 9, 10])
      expect(page1.hasMore).toBe(true)
      expect(page1.nextCursor).toBeTruthy()

      const res2 = await GET(
        new Request(`http://localhost/api/wingsgo/tour-catalog?limit=4&cursor=${page1.nextCursor}`),
      )
      expect(res2.status).toBe(200)
      expect(res2.headers.get('cache-control')).toBe('no-store')
      const page2 = (await res2.json()) as WingsGoCatalogData

      expect(page2.all.map((c) => c.id)).toEqual([11, 12, 13, 14])
      expect(page2.hasMore).toBe(false)
      expect(page2.nextCursor).toBeNull()

      const unionIDs = [...page1.all, ...page2.all].map((c) => c.id)
      expect(unionIDs).toEqual([7, 8, 9, 10, 11, 12, 13, 14])
      expect(new Set(unionIDs).size).toBe(8)
      expect(unionIDs.includes(1)).toBe(false)
      expect(unionIDs.includes(6)).toBe(false)
    })

    it('handles inventory mutations between page 1 and page 2 without skipping cards', async () => {
      // Scenario A: Remove a card on page 1 (card 7)
      setupFixtures()
      const res1A = await GET(new Request('http://localhost/api/wingsgo/tour-catalog?limit=4'))
      const page1A = (await res1A.json()) as WingsGoCatalogData
      expect(page1A.all.map((c) => c.id)).toEqual([7, 8, 9, 10])

      productsDocs = productsDocs.filter((p) => p.id !== 7)
      departuresDocs = departuresDocs.filter((d) => d.tourProduct !== 7)

      const res2A = await GET(
        new Request(`http://localhost/api/wingsgo/tour-catalog?limit=4&cursor=${page1A.nextCursor}`),
      )
      const page2A = (await res2A.json()) as WingsGoCatalogData
      expect(page2A.all.map((c) => c.id)).toEqual([11, 12, 13, 14]) // Card 11 not skipped

      // Scenario B: Curation change moves card 1 out of featured
      setupFixtures()
      const res1B = await GET(new Request('http://localhost/api/wingsgo/tour-catalog?limit=4'))
      const page1B = (await res1B.json()) as WingsGoCatalogData
      expect(page1B.all.map((c) => c.id)).toEqual([7, 8, 9, 10])

      pageDoc!.wingsGoTourCatalog.featuredTours = [2, 3, 4, 5, 6] // Card 1 is no longer in featured

      const res2B = await GET(
        new Request(`http://localhost/api/wingsgo/tour-catalog?limit=4&cursor=${page1B.nextCursor}`),
      )
      const page2B = (await res2B.json()) as WingsGoCatalogData
      expect(page2B.all.map((c) => c.id)).toEqual([11, 12, 13, 14]) // Excluded via cursor.x, no duplicates or skips

      // Scenario C: Card 8 departure expires between requests
      setupFixtures()
      const res1C = await GET(new Request('http://localhost/api/wingsgo/tour-catalog?limit=4'))
      const page1C = (await res1C.json()) as WingsGoCatalogData
      expect(page1C.all.map((c) => c.id)).toEqual([7, 8, 9, 10])

      departuresDocs = departuresDocs.filter((d) => d.tourProduct !== 8)

      const res2C = await GET(
        new Request(`http://localhost/api/wingsgo/tour-catalog?limit=4&cursor=${page1C.nextCursor}`),
      )
      const page2C = (await res2C.json()) as WingsGoCatalogData
      expect(page2C.all.map((c) => c.id)).toEqual([11, 12, 13, 14]) // Remaining cards after cursor in order
    })

    it('keeps the page-1 featured IDs in later cursors when curation changes mid-pagination', async () => {
      const res1 = await GET(new Request('http://localhost/api/wingsgo/tour-catalog?limit=3'))
      const page1 = (await res1.json()) as WingsGoCatalogData
      expect(page1.all.map((c) => c.id)).toEqual([7, 8, 9])

      // Card 13 becomes featured after page 1 rendered; the visitor never saw it as featured.
      pageDoc!.wingsGoTourCatalog.featuredTours = [13, 1, 2, 3, 4, 5]

      const res2 = await GET(
        new Request(`http://localhost/api/wingsgo/tour-catalog?limit=3&cursor=${page1.nextCursor}`),
      )
      const page2 = (await res2.json()) as WingsGoCatalogData
      expect(page2.all.map((c) => c.id)).toEqual([10, 11, 12])

      const res3 = await GET(
        new Request(`http://localhost/api/wingsgo/tour-catalog?limit=3&cursor=${page2.nextCursor}`),
      )
      const page3 = (await res3.json()) as WingsGoCatalogData
      expect(page3.all.map((c) => c.id)).toEqual([13, 14])
    })

    it('resets to page 1 when cursor is reused with mismatched context (locale, filters, site)', async () => {
      const res1 = await GET(new Request('http://localhost/api/wingsgo/tour-catalog?limit=4'))
      const page1 = (await res1.json()) as WingsGoCatalogData
      const validCursor = page1.nextCursor!

      // Context mismatch: different locale (?locale=en)
      const resEn = await GET(
        new Request(`http://localhost/api/wingsgo/tour-catalog?limit=4&locale=en&cursor=${validCursor}`),
      )
      const pageEn = (await resEn.json()) as WingsGoCatalogData
      // Cursor was ignored, returns fresh page 1 starting from 7
      expect(pageEn.all.map((c) => c.id)).toEqual([7, 8, 9, 10])

      // Context mismatch: different filter (?market=china)
      const resFilter = await GET(
        new Request(`http://localhost/api/wingsgo/tour-catalog?limit=4&market=china&cursor=${validCursor}`),
      )
      const pageFilter = (await resFilter.json()) as WingsGoCatalogData
      // Cursor was ignored, returns fresh page 1 for china (0 items)
      expect(pageFilter.all).toEqual([])

      // Context mismatch: different site
      getCurrentSite.mockResolvedValue({ code: 'wing-side', id: 8 })
      const resSite = await GET(
        new Request(`http://localhost/api/wingsgo/tour-catalog?limit=4&cursor=${validCursor}`),
      )
      const pageSite = (await resSite.json()) as WingsGoCatalogData
      expect(pageSite.all).toEqual([])
    })

    it('reports nextOffset from page 1 when a rejected cursor arrives with a stale offset', async () => {
      const res = await GET(
        new Request('http://localhost/api/wingsgo/tour-catalog?limit=4&offset=60&cursor=garbage'),
      )
      const data = (await res.json()) as WingsGoCatalogData
      expect(data.all.map((c) => c.id)).toEqual([7, 8, 9, 10])
      expect(data.nextOffset).toBe(4)
    })

    it('treats tampered or malformed cursors as no cursor, returning page 1 with 200 and no-store', async () => {
      const res1 = await GET(new Request('http://localhost/api/wingsgo/tour-catalog?limit=4'))
      const page1 = (await res1.json()) as WingsGoCatalogData
      const decoded = decodeCatalogCursor(page1.nextCursor!)!

      // 1. Tampered ctx
      const tamperedCtx = Buffer.from(
        JSON.stringify({ ...decoded, ctx: 'bad_ctx_hex' }),
      ).toString('base64url')
      const resCtx = await GET(
        new Request(`http://localhost/api/wingsgo/tour-catalog?limit=4&cursor=${tamperedCtx}`),
      )
      expect(resCtx.status).toBe(200)
      expect(resCtx.headers.get('cache-control')).toBe('no-store')
      expect(((await resCtx.json()) as WingsGoCatalogData).all.map((c) => c.id)).toEqual([7, 8, 9, 10])

      // 2. Tampered x (invalid id characters)
      const tamperedX = Buffer.from(
        JSON.stringify({ ...decoded, x: ['invalid!id#'] }),
      ).toString('base64url')
      const resX = await GET(
        new Request(`http://localhost/api/wingsgo/tour-catalog?limit=4&cursor=${tamperedX}`),
      )
      expect(resX.status).toBe(200)
      expect(((await resX.json()) as WingsGoCatalogData).all.map((c) => c.id)).toEqual([7, 8, 9, 10])

      // 3. v: 1 cursor
      const v1Cursor = Buffer.from(
        JSON.stringify({
          date: decoded.date,
          id: decoded.id,
          price: decoded.price,
          sort: decoded.sort,
          title: decoded.title,
          v: 1,
        }),
      ).toString('base64url')
      const resV1 = await GET(
        new Request(`http://localhost/api/wingsgo/tour-catalog?limit=4&cursor=${v1Cursor}`),
      )
      expect(resV1.status).toBe(200)
      expect(((await resV1.json()) as WingsGoCatalogData).all.map((c) => c.id)).toEqual([7, 8, 9, 10])

      // 4. Oversized cursor
      const oversized = 'a'.repeat(1025)
      const resOver = await GET(
        new Request(`http://localhost/api/wingsgo/tour-catalog?limit=4&cursor=${oversized}`),
      )
      expect(resOver.status).toBe(200)
      expect(((await resOver.json()) as WingsGoCatalogData).all.map((c) => c.id)).toEqual([7, 8, 9, 10])

      // 5. Garbage characters
      const resGarbage = await GET(
        new Request('http://localhost/api/wingsgo/tour-catalog?limit=4&cursor=invalid_base64!@#$%^&*()'),
      )
      expect(resGarbage.status).toBe(200)
      expect(((await resGarbage.json()) as WingsGoCatalogData).all.map((c) => c.id)).toEqual([7, 8, 9, 10])
    })
  })
})
