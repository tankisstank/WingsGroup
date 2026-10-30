import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import configPromise from '@/payload.config'
import { getPayload, type File, type Payload } from 'payload'
import type { Site } from '@/payload-types'

let payload: Payload
let wingsGoSite: Site
let otherSite: Site
let currentTestSite: Site

const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
)

vi.mock('@/utilities/siteContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utilities/siteContext')>()
  return {
    ...actual,
    getCurrentSite: vi.fn(async () => currentTestSite),
    appendSiteWhere: vi.fn(async (where?: Record<string, unknown>) => {
      const siteConstraint = { site: { equals: currentTestSite.id } }
      if (!where) return siteConstraint
      return { and: [siteConstraint, where] }
    }),
  }
})

import { getResolvedScheduleData } from '@/tours/queries'
import { getWingsGoScheduleSnapshot } from '@/tours/wingsGoSchedule'

describe('US-093 Phase 1A - Real Payload Integration Test', () => {
  const suffix = `${process.pid}-${Date.now()}`

  const createMedia = async (site: number, filename: string) => {
    const file: File = {
      data: png,
      mimetype: 'image/png',
      name: filename,
      size: png.byteLength,
    }
    return payload.create({
      collection: 'media',
      context: { disableRevalidate: true, seed: true },
      data: {
        alt: `Alt ${filename}`,
        site,
      },
      file,
      overrideAccess: true,
    })
  }

  const createTourProduct = async (data: Record<string, any>, locale?: string) => {
    return payload.create({
      collection: 'tour-products',
      context: { disableRevalidate: true, seed: true },
      data: {
        market: 'japan',
        durationDays: 5,
        durationNights: 4,
        summary: 'Tóm tắt hành trình mẫu',
        itineraryDays: [
          {
            dayNumber: 1,
            title: 'Ngày 1: Khởi hành',
            summary: 'Tập trung và cất cánh',
          },
        ],
        _status: 'published',
        ...data,
      } as any,
      draft: false,
      locale: locale as any,
      overrideAccess: true,
    })
  }

  beforeAll(async () => {
    payload = await getPayload({ config: configPromise })

    // 1. Create two real sites in SQLite
    wingsGoSite = await payload.create({
      collection: 'sites',
      context: { disableRevalidate: true, seed: true },
      data: {
        code: `wings-go-${suffix}`,
        name: `WingsGo ${suffix}`,
        defaultLocale: 'vi',
        isActive: true,
        primaryDomain: `wingsgo-${suffix}.invalid`,
        supportedLocales: ['vi', 'en'],
      },
      overrideAccess: true,
    })

    otherSite = await payload.create({
      collection: 'sites',
      context: { disableRevalidate: true, seed: true },
      data: {
        code: `other-site-${suffix}`,
        name: `Other Site ${suffix}`,
        defaultLocale: 'vi',
        isActive: true,
        primaryDomain: `other-${suffix}.invalid`,
        supportedLocales: ['vi', 'en'],
      },
      overrideAccess: true,
    })

    currentTestSite = wingsGoSite
  }, 60_000)

  afterAll(async () => {
    await payload?.destroy()
  })

  it('reads > 200 departures across at least two pages, without truncation, sorted and deduplicated', async () => {
    currentTestSite = wingsGoSite

    // Create a real published tour product on WingsGo
    const tourProduct = await createTourProduct({
      title: `Tour Paging 260 ${suffix}`,
      slug: `tour-paging-260-${suffix}`,
      site: wingsGoSite.id,
    })

    // Create 260 departures with unique dates (from 2027-01-01 onwards) so inventoryIdentity is unique
    const totalCount = 260
    const createdDepartureIds = new Set<string>()
    for (let chunk = 0; chunk < totalCount; chunk += 50) {
      const end = Math.min(chunk + 50, totalCount)
      const promises: Promise<any>[] = []
      for (let i = chunk; i < end; i++) {
        const dateObj = new Date(Date.UTC(2027, 0, 1 + i))
        promises.push(
          payload.create({
            collection: 'tour-departures',
            context: { disableRevalidate: true, seed: true },
            data: {
              departureDate: dateObj.toISOString(),
              site: wingsGoSite.id,
              tourProduct: tourProduct.id,
              availabilityStatus: 'open',
              currency: 'VND',
              priceFrom: 18000000 + i * 1000,
              _status: 'published',
            },
            overrideAccess: true,
          }),
        )
      }
      const createdChunk = await Promise.all(promises)
      for (const doc of createdChunk) {
        createdDepartureIds.add(String(doc.id))
      }
    }

    // Spy on payload.find to prove page 2 was queried
    const queriedPages: number[] = []
    const originalFind = payload.find.bind(payload)
    const findSpy = vi.spyOn(payload, 'find').mockImplementation(async (args: any) => {
      if (args?.collection === 'tour-departures' && typeof args?.page === 'number') {
        queriedPages.push(args.page)
      }
      return originalFind(args)
    })

    // Call snapshot with real Payload query
    let snapshot: any
    try {
      snapshot = await getWingsGoScheduleSnapshot({
        locale: 'vi',
        now: new Date('2026-12-01T00:00:00.000Z'),
      })
    } finally {
      findSpy.mockRestore()
    }

    expect(snapshot).not.toBeNull()
    // C3: Exactly 260 fixture rows
    expect(snapshot!.rows).toHaveLength(260)

    // C3: Unique set of IDs matching created fixture IDs
    const rowIds = new Set(snapshot!.rows.map((r: any) => r.id))
    expect(rowIds.size).toBe(260)
    expect(rowIds).toEqual(createdDepartureIds)

    // C3: Prove that page 2 was queried
    expect(queriedPages).toContain(1)
    expect(queriedPages).toContain(2)

    // Verify sort order: departureDay ascending, then id ascending
    for (let i = 1; i < snapshot!.rows.length; i++) {
      const prev = snapshot!.rows[i - 1]
      const curr = snapshot!.rows[i]
      const cmp = prev.departureDay.localeCompare(curr.departureDay)
      expect(cmp <= 0).toBe(true)
      if (cmp === 0) {
        const numPrev = Number(prev.id)
        const numCurr = Number(curr.id)
        if (Number.isInteger(numPrev) && Number.isInteger(numCurr)) {
          expect(numPrev).toBeLessThanOrEqual(numCurr)
        } else {
          expect(prev.id.localeCompare(curr.id)).toBeLessThanOrEqual(0)
        }
      }
    }
  }, 120_000)

  it('populates editorialBadges, site, and _status (defeating defaultPopulate omission); verifies media handling and draft/foreign exclusion', async () => {
    currentTestSite = wingsGoSite

    // 1. Real media on WingsGo site
    const validMedia = await createMedia(wingsGoSite.id, `media-valid-${suffix}.png`)

    // 2. Real media on OTHER site
    const foreignMedia = await createMedia(otherSite.id, `media-foreign-${suffix}.png`)

    // 3. Tour product with editorial badges and valid media on WingsGo site
    const populatedTour = await createTourProduct({
      title: `Populated Tour ${suffix}`,
      slug: `populated-tour-${suffix}`,
      market: 'korea',
      site: wingsGoSite.id,
      heroMedia: validMedia.id,
      editorialBadges: [
        { kind: 'hot', label: 'Tour hot' },
        { kind: 'specialized', label: 'Specialize' },
      ],
      _status: 'published',
    })

    // 4. Tour product with foreign media on WingsGo site
    const foreignMediaTour = await createTourProduct({
      title: `Foreign Media Tour ${suffix}`,
      slug: `foreign-media-tour-${suffix}`,
      market: 'china',
      site: wingsGoSite.id,
      heroMedia: foreignMedia.id,
      _status: 'published',
    })

    // 5. Tour product in DRAFT status on WingsGo site
    const draftTour = await createTourProduct({
      title: `Draft Tour ${suffix}`,
      slug: `draft-tour-${suffix}`,
      market: 'thailand',
      site: wingsGoSite.id,
      _status: 'draft',
    })

    // 6. Tour product on OTHER site
    const otherSiteTour = await createTourProduct({
      title: `Other Site Tour ${suffix}`,
      slug: `other-site-tour-${suffix}`,
      market: 'vietnam',
      site: otherSite.id,
      _status: 'published',
    })

    // Create departures for each
    const depValid = await payload.create({
      collection: 'tour-departures',
      context: { disableRevalidate: true, seed: true },
      data: {
        departureDate: '2028-08-10T00:00:00.000Z',
        site: wingsGoSite.id,
        tourProduct: populatedTour.id,
        availabilityStatus: 'open',
        priceFrom: 22000000,
        currency: 'VND',
        _status: 'published',
      },
      overrideAccess: true,
    })

    const depForeignMedia = await payload.create({
      collection: 'tour-departures',
      context: { disableRevalidate: true, seed: true },
      data: {
        departureDate: '2028-08-11T00:00:00.000Z',
        site: wingsGoSite.id,
        tourProduct: foreignMediaTour.id,
        availabilityStatus: 'open',
        priceFrom: 25000000,
        currency: 'VND',
        _status: 'published',
      },
      overrideAccess: true,
    })

    const depDraft = await payload.create({
      collection: 'tour-departures',
      context: { disableRevalidate: true, seed: true },
      data: {
        departureDate: '2028-08-12T00:00:00.000Z',
        site: wingsGoSite.id,
        tourProduct: draftTour.id,
        availabilityStatus: 'open',
        priceFrom: 19000000,
        currency: 'VND',
        _status: 'published',
      },
      overrideAccess: true,
    })

    const depOtherSite = await payload.create({
      collection: 'tour-departures',
      context: { disableRevalidate: true, seed: true },
      data: {
        departureDate: '2028-08-13T00:00:00.000Z',
        site: otherSite.id,
        tourProduct: otherSiteTour.id,
        availabilityStatus: 'open',
        priceFrom: 15000000,
        currency: 'VND',
        _status: 'published',
      },
      overrideAccess: true,
    })

    // Execute snapshot on WingsGo site
    currentTestSite = wingsGoSite
    const snapshot = await getWingsGoScheduleSnapshot({
      locale: 'vi',
      now: new Date('2028-08-01T00:00:00.000Z'),
    })

    expect(snapshot).not.toBeNull()

    // depValid must be included with populated editorialBadges (proving defaultPopulate was overridden)
    const rowValid = snapshot?.rows.find((r) => r.id === String(depValid.id))
    expect(rowValid).toBeDefined()
    const tourValid = snapshot?.tours[String(populatedTour.id)]
    expect(tourValid).toBeDefined()
    expect(tourValid?.badges).toEqual([
      { kind: 'hot', label: 'Tour hot' },
      { kind: 'specialized', label: 'Specialize' },
    ])
    expect(tourValid?.hasHot).toBe(true)
    // Valid media (which has no _status) is preserved
    expect(tourValid?.media).toBeDefined()
    expect(tourValid?.media?.url).toContain(`media-valid-${suffix}.png`)

    // depForeignMedia is included, but its media is stripped to null because media.site !== wingsGoSite.id
    const rowForeignMedia = snapshot?.rows.find((r) => r.id === String(depForeignMedia.id))
    expect(rowForeignMedia).toBeDefined()
    const tourForeignMedia = snapshot?.tours[String(foreignMediaTour.id)]
    expect(tourForeignMedia?.media).toBeNull()

    // depDraft (draft tourProduct) must be excluded
    const rowDraft = snapshot?.rows.find((r) => r.id === String(depDraft.id))
    expect(rowDraft).toBeUndefined()

    // depOtherSite (different site) must be excluded
    const rowOtherSite = snapshot?.rows.find((r) => r.id === String(depOtherSite.id))
    expect(rowOtherSite).toBeUndefined()
  }, 60_000)

  it('implements D11: untranslated tour in EN shows VI content but retains EN strict badges', async () => {
    // Create product in VI only with Vietnamese title and Vietnamese editorial badge
    const d11Tour = await createTourProduct(
      {
        title: `Hành Trình Bắc Kinh ${suffix}`,
        slug: `tour-d11-${suffix}`,
        market: 'china',
        site: wingsGoSite.id,
        editorialBadges: [
          {
            kind: 'specialized',
            label: 'Chuyên gia hướng dẫn',
          },
        ],
      },
      'vi',
    )

    // Create departure
    await payload.create({
      collection: 'tour-departures',
      context: { disableRevalidate: true, seed: true },
      data: {
        departureDate: '2028-09-15T00:00:00.000Z',
        site: wingsGoSite.id,
        tourProduct: d11Tour.id,
        availabilityStatus: 'open',
        priceFrom: 28000000,
        currency: 'VND',
        _status: 'published',
      },
      overrideAccess: true,
    })

    currentTestSite = wingsGoSite
    const snapshotEn = await getWingsGoScheduleSnapshot({
      locale: 'en',
      now: new Date('2028-09-01T00:00:00.000Z'),
    })

    expect(snapshotEn).not.toBeNull()
    const tour = snapshotEn?.tours[String(d11Tour.id)]
    expect(tour).toBeDefined()
    // Content falls back to VI title
    expect(tour?.title).toBe(`Hành Trình Bắc Kinh ${suffix}`)
    // Badges strictly take EN read and NEVER leak VI label ("Chuyên gia hướng dẫn")
    expect(tour?.badges).toEqual([])
  }, 60_000)

  it('handles deleted relation gracefully without throwing error', async () => {
    const tempTour = await createTourProduct({
      title: `Temp Tour ${suffix}`,
      slug: `temp-tour-${suffix}`,
      market: 'japan',
      site: wingsGoSite.id,
      _status: 'published',
    })

    const tempDep = await payload.create({
      collection: 'tour-departures',
      context: { disableRevalidate: true, seed: true },
      data: {
        departureDate: '2028-10-01T00:00:00.000Z',
        site: wingsGoSite.id,
        tourProduct: tempTour.id,
        availabilityStatus: 'open',
        priceFrom: 20000000,
        currency: 'VND',
        _status: 'published',
      },
      overrideAccess: true,
    })

    // Delete the tour product with disableRevalidate to prevent Next.js static generation crash
    await payload.delete({
      collection: 'tour-products',
      id: tempTour.id,
      context: { disableRevalidate: true },
      overrideAccess: true,
    })

    // Querying snapshot must not crash
    currentTestSite = wingsGoSite
    const snapshot = await getWingsGoScheduleSnapshot({
      locale: 'vi',
      now: new Date('2028-09-01T00:00:00.000Z'),
    })

    expect(snapshot).not.toBeNull()
    // The departure with deleted tourProduct is safely omitted
    expect(snapshot?.rows.find((r) => r.id === String(tempDep.id))).toBeUndefined()
  }, 60_000)

  it('WingsGo homepage getResolvedScheduleData gives stable output across empty, past-only, and future inventory', async () => {
    currentTestSite = wingsGoSite

    // Test with fresh site
    const emptySite = await payload.create({
      collection: 'sites',
      context: { disableRevalidate: true, seed: true },
      data: {
        code: `empty-site-${suffix}`,
        name: `Empty Site ${suffix}`,
        defaultLocale: 'vi',
        isActive: true,
        primaryDomain: `empty-${suffix}.invalid`,
        supportedLocales: ['vi'],
      },
      overrideAccess: true,
    })

    currentTestSite = emptySite
    const emptyResult = await getResolvedScheduleData({ draft: false, locale: 'vi' })
    expect(emptyResult.departures).toEqual([])
    expect(emptyResult.heroStats.lowestPrice).toBeNull()
    expect(emptyResult.heroStats.openCount).toBe(0)

    // Create a past-only departure on this site with current verification governance
    const pastTour = await createTourProduct({
      title: `Past Tour ${suffix}`,
      slug: `past-tour-${suffix}`,
      market: 'vietnam',
      site: emptySite.id,
      _status: 'published',
    })

    await payload.create({
      collection: 'tour-departures',
      context: { disableRevalidate: true, seed: true },
      data: {
        departureDate: '2020-01-01T00:00:00.000Z',
        site: emptySite.id,
        tourProduct: pastTour.id,
        availabilityStatus: 'open',
        verifiedAt: '2020-01-01T00:00:00.000Z',
        expiresAt: '2030-01-01T00:00:00.000Z',
        priceFrom: 9900000,
        currency: 'VND',
        _status: 'published',
      },
      overrideAccess: true,
    })

    const pastResult = await getResolvedScheduleData({ draft: false, locale: 'vi' })
    // Fallback keeps past departures visible when no future departures exist (D2 preservation)
    expect(pastResult.departures.length).toBe(1)
    expect(pastResult.heroStats.lowestPrice).toBe(9900000)

    // Now add a future departure with price 0 (which should be skipped by getLowestPrice)
    // and a future departure with valid price
    await payload.create({
      collection: 'tour-departures',
      context: { disableRevalidate: true, seed: true },
      data: {
        departureDate: '2029-01-01T00:00:00.000Z',
        site: emptySite.id,
        tourProduct: pastTour.id,
        availabilityStatus: 'open',
        verifiedAt: '2026-01-01T00:00:00.000Z',
        expiresAt: '2030-01-01T00:00:00.000Z',
        priceFrom: 0, // price 0
        currency: 'VND',
        _status: 'published',
      },
      overrideAccess: true,
    })

    await payload.create({
      collection: 'tour-departures',
      context: { disableRevalidate: true, seed: true },
      data: {
        departureDate: '2029-01-10T00:00:00.000Z',
        site: emptySite.id,
        tourProduct: pastTour.id,
        availabilityStatus: 'open',
        verifiedAt: '2026-01-01T00:00:00.000Z',
        expiresAt: '2030-01-01T00:00:00.000Z',
        priceFrom: 16500000,
        currency: 'VND',
        _status: 'published',
      },
      overrideAccess: true,
    })

    const futureResult = await getResolvedScheduleData({ draft: false, locale: 'vi' })
    // Visible departures are now future departures only
    expect(futureResult.departures.length).toBe(2)
    // getLowestPrice correctly returns 16500000, skipping 0
    expect(futureResult.heroStats.lowestPrice).toBe(16500000)
    expect(futureResult.heroStats.openCount).toBe(2)
  }, 60_000)
})
