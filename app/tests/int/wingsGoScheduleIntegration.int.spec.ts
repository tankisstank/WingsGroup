import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  find: vi.fn(),
  siteID: 7,
}))

vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('payload', () => ({ getPayload: vi.fn(async () => ({ find: mocks.find })) }))
vi.mock('@/utilities/siteContext', () => ({
  appendSiteWhere: vi.fn(async (where?: Record<string, unknown>) => ({
    and: [{ site: { equals: mocks.siteID } }, where],
  })),
  getCurrentSite: vi.fn(async () => ({ code: 'wings-go', id: mocks.siteID })),
}))

import { getResolvedScheduleData } from '@/tours/queries'
import { getWingsGoScheduleSnapshot } from '@/tours/wingsGoSchedule'

describe('US-093 Phase 1A - Schedule Snapshot & Integration Contracts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('reads > 200 departures across multiple pages without truncation, sorted and deduplicated', async () => {
    // Page 1: 250 departures (id 1..250), hasNextPage: true
    // Page 2: 20 departures (id 245..264) with overlapping 245..250 to test dedupe, hasNextPage: false
    const page1Docs = Array.from({ length: 250 }, (_, i) => ({
      id: `dep-${i + 1}`,
      departureDate: `2027-05-${String((i % 20) + 1).padStart(2, '0')}T00:00:00.000Z`,
      commerceVerified: true,
      availabilityStatus: 'open',
      priceFrom: 15000000 + i * 10000,
      currency: 'VND',
      tourProduct: {
        id: `tour-${(i % 10) + 1}`,
        _status: 'published',
        site: 7,
        slug: `tour-slug-${(i % 10) + 1}`,
        title: `Tour ${(i % 10) + 1}`,
        market: 'japan',
        heroMedia: { id: 10, site: 7, url: '/media/japan.jpg', alt: 'Japan' },
      },
    }))

    const page2Docs = Array.from({ length: 20 }, (_, i) => {
      const idNum = 245 + i
      return {
        id: `dep-${idNum}`,
        departureDate: `2027-06-${String((i % 20) + 1).padStart(2, '0')}T00:00:00.000Z`,
        commerceVerified: true,
        availabilityStatus: 'open',
        priceFrom: 18000000,
        currency: 'VND',
        tourProduct: {
          id: `tour-page2`,
          _status: 'published',
          site: 7,
          slug: 'tour-page2',
          title: 'Tour Page 2',
          market: 'korea',
          heroMedia: { id: 11, site: 7, url: '/media/korea.jpg', alt: 'Korea' },
        },
      }
    })

    mocks.find.mockImplementation(async (options: any) => {
      if (options.collection === 'tour-departures') {
        if (options.page === 1) {
          return { docs: page1Docs, hasNextPage: true, totalDocs: 264 }
        }
        if (options.page === 2) {
          return { docs: page2Docs, hasNextPage: false, totalDocs: 264 }
        }
      }
      return { docs: [] }
    })

    const snapshot = await getWingsGoScheduleSnapshot({
      locale: 'vi',
      now: new Date('2027-01-01T00:00:00.000Z'),
    })

    expect(snapshot).not.toBeNull()
    // 250 in page 1 + 20 in page 2 - 6 overlapping (245..250) = 264 total unique rows
    expect(snapshot?.rows.length).toBe(264)
    // Check pagination was called with page 1 and page 2
    expect(mocks.find).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 1,
        pagination: true,
        limit: 250,
      }),
    )
    expect(mocks.find).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 2,
        pagination: true,
        limit: 250,
      }),
    )
    // Check rows are sorted by departureDay then id
    for (let i = 1; i < snapshot!.rows.length; i++) {
      const prev = snapshot!.rows[i - 1]
      const curr = snapshot!.rows[i]
      const cmp = prev.departureDay.localeCompare(curr.departureDay)
      expect(cmp <= 0).toBe(true)
      if (cmp === 0) {
        expect(prev.id.localeCompare(curr.id) <= 0).toBe(true)
      }
    }
  })

  it('filters out draft or foreign-site products; sets foreign-site media to null; keeps valid media without _status', async () => {
    const rawDepartures = [
      // 1. Valid product + valid media without _status (Media collection has no _status)
      {
        id: 'dep-valid',
        departureDate: '2027-07-01T00:00:00.000Z',
        commerceVerified: true,
        availabilityStatus: 'open',
        priceFrom: 20000000,
        currency: 'VND',
        tourProduct: {
          id: 'tour-1',
          _status: 'published',
          site: 7, // same site
          slug: 'tour-valid',
          title: 'Hành trình hợp lệ',
          market: 'japan',
          heroMedia: {
            id: 101,
            site: 7, // same site
            url: 'https://cdn.example.com/japan.jpg',
            alt: 'Japan Tour',
            // Note: Media collection has NO _status property!
          },
          editorialBadges: [{ kind: 'hot', label: 'Tour hot' }],
        },
      },
      // 2. Product is draft -> excluded in public mode
      {
        id: 'dep-draft-product',
        departureDate: '2027-07-02T00:00:00.000Z',
        commerceVerified: true,
        tourProduct: {
          id: 'tour-draft',
          _status: 'draft',
          site: 7,
          slug: 'tour-draft',
          title: 'Tour Draft',
        },
      },
      // 3. Product belongs to different site (e.g. site 3) -> excluded
      {
        id: 'dep-foreign-product',
        departureDate: '2027-07-03T00:00:00.000Z',
        commerceVerified: true,
        tourProduct: {
          id: 'tour-foreign',
          _status: 'published',
          site: 3,
          slug: 'tour-foreign',
          title: 'Tour Foreign',
        },
      },
      // 4. Product valid, but heroMedia belongs to foreign site -> media becomes null, tour kept
      {
        id: 'dep-foreign-media',
        departureDate: '2027-07-04T00:00:00.000Z',
        commerceVerified: true,
        availabilityStatus: 'limited',
        priceFrom: 25000000,
        currency: 'VND',
        tourProduct: {
          id: 'tour-foreign-media',
          _status: 'published',
          site: 7,
          slug: 'tour-foreign-media',
          title: 'Tour Foreign Media',
          market: 'korea',
          heroMedia: {
            id: 202,
            site: 99, // foreign site!
            url: 'https://cdn.example.com/foreign.jpg',
          },
        },
      },
      // 5. Primitive relation id or deleted product relation (null/number) -> safely skipped
      {
        id: 'dep-primitive-relation',
        departureDate: '2027-07-05T00:00:00.000Z',
        commerceVerified: true,
        tourProduct: 9999, // primitive ID, unpopulated
      },
      {
        id: 'dep-null-relation',
        departureDate: '2027-07-06T00:00:00.000Z',
        commerceVerified: true,
        tourProduct: null, // deleted relation
      },
    ]

    mocks.find.mockResolvedValueOnce({ docs: rawDepartures, hasNextPage: false })

    const snapshot = await getWingsGoScheduleSnapshot({
      locale: 'vi',
      now: new Date('2027-01-01T00:00:00.000Z'),
    })

    expect(snapshot).not.toBeNull()
    // Only dep-valid and dep-foreign-media are included
    expect(snapshot?.rows.map((r) => r.id)).toEqual(['dep-valid', 'dep-foreign-media'])

    // Media on tour-1 is preserved even without _status
    const tour1 = snapshot?.tours['tour-1']
    expect(tour1?.media).toEqual({
      url: 'https://cdn.example.com/japan.jpg',
      alt: 'Japan Tour',
    })
    expect(tour1?.badges).toEqual([{ kind: 'hot', label: 'Tour hot' }])
    expect(tour1?.hasHot).toBe(true)

    // Media on tour-foreign-media was stripped to null
    const tourForeignMedia = snapshot?.tours['tour-foreign-media']
    expect(tourForeignMedia?.media).toBeNull()
  })

  it('implements D11 locale fallback: untranslated EN tour shows VI content without leaking VI badge', async () => {
    // EN query returns a departure whose product has no EN title
    const enDepartures = [
      {
        id: 'dep-d11',
        departureDate: '2027-08-10T00:00:00.000Z',
        commerceVerified: true,
        availabilityStatus: 'open',
        priceFrom: 30000000,
        currency: 'VND',
        tourProduct: {
          id: 'tour-d11',
          _status: 'published',
          site: 7,
          slug: 'tour-d11',
          title: '', // Missing EN title!
          market: 'china',
          heroMedia: { id: 301, site: 7, url: '/china.jpg' },
          editorialBadges: [
            { kind: 'specialized', label: { en: 'Expert Guide', vi: 'Hướng dẫn viên chuyên gia' } },
          ],
        },
      },
    ]

    mocks.find.mockImplementation(async (options: any) => {
      if (options.collection === 'tour-departures') {
        return { docs: enDepartures, hasNextPage: false }
      }
      if (options.collection === 'tour-products' && options.locale === 'vi') {
        // Return VI fallback content for tour-d11
        return {
          docs: [
            {
              id: 'tour-d11',
              title: 'Bắc Kinh - Vạn Lý Trường Thành (Tiếng Việt)',
              editorialBadges: [
                { kind: 'specialized', label: 'Nhãn Tiếng Việt không được lọt' },
              ],
            },
          ],
        }
      }
      return { docs: [] }
    })

    const snapshot = await getWingsGoScheduleSnapshot({
      locale: 'en',
      now: new Date('2027-01-01T00:00:00.000Z'),
    })

    expect(snapshot).not.toBeNull()
    const tour = snapshot?.tours['tour-d11']
    // Title took VI fallback
    expect(tour?.title).toBe('Bắc Kinh - Vạn Lý Trường Thành (Tiếng Việt)')
    // Route title generated from fallback title
    expect(tour?.routeTitle).toBeDefined()
    // Editorial badges came strictly from the EN read
    expect(tour?.badges).toEqual([{ kind: 'specialized', label: 'Expert Guide' }])
  })

  it('preserves getResolvedScheduleData behavior for homepage with empty, past-only, and future departures', async () => {
    // 1. Empty departures
    mocks.find.mockResolvedValueOnce({ docs: [] })
    const emptyResult = await getResolvedScheduleData({ draft: false, locale: 'vi' })
    expect(emptyResult.departures).toEqual([])
    expect(emptyResult.heroStats.lowestPrice).toBeNull()
    expect(emptyResult.heroStats.openCount).toBe(0)

    // 2. Past-only departures (fallback preserved per D2!)
    const pastDocs = [
      {
        id: 'past-1',
        departureDate: '2020-01-01T00:00:00.000Z',
        commerceVerified: true,
        priceFrom: 12000000,
        currency: 'VND',
      },
    ]
    mocks.find.mockResolvedValueOnce({ docs: pastDocs })
    const pastResult = await getResolvedScheduleData({ draft: false, locale: 'vi' })
    // Fallback allows departures to be displayed for past-only
    expect(pastResult.departures.length).toBe(1)
    expect(pastResult.heroStats.lowestPrice).toBe(12000000)

    // 3. Future departures
    const futureDocs = [
      {
        id: 'future-1',
        departureDate: '2029-01-01T00:00:00.000Z',
        commerceVerified: true,
        priceFrom: 19000000,
        currency: 'VND',
      },
      {
        id: 'future-2-invalid-price',
        departureDate: '2029-01-05T00:00:00.000Z',
        commerceVerified: true,
        priceFrom: 0, // price 0 filtered by getLowestPrice
        currency: 'VND',
      },
    ]
    mocks.find.mockResolvedValueOnce({ docs: futureDocs })
    const futureResult = await getResolvedScheduleData({ draft: false, locale: 'vi' })
    expect(futureResult.departures.length).toBe(2)
    // Lowest price skips 0 and returns 19000000
    expect(futureResult.heroStats.lowestPrice).toBe(19000000)
    expect(futureResult.heroStats.openCount).toBe(2)
  })
})
