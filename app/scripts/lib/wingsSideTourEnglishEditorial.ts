import crypto from 'node:crypto'

import {
  lintWingsSideTourEnglishEditorial,
  type WingsSideTourEnglishEditorialLintConfig,
} from './wingsSideTourEnglishEditorialValidator'

export const wingsSideTourEnglishEditorialExpectedCount = 22
export const wingsSideTourEnglishEditorialPlanVersion = 1

export type WingsSideTourEnglishEditorialDocument = {
  slug: string
  [key: string]: unknown
}

export type WingsSideTourEnglishEditorialFieldChange = {
  after: unknown
  before: unknown
  path: string
}

export type WingsSideTourEnglishEditorialConfig = WingsSideTourEnglishEditorialLintConfig & {
  approvedFactualPaths?: string[]
  editorialPaths: string[]
  lockedFactualPaths: string[]
  requiredPaths: string[]
  serviceRowPaths?: string[]
}

export type WingsSideTourEnglishEditorialPlanEntry = {
  after: WingsSideTourEnglishEditorialDocument
  afterChecksum: string
  before: WingsSideTourEnglishEditorialDocument
  fieldChanges: WingsSideTourEnglishEditorialFieldChange[]
  slug: string
  sourceChecksum: string
}

export type WingsSideTourEnglishEditorialPlan = {
  aggregateChecksum: string
  createdAt: string
  entries: WingsSideTourEnglishEditorialPlanEntry[]
  expectedSlugs: string[]
  expectedTourCount: 22
  mode: 'plan'
  planChecksum: string
  planVersion: 1
  runID: string
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const clone = <T>(value: T): T =>
  value === undefined ? value : (JSON.parse(JSON.stringify(value)) as T)

export const wingsSideTourEnglishEditorialStableStringify = (value: unknown): string => {
  if (value === undefined) return '"__undefined__"'
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) {
    return `[${value.map(wingsSideTourEnglishEditorialStableStringify).join(',')}]`
  }
  const record = value as Record<string, unknown>
  return `{${Object.keys(record)
    .sort()
    .map(
      (key) =>
        `${JSON.stringify(key)}:${wingsSideTourEnglishEditorialStableStringify(record[key])}`,
    )
    .join(',')}}`
}

export const wingsSideTourEnglishEditorialChecksum = (value: unknown): string =>
  crypto
    .createHash('sha256')
    .update(wingsSideTourEnglishEditorialStableStringify(value))
    .digest('hex')

const getAtPath = (source: unknown, path: string): unknown => {
  let cursor = source
  for (const segment of path.split('.').filter(Boolean)) {
    if (!isRecord(cursor) && !Array.isArray(cursor)) return undefined
    cursor = (cursor as Record<string, unknown>)[segment]
  }
  return cursor
}

const hasRequiredValue = (value: unknown): boolean =>
  value !== undefined &&
  value !== null &&
  (typeof value !== 'string' || Boolean(value.trim())) &&
  (!Array.isArray(value) || value.length > 0)

const pathIsWithin = (path: string, roots: string[]): boolean =>
  roots.some((root) => path === root || path.startsWith(`${root}.`))

const diff = (
  before: unknown,
  after: unknown,
  path = '',
): WingsSideTourEnglishEditorialFieldChange[] => {
  if (
    wingsSideTourEnglishEditorialStableStringify(before) ===
    wingsSideTourEnglishEditorialStableStringify(after)
  ) {
    return []
  }
  if (Array.isArray(before) && Array.isArray(after)) {
    const length = Math.max(before.length, after.length)
    return Array.from({ length }, (_, index) =>
      diff(before[index], after[index], `${path}.${index}`),
    ).flat()
  }
  if (isRecord(before) && isRecord(after)) {
    return [...new Set([...Object.keys(before), ...Object.keys(after)])]
      .sort()
      .flatMap((key) => diff(before[key], after[key], path ? `${path}.${key}` : key))
  }
  return [{ after: clone(after), before: clone(before), path }]
}

const assertExactInventory = (
  documents: WingsSideTourEnglishEditorialDocument[],
  expectedSlugs: string[],
  label: string,
) => {
  if (
    expectedSlugs.length !== wingsSideTourEnglishEditorialExpectedCount ||
    new Set(expectedSlugs).size !== wingsSideTourEnglishEditorialExpectedCount
  ) {
    throw new Error('English editorial governance requires exactly 22 unique expected slugs')
  }
  const actual = documents.map(({ slug }) => slug)
  if (
    actual.length !== wingsSideTourEnglishEditorialExpectedCount ||
    new Set(actual).size !== actual.length
  ) {
    throw new Error(`${label} must contain exactly 22 unique tours`)
  }
  const missing = expectedSlugs.filter((slug) => !actual.includes(slug))
  const extra = actual.filter((slug) => !expectedSlugs.includes(slug))
  if (missing.length || extra.length) {
    throw new Error(`${label} inventory mismatch; missing=${missing.join(',')}; extra=${extra.join(',')}`)
  }
}

const rowIDs = (document: WingsSideTourEnglishEditorialDocument, path: string): string[] => {
  const rows = getAtPath(document, path)
  if (!Array.isArray(rows)) throw new Error(`Service row path is not an array: ${path}`)
  return rows.map((row, index) => {
    if (!isRecord(row) || (typeof row.id !== 'string' && typeof row.id !== 'number')) {
      throw new Error(`Service row is missing stable ID at ${path}.${index}`)
    }
    return String(row.id)
  })
}

const assertDocumentContract = ({
  after,
  before,
  config,
}: {
  after: WingsSideTourEnglishEditorialDocument
  before: WingsSideTourEnglishEditorialDocument
  config: WingsSideTourEnglishEditorialConfig
}) => {
  for (const path of config.requiredPaths) {
    if (!hasRequiredValue(getAtPath(after, path))) {
      throw new Error(`Required English editorial field is missing: ${after.slug}:${path}`)
    }
  }
  const changes = diff(before, after)
  const allowed = [...config.editorialPaths, ...(config.approvedFactualPaths ?? [])]
  for (const change of changes) {
    if (!pathIsWithin(change.path, allowed)) {
      throw new Error(`Unapproved English editorial field delta: ${after.slug}:${change.path}`)
    }
    if (
      pathIsWithin(change.path, config.lockedFactualPaths) &&
      !pathIsWithin(change.path, config.approvedFactualPaths ?? [])
    ) {
      throw new Error(`Unapproved factual field delta: ${after.slug}:${change.path}`)
    }
  }
  for (const path of config.serviceRowPaths ?? ['includes', 'excludes']) {
    const beforeIDs = rowIDs(before, path)
    const afterIDs = rowIDs(after, path)
    if (
      beforeIDs.length !== afterIDs.length ||
      beforeIDs.some((id, index) => id !== afterIDs[index])
    ) {
      throw new Error(`Service row cardinality or identity drift: ${after.slug}:${path}`)
    }
  }
  const lint = lintWingsSideTourEnglishEditorial({ config, tour: after })
  if (lint.length) {
    throw new Error(
      `English editorial lint failed: ${lint
        .map(({ code, match, path }) => `${after.slug}:${path}:${code}:${match}`)
        .join('; ')}`,
    )
  }
  return changes
}

const planPayload = (plan: Omit<WingsSideTourEnglishEditorialPlan, 'planChecksum'>) => plan

export const assertWingsSideTourEnglishEditorialPlan = (
  plan: WingsSideTourEnglishEditorialPlan,
) => {
  if (
    plan.planVersion !== wingsSideTourEnglishEditorialPlanVersion ||
    plan.mode !== 'plan' ||
    plan.expectedTourCount !== wingsSideTourEnglishEditorialExpectedCount
  ) {
    throw new Error('Invalid WingSide English editorial plan shape')
  }
  assertExactInventory(
    plan.entries.map(({ after }) => after),
    plan.expectedSlugs,
    'English editorial plan',
  )
  for (const entry of plan.entries) {
    if (
      entry.slug !== entry.before.slug ||
      entry.slug !== entry.after.slug ||
      entry.sourceChecksum !== wingsSideTourEnglishEditorialChecksum(entry.before) ||
      entry.afterChecksum !== wingsSideTourEnglishEditorialChecksum(entry.after) ||
      wingsSideTourEnglishEditorialStableStringify(entry.fieldChanges) !==
        wingsSideTourEnglishEditorialStableStringify(diff(entry.before, entry.after))
    ) {
      throw new Error(`English editorial plan entry checksum or summary mismatch: ${entry.slug}`)
    }
  }
  const aggregate = wingsSideTourEnglishEditorialChecksum(
    plan.entries.map(({ afterChecksum, slug, sourceChecksum }) => ({
      afterChecksum,
      slug,
      sourceChecksum,
    })),
  )
  if (aggregate !== plan.aggregateChecksum) {
    throw new Error('English editorial plan aggregate checksum mismatch')
  }
  const { planChecksum: _planChecksum, ...payload } = plan
  if (wingsSideTourEnglishEditorialChecksum(planPayload(payload)) !== plan.planChecksum) {
    throw new Error('English editorial plan checksum mismatch')
  }
}

export const buildWingsSideTourEnglishEditorialPlan = ({
  config,
  createdAt,
  expectedSlugs,
  proposedTours,
  runID,
  sourceTours,
}: {
  config: WingsSideTourEnglishEditorialConfig
  createdAt: string
  expectedSlugs: string[]
  proposedTours: WingsSideTourEnglishEditorialDocument[]
  runID: string
  sourceTours: WingsSideTourEnglishEditorialDocument[]
}): WingsSideTourEnglishEditorialPlan => {
  assertExactInventory(sourceTours, expectedSlugs, 'English editorial source')
  assertExactInventory(proposedTours, expectedSlugs, 'English editorial proposal')
  const sourceBySlug = new Map(sourceTours.map((tour) => [tour.slug, tour]))
  const proposedBySlug = new Map(proposedTours.map((tour) => [tour.slug, tour]))
  const entries = expectedSlugs.map((slug): WingsSideTourEnglishEditorialPlanEntry => {
    const before = clone(sourceBySlug.get(slug)!)
    const after = clone(proposedBySlug.get(slug)!)
    const fieldChanges = assertDocumentContract({ after, before, config })
    return {
      after,
      afterChecksum: wingsSideTourEnglishEditorialChecksum(after),
      before,
      fieldChanges,
      slug,
      sourceChecksum: wingsSideTourEnglishEditorialChecksum(before),
    }
  })
  const base = {
    aggregateChecksum: wingsSideTourEnglishEditorialChecksum(
      entries.map(({ afterChecksum, slug, sourceChecksum }) => ({
        afterChecksum,
        slug,
        sourceChecksum,
      })),
    ),
    createdAt,
    entries,
    expectedSlugs: [...expectedSlugs],
    expectedTourCount: 22 as const,
    mode: 'plan' as const,
    planVersion: 1 as const,
    runID,
  }
  const plan = {
    ...base,
    planChecksum: wingsSideTourEnglishEditorialChecksum(base),
  }
  assertWingsSideTourEnglishEditorialPlan(plan)
  return plan
}

const transition = ({
  currentTours,
  from,
  plan,
  to,
}: {
  currentTours: WingsSideTourEnglishEditorialDocument[]
  from: 'before' | 'after'
  plan: WingsSideTourEnglishEditorialPlan
  to: 'before' | 'after'
}): WingsSideTourEnglishEditorialDocument[] => {
  assertWingsSideTourEnglishEditorialPlan(plan)
  assertExactInventory(currentTours, plan.expectedSlugs, 'English editorial runtime')
  const currentBySlug = new Map(currentTours.map((tour) => [tour.slug, tour]))
  return plan.entries.map((entry) => {
    const current = currentBySlug.get(entry.slug)!
    const currentChecksum = wingsSideTourEnglishEditorialChecksum(current)
    const fromChecksum =
      from === 'before' ? entry.sourceChecksum : entry.afterChecksum
    const toChecksum = to === 'before' ? entry.sourceChecksum : entry.afterChecksum
    if (currentChecksum === toChecksum) return clone(entry[to])
    if (currentChecksum !== fromChecksum) {
      throw new Error(`English editorial source drift at runtime: ${entry.slug}`)
    }
    return clone(entry[to])
  })
}

export const applyWingsSideTourEnglishEditorialPlan = (
  plan: WingsSideTourEnglishEditorialPlan,
  currentTours: WingsSideTourEnglishEditorialDocument[],
) => transition({ currentTours, from: 'before', plan, to: 'after' })

export const rollbackWingsSideTourEnglishEditorialPlan = (
  plan: WingsSideTourEnglishEditorialPlan,
  currentTours: WingsSideTourEnglishEditorialDocument[],
) => transition({ currentTours, from: 'after', plan, to: 'before' })

export const verifyWingsSideTourEnglishEditorialPlan = (
  plan: WingsSideTourEnglishEditorialPlan,
  currentTours: WingsSideTourEnglishEditorialDocument[],
  expectedState: 'applied' | 'rolled-back',
) => {
  assertWingsSideTourEnglishEditorialPlan(plan)
  assertExactInventory(currentTours, plan.expectedSlugs, 'English editorial verification')
  const expectedKey = expectedState === 'applied' ? 'afterChecksum' : 'sourceChecksum'
  const currentBySlug = new Map(currentTours.map((tour) => [tour.slug, tour]))
  for (const entry of plan.entries) {
    if (
      wingsSideTourEnglishEditorialChecksum(currentBySlug.get(entry.slug)) !== entry[expectedKey]
    ) {
      throw new Error(`English editorial verification failed: ${entry.slug}:${expectedState}`)
    }
  }
  return true
}
