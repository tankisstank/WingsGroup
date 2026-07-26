import { describe, expect, it, vi } from 'vitest'

import {
  auditWingsSideHomeCuration,
  resolveWingsSideHomeCuration,
  wingsSideHomeCuration,
  wingsSideHomeCurationSourceIDs,
  wingsSideHomeDestinationSelections,
  wingsSideHomeFeaturedSelections,
  wingsSideHomeStyleSelections,
} from '../../scripts/lib/wingsSideHomeCuration'
import {
  hydrateWingsSideHomeCuration,
  projectWingsSideHomeCuration,
} from '../../src/tours/homeCuration'

const siteID = 9
const selectedTourIDs = [...new Set([
  ...wingsSideHomeDestinationSelections.map(({ tour }) => tour),
  ...wingsSideHomeStyleSelections.map(({ tour }) => tour),
  ...wingsSideHomeFeaturedSelections.map(({ tour }) => tour),
])]

const eligibleTours = new Map(selectedTourIDs.map((id) => [
  String(id),
  {
    _status: 'published' as const,
    destinationTags: wingsSideHomeDestinationSelections.filter((selection) => selection.tour === id).map(({ key }) => key),
    durationDays: 6,
    heroMedia: id + 1000,
    id,
    site: siteID,
    summary: `Summary ${id}`,
    title: `Tour ${id}`,
    travelStyles: wingsSideHomeStyleSelections.filter((selection) => selection.tour === id).map(({ key }) => key),
    wrapperPage: id + 2000,
  },
]))

describe('WingSide Home curation audit', () => {
  it('resolves approved source identities to environment-specific relation IDs', () => {
    const remapped = resolveWingsSideHomeCuration(
      new Map(wingsSideHomeCurationSourceIDs.map((sourceID, index) => [sourceID, index + 60])),
    )

    expect(remapped.destinationTourSelections.map(({ tour }) => tour)).toEqual([
      60, 61, 62, 63, 64, 65,
    ])
    expect(remapped.styleTourSelections.map(({ tour }) => tour)).toEqual([
      66, 67, 68, 69, 70, 71,
    ])
    expect(remapped.featuredJourneySelections.map(({ tour }) => tour)).toEqual([68, 60, 63])
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
      destinationTourSelections: wingsSideHomeCuration.destinationTourSelections.map((selection, index) => ({
        ...selection,
        id: `destination-${index}`,
        tour: { id: selection.tour },
      })),
      featuredJourneySelections: wingsSideHomeCuration.featuredJourneySelections.map((selection, index) => ({
        ...selection,
        id: `featured-${index}`,
        tour: { id: selection.tour },
      })),
      styleTourSelections: wingsSideHomeCuration.styleTourSelections.map((selection, index) => ({
        ...selection,
        id: `style-${index}`,
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
})

describe('WingSide Home runtime curation loader', () => {
  it('hydrates explicitly queried tour, wrapper, and media relations into a ready projection', async () => {
    const tours = selectedTourIDs.map((id) => ({
      _status: 'published',
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
        expect.objectContaining({ href: '/tour/tour-491', key: 'hanoi' }),
      ]),
      featuredJourneys: expect.arrayContaining([
        expect.objectContaining({ id: 504, price: { kind: 'on-request', label: 'On request' } }),
      ]),
      issues: [],
      state: 'ready',
      styleTours: expect.arrayContaining([
        expect.objectContaining({ key: 'romance', title: 'Tour 534' }),
      ]),
    })
  })
})
