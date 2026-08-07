import { beforeEach, describe, expect, it, vi } from 'vitest'

import manifestJSON from '../../scripts/data/wingsside-group-commerce-v1/classification.json'
import {
  createGroupCommercePlan,
  groupCommerceChecksum,
  type ClassificationManifest,
  type SourceEvidence,
} from '../../scripts/lib/wingsSideGroupCommerceLifecycle'

const transaction = vi.hoisted(() => ({
  commit: vi.fn(async (req: { transactionID?: string }) => {
    delete req.transactionID
  }),
  init: vi.fn(async (req: { transactionID?: string }) => {
    req.transactionID = 'tx-1'
    return true
  }),
  kill: vi.fn(async (req: { transactionID?: string }) => {
    delete req.transactionID
  }),
}))

vi.mock('payload', async (importOriginal) => ({
  ...(await importOriginal<typeof import('payload')>()),
  commitTransaction: transaction.commit,
  initTransaction: transaction.init,
  killTransaction: transaction.kill,
}))

import {
  mutateGroupCommercePayload,
  readGroupCommercePayloadSnapshot,
  recoverGroupCommerceMutationReceipt,
  verifyGroupCommercePayload,
  WINGSSIDE_GROUP_COMMERCE_MANAGED_BY,
} from '../../scripts/lib/wingsSideGroupCommercePayloadAdapter'

const manifest = manifestJSON as ClassificationManifest
const releaseSha = 'b'.repeat(40)
const site = { code: 'wing-side', id: 3 }
const sourceURL = (sourceId: string) =>
  `https://www.bestpricetravel.com/${sourceId.split('--').at(-1)}.html`

const evidence = (): SourceEvidence => {
  const sourceId = manifest.products.find(({ productId }) => productId === 63)!.sourceId
  const url = sourceURL(sourceId)
  return {
    schemaVersion: 1,
    sourceSystem: 'bestpricetravel',
    checkedAt: '2026-07-31T09:30:00.000Z',
    expiresAt: '2026-07-31T17:30:00.000Z',
    rows: [{
      productId: 63,
      sourceId,
      departureDate: '2026-12-23',
      variantKey: 'standard',
      priceFrom: 741,
      currency: 'USD',
      priceBasis: 'per-person',
      availabilityStatus: 'open',
      availabilityBadge: 'Guaranteed departure',
      verifiedAt: '2026-07-31T09:30:00.000Z',
      expiresAt: '2026-07-31T17:30:00.000Z',
      sourceUrl: url,
      requestedSourceUrl: url,
      finalSourceUrl: url,
      httpStatus: 200,
      evidenceKind: 'exact-html-row',
      sourcePageSha256: 'a'.repeat(64),
      sourceRowSha256: 'c'.repeat(64),
      sourceStatus: 'guaranteed-departure',
      exactRowDate: '2026-12-23',
      exactRowPerPaxPrice: 'USD 741/pax',
    }],
  }
}

const createPayload = () => {
  const tours: Array<{
    _status: string
    id: number
    site: number
    tourType: string | null
    destinationTags: string[]
    travelStyles: string[]
    sourceProvenance: { sourceSystem: string; sourceId: string; importBatchId: string }
  }> = manifest.products.map((locked) => ({
    _status: 'published',
    destinationTags: ['hanoi'],
    id: locked.productId,
    site: 3,
    tourType: null,
    travelStyles: ['culture'],
    sourceProvenance: {
      sourceSystem: 'bestpricetravel',
      sourceId: locked.sourceId,
      importBatchId: manifest.batchId,
    },
  }))
  const departures: Array<{ id: number; [key: string]: unknown }> = [{
    _status: 'published',
    id: 900,
    site: 3,
    tourProduct: 63,
    departureDate: '2027-01-01',
    priceFrom: 500,
    currency: 'USD',
    availabilityStatus: 'open',
    sourceProvenance: { sourceSystem: 'manual-supplier' },
  }]
  let nextID = 901
  const payload = {
    db: {
      updateOne: vi.fn(async ({
        collection,
        data,
        id,
      }: {
        collection: string
        data: Record<string, unknown>
        id: number | string
      }) => {
        if (collection !== 'tour-products') throw new Error(`Unexpected collection ${collection}`)
        const row = tours.find((candidate) => String(candidate.id) === String(id))
        if (!row) throw new Error(`Missing ${collection}:${id}`)
        Object.assign(row, data)
        return row
      }),
    },
    find: vi.fn(async ({ collection }: { collection: string }) => {
      if (collection === 'sites') return { docs: [site] }
      if (collection === 'tour-products') return { docs: tours }
      if (collection === 'tour-departures') return { docs: departures }
      throw new Error(`Unexpected collection ${collection}`)
    }),
    findByID: vi.fn(async ({ id }: { id: number | string }) =>
      departures.find((row) => String(row.id) === String(id))),
    update: vi.fn(async ({
      collection,
      data,
      id,
    }: {
      collection: string
      data: Record<string, unknown>
      id: number | string
    }) => {
      const rows = collection === 'tour-products' ? tours : departures
      const row = rows.find((candidate) => String(candidate.id) === String(id))
      if (!row) throw new Error(`Missing ${collection}:${id}`)
      Object.assign(row, data)
      return row
    }),
    create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
      const row = {
        ...data,
        id: nextID++,
        inventoryIdentity: `s:${data.site}|t:${data.tourProduct}|d:${data.departureDate}|v:key:${data.variantKey}`,
      }
      departures.push(row)
      return row
    }),
    delete: vi.fn(async ({ id }: { id: number | string }) => {
      const index = departures.findIndex((row) => String(row.id) === String(id))
      if (index < 0) throw new Error(`Missing departure:${id}`)
      return departures.splice(index, 1)[0]
    }),
  }
  return { departures, payload: payload as never, tours }
}

describe('WingSide Payload group-commerce adapter', () => {
  beforeEach(() => vi.clearAllMocks())

  it('reads the exact 22-tour production batch and excludes unmanaged departures', async () => {
    const fixture = createPayload()
    const snapshot = await readGroupCommercePayloadSnapshot({
      manifest,
      payload: fixture.payload,
      releaseSha,
      req: {} as never,
    })
    expect(snapshot.products).toHaveLength(22)
    expect(snapshot.products.every((product) => product.departures.length === 0)).toBe(true)
    expect(fixture.departures).toHaveLength(1)
  })

  it('rejects a departure returned outside the resolved site boundary', async () => {
    const fixture = createPayload()
    fixture.departures.push({
      id: 901,
      site: 99,
      tourProduct: 63,
      sourceProvenance: { managedBy: WINGSSIDE_GROUP_COMMERCE_MANAGED_BY },
    })
    await expect(readGroupCommercePayloadSnapshot({
      manifest,
      payload: fixture.payload,
      releaseSha,
      req: {} as never,
    })).rejects.toThrow(/escaped/)
  })

  it('applies idempotently, verifies from DB, rolls back by receipt, and preserves unmanaged rows', async () => {
    const fixture = createPayload()
    const req = {} as never
    const before = await readGroupCommercePayloadSnapshot({
      manifest,
      payload: fixture.payload,
      releaseSha,
      req,
      capturedAt: '2026-07-31T09:40:00.000Z',
    })
    const plan = createGroupCommercePlan({
      evidence: evidence(),
      manifest,
      now: new Date('2026-07-31T10:00:00.000Z'),
      snapshot: before,
    })
    const planSha256 = groupCommerceChecksum(plan)
    const receipt = await mutateGroupCommercePayload({
      manifest,
      mode: 'apply',
      payload: fixture.payload,
      plan,
      planSha256,
      req,
      now: new Date('2026-07-31T10:00:00.000Z'),
    })
    expect(receipt.createdDepartureIDs).toHaveLength(1)
    expect(fixture.departures.find(({ id }) => id === 900)).toBeTruthy()
    expect(fixture.tours.every(({ destinationTags, travelStyles }) =>
      JSON.stringify(destinationTags) === JSON.stringify(['hanoi']) &&
      JSON.stringify(travelStyles) === JSON.stringify(['culture']))).toBe(true)
    const payloadCalls = fixture.payload as unknown as {
      db: { updateOne: ReturnType<typeof vi.fn> }
      update: ReturnType<typeof vi.fn>
    }
    expect(payloadCalls.db.updateOne).toHaveBeenCalledTimes(
      plan.entries.filter(({ after, before: entryBefore }) => entryBefore.tourType !== after.tourType).length,
    )
    expect(payloadCalls.update.mock.calls.some(([args]) => args.collection === 'tour-products')).toBe(false)
    await expect(verifyGroupCommercePayload({
      expectedState: 'after',
      manifest,
      payload: fixture.payload,
      plan,
      req,
    })).resolves.toEqual({ checked: 22, state: 'after' })
    const second = await mutateGroupCommercePayload({
      manifest,
      mode: 'apply',
      payload: fixture.payload,
      plan,
      planSha256,
      req,
      now: new Date('2026-07-31T10:00:00.000Z'),
    })
    expect(second.createdDepartureIDs).toEqual(receipt.createdDepartureIDs)
    await expect(recoverGroupCommerceMutationReceipt({
      manifest,
      payload: fixture.payload,
      plan,
      planSha256,
      req,
    })).resolves.toEqual(receipt)
    await mutateGroupCommercePayload({
      manifest,
      mode: 'rollback',
      payload: fixture.payload,
      plan,
      planSha256,
      receipt,
      req,
    })
    expect(fixture.departures.map(({ id }) => id)).toEqual([900])
    expect(fixture.tours.every(({ tourType }) => tourType === null)).toBe(true)
    expect(fixture.tours.every(({ destinationTags, travelStyles }) =>
      JSON.stringify(destinationTags) === JSON.stringify(['hanoi']) &&
      JSON.stringify(travelStyles) === JSON.stringify(['culture']))).toBe(true)
  })

  it('rejects expired apply in the adapter while preserving rollback recovery', async () => {
    const fixture = createPayload()
    const req = {} as never
    const before = await readGroupCommercePayloadSnapshot({ manifest, payload: fixture.payload, releaseSha, req })
    const plan = createGroupCommercePlan({
      evidence: evidence(),
      manifest,
      now: new Date('2026-07-31T10:00:00.000Z'),
      snapshot: before,
    })
    await expect(mutateGroupCommercePayload({
      manifest,
      mode: 'apply',
      payload: fixture.payload,
      plan,
      planSha256: groupCommerceChecksum(plan),
      req,
      now: new Date(plan.expiresAt),
    })).rejects.toThrow(/apply plan has expired/)
    expect(transaction.init).not.toHaveBeenCalled()
  })

  it('refuses receipt recovery unless every plan entry is at the exact after-state', async () => {
    const fixture = createPayload()
    const req = {} as never
    const before = await readGroupCommercePayloadSnapshot({ manifest, payload: fixture.payload, releaseSha, req })
    const plan = createGroupCommercePlan({
      evidence: evidence(),
      manifest,
      now: new Date('2026-07-31T10:00:00.000Z'),
      snapshot: before,
    })
    await expect(recoverGroupCommerceMutationReceipt({
      manifest,
      payload: fixture.payload,
      plan,
      planSha256: groupCommerceChecksum(plan),
      req,
    })).rejects.toThrow(/exact after-state/)
  })

  it('revalidates the full managed row immediately before rollback deletion', async () => {
    const fixture = createPayload()
    const req = {} as never
    const before = await readGroupCommercePayloadSnapshot({ manifest, payload: fixture.payload, releaseSha, req })
    const plan = createGroupCommercePlan({
      evidence: evidence(),
      manifest,
      now: new Date('2026-07-31T10:00:00.000Z'),
      snapshot: before,
    })
    const planSha256 = groupCommerceChecksum(plan)
    const receipt = await mutateGroupCommercePayload({
      manifest,
      mode: 'apply',
      payload: fixture.payload,
      plan,
      planSha256,
      req,
      now: new Date('2026-07-31T10:00:00.000Z'),
    })
    const mutablePayload = fixture.payload as unknown as {
      findByID: (args: { id: number | string }) => Promise<
        Record<string, unknown> & { sourceProvenance?: Record<string, unknown> }
      >
    }
    const originalFindByID = mutablePayload.findByID
    mutablePayload.findByID = vi.fn(async (args: { id: number | string }) => {
      const row = await originalFindByID(args)
      return {
        ...row,
        sourceProvenance: {
          ...(row.sourceProvenance || {}),
          sourceRowSha256: 'f'.repeat(64),
        },
      }
    })
    await expect(mutateGroupCommercePayload({
      manifest,
      mode: 'rollback',
      payload: fixture.payload,
      plan,
      planSha256,
      receipt,
      req,
      now: new Date(plan.expiresAt),
    })).rejects.toThrow(/changed managed departure/)
    expect(fixture.departures.some(({ id }) => id === receipt.createdDepartureIDs[0])).toBe(true)
  })

  it('refuses preimage drift without touching unmanaged rows', async () => {
    const fixture = createPayload()
    const req = {} as never
    const before = await readGroupCommercePayloadSnapshot({ manifest, payload: fixture.payload, releaseSha, req })
    const plan = createGroupCommercePlan({
      evidence: evidence(),
      manifest,
      now: new Date('2026-07-31T10:00:00.000Z'),
      snapshot: before,
    })
    fixture.tours[0]!.tourType = 'private'
    await expect(mutateGroupCommercePayload({
      manifest,
      mode: 'apply',
      payload: fixture.payload,
      plan,
      planSha256: groupCommerceChecksum(plan),
      req,
      now: new Date('2026-07-31T10:00:00.000Z'),
    })).rejects.toThrow(/Preimage conflict/)
    expect(fixture.departures.map(({ id }) => id)).toEqual([900])
  })
})
