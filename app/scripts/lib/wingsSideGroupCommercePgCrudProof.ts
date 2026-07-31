import config from '../../src/payload.config'
import { isDepartureVerificationCurrent } from '../../src/tours/departureCommerce'
import manifestJSON from '../data/wingsside-group-commerce-v1/classification.json'
import { createLocalReq, getPayload, type PayloadRequest } from 'payload'

import {
  createGroupCommercePlan,
  deriveGroupCommerceCanaryPlan,
  groupCommerceChecksum,
  type ClassificationManifest,
  type SourceDepartureRow,
  type SourceEvidence,
} from './wingsSideGroupCommerceLifecycle'
import {
  mutateGroupCommercePayload,
  verifyGroupCommercePayload,
  WINGSSIDE_GROUP_COMMERCE_MANAGED_BY,
} from './wingsSideGroupCommercePayloadAdapter'

const manifest = manifestJSON as ClassificationManifest
const releaseSha = 'c'.repeat(40)
const payload = await getPayload({ config })
const suffix = `${process.pid}-${Date.now()}`

const bootstrapReq = await createLocalReq(
  {
    context: { disableRevalidate: true },
    user: {
      collection: 'users',
      createdAt: new Date(0).toISOString(),
      email: 'group-commerce-bootstrap@internal.invalid',
      id: 0,
      role: 'super-admin',
      sites: [],
      updatedAt: new Date(0).toISOString(),
    } as never,
  },
  payload,
)

const sourceRow = ({
  checkedAt,
  departureDate,
  expiresAt,
  priceFrom,
  productId,
}: {
  checkedAt: string
  departureDate: string
  expiresAt: string
  priceFrom: number
  productId: 63 | 65 | 69
}): SourceDepartureRow => {
  const sourceId = manifest.products.find((product) => product.productId === productId)!.sourceId
  const sourceUrl = `https://www.bestpricetravel.com/${sourceId.split('--').at(-1)}.html`
  return {
    productId,
    sourceId,
    departureDate,
    variantKey: 'standard',
    priceFrom,
    currency: 'USD',
    priceBasis: 'per-person',
    availabilityStatus: 'open',
    availabilityBadge: 'Guaranteed departure',
    verifiedAt: checkedAt,
    expiresAt,
    sourceUrl,
    requestedSourceUrl: sourceUrl,
    finalSourceUrl: sourceUrl,
    httpStatus: 200,
    evidenceKind: 'exact-html-row',
    sourcePageSha256: groupCommerceChecksum({ sourceId, suffix, kind: 'page' }),
    sourceRowSha256: groupCommerceChecksum({
      departureDate,
      priceFrom,
      productId,
      suffix,
      kind: 'row',
    }),
    sourceStatus: 'guaranteed-departure',
    exactRowDate: departureDate,
    exactRowPerPaxPrice: `USD ${priceFrom}/pax`,
  }
}

const assertUnmanagedDeparture = async ({
  expectedIdentity,
  id,
  req,
}: {
  expectedIdentity: string
  id: number | string
  req: PayloadRequest
}) => {
  const row = await payload.findByID({
    collection: 'tour-departures',
    depth: 0,
    id,
    overrideAccess: true,
    req,
  })
  if (
    row.inventoryIdentity !== expectedIdentity ||
    row.sourceProvenance?.managedBy === WINGSSIDE_GROUP_COMMERCE_MANAGED_BY ||
    isDepartureVerificationCurrent(row)
  ) {
    throw new Error('Unmanaged expired departure was changed or became commerce-current')
  }
}

const runLifecycle = async ({
  label,
  plan,
  req,
  unmanaged,
}: {
  label: 'canary' | 'full'
  plan: ReturnType<typeof createGroupCommercePlan>
  req: PayloadRequest
  unmanaged: { id: number | string; inventoryIdentity: string }
}) => {
  const planSha256 = groupCommerceChecksum(plan)
  const receipt = await mutateGroupCommercePayload({
    manifest,
    mode: 'apply',
    payload,
    plan,
    planSha256,
    req,
  })
  const after = await verifyGroupCommercePayload({
    expectedState: 'after',
    manifest,
    payload,
    plan,
    req,
  })
  await assertUnmanagedDeparture({
    expectedIdentity: unmanaged.inventoryIdentity,
    id: unmanaged.id,
    req,
  })

  const managed = await payload.find({
    collection: 'tour-departures',
    depth: 0,
    limit: 10,
    overrideAccess: true,
    pagination: false,
    req,
    where: {
      and: [
        { 'sourceProvenance.managedBy': { equals: WINGSSIDE_GROUP_COMMERCE_MANAGED_BY } },
        { id: { in: receipt.createdDepartureIDs } },
      ],
    },
  })
  if (
    managed.docs.length !== receipt.createdDepartureIDs.length ||
    managed.docs.some((row) => !isDepartureVerificationCurrent(row))
  ) {
    throw new Error(`${label} apply did not persist only fresh managed departures`)
  }

  await mutateGroupCommercePayload({
    manifest,
    mode: 'rollback',
    payload,
    plan,
    planSha256,
    receipt,
    req,
  })
  const before = await verifyGroupCommercePayload({
    expectedState: 'before',
    manifest,
    payload,
    plan,
    req,
  })
  await assertUnmanagedDeparture({
    expectedIdentity: unmanaged.inventoryIdentity,
    id: unmanaged.id,
    req,
  })
  const removed = await payload.find({
    collection: 'tour-departures',
    depth: 0,
    limit: 10,
    overrideAccess: true,
    pagination: false,
    req,
    where: { id: { in: receipt.createdDepartureIDs } },
  })
  if (removed.docs.length !== 0) {
    throw new Error(`${label} rollback did not remove only its managed departures`)
  }
  return {
    afterChecked: after.checked,
    beforeChecked: before.checked,
    createdDepartures: receipt.createdDepartureIDs.length,
  }
}

try {
  const site = await payload.create({
    collection: 'sites',
    data: {
      code: 'wing-side',
      defaultLocale: 'en',
      isActive: false,
      name: `WingSide group commerce PG proof ${suffix}`,
      primaryDomain: `group-commerce-${suffix}.invalid`,
      supportedLocales: ['en'],
    },
    overrideAccess: true,
    req: bootstrapReq,
  })
  const admin = await payload.create({
    collection: 'users',
    data: {
      email: `group-commerce-${suffix}@internal.invalid`,
      name: 'Group commerce PostgreSQL proof',
      password: `pg-proof-${suffix}`,
      role: 'super-admin',
      sites: [],
    },
    overrideAccess: true,
    req: bootstrapReq,
  })
  const req = await createLocalReq(
    {
      context: { disableRevalidate: true },
      user: admin,
    },
    payload,
  )

  for (let id = 1; id < 62; id += 1) {
    const filler = await payload.create({
      collection: 'tour-products',
      context: { disableRevalidate: true },
      data: {
        _status: 'published',
        durationDays: 1,
        durationNights: 0,
        itineraryDays: [{ dayNumber: 1, summary: 'Ephemeral filler.', title: 'Filler day' }],
        market: 'vietnam',
        site: site.id,
        slug: `group-commerce-filler-${id}-${suffix}`,
        summary: 'Ephemeral PostgreSQL ID alignment record.',
        title: `Group commerce filler ${id}`,
      },
      draft: true,
      locale: 'en',
      overrideAccess: true,
      req,
    })
    if (Number(filler.id) !== id) {
      throw new Error(`Expected empty PostgreSQL tour ID ${id}, received ${filler.id}`)
    }
  }

  for (const locked of manifest.products) {
    const product = await payload.create({
      collection: 'tour-products',
      context: { disableRevalidate: true },
      data: {
        _status: 'published',
        durationDays: 1,
        durationNights: 0,
        itineraryDays: [{ dayNumber: 1, summary: 'Scoped proof day.', title: 'Proof day' }],
        market: 'vietnam',
        site: site.id,
        slug: `group-commerce-${locked.productId}-${suffix}`,
        sourceProvenance: {
          importBatchId: manifest.batchId,
          sourceId: locked.sourceId,
          sourceSystem: manifest.authorizedSourceSystem,
        },
        summary: 'Exact scoped US057 PostgreSQL proof product.',
        title: `Group commerce product ${locked.productId}`,
      },
      draft: true,
      locale: 'en',
      overrideAccess: true,
      req,
    })
    if (Number(product.id) !== locked.productId) {
      throw new Error(`Locked tour ${locked.productId} received ID ${product.id}`)
    }
  }

  const now = new Date()
  const checkedAt = new Date(now.getTime() - 5 * 60_000).toISOString()
  const expiresAt = new Date(now.getTime() + 2 * 60 * 60_000).toISOString()
  const departureDate = new Date(now.getTime() + 90 * 86_400_000).toISOString().slice(0, 10)
  const expiredCheckedAt = new Date(now.getTime() - 48 * 60 * 60_000).toISOString()
  const expiredAt = new Date(now.getTime() - 24 * 60 * 60_000).toISOString()

  const unmanaged = await payload.create({
    collection: 'tour-departures',
    context: { disableRevalidate: true },
    data: {
      _status: 'published',
      availabilityStatus: 'open',
      currency: 'USD',
      departureDate,
      expiresAt: expiredAt,
      intentConfig: { bookingIntentMode: 'inquiry' },
      priceBasis: 'per-person',
      priceFrom: 1,
      site: site.id,
      tourProduct: 63,
      variantKey: 'manual-expired',
      verifiedAt: expiredCheckedAt,
    },
    overrideAccess: true,
    req,
  })
  if (!unmanaged.inventoryIdentity || isDepartureVerificationCurrent(unmanaged)) {
    throw new Error('Expired unmanaged departure fixture is not fail-closed')
  }

  const before = await import('./wingsSideGroupCommercePayloadAdapter').then(
    ({ readGroupCommercePayloadSnapshot }) =>
      readGroupCommercePayloadSnapshot({
        capturedAt: now.toISOString(),
        manifest,
        payload,
        releaseSha,
        req,
      }),
  )
  if (before.products.length !== 22 || before.products.some(({ departures }) => departures.length)) {
    throw new Error('Initial exact 22-tour snapshot included unmanaged inventory')
  }

  const evidence: SourceEvidence = {
    schemaVersion: 1,
    sourceSystem: 'bestpricetravel',
    checkedAt,
    expiresAt,
    rows: [
      sourceRow({ checkedAt, departureDate, expiresAt, priceFrom: 741, productId: 63 }),
      sourceRow({ checkedAt, departureDate, expiresAt, priceFrom: 1699, productId: 65 }),
      sourceRow({ checkedAt, departureDate, expiresAt, priceFrom: 1120, productId: 69 }),
    ],
  }
  const full = createGroupCommercePlan({ evidence, manifest, now, snapshot: before })
  const canary = deriveGroupCommerceCanaryPlan({ fullPlan: full, productId: 63 })

  const canaryResult = await runLifecycle({
    label: 'canary',
    plan: canary,
    req,
    unmanaged: { id: unmanaged.id, inventoryIdentity: unmanaged.inventoryIdentity },
  })
  const fullResult = await runLifecycle({
    label: 'full',
    plan: full,
    req,
    unmanaged: { id: unmanaged.id, inventoryIdentity: unmanaged.inventoryIdentity },
  })

  console.log(
    JSON.stringify({
      adapter: payload.db.packageName,
      adminSeeded: admin.id,
      exactScopedTours: manifest.products.length,
      unmanagedExpiredPreserved: unmanaged.id,
      canary: canaryResult,
      full: fullResult,
      status: 'pass',
    }),
  )
} finally {
  await payload.destroy()
}

// Payload initializes background job resources that can keep this standalone
// proof process alive after all adapters have been destroyed.
process.exit(0)
