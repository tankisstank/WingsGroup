import { getPageCanonicalPath } from '@/utilities/siteURLs'
import type { Site } from '@/payload-types'
import type { Payload } from 'payload'
import {
  WINGSSIDE_HOME_DESTINATION_SELECTION_KEYS,
  WINGSSIDE_HOME_STYLE_SELECTION_KEYS,
} from '@/fields/wingsSideHiFi'

type RelationID = number | string
type Relation = RelationID | { id?: RelationID | null } | null | undefined
type PayloadLocale = Site['defaultLocale']

const payloadLocales = ['vi', 'en', 'it', 'es', 'pt', 'ja', 'ko', 'fr', 'de'] as const

const asPayloadLocale = (value: null | string | undefined): PayloadLocale | undefined =>
  payloadLocales.includes(value as PayloadLocale) ? (value as PayloadLocale) : undefined

type CurationPage = { pathname?: null | string; site?: Relation; slug?: null | string }
type CurationMedia = { alt?: null | string; url?: null | string }
type CurationTour = {
  _status?: null | string
  currency?: null | string
  destinationTags?: null | string[]
  durationDays?: null | number
  durationNights?: null | number
  heroMedia?: CurationMedia | Relation
  id?: RelationID
  priceFrom?: null | number
  site?: Relation
  summary?: null | string
  title?: null | string
  travelStyles?: null | string[]
  wrapperPage?: CurationPage | Relation
}
type KeyedSelection = { key?: null | string; tour?: CurationTour | Relation }
type FeaturedSelection = { tour?: CurationTour | Relation }
export type HomeCurationSource = {
  destinationTourSelections?: KeyedSelection[] | null
  featuredJourneySelections?: FeaturedSelection[] | null
  styleTourSelections?: KeyedSelection[] | null
}

export const hydrateWingsSideHomeCuration = async ({
  home,
  locale,
  pageSite,
  payload,
}: {
  home?: HomeCurationSource | null
  locale?: null | string
  pageSite: Relation
  payload: Payload
}): Promise<HomeCurationSource | null | undefined> => {
  const siteID = relationID(pageSite)
  const payloadLocale = asPayloadLocale(locale)
  const selections = [
    ...(home?.destinationTourSelections || []),
    ...(home?.styleTourSelections || []),
    ...(home?.featuredJourneySelections || []),
  ]
  const tourIDs = [
    ...new Set(
      selections
        .map((selection) => relationID(selection.tour as Relation))
        .filter((id): id is RelationID => id != null),
    ),
  ]

  if (!siteID || tourIDs.length === 0) return home

  const result = await payload.find({
    collection: 'tour-products',
    depth: 2,
    fallbackLocale: 'en',
    limit: tourIDs.length,
    locale: payloadLocale,
    overrideAccess: true,
    pagination: false,
    where: {
      and: [
        { id: { in: tourIDs } },
        { site: { equals: siteID } },
        { _status: { equals: 'published' } },
      ],
    },
  })
  const wrapperIDs = [
    ...new Set(
      result.docs
        .map((tour) => relationID(tour.wrapperPage as Relation))
        .filter((id): id is RelationID => id != null),
    ),
  ]
  const mediaIDs = [
    ...new Set(
      result.docs
        .map((tour) => relationID(tour.heroMedia as Relation))
        .filter((id): id is RelationID => id != null),
    ),
  ]
  const [wrappers, media] = await Promise.all([
    payload.find({
      collection: 'pages',
      depth: 0,
      limit: Math.max(wrapperIDs.length, 1),
      locale: payloadLocale,
      overrideAccess: true,
      pagination: false,
      where: {
        and: [{ id: { in: wrapperIDs } }, { site: { equals: siteID } }],
      },
    }),
    payload.find({
      collection: 'media',
      depth: 0,
      fallbackLocale: 'en',
      limit: Math.max(mediaIDs.length, 1),
      locale: payloadLocale,
      overrideAccess: true,
      pagination: false,
      where: {
        and: [{ id: { in: mediaIDs } }, { site: { equals: siteID } }],
      },
    }),
  ])
  const wrappersByID = new Map(wrappers.docs.map((wrapper) => [String(wrapper.id), wrapper]))
  const mediaByID = new Map(media.docs.map((item) => [String(item.id), item]))
  const toursByID = new Map(
    result.docs.map((tour) => {
      const wrapperID = relationID(tour.wrapperPage as Relation)
      const mediaID = relationID(tour.heroMedia as Relation)
      return [
        String(tour.id),
        {
          ...tour,
          heroMedia: mediaID == null ? tour.heroMedia : mediaByID.get(String(mediaID)),
          wrapperPage:
            wrapperID == null ? tour.wrapperPage : wrappersByID.get(String(wrapperID)),
        },
      ]
    }),
  )
  const hydrateTour = (value: CurationTour | Relation) => {
    const id = relationID(value as Relation)
    return id == null ? value : toursByID.get(String(id)) || value
  }

  return {
    destinationTourSelections: home?.destinationTourSelections?.map((selection) => ({
      ...selection,
      tour: hydrateTour(selection.tour),
    })),
    featuredJourneySelections: home?.featuredJourneySelections?.map((selection) => ({
      ...selection,
      tour: hydrateTour(selection.tour),
    })),
    styleTourSelections: home?.styleTourSelections?.map((selection) => ({
      ...selection,
      tour: hydrateTour(selection.tour),
    })),
  }
}

export type WingsSideHomeTourPrice =
  | { kind: 'from'; value: number; currency: string }
  | { kind: 'on-request'; label: 'On request' }

export type WingsSideHomeTourCard = {
  duration: { days: number; nights: number | null }
  hero: { alt: string; url: string }
  href: string
  id: RelationID
  price: WingsSideHomeTourPrice
  summary: string
  title: string
}

/** A destination/style card retains the CMS-selected taxonomy key. */
export type WingsSideHomeKeyedTourCard = WingsSideHomeTourCard & {
  key: string
}

export type WingsSideHomeCurationProjection = {
  destinationTours: ReadonlyArray<WingsSideHomeKeyedTourCard>
  featuredJourneys: ReadonlyArray<WingsSideHomeTourCard>
  issues: ReadonlyArray<string>
  state: 'invalid' | 'ready' | 'unconfigured'
  styleTours: ReadonlyArray<WingsSideHomeKeyedTourCard>
}

const relationID = (value: Relation): RelationID | null => {
  if (typeof value === 'number' || typeof value === 'string') return value
  if (value && (typeof value.id === 'number' || typeof value.id === 'string')) return value.id
  return null
}

const asTour = (value: KeyedSelection['tour'] | FeaturedSelection['tour']): CurationTour | null =>
  value && typeof value === 'object' && 'title' in value ? (value as CurationTour) : null

const asPage = (value: CurationTour['wrapperPage']): CurationPage | null =>
  value && typeof value === 'object' && ('pathname' in value || 'slug' in value) ? value : null

const asMedia = (value: CurationTour['heroMedia']): CurationMedia | null =>
  value && typeof value === 'object' && 'url' in value ? (value as CurationMedia) : null

const nonEmpty = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0

const sameRelation = (left: Relation, right: Relation): boolean => {
  const leftID = relationID(left)
  const rightID = relationID(right)
  return leftID != null && rightID != null && String(leftID) === String(rightID)
}

const projectTour = ({
  expectedKey,
  locale,
  pageSite,
  taxonomyField,
  value,
}: {
  expectedKey?: string
  locale?: null | string
  pageSite: Relation
  taxonomyField?: 'destinationTags' | 'travelStyles'
  value: KeyedSelection['tour'] | FeaturedSelection['tour']
}): { card?: WingsSideHomeTourCard; issue?: string } => {
  const tour = asTour(value)
  const tourID = tour ? relationID(tour.id) : null
  if (!tour || tourID == null) return { issue: 'Selected tour is not populated.' }
  if (tour._status !== 'published') return { issue: `Tour ${tour.id} is not published.` }
  if (!sameRelation(tour.site, pageSite)) return { issue: `Tour ${tour.id} belongs to another site.` }
  if (!nonEmpty(tour.title) || !nonEmpty(tour.summary)) return { issue: `Tour ${tour.id} is missing title or summary.` }
  if (typeof tour.durationDays !== 'number' || tour.durationDays <= 0) {
    return { issue: `Tour ${tour.id} is missing a valid duration.` }
  }

  const wrapperPage = asPage(tour.wrapperPage)
  if (!wrapperPage || !sameRelation(wrapperPage.site, pageSite)) {
    return { issue: `Tour ${tour.id} has no same-site wrapper Page.` }
  }
  const wrapperPathname = wrapperPage.pathname?.trim()
  const wrapperSlug = wrapperPage.slug?.trim()
  if (
    (!wrapperPathname || wrapperPathname === '/') &&
    (!wrapperSlug || wrapperSlug.toLowerCase() === 'home')
  ) {
    return { issue: `Tour ${tour.id} wrapper Page has no usable non-root route.` }
  }
  const heroMedia = asMedia(tour.heroMedia)
  if (!heroMedia || !nonEmpty(heroMedia.url)) return { issue: `Tour ${tour.id} is missing hero media.` }
  if (expectedKey && taxonomyField && !tour[taxonomyField]?.includes(expectedKey)) {
    return { issue: `Tour ${tour.id} does not match ${taxonomyField} ${expectedKey}.` }
  }

  const price: WingsSideHomeTourPrice =
    typeof tour.priceFrom === 'number' && Number.isFinite(tour.priceFrom) && nonEmpty(tour.currency)
      ? { kind: 'from', value: tour.priceFrom, currency: tour.currency.trim() }
      : { kind: 'on-request', label: 'On request' }
  return {
    card: {
      duration: {
        days: tour.durationDays,
        nights:
          typeof tour.durationNights === 'number' && tour.durationNights >= 0
            ? tour.durationNights
            : null,
      },
      hero: { alt: heroMedia.alt?.trim() || tour.title.trim(), url: heroMedia.url.trim() },
      href: getPageCanonicalPath(wrapperPage, locale),
      id: tourID,
      price,
      summary: tour.summary.trim(),
      title: tour.title.trim(),
    },
  }
}

const projectKeyedSelections = ({
  expectedKeys,
  locale,
  pageSite,
  selections,
  taxonomyField,
}: {
  expectedKeys: readonly string[]
  locale?: null | string
  pageSite: Relation
  selections: KeyedSelection[] | null | undefined
  taxonomyField: 'destinationTags' | 'travelStyles'
}) => {
  if (!Array.isArray(selections) || selections.length === 0) {
    return { cards: [] as WingsSideHomeKeyedTourCard[], issues: [] as string[], isConfigured: false }
  }
  const cards: WingsSideHomeKeyedTourCard[] = []
  const issues: string[] = []
  const keys = selections.map((selection) => selection?.key)
  if (
    selections.length !== expectedKeys.length ||
    keys.some((key) => !nonEmpty(key) || !expectedKeys.includes(key)) ||
    new Set(keys).size !== keys.length ||
    expectedKeys.some((key) => !keys.includes(key))
  ) {
    return {
      cards,
      issues: ['Curated taxonomy selections are incomplete, duplicated, or contain an unknown key.'],
      isConfigured: true,
    }
  }
  for (const selection of selections) {
    if (!nonEmpty(selection?.key)) {
      issues.push('A curated taxonomy selection has no key.')
      continue
    }
    const projected = projectTour({ expectedKey: selection.key, locale, pageSite, taxonomyField, value: selection.tour })
    if (projected.card) cards.push({ ...projected.card, key: selection.key })
    if (projected.issue) issues.push(projected.issue)
  }
  return { cards: issues.length ? [] : cards, issues, isConfigured: true }
}

const projectFeaturedSelections = ({ locale, pageSite, selections }: {
  locale?: null | string
  pageSite: Relation
  selections: FeaturedSelection[] | null | undefined
}) => {
  if (!Array.isArray(selections) || selections.length === 0) {
    return { cards: [] as WingsSideHomeTourCard[], issues: [] as string[], isConfigured: false }
  }
  const cards: WingsSideHomeTourCard[] = []
  const issues: string[] = []
  const tourIDs = selections.map((selection) => relationID(selection?.tour as Relation))
  if (selections.length !== 3 || tourIDs.some((id) => id == null) || new Set(tourIDs.map(String)).size !== tourIDs.length) {
    return {
      cards,
      issues: ['Featured journey selections are incomplete or duplicate a tour.'],
      isConfigured: true,
    }
  }
  for (const selection of selections) {
    const projected = projectTour({ locale, pageSite, value: selection?.tour })
    if (projected.card) cards.push(projected.card)
    if (projected.issue) issues.push(projected.issue)
  }
  return { cards: issues.length ? [] : cards, issues, isConfigured: true }
}

/**
 * Converts populated Payload Home curation relationships into the rendering contract.
 * Any incomplete or cross-tenant selection fails closed; callers must never substitute
 * static sample cards for the empty collection.
 */
export const projectWingsSideHomeCuration = ({ home, locale, pageSite }: {
  home?: HomeCurationSource | null
  locale?: null | string
  pageSite: Relation
}): WingsSideHomeCurationProjection => {
  const destinations = projectKeyedSelections({ expectedKeys: WINGSSIDE_HOME_DESTINATION_SELECTION_KEYS, locale, pageSite, selections: home?.destinationTourSelections, taxonomyField: 'destinationTags' })
  const styles = projectKeyedSelections({ expectedKeys: WINGSSIDE_HOME_STYLE_SELECTION_KEYS, locale, pageSite, selections: home?.styleTourSelections, taxonomyField: 'travelStyles' })
  const featured = projectFeaturedSelections({ locale, pageSite, selections: home?.featuredJourneySelections })
  const issues = [...destinations.issues, ...styles.issues, ...featured.issues]
  if (!destinations.isConfigured || !styles.isConfigured || !featured.isConfigured) {
    issues.push('WingSide Home curation is not fully configured.')
  }
  const invalid = issues.length > 0
  return {
    destinationTours: invalid ? [] : destinations.cards,
    featuredJourneys: invalid ? [] : featured.cards,
    issues,
    state: invalid ? 'invalid' : 'ready',
    styleTours: invalid ? [] : styles.cards,
  }
}
