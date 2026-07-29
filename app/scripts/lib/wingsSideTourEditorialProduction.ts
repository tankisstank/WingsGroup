import crypto from 'node:crypto'

import type { Page, TourProduct } from '../../src/payload-types'
import {
  buildEditorialPricingApprovalSnapshot,
  editorialPricingApprovalSnapshotChecksum,
  editorialServiceLabelChecksum,
  editorialSourceChecksum,
  parseWingsSideTourEditorialCatalogV2,
  wingsSideTourEditorialLocales,
  type EditorialTourContent,
  type LocalizedServiceRow,
  type PricingDisposition,
  type PricingApprovalSnapshot,
  type WingsSideTourEditorialCatalog,
  type WingsSideTourEditorialLocale,
} from './wingsSideTourEditorialLocalization'

export const wingsSideTourEditorialSiteCode = 'wing-side'
export const wingsSideTourEditorialExpectedTourCount = 22
export const wingsSideTourEditorialPlanVersion = 4
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

export type WingsSideTourEditorialServiceRowLedgerEntry = {
  afterChecksum: string
  afterCount: number
  afterRowIDs: string[]
  beforeChecksum: string
  beforeCount: number
  beforeRowIDs: string[]
  rowChecksums: Array<{
    after: string
    before: string
    sourceRowID: string
  }>
  slug: string
  tourID: number | string
}

export type WingsSideEnglishCommercialNormalizationEntry = {
  after: { excludes: unknown; includes: unknown }
  afterChecksum: string
  before: { excludes: unknown; includes: unknown }
  beforeChecksum: string
  slug: string
  tourID: number | string
}

export type WingsSideTourEditorialPlan = {
  aggregateChecksums: { after: string; before: string }
  approvalSnapshot: PricingApprovalSnapshot
  approvalSnapshotChecksum: string
  createdAt: string
  expectedLocales: WingsSideTourEditorialLocale[]
  expectedTourCount: 22
  mode: 'plan'
  planVersion: 4
  releaseSourceCommit: string
  runID: string
  siteCode: 'wing-side'
  siteID: number | string
  sourceManifestChecksum: string
  entries: WingsSideTourEditorialPlanEntry[]
  sharedServiceEntries: WingsSideTourEditorialSharedServiceEntry[]
  serviceRowLedger: WingsSideTourEditorialServiceRowLedgerEntry[]
  serviceRowLedgerChecksum: string
  /** SHA-256 of the complete pre-canary plan when this is a canary plan. */
  parentPlanSha256?: string
  /** Signed English production repair. Optional for backwards-compatible plans. */
  englishNormalization?: {
    aggregateChecksums: { after: string; before: string }
    entries: WingsSideEnglishCommercialNormalizationEntry[]
  }
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

const pricingDisclosurePattern =
  /\b(?:peak|high) season\b|\bfuel surcharge\b|\bcompulsory dinner\b/iu

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

const buildCanonicalServiceRowLedger = (
  entry: WingsSideTourEditorialSharedServiceEntry,
): WingsSideTourEditorialServiceRowLedgerEntry => {
  const beforeRows = [...array(entry.before.includes), ...array(entry.before.excludes)]
  const afterRows = [...array(entry.after.includes), ...array(entry.after.excludes)]
  const beforeRowIDs = beforeRows.map((row) => String(serviceRowID(row)))
  const afterRowIDs = afterRows.map((row) => String(serviceRowID(row)))
  const beforeByID = new Map(beforeRows.map((row) => [String(serviceRowID(row)), row]))
  const afterByID = new Map(afterRows.map((row) => [String(serviceRowID(row)), row]))
  const beforeSorted = [...beforeRowIDs].sort()
  const afterSorted = [...afterRowIDs].sort()
  if (
    beforeByID.size !== beforeRows.length ||
    afterByID.size !== afterRows.length ||
    editorialStableJSONStringify(beforeSorted) !== editorialStableJSONStringify(afterSorted)
  ) {
    throw new Error(`Shared service row inventory drift for ${entry.slug}`)
  }
  return {
    afterChecksum: editorialChecksum(afterRowIDs),
    afterCount: afterRowIDs.length,
    afterRowIDs,
    beforeChecksum: editorialChecksum(beforeRowIDs),
    beforeCount: beforeRowIDs.length,
    beforeRowIDs,
    rowChecksums: beforeRowIDs.map((sourceRowID) => ({
      after: editorialChecksum(afterByID.get(sourceRowID)),
      before: editorialChecksum(beforeByID.get(sourceRowID)),
      sourceRowID,
    })),
    slug: entry.slug,
    tourID: entry.tourID,
  }
}

export const normalizeEditorialSharedServices = ({
  content,
  dispositions,
  slug,
  source,
}: {
  content: EditorialTourContent
  dispositions: PricingDisposition[]
  slug: string
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

  const localizedRows = [...content.includes, ...content.excludes]
  const localizedIDs = localizedRows.map(({ sourceRowID }) => sourceRowID)
  if (
    localizedRows.length !== rows.length ||
    new Set(localizedIDs).size !== localizedIDs.length ||
    ids.some((id) => !localizedIDs.includes(id)) ||
    localizedIDs.some((id) => !ids.includes(id))
  ) {
    throw new Error(
      `Editorial localized service inventory does not preserve exact source row IDs for ${slug}`,
    )
  }
  const dispositionsByID = new Map(
    dispositions.filter((item) => item.slug === slug).map((item) => [item.sourceRowID, item]),
  )
  const includes: Record<string, unknown>[] = []
  const excludes: Record<string, unknown>[] = []
  for (const localized of localizedRows) {
    const sourceRow = rows.find(({ row }) => String(serviceRowID(row)) === localized.sourceRowID)
    if (!sourceRow) throw new Error(`Unknown editorial service row ${slug}:${localized.sourceRowID}`)
    const label = String(sourceRow.row.label || '').trim()
    const disposition = dispositionsByID.get(localized.sourceRowID)
    const requiresDisposition =
      sourceRow.source !== localized.targetBucket || pricingDisclosurePattern.test(label)
    if (
      requiresDisposition &&
      (!disposition ||
        disposition.sourceBucket !== sourceRow.source ||
        disposition.sourceLabel !== label ||
        disposition.sourceLabelChecksum !== editorialServiceLabelChecksum(label) ||
        disposition.approvedTargetBucket !== localized.targetBucket ||
        !disposition.rationale.trim() ||
        !disposition.approvedBy.trim() ||
        !disposition.approvedAt.trim())
    ) {
      throw new Error(
        `Service row requires approved localized disposition for ${slug}:${localized.sourceRowID}`,
      )
    }
    const target = localized.targetBucket === 'includes' ? includes : excludes
    target.push(cloneJSON(sourceRow.row))
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

const buildLocalizedServiceRows = (
  sourceIncludes: Record<string, unknown>[],
  sourceExcludes: Record<string, unknown>[],
  localizedRows: LocalizedServiceRow[],
) => {
  const sourceByID = new Map(
    [...sourceIncludes, ...sourceExcludes].map((row) => [String(serviceRowID(row)), row]),
  )
  if (sourceByID.size !== sourceIncludes.length + sourceExcludes.length) {
    throw new Error('Editorial service source rows contain duplicate IDs')
  }
  const localizedIDs = localizedRows.map(({ sourceRowID }) => sourceRowID)
  if (new Set(localizedIDs).size !== localizedIDs.length) {
    throw new Error('Editorial localized service rows contain duplicate sourceRowID values')
  }
  return localizedRows.map(({ label, sourceRowID }) => {
    const source = sourceByID.get(sourceRowID)
    if (!source) throw new Error(`Unknown editorial localized service row ${sourceRowID}`)
    return { ...cloneJSON(source), label }
  })
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
  const sourceServiceIDs = [...sourceIncludes, ...sourceExcludes].map((row) =>
    String(serviceRowID(row)),
  )
  const localizedServiceRows = [...content.includes, ...content.excludes]
  const localizedServiceIDs = localizedServiceRows.map(({ sourceRowID }) => sourceRowID)
  if (
    sourceDays.length !== content.itineraryDays.length ||
    sourceIncludes.length + sourceExcludes.length !==
      content.includes.length + content.excludes.length ||
    new Set(sourceServiceIDs).size !== sourceServiceIDs.length ||
    new Set(localizedServiceIDs).size !== localizedServiceIDs.length ||
    sourceServiceIDs.some((id) => !localizedServiceIDs.includes(id)) ||
    localizedServiceIDs.some((id) => !sourceServiceIDs.includes(id)) ||
    content.includes.some(({ targetBucket }) => targetBucket !== 'includes') ||
    content.excludes.some(({ targetBucket }) => targetBucket !== 'excludes')
  ) {
    throw new Error(`Editorial write cardinality drift for ${String(value.slug)}`)
  }

  return {
    excludes: buildLocalizedServiceRows(sourceIncludes, sourceExcludes, content.excludes),
    factSummary: {
      ...cloneJSON(record(value.factSummary)),
      routeSummary: content.routeSummary,
    },
    includes: buildLocalizedServiceRows(sourceIncludes, sourceExcludes, content.includes),
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
    plan.sharedServiceEntries.length !== wingsSideTourEditorialExpectedTourCount ||
    plan.serviceRowLedger.length !== wingsSideTourEditorialExpectedTourCount
  ) {
    throw new Error('Invalid WingSide tour editorial production plan')
  }
  const keys = plan.entries.map(({ locale, slug }) => `${locale}:${slug}`)
  if (new Set(keys).size !== keys.length) {
    throw new Error('WingSide tour editorial production plan contains duplicate entries')
  }
  // A valid plan must contain one entry for every target locale and every
  // source slug.  Checking only the aggregate length would allow a malformed
  // plan (for example 23 VI entries and 21 PT entries) to pass the gate.
  const entriesByLocale = new Map<WingsSideTourEditorialLocale, number>()
  const entriesBySlug = new Map<string, number>()
  for (const entry of plan.entries) {
    entriesByLocale.set(entry.locale, (entriesByLocale.get(entry.locale) || 0) + 1)
    entriesBySlug.set(entry.slug, (entriesBySlug.get(entry.slug) || 0) + 1)
    if (!entry.slug.trim() || !entry.sourceChecksum.trim()) {
      throw new Error(
        `WingSide tour editorial plan entry is missing identity/checksum: ${entry.locale}:${entry.slug}`,
      )
    }
    if (!entry.beforeChecksum.trim() || !entry.afterChecksum.trim()) {
      throw new Error(
        `WingSide tour editorial plan entry is missing before/after checksum: ${entry.locale}:${entry.slug}`,
      )
    }
  }
  for (const locale of wingsSideTourEditorialLocales) {
    if (entriesByLocale.get(locale) !== wingsSideTourEditorialExpectedTourCount) {
      throw new Error(`WingSide tour editorial plan must contain exactly 22 ${locale} entries`)
    }
  }
  for (const [slug, count] of entriesBySlug) {
    if (count !== wingsSideTourEditorialLocales.length) {
      throw new Error(
        `WingSide tour editorial plan must contain exactly 4 locale entries for ${slug}`,
      )
    }
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
  if (
    editorialPricingApprovalSnapshotChecksum(plan.approvalSnapshot) !==
      plan.approvalSnapshotChecksum ||
    plan.approvalSnapshot.manifest.expectedPricingDisclosureCount !==
      plan.approvalSnapshot.pricingDispositions.length
  ) {
    throw new Error('WingSide pricing approval snapshot checksum mismatch')
  }
  const ledgerSlugs = plan.serviceRowLedger.map(({ slug }) => slug)
  if (new Set(ledgerSlugs).size !== ledgerSlugs.length) {
    throw new Error('WingSide tour editorial plan contains duplicate service row ledgers')
  }
  for (const ledger of plan.serviceRowLedger) {
    const shared = plan.sharedServiceEntries.find(
      (entry) =>
        entry.slug === ledger.slug && String(entry.tourID) === String(ledger.tourID),
    )
    if (
      !shared ||
      editorialStableJSONStringify(buildCanonicalServiceRowLedger(shared)) !==
        editorialStableJSONStringify(ledger)
    ) {
      throw new Error(`WingSide service row preservation ledger mismatch: ${ledger.slug}`)
    }
  }
  if (editorialChecksum(plan.serviceRowLedger) !== plan.serviceRowLedgerChecksum) {
    throw new Error('WingSide service row ledger aggregate checksum mismatch')
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
  const before = editorialChecksum({
    approvalSnapshotChecksum: plan.approvalSnapshotChecksum,
    localizedEntries: plan.entries.map(({ beforeChecksum }) => beforeChecksum),
    serviceRowLedgerChecksum: plan.serviceRowLedgerChecksum,
    sharedServiceEntries: plan.sharedServiceEntries.map(({ beforeChecksum }) => beforeChecksum),
  })
  const after = editorialChecksum({
    approvalSnapshotChecksum: plan.approvalSnapshotChecksum,
    localizedEntries: plan.entries.map(({ afterChecksum }) => afterChecksum),
    serviceRowLedgerChecksum: plan.serviceRowLedgerChecksum,
    sharedServiceEntries: plan.sharedServiceEntries.map(({ afterChecksum }) => afterChecksum),
  })
  if (before !== plan.aggregateChecksums.before || after !== plan.aggregateChecksums.after) {
    throw new Error('WingSide tour editorial production plan aggregate checksum mismatch')
  }
  if (plan.englishNormalization) {
    const english = plan.englishNormalization
    if (english.entries.length !== wingsSideTourEditorialExpectedTourCount) {
      throw new Error('English normalization must contain exactly 22 entries')
    }
    const slugs = english.entries.map((entry) => entry.slug)
    if (new Set(slugs).size !== slugs.length || slugs.some((slug) => !slug.trim())) {
      throw new Error('English normalization contains duplicate or empty slugs')
    }
    for (const entry of english.entries) {
      if (
        editorialChecksum(entry.before) !== entry.beforeChecksum ||
        editorialChecksum(entry.after) !== entry.afterChecksum
      ) {
        throw new Error(`English normalization checksum mismatch: ${entry.slug}`)
      }
    }
    const englishBefore = editorialChecksum(
      english.entries.map(({ beforeChecksum }) => beforeChecksum),
    )
    const englishAfter = editorialChecksum(
      english.entries.map(({ afterChecksum }) => afterChecksum),
    )
    if (
      englishBefore !== english.aggregateChecksums.before ||
      englishAfter !== english.aggregateChecksums.after
    ) {
      throw new Error('English normalization aggregate checksum mismatch')
    }
  }
}

const editorialCanaryMarker = ':canary:'

export const deriveWingsSideTourEditorialCanaryPlan = ({
  plan,
  slug,
}: {
  plan: WingsSideTourEditorialPlan
  slug: string
}): WingsSideTourEditorialPlan => {
  assertEditorialPlanShape(plan)
  const normalizedSlug = slug.trim()
  const canaryEntries = plan.entries.filter((entry) => entry.slug === normalizedSlug)
  if (
    !normalizedSlug ||
    canaryEntries.length !== wingsSideTourEditorialLocales.length ||
    new Set(canaryEntries.map(({ locale }) => locale)).size !== wingsSideTourEditorialLocales.length
  ) {
    throw new Error(`WingSide tour editorial canary slug is not in the exact inventory: ${slug}`)
  }

  const entries = plan.entries.map((entry) =>
    entry.slug === normalizedSlug
      ? cloneJSON(entry)
      : {
          ...cloneJSON(entry),
          after: cloneJSON(entry.before),
          afterChecksum: entry.beforeChecksum,
          wrapperAfter: cloneJSON(entry.wrapperBefore),
        },
  )
  const sharedServiceEntries = plan.sharedServiceEntries.map((entry) => ({
    ...cloneJSON(entry),
    after: cloneJSON(entry.before),
    afterChecksum: entry.beforeChecksum,
  }))
  const canaryPlan: WingsSideTourEditorialPlan = {
    ...cloneJSON(plan),
    aggregateChecksums: {
      before: plan.aggregateChecksums.before,
      after: editorialChecksum({
        approvalSnapshotChecksum: plan.approvalSnapshotChecksum,
        localizedEntries: entries.map(({ afterChecksum }) => afterChecksum),
        serviceRowLedgerChecksum: plan.serviceRowLedgerChecksum,
        sharedServiceEntries: sharedServiceEntries.map(({ afterChecksum }) => afterChecksum),
      }),
    },
    entries,
    parentPlanSha256: editorialChecksum(plan),
    runID: `${plan.runID}${editorialCanaryMarker}${normalizedSlug}`,
    sharedServiceEntries,
    ...(plan.englishNormalization
      ? {
          englishNormalization: {
            aggregateChecksums: {
              before: plan.englishNormalization.aggregateChecksums.before,
              after: editorialChecksum(
                plan.englishNormalization.entries.map(({ beforeChecksum }) => beforeChecksum),
              ),
            },
            entries: plan.englishNormalization.entries.map((entry) => ({
              ...cloneJSON(entry),
              after: cloneJSON(entry.before),
              afterChecksum: entry.beforeChecksum,
            })),
          },
        }
      : {}),
  }
  assertWingsSideTourEditorialCanaryPlan({ plan: canaryPlan, slug: normalizedSlug })
  return canaryPlan
}

export const assertWingsSideTourEditorialCanaryPlan = ({
  plan,
  slug,
}: {
  plan: WingsSideTourEditorialPlan
  slug: string
}) => {
  assertEditorialPlanShape(plan)
  const normalizedSlug = slug.trim()
  if (!normalizedSlug || !plan.runID.endsWith(`${editorialCanaryMarker}${normalizedSlug}`)) {
    throw new Error('WingSide tour editorial canary marker does not match --canary-slug')
  }
  if (!plan.parentPlanSha256 || !/^[0-9a-f]{64}$/u.test(plan.parentPlanSha256)) {
    throw new Error('WingSide tour editorial canary is missing its parent full-plan checksum')
  }
  const targeted = plan.entries.filter((entry) => entry.slug === normalizedSlug)
  if (
    targeted.length !== wingsSideTourEditorialLocales.length ||
    new Set(targeted.map(({ locale }) => locale)).size !== wingsSideTourEditorialLocales.length
  ) {
    throw new Error(
      'WingSide tour editorial canary must target exactly one tour across vi,it,es,pt',
    )
  }
  if (
    plan.entries.some(
      (entry) => entry.slug !== normalizedSlug && entry.afterChecksum !== entry.beforeChecksum,
    )
  ) {
    throw new Error('WingSide tour editorial canary contains a write outside its selected slug')
  }
  if (
    plan.englishNormalization?.entries.some(
      ({ afterChecksum, beforeChecksum }) => afterChecksum !== beforeChecksum,
    )
  ) {
    throw new Error('WingSide tour editorial canary must not normalize the English baseline')
  }
}

export const isWingsSideTourEditorialCanaryPlan = (plan: WingsSideTourEditorialPlan) =>
  plan.runID.includes(editorialCanaryMarker)

export const normalizeWingsSideEnglishCommercialArrays = ({
  cardinalities,
  sourceTours,
}: {
  cardinalities: Map<string, { excludes: number; includes: number }>
  sourceTours: TourProduct[]
}): TourProduct[] =>
  sourceTours.map((source) => {
    const expected = cardinalities.get(source.slug)
    if (!expected) {
      throw new Error(`Missing approved commercial cardinality for English tour: ${source.slug}`)
    }
    const includes = Array.isArray(source.includes) ? source.includes : []
    const excludes = Array.isArray(source.excludes) ? source.excludes : []
    if (includes.length === expected.includes && excludes.length === expected.excludes) {
      return source
    }
    if (excludes.length === 0 && includes.length === expected.includes + expected.excludes) {
      return {
        ...source,
        excludes: cloneJSON(includes.slice(expected.includes)),
        includes: cloneJSON(includes.slice(0, expected.includes)),
      }
    }
    throw new Error(
      `English commercial array drift for ${source.slug}: ` +
        `includes=${includes.length}, excludes=${excludes.length}, ` +
        `expected=${expected.includes}/${expected.excludes}`,
    )
  })

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
  parseWingsSideTourEditorialCatalogV2(catalog, {
    expectedPricingDisclosureCount:
      catalog.approvalManifest.expectedPricingDisclosureCount,
  })
  if (sourceTours.length !== wingsSideTourEditorialExpectedTourCount) {
    throw new Error(`Expected exactly 22 WingSide English tours, found ${sourceTours.length}`)
  }
  const sourceBySlug = new Map(sourceTours.map((tour) => [tour.slug, tour]))
  const sharedServiceEntries: WingsSideTourEditorialSharedServiceEntry[] = []
  const serviceRowLedger: WingsSideTourEditorialServiceRowLedgerEntry[] = []
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
    const sharedBefore = snapshotEditorialSharedServices(source)
    const sharedAfter = normalizeEditorialSharedServices({
      content: entry.locales.vi,
      dispositions: catalog.pricingDispositions,
      slug: entry.slug,
      source,
    })
    for (const locale of wingsSideTourEditorialLocales.slice(1)) {
      const localeAfter = normalizeEditorialSharedServices({
        content: entry.locales[locale],
        dispositions: catalog.pricingDispositions,
        slug: entry.slug,
        source,
      })
      if (editorialServiceRowIdentity(localeAfter) !== editorialServiceRowIdentity(sharedAfter)) {
        throw new Error(`Localized service classification drift for ${locale}:${entry.slug}`)
      }
    }
    const sharedServiceEntry: WingsSideTourEditorialSharedServiceEntry = {
      after: sharedAfter,
      afterChecksum: editorialChecksum(sharedAfter),
      before: sharedBefore,
      beforeChecksum: editorialChecksum(sharedBefore),
      slug: entry.slug,
      sourceChecksum: entry.sourceChecksum,
      tourID: source.id,
    }
    sharedServiceEntries.push(sharedServiceEntry)
    serviceRowLedger.push(buildCanonicalServiceRowLedger(sharedServiceEntry))
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
  const approvalSnapshot = buildEditorialPricingApprovalSnapshot(catalog)
  const approvalSnapshotChecksum = editorialPricingApprovalSnapshotChecksum(approvalSnapshot)
  const serviceRowLedgerChecksum = editorialChecksum(serviceRowLedger)
  const plan: WingsSideTourEditorialPlan = {
    aggregateChecksums: {
      after: editorialChecksum({
        approvalSnapshotChecksum,
        localizedEntries: entries.map(({ afterChecksum }) => afterChecksum),
        serviceRowLedgerChecksum,
        sharedServiceEntries: sharedServiceEntries.map(({ afterChecksum }) => afterChecksum),
      }),
      before: editorialChecksum({
        approvalSnapshotChecksum,
        localizedEntries: entries.map(({ beforeChecksum }) => beforeChecksum),
        serviceRowLedgerChecksum,
        sharedServiceEntries: sharedServiceEntries.map(({ beforeChecksum }) => beforeChecksum),
      }),
    },
    approvalSnapshot,
    approvalSnapshotChecksum,
    createdAt,
    entries,
    expectedLocales: [...wingsSideTourEditorialLocales],
    expectedTourCount: 22,
    mode: 'plan',
    planVersion: 4,
    releaseSourceCommit,
    runID,
    siteCode: 'wing-side',
    siteID,
    sourceManifestChecksum: editorialChecksum(
      catalog.tours.map(({ slug, sourceChecksum }) => ({ slug, sourceChecksum })),
    ),
    sharedServiceEntries,
    serviceRowLedger,
    serviceRowLedgerChecksum,
  }
  }
  if (englishBeforeBySlug) {
    const englishEntries = sourceTours.map((source) => {
      const beforeSource = englishBeforeBySlug.get(source.slug)
      if (!beforeSource) throw new Error(`Missing English normalization snapshot: ${source.slug}`)
      const before = {
        excludes: cloneJSON((beforeSource as Record<string, unknown>).excludes ?? []),
        includes: cloneJSON((beforeSource as Record<string, unknown>).includes ?? []),
      }
      const after = {
        excludes: cloneJSON(source.excludes ?? []),
        includes: cloneJSON(source.includes ?? []),
      }
      return {
        after,
        afterChecksum: editorialChecksum(after),
        before,
        beforeChecksum: editorialChecksum(before),
        slug: source.slug,
        tourID: source.id,
      }
    })
    plan.englishNormalization = {
      aggregateChecksums: {
        after: editorialChecksum(englishEntries.map(({ afterChecksum }) => afterChecksum)),
        before: editorialChecksum(englishEntries.map(({ beforeChecksum }) => beforeChecksum)),
      },
      entries: englishEntries,
    }
  }
  assertEditorialPlanShape(plan)
  return plan
}
