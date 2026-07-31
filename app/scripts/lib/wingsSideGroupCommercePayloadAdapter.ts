import {
  commitTransaction,
  initTransaction,
  killTransaction,
  type Payload,
  type PayloadRequest,
} from 'payload'

import type { TourDeparture, TourProduct } from '../../src/payload-types'
import {
  groupCommerceChecksum,
  groupCommerceDepartureIdentity,
  groupCommerceProductChecksum,
  type ClassificationManifest,
  type CommerceDeparture,
  type CommercePlan,
  type CommerceSnapshot,
} from './wingsSideGroupCommerceLifecycle'

export const WINGSSIDE_GROUP_COMMERCE_MANAGED_BY = 'wingsside-group-commerce-v1'
const payloadSiteCode = 'wing-side'

const relationID = (value: unknown): number | string | null => {
  if (typeof value === 'number' || typeof value === 'string') return value
  if (value && typeof value === 'object' && 'id' in value) {
    const id = (value as { id?: unknown }).id
    return typeof id === 'number' || typeof id === 'string' ? id : null
  }
  return null
}

type SourceProvenance = {
  importBatchId?: unknown
  sourceId?: unknown
  sourceSystem?: unknown
}

type DepartureProvenance = {
  checkedAt?: unknown
  managedBy?: unknown
  sourcePageSha256?: unknown
  sourceRowSha256?: unknown
  sourceSystem?: unknown
  sourceUrl?: unknown
}

const productSource = (tour: TourProduct) =>
  (tour.sourceProvenance && typeof tour.sourceProvenance === 'object'
    ? tour.sourceProvenance
    : {}) as SourceProvenance

const departureSource = (departure: TourDeparture) =>
  ((departure as TourDeparture & { sourceProvenance?: DepartureProvenance }).sourceProvenance ||
    {}) as DepartureProvenance

const dateOnly = (value: string) => new Date(value).toISOString().slice(0, 10)

const snapshotManagedDeparture = ({
  departure,
  sourceId,
}: {
  departure: TourDeparture
  sourceId: string
}): CommerceDeparture => {
  const provenance = departureSource(departure)
  if (provenance.managedBy !== WINGSSIDE_GROUP_COMMERCE_MANAGED_BY) {
    throw new Error(`Departure ${departure.id} is not managed by group commerce`)
  }
  if (
    departure.currency !== 'USD' ||
    departure.priceBasis !== 'per-person' ||
    departure.availabilityStatus !== 'open' ||
    departure.availabilityBadge !== 'Guaranteed departure' ||
    !departure.verifiedAt ||
    !departure.expiresAt ||
    !departure.inventoryIdentity ||
    provenance.sourceSystem !== 'bestpricetravel' ||
    typeof provenance.sourceUrl !== 'string' ||
    typeof provenance.sourcePageSha256 !== 'string' ||
    typeof provenance.sourceRowSha256 !== 'string' ||
    provenance.checkedAt !== departure.verifiedAt
  ) {
    throw new Error(`Managed departure ${departure.id} is outside the governed shape`)
  }
  return {
    recordId: departure.id,
    inventoryIdentity: departure.inventoryIdentity,
    sourceId,
    departureDate: dateOnly(departure.departureDate),
    variantKey: departure.variantKey || 'standard',
    priceFrom: departure.priceFrom,
    currency: 'USD',
    priceBasis: 'per-person',
    availabilityStatus: 'open',
    availabilityBadge: 'Guaranteed departure',
    verifiedAt: departure.verifiedAt,
    expiresAt: departure.expiresAt,
    sourceUrl: provenance.sourceUrl,
    sourcePageSha256: provenance.sourcePageSha256,
    sourceRowSha256: provenance.sourceRowSha256,
    bookingMode: 'inquiry',
    canHoldSeat: false,
  }
}

export const readGroupCommercePayloadSnapshot = async ({
  manifest,
  payload,
  releaseSha,
  req,
  capturedAt = new Date().toISOString(),
}: {
  manifest: ClassificationManifest
  payload: Payload
  releaseSha: string
  req: PayloadRequest
  capturedAt?: string
}): Promise<CommerceSnapshot> => {
  if (!/^[a-f0-9]{40}$/u.test(releaseSha)) {
    throw new Error('Payload snapshot requires an immutable 40-character release SHA')
  }
  const sites = await payload.find({
    collection: 'sites',
    depth: 0,
    limit: 2,
    overrideAccess: true,
    pagination: false,
    req,
    where: { code: { equals: payloadSiteCode } },
  })
  if (sites.docs.length !== 1) throw new Error('Expected exactly one WingSide site')
  const siteID = sites.docs[0]!.id
  const tours = await payload.find({
    collection: 'tour-products',
    depth: 0,
    draft: false,
    fallbackLocale: false,
    limit: 30,
    locale: 'en',
    overrideAccess: true,
    pagination: false,
    req,
    where: { site: { equals: siteID } },
  })
  const expected = new Map(manifest.products.map((row) => [row.sourceId, row]))
  const matched = new Map<string, TourProduct>()
  for (const tour of tours.docs as TourProduct[]) {
    const source = productSource(tour)
    if (
      source.sourceSystem !== manifest.authorizedSourceSystem ||
      source.importBatchId !== manifest.batchId ||
      typeof source.sourceId !== 'string'
    ) {
      continue
    }
    const locked = expected.get(source.sourceId)
    if (!locked) throw new Error(`Unexpected source identity in locked batch: ${source.sourceId}`)
    if (Number(tour.id) !== locked.productId || relationID(tour.site) !== siteID) {
      throw new Error(`Tour ${tour.id} escaped exact site/source identity`)
    }
    if (matched.has(source.sourceId)) throw new Error(`Duplicate tour source identity: ${source.sourceId}`)
    matched.set(source.sourceId, tour)
  }
  if (matched.size !== manifest.products.length) {
    throw new Error(`Expected exact 22-tour batch, resolved ${matched.size}`)
  }
  const tourIDs = [...matched.values()].map(({ id }) => id)
  const departures = await payload.find({
    collection: 'tour-departures',
    depth: 0,
    draft: false,
    limit: 1000,
    overrideAccess: true,
    pagination: false,
    req,
    where: { and: [{ site: { equals: siteID } }, { tourProduct: { in: tourIDs } }] },
  })
  const managedByTour = new Map<string, TourDeparture[]>()
  for (const departure of departures.docs as TourDeparture[]) {
    if (relationID(departure.site) !== siteID || !tourIDs.map(String).includes(String(relationID(departure.tourProduct)))) {
      throw new Error(`Departure ${departure.id} escaped the resolved WingSide scope`)
    }
    if (departureSource(departure).managedBy !== WINGSSIDE_GROUP_COMMERCE_MANAGED_BY) continue
    const key = String(relationID(departure.tourProduct))
    managedByTour.set(key, [...(managedByTour.get(key) || []), departure])
  }
  return {
    schemaVersion: 1,
    releaseSha,
    capturedAt,
    products: manifest.products.map((locked) => {
      const tour = matched.get(locked.sourceId)!
      return {
        productId: locked.productId,
        sourceId: locked.sourceId,
        siteCode: manifest.siteCode,
        batchId: manifest.batchId,
        tourType: tour.tourType || null,
        departures: (managedByTour.get(String(tour.id)) || [])
          .map((departure) => snapshotManagedDeparture({ departure, sourceId: locked.sourceId }))
          .sort((left, right) =>
            groupCommerceDepartureIdentity(manifest.siteCode, left).localeCompare(
              groupCommerceDepartureIdentity(manifest.siteCode, right),
            ),
          ),
      }
    }),
  }
}

export type GroupCommerceMutationReceipt = {
  schemaVersion: 1
  planSha256: string
  releaseSha: string
  createdDepartureIDs: Array<number | string>
}

/**
 * Recover a lost apply receipt only from an exact, fully verified postimage.
 * This is read-only and never broadens rollback beyond departures introduced
 * by the immutable plan.
 */
export const recoverGroupCommerceMutationReceipt = async ({
  manifest,
  payload,
  plan,
  planSha256,
  req,
}: {
  manifest: ClassificationManifest
  payload: Payload
  plan: CommercePlan
  planSha256: string
  req: PayloadRequest
}): Promise<GroupCommerceMutationReceipt> => {
  if (groupCommerceChecksum(plan) !== planSha256) throw new Error('Production plan hash mismatch')
  const snapshot = await readGroupCommercePayloadSnapshot({
    manifest,
    payload,
    releaseSha: plan.releaseSha,
    req,
  })
  const bySource = new Map(snapshot.products.map((product) => [product.sourceId, product]))
  const createdDepartureIDs: Array<number | string> = []
  for (const entry of plan.entries) {
    const current = bySource.get(entry.sourceId)
    if (!current || groupCommerceProductChecksum(current) !== entry.postimageSha256) {
      throw new Error(`Receipt recovery requires exact after-state for ${entry.sourceId}`)
    }
    const beforeIdentities = new Set(
      entry.before.departures.map((row) => groupCommerceDepartureIdentity(plan.siteCode, row)),
    )
    for (const row of current.departures) {
      if (beforeIdentities.has(groupCommerceDepartureIdentity(plan.siteCode, row))) continue
      if (row.recordId === undefined) {
        throw new Error(`Receipt recovery found a created departure without a record ID for ${entry.sourceId}`)
      }
      createdDepartureIDs.push(row.recordId)
    }
  }
  if (new Set(createdDepartureIDs.map(String)).size !== createdDepartureIDs.length) {
    throw new Error('Receipt recovery found duplicate created departure IDs')
  }
  return {
    schemaVersion: 1,
    planSha256,
    releaseSha: plan.releaseSha,
    createdDepartureIDs,
  }
}

const departureWriteData = ({
  departure,
  siteID,
  tourID,
}: {
  departure: CommerceDeparture
  siteID: number | string
  tourID: number | string
}) => ({
  _status: 'published',
  site: siteID,
  tourProduct: tourID,
  variantKey: departure.variantKey,
  departureDate: departure.departureDate,
  priceFrom: departure.priceFrom,
  currency: departure.currency,
  priceBasis: departure.priceBasis,
  verifiedAt: departure.verifiedAt,
  expiresAt: departure.expiresAt,
  availabilityStatus: departure.availabilityStatus,
  availabilityBadge: departure.availabilityBadge,
  intentConfig: { bookingIntentMode: 'inquiry' },
  sourceProvenance: {
    sourceSystem: 'bestpricetravel',
    sourceUrl: departure.sourceUrl,
    sourcePageSha256: departure.sourcePageSha256,
    sourceRowSha256: departure.sourceRowSha256,
    checkedAt: departure.verifiedAt,
    managedBy: WINGSSIDE_GROUP_COMMERCE_MANAGED_BY,
  },
})

export const mutateGroupCommercePayload = async ({
  manifest,
  mode,
  payload,
  plan,
  planSha256,
  receipt,
  req,
  now = new Date(),
}: {
  manifest: ClassificationManifest
  mode: 'apply' | 'rollback'
  payload: Payload
  plan: CommercePlan
  planSha256: string
  receipt?: GroupCommerceMutationReceipt
  req: PayloadRequest
  now?: Date
}): Promise<GroupCommerceMutationReceipt> => {
  if (groupCommerceChecksum(plan) !== planSha256) throw new Error('Production plan hash mismatch')
  if (mode === 'apply' && Date.parse(plan.expiresAt) <= now.getTime()) {
    throw new Error('Production apply plan has expired')
  }
  if (mode === 'rollback' && (!receipt || receipt.planSha256 !== planSha256 || receipt.releaseSha !== plan.releaseSha)) {
    throw new Error('Rollback requires the exact apply receipt')
  }
  let started = false
  const createdDepartureIDs: Array<number | string> = []
  try {
    started = await initTransaction(req)
    if (!started || !req.transactionID) throw new Error('Payload adapter did not start the required transaction')
    const current = await readGroupCommercePayloadSnapshot({
      manifest,
      payload,
      releaseSha: plan.releaseSha,
      req,
    })
    const alreadyTarget = new Set<string>()
    for (const entry of plan.entries) {
      const currentProduct = current.products.find(({ sourceId }) => sourceId === entry.sourceId)!
      const fromHash = mode === 'apply' ? entry.preimageSha256 : entry.postimageSha256
      const toHash = mode === 'apply' ? entry.postimageSha256 : entry.preimageSha256
      const currentHash = groupCommerceProductChecksum(currentProduct)
      if (currentHash === toHash) {
        alreadyTarget.add(entry.sourceId)
        if (mode === 'apply') {
          const beforeIdentities = new Set(
            entry.before.departures.map((row) => groupCommerceDepartureIdentity(plan.siteCode, row)),
          )
          for (const row of currentProduct.departures) {
            if (
              row.recordId !== undefined &&
              !beforeIdentities.has(groupCommerceDepartureIdentity(plan.siteCode, row))
            ) {
              createdDepartureIDs.push(row.recordId)
            }
          }
        }
        continue
      }
      if (currentHash !== fromHash) {
        throw new Error(`Preimage conflict for ${entry.sourceId}; refusing ${mode}`)
      }
    }
    const siteID = relationID(
      (await payload.find({ collection: 'sites', depth: 0, limit: 1, overrideAccess: true, pagination: false, req, where: { code: { equals: payloadSiteCode } } })).docs[0],
    )!
    for (const entry of plan.entries) {
      if (alreadyTarget.has(entry.sourceId)) continue
      const target = mode === 'apply' ? entry.after : entry.before
      await payload.update({
        collection: 'tour-products',
        data: { tourType: target.tourType } as never,
        id: entry.productId,
        overrideAccess: true,
        req,
      })
      const currentRows = new Map(entry.before.departures.map((row) => [groupCommerceDepartureIdentity(plan.siteCode, row), row]))
      const targetRows = new Map(target.departures.map((row) => [groupCommerceDepartureIdentity(plan.siteCode, row), row]))
      for (const [identity, targetRow] of targetRows) {
        const existing = currentRows.get(identity)
        const recordID = mode === 'rollback' ? targetRow.recordId : existing?.recordId
        if (recordID !== undefined) {
          await payload.update({
            collection: 'tour-departures',
            data: departureWriteData({ departure: targetRow, siteID, tourID: entry.productId }) as never,
            id: recordID,
            overrideAccess: true,
            req,
          })
        } else {
          const created = await payload.create({
            collection: 'tour-departures',
            data: departureWriteData({ departure: targetRow, siteID, tourID: entry.productId }) as never,
            overrideAccess: true,
            req,
          })
          createdDepartureIDs.push(created.id)
        }
      }
    }
    if (mode === 'rollback') {
      const planCreated = new Map<string, CommerceDeparture>()
      for (const entry of plan.entries) {
        const beforeIdentities = new Set(
          entry.before.departures.map((row) => groupCommerceDepartureIdentity(plan.siteCode, row)),
        )
        const currentProduct = current.products.find(({ sourceId }) => sourceId === entry.sourceId)!
        for (const row of currentProduct.departures) {
          const identity = groupCommerceDepartureIdentity(plan.siteCode, row)
          if (!beforeIdentities.has(identity) && row.recordId !== undefined) {
            planCreated.set(String(row.recordId), row)
          }
        }
      }
      if (
        new Set(receipt!.createdDepartureIDs.map(String)).size !== receipt!.createdDepartureIDs.length ||
        receipt!.createdDepartureIDs.some((id) => !planCreated.has(String(id)))
      ) {
        throw new Error('Rollback receipt contains a departure not created by this plan')
      }
      for (const id of receipt!.createdDepartureIDs) {
        const row = await payload.findByID({ collection: 'tour-departures', depth: 0, id, overrideAccess: true, req })
        const expected = planCreated.get(String(id))!
        const currentRow = snapshotManagedDeparture({
          departure: row as TourDeparture,
          sourceId: expected.sourceId,
        })
        if (groupCommerceChecksum(currentRow) !== groupCommerceChecksum(expected)) {
          throw new Error(`Refusing to delete changed managed departure ${id}`)
        }
        await payload.delete({ collection: 'tour-departures', id, overrideAccess: true, req })
      }
    }
    await commitTransaction(req)
    return { schemaVersion: 1, planSha256, releaseSha: plan.releaseSha, createdDepartureIDs }
  } catch (error) {
    if (started && req.transactionID) await killTransaction(req)
    throw error
  }
}

export const verifyGroupCommercePayload = async ({
  expectedState,
  manifest,
  payload,
  plan,
  req,
}: {
  expectedState: 'after' | 'before'
  manifest: ClassificationManifest
  payload: Payload
  plan: CommercePlan
  req: PayloadRequest
}) => {
  const snapshot = await readGroupCommercePayloadSnapshot({ manifest, payload, releaseSha: plan.releaseSha, req })
  const bySource = new Map(snapshot.products.map((product) => [product.sourceId, product]))
  for (const entry of plan.entries) {
    const expected = expectedState === 'after' ? entry.postimageSha256 : entry.preimageSha256
    const product = bySource.get(entry.sourceId)
    if (!product || groupCommerceProductChecksum(product) !== expected) {
      throw new Error(`DB verification failed for ${entry.sourceId}`)
    }
  }
  return { checked: plan.entries.length, state: expectedState }
}
