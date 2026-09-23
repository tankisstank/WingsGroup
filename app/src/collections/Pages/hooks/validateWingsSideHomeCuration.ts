import type { CollectionBeforeChangeHook } from 'payload'

import { normalizeRelationID as relationID } from '@/access/roles'
import type { RelationValue } from '@/types/auth'
import { hasWingsSideLocalizationBackfillContext } from '@/utilities/wingsSideLocalizationBackfillContext'
import {
  WINGSSIDE_HOME_DESTINATION_SELECTION_KEYS,
  WINGSSIDE_HOME_STYLE_SELECTION_KEYS,
  WINGSSIDE_WHY_TRAVEL_SLOT_KEYS,
} from '@/fields/wingsSideHiFi'

type Relation = RelationValue

type Selection = {
  key?: string | null
  tour?: Relation
}

type FeaturedSelection = {
  tour?: Relation
}

type WhyTravelSlot = {
  fallbackTour?: Relation
  key?: string | null
  rule?: { destinationTag?: string | null; maxDurationDays?: number | null; minDurationDays?: number | null; travelStyle?: string | null }
  selectionMode?: string | null
  tour?: Relation
}

type HomeCuration = {
  destinationTourSelections?: Selection[] | null
  featuredJourneySelections?: FeaturedSelection[] | null
  styleTourSelections?: Selection[] | null
  whyTourSlots?: WhyTravelSlot[] | null
}

type PageWithHomeCuration = {
  site?: Relation
  wingsSideHiFi?: {
    enabled?: boolean | null
    home?: HomeCuration | null
    routeVariant?: string | null
  } | null
}

const hasText = (value: unknown): boolean => {
  if (typeof value === 'string') return value.trim().length > 0
  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).some((item) => hasText(item))
  }
  return false
}

const mergeHome = (
  data: PageWithHomeCuration,
  originalDoc: PageWithHomeCuration | undefined,
): HomeCuration | undefined => {
  const originalHome = originalDoc?.wingsSideHiFi?.home
  const nextHome = data.wingsSideHiFi?.home

  if (!originalHome && !nextHome) return undefined

  return {
    ...originalHome,
    ...nextHome,
  }
}

const hasAnyCurationSelection = (home: HomeCuration | undefined): boolean =>
  Boolean(
    home?.destinationTourSelections?.length ||
      home?.styleTourSelections?.length ||
      home?.featuredJourneySelections?.length ||
      home?.whyTourSlots?.length,
  )

const assertExactKeyedSelections = ({
  expectedKeys,
  label,
  selections,
}: {
  expectedKeys: readonly string[]
  label: string
  selections: Selection[] | null | undefined
}) => {
  if (!Array.isArray(selections) || selections.length !== expectedKeys.length) {
    throw new Error(`${label} must contain exactly ${expectedKeys.length} selections.`)
  }

  const keys = selections.map((selection) => selection?.key)
  if (keys.some((key) => typeof key !== 'string' || !expectedKeys.includes(key))) {
    throw new Error(`${label} contains an unknown taxonomy key.`)
  }
  if (new Set(keys).size !== keys.length) {
    throw new Error(`${label} taxonomy keys must be unique.`)
  }
  if (expectedKeys.some((key) => !keys.includes(key))) {
    throw new Error(`${label} is missing an approved taxonomy key.`)
  }
  if (selections.some((selection) => !relationID(selection?.tour))) {
    throw new Error(`${label} requires a TourProduct for every selection.`)
  }
}

const assertFeaturedSelections = (selections: FeaturedSelection[] | null | undefined) => {
  if (!Array.isArray(selections) || selections.length !== 3) {
    throw new Error('Featured journey selections must contain exactly 3 tours.')
  }

  const tourIDs = selections.map((selection) => relationID(selection?.tour))
  if (tourIDs.some((tourID) => !tourID)) {
    throw new Error('Featured journey selections require a TourProduct for every selection.')
  }
  if (new Set(tourIDs.map(String)).size !== tourIDs.length) {
    throw new Error('Featured journey selections must not repeat a TourProduct.')
  }
}

const assertWhyTravelSlots = (selections: WhyTravelSlot[] | null | undefined) => {
  if (!Array.isArray(selections) || selections.length !== WINGSSIDE_WHY_TRAVEL_SLOT_KEYS.length) {
    throw new Error('Why Travel must contain exactly 4 stable slots.')
  }
  const keys = selections.map((selection) => selection?.key)
  if (
    keys.some((key) => typeof key !== 'string' || !WINGSSIDE_WHY_TRAVEL_SLOT_KEYS.includes(key as never)) ||
    new Set(keys).size !== keys.length
  ) {
    throw new Error('Why Travel slots must use each approved role exactly once.')
  }
  for (const selection of selections) {
    if (selection.selectionMode === 'rule') {
      const rule = selection.rule
      if (!rule || (!rule.destinationTag && !rule.travelStyle && !rule.minDurationDays && !rule.maxDurationDays)) {
        throw new Error(`Why Travel slot ${selection.key} requires a governed rule.`)
      }
      if (rule.destinationTag && !WINGSSIDE_HOME_DESTINATION_SELECTION_KEYS.includes(rule.destinationTag as never)) {
        throw new Error(`Why Travel slot ${selection.key} has an unknown destination tag.`)
      }
      if (rule.travelStyle && !WINGSSIDE_HOME_STYLE_SELECTION_KEYS.includes(rule.travelStyle as never)) {
        throw new Error(`Why Travel slot ${selection.key} has an unknown travel style.`)
      }
      if (rule.minDurationDays && rule.maxDurationDays && rule.minDurationDays > rule.maxDurationDays) {
        throw new Error(`Why Travel slot ${selection.key} has an invalid duration range.`)
      }
    } else if (!relationID(selection.tour)) {
      throw new Error(`Why Travel slot ${selection.key} requires a manual TourProduct.`)
    }
  }
}

const assertEligibleTour = async ({
  expectedTaxonomyKey,
  pageSiteID,
  req,
  taxonomyField,
  tourID,
}: {
  expectedTaxonomyKey?: string
  pageSiteID: number | string
  req: Parameters<CollectionBeforeChangeHook>[0]['req']
  taxonomyField?: 'destinationTags' | 'travelStyles'
  tourID: number | string
}) => {
  const tour = await req.payload.findByID({
    collection: 'tour-products',
    depth: 0,
    id: tourID,
    overrideAccess: true,
    req,
  })

  if (String(relationID(tour.site as Relation)) !== String(pageSiteID)) {
    throw new Error(`TourProduct ${tourID} belongs to another site.`)
  }
  if (tour._status !== 'published') {
    throw new Error(`TourProduct ${tourID} must be published.`)
  }
  if (
    !hasText(tour.title) ||
    !hasText(tour.summary) ||
    !relationID(tour.heroMedia as Relation) ||
    typeof tour.durationDays !== 'number' ||
    tour.durationDays <= 0
  ) {
    throw new Error(`TourProduct ${tourID} is missing title, summary, duration, or hero media.`)
  }

  const wrapperPageID = relationID(tour.wrapperPage as Relation)
  if (!wrapperPageID) {
    throw new Error(`TourProduct ${tourID} is missing a Page wrapper.`)
  }
  const wrapperPage = await req.payload.findByID({
    collection: 'pages',
    depth: 0,
    id: wrapperPageID,
    overrideAccess: true,
    req,
  })
  if (String(relationID(wrapperPage.site as Relation)) !== String(pageSiteID)) {
    throw new Error(`TourProduct ${tourID} has a wrapper Page from another site.`)
  }

  if (expectedTaxonomyKey && taxonomyField) {
    const values = tour[taxonomyField]
    if (!Array.isArray(values) || !values.includes(expectedTaxonomyKey as never)) {
      throw new Error(`TourProduct ${tourID} does not match ${taxonomyField} ${expectedTaxonomyKey}.`)
    }
  }
}

/**
 * Enforces curation eligibility on the server. It intentionally activates only
 * once one of the new selections is supplied, allowing the existing Home record
 * to be edited until WP4 applies the complete initial curation in one write.
 */
export const validateWingsSideHomeCuration: CollectionBeforeChangeHook = async ({
  data,
  originalDoc,
  req,
}) => {
  if (hasWingsSideLocalizationBackfillContext(req.context)) {
    return data
  }

  const next = data as PageWithHomeCuration
  const original = originalDoc as PageWithHomeCuration | undefined
  const enabled = next.wingsSideHiFi?.enabled ?? original?.wingsSideHiFi?.enabled
  const routeVariant = next.wingsSideHiFi?.routeVariant ?? original?.wingsSideHiFi?.routeVariant
  const home = mergeHome(next, original)

  if (!enabled || routeVariant !== 'home' || !hasAnyCurationSelection(home)) {
    return data
  }

  const pageSiteID = relationID(next.site ?? original?.site)
  if (!pageSiteID) {
    throw new Error('WingSide Home curation requires a site.')
  }

  assertExactKeyedSelections({
    expectedKeys: WINGSSIDE_HOME_DESTINATION_SELECTION_KEYS,
    label: 'Destination tour selections',
    selections: home?.destinationTourSelections,
  })
  assertExactKeyedSelections({
    expectedKeys: WINGSSIDE_HOME_STYLE_SELECTION_KEYS,
    label: 'Style tour selections',
    selections: home?.styleTourSelections,
  })
  assertFeaturedSelections(home?.featuredJourneySelections)
  if (home?.whyTourSlots?.length) assertWhyTravelSlots(home.whyTourSlots)

  await Promise.all([
    ...(home?.destinationTourSelections || []).map((selection) =>
      assertEligibleTour({
        expectedTaxonomyKey: selection.key || undefined,
        pageSiteID,
        req,
        taxonomyField: 'destinationTags',
        tourID: relationID(selection.tour)!,
      }),
    ),
    ...(home?.styleTourSelections || []).map((selection) =>
      assertEligibleTour({
        expectedTaxonomyKey: selection.key || undefined,
        pageSiteID,
        req,
        taxonomyField: 'travelStyles',
        tourID: relationID(selection.tour)!,
      }),
    ),
    ...(home?.featuredJourneySelections || []).map((selection) =>
      assertEligibleTour({
        pageSiteID,
        req,
        tourID: relationID(selection.tour)!,
      }),
    ),
    ...(home?.whyTourSlots || []).flatMap((selection) => {
      if (selection.selectionMode === 'rule') {
        const fallbackTourID = relationID(selection.fallbackTour)
        return fallbackTourID ? [assertEligibleTour({ pageSiteID, req, tourID: fallbackTourID })] : []
      }
      return [assertEligibleTour({ pageSiteID, req, tourID: relationID(selection.tour)! })]
    }),
  ])

  return data
}
