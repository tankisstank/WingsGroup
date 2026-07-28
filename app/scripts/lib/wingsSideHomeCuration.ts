import type {
  WingsSideHomeDestinationSelectionKey,
  WingsSideHomeStyleSelectionKey,
} from '../../src/fields/wingsSideHiFi'

export const wingsSideHomeCurationSiteCode = 'wing-side'

export const wingsSideHomeDestinationSelections = [
  { key: 'hanoi', sourceId: 'vietnam-tours--best-of-northern-vietnam-6-days', tour: 491 },
  { key: 'halong', sourceId: 'halong-bay-tours--discover-halong-bay-ninh-binh-2-days', tour: 226 },
  { key: 'hoian', sourceId: 'vietnam-tours--hoi-an-surrounding-and-beach-break-7days', tour: 506 },
  { key: 'hue', sourceId: 'vietnam-tours--a-glimpse-of-the-central-vietnam-5-days', tour: 486 },
  { key: 'mekong', sourceId: 'mekong-delta-tours--luxury-mekong-delta-speedboat-tour-full-day', tour: 326 },
  { key: 'sapa', sourceId: 'sapa-tours--sapa-trekking-ethnic-market-3-days', tour: 442 },
] as const satisfies readonly {
  key: WingsSideHomeDestinationSelectionKey
  sourceId: string
  tour: number
}[]

export const wingsSideHomeStyleSelections = [
  { key: 'luxury', sourceId: 'vietnam-tours--vietnam-luxury-wellness-retreat-escape-8-days', tour: 533 },
  { key: 'family', sourceId: 'vietnam-tours--northern-vietnam-highlights-for-family-6-days', tour: 517 },
  { key: 'culture', sourceId: 'vietnam-tours--highlights-of-vietnam-12-days', tour: 504 },
  { key: 'adventure', sourceId: 'vietnam-tours--northern-vietnam-soft-adventure-8-days', tour: 518 },
  { key: 'wellness', sourceId: 'vietnam-tours--deep-in-love-in-phu-quoc-5-days', tour: 498 },
  { key: 'romance', sourceId: 'vietnam-tours--vietnam-memorable-honeymoon-trip-8-days', tour: 534 },
] as const satisfies readonly {
  key: WingsSideHomeStyleSelectionKey
  sourceId: string
  tour: number
}[]

export const wingsSideHomeFeaturedSelections = [
  { sourceId: 'vietnam-tours--highlights-of-vietnam-12-days', tour: 504 },
  { sourceId: 'vietnam-tours--best-of-northern-vietnam-6-days', tour: 491 },
  { sourceId: 'vietnam-tours--a-glimpse-of-the-central-vietnam-5-days', tour: 486 },
] as const

/** Approved US-055 mapping. IDs are resolved from stable importer source IDs at apply time. */
export const wingsSideWhyTravelSelections = [
  { key: 'local-design', sourceId: 'vietnam-tours--best-of-northern-vietnam-6-days', tour: 491 },
  { key: 'flexible-planning', sourceId: 'vietnam-tours--northern-vietnam-highlights-for-family-6-days', tour: 517 },
  { key: 'style-matching', sourceId: 'vietnam-tours--vietnam-luxury-wellness-retreat-escape-8-days', tour: 533 },
  { key: 'collaborative-care', sourceId: 'vietnam-tours--highlights-of-vietnam-12-days', tour: 504 },
] as const

export type WingSideHomeCuration = {
  destinationTourSelections: Array<{ key: WingsSideHomeDestinationSelectionKey; tour: number }>
  featuredJourneySelections: Array<{ tour: number }>
  styleTourSelections: Array<{ key: WingsSideHomeStyleSelectionKey; tour: number }>
  whyTourSlots: Array<{ key: (typeof wingsSideWhyTravelSelections)[number]['key']; selectionMode: 'manual'; tour: number }>
}

export const wingsSideHomeCuration: WingSideHomeCuration = {
  destinationTourSelections: wingsSideHomeDestinationSelections.map(({ key, tour }) => ({
    key,
    tour,
  })),
  featuredJourneySelections: wingsSideHomeFeaturedSelections.map(({ tour }) => ({ tour })),
  styleTourSelections: wingsSideHomeStyleSelections.map(({ key, tour }) => ({ key, tour })),
  whyTourSlots: wingsSideWhyTravelSelections.map(({ key, tour }) => ({
    key,
    selectionMode: 'manual' as const,
    tour,
  })),
}

export const wingsSideHomeCurationSourceIDs = [
  ...new Set([
    ...wingsSideHomeDestinationSelections.map(({ sourceId }) => sourceId),
    ...wingsSideHomeStyleSelections.map(({ sourceId }) => sourceId),
    ...wingsSideHomeFeaturedSelections.map(({ sourceId }) => sourceId),
    ...wingsSideWhyTravelSelections.map(({ sourceId }) => sourceId),
  ]),
]

export const resolveWingsSideHomeCuration = (
  sourceIDToTourID: ReadonlyMap<string, number | string>,
): WingSideHomeCuration => {
  const resolveTour = (sourceId: string) => {
    const tour = sourceIDToTourID.get(sourceId)
    if (tour === undefined) {
      throw new Error(`Approved WingSide Home tour source ${sourceId} is missing.`)
    }
    return Number(tour)
  }
  return {
    destinationTourSelections: wingsSideHomeDestinationSelections.map(({ key, sourceId }) => ({
      key,
      tour: resolveTour(sourceId),
    })),
    featuredJourneySelections: wingsSideHomeFeaturedSelections.map(({ sourceId }) => ({
      tour: resolveTour(sourceId),
    })),
    styleTourSelections: wingsSideHomeStyleSelections.map(({ key, sourceId }) => ({
      key,
      tour: resolveTour(sourceId),
    })),
    whyTourSlots: wingsSideWhyTravelSelections.map(({ key, sourceId }) => ({
      key,
      selectionMode: 'manual' as const,
      tour: resolveTour(sourceId),
    })),
  }
}

type Relation = number | string | { id?: number | string | null } | null | undefined

export const relationID = (value: Relation): number | string | null => {
  if (typeof value === 'number' || typeof value === 'string') return value
  return value?.id ?? null
}

export type CurationTourAuditRecord = {
  _status?: null | string
  destinationTags?: null | string[]
  durationDays?: null | number
  heroMedia?: Relation
  id: number | string
  site?: Relation
  summary?: null | string
  title?: null | string
  travelStyles?: null | string[]
  wrapperPage?: Relation
}

export type CurationAuditInput = {
  actual?: Partial<WingSideHomeCuration> | null
  approved?: WingSideHomeCuration
  homePage: { id: number | string; site?: Relation; wingsSideHiFi?: { enabled?: boolean | null; routeVariant?: string | null } | null }
  mediaIDs: ReadonlySet<string>
  siteID: number | string
  tours: ReadonlyMap<string, CurationTourAuditRecord>
  wrapperSiteIDs: ReadonlyMap<string, number | string>
}

const isText = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0

const sameID = (left: number | string | null, right: number | string | null) =>
  left !== null && right !== null && String(left) === String(right)

const sameCuration = (
  actual: Partial<WingSideHomeCuration> | null | undefined,
  approved: WingSideHomeCuration,
) => {
  const destinationTourSelections = (actual?.destinationTourSelections || []).map(({ key, tour }) => ({
    key,
    tour: relationID(tour),
  }))
  const styleTourSelections = (actual?.styleTourSelections || []).map(({ key, tour }) => ({
    key,
    tour: relationID(tour),
  }))
  const featuredJourneySelections = (actual?.featuredJourneySelections || []).map(({ tour }) => ({
    tour: relationID(tour),
  }))
  return (
    JSON.stringify(destinationTourSelections) === JSON.stringify(approved.destinationTourSelections) &&
    JSON.stringify(styleTourSelections) === JSON.stringify(approved.styleTourSelections) &&
    JSON.stringify(featuredJourneySelections) === JSON.stringify(approved.featuredJourneySelections)
  )
}

export const auditWingsSideHomeCuration = ({
  actual,
  approved = wingsSideHomeCuration,
  homePage,
  mediaIDs,
  siteID,
  tours,
  wrapperSiteIDs,
}: CurationAuditInput) => {
  const findings: string[] = []
  if (!sameID(relationID(homePage.site), siteID)) findings.push('Home page belongs to another site.')
  if (!homePage.wingsSideHiFi?.enabled || homePage.wingsSideHiFi.routeVariant !== 'home') {
    findings.push('Resolved page is not the enabled WingSide Home page.')
  }

  const assertTour = (tourID: number, taxonomyField?: 'destinationTags' | 'travelStyles', key?: string) => {
    const tour = tours.get(String(tourID))
    if (!tour) {
      findings.push(`TourProduct ${tourID} is missing.`)
      return
    }
    if (tour._status !== 'published') findings.push(`TourProduct ${tourID} is not published.`)
    if (!sameID(relationID(tour.site), siteID)) findings.push(`TourProduct ${tourID} belongs to another site.`)
    if (!isText(tour.title) || !isText(tour.summary)) findings.push(`TourProduct ${tourID} is missing title or summary.`)
    if (typeof tour.durationDays !== 'number' || tour.durationDays <= 0) {
      findings.push(`TourProduct ${tourID} is missing a valid duration.`)
    }
    const heroID = relationID(tour.heroMedia)
    if (!heroID || !mediaIDs.has(String(heroID))) findings.push(`TourProduct ${tourID} is missing a resolvable hero media record.`)
    const wrapperID = relationID(tour.wrapperPage)
    if (!wrapperID || !sameID(wrapperSiteIDs.get(String(wrapperID)) || null, siteID)) {
      findings.push(`TourProduct ${tourID} is missing a same-site wrapper Page.`)
    }
    if (taxonomyField && key && !tour[taxonomyField]?.includes(key)) {
      findings.push(`TourProduct ${tourID} does not match ${taxonomyField} ${key}.`)
    }
  }

  for (const selection of approved.destinationTourSelections) {
    assertTour(selection.tour, 'destinationTags', selection.key)
  }
  for (const selection of approved.styleTourSelections) {
    assertTour(selection.tour, 'travelStyles', selection.key)
  }
  for (const selection of approved.featuredJourneySelections) assertTour(selection.tour)

  return {
    findings,
    homePageID: homePage.id,
    matchesApprovedSelections: sameCuration(actual, approved),
    ok: findings.length === 0,
    selectedTourIDs: [...new Set([
      ...approved.destinationTourSelections.map(({ tour }) => tour),
      ...approved.styleTourSelections.map(({ tour }) => tour),
      ...approved.featuredJourneySelections.map(({ tour }) => tour),
    ])],
  }
}
