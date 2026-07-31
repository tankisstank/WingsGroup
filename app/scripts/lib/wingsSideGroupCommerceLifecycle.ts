import { createHash } from 'node:crypto'

export const WINGSSIDE_GROUP_COMMERCE_SITE = 'wings-side'
export const WINGSSIDE_GROUP_COMMERCE_BATCH = 'wingsside-bestprice-22-20260717'
export const WINGSSIDE_GROUP_COMMERCE_APPLY_CONFIRM =
  'CONFIRM_WINGSSIDE_GROUP_COMMERCE_PRODUCTION_WRITE'
export const WINGSSIDE_GROUP_COMMERCE_ROLLBACK_CONFIRM =
  'CONFIRM_WINGSSIDE_GROUP_COMMERCE_PRODUCTION_ROLLBACK'

export type TourClassification = 'group' | 'hybrid' | 'private' | null

export type ClassificationManifest = {
  schemaVersion: 1
  siteCode: string
  batchId: string
  authorizedSourceSystem: 'bestpricetravel'
  products: Array<{
    productId: number
    sourceId: string
    classification: TourClassification
  }>
}

export type CommerceDeparture = {
  sourceId: string
  departureDate: string
  variantKey: string
  priceFrom: number
  currency: 'USD'
  priceBasis: 'per-person'
  availabilityStatus: 'open'
  availabilityBadge: 'Guaranteed departure'
  verifiedAt: string
  expiresAt: string
  sourceUrl: string
  sourcePageSha256: string
  sourceRowSha256: string
  bookingMode: 'inquiry'
  canHoldSeat: false
}

export type CommerceProductSnapshot = {
  productId: number
  sourceId: string
  siteCode: string
  batchId: string
  tourType: TourClassification
  departures: CommerceDeparture[]
}

export type CommerceSnapshot = {
  schemaVersion: 1
  releaseSha: string
  capturedAt: string
  products: CommerceProductSnapshot[]
}

export type SourceDepartureRow = Omit<
  CommerceDeparture,
  'bookingMode' | 'canHoldSeat' | 'sourceId'
> & {
  productId: number
  sourceId: string
  sourceStatus: 'guaranteed-departure'
  exactRowDate: string
  exactRowPerPaxPrice: string
}

export type SourceEvidence = {
  schemaVersion: 1
  sourceSystem: 'bestpricetravel'
  checkedAt: string
  expiresAt: string
  rows: SourceDepartureRow[]
}

export type CommercePlanEntry = {
  productId: number
  sourceId: string
  classification: TourClassification
  preimageSha256: string
  postimageSha256: string
  before: CommerceProductSnapshot
  after: CommerceProductSnapshot
}

export type CommercePlan = {
  schemaVersion: 1
  kind: 'full' | 'canary'
  parentPlanSha256?: string
  siteCode: typeof WINGSSIDE_GROUP_COMMERCE_SITE
  batchId: typeof WINGSSIDE_GROUP_COMMERCE_BATCH
  releaseSha: string
  createdAt: string
  expiresAt: string
  sourceEvidenceSha256: string
  entries: CommercePlanEntry[]
}

const stable = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => `${JSON.stringify(key)}:${stable(child)}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}

export const groupCommerceChecksum = (value: unknown) =>
  createHash('sha256').update(stable(value)).digest('hex')

export const WINGSSIDE_GROUP_COMMERCE_CLASSIFICATION_SHA256 =
  'd359b6a12beae01bc3bad444f9ff63b3a0fc01290a6e0118d3eb4a84ca9fa7c2'

const assertSha = (value: string, label: string) => {
  if (!/^[a-f0-9]{64}$/u.test(value)) throw new Error(`${label} must be a lowercase SHA-256`)
}

const assertDate = (value: string, label: string) => {
  const parsed = Date.parse(value)
  if (!Number.isFinite(parsed)) throw new Error(`${label} must be an ISO timestamp`)
  return parsed
}

const departureIdentity = (siteCode: string, row: Pick<CommerceDeparture, 'sourceId' | 'departureDate' | 'variantKey'>) =>
  `${siteCode}|${row.sourceId}|${row.departureDate}|${row.variantKey}`

export const assertClassificationManifest = (manifest: ClassificationManifest) => {
  if (groupCommerceChecksum(manifest) !== WINGSSIDE_GROUP_COMMERCE_CLASSIFICATION_SHA256) {
    throw new Error('Classification manifest does not match its immutable reviewed SHA-256')
  }
  if (
    manifest.schemaVersion !== 1 ||
    manifest.siteCode !== WINGSSIDE_GROUP_COMMERCE_SITE ||
    manifest.batchId !== WINGSSIDE_GROUP_COMMERCE_BATCH ||
    manifest.authorizedSourceSystem !== 'bestpricetravel'
  ) {
    throw new Error('Classification manifest does not match the locked WingSide source scope')
  }
  if (manifest.products.length !== 22) throw new Error('Classification scope must contain exactly 22 tours')
  const ids = new Set<number>()
  const sourceIds = new Set<string>()
  for (const product of manifest.products) {
    if (ids.has(product.productId) || sourceIds.has(product.sourceId)) {
      throw new Error('Classification manifest contains duplicate product/source identity')
    }
    ids.add(product.productId)
    sourceIds.add(product.sourceId)
  }
  const unresolved = manifest.products
    .filter((product) => product.classification === null)
    .map((product) => product.productId)
    .sort((a, b) => a - b)
  if (unresolved.join(',') !== '66,76,77') {
    throw new Error('Only redirected source products 66, 76 and 77 may remain unclassified')
  }
}

const assertSnapshot = (snapshot: CommerceSnapshot, manifest: ClassificationManifest) => {
  if (snapshot.schemaVersion !== 1) throw new Error('Unsupported snapshot schema')
  assertSha(snapshot.releaseSha, 'snapshot.releaseSha')
  assertDate(snapshot.capturedAt, 'snapshot.capturedAt')
  if (snapshot.products.length !== 22) throw new Error('Live snapshot must contain exactly 22 tours')
  const expected = new Map(manifest.products.map((product) => [product.sourceId, product]))
  for (const product of snapshot.products) {
    const locked = expected.get(product.sourceId)
    if (
      !locked ||
      locked.productId !== product.productId ||
      product.siteCode !== manifest.siteCode ||
      product.batchId !== manifest.batchId
    ) {
      throw new Error(`Snapshot product ${product.productId} escaped the locked site/batch/source scope`)
    }
    expected.delete(product.sourceId)
  }
  if (expected.size) throw new Error('Live snapshot is missing locked source identities')
}

const governedDepartureRows = ({
  evidence,
  manifest,
  now,
}: {
  evidence: SourceEvidence
  manifest: ClassificationManifest
  now: Date
}) => {
  if (evidence.schemaVersion !== 1 || evidence.sourceSystem !== 'bestpricetravel') {
    throw new Error('Only the authorized BestPrice evidence contract is accepted')
  }
  const checkedAt = assertDate(evidence.checkedAt, 'evidence.checkedAt')
  const expiresAt = assertDate(evidence.expiresAt, 'evidence.expiresAt')
  if (checkedAt > now.getTime() || expiresAt <= now.getTime() || expiresAt - checkedAt > 86_400_000) {
    throw new Error('Source evidence is stale, future-dated, or exceeds the 24-hour freshness SLA')
  }
  const classifications = new Map(manifest.products.map((product) => [product.sourceId, product]))
  const deduped = new Map<string, CommerceDeparture>()
  for (const row of evidence.rows) {
    const product = classifications.get(row.sourceId)
    if (!product || product.productId !== row.productId) throw new Error('Departure escaped exact product/source scope')
    if (![63, 65, 69].includes(row.productId)) throw new Error('Departure is not in the approved candidate subset')
    if (product.classification !== 'group' && product.classification !== 'hybrid') {
      throw new Error('Departure candidate must classify as group or hybrid')
    }
    if (
      row.sourceStatus !== 'guaranteed-departure' ||
      row.exactRowDate !== row.departureDate ||
      row.exactRowPerPaxPrice !== `${row.currency} ${row.priceFrom}/pax` ||
      row.priceBasis !== 'per-person' ||
      row.availabilityStatus !== 'open' ||
      row.availabilityBadge !== 'Guaranteed departure' ||
      row.currency !== 'USD' ||
      !Number.isFinite(row.priceFrom) ||
      row.priceFrom <= 0
    ) {
      throw new Error('Departure lacks an exact guaranteed date and per-pax source row')
    }
    assertSha(row.sourcePageSha256, 'sourcePageSha256')
    assertSha(row.sourceRowSha256, 'sourceRowSha256')
    let sourceURL: URL
    try {
      sourceURL = new URL(row.sourceUrl)
    } catch {
      throw new Error('Departure sourceUrl must be an absolute BestPrice URL')
    }
    if (
      sourceURL.protocol !== 'https:' ||
      !['bestpricetravel.com', 'www.bestpricetravel.com'].includes(sourceURL.hostname)
    ) {
      throw new Error('Departure sourceUrl must be an absolute BestPrice URL')
    }
    if (row.verifiedAt !== evidence.checkedAt || row.expiresAt !== evidence.expiresAt) {
      throw new Error('Departure freshness must be bound to its source evidence envelope')
    }
    const departure: CommerceDeparture = {
      sourceId: row.sourceId,
      departureDate: row.departureDate,
      variantKey: row.variantKey,
      priceFrom: row.priceFrom,
      currency: row.currency,
      priceBasis: row.priceBasis,
      availabilityStatus: row.availabilityStatus,
      availabilityBadge: row.availabilityBadge,
      verifiedAt: row.verifiedAt,
      expiresAt: row.expiresAt,
      sourceUrl: row.sourceUrl,
      sourcePageSha256: row.sourcePageSha256,
      sourceRowSha256: row.sourceRowSha256,
      bookingMode: 'inquiry',
      canHoldSeat: false,
    }
    const identity = departureIdentity(manifest.siteCode, departure)
    const existing = deduped.get(identity)
    if (existing && groupCommerceChecksum(existing) !== groupCommerceChecksum(departure)) {
      throw new Error(`Conflicting departure rows for ${identity}`)
    }
    deduped.set(identity, departure)
  }
  return [...deduped.values()]
}

export const createGroupCommercePlan = ({
  evidence,
  manifest,
  now = new Date(),
  snapshot,
}: {
  evidence: SourceEvidence
  manifest: ClassificationManifest
  now?: Date
  snapshot: CommerceSnapshot
}): CommercePlan => {
  assertClassificationManifest(manifest)
  assertSnapshot(snapshot, manifest)
  const departures = governedDepartureRows({ evidence, manifest, now })
  const bySource = new Map<string, CommerceDeparture[]>()
  for (const departure of departures) {
    bySource.set(departure.sourceId, [...(bySource.get(departure.sourceId) || []), departure])
  }
  const entries = manifest.products.map((locked) => {
    const before = structuredClone(snapshot.products.find((row) => row.sourceId === locked.sourceId)!)
    const after: CommerceProductSnapshot = {
      ...structuredClone(before),
      tourType: locked.classification,
      departures:
        locked.classification === null
          ? structuredClone(before.departures)
          : [...(bySource.get(locked.sourceId) || [])].sort((a, b) =>
              departureIdentity(manifest.siteCode, a).localeCompare(departureIdentity(manifest.siteCode, b)),
            ),
    }
    return {
      productId: locked.productId,
      sourceId: locked.sourceId,
      classification: locked.classification,
      preimageSha256: groupCommerceChecksum(before),
      postimageSha256: groupCommerceChecksum(after),
      before,
      after,
    }
  })
  return {
    schemaVersion: 1,
    kind: 'full',
    siteCode: WINGSSIDE_GROUP_COMMERCE_SITE,
    batchId: WINGSSIDE_GROUP_COMMERCE_BATCH,
    releaseSha: snapshot.releaseSha,
    createdAt: now.toISOString(),
    expiresAt: evidence.expiresAt,
    sourceEvidenceSha256: groupCommerceChecksum(evidence),
    entries,
  }
}

export const deriveGroupCommerceCanaryPlan = ({
  fullPlan,
  productId,
}: {
  fullPlan: CommercePlan
  productId: 63 | 69
}): CommercePlan => {
  if (fullPlan.kind !== 'full' || fullPlan.entries.length !== 22) throw new Error('Canary requires the original full 22-tour plan')
  const entry = fullPlan.entries.find((candidate) => candidate.productId === productId)
  if (!entry || entry.after.departures.length === 0) throw new Error('Canary must have fresh source-backed departures')
  return {
    ...structuredClone(fullPlan),
    kind: 'canary',
    parentPlanSha256: groupCommerceChecksum(fullPlan),
    entries: [structuredClone(entry)],
  }
}

export const assertGroupCommerceCanaryPromotion = ({
  canaryPlan,
  canaryPlanSha256,
  fullPlan,
}: {
  canaryPlan: CommercePlan
  canaryPlanSha256: string
  fullPlan: CommercePlan
}) => {
  if (
    fullPlan.kind !== 'full' ||
    canaryPlan.kind !== 'canary' ||
    canaryPlan.entries.length !== 1 ||
    ![63, 69].includes(canaryPlan.entries[0]!.productId) ||
    canaryPlan.parentPlanSha256 !== groupCommerceChecksum(fullPlan) ||
    groupCommerceChecksum(canaryPlan) !== canaryPlanSha256
  ) {
    throw new Error('Full promotion requires a verified canary linked to the immutable full plan')
  }
}

export const transitionGroupCommerceSnapshot = ({
  expectedPlanSha256,
  mode,
  now = new Date(),
  plan,
  snapshot,
}: {
  expectedPlanSha256: string
  mode: 'apply' | 'rollback'
  now?: Date
  plan: CommercePlan
  snapshot: CommerceSnapshot
}): CommerceSnapshot => {
  if (groupCommerceChecksum(plan) !== expectedPlanSha256) throw new Error('Plan SHA-256 does not match')
  if (Date.parse(plan.expiresAt) <= now.getTime()) throw new Error('Plan has expired')
  if (snapshot.releaseSha !== plan.releaseSha) throw new Error('Snapshot release SHA drifted')
  const replacements = new Map(plan.entries.map((entry) => [entry.sourceId, entry]))
  return {
    ...structuredClone(snapshot),
    products: snapshot.products.map((current) => {
      const entry = replacements.get(current.sourceId)
      if (!entry) return structuredClone(current)
      const expected = mode === 'apply' ? entry.preimageSha256 : entry.postimageSha256
      if (groupCommerceChecksum(current) !== expected) {
        throw new Error(`Preimage conflict for ${current.sourceId}; refusing ${mode}`)
      }
      return structuredClone(mode === 'apply' ? entry.after : entry.before)
    }),
  }
}

export const verifyGroupCommerceSnapshot = ({
  expectedState,
  plan,
  snapshot,
}: {
  expectedState: 'before' | 'after'
  plan: CommercePlan
  snapshot: CommerceSnapshot
}) => {
  const products = new Map(snapshot.products.map((product) => [product.sourceId, product]))
  for (const entry of plan.entries) {
    const actual = products.get(entry.sourceId)
    const expected = expectedState === 'after' ? entry.postimageSha256 : entry.preimageSha256
    if (!actual || groupCommerceChecksum(actual) !== expected) {
      throw new Error(`Verification failed for ${entry.sourceId}`)
    }
  }
  return { verified: plan.entries.length, state: expectedState }
}

export const assertGroupCommerceProductionWriteGate = ({
  backupSha256,
  confirm,
  expectedConfirm,
  plan,
  planSha256,
  releaseSha,
  restoreEvidenceSha256,
}: {
  backupSha256?: string
  confirm?: string
  expectedConfirm: string
  plan: CommercePlan
  planSha256: string
  releaseSha?: string
  restoreEvidenceSha256?: string
}) => {
  if (process.env.NODE_ENV !== 'production') throw new Error('Production write gate requires NODE_ENV=production')
  if (process.env.PAYLOAD_DB_PUSH !== 'false') throw new Error('Production write gate requires PAYLOAD_DB_PUSH=false')
  if (confirm !== expectedConfirm) throw new Error('Production write confirmation is missing')
  if (groupCommerceChecksum(plan) !== planSha256) throw new Error('Production plan hash mismatch')
  if (releaseSha !== plan.releaseSha) throw new Error('Immutable release SHA does not match plan')
  assertSha(backupSha256 || '', 'backupSha256')
  assertSha(restoreEvidenceSha256 || '', 'restoreEvidenceSha256')
}
