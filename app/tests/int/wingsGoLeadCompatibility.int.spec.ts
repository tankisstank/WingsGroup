import configPromise from '@payload-config'
import { getPayload, type Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { resolveDepartureLeadContext } from '@/app/(payload)/api/lead-submissions/route'
import { getTourInquiryPath } from '@/tours/utils'

describe('US-093 Phase 1B - WingsGo Lead Compatibility & Vietnam Date Persistence', () => {
  let payload: Payload
  const suffix = `lead-${process.pid}-${Date.now()}`

  let wingsGoSite: any
  let otherSite: any
  let publishedTour: any
  let otherSiteTour: any
  let dep00Z: any
  let dep17Z: any
  let depOtherSite: any
  let formRecord: any

  beforeAll(async () => {
    payload = await getPayload({ config: configPromise })

    // Create 2 sites
    wingsGoSite = await payload.create({
      collection: 'sites',
      context: { disableRevalidate: true, seed: true },
      data: {
        code: `wingsgo-${suffix}`,
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
        code: `other-${suffix}`,
        name: `Other ${suffix}`,
        defaultLocale: 'vi',
        isActive: true,
        primaryDomain: `other-${suffix}.invalid`,
        supportedLocales: ['vi', 'en'],
      },
      overrideAccess: true,
    })

    // Create published tour products
    publishedTour = await payload.create({
      collection: 'tour-products',
      context: { disableRevalidate: true, seed: true },
      data: {
        title: `Tour Lead Test ${suffix}`,
        slug: `tour-lead-${suffix}`,
        market: 'japan',
        durationDays: 5,
        durationNights: 4,
        summary: 'Tóm tắt tour',
        itineraryDays: [
          {
            dayNumber: 1,
            title: 'Ngày 1',
            summary: 'Tập trung',
          },
        ],
        site: wingsGoSite.id,
        _status: 'published',
      } as any,
      draft: false,
      locale: 'vi',
      overrideAccess: true,
    })

    otherSiteTour = await payload.create({
      collection: 'tour-products',
      context: { disableRevalidate: true, seed: true },
      data: {
        title: `Other Site Tour ${suffix}`,
        slug: `other-tour-${suffix}`,
        market: 'japan',
        durationDays: 5,
        durationNights: 4,
        summary: 'Tóm tắt',
        itineraryDays: [
          {
            dayNumber: 1,
            title: 'Ngày 1',
            summary: 'Tập trung',
          },
        ],
        site: otherSite.id,
        _status: 'published',
      } as any,
      draft: false,
      locale: 'vi',
      overrideAccess: true,
    })

    // Create departures:
    // dep00Z: 2027-05-20T00:00:00.000Z -> VN day: 2027-05-20, UTC day: 2027-05-20
    dep00Z = await payload.create({
      collection: 'tour-departures',
      context: { disableRevalidate: true, seed: true },
      data: {
        departureDate: '2027-05-20T00:00:00.000Z',
        site: wingsGoSite.id,
        tourProduct: publishedTour.id,
        availabilityStatus: 'open',
        priceFrom: 22000000,
        currency: 'VND',
        _status: 'published',
      },
      overrideAccess: true,
    })

    // dep17Z: 2027-05-19T17:00:00.000Z -> VN day: 2027-05-20 (+7h), UTC day: 2027-05-19
    dep17Z = await payload.create({
      collection: 'tour-departures',
      context: { disableRevalidate: true, seed: true },
      data: {
        departureDate: '2027-05-19T17:00:00.000Z',
        site: wingsGoSite.id,
        tourProduct: publishedTour.id,
        availabilityStatus: 'open',
        priceFrom: 25000000,
        currency: 'VND',
        _status: 'published',
      },
      overrideAccess: true,
    })

    // depOtherSite: on otherSite
    depOtherSite = await payload.create({
      collection: 'tour-departures',
      context: { disableRevalidate: true, seed: true },
      data: {
        departureDate: '2027-05-20T00:00:00.000Z',
        site: otherSite.id,
        tourProduct: otherSiteTour.id,
        availabilityStatus: 'open',
        priceFrom: 19000000,
        currency: 'VND',
        _status: 'published',
      },
      overrideAccess: true,
    })

    // Create a form record for submission testing
    formRecord = await payload.create({
      collection: 'forms',
      context: { disableRevalidate: true, seed: true },
      data: {
        title: `Contact Form ${suffix}`,
        site: wingsGoSite.id,
        confirmationType: 'message',
        confirmationMessage: {
          root: {
            type: 'root',
            children: [
              {
                type: 'paragraph',
                version: 1,
                children: [
                  {
                    type: 'text',
                    text: 'Cảm ơn bạn đã liên hệ!',
                    version: 1,
                  },
                ],
              },
            ],
            direction: 'ltr',
            format: '',
            indent: 0,
            version: 1,
          },
        },
        fields: [
          {
            blockType: 'text',
            name: 'name',
            label: 'Họ tên',
            required: true,
          },
        ],
      } as any,
      overrideAccess: true,
    })
  }, 60_000)

  afterAll(async () => {
    await payload?.destroy()
  })

  it('accepts both VN date and legacy UTC date for 00:00Z departure and persists VN date in database', async () => {
    // 1. With Vietnam date (2027-05-20)
    const contextVn = await resolveDepartureLeadContext({
      context: {
        departureId: String(dep00Z.id),
        departureDate: '2027-05-20',
        tourId: String(publishedTour.id),
        tourSlug: publishedTour.slug,
        intent: 'hold-seat',
        source: 'schedule',
      },
      payload,
      siteID: wingsGoSite.id,
    })

    expect(contextVn).not.toBeNull()
    expect(contextVn?.departureDate).toBe('2027-05-20')
    expect(contextVn?.departureId).toBe(String(dep00Z.id))

    // Persist real lead into form-submissions in SQLite
    const subVn = await payload.create({
      collection: 'form-submissions',
      context: { disableRevalidate: true, seed: true },
      data: {
        form: formRecord.id,
        site: wingsGoSite.id,
        deliveryStatus: 'pending',
        deliveryUpdatedAt: new Date().toISOString(),
        enquiryContext: contextVn,
        submissionData: [{ field: 'name', value: 'Khách hàng A' }],
      } as any,
      overrideAccess: true,
    })

    const retrievedVn = await payload.findByID({
      collection: 'form-submissions',
      id: subVn.id,
    })
    expect((retrievedVn as any)?.enquiryContext?.departureDate).toBe('2027-05-20')

    // 2. With legacy UTC date (2027-05-20)
    const contextUtc = await resolveDepartureLeadContext({
      context: {
        departureId: String(dep00Z.id),
        departureDate: '2027-05-20',
        tourId: String(publishedTour.id),
      },
      payload,
      siteID: wingsGoSite.id,
    })

    expect(contextUtc).not.toBeNull()
    expect(contextUtc?.departureDate).toBe('2027-05-20')
  })

  it('accepts both VN date and legacy UTC date for 17:00Z departure, always saving VN date into database', async () => {
    // 17:00Z departure:
    // UTC date = 2027-05-19
    // VN calendar date (+7h) = 2027-05-20

    // Case A: Client passes modern VN calendar date '2027-05-20'
    const contextVn = await resolveDepartureLeadContext({
      context: {
        departureId: String(dep17Z.id),
        departureDate: '2027-05-20',
        tourId: String(publishedTour.id),
        tourSlug: publishedTour.slug,
        intent: 'hold-seat',
      },
      payload,
      siteID: wingsGoSite.id,
    })

    expect(contextVn).not.toBeNull()
    expect(contextVn?.departureDate).toBe('2027-05-20')

    // Case B: Client passes legacy UTC date '2027-05-19' (e.g. from an old shared link)
    const contextLegacyUtc = await resolveDepartureLeadContext({
      context: {
        departureId: String(dep17Z.id),
        departureDate: '2027-05-19', // legacy UTC slice(0, 10)
        tourId: String(publishedTour.id),
        tourSlug: publishedTour.slug,
      },
      payload,
      siteID: wingsGoSite.id,
    })

    // D6 requirement: accepts legacy UTC date, BUT resolves and persists VN date!
    expect(contextLegacyUtc).not.toBeNull()
    expect(contextLegacyUtc?.departureDate).toBe('2027-05-20')

    // Persist real lead into form-submissions and verify persisted field
    const subLegacy = await payload.create({
      collection: 'form-submissions',
      context: { disableRevalidate: true, seed: true },
      data: {
        form: formRecord.id,
        site: wingsGoSite.id,
        deliveryStatus: 'pending',
        deliveryUpdatedAt: new Date().toISOString(),
        enquiryContext: contextLegacyUtc,
        submissionData: [{ field: 'name', value: 'Khách hàng Legacy' }],
      } as any,
      overrideAccess: true,
    })

    const retrievedLegacy = await payload.findByID({
      collection: 'form-submissions',
      id: subLegacy.id,
    })
    expect((retrievedLegacy as any)?.enquiryContext?.departureDate).toBe('2027-05-20')
  })

  it('handles optional departureDate when departureId is present', async () => {
    const context = await resolveDepartureLeadContext({
      context: {
        departureId: String(dep00Z.id),
        tourId: String(publishedTour.id),
      },
      payload,
      siteID: wingsGoSite.id,
    })

    expect(context).not.toBeNull()
    expect(context?.departureDate).toBe('2027-05-20')
  })

  it('fails closed (returns null) for missing departureId with departureDate, wrong dates, wrong tour, different site, or missing records', async () => {
    // 1. Missing departureId when departureDate is sent
    const missingDepId = await resolveDepartureLeadContext({
      context: {
        departureDate: '2027-05-20',
      },
      payload,
      siteID: wingsGoSite.id,
    })
    expect(missingDepId).toBeNull()

    // 2. Both departureId and departureDate absent -> returns context as is
    const generalInquiry = await resolveDepartureLeadContext({
      context: {
        intent: 'contact',
        source: 'general',
      },
      payload,
      siteID: wingsGoSite.id,
    })
    expect(generalInquiry).toEqual({ intent: 'contact', source: 'general' })

    // 3. Wrong date (neither VN date 2027-05-20 nor UTC date 2027-05-19)
    const wrongDate = await resolveDepartureLeadContext({
      context: {
        departureId: String(dep17Z.id),
        departureDate: '2027-05-21',
      },
      payload,
      siteID: wingsGoSite.id,
    })
    expect(wrongDate).toBeNull()

    // 4. Wrong tourId
    const wrongTourId = await resolveDepartureLeadContext({
      context: {
        departureId: String(dep00Z.id),
        departureDate: '2027-05-20',
        tourId: '999999',
      },
      payload,
      siteID: wingsGoSite.id,
    })
    expect(wrongTourId).toBeNull()

    // 5. Wrong tourSlug
    const wrongTourSlug = await resolveDepartureLeadContext({
      context: {
        departureId: String(dep00Z.id),
        departureDate: '2027-05-20',
        tourSlug: 'wrong-slug-not-matching',
      },
      payload,
      siteID: wingsGoSite.id,
    })
    expect(wrongTourSlug).toBeNull()

    // 6. Departure from different site
    const wrongSite = await resolveDepartureLeadContext({
      context: {
        departureId: String(depOtherSite.id),
        departureDate: '2027-05-20',
      },
      payload,
      siteID: wingsGoSite.id, // wingsGoSite vs otherSite
    })
    expect(wrongSite).toBeNull()

    // 7. Non-existent departureId
    const nonExistent = await resolveDepartureLeadContext({
      context: {
        departureId: '9999999',
        departureDate: '2027-05-20',
      },
      payload,
      siteID: wingsGoSite.id,
    })
    expect(nonExistent).toBeNull()
  })

  it('handles lost relation (tour product deleted) gracefully by returning null', async () => {
    // Create temporary tour and departure
    const tempTour = await payload.create({
      collection: 'tour-products',
      context: { disableRevalidate: true, seed: true },
      data: {
        title: `Temp Tour ${suffix}`,
        slug: `temp-tour-${suffix}`,
        market: 'japan',
        durationDays: 3,
        durationNights: 2,
        summary: 'Tóm tắt',
        itineraryDays: [{ dayNumber: 1, title: 'D1', summary: 'S1' }],
        site: wingsGoSite.id,
        _status: 'published',
      } as any,
      draft: false,
      locale: 'vi',
      overrideAccess: true,
    })

    const tempDep = await payload.create({
      collection: 'tour-departures',
      context: { disableRevalidate: true, seed: true },
      data: {
        departureDate: '2027-08-15T00:00:00.000Z',
        site: wingsGoSite.id,
        tourProduct: tempTour.id,
        availabilityStatus: 'open',
        priceFrom: 10000000,
        currency: 'VND',
        _status: 'published',
      },
      overrideAccess: true,
    })

    // Delete tour product with disableRevalidate
    await payload.delete({
      collection: 'tour-products',
      id: tempTour.id,
      context: { disableRevalidate: true },
    })

    // Now resolve lead context with departure whose relation was lost
    const context = await resolveDepartureLeadContext({
      context: {
        departureId: String(tempDep.id),
        departureDate: '2027-08-15',
      },
      payload,
      siteID: wingsGoSite.id,
    })

    // Must fail closed (null), no crash
    expect(context).toBeNull()
  })

  it('generates inquiry URL with Vietnam calendar date from getTourInquiryPath', () => {
    // 17:00Z departure -> must produce 2027-05-20
    const url = getTourInquiryPath({
      departureId: dep17Z.id,
      departureDate: dep17Z.departureDate,
      intent: 'hold-seat',
      source: 'schedule',
      tourSlug: publishedTour.slug,
      tourId: publishedTour.id,
    })

    expect(url).toContain('departureDate=2027-05-20')
    expect(url).toContain('intent=hold-seat')
    expect(url).toContain(`departureId=${dep17Z.id}`)
    expect(url).toContain(`tour=${publishedTour.slug}`)
  })
})
