import {
  commitTransaction,
  initTransaction,
  killTransaction,
  type Payload,
  type PayloadRequest,
} from 'payload'

import {
  classifyCleanupState,
  cleanupUpdateData,
  type CleanupDocument,
  type CleanupPlanRecord,
  type CleanupState,
} from './wingsSideBestPriceCleanup'

const cleanupContext = { cleanup: 'wingsside-bestprice-22', disableRevalidate: true }

export const transitionCleanupAtomically = async ({
  afterUpdates,
  batchID,
  failAfterUpdates,
  loadDocuments,
  payload,
  records,
  req,
  side,
  siteID,
}: {
  afterUpdates?: () => Promise<void>
  batchID: string
  failAfterUpdates?: number
  loadDocuments: () => Promise<CleanupDocument[]>
  payload: Payload
  records: CleanupPlanRecord[]
  req: PayloadRequest
  side: 'after' | 'before'
  siteID: number | string
}) => {
  const originalVersions = payload.collections['tour-products'].config.versions
  let transactionStarted = false
  let updates = 0
  try {
    // Operational backfills in this repository use this process-local switch to avoid
    // manufacturing draft/version rows. Existing history remains untouched.
    payload.collections['tour-products'].config.versions = false as never
    transactionStarted = await initTransaction(req)
    if (!transactionStarted || !req.transactionID) {
      throw new Error('Database adapter did not start the required cleanup transaction')
    }
    const initialDocuments = await loadDocuments()
    const initialState = classifyCleanupState({ batchID, documents: initialDocuments, records, siteID })
    const expectedInitialState: CleanupState = side === 'after' ? 'before' : 'after'
    if (initialState !== expectedInitialState) {
      throw new Error(
        `Cleanup transaction refused stale input: expected ${expectedInitialState}, observed ${initialState}`,
      )
    }
    const documentByID = new Map(
      initialDocuments.map((document) => [String(document.id), document]),
    )
    for (const record of records) {
      if (record.action === 'unchanged') continue
      const document = documentByID.get(String(record.id))
      if (!document) throw new Error(`Missing planned TourProduct ${record.id}`)
      await payload.update({
        collection: 'tour-products',
        context: cleanupContext,
        data: cleanupUpdateData(document, record[side], record.changedPaths) as never,
        id: record.id,
        locale: 'en',
        overrideAccess: true,
        req,
      })
      updates += 1
      if (failAfterUpdates !== undefined && updates >= failAfterUpdates) {
        throw new Error(`Injected cleanup failure after ${updates} update(s)`)
      }
    }
    if (afterUpdates) await afterUpdates()
    const desiredState: CleanupState = side
    const verifiedDocuments = await loadDocuments()
    const verifiedState = classifyCleanupState({ batchID, documents: verifiedDocuments, records, siteID })
    if (verifiedState !== desiredState) {
      throw new Error(
        `Cleanup transaction verification failed before commit: expected ${desiredState}, observed ${verifiedState}`,
      )
    }
    await commitTransaction(req)
  } catch (error) {
    if (transactionStarted && req.transactionID) await killTransaction(req)
    throw error
  } finally {
    payload.collections['tour-products'].config.versions = originalVersions
  }

  return { updates }
}
