import { describe, expect, it, vi } from 'vitest'

import {
  auditWingsSideHomeCuration,
  resolveWingsSideHomeCuration,
  wingsSideHomeCuration,
  wingsSideHomeCurationSourceIDs,
  wingsSideHomeDestinationSelections,
  wingsSideHomeFeaturedSelections,
  wingsSideHomeStyleSelections,
  wingsSideWhyTravelSelections,
} from '../../scripts/lib/wingsSideHomeCuration'
import {
  hydrateWingsSideHomeCuration,
  projectWingsSideHomeCuration,
} from '../../src/tours/homeCuration'

const siteID = 9
const selectedTourIDs = [
  ...new Set([
    ...wingsSideHomeDestinationSelections.map(({ tour }) => tour),
    ...wingsSideHomeStyleSelections.map(({ tour }) => tour),
    ...wingsSideHomeFeaturedSelections.map(({ tour }) => tour),
    ...wingsSideWhyTravelSelections.map(({ tour }) => tour),
  ]),
]

const eligibleTours = new Map(
  selectedTourIDs.map((id) => [
    String(id),
    {
      _status: 'published' as const,
      destinationTags: wingsSideHomeDestinationSelections
        .filter((selection) => selection.tour === id)
        .map(({ key }) => key),
      durationDays: 6,
      heroMedia: id + 1000,
      id,
      site: siteID,
      summary: `Summary ${id}`,
      title: `Tour ${id}`,
      travelStyles: wingsSideHomeStyleSelections
        .filter((selection) => selection.tour === id)
        .map(({ key }) => key),
      wrapperPage: id + 2000,
    },
  ]),
)

describe('WingSide Home curation audit', () => {
  it('resolves approved source identities to environment-specific relation IDs', () => {
    const remapped = resolveWingsSideHomeCuration(
      new Map(wingsSideHomeCurationSourceIDs.map((sourceID, index) => [sourceID, index + 60])),
    )

    expect(remapped.destinationTourSelections.map(({ tour }) => tour)).toEqual([
      60, 61, 62, 63, 64, 65,
    ])
    expect(remapped.styleTourSelections.map(({ tour }) => tour)).toEqual([66, 67, 68, 69, 70, 71])
    expect(remapped.featuredJourneySelections.map(({ tour }) => tour)).toEqual([68, 60, 63])
    expect(remapped.whyTourSlots.map(({ tour }) => tour)).toEqual([60, 67, 66, 68])
  })

  it('fails closed when an approved source identity is absent', () => {
    expect(() => resolveWingsSideHomeCuration(new Map())).toThrow(/source .* is missing/)
  })

  it('accepts the approved exact curation and all eligible selections', () => {
    const result = auditWingsSideHomeCuration({
      actual: wingsSideHomeCuration,
      homePage: { id: 1, site: siteID, wingsSideHiFi: { enabled: true, routeVariant: 'home' } },
      mediaIDs: new Set(selectedTourIDs.map((id) => String(id + 1000))),
      siteID,
      tours: eligibleTours,
      wrapperSiteIDs: new Map(selectedTourIDs.map((id) => [String(id + 2000), siteID])),
    })

    expect(result).toMatchObject({ findings: [], matchesApprovedSelections: true, ok: true })
    expect(result.selectedTourIDs).toHaveLength(12)
  })

  it('fails before a cross-site or taxonomy-mismatched curation can be applied', () => {
    const tours = new Map(eligibleTours)
    tours.set('491', { ...tours.get('491')!, site: 10 })
    const result = auditWingsSideHomeCuration({
      actual: null,
      homePage: { id: 1, site: siteID, wingsSideHiFi: { enabled: true, routeVariant: 'home' } },
      mediaIDs: new Set(selectedTourIDs.map((id) => String(id + 1000))),
      siteID,
      tours,
      wrapperSiteIDs: new Map(selectedTourIDs.map((id) => [String(id + 2000), siteID])),
    })

    expect(result.ok).toBe(false)
    expect(result.matchesApprovedSelections).toBe(false)
    expect(result.findings).toContain('TourProduct 491 belongs to another site.')
  })

  it('treats Payload row ids and populated relationship values as the same approved selection', () => {
    const actual = {
      destinationTourSelections: wingsSideHomeCuration.destinationTourSelections.map(
        (selection, index) => ({
          ...selection,
          id: `destination-${index}`,
          tour: { id: selection.tour },
        }),
      ),
      featuredJourneySelections: wingsSideHomeCuration.featuredJourneySelections.map(
        (selection, index) => ({
          ...selection,
          id: `featured-${index}`,
          tour: { id: selection.tour },
        }),
      ),
      styleTourSelections: wingsSideHomeCuration.styleTourSelections.map((selection, index) => ({
        ...selection,
        id: `style-${index}`,
        tour: { id: selection.tour },
      })),
      whyTourSlots: wingsSideHomeCuration.whyTourSlots.map((selection, index) => ({
        ...selection,
        id: `why-${index}`,
        tour: { id: selection.tour },
      })),
    }
    const result = auditWingsSideHomeCuration({
      actual: actual as never,
      homePage: { id: 1, site: siteID, wingsSideHiFi: { enabled: true, routeVariant: 'home' } },
      mediaIDs: new Set(selectedTourIDs.map((id) => String(id + 1000))),
      siteID,
      tours: eligibleTours,
      wrapperSiteIDs: new Map(selectedTourIDs.map((id) => [String(id + 2000), siteID])),
    })

    expect(result.matchesApprovedSelections).toBe(true)
  })

  it('uses stable source identity instead of localized title for rule selection', async () => {
    const home = {
      whyTourSlots: [
        {
          key: 'local-design',
          rule: { travelStyle: 'culture' },
          selectionMode: 'rule',
        },
      ],
    }
    const find = vi.fn(async ({ collection }: { collection: string }) => {
      if (collection === 'tour-products') {
        return {
          docs: [
            {
              _status: 'published',
              durationDays: 3,
              heroMedia: 1002,
              id: 2,
              site: siteID,
              sourceProvenance: { sourceId: 'source-z' },
              summary: 'Résumé localisé A',
              title: 'A localized title',
              travelStyles: ['culture'],
              wrapperPage: 2002,
            },
            {
              _status: 'published',
              durationDays: 3,
              heroMedia: 1001,
              id: 1,
              site: siteID,
              sourceProvenance: { sourceId: 'source-a' },
              summary: 'Résumé localisé Z',
              title: 'Z localized title',
              travelStyles: ['culture'],
              wrapperPage: 2001,
            },
          ],
        }
      }
      if (collection === 'pages') {
        return {
          docs: [
            { id: 2001, pathname: '/tour/source-a', site: siteID, slug: 'source-a' },
            { id: 2002, pathname: '/tour/source-z', site: siteID, slug: 'source-z' },
          ],
        }
      }
      return {
        docs: [
          { alt: 'A', id: 1001, site: siteID, url: '/media/a.jpg' },
          { alt: 'Z', id: 1002, site: siteID, url: '/media/z.jpg' },
        ],
      }
    })

    const hydrated = await hydrateWingsSideHomeCuration({
      home,
      locale: 'it',
      pageSite: siteID,
      payload: { find } as never,
    })

    expect((hydrated?.whyTourSlots?.[0]?.tour as { id?: number })?.id).toBe(1)
  })
})
describe('WingSide Home runtime curation loader', () => {
  it('projects Payload internal hero URLs through the public media route', () => {
    const populatedTour = (id: number) => ({
      ...eligibleTours.get(String(id))!,
      heroMedia: { alt: `Hero ${id}`, url: `/api/media/file/hero-${id}.jpg?tag=1` },
      wrapperPage: { pathname: `/tour/tour-${id}`, site: siteID },
    })
    const result = projectWingsSideHomeCuration({
      home: {
        destinationTourSelections: wingsSideHomeDestinationSelections.map((selection) => ({
          ...selection,
          tour: populatedTour(selection.tour),
        })),
        featuredJourneySelections: wingsSideHomeFeaturedSelections.map((selection) => ({
          ...selection,
          tour: populatedTour(selection.tour),
        })),
        styleTourSelections: wingsSideHomeStyleSelections.map((selection) => ({
          ...selection,
          tour: populatedTour(selection.tour),
        })),
      },
      pageSite: siteID,
    })

    expect(result.featuredJourneys).toHaveLength(3)
    expect(result.featuredJourneys[0]?.hero.url).toBe(
      `/media/hero-${wingsSideHomeFeaturedSelections[0]?.tour}.jpg?tag=1`,
    )
  })

  it('hydrates explicitly queried tour, wrapper, and media relations into a ready projection', async () => {
    const priceByTourID = new Map<number, { currency?: string; priceFrom?: number }>([
      [491, { currency: 'USD', priceFrom: 1200 }],
      [226, { currency: 'VND', priceFrom: 30_900_000 }],
      [506, { currency: 'ABC', priceFrom: 999 }],
      [486, { currency: 'XXX', priceFrom: 999 }],
      [326, { currency: 'USD', priceFrom: 0 }],
      [442, { currency: 'USD', priceFrom: -1 }],
      [533, { currency: 'USD', priceFrom: Number.POSITIVE_INFINITY }],
      [517, { currency: 'USD', priceFrom: Number.NaN }],
      [504, { currency: ' ', priceFrom: 999 }],
      [518, { priceFrom: 999 }],
      [534, { currency: 'usd', priceFrom: 2450 }],
    ])
    const tours = selectedTourIDs.map((id) => ({
      _status: 'published',
      ...priceByTourID.get(id),
      destinationTags: wingsSideHomeDestinationSelections
        .filter((selection) => selection.tour === id)
        .map(({ key }) => key),
      durationDays: 6,
      durationNights: 5,
      heroMedia: id + 1000,
      id,
      site: siteID,
      summary: `Summary ${id}`,
      title: `Tour ${id}`,
      travelStyles: wingsSideHomeStyleSelections
        .filter((selection) => selection.tour === id)
        .map(({ key }) => key),
      wrapperPage: id + 2000,
    }))
    const find = vi.fn(async ({ collection }: { collection: string }) => {
      if (collection === 'tour-products') return { docs: tours }
      if (collection === 'pages') {
        return {
          docs: selectedTourIDs.map((id) => ({
            id: id + 2000,
            pathname: `/tour/tour-${id}`,
            site: siteID,
            slug: `tour-${id}`,
          })),
        }
      }
      return {
        docs: selectedTourIDs.map((id) => ({
          alt: `Hero ${id}`,
          id: id + 1000,
          site: siteID,
          url: `/media/${id}.jpg`,
        })),
      }
    })

    const hydrated = await hydrateWingsSideHomeCuration({
      home: wingsSideHomeCuration,
      locale: 'en',
      pageSite: siteID,
      payload: { find } as never,
    })
    const projection = projectWingsSideHomeCuration({
      home: hydrated,
      locale: 'en',
      pageSite: siteID,
    })

    expect(find).toHaveBeenCalledTimes(3)
    expect(projection).toMatchObject({
      destinationTours: expect.arrayContaining([
        expect.objectContaining({
          href: '/tour/tour-491',
          key: 'hanoi',
          price: { currency: 'USD', kind: 'from', value: 1200 },
        }),
        expect.objectContaining({
          id: 226,
          price: { currency: 'VND', kind: 'from', value: 30_900_000 },
        }),
        expect.objectContaining({ id: 506, price: { kind: 'on-request', label: 'On request' } }),
        expect.objectContaining({ id: 486, price: { kind: 'on-request', label: 'On request' } }),
        expect.objectContaining({ id: 326, price: { kind: 'on-request', label: 'On request' } }),
        expect.objectContaining({ id: 442, price: { kind: 'on-request', label: 'On request' } }),
      ]),
      featuredJourneys: expect.arrayContaining([
        expect.objectContaining({ id: 504, price: { kind: 'on-request', label: 'On request' } }),
      ]),
      issues: [],
      state: 'ready',
      styleTours: expect.arrayContaining([
        expect.objectContaining({
          key: 'romance',
          price: { currency: 'USD', kind: 'from', value: 2450 },
          title: 'Tour 534',
        }),
      ]),
    })
  })
})
