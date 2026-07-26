import { describe, expect, it, vi } from 'vitest'

import { validateWingsSideHomeCuration } from '@/collections/Pages/hooks/validateWingsSideHomeCuration'
import {
  WINGSSIDE_HOME_DESTINATION_SELECTION_KEYS,
  WINGSSIDE_HOME_STYLE_SELECTION_KEYS,
} from '@/fields/wingsSideHiFi'
import { wingsSideLocalizationBackfillContext } from '@/utilities/wingsSideLocalizationBackfillContext'

const pageSiteID = 22

type HomeCuration = NonNullable<
  NonNullable<
    Parameters<typeof validateWingsSideHomeCuration>[0]['data']
  >['wingsSideHiFi']
>['home']

type TourDoc = {
  _status: 'draft' | 'published'
  destinationTags: string[]
  durationDays: number
  heroMedia: number
  site: number
  summary: string
  title: string
  travelStyles: string[]
  wrapperPage: string
}

const destinationSelections = () =>
  WINGSSIDE_HOME_DESTINATION_SELECTION_KEYS.map((key) => ({
    key,
    tour: `destination-${key}`,
  }))

const styleSelections = () =>
  WINGSSIDE_HOME_STYLE_SELECTION_KEYS.map((key) => ({
    key,
    tour: `style-${key}`,
  }))

const featuredSelections = () => [{ tour: 'featured-1' }, { tour: 'featured-2' }, { tour: 'featured-3' }]

const validHome = (): HomeCuration => ({
  destinationTourSelections: destinationSelections(),
  featuredJourneySelections: featuredSelections(),
  styleTourSelections: styleSelections(),
})

const validData = (home: HomeCuration = validHome()) => ({
  site: pageSiteID,
  wingsSideHiFi: {
    enabled: true,
    home,
    routeVariant: 'home',
  },
})

const makeTour = (
  id: string,
  overrides: Partial<TourDoc> = {},
): TourDoc => ({
  _status: 'published',
  destinationTags: [],
  durationDays: 8,
  heroMedia: 100,
  site: pageSiteID,
  summary: 'Natural destination summary',
  title: 'Published tour',
  travelStyles: [],
  wrapperPage: `wrapper-${id}`,
  ...overrides,
})

const buildPayload = (tourOverrides: Record<string, Partial<TourDoc>> = {}) => {
  const tours = new Map<string, TourDoc>()
  const wrappers = new Map<string, { site: number }>()

  for (const selection of destinationSelections()) {
    tours.set(
      String(selection.tour),
      makeTour(String(selection.tour), {
        destinationTags: [selection.key],
        ...tourOverrides[String(selection.tour)],
      }),
    )
  }

  for (const selection of styleSelections()) {
    tours.set(
      String(selection.tour),
      makeTour(String(selection.tour), {
        travelStyles: [selection.key],
        ...tourOverrides[String(selection.tour)],
      }),
    )
  }

  for (const selection of featuredSelections()) {
    tours.set(String(selection.tour), makeTour(String(selection.tour), tourOverrides[String(selection.tour)]))
  }

  for (const [id, tour] of tours) {
    if (tour.wrapperPage) {
      wrappers.set(String(tour.wrapperPage), {
        site: tourOverrides[String(tour.wrapperPage)]?.site ?? pageSiteID,
      })
    }
    tours.set(id, tour)
  }

  return {
    findByID: vi.fn(
      async ({ collection, id }: { collection: 'pages' | 'tour-products'; id: number | string }) => {
        if (collection === 'tour-products') return tours.get(String(id))
        if (collection === 'pages') return wrappers.get(String(id))
        throw new Error(`Unexpected collection ${collection}`)
      },
    ),
  }
}

const runHook = ({
  context,
  data = validData(),
  payload = buildPayload(),
}: {
  context?: Record<string, unknown>
  data?: ReturnType<typeof validData>
  payload?: ReturnType<typeof buildPayload>
} = {}) =>
  validateWingsSideHomeCuration({
    collection: {} as never,
    context: {},
    data,
    operation: 'update',
    originalDoc: undefined,
    req: {
      context,
      payload,
    } as never,
  })

describe('validateWingsSideHomeCuration script bypass', () => {
  it('allows only the dedicated WingSide localization backfill marker to skip eligibility checks', async () => {
    const payload = buildPayload()
    const data = validData({
      destinationTourSelections: [{ key: 'hanoi', tour: 491 }],
      featuredJourneySelections: [{ tour: 491 }],
      styleTourSelections: [{ key: 'family', tour: 491 }],
    })

    await expect(
      runHook({
        context: wingsSideLocalizationBackfillContext,
        data,
        payload,
      }),
    ).resolves.toMatchObject({
      wingsSideHiFi: {
        routeVariant: 'home',
      },
    })
    expect(payload.findByID).not.toHaveBeenCalled()
  })

  it('does not treat generic seed context as a curation opt-out', async () => {
    const payload = buildPayload({
      [`destination-${WINGSSIDE_HOME_DESTINATION_SELECTION_KEYS[0]}`]: { site: 99 },
    })

    await expect(runHook({ context: { seed: true }, payload })).rejects.toThrow(
      /belongs to another site/,
    )
  })
})

describe('validateWingsSideHomeCuration negative eligibility cases', () => {
  it('rejects a selected tour from another site', async () => {
    const payload = buildPayload({
      [`destination-${WINGSSIDE_HOME_DESTINATION_SELECTION_KEYS[0]}`]: { site: 99 },
    })

    await expect(runHook({ payload })).rejects.toThrow(/belongs to another site/)
  })

  it('rejects a selected tour that is not published', async () => {
    const payload = buildPayload({
      [`destination-${WINGSSIDE_HOME_DESTINATION_SELECTION_KEYS[0]}`]: { _status: 'draft' },
    })

    await expect(runHook({ payload })).rejects.toThrow(/must be published/)
  })

  it('rejects a destination selection with the wrong taxonomy', async () => {
    const payload = buildPayload({
      [`destination-${WINGSSIDE_HOME_DESTINATION_SELECTION_KEYS[0]}`]: { destinationTags: ['mekong'] },
    })

    await expect(runHook({ payload })).rejects.toThrow(/does not match destinationTags/)
  })

  it('rejects incomplete keyed selections', async () => {
    const home = validHome()
    home.destinationTourSelections = home.destinationTourSelections?.slice(1)

    await expect(runHook({ data: validData(home) })).rejects.toThrow(
      /Destination tour selections must contain exactly/,
    )
  })

  it('rejects duplicate featured tour selections', async () => {
    const home = validHome()
    home.featuredJourneySelections = [{ tour: 'featured-1' }, { tour: 'featured-1' }, { tour: 'featured-2' }]

    await expect(runHook({ data: validData(home) })).rejects.toThrow(
      /must not repeat a TourProduct/,
    )
  })

  it('rejects selected tours without a wrapper page', async () => {
    const payload = buildPayload({
      [`destination-${WINGSSIDE_HOME_DESTINATION_SELECTION_KEYS[0]}`]: { wrapperPage: '' },
    })

    await expect(runHook({ payload })).rejects.toThrow(/missing a Page wrapper/)
  })
})
