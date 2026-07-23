import {
  bestPriceMediaFilename,
  resolveBestPriceMediaAlt,
  type BestPriceImage,
  type BestPriceNormalizedTour,
} from './bestprice22'
import {
  cleanCleanupTarget,
  cleanupChecksum,
  cleanupRelationID,
  extractCleanupTarget,
  wingsSideBestPriceCleanupBatchID,
  wingsSideBestPriceCleanupExpectedCount,
  wingsSideBestPriceCleanupSiteCode,
  type CleanupDocument,
  type CleanupFieldSnapshot,
  type CleanupState,
  type CleanupTargetSnapshot,
} from './wingsSideBestPriceCleanup'
import { classifyWingSideServices } from '../../src/tours/wingsSideTourViewModel'

export const wingsSideBestPriceReleaseRepairBatchID = wingsSideBestPriceCleanupBatchID
export const wingsSideBestPriceReleaseRepairSiteCode = wingsSideBestPriceCleanupSiteCode
export const wingsSideBestPriceReleaseRepairExpectedCount = wingsSideBestPriceCleanupExpectedCount

type JSONRecord = Record<string, unknown>

export type ReleaseRepairFieldSnapshot = CleanupFieldSnapshot

export type ReleaseRepairTargetSnapshot = {
  excludes: ReleaseRepairFieldSnapshot
  factSummaryOperatorNote: ReleaseRepairFieldSnapshot
  heroMediaAlt: ReleaseRepairFieldSnapshot
  includes: ReleaseRepairFieldSnapshot
  productMetaDescription: ReleaseRepairFieldSnapshot
  productSummary: ReleaseRepairFieldSnapshot
  servicesSummaryNotes: ReleaseRepairFieldSnapshot
  servicesSummaryOperatorNotes: ReleaseRepairFieldSnapshot
  wrapperMetaDescription: ReleaseRepairFieldSnapshot
}

/** Portable first-image contract used for filename validation and source checksums. */
export type ReleaseRepairFirstImage = {
  alt: string
  expectedFilename: string
  hash: string
  sourceKey: string
  sourceUrl: null | string
}

export type ReleaseRepairSourceDesired = {
  excludes: Array<{ label: string }>
  firstImage: ReleaseRepairFirstImage
  heroAlt: string
  includes: Array<{ label: string }>
  slug: string
  sourceId: string
  summary: string
}

export type ReleaseRepairProduct = JSONRecord & {
  _status?: null | string
  excludes?: unknown
  factSummary?: null | JSONRecord
  heroMedia?: unknown
  id: number | string
  includes?: unknown
  meta?: null | JSONRecord
  servicesSummary?: null | JSONRecord
  site?: unknown
  slug?: null | string
  sourceProvenance?: null | JSONRecord
  summary?: unknown
  tourCode?: null | string
  updatedAt?: null | string
  wrapperPage?: unknown
}

export type ReleaseRepairWrapper = JSONRecord & {
  id: number | string
  meta?: null | JSONRecord
  site?: unknown
  slug?: null | string
  updatedAt?: null | string
}

export type ReleaseRepairMedia = JSONRecord & {
  alt?: unknown
  filename?: null | string
  id: number | string
  site?: unknown
  updatedAt?: null | string
}

export type ReleaseRepairAggregate = {
  hero: ReleaseRepairMedia
  normalized: BestPriceNormalizedTour
  product: ReleaseRepairProduct
  wrapper: ReleaseRepairWrapper
}

export type ReleaseRepairPlanRecord = {
  action: 'unchanged' | 'update'
  after: ReleaseRepairTargetSnapshot
  afterChecksum: string
  before: ReleaseRepairTargetSnapshot
  beforeChecksum: string
  changedPaths: string[]
  heroMediaID: number | string
  id: number | string
  provenanceChecksum: string
  scopeChecksum: string
  slug: null | string
  sourceChecksum: string
  sourceDesired: ReleaseRepairSourceDesired
  sourceId: string
  status: null | string
  tourCode: null | string
  updatedAt: null | string
  wrapperPageID: number | string
}

export type ReleaseRepairState = CleanupState

export type ReleaseRepairProductUpdateData = {
  excludes?: unknown
  factSummary?: JSONRecord
  includes?: unknown
  meta?: JSONRecord
  servicesSummary?: JSONRecord
  summary?: unknown
}

export type ReleaseRepairWrapperUpdateData = {
  meta?: JSONRecord
}

export type ReleaseRepairMediaUpdateData = {
  alt?: unknown
}

const cloneJSON = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

const fieldSnapshot = (
  parent: null | undefined | JSONRecord,
  key: string,
): ReleaseRepairFieldSnapshot => ({
  present: Boolean(parent && Object.prototype.hasOwnProperty.call(parent, key)),
  value:
    parent && Object.prototype.hasOwnProperty.call(parent, key) ? cloneJSON(parent[key]) : null,
})

const rootFieldSnapshot = (document: JSONRecord, key: string): ReleaseRepairFieldSnapshot => ({
  present: Object.prototype.hasOwnProperty.call(document, key),
  value: Object.prototype.hasOwnProperty.call(document, key) ? cloneJSON(document[key]) : null,
})

const asRecord = (value: unknown): JSONRecord =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as JSONRecord) : {}

const toLabelRows = (labels: string[]): Array<{ label: string }> =>
  labels.map((label) => ({ label }))

export const releaseRepairChecksum = cleanupChecksum

export const releaseRepairRelationID = cleanupRelationID

const canonicalServiceRows = (
  snapshot: ReleaseRepairFieldSnapshot,
): ReleaseRepairFieldSnapshot => ({
  present: snapshot.present,
  value: Array.isArray(snapshot.value)
    ? snapshot.value.map((row) => {
        const record = asRecord(row)
        return { label: typeof record.label === 'string' ? record.label : null }
      })
    : cloneJSON(snapshot.value),
})

const releaseRepairStateTarget = (
  target: ReleaseRepairTargetSnapshot,
): ReleaseRepairTargetSnapshot => ({
  ...target,
  excludes: canonicalServiceRows(target.excludes),
  includes: canonicalServiceRows(target.includes),
})

export const releaseRepairStateChecksum = (target: ReleaseRepairTargetSnapshot): string =>
  releaseRepairChecksum(releaseRepairStateTarget(target))

const TARGET_PATHS = [
  'product.summary',
  'product.meta.description',
  'product.includes',
  'product.excludes',
  'product.factSummary.operatorNote',
  'product.servicesSummary.notes',
  'product.servicesSummary.operatorNotes',
  'wrapper.meta.description',
  'media.alt',
] as const

const pathToField = {
  'media.alt': 'heroMediaAlt',
  'product.excludes': 'excludes',
  'product.factSummary.operatorNote': 'factSummaryOperatorNote',
  'product.includes': 'includes',
  'product.meta.description': 'productMetaDescription',
  'product.servicesSummary.notes': 'servicesSummaryNotes',
  'product.servicesSummary.operatorNotes': 'servicesSummaryOperatorNotes',
  'product.summary': 'productSummary',
  'wrapper.meta.description': 'wrapperMetaDescription',
} as const satisfies Record<(typeof TARGET_PATHS)[number], keyof ReleaseRepairTargetSnapshot>

const REQUIRED_PRESENT_FIELDS: Array<{
  field: keyof ReleaseRepairTargetSnapshot
  path: string
}> = [
  { field: 'productSummary', path: 'product.summary' },
  { field: 'productMetaDescription', path: 'product.meta.description' },
  { field: 'includes', path: 'product.includes' },
  { field: 'excludes', path: 'product.excludes' },
  { field: 'factSummaryOperatorNote', path: 'product.factSummary.operatorNote' },
  { field: 'servicesSummaryNotes', path: 'product.servicesSummary.notes' },
  { field: 'servicesSummaryOperatorNotes', path: 'product.servicesSummary.operatorNotes' },
  { field: 'wrapperMetaDescription', path: 'wrapper.meta.description' },
  { field: 'heroMediaAlt', path: 'media.alt' },
]

export const extractReleaseRepairTarget = ({
  hero,
  product,
  wrapper,
}: {
  hero: ReleaseRepairMedia
  product: ReleaseRepairProduct
  wrapper: ReleaseRepairWrapper
}): ReleaseRepairTargetSnapshot => {
  const technical = extractCleanupTarget(product as CleanupDocument)
  return {
    excludes: rootFieldSnapshot(product, 'excludes'),
    factSummaryOperatorNote: technical.factSummaryOperatorNote,
    heroMediaAlt: rootFieldSnapshot(hero, 'alt'),
    includes: rootFieldSnapshot(product, 'includes'),
    productMetaDescription: fieldSnapshot(asRecord(product.meta), 'description'),
    productSummary: rootFieldSnapshot(product, 'summary'),
    servicesSummaryNotes: technical.servicesSummaryNotes,
    servicesSummaryOperatorNotes: technical.servicesSummaryOperatorNotes,
    wrapperMetaDescription: fieldSnapshot(asRecord(wrapper.meta), 'description'),
  }
}

const assertAllTargetFieldsPresent = (
  productID: number | string,
  before: ReleaseRepairTargetSnapshot,
) => {
  for (const { field, path } of REQUIRED_PRESENT_FIELDS) {
    if (!before[field].present) {
      throw new Error(
        `TourProduct ${productID} is missing required repair field ${path} (present must be true for exact rollback)`,
      )
    }
  }
}

export const portableSourceChecksum = (sourceDesired: ReleaseRepairSourceDesired): string =>
  releaseRepairChecksum({
    excludes: sourceDesired.excludes,
    firstImage: {
      alt: sourceDesired.firstImage.alt,
      expectedFilename: sourceDesired.firstImage.expectedFilename,
      hash: sourceDesired.firstImage.hash,
      sourceKey: sourceDesired.firstImage.sourceKey,
      sourceUrl: sourceDesired.firstImage.sourceUrl,
    },
    heroAlt: sourceDesired.heroAlt,
    includes: sourceDesired.includes,
    slug: sourceDesired.slug,
    sourceId: sourceDesired.sourceId,
    summary: sourceDesired.summary,
  })

export const buildReleaseRepairSourceDesired = (
  normalized: BestPriceNormalizedTour,
): ReleaseRepairSourceDesired => {
  if (!normalized.sourceId) throw new Error('Normalized tour is missing sourceId')
  if (!normalized.slug) throw new Error('Normalized tour is missing slug')
  const firstImage = normalized.images[0]
  if (!firstImage) throw new Error(`Normalized tour ${normalized.sourceId} is missing first image`)
  if (!firstImage.hash) {
    throw new Error(`Normalized tour ${normalized.sourceId} first image is missing hash`)
  }
  if (!firstImage.sourceKey) {
    throw new Error(`Normalized tour ${normalized.sourceId} first image is missing sourceKey`)
  }

  const classified = classifyWingSideServices({
    excludes: toLabelRows(normalized.excludes),
    includes: toLabelRows(normalized.includes),
  })

  const filenameInput: Pick<BestPriceImage, 'hash' | 'localPath'> = {
    hash: firstImage.hash,
    // Extension-only portable path: deterministicMediaFilename uses path.extname only.
    localPath: firstImage.localPath || 'image.jpg',
  }

  return {
    excludes: toLabelRows(classified.excludes),
    firstImage: {
      alt: firstImage.alt,
      expectedFilename: bestPriceMediaFilename(normalized.sourceId, 0, filenameInput),
      hash: firstImage.hash,
      sourceKey: firstImage.sourceKey,
      sourceUrl: firstImage.sourceUrl ?? null,
    },
    heroAlt: resolveBestPriceMediaAlt(firstImage.alt, normalized.title),
    includes: toLabelRows(classified.includes),
    slug: normalized.slug,
    sourceId: normalized.sourceId,
    summary: normalized.summary,
  }
}

export const buildReleaseRepairDesiredAfter = (
  before: ReleaseRepairTargetSnapshot,
  sourceDesired: ReleaseRepairSourceDesired,
): ReleaseRepairTargetSnapshot => {
  const cleanedTechnical = cleanCleanupTarget({
    factSummaryOperatorNote: before.factSummaryOperatorNote,
    servicesSummaryNotes: before.servicesSummaryNotes,
    servicesSummaryOperatorNotes: before.servicesSummaryOperatorNotes,
  } satisfies CleanupTargetSnapshot)
  const desiredExcludes: ReleaseRepairFieldSnapshot = {
    present: true,
    value: cloneJSON(sourceDesired.excludes),
  }
  const desiredIncludes: ReleaseRepairFieldSnapshot = {
    present: true,
    value: cloneJSON(sourceDesired.includes),
  }

  return {
    excludes:
      releaseRepairChecksum(canonicalServiceRows(before.excludes)) ===
      releaseRepairChecksum(desiredExcludes)
        ? cloneJSON(before.excludes)
        : desiredExcludes,
    factSummaryOperatorNote: cleanedTechnical.factSummaryOperatorNote,
    heroMediaAlt: { present: true, value: sourceDesired.heroAlt },
    includes:
      releaseRepairChecksum(canonicalServiceRows(before.includes)) ===
      releaseRepairChecksum(desiredIncludes)
        ? cloneJSON(before.includes)
        : desiredIncludes,
    productMetaDescription: { present: true, value: sourceDesired.summary },
    productSummary: { present: true, value: sourceDesired.summary },
    servicesSummaryNotes: cleanedTechnical.servicesSummaryNotes,
    servicesSummaryOperatorNotes: cleanedTechnical.servicesSummaryOperatorNotes,
    wrapperMetaDescription: { present: true, value: sourceDesired.summary },
  }
}

const changedPathsFor = (
  before: ReleaseRepairTargetSnapshot,
  after: ReleaseRepairTargetSnapshot,
): string[] =>
  TARGET_PATHS.filter((path) => {
    const field = pathToField[path]
    const canonicalize = path === 'product.includes' || path === 'product.excludes'
    const beforeField = canonicalize ? canonicalServiceRows(before[field]) : before[field]
    const afterField = canonicalize ? canonicalServiceRows(after[field]) : after[field]
    return releaseRepairChecksum(beforeField) !== releaseRepairChecksum(afterField)
  })

const scopeValue = ({
  batchID,
  hero,
  product,
  siteID,
  sourceDesired,
  wrapper,
}: {
  batchID: string
  hero: ReleaseRepairMedia
  product: ReleaseRepairProduct
  siteID: number | string
  sourceDesired: ReleaseRepairSourceDesired
  wrapper: ReleaseRepairWrapper
}) => {
  const wrapperPageID = releaseRepairRelationID(product.wrapperPage)
  const heroMediaID = releaseRepairRelationID(product.heroMedia)
  if (wrapperPageID === null) throw new Error(`TourProduct ${product.id} has no wrapperPage`)
  if (heroMediaID === null) throw new Error(`TourProduct ${product.id} has no heroMedia`)
  const provenanceChecksum = releaseRepairChecksum(product.sourceProvenance ?? null)
  const sourceChecksum = portableSourceChecksum(sourceDesired)

  return {
    heroMediaID,
    provenanceChecksum,
    scopeChecksum: releaseRepairChecksum({
      batchID,
      heroFilename: hero.filename ?? null,
      heroMediaID,
      id: product.id,
      provenanceChecksum,
      siteID,
      slug: product.slug ?? null,
      sourceId: sourceDesired.sourceId,
      status: product._status ?? null,
      tourCode: product.tourCode ?? null,
      wrapperPageID,
      wrapperSlug: wrapper.slug ?? null,
    }),
    sourceChecksum,
    wrapperPageID,
  }
}

const assertUnique = (values: Array<number | string | null>, label: string) => {
  const strings = values.map((value) => (value === null ? '' : String(value)))
  if (strings.some((value) => !value)) throw new Error(`Scoped aggregates have missing ${label}`)
  if (new Set(strings).size !== strings.length) {
    throw new Error(`Scoped aggregates contain duplicate ${label}`)
  }
}

export const assertReleaseRepairScope = ({
  aggregates,
  batchID = wingsSideBestPriceReleaseRepairBatchID,
  expectedCount = wingsSideBestPriceReleaseRepairExpectedCount,
  siteID,
}: {
  aggregates: ReleaseRepairAggregate[]
  batchID?: string
  expectedCount?: number
  siteID: number | string
}): ReleaseRepairAggregate[] => {
  if (aggregates.length !== expectedCount) {
    throw new Error(`Expected ${expectedCount} scoped aggregates, found ${aggregates.length}`)
  }

  assertUnique(
    aggregates.map(({ product }) => product.id),
    'product IDs',
  )
  assertUnique(
    aggregates.map(({ wrapper }) => wrapper.id),
    'wrapper IDs',
  )
  assertUnique(
    aggregates.map(({ hero }) => hero.id),
    'hero IDs',
  )
  assertUnique(
    aggregates.map(({ product }) => releaseRepairRelationID(product.wrapperPage)),
    'wrapper relation IDs',
  )
  assertUnique(
    aggregates.map(({ product }) => releaseRepairRelationID(product.heroMedia)),
    'hero relation IDs',
  )
  assertUnique(
    aggregates.map(({ product }) => product.slug ?? null),
    'slugs',
  )
  assertUnique(
    aggregates.map(({ product }) => product.tourCode ?? null),
    'tourCodes',
  )
  assertUnique(
    aggregates.map(({ product }) => {
      const sourceId = product.sourceProvenance?.sourceId
      return typeof sourceId === 'string' || typeof sourceId === 'number' ? sourceId : null
    }),
    'sourceIds',
  )

  for (const aggregate of aggregates) {
    const { hero, normalized, product, wrapper } = aggregate
    if (String(releaseRepairRelationID(product.site)) !== String(siteID)) {
      throw new Error(`TourProduct ${product.id} is outside the resolved site`)
    }
    if (String(releaseRepairRelationID(wrapper.site)) !== String(siteID)) {
      throw new Error(`Wrapper ${wrapper.id} is outside the resolved site`)
    }
    const heroSite = releaseRepairRelationID(hero.site)
    if (heroSite === null || String(heroSite) !== String(siteID)) {
      throw new Error(`Hero media ${hero.id} is outside the resolved site`)
    }
    if (product.sourceProvenance?.importBatchId !== batchID) {
      throw new Error(`TourProduct ${product.id} is outside the requested batch`)
    }
    if (product._status !== 'published') {
      throw new Error(`TourProduct ${product.id} must remain published`)
    }

    const wrapperPageID = releaseRepairRelationID(product.wrapperPage)
    const heroMediaID = releaseRepairRelationID(product.heroMedia)
    if (wrapperPageID === null || String(wrapperPageID) !== String(wrapper.id)) {
      throw new Error(`TourProduct ${product.id} wrapper relation does not match aggregate wrapper`)
    }
    if (heroMediaID === null || String(heroMediaID) !== String(hero.id)) {
      throw new Error(`TourProduct ${product.id} hero relation does not match aggregate hero`)
    }

    const sourceDesired = buildReleaseRepairSourceDesired(normalized)
    const productSourceId = product.sourceProvenance?.sourceId
    if (String(productSourceId ?? '') !== sourceDesired.sourceId) {
      throw new Error(`TourProduct ${product.id} sourceId does not match normalized source`)
    }
    if (product.slug !== sourceDesired.slug) {
      throw new Error(`TourProduct ${product.id} slug does not match normalized source slug`)
    }

    const expectedFilename = sourceDesired.firstImage.expectedFilename
    const acceptedFilenames = new Set([
      expectedFilename,
      expectedFilename.replace(/^bpt-/u, 'dcv-'),
    ])
    if (!acceptedFilenames.has(String(hero.filename || ''))) {
      throw new Error(
        `TourProduct ${product.id} hero filename mismatch: expected ${[...acceptedFilenames].join(' or ')}, found ${String(hero.filename || '')}`,
      )
    }

    const before = extractReleaseRepairTarget({ hero, product, wrapper })
    assertAllTargetFieldsPresent(product.id, before)
  }

  return [...aggregates].sort((left, right) =>
    String(left.product.id).localeCompare(String(right.product.id)),
  )
}

export const buildReleaseRepairPlanRecords = ({
  aggregates,
  batchID = wingsSideBestPriceReleaseRepairBatchID,
  expectedCount = wingsSideBestPriceReleaseRepairExpectedCount,
  siteID,
}: {
  aggregates: ReleaseRepairAggregate[]
  batchID?: string
  expectedCount?: number
  siteID: number | string
}): ReleaseRepairPlanRecord[] => {
  const scoped = assertReleaseRepairScope({ aggregates, batchID, expectedCount, siteID })

  return scoped.map((aggregate) => {
    const { hero, normalized, product, wrapper } = aggregate
    const before = extractReleaseRepairTarget({ hero, product, wrapper })
    const sourceDesired = buildReleaseRepairSourceDesired(normalized)
    const after = buildReleaseRepairDesiredAfter(before, sourceDesired)
    const changedPaths = changedPathsFor(before, after)
    const scope = scopeValue({ batchID, hero, product, siteID, sourceDesired, wrapper })

    return {
      action: changedPaths.length ? 'update' : 'unchanged',
      after,
      afterChecksum: releaseRepairStateChecksum(after),
      before,
      beforeChecksum: releaseRepairChecksum(before),
      changedPaths,
      heroMediaID: scope.heroMediaID,
      id: product.id,
      provenanceChecksum: scope.provenanceChecksum,
      scopeChecksum: scope.scopeChecksum,
      slug: product.slug ?? null,
      sourceChecksum: scope.sourceChecksum,
      sourceDesired,
      sourceId: sourceDesired.sourceId,
      status: product._status ?? null,
      tourCode: product.tourCode ?? null,
      updatedAt: product.updatedAt ?? null,
      wrapperPageID: scope.wrapperPageID,
    }
  })
}

export const releaseRepairAggregateChecksum = (
  records: ReleaseRepairPlanRecord[],
  side: 'after' | 'before',
): string =>
  releaseRepairChecksum(
    records.map((record) => ({ checksum: record[`${side}Checksum`], id: record.id })),
  )

export const assertReleaseRepairPlanRecords = (
  records: ReleaseRepairPlanRecord[],
  expectedCount = wingsSideBestPriceReleaseRepairExpectedCount,
) => {
  if (records.length !== expectedCount) throw new Error('Release repair plan record count mismatch')
  if (new Set(records.map(({ id }) => String(id))).size !== records.length) {
    throw new Error('Release repair plan contains duplicate TourProduct IDs')
  }
  if (new Set(records.map(({ wrapperPageID }) => String(wrapperPageID))).size !== records.length) {
    throw new Error('Release repair plan contains duplicate wrapperPage IDs')
  }
  if (new Set(records.map(({ heroMediaID }) => String(heroMediaID))).size !== records.length) {
    throw new Error('Release repair plan contains duplicate hero media IDs')
  }

  for (const record of records) {
    const derivedAfter = buildReleaseRepairDesiredAfter(record.before, record.sourceDesired)
    const derivedPaths = changedPathsFor(record.before, derivedAfter)
    const derivedSourceChecksum = portableSourceChecksum(record.sourceDesired)
    if (
      releaseRepairChecksum(record.before) !== record.beforeChecksum ||
      releaseRepairStateChecksum(record.after) !== record.afterChecksum ||
      releaseRepairStateChecksum(derivedAfter) !== record.afterChecksum ||
      releaseRepairChecksum(derivedPaths) !== releaseRepairChecksum(record.changedPaths) ||
      derivedSourceChecksum !== record.sourceChecksum ||
      record.action !== (derivedPaths.length ? 'update' : 'unchanged')
    ) {
      throw new Error(`Release repair plan record ${record.id} failed integrity validation`)
    }
  }
}

export const classifyReleaseRepairState = ({
  aggregates,
  batchID = wingsSideBestPriceReleaseRepairBatchID,
  records,
  siteID,
}: {
  aggregates: ReleaseRepairAggregate[]
  batchID?: string
  records: ReleaseRepairPlanRecord[]
  siteID: number | string
}): ReleaseRepairState => {
  const aggregateByID = new Map(
    aggregates.map((aggregate) => [String(aggregate.product.id), aggregate]),
  )
  if (aggregateByID.size !== records.length) return 'unknown'

  const states = new Set<'after' | 'before' | 'unknown'>()
  for (const record of records) {
    const aggregate = aggregateByID.get(String(record.id))
    if (!aggregate) return 'unknown'

    let scope
    try {
      const sourceDesired = buildReleaseRepairSourceDesired(aggregate.normalized)
      scope = scopeValue({
        batchID,
        hero: aggregate.hero,
        product: aggregate.product,
        siteID,
        sourceDesired,
        wrapper: aggregate.wrapper,
      })
    } catch {
      states.add('unknown')
      continue
    }

    if (
      scope.scopeChecksum !== record.scopeChecksum ||
      scope.provenanceChecksum !== record.provenanceChecksum ||
      scope.sourceChecksum !== record.sourceChecksum ||
      String(scope.wrapperPageID) !== String(record.wrapperPageID) ||
      String(scope.heroMediaID) !== String(record.heroMediaID)
    ) {
      states.add('unknown')
      continue
    }

    const currentTarget = extractReleaseRepairTarget({
      hero: aggregate.hero,
      product: aggregate.product,
      wrapper: aggregate.wrapper,
    })
    const checksum = releaseRepairChecksum(currentTarget)
    const stateChecksum = releaseRepairStateChecksum(currentTarget)
    if (record.beforeChecksum === record.afterChecksum) {
      if (checksum !== record.beforeChecksum) states.add('unknown')
      continue
    }
    if (checksum === record.beforeChecksum) states.add('before')
    else if (stateChecksum === record.afterChecksum) states.add('after')
    else states.add('unknown')
  }

  if (states.size === 0) return 'equivalent'
  if (states.size === 1) return [...states][0]
  return states.has('unknown') ? 'unknown' : 'mixed'
}

export const releaseRepairTransitionDecision = (
  mode: 'apply' | 'rollback',
  state: ReleaseRepairState,
): { desiredState: 'after' | 'before'; resumed: boolean } => {
  const expectedState = mode === 'apply' ? 'before' : 'after'
  const desiredState = mode === 'apply' ? 'after' : 'before'
  if (state === 'equivalent' || state === desiredState) return { desiredState, resumed: true }
  if (state === expectedState) return { desiredState, resumed: false }
  throw new Error(`Release repair ${mode} refused: expected ${expectedState}, observed ${state}`)
}

const snapshotValue = (snapshot: ReleaseRepairFieldSnapshot) => cloneJSON(snapshot.value)

export const releaseRepairProductUpdateData = (
  product: ReleaseRepairProduct,
  target: ReleaseRepairTargetSnapshot,
  changedPaths: string[],
): ReleaseRepairProductUpdateData => {
  const data: ReleaseRepairProductUpdateData = {}

  if (changedPaths.includes('product.summary')) {
    data.summary = snapshotValue(target.productSummary)
  }
  if (changedPaths.includes('product.meta.description')) {
    data.meta = {
      ...asRecord(product.meta),
      description: snapshotValue(target.productMetaDescription),
    }
  }
  if (changedPaths.includes('product.includes')) {
    data.includes = snapshotValue(target.includes)
  }
  if (changedPaths.includes('product.excludes')) {
    data.excludes = snapshotValue(target.excludes)
  }
  if (changedPaths.includes('product.factSummary.operatorNote')) {
    data.factSummary = {
      ...asRecord(product.factSummary),
      operatorNote: snapshotValue(target.factSummaryOperatorNote),
    }
  }
  if (changedPaths.some((path) => path.startsWith('product.servicesSummary.'))) {
    data.servicesSummary = {
      ...asRecord(product.servicesSummary),
      ...(changedPaths.includes('product.servicesSummary.notes')
        ? { notes: snapshotValue(target.servicesSummaryNotes) }
        : {}),
      ...(changedPaths.includes('product.servicesSummary.operatorNotes')
        ? { operatorNotes: snapshotValue(target.servicesSummaryOperatorNotes) }
        : {}),
    }
  }

  return data
}

export const releaseRepairWrapperUpdateData = (
  wrapper: ReleaseRepairWrapper,
  target: ReleaseRepairTargetSnapshot,
  changedPaths: string[],
): ReleaseRepairWrapperUpdateData => {
  if (!changedPaths.includes('wrapper.meta.description')) return {}
  return {
    meta: {
      ...asRecord(wrapper.meta),
      description: snapshotValue(target.wrapperMetaDescription),
    },
  }
}

export const releaseRepairMediaUpdateData = (
  _media: ReleaseRepairMedia,
  target: ReleaseRepairTargetSnapshot,
  changedPaths: string[],
): ReleaseRepairMediaUpdateData => {
  if (!changedPaths.includes('media.alt')) return {}
  return {
    alt: snapshotValue(target.heroMediaAlt),
  }
}

/** Pure plan contract: no creates, deletes, or relation rewrites are represented. */
export const releaseRepairPlanRepresentsOnlyFieldUpdates = (
  records: ReleaseRepairPlanRecord[],
): boolean =>
  records.every(
    (record) =>
      record.changedPaths.every((path) => (TARGET_PATHS as readonly string[]).includes(path)) &&
      !record.changedPaths.some((path) =>
        /(?:create|delete|wrapperPage|heroMedia|gallery|site)/iu.test(path),
      ),
  )
