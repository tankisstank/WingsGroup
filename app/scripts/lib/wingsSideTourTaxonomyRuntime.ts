import type { Payload, PayloadRequest } from 'payload'

import {
  classifyTourTaxonomyState,
  extractTourTaxonomySnapshot,
  taxonomyChecksum,
  type TourTaxonomyDocument,
  type TourTaxonomyPlanRecord,
  type TourTaxonomySnapshot,
} from './wingsSideTourTaxonomy'

const updateSnapshot = async ({
  payload,
  record,
  req,
  snapshot,
}: {
  payload: Payload
  record: TourTaxonomyPlanRecord
  req: PayloadRequest
  snapshot: TourTaxonomySnapshot
}) =>
  payload.update({
    collection: 'tour-products',
    context: { disableRevalidate: true, taxonomyBackfill: 'US-049' },
    data: snapshot as never,
    id: record.id,
    locale: 'en',
    overrideAccess: true,
    req,
  })

const describeStateMismatch = ({
  documents,
  records,
}: {
  documents: TourTaxonomyDocument[]
  records: TourTaxonomyPlanRecord[]
}) => {
  const byID = new Map(documents.map((document) => [String(document.id), document]))
  for (const record of records) {
    const document = byID.get(String(record.id))
    if (!document) return `record ${record.id} is missing`
    if (document.sourceProvenance?.sourceId !== record.sourceID) {
      return `record ${record.id} source ID changed`
    }
    if (
      taxonomyChecksum(document.sourceProvenance ?? null) !== record.provenanceChecksum
    ) {
      return `record ${record.id} source provenance changed`
    }
    const currentChecksum = taxonomyChecksum(extractTourTaxonomySnapshot(document))
    const beforeChecksum = taxonomyChecksum(record.before)
    const afterChecksum = taxonomyChecksum(record.after)
    if (currentChecksum !== beforeChecksum && currentChecksum !== afterChecksum) {
      return `record ${record.id} taxonomy snapshot changed outside the signed states: ${JSON.stringify(
        extractTourTaxonomySnapshot(document),
      )}`
    }
  }
  return 'scope contains a mixed before/after state'
}

export const transitionTourTaxonomy = async ({
  failAfterUpdates,
  loadDocuments,
  payload,
  records,
  req,
  side,
}: {
  failAfterUpdates?: number
  loadDocuments: () => Promise<TourTaxonomyDocument[]>
  payload: Payload
  records: TourTaxonomyPlanRecord[]
  req: PayloadRequest
  side: 'after' | 'before'
}) => {
  const startingState = classifyTourTaxonomyState({
    documents: await loadDocuments(),
    records,
  })
  if (startingState === 'unknown') throw new Error('Taxonomy scope drifted from the signed plan')
  if (
    (side === 'after' && (startingState === 'after' || startingState === 'equivalent')) ||
    (side === 'before' && (startingState === 'before' || startingState === 'equivalent'))
  ) {
    return { resumed: true, state: startingState }
  }

  const originalVersions = payload.collections['tour-products'].config.versions
  const completed: TourTaxonomyPlanRecord[] = []
  try {
    payload.collections['tour-products'].config.versions = false as never
    const currentByID = new Map(
      (await loadDocuments()).map((document) => [String(document.id), document]),
    )
    for (const record of records) {
      const current = currentByID.get(String(record.id))
      if (!current) throw new Error(`Taxonomy target ${record.id} disappeared`)
      const currentChecksum = taxonomyChecksum(extractTourTaxonomySnapshot(current))
      const desired = record[side]
      const desiredChecksum = taxonomyChecksum(desired)
      const oppositeChecksum = taxonomyChecksum(record[side === 'after' ? 'before' : 'after'])
      if (currentChecksum !== desiredChecksum && currentChecksum !== oppositeChecksum) {
        throw new Error(`Taxonomy target ${record.id} drifted from both plan states`)
      }
      if (currentChecksum !== desiredChecksum) {
        await updateSnapshot({ payload, record, req, snapshot: desired })
        completed.push(record)
        if (failAfterUpdates && completed.length === failAfterUpdates) {
          throw new Error(`Injected taxonomy failure after ${completed.length} updates`)
        }
      }
    }

    const finalDocuments = await loadDocuments()
    const finalState = classifyTourTaxonomyState({
      documents: finalDocuments,
      records,
    })
    const expected = side === 'after' ? 'after' : 'before'
    if (finalState !== expected && finalState !== 'equivalent') {
      throw new Error(
        `Taxonomy verification failed with state ${finalState}: ${describeStateMismatch({
          documents: finalDocuments,
          records,
        })}`,
      )
    }
    return { resumed: false, state: finalState }
  } catch (error) {
    const restoreSide = side === 'after' ? 'before' : 'after'
    for (const record of completed.reverse()) {
      await updateSnapshot({ payload, record, req, snapshot: record[restoreSide] })
    }
    throw error
  } finally {
    payload.collections['tour-products'].config.versions = originalVersions
  }
}
