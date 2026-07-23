import {
  commitTransaction,
  initTransaction,
  killTransaction,
  type Payload,
  type PayloadRequest,
} from 'payload'

import {
  classifyReleaseRepairState,
  releaseRepairMediaUpdateData,
  releaseRepairProductUpdateData,
  releaseRepairWrapperUpdateData,
  type ReleaseRepairAggregate,
  type ReleaseRepairPlanRecord,
  type ReleaseRepairState,
} from './wingsSideBestPriceReleaseRepair'

const repairContext = {
  disableRevalidate: true,
  releaseRepair: 'wingsside-bestprice-release',
}

export const transitionReleaseRepairAtomically = async ({
  afterUpdates,
  batchID,
  failAfterUpdates,
  loadAggregates,
  payload,
  records,
  req,
  side,
  siteID,
}: {
  afterUpdates?: () => Promise<void>
  batchID: string
  failAfterUpdates?: number
  loadAggregates: () => Promise<ReleaseRepairAggregate[]>
  payload: Payload
  records: ReleaseRepairPlanRecord[]
  req: PayloadRequest
  side: 'after' | 'before'
  siteID: number | string
}) => {
  const originalProductVersions = payload.collections['tour-products'].config.versions
  const originalPageVersions = payload.collections.pages.config.versions
  let transactionStarted = false
  let updates = 0

  try {
    // Operational repairs disable version creation process-locally for tour-products
    // and pages only. Media version config is never altered. Existing history stays.
    payload.collections['tour-products'].config.versions = false as never
    payload.collections.pages.config.versions = false as never

    transactionStarted = await initTransaction(req)
    if (!transactionStarted || !req.transactionID) {
      throw new Error('Database adapter did not start the required release repair transaction')
    }

    const initialAggregates = await loadAggregates()
    const initialState = classifyReleaseRepairState({
      aggregates: initialAggregates,
      batchID,
      records,
      siteID,
    })
    const expectedInitialState: ReleaseRepairState = side === 'after' ? 'before' : 'after'
    if (initialState !== expectedInitialState) {
      throw new Error(
        `Release repair transaction refused stale input: expected ${expectedInitialState}, observed ${initialState}`,
      )
    }

    const aggregateByID = new Map(
      initialAggregates.map((aggregate) => [String(aggregate.product.id), aggregate]),
    )

    for (const record of records) {
      if (record.action === 'unchanged') continue

      const aggregate = aggregateByID.get(String(record.id))
      if (!aggregate) throw new Error(`Missing planned TourProduct ${record.id}`)

      if (String(aggregate.wrapper.id) !== String(record.wrapperPageID)) {
        throw new Error(`TourProduct ${record.id} wrapper relation drifted before write`)
      }
      if (String(aggregate.hero.id) !== String(record.heroMediaID)) {
        throw new Error(`TourProduct ${record.id} hero relation drifted before write`)
      }

      const productData = releaseRepairProductUpdateData(
        aggregate.product,
        record[side],
        record.changedPaths,
      )
      if (Object.keys(productData).length > 0) {
        await payload.update({
          collection: 'tour-products',
          context: repairContext,
          data: productData as never,
          id: record.id,
          locale: 'en',
          overrideAccess: true,
          req,
        })
        updates += 1
        if (failAfterUpdates !== undefined && updates >= failAfterUpdates) {
          throw new Error(`Injected release repair failure after ${updates} update(s)`)
        }
      }

      const wrapperData = releaseRepairWrapperUpdateData(
        aggregate.wrapper,
        record[side],
        record.changedPaths,
      )
      if (Object.keys(wrapperData).length > 0) {
        await payload.update({
          collection: 'pages',
          context: repairContext,
          data: wrapperData as never,
          id: record.wrapperPageID,
          locale: 'en',
          overrideAccess: true,
          req,
        })
        updates += 1
        if (failAfterUpdates !== undefined && updates >= failAfterUpdates) {
          throw new Error(`Injected release repair failure after ${updates} update(s)`)
        }
      }

      const mediaData = releaseRepairMediaUpdateData(
        aggregate.hero,
        record[side],
        record.changedPaths,
      )
      if (Object.keys(mediaData).length > 0) {
        await payload.update({
          collection: 'media',
          context: repairContext,
          data: mediaData as never,
          id: record.heroMediaID,
          overrideAccess: true,
          req,
        })
        updates += 1
        if (failAfterUpdates !== undefined && updates >= failAfterUpdates) {
          throw new Error(`Injected release repair failure after ${updates} update(s)`)
        }
      }
    }

    if (afterUpdates) await afterUpdates()

    const desiredState: ReleaseRepairState = side
    const verifiedAggregates = await loadAggregates()
    const verifiedState = classifyReleaseRepairState({
      aggregates: verifiedAggregates,
      batchID,
      records,
      siteID,
    })
    if (verifiedState !== desiredState) {
      throw new Error(
        `Release repair transaction verification failed before commit: expected ${desiredState}, observed ${verifiedState}`,
      )
    }

    await commitTransaction(req)
  } catch (error) {
    if (transactionStarted && req.transactionID) await killTransaction(req)
    throw error
  } finally {
    payload.collections['tour-products'].config.versions = originalProductVersions
    payload.collections.pages.config.versions = originalPageVersions
  }

  return { updates }
}
