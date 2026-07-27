import crypto from 'node:crypto'

import type { TourProduct } from '../../src/payload-types'
import {
  editorialSourceChecksum,
  wingsSideTourEditorialLocales,
  type EditorialTourContent,
  type WingsSideTourEditorialCatalog,
  type WingsSideTourEditorialLocale,
} from './wingsSideTourEditorialLocalization'

export const wingsSideTourEditorialSiteCode = 'wing-side'
export const wingsSideTourEditorialExpectedTourCount = 22
export const wingsSideTourEditorialPlanVersion = 1

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

export type WingsSideTourEditorialPlanEntry = {
  after: EditorialOwnedSnapshot
  afterChecksum: string
  before: EditorialOwnedSnapshot
  beforeChecksum: string
  locale: WingsSideTourEditorialLocale
  sourceChecksum: string
  tourID: number | string
  wrapperPageID: number | string
  slug: string
}

export type WingsSideTourEditorialPlan = {
  aggregateChecksums: { after: string; before: string }
  createdAt: string
  expectedLocales: WingsSideTourEditorialLocale[]
  expectedTourCount: 22
  mode: 'plan'
  planVersion: 1
  releaseSourceCommit: string
  runID: string
  siteCode: 'wing-side'
  siteID: number | string
  sourceManifestChecksum: string
  entries: WingsSideTourEditorialPlanEntry[]
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
      wingsSideTourEditorialExpectedTourCount * wingsSideTourEditorialLocales.length
  ) {
    throw new Error('Invalid WingSide tour editorial production plan')
  }
  const keys = plan.entries.map(({ locale, slug }) => `${locale}:${slug}`)
  if (new Set(keys).size !== keys.length) {
    throw new Error('WingSide tour editorial production plan contains duplicate entries')
  }
  for (const entry of plan.entries) {
    if (
      editorialChecksum(entry.before) !== entry.beforeChecksum ||
      editorialChecksum(entry.after) !== entry.afterChecksum
    ) {
      throw new Error(`WingSide tour editorial plan entry checksum mismatch: ${entry.locale}:${entry.slug}`)
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
  const before = editorialChecksum(plan.entries.map(({ beforeChecksum }) => beforeChecksum))
  const after = editorialChecksum(plan.entries.map(({ afterChecksum }) => afterChecksum))
  if (
    before !== plan.aggregateChecksums.before ||
    after !== plan.aggregateChecksums.after
  ) {
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
  wrapperPageIDs,
}: {
  beforeByKey: Map<string, TourProduct | Record<string, unknown>>
  catalog: WingsSideTourEditorialCatalog
  createdAt: string
  releaseSourceCommit: string
  runID: string
  siteID: number | string
  sourceTours: TourProduct[]
  wrapperPageIDs: Map<string, number | string>
}): WingsSideTourEditorialPlan => {
  if (sourceTours.length !== wingsSideTourEditorialExpectedTourCount) {
    throw new Error(`Expected exactly 22 WingSide English tours, found ${sourceTours.length}`)
  }
  const sourceBySlug = new Map(sourceTours.map((tour) => [tour.slug, tour]))
  const entries = catalog.tours.flatMap((entry) => {
    const source = sourceBySlug.get(entry.slug)
    const wrapperPageID = wrapperPageIDs.get(entry.slug)
    if (!source || wrapperPageID === undefined) {
      throw new Error(`Missing production source or wrapper for ${entry.slug}`)
    }
    if (editorialSourceChecksum(source) !== entry.sourceChecksum) {
      throw new Error(`English source checksum drift for ${entry.slug}`)
    }
    return wingsSideTourEditorialLocales.map((locale) => {
      const beforeTour = beforeByKey.get(`${locale}:${entry.slug}`)
      if (!beforeTour) throw new Error(`Missing ${locale} tour snapshot for ${entry.slug}`)
      if (String(beforeTour.id) !== String(source.id)) {
        throw new Error(`Localized tour ID drift for ${locale}:${entry.slug}`)
      }
      const before = snapshotEditorialOwnedFields(beforeTour)
      const after = snapshotEditorialOwnedFields(
        buildEditorialWriteData({ content: entry.locales[locale], source }),
      )
      return {
        after,
        afterChecksum: editorialChecksum(after),
        before,
        beforeChecksum: editorialChecksum(before),
        locale,
        sourceChecksum: entry.sourceChecksum,
        tourID: source.id,
        wrapperPageID,
        slug: entry.slug,
      }
    })
  })
  const plan: WingsSideTourEditorialPlan = {
    aggregateChecksums: {
      after: editorialChecksum(entries.map(({ afterChecksum }) => afterChecksum)),
      before: editorialChecksum(entries.map(({ beforeChecksum }) => beforeChecksum)),
    },
    createdAt,
    entries,
    expectedLocales: [...wingsSideTourEditorialLocales],
    expectedTourCount: 22,
    mode: 'plan',
    planVersion: 1,
    releaseSourceCommit,
    runID,
    siteCode: 'wing-side',
    siteID,
    sourceManifestChecksum: editorialChecksum(
      catalog.tours.map(({ slug, sourceChecksum }) => ({ slug, sourceChecksum })),
    ),
  }
  assertEditorialPlanShape(plan)
  return plan
}
