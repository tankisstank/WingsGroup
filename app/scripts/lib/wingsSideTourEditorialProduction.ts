import crypto from 'node:crypto'

import type { Page, TourProduct } from '../../src/payload-types'
import {
  editorialSourceChecksum,
  wingsSideTourEditorialLocales,
  type EditorialTourContent,
  type WingsSideTourEditorialCatalog,
  type WingsSideTourEditorialLocale,
} from './wingsSideTourEditorialLocalization'

export const wingsSideTourEditorialSiteCode = 'wing-side'
export const wingsSideTourEditorialExpectedTourCount = 22
export const wingsSideTourEditorialPlanVersion = 3
export const wingsSideTourPublicLocales = ['en', ...wingsSideTourEditorialLocales] as const
export type WingsSideTourPublicLocale = (typeof wingsSideTourPublicLocales)[number]

export type WingsSideTourPublicInventoryFinding = {
  locale: WingsSideTourPublicLocale
  message: string
  slugs: string[]
}

export const validateWingsSideTourPublicInventory = ({
  detailSlugsByLocale,
  expectedSlugs,
  listingSlugsByLocale,
}: {
  detailSlugsByLocale: Record<WingsSideTourPublicLocale, string[]>
  expectedSlugs: string[]
  listingSlugsByLocale: Record<WingsSideTourPublicLocale, string[]>
}): WingsSideTourPublicInventoryFinding[] => {
  const findings: WingsSideTourPublicInventoryFinding[] = []
  const expected = [...new Set(expectedSlugs)].sort()
  if (
    expected.length !== wingsSideTourEditorialExpectedTourCount ||
    expected.length !== expectedSlugs.length
  ) {
    throw new Error('Public tour inventory validator requires exactly 22 unique source slugs')
  }

  for (const locale of wingsSideTourPublicLocales) {
    const listing = [...new Set(listingSlugsByLocale[locale])].sort()
    const details = [...new Set(detailSlugsByLocale[locale])].sort()
    const missingListing = expected.filter((slug) => !listing.includes(slug))
    const unexpectedListing = listing.filter((slug) => !expected.includes(slug))
    const missingDetails = expected.filter((slug) => !details.includes(slug))
    const detailAbsentFromListing = details.filter((slug) => !listing.includes(slug))

    if (missingListing.length || unexpectedListing.length) {
      findings.push({
        locale,
        message: `Public listing inventory must match all ${wingsSideTourEditorialExpectedTourCount} source tours`,
        slugs: [...missingListing, ...unexpectedListing],
      })
    }
    if (missingDetails.length) {
      findings.push({
        locale,
        message: 'Published source tour is missing a same-locale public detail',
        slugs: missingDetails,
      })
    }
    if (detailAbsentFromListing.length) {
      findings.push({
        locale,
        message: 'Public detail exists but is absent from the same-locale listing',
        slugs: detailAbsentFromListing,
      })
    }
  }
  return findings
}

export type EditorialOwnedSnapshot = {
  excludes: unknown
  factSummary: { routeSummary: unknown }
  includes: unknown
  itineraryDays: unknown
  meta: {
    breadcrumbLabel: unknown
    description: unknown
    title: unknown
  }
  primaryCTA: { label: unknown }
  servicesSummary: {
    hotelSummary: unknown
    mealsSummary: unknown
    operatorNotes: unknown
    transportSummary: unknown
  }
  summary: unknown
  title: unknown
}

export type EditorialWrapperSnapshot = {
  layout: unknown
  meta: {
    breadcrumbLabel: unknown
    description: unknown
    title: unknown
  }
  title: unknown
}

export type WingsSideTourEditorialPlanEntry = {
  after: EditorialOwnedSnapshot
  afterChecksum: string
  before: EditorialOwnedSnapshot
  beforeChecksum: string
  locale: WingsSideTourEditorialLocale
  sourceChecksum: string
  tourID: number | string
  wrapperAfter: EditorialWrapperSnapshot
  wrapperBefore: EditorialWrapperSnapshot
  wrapperPageID: number | string
  slug: string
}

export type EditorialSharedServiceSnapshot = {
  excludes: unknown
  includes: unknown
}

export type WingsSideTourEditorialSharedServiceEntry = {
  after: EditorialSharedServiceSnapshot
  afterChecksum: string
  before: EditorialSharedServiceSnapshot
  beforeChecksum: string
  slug: string
  sourceChecksum: string
  tourID: number | string
}

export type WingsSideTourEditorialPlan = {
  aggregateChecksums: { after: string; before: string }
  createdAt: string
  expectedLocales: WingsSideTourEditorialLocale[]
  expectedTourCount: 22
  mode: 'plan'
  planVersion: 3
  releaseSourceCommit: string
  runID: string
  siteCode: 'wing-side'
  siteID: number | string
  sourceManifestChecksum: string
  entries: WingsSideTourEditorialPlanEntry[]
  sharedServiceEntries: WingsSideTourEditorialSharedServiceEntry[]
}

type Relation = null | number | string | undefined | { id?: number | string }

const cloneJSON = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

export const editorialStableJSONStringify = (value: unknown): string => {
  if (value === undefined) return '"__undefined__"'
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) {
    return `[${value.map((item) => editorialStableJSONStringify(item)).join(',')}]`
  }
  const record = value as Record<string, unknown>
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${editorialStableJSONStringify(record[key])}`)
    .join(',')}}`
}

export const editorialChecksum = (value: unknown): string =>
  crypto.createHash('sha256').update(editorialStableJSONStringify(value)).digest('hex')

export const editorialRelationID = (value: Relation): null | number | string => {
  if (typeof value === 'number' || typeof value === 'string') return value
  return value?.id ?? null
}

const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}

const array = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value) ? value.map(record) : []

const serviceRowID = (value: Record<string, unknown>): number | string => {
  const id = value.id
  if (typeof id !== 'number' && (typeof id !== 'string' || !id.trim())) {
    throw new Error('Editorial service row is missing a stable ID')
  }
  return id
}

const peakServicePattern = /\b(?:peak|high) season\b|\bfuel surcharge\b|\bcompulsory dinner\b/iu
const excludedServicePattern =
  /\bearly check[ -]?in\b|\blate check[ -]?out\b|\btransport to or from vietnam\b|\binternational (?:flights?|or departure taxes)\b|\btransfer from and to airport\b|\b(?:visa|passport)\b|\binsurance\b|\btips?\b|\btipping\b|\bgratuities\b|\blaundry\b|\bmeals? not (?:marked|included)\b|\bother meals? (?:do not|not) indicate\b|\bbeverages?\b|\bdrinks?\b|\bpersonal expenses?\b|\b(?:services?|things?) (?:are |is )?not mention(?:ed)?\b|\blunch at local restaurant\b|\btransfer by bus\/train hanoi\s*-\s*sapa\b/iu

export const snapshotEditorialSharedServices = (
  tour: Partial<TourProduct> | Record<string, unknown>,
): EditorialSharedServiceSnapshot => {
  const value = tour as Record<string, unknown>
  return {
    excludes: cloneJSON(value.excludes ?? []),
    includes: cloneJSON(value.includes ?? []),
  }
}

export const editorialServiceRowIdentity = (value: EditorialSharedServiceSnapshot): string => {
  const project = (rows: unknown) => array(rows).map((row) => String(serviceRowID(row)))
  return editorialStableJSONStringify({
    excludes: project(value.excludes),
    includes: project(value.includes),
  })
}

export const normalizeEditorialSharedServices = ({
  expectedExcludes,
  expectedIncludes,
  source,
}: {
  expectedExcludes: number
  expectedIncludes: number
  source: TourProduct | Record<string, unknown>
}): EditorialSharedServiceSnapshot => {
  const value = source as Record<string, unknown>
  const sourceIncludes = array(value.includes)
  const sourceExcludes = array(value.excludes)
  const rows = [
    ...sourceIncludes.map((row) => ({ row, source: 'includes' as const })),
    ...sourceExcludes.map((row) => ({ row, source: 'excludes' as const })),
  ]
  const ids = rows.map(({ row }) => String(serviceRowID(row)))
  if (new Set(ids).size !== ids.length) {
    throw new Error(`Editorial service row IDs are not unique for ${String(value.slug)}`)
  }

  const includes: Record<string, unknown>[] = []
  const excludes: Record<string, unknown>[] = []
  for (const { row, source: rowSource } of rows) {
    const label = String(row.label || '').trim()
    if (!label) throw new Error(`Editorial service row label is empty for ${String(value.slug)}`)
    if (peakServicePattern.test(label)) {
      throw new Error(
        `Editorial shared service pricing disclosure requires approved localized disposition for ` +
          `${String(value.slug)} row ${String(serviceRowID(row))}: ${label}`,
      )
    }
    if (rowSource === 'excludes' || excludedServicePattern.test(label)) {
      excludes.push(cloneJSON(row))
    } else {
      includes.push(cloneJSON(row))
    }
  }
  if (includes.length !== expectedIncludes || excludes.length !== expectedExcludes) {
    throw new Error(
      `Editorial shared service classification cannot reconcile ${String(value.slug)}: ` +
        `${includes.length}/${excludes.length} != ${expectedIncludes}/${expectedExcludes}`,
    )
  }
  return { excludes, includes }
}

const sanitizeWrapperLayout = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(sanitizeWrapperLayout)
  if (!value || typeof value !== 'object') return value
  const source = value as Record<string, unknown>
  return Object.fromEntries(
    Object.entries(source)
      .filter(
        ([key]) =>
          key !== 'id' || typeof source.id !== 'string' || !/^[a-f0-9]{24}$/iu.test(source.id),
      )
      .map(([key, child]) => [key, sanitizeWrapperLayout(child)]),
  )
}

export const snapshotEditorialOwnedFields = (
  tour: Partial<TourProduct> | Record<string, unknown>,
): EditorialOwnedSnapshot => {
  const value = tour as Record<string, unknown>
  const factSummary = record(value.factSummary)
  const primaryCTA = record(value.primaryCTA)
  const servicesSummary = record(value.servicesSummary)
  const meta = record(value.meta)
  return {
    excludes: cloneJSON(value.excludes ?? []),
    factSummary: { routeSummary: factSummary.routeSummary ?? null },
    includes: cloneJSON(value.includes ?? []),
    itineraryDays: cloneJSON(value.itineraryDays ?? []),
    meta: {
      breadcrumbLabel: meta.breadcrumbLabel ?? null,
      description: meta.description ?? null,
      title: meta.title ?? null,
    },
    primaryCTA: { label: primaryCTA.label ?? null },
    servicesSummary: {
      hotelSummary: servicesSummary.hotelSummary ?? null,
      mealsSummary: servicesSummary.mealsSummary ?? null,
      operatorNotes: servicesSummary.operatorNotes ?? null,
      transportSummary: servicesSummary.transportSummary ?? null,
    },
    summary: value.summary ?? null,
    title: value.title ?? null,
  }
}

export const snapshotEditorialWrapperFields = (
  page: Partial<Page> | Record<string, unknown>,
): EditorialWrapperSnapshot => {
  const value = page as Record<string, unknown>
  const meta = record(value.meta)
  return {
    layout: cloneJSON(sanitizeWrapperLayout(value.layout ?? null)),
    meta: {
      breadcrumbLabel: meta.breadcrumbLabel ?? null,
      description: meta.description ?? null,
      title: meta.title ?? null,
    },
    title: value.title ?? null,
  }
}

export const buildEditorialWrapperWriteData = ({
  content,
  source,
}: {
  content: EditorialTourContent
  source: Page | Record<string, unknown>
}): Record<string, unknown> => {
  const value = source as Record<string, unknown>
  return {
    layout: cloneJSON(sanitizeWrapperLayout(value.layout ?? [])),
    meta: {
      ...cloneJSON(record(value.meta)),
      ...content.meta,
    },
    title: content.title,
  }
}

export const buildEditorialWrapperRestoreData = ({
  before,
  source,
}: {
  before: EditorialWrapperSnapshot
  source: Page | Record<string, unknown>
}): Record<string, unknown> => {
  const value = source as Record<string, unknown>
  return {
    layout: cloneJSON(sanitizeWrapperLayout(before.layout)),
    meta: {
      ...cloneJSON(record(value.meta)),
      ...before.meta,
    },
    title: before.title,
  }
}

export const buildEditorialWriteData = ({
  content,
  source,
}: {
  content: EditorialTourContent
  source: TourProduct | Record<string, unknown>
}): Record<string, unknown> => {
  const value = source as Record<string, unknown>
  const sourceDays = array(value.itineraryDays)
  const sourceIncludes = array(value.includes)
  const sourceExcludes = array(value.excludes)
  if (
    sourceDays.length !== content.itineraryDays.length ||
    sourceIncludes.length !== content.includes.length ||
    sourceExcludes.length !== content.excludes.length
  ) {
    throw new Error(`Editorial write cardinality drift for ${String(value.slug)}`)
  }

  return {
    excludes: sourceExcludes.map((item, index) => ({
      ...cloneJSON(item),
      label: content.excludes[index],
    })),
    factSummary: {
      ...cloneJSON(record(value.factSummary)),
      routeSummary: content.routeSummary,
    },
    includes: sourceIncludes.map((item, index) => ({
      ...cloneJSON(item),
      label: content.includes[index],
    })),
    itineraryDays: sourceDays.map((day, index) => ({
      ...cloneJSON(day),
      ...content.itineraryDays[index],
    })),
    meta: {
      ...cloneJSON(record(value.meta)),
      ...content.meta,
    },
    primaryCTA: {
      ...cloneJSON(record(value.primaryCTA)),
      label: content.primaryCTALabel,
    },
    servicesSummary: {
      ...cloneJSON(record(value.servicesSummary)),
      ...content.servicesSummary,
    },
    summary: content.summary,
    title: content.title,
  }
}

export const buildEditorialRestoreData = ({
  before,
  source,
}: {
  before: EditorialOwnedSnapshot
  source: TourProduct | Record<string, unknown>
}): Record<string, unknown> => {
  const value = source as Record<string, unknown>
  return {
    excludes: cloneJSON(before.excludes),
    factSummary: {
      ...cloneJSON(record(value.factSummary)),
      routeSummary: before.factSummary.routeSummary,
    },
    includes: cloneJSON(before.includes),
    itineraryDays: cloneJSON(before.itineraryDays),
    meta: {
      ...cloneJSON(record(value.meta)),
      ...before.meta,
    },
    primaryCTA: {
      ...cloneJSON(record(value.primaryCTA)),
      label: before.primaryCTA.label,
    },
    servicesSummary: {
      ...cloneJSON(record(value.servicesSummary)),
      ...before.servicesSummary,
    },
    summary: before.summary,
    title: before.title,
  }
}

export const assertEditorialPlanShape = (plan: WingsSideTourEditorialPlan) => {
  if (
    plan.planVersion !== wingsSideTourEditorialPlanVersion ||
    plan.mode !== 'plan' ||
    plan.siteCode !== wingsSideTourEditorialSiteCode ||
    plan.expectedTourCount !== wingsSideTourEditorialExpectedTourCount ||
    JSON.stringify(plan.expectedLocales) !== JSON.stringify(wingsSideTourEditorialLocales) ||
    plan.entries.length !==
      wingsSideTourEditorialExpectedTourCount * wingsSideTourEditorialLocales.length ||
    plan.sharedServiceEntries.length !== wingsSideTourEditorialExpectedTourCount
  ) {
    throw new Error('Invalid WingSide tour editorial production plan')
  }
  const keys = plan.entries.map(({ locale, slug }) => `${locale}:${slug}`)
  if (new Set(keys).size !== keys.length) {
    throw new Error('WingSide tour editorial production plan contains duplicate entries')
  }
  for (const entry of plan.entries) {
    if (
      editorialChecksum({ tour: entry.before, wrapper: entry.wrapperBefore }) !==
        entry.beforeChecksum ||
      editorialChecksum({ tour: entry.after, wrapper: entry.wrapperAfter }) !== entry.afterChecksum
    ) {
      throw new Error(
        `WingSide tour editorial plan entry checksum mismatch: ${entry.locale}:${entry.slug}`,
      )
    }
  }
  const sharedKeys = plan.sharedServiceEntries.map(({ slug }) => slug)
  if (new Set(sharedKeys).size !== sharedKeys.length) {
    throw new Error('WingSide tour editorial plan contains duplicate shared service entries')
  }
  for (const entry of plan.sharedServiceEntries) {
    if (
      editorialChecksum(entry.before) !== entry.beforeChecksum ||
      editorialChecksum(entry.after) !== entry.afterChecksum
    ) {
      throw new Error(`WingSide shared service plan checksum mismatch: ${entry.slug}`)
    }
  }
  const sourceManifest = new Map<string, string>()
  for (const { slug, sourceChecksum } of plan.entries) {
    const existing = sourceManifest.get(slug)
    if (existing && existing !== sourceChecksum) {
      throw new Error(`WingSide tour editorial source checksum conflict: ${slug}`)
    }
    sourceManifest.set(slug, sourceChecksum)
  }
  if (
    editorialChecksum(
      [...sourceManifest].map(([slug, sourceChecksum]) => ({ slug, sourceChecksum })),
    ) !== plan.sourceManifestChecksum
  ) {
    throw new Error('WingSide tour editorial source manifest checksum mismatch')
  }
  const before = editorialChecksum([
    ...plan.sharedServiceEntries.map(({ beforeChecksum }) => beforeChecksum),
    ...plan.entries.map(({ beforeChecksum }) => beforeChecksum),
  ])
  const after = editorialChecksum([
    ...plan.sharedServiceEntries.map(({ afterChecksum }) => afterChecksum),
    ...plan.entries.map(({ afterChecksum }) => afterChecksum),
  ])
  if (before !== plan.aggregateChecksums.before || after !== plan.aggregateChecksums.after) {
    throw new Error('WingSide tour editorial production plan aggregate checksum mismatch')
  }
}

export const buildWingsSideTourEditorialPlan = ({
  beforeByKey,
  catalog,
  createdAt,
  releaseSourceCommit,
  runID,
  siteID,
  sourceTours,
  sourceWrappers,
  wrapperBeforeByKey,
  wrapperPageIDs,
}: {
  beforeByKey: Map<string, TourProduct | Record<string, unknown>>
  catalog: WingsSideTourEditorialCatalog
  createdAt: string
  releaseSourceCommit: string
  runID: string
  siteID: number | string
  sourceTours: TourProduct[]
  sourceWrappers: Map<string, Page | Record<string, unknown>>
  wrapperBeforeByKey: Map<string, Page | Record<string, unknown>>
  wrapperPageIDs: Map<string, number | string>
}): WingsSideTourEditorialPlan => {
  if (sourceTours.length !== wingsSideTourEditorialExpectedTourCount) {
    throw new Error(`Expected exactly 22 WingSide English tours, found ${sourceTours.length}`)
  }
  const sourceBySlug = new Map(sourceTours.map((tour) => [tour.slug, tour]))
  const sharedServiceEntries: WingsSideTourEditorialSharedServiceEntry[] = []
  const entries = catalog.tours.flatMap((entry) => {
    const source = sourceBySlug.get(entry.slug)
    const sourceWrapper = sourceWrappers.get(entry.slug)
    const wrapperPageID = wrapperPageIDs.get(entry.slug)
    if (!source || !sourceWrapper || wrapperPageID === undefined) {
      throw new Error(`Missing production source or wrapper for ${entry.slug}`)
    }
    if (editorialSourceChecksum(source) !== entry.sourceChecksum) {
      throw new Error(`English source checksum drift for ${entry.slug}`)
    }
    const serviceShapes = wingsSideTourEditorialLocales.map((locale) => ({
      excludes: entry.locales[locale].excludes.length,
      includes: entry.locales[locale].includes.length,
    }))
    const expectedShape = serviceShapes[0]!
    if (
      serviceShapes.some(
        ({ excludes, includes }) =>
          excludes !== expectedShape.excludes || includes !== expectedShape.includes,
      )
    ) {
      throw new Error(`Localized service classification shape drift for ${entry.slug}`)
    }
    const sharedBefore = snapshotEditorialSharedServices(source)
    const sharedAfter = normalizeEditorialSharedServices({
      expectedExcludes: expectedShape.excludes,
      expectedIncludes: expectedShape.includes,
      source,
    })
    sharedServiceEntries.push({
      after: sharedAfter,
      afterChecksum: editorialChecksum(sharedAfter),
      before: sharedBefore,
      beforeChecksum: editorialChecksum(sharedBefore),
      slug: entry.slug,
      sourceChecksum: entry.sourceChecksum,
      tourID: source.id,
    })
    const normalizedSource = {
      ...(source as TourProduct),
      excludes: cloneJSON(sharedAfter.excludes) as TourProduct['excludes'],
      includes: cloneJSON(sharedAfter.includes) as TourProduct['includes'],
    }
    return wingsSideTourEditorialLocales.map((locale) => {
      const beforeTour = beforeByKey.get(`${locale}:${entry.slug}`)
      const beforeWrapper = wrapperBeforeByKey.get(`${locale}:${entry.slug}`)
      if (!beforeTour) throw new Error(`Missing ${locale} tour snapshot for ${entry.slug}`)
      if (!beforeWrapper) throw new Error(`Missing ${locale} wrapper snapshot for ${entry.slug}`)
      if (String(beforeTour.id) !== String(source.id)) {
        throw new Error(`Localized tour ID drift for ${locale}:${entry.slug}`)
      }
      const before = snapshotEditorialOwnedFields(beforeTour)
      if (editorialServiceRowIdentity(before) !== editorialServiceRowIdentity(sharedBefore)) {
        throw new Error(`Localized service row identity drift for ${locale}:${entry.slug}`)
      }
      const after = snapshotEditorialOwnedFields(
        buildEditorialWriteData({ content: entry.locales[locale], source: normalizedSource }),
      )
      const wrapperBefore = snapshotEditorialWrapperFields(beforeWrapper)
      const wrapperAfter = snapshotEditorialWrapperFields(
        buildEditorialWrapperWriteData({
          content: entry.locales[locale],
          source: sourceWrapper,
        }),
      )
      return {
        after,
        afterChecksum: editorialChecksum({ tour: after, wrapper: wrapperAfter }),
        before,
        beforeChecksum: editorialChecksum({ tour: before, wrapper: wrapperBefore }),
        locale,
        sourceChecksum: entry.sourceChecksum,
        tourID: source.id,
        wrapperAfter,
        wrapperBefore,
        wrapperPageID,
        slug: entry.slug,
      }
    })
  })
  const plan: WingsSideTourEditorialPlan = {
    aggregateChecksums: {
      after: editorialChecksum([
        ...sharedServiceEntries.map(({ afterChecksum }) => afterChecksum),
        ...entries.map(({ afterChecksum }) => afterChecksum),
      ]),
      before: editorialChecksum([
        ...sharedServiceEntries.map(({ beforeChecksum }) => beforeChecksum),
        ...entries.map(({ beforeChecksum }) => beforeChecksum),
      ]),
    },
    createdAt,
    entries,
    expectedLocales: [...wingsSideTourEditorialLocales],
    expectedTourCount: 22,
    mode: 'plan',
    planVersion: 3,
    releaseSourceCommit,
    runID,
    siteCode: 'wing-side',
    siteID,
    sourceManifestChecksum: editorialChecksum(
      catalog.tours.map(({ slug, sourceChecksum }) => ({ slug, sourceChecksum })),
    ),
    sharedServiceEntries,
  }
  assertEditorialPlanShape(plan)
  return plan
}
