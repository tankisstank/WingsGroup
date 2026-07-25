import type {
  WingsSideHomeDestinationSelectionKey,
  WingsSideHomeStyleSelectionKey,
} from '../../src/fields/wingsSideHiFi'

export const wingsSideHomeCurationSiteCode = 'wing-side'

export const wingsSideHomeDestinationSelections = [
  { key: 'hanoi', tour: 491 },
  { key: 'halong', tour: 226 },
  { key: 'hoian', tour: 506 },
  { key: 'hue', tour: 486 },
  { key: 'mekong', tour: 326 },
  { key: 'sapa', tour: 442 },
] as const satisfies readonly { key: WingsSideHomeDestinationSelectionKey; tour: number }[]

export const wingsSideHomeStyleSelections = [
  { key: 'luxury', tour: 533 },
  { key: 'family', tour: 517 },
  { key: 'culture', tour: 504 },
  { key: 'adventure', tour: 518 },
  { key: 'wellness', tour: 498 },
  { key: 'romance', tour: 534 },
] as const satisfies readonly { key: WingsSideHomeStyleSelectionKey; tour: number }[]

export const wingsSideHomeFeaturedSelections = [{ tour: 504 }, { tour: 491 }, { tour: 486 }] as const

export type WingSideHomeCuration = {
  destinationTourSelections: Array<{ key: WingsSideHomeDestinationSelectionKey; tour: number }>
  featuredJourneySelections: Array<{ tour: number }>
  styleTourSelections: Array<{ key: WingsSideHomeStyleSelectionKey; tour: number }>
}

export const wingsSideHomeCuration: WingSideHomeCuration = {
  destinationTourSelections: [...wingsSideHomeDestinationSelections],
  featuredJourneySelections: [...wingsSideHomeFeaturedSelections],
  styleTourSelections: [...wingsSideHomeStyleSelections],
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
  homePage: { id: number | string; site?: Relation; wingsSideHiFi?: { enabled?: boolean | null; routeVariant?: string | null } | null }
  mediaIDs: ReadonlySet<string>
  siteID: number | string
  tours: ReadonlyMap<string, CurationTourAuditRecord>
  wrapperSiteIDs: ReadonlyMap<string, number | string>
}

const isText = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0

const sameID = (left: number | string | null, right: number | string | null) =>
  left !== null && right !== null && String(left) === String(right)

const sameCuration = (actual: Partial<WingSideHomeCuration> | null | undefined) => {
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
    JSON.stringify(destinationTourSelections) === JSON.stringify(wingsSideHomeCuration.destinationTourSelections) &&
    JSON.stringify(styleTourSelections) === JSON.stringify(wingsSideHomeCuration.styleTourSelections) &&
    JSON.stringify(featuredJourneySelections) === JSON.stringify(wingsSideHomeCuration.featuredJourneySelections)
  )
}

export const auditWingsSideHomeCuration = ({
  actual,
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

  for (const selection of wingsSideHomeCuration.destinationTourSelections) {
    assertTour(selection.tour, 'destinationTags', selection.key)
  }
  for (const selection of wingsSideHomeCuration.styleTourSelections) {
    assertTour(selection.tour, 'travelStyles', selection.key)
  }
  for (const selection of wingsSideHomeCuration.featuredJourneySelections) assertTour(selection.tour)

  return {
    findings,
    homePageID: homePage.id,
    matchesApprovedSelections: sameCuration(actual),
    ok: findings.length === 0,
    selectedTourIDs: [...new Set([
      ...wingsSideHomeCuration.destinationTourSelections.map(({ tour }) => tour),
      ...wingsSideHomeCuration.styleTourSelections.map(({ tour }) => tour),
      ...wingsSideHomeCuration.featuredJourneySelections.map(({ tour }) => tour),
    ])],
  }
}
