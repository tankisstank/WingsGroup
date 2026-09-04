import config from '@/payload.config'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createLocalReq, getPayload, type File, type Payload, type PayloadRequest } from 'payload'

import {
  bestPriceMediaFilename,
  buildBestPriceWrapperLayout,
  type BestPriceNormalizedTour,
} from '../../scripts/lib/bestprice22'
import {
  buildReleaseRepairPlanRecords,
  classifyReleaseRepairState,
  releaseRepairRelationID,
  releaseRepairTransitionDecision,
  wingsSideBestPriceReleaseRepairBatchID,
  type ReleaseRepairAggregate,
  type ReleaseRepairMedia,
  type ReleaseRepairProduct,
  type ReleaseRepairWrapper,
} from '../../scripts/lib/wingsSideBestPriceReleaseRepair'
import { transitionReleaseRepairAtomically } from '../../scripts/lib/wingsSideBestPriceReleaseRepairRuntime'
import { wingsSideBestPriceTechnicalCopy } from '../../scripts/lib/wingsSideBestPriceCleanup'

const runAdapterProof = process.env.RUN_RELEASE_REPAIR_ADAPTER_INT === 'true'
const adapterDescribe = runAdapterProof ? describe : describe.skip

const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
)

adapterDescribe('WingSide BestPrice release repair adapter transaction proof', () => {
  let payload: Payload
  let req: PayloadRequest
  let siteID: number | string
  const mediaIDs: Array<number | string> = []
  const pageIDs: Array<number | string> = []
  const productIDs: Array<number | string> = []
  const normalizedTours: BestPriceNormalizedTour[] = []
  const suffix = `${process.pid}-${Date.now()}`

  const normalizedTour = (index: number): BestPriceNormalizedTour => {
    const sourceId = `release-repair-proof-${suffix}-${index}`
    const hash = `abcdef0${index}`
    return {
      blockingErrors: [],
      category: 'vietnam-tours',
      currency: 'USD',
      durationDays: 2,
      durationNights: 1,
      excludes: ['International flights', 'Travel insurance'],
      futureDepartures: [],
      images: [
        {
          alt: 'img-video',
          hash,
          localPath: `${sourceId}.png`,
          sourceKey: `bestpricetravel:${sourceId}:media:1-${hash}`,
          sourceUrl: `https://source.invalid/${sourceId}.png`,
        },
      ],
      includes: ['Local guide', 'Private transfers'],
      itineraryDays: [
        {
          dayNumber: 1,
          route: 'Hanoi - Sapa',
          summary: 'Travel north.',
          title: 'Hanoi to Sapa',
        },
      ],
      market: 'vietnam',
      matchedDocument: `${sourceId}.docx`,
      priceFrom: null,
      publishEligible: true,
      sectionVisibility: ['facts', 'itinerary', 'services', 'related', 'sticky-cta'],
      slug: sourceId,
      sourceFile: 'bestprice_tours.json',
      sourceHash: `source-hash-${index}`,
      sourceId,
      sourceUrl: `https://www.bestpricetravel.com/vietnam-tours/${sourceId}.html`,
      summary: `Release repair proof. Socialize with local hosts ${index}.`,
      title: `Release repair proof ${index}`,
      warnings: [],
    }
  }

  beforeAll(async () => {
    payload = await getPayload({ config })
    if (process.env.RELEASE_REPAIR_EXPECT_ADAPTER) {
      expect(payload.db.packageName).toContain(process.env.RELEASE_REPAIR_EXPECT_ADAPTER)
    }
    req = await createLocalReq(
      {
        user: {
          collection: 'users',
          createdAt: new Date(0).toISOString(),
          email: 'release-repair-proof@internal.invalid',
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
        code: `release-repair-proof-${suffix}`,
        defaultLocale: 'en',
        isActive: false,
        name: `Release repair proof ${suffix}`,
        primaryDomain: `release-repair-proof-${suffix}.invalid`,
        supportedLocales: ['en'],
      },
      overrideAccess: true,
      req,
    })
    siteID = site.id

    for (const index of [1, 2]) {
      const normalized = normalizedTour(index)
      normalizedTours.push(normalized)
      const expectedFilename = bestPriceMediaFilename(normalized.sourceId, 0, normalized.images[0])
      const file: File = {
        data: png,
        mimetype: 'image/png',
        name: expectedFilename,
        size: png.byteLength,
      }
      const media = await payload.create({
        collection: 'media',
        context: { disableRevalidate: true },
        data: {
          alt: 'img-video',
          site: siteID,
        },
        file,
        locale: 'en',
        overrideAccess: true,
        req,
      })
      mediaIDs.push(media.id)
      expect(media.filename).toBe(expectedFilename)

      const page = await payload.create({
        collection: 'pages',
        context: { disableRevalidate: true },
        data: {
          _status: 'published',
          hero: { type: 'none' },
          layout: buildBestPriceWrapperLayout('Release repair proof.') as never,
          meta: { description: 'Release repair proof.Socialize with local hosts.' },
          pathname: `/tour/${normalized.slug}`,
          site: siteID,
          slug: `wing-side-${normalized.slug}`,
          title: normalized.title,
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
          _status: 'published',
          durationDays: normalized.durationDays,
          durationNights: normalized.durationNights,
          excludes: [],
          factSummary: {
            operatorNote: wingsSideBestPriceTechnicalCopy.factSummaryOperatorNote,
          },
          heroMedia: media.id,
          includes: [
            { label: 'International flights' },
            { label: 'Travel insurance' },
            { label: 'Local guide' },
            { label: 'Private transfers' },
          ],
          itineraryDays: normalized.itineraryDays,
          market: normalized.market,
          meta: { description: 'Release repair proof.Socialize with local hosts.' },
          servicesSummary: {
            notes: [
              { label: 'Keep this public note.' },
              { label: wingsSideBestPriceTechnicalCopy.servicesSummaryNoteLabel },
            ],
            operatorNotes: wingsSideBestPriceTechnicalCopy.servicesSummaryOperatorNotes,
          },
          site: siteID,
          slug: normalized.slug,
          sourceProvenance: {
            importBatchId: wingsSideBestPriceReleaseRepairBatchID,
            sourceHash: normalized.sourceHash,
            sourceId: normalized.sourceId,
          },
          summary: 'Release repair proof.Socialize with local hosts.',
          title: normalized.title,
          tourCode: `RELEASE-PROOF-${suffix}-${index}`,
          wrapperPage: page.id,
        } as never,
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
    for (const id of mediaIDs) {
      await payload.delete({
        collection: 'media',
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

  const readAggregates = async (): Promise<ReleaseRepairAggregate[]> => {
    const productResult = await payload.find({
      collection: 'tour-products',
      depth: 0,
      fallbackLocale: false,
      limit: 10,
      locale: 'en',
      overrideAccess: true,
      pagination: false,
      req,
      where: { id: { in: productIDs } },
    })
    const products = productResult.docs as unknown as ReleaseRepairProduct[]

    return Promise.all(
      products.map(async (product) => {
        const sourceId = String(product.sourceProvenance?.sourceId || '')
        const normalized = normalizedTours.find((tour) => tour.sourceId === sourceId)
        const wrapperID = releaseRepairRelationID(product.wrapperPage)
        const heroID = releaseRepairRelationID(product.heroMedia)
        if (!normalized || wrapperID === null || heroID === null) {
          throw new Error(`Incomplete release repair fixture ${product.id}`)
        }
        const [wrapper, hero] = await Promise.all([
          payload.findByID({
            collection: 'pages',
            depth: 0,
            id: wrapperID,
            locale: 'en',
            overrideAccess: true,
            req,
          }),
          payload.findByID({
            collection: 'media',
            depth: 0,
            id: heroID,
            locale: 'en',
            overrideAccess: true,
            req,
          }),
        ])
        return {
          hero: hero as unknown as ReleaseRepairMedia,
          normalized,
          product,
          wrapper: wrapper as unknown as ReleaseRepairWrapper,
        }
      }),
    )
  }

  it('fails closed without transactions and proves atomic apply plus exact rollback on PostgreSQL', async () => {
    const before = await readAggregates()
    const records = buildReleaseRepairPlanRecords({
      aggregates: before,
      batchID: wingsSideBestPriceReleaseRepairBatchID,
      expectedCount: 2,
      siteID,
    })
    expect(records).toHaveLength(2)
    expect(records.every(({ action }) => action === 'update')).toBe(true)

    const originalProductVersions = payload.collections['tour-products'].config.versions
    const originalPageVersions = payload.collections.pages.config.versions
    const originalRelations = before.map(({ product }) => ({
      hero: releaseRepairRelationID(product.heroMedia),
      id: product.id,
      slug: product.slug,
      sourceProvenance: product.sourceProvenance,
      status: product._status,
      tourCode: product.tourCode,
      wrapper: releaseRepairRelationID(product.wrapperPage),
    }))

    const failed = transitionReleaseRepairAtomically({
      batchID: wingsSideBestPriceReleaseRepairBatchID,
      failAfterUpdates: 2,
      loadAggregates: readAggregates,
      payload,
      records,
      req,
      side: 'after',
      siteID,
    })

    if (payload.db.packageName.includes('db-sqlite')) {
      await expect(failed).rejects.toThrow(
        'Database adapter did not start the required release repair transaction',
      )
      expect(
        classifyReleaseRepairState({
          aggregates: await readAggregates(),
          batchID: wingsSideBestPriceReleaseRepairBatchID,
          records,
          siteID,
        }),
      ).toBe('before')
      expect(payload.collections['tour-products'].config.versions).toBe(originalProductVersions)
      expect(payload.collections.pages.config.versions).toBe(originalPageVersions)
      return
    }

    await expect(failed).rejects.toThrow('Injected release repair failure after 2 update')
    expect(
      classifyReleaseRepairState({
        aggregates: await readAggregates(),
        batchID: wingsSideBestPriceReleaseRepairBatchID,
        records,
        siteID,
      }),
    ).toBe('before')

    await transitionReleaseRepairAtomically({
      batchID: wingsSideBestPriceReleaseRepairBatchID,
      loadAggregates: readAggregates,
      payload,
      records,
      req,
      side: 'after',
      siteID,
    })
    const applied = await readAggregates()
    expect(
      classifyReleaseRepairState({
        aggregates: applied,
        batchID: wingsSideBestPriceReleaseRepairBatchID,
        records,
        siteID,
      }),
    ).toBe('after')
    expect(releaseRepairTransitionDecision('apply', 'after')).toEqual({
      desiredState: 'after',
      resumed: true,
    })

    expect(
      applied.map(({ product }) => ({
        hero: releaseRepairRelationID(product.heroMedia),
        id: product.id,
        slug: product.slug,
        sourceProvenance: product.sourceProvenance,
        status: product._status,
        tourCode: product.tourCode,
        wrapper: releaseRepairRelationID(product.wrapperPage),
      })),
    ).toEqual(originalRelations)
    expect(applied.every(({ hero }) => hero.alt !== 'img-video')).toBe(true)

    await transitionReleaseRepairAtomically({
      batchID: wingsSideBestPriceReleaseRepairBatchID,
      loadAggregates: readAggregates,
      payload,
      records,
      req,
      side: 'before',
      siteID,
    })
    expect(
      classifyReleaseRepairState({
        aggregates: await readAggregates(),
        batchID: wingsSideBestPriceReleaseRepairBatchID,
        records,
        siteID,
      }),
    ).toBe('before')
    expect(payload.collections['tour-products'].config.versions).toBe(originalProductVersions)
    expect(payload.collections.pages.config.versions).toBe(originalPageVersions)
  }, 120_000)
})
