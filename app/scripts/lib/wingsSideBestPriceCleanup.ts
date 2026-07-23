import { createHash } from 'node:crypto'

export const wingsSideBestPriceCleanupBatchID = 'wingsside-bestprice-22-20260717'
export const wingsSideBestPriceCleanupSiteCode = 'wing-side'
export const wingsSideBestPriceCleanupExpectedCount = 22

export const wingsSideBestPriceTechnicalCopy = {
  factSummaryOperatorNote:
    'Imported from BestPrice Travel raw crawl for WingSide editorial review.',
  servicesSummaryOperatorNotes:
    'BestPrice source does not provide fixed future departure dates in this raw batch.',
  servicesSummaryNoteLabel:
    'Sales must confirm final price and departure availability before publishing.',
} as const

type JSONRecord = Record<string, unknown>

export type CleanupDocument = JSONRecord & {
  _status?: null | string
  factSummary?: null | JSONRecord
  id: number | string
  servicesSummary?: null | JSONRecord
  site?: unknown
  slug?: null | string
  sourceProvenance?: null | JSONRecord
  tourCode?: null | string
  updatedAt?: null | string
  wrapperPage?: unknown
}

export type CleanupFieldSnapshot = {
  present: boolean
  value: unknown
}

export type CleanupTargetSnapshot = {
  factSummaryOperatorNote: CleanupFieldSnapshot
  servicesSummaryNotes: CleanupFieldSnapshot
  servicesSummaryOperatorNotes: CleanupFieldSnapshot
}

export type CleanupPlanRecord = {
  action: 'unchanged' | 'update'
  after: CleanupTargetSnapshot
  afterChecksum: string
  before: CleanupTargetSnapshot
  beforeChecksum: string
  changedPaths: string[]
  id: number | string
  provenanceChecksum: string
  scopeChecksum: string
  slug: null | string
  status: null | string
  tourCode: null | string
  updatedAt: null | string
  wrapperPageID: number | string
}

export type CleanupState = 'after' | 'before' | 'equivalent' | 'mixed' | 'unknown'

export const cleanupTransitionDecision = (
  mode: 'apply' | 'rollback',
  state: CleanupState,
): { desiredState: 'after' | 'before'; resumed: boolean } => {
  const expectedState = mode === 'apply' ? 'before' : 'after'
  const desiredState = mode === 'apply' ? 'after' : 'before'
  if (state === 'equivalent' || state === desiredState) return { desiredState, resumed: true }
  if (state === expectedState) return { desiredState, resumed: false }
  throw new Error(`Cleanup ${mode} refused: expected ${expectedState}, observed ${state}`)
}

const stableValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stableValue)
  if (!value || typeof value !== 'object') return value

  return Object.fromEntries(
    Object.entries(value as JSONRecord)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, stableValue(entry)]),
  )
}

export const cleanupChecksum = (value: unknown): string =>
  createHash('sha256')
    .update(JSON.stringify(stableValue(value)) ?? 'undefined')
    .digest('hex')

const cloneJSON = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

export const cleanupRelationID = (value: unknown): number | string | null => {
  if (typeof value === 'number' || typeof value === 'string') return value
  if (value && typeof value === 'object') {
    const id = (value as JSONRecord).id
    if (typeof id === 'number' || typeof id === 'string') return id
  }
  return null
}

const noteLabel = (value: unknown): unknown =>
  value && typeof value === 'object' ? (value as JSONRecord).label : undefined

const fieldSnapshot = (
  parent: null | undefined | JSONRecord,
  key: string,
): CleanupFieldSnapshot => ({
  present: Boolean(parent && Object.prototype.hasOwnProperty.call(parent, key)),
  value:
    parent && Object.prototype.hasOwnProperty.call(parent, key) ? cloneJSON(parent[key]) : null,
})

export const extractCleanupTarget = (document: CleanupDocument): CleanupTargetSnapshot => ({
  factSummaryOperatorNote: fieldSnapshot(document.factSummary, 'operatorNote'),
  servicesSummaryNotes: fieldSnapshot(document.servicesSummary, 'notes'),
  servicesSummaryOperatorNotes: fieldSnapshot(document.servicesSummary, 'operatorNotes'),
})

export const cleanCleanupTarget = (before: CleanupTargetSnapshot): CleanupTargetSnapshot => ({
  factSummaryOperatorNote:
    before.factSummaryOperatorNote.present &&
    before.factSummaryOperatorNote.value === wingsSideBestPriceTechnicalCopy.factSummaryOperatorNote
      ? { present: true, value: null }
      : before.factSummaryOperatorNote,
  servicesSummaryNotes:
    before.servicesSummaryNotes.present && Array.isArray(before.servicesSummaryNotes.value)
      ? {
          present: true,
          value: before.servicesSummaryNotes.value.filter(
            (note) => noteLabel(note) !== wingsSideBestPriceTechnicalCopy.servicesSummaryNoteLabel,
          ),
        }
      : before.servicesSummaryNotes,
  servicesSummaryOperatorNotes:
    before.servicesSummaryOperatorNotes.present &&
    before.servicesSummaryOperatorNotes.value ===
      wingsSideBestPriceTechnicalCopy.servicesSummaryOperatorNotes
      ? { present: true, value: null }
      : before.servicesSummaryOperatorNotes,
})

const changedPathsFor = (before: CleanupTargetSnapshot, after: CleanupTargetSnapshot): string[] => {
  const paths: string[] = []
  if (
    cleanupChecksum(before.factSummaryOperatorNote) !==
    cleanupChecksum(after.factSummaryOperatorNote)
  ) {
    paths.push('factSummary.operatorNote')
  }
  if (
    cleanupChecksum(before.servicesSummaryOperatorNotes) !==
    cleanupChecksum(after.servicesSummaryOperatorNotes)
  ) {
    paths.push('servicesSummary.operatorNotes')
  }
  if (
    cleanupChecksum(before.servicesSummaryNotes) !== cleanupChecksum(after.servicesSummaryNotes)
  ) {
    paths.push('servicesSummary.notes')
  }
  return paths
}

const scopeValue = ({
  batchID,
  document,
  siteID,
}: {
  batchID: string
  document: CleanupDocument
  siteID: number | string
}) => {
  const wrapperPageID = cleanupRelationID(document.wrapperPage)
  if (wrapperPageID === null) throw new Error(`TourProduct ${document.id} has no wrapperPage`)
  const provenanceChecksum = cleanupChecksum(document.sourceProvenance ?? null)

  return {
    provenanceChecksum,
    scopeChecksum: cleanupChecksum({
      batchID,
      id: document.id,
      provenanceChecksum,
      siteID,
      status: document._status ?? null,
      wrapperPageID,
    }),
    wrapperPageID,
  }
}

export const assertCleanupScope = ({
  batchID,
  documents,
  expectedCount = wingsSideBestPriceCleanupExpectedCount,
  siteID,
  wrapperSiteByID,
}: {
  batchID: string
  documents: CleanupDocument[]
  expectedCount?: number
  siteID: number | string
  wrapperSiteByID: Map<string, number | string>
}): CleanupDocument[] => {
  if (documents.length !== expectedCount) {
    throw new Error(`Expected ${expectedCount} scoped TourProducts, found ${documents.length}`)
  }
  if (new Set(documents.map(({ id }) => String(id))).size !== documents.length) {
    throw new Error('Scoped TourProducts contain duplicate IDs')
  }
  const wrapperIDs = documents.map(({ wrapperPage }) => cleanupRelationID(wrapperPage))
  if (
    wrapperIDs.some((id) => id === null) ||
    new Set(wrapperIDs.map((id) => String(id))).size !== documents.length
  ) {
    throw new Error('Scoped TourProducts must have distinct wrapperPages')
  }

  for (const document of documents) {
    if (String(cleanupRelationID(document.site)) !== String(siteID)) {
      throw new Error(`TourProduct ${document.id} is outside the resolved site`)
    }
    if (document.sourceProvenance?.importBatchId !== batchID) {
      throw new Error(`TourProduct ${document.id} is outside the requested batch`)
    }
    if (document._status !== 'published') {
      throw new Error(`TourProduct ${document.id} must remain published`)
    }
    const wrapperPageID = cleanupRelationID(document.wrapperPage)
    if (wrapperPageID === null) throw new Error(`TourProduct ${document.id} has no wrapperPage`)
    if (String(wrapperSiteByID.get(String(wrapperPageID))) !== String(siteID)) {
      throw new Error(
        `TourProduct ${document.id} wrapperPage is missing or belongs to another site`,
      )
    }
  }

  return [...documents].sort((left, right) => String(left.id).localeCompare(String(right.id)))
}

export const buildCleanupPlanRecords = ({
  batchID,
  documents,
  siteID,
}: {
  batchID: string
  documents: CleanupDocument[]
  siteID: number | string
}): CleanupPlanRecord[] =>
  documents.map((document) => {
    const before = extractCleanupTarget(document)
    const after = cleanCleanupTarget(before)
    const changedPaths = changedPathsFor(before, after)
    const scope = scopeValue({ batchID, document, siteID })

    return {
      action: changedPaths.length ? 'update' : 'unchanged',
      after,
      afterChecksum: cleanupChecksum(after),
      before,
      beforeChecksum: cleanupChecksum(before),
      changedPaths,
      id: document.id,
      provenanceChecksum: scope.provenanceChecksum,
      scopeChecksum: scope.scopeChecksum,
      slug: document.slug ?? null,
      status: document._status ?? null,
      tourCode: document.tourCode ?? null,
      updatedAt: document.updatedAt ?? null,
      wrapperPageID: scope.wrapperPageID,
    }
  })

export const cleanupAggregateChecksum = (
  records: CleanupPlanRecord[],
  side: 'after' | 'before',
): string =>
  cleanupChecksum(records.map((record) => ({ id: record.id, checksum: record[`${side}Checksum`] })))

export const assertCleanupPlanRecords = (
  records: CleanupPlanRecord[],
  expectedCount = wingsSideBestPriceCleanupExpectedCount,
) => {
  if (records.length !== expectedCount) throw new Error('Cleanup plan record count mismatch')
  if (new Set(records.map(({ id }) => String(id))).size !== records.length) {
    throw new Error('Cleanup plan contains duplicate TourProduct IDs')
  }
  if (new Set(records.map(({ wrapperPageID }) => String(wrapperPageID))).size !== records.length) {
    throw new Error('Cleanup plan contains duplicate wrapperPage IDs')
  }

  for (const record of records) {
    const derivedAfter = cleanCleanupTarget(record.before)
    const derivedPaths = changedPathsFor(record.before, derivedAfter)
    if (
      cleanupChecksum(record.before) !== record.beforeChecksum ||
      cleanupChecksum(record.after) !== record.afterChecksum ||
      cleanupChecksum(derivedAfter) !== record.afterChecksum ||
      cleanupChecksum(derivedPaths) !== cleanupChecksum(record.changedPaths) ||
      record.action !== (derivedPaths.length ? 'update' : 'unchanged')
    ) {
      throw new Error(`Cleanup plan record ${record.id} failed integrity validation`)
    }
  }
}

export const classifyCleanupState = ({
  batchID,
  documents,
  records,
  siteID,
}: {
  batchID: string
  documents: CleanupDocument[]
  records: CleanupPlanRecord[]
  siteID: number | string
}): CleanupState => {
  const documentByID = new Map(documents.map((document) => [String(document.id), document]))
  if (documentByID.size !== records.length) return 'unknown'

  const states = new Set<'after' | 'before' | 'unknown'>()
  for (const record of records) {
    const document = documentByID.get(String(record.id))
    if (!document) return 'unknown'
    const scope = scopeValue({ batchID, document, siteID })
    if (
      scope.scopeChecksum !== record.scopeChecksum ||
      scope.provenanceChecksum !== record.provenanceChecksum
    ) {
      states.add('unknown')
      continue
    }

    const checksum = cleanupChecksum(extractCleanupTarget(document))
    if (record.beforeChecksum === record.afterChecksum) {
      if (checksum !== record.beforeChecksum) states.add('unknown')
      continue
    }
    if (checksum === record.beforeChecksum) states.add('before')
    else if (checksum === record.afterChecksum) states.add('after')
    else states.add('unknown')
  }

  if (states.size === 0) return 'equivalent'
  if (states.size === 1) return [...states][0]
  return states.has('unknown') ? 'unknown' : 'mixed'
}

export const cleanupUpdateData = (
  document: CleanupDocument,
  target: CleanupTargetSnapshot,
  changedPaths: string[],
): JSONRecord => ({
  ...(changedPaths.includes('factSummary.operatorNote')
    ? {
        factSummary: {
          ...(document.factSummary || {}),
          operatorNote: cloneJSON(target.factSummaryOperatorNote.value),
        },
      }
    : {}),
  ...(changedPaths.some((path) => path.startsWith('servicesSummary.'))
    ? {
        servicesSummary: {
          ...(document.servicesSummary || {}),
          ...(changedPaths.includes('servicesSummary.notes')
            ? { notes: cloneJSON(target.servicesSummaryNotes.value) }
            : {}),
          ...(changedPaths.includes('servicesSummary.operatorNotes')
            ? { operatorNotes: cloneJSON(target.servicesSummaryOperatorNotes.value) }
            : {}),
        },
      }
    : {}),
})
