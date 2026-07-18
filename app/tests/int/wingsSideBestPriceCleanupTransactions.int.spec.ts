import config from '@/payload.config'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createLocalReq, getPayload, type Payload, type PayloadRequest } from 'payload'

import {
  buildCleanupPlanRecords,
  classifyCleanupState,
  cleanupRelationID,
  wingsSideBestPriceCleanupBatchID,
  wingsSideBestPriceTechnicalCopy,
  type CleanupDocument,
} from '../../scripts/lib/wingsSideBestPriceCleanup'
import { transitionCleanupAtomically } from '../../scripts/lib/wingsSideBestPriceCleanupRuntime'
import { buildBestPriceWrapperLayout } from '../../scripts/lib/bestprice22'

const runAdapterProof = process.env.RUN_CLEANUP_ADAPTER_INT === 'true'
const adapterDescribe = runAdapterProof ? describe : describe.skip

adapterDescribe('WingSide BestPrice cleanup adapter transaction proof', () => {
  let payload: Payload
  let req: PayloadRequest
  let siteID: number | string
  const pageIDs: Array<number | string> = []
  const productIDs: Array<number | string> = []
  const suffix = `${process.pid}-${Date.now()}`

  beforeAll(async () => {
    payload = await getPayload({ config })
    if (process.env.CLEANUP_EXPECT_ADAPTER) {
      expect(payload.db.packageName).toContain(process.env.CLEANUP_EXPECT_ADAPTER)
    }
    req = await createLocalReq(
      {
        user: {
          collection: 'users',
          createdAt: new Date(0).toISOString(),
          email: 'cleanup-adapter-proof@internal.invalid',
          id: 0,
          role: 'super-admin',
          sites: [],
          updatedAt: new Date(0).toISOString(),
        } as never,
      },
      payload,
    )
    const site = await payload.create({
      collection: 'sites',
      context: { disableRevalidate: true },
      data: {
        code: `cleanup-proof-${suffix}`,
        defaultLocale: 'en',
        isActive: false,
        name: `Cleanup proof ${suffix}`,
        primaryDomain: `cleanup-proof-${suffix}.invalid`,
        supportedLocales: ['en'],
      },
      overrideAccess: true,
      req,
    })
    siteID = site.id

    for (const index of [1, 2]) {
      const page = await payload.create({
        collection: 'pages',
        context: { disableRevalidate: true },
        data: {
          _status: 'draft',
          hero: { type: 'none' },
          layout: buildBestPriceWrapperLayout('Cleanup adapter proof.') as never,
          pathname: `/tour/cleanup-proof-${suffix}-${index}`,
          site: siteID,
          slug: `cleanup-proof-${suffix}-${index}`,
          title: `Cleanup proof ${index}`,
        },
        locale: 'en',
        overrideAccess: true,
        req,
      })
      pageIDs.push(page.id)
      const product = await payload.create({
        collection: 'tour-products',
        context: { disableRevalidate: true },
        data: {
          _status: 'draft',
          durationDays: 1,
          durationNights: 0,
          factSummary: {
            operatorNote: wingsSideBestPriceTechnicalCopy.factSummaryOperatorNote,
          },
          itineraryDays: [{ dayNumber: 1, summary: 'Proof day', title: 'Proof day' }],
          market: 'vietnam',
          servicesSummary: {
            notes: [
              { label: 'Keep this note.' },
              { label: wingsSideBestPriceTechnicalCopy.servicesSummaryNoteLabel },
            ],
            operatorNotes: wingsSideBestPriceTechnicalCopy.servicesSummaryOperatorNotes,
          },
          site: siteID,
          slug: `cleanup-proof-${suffix}-${index}`,
          sourceProvenance: {
            importBatchId: wingsSideBestPriceCleanupBatchID,
            sourceHash: `proof-${index}`,
            sourceId: `proof-${index}`,
          },
          summary: 'Cleanup adapter transaction proof.',
          title: `Cleanup proof ${index}`,
          tourCode: `CLEANUP-PROOF-${suffix}-${index}`,
          wrapperPage: page.id,
        },
        draft: true,
        locale: 'en',
        overrideAccess: true,
        req,
      })
      productIDs.push(product.id)
    }
  }, 120_000)

  afterAll(async () => {
    if (!payload) return
    for (const id of productIDs) {
      await payload.delete({
        collection: 'tour-products',
        context: { disableRevalidate: true },
        id,
        overrideAccess: true,
        req,
      })
    }
    for (const id of pageIDs) {
      await payload.delete({
        collection: 'pages',
        context: { disableRevalidate: true },
        id,
        overrideAccess: true,
        req,
      })
    }
    if (siteID) {
      await payload.delete({
        collection: 'sites',
        context: { disableRevalidate: true },
        id: siteID,
        overrideAccess: true,
        req,
      })
    }
    await payload.destroy()
  }, 120_000)

  const readDocuments = async () => {
    const result = await payload.find({
      collection: 'tour-products',
      depth: 0,
      fallbackLocale: false,
      limit: 10,
      locale: 'en',
      overrideAccess: true,
      pagination: false,
      req,
      where: { site: { equals: siteID } },
    })
    return result.docs as unknown as CleanupDocument[]
  }

  it('matches nested JSON scope to in-process provenance filtering', async () => {
    const all = await readDocuments()
    const inProcessIDs = all
      .filter(
        (document) =>
          document.sourceProvenance?.importBatchId === wingsSideBestPriceCleanupBatchID,
      )
      .map(({ id }) => String(id))
      .sort()
    const nested = await payload.find({
      collection: 'tour-products',
      depth: 0,
      limit: 10,
      overrideAccess: true,
      pagination: false,
      req,
      where: {
        and: [
          { site: { equals: siteID } },
          {
            'sourceProvenance.importBatchId': {
              equals: wingsSideBestPriceCleanupBatchID,
            },
          },
        ],
      },
    })

    expect(nested.docs.map(({ id }) => String(id)).sort()).toEqual(inProcessIDs)
  })

  it('rolls back all writes after an injected mid-transaction failure', async () => {
    const documents = await readDocuments()
    const records = buildCleanupPlanRecords({
      batchID: wingsSideBestPriceCleanupBatchID,
      documents,
      siteID,
    })
    expect(records).toHaveLength(2)
    expect(records.every(({ action }) => action === 'update')).toBe(true)
    const originalVersionConfig = payload.collections['tour-products'].config.versions
    const versionsBefore = await payload.countVersions({
      collection: 'tour-products',
      overrideAccess: true,
      req,
      where: { parent: { in: productIDs } },
    })

    const transition = transitionCleanupAtomically({
      batchID: wingsSideBestPriceCleanupBatchID,
      failAfterUpdates: 1,
      loadDocuments: readDocuments,
      payload,
      records,
      req,
      side: 'after',
      siteID,
    })
    if (payload.db.packageName.includes('db-sqlite')) {
      await expect(transition).rejects.toThrow(
        'Database adapter did not start the required cleanup transaction',
      )
    } else {
      await expect(transition).rejects.toThrow('Injected cleanup failure after 1 update')
    }

    const afterFailure = await readDocuments()
    expect(
      classifyCleanupState({
        batchID: wingsSideBestPriceCleanupBatchID,
        documents: afterFailure,
        records,
        siteID,
      }),
    ).toBe('before')
    expect(payload.collections['tour-products'].config.versions).toBe(originalVersionConfig)
    await expect(
      payload.countVersions({
        collection: 'tour-products',
        overrideAccess: true,
        req,
        where: { parent: { in: productIDs } },
      }),
    ).resolves.toEqual(versionsBefore)

    // SQLite is supported for planning/parity proof only. Applying without an adapter
    // transaction must remain fail-closed; PostgreSQL continues through apply/rollback.
    if (payload.db.packageName.includes('db-sqlite')) return

    await expect(
      transitionCleanupAtomically({
        afterUpdates: async () => {
          const current = (await readDocuments())[0]
          await payload.update({
            collection: 'tour-products',
            context: { cleanup: 'drift-injection', disableRevalidate: true },
            data: {
              servicesSummary: {
                ...(current.servicesSummary || {}),
                operatorNotes: 'Injected pre-commit drift.',
              },
            } as never,
            id: current.id,
            locale: 'en',
            overrideAccess: true,
            req,
          })
        },
        batchID: wingsSideBestPriceCleanupBatchID,
        loadDocuments: readDocuments,
        payload,
        records,
        req,
        side: 'after',
        siteID,
      }),
    ).rejects.toThrow('verification failed before commit')
    expect(
      classifyCleanupState({
        batchID: wingsSideBestPriceCleanupBatchID,
        documents: await readDocuments(),
        records,
        siteID,
      }),
    ).toBe('before')

    await transitionCleanupAtomically({
      batchID: wingsSideBestPriceCleanupBatchID,
      loadDocuments: readDocuments,
      payload,
      records,
      req,
      side: 'after',
      siteID,
    })
    const applied = await readDocuments()
    expect(
      classifyCleanupState({
        batchID: wingsSideBestPriceCleanupBatchID,
        documents: applied,
        records,
        siteID,
      }),
    ).toBe('after')
    expect(
      (applied[0].servicesSummary?.notes as Array<Record<string, unknown>>).map(({ label }) => label),
    ).toEqual(['Keep this note.'])

    await transitionCleanupAtomically({
      batchID: wingsSideBestPriceCleanupBatchID,
      loadDocuments: readDocuments,
      payload,
      records,
      req,
      side: 'before',
      siteID,
    })
    const rolledBack = await readDocuments()
    expect(
      classifyCleanupState({
        batchID: wingsSideBestPriceCleanupBatchID,
        documents: rolledBack,
        records,
        siteID,
      }),
    ).toBe('before')
    expect(rolledBack.every(({ wrapperPage }) => cleanupRelationID(wrapperPage) !== null)).toBe(true)
  }, 120_000)
})
