import { describe, expect, it, vi } from 'vitest'

import manifestJSON from '../../scripts/data/wingsside-group-commerce-v1/classification.json'
import {
  assertGroupCommerceCanaryAttestation,
  assertGroupCommerceCanaryPromotion,
  assertClassificationManifest,
  assertGroupCommerceProductionWriteGate,
  createGroupCommerceCanaryAttestation,
  createGroupCommercePlan,
  createGroupCommercePlanBundle,
  deriveGroupCommerceCanaryPlan,
  groupCommerceChecksum,
  transitionGroupCommerceSnapshot,
  verifyGroupCommerceSnapshot,
  type ClassificationManifest,
  type CommerceSnapshot,
  type SourceEvidence,
} from '../../scripts/lib/wingsSideGroupCommerceLifecycle'

const manifest = manifestJSON as ClassificationManifest
const sha = 'a'.repeat(64)
const now = new Date('2026-07-31T10:00:00.000Z')

const snapshot = (): CommerceSnapshot => ({
  schemaVersion: 1,
  releaseSha: 'b'.repeat(40),
  capturedAt: '2026-07-31T09:55:00.000Z',
  products: manifest.products.map((product) => ({
    productId: product.productId,
    sourceId: product.sourceId,
    siteCode: manifest.siteCode,
    batchId: manifest.batchId,
    tourType: null,
    departures: [],
  })),
})

const sourceRow = (productId: 63 | 65 | 69, date: string, price: number) => {
  const sourceId = manifest.products.find((product) => product.productId === productId)!.sourceId
  return {
    productId,
    sourceId,
    departureDate: date,
    variantKey: 'standard',
    priceFrom: price,
    currency: 'USD' as const,
    priceBasis: 'per-person' as const,
    availabilityStatus: 'open' as const,
    availabilityBadge: 'Guaranteed departure' as const,
    verifiedAt: '2026-07-31T09:30:00.000Z',
    expiresAt: '2026-07-31T17:30:00.000Z',
    sourceUrl: `https://www.bestpricetravel.com/${sourceId.split('--').at(-1)}.html`,
    requestedSourceUrl: `https://www.bestpricetravel.com/${sourceId.split('--').at(-1)}.html`,
    finalSourceUrl: `https://www.bestpricetravel.com/${sourceId.split('--').at(-1)}.html`,
    httpStatus: 200 as const,
    evidenceKind: 'exact-html-row' as const,
    sourcePageSha256: sha,
    sourceRowSha256: groupCommerceChecksum({ productId, date, price }),
    sourceStatus: 'guaranteed-departure' as const,
    exactRowDate: date,
    exactRowPerPaxPrice: `USD ${price}/pax`,
  }
}

const evidence = (): SourceEvidence => ({
  schemaVersion: 1,
  sourceSystem: 'bestpricetravel',
  checkedAt: '2026-07-31T09:30:00.000Z',
  expiresAt: '2026-07-31T17:30:00.000Z',
  rows: [
    sourceRow(63, '2026-12-23', 741),
    sourceRow(65, '2026-08-01', 1699),
    sourceRow(69, '2026-08-01', 1120),
  ],
})

describe('WingSide group commerce production lifecycle', () => {
  it('locks the exact 22-tour site, batch, source identity and accepted classifications', () => {
    expect(() => assertClassificationManifest(manifest)).not.toThrow()
    expect(manifest.products.filter((row) => row.classification === 'group').map((row) => row.productId)).toEqual([
      62, 63, 67, 68, 69, 71, 79,
    ])
    expect(manifest.products.filter((row) => row.classification === 'hybrid').map((row) => row.productId)).toEqual([
      64, 65, 82, 83,
    ])
    expect(manifest.products.filter((row) => row.classification === null).map((row) => row.productId)).toEqual([
      66, 76, 77,
    ])
    const tampered = structuredClone(manifest)
    tampered.products[0]!.sourceId = 'vietnam-tours--wrong-source'
    expect(() => assertClassificationManifest(tampered)).toThrow(/immutable reviewed SHA-256/)
  })

  it('creates a signed, expiring plan with inquiry-only fresh departures', () => {
    const plan = createGroupCommercePlan({ evidence: evidence(), manifest, now, snapshot: snapshot() })
    expect(plan.entries).toHaveLength(22)
    expect(plan.sourceEvidenceSha256).toMatch(/^[a-f0-9]{64}$/)
    expect(groupCommerceChecksum(plan)).toMatch(/^[a-f0-9]{64}$/)
    expect(plan.entries.find((row) => row.productId === 65)?.after).toMatchObject({
      tourType: 'hybrid',
      departures: [{ bookingMode: 'inquiry', canHoldSeat: false, priceFrom: 1699 }],
    })
    expect(plan.entries.find((row) => row.productId === 62)?.after.departures).toEqual([])
    expect(plan.entries.find((row) => row.productId === 66)?.after.tourType).toBeNull()
  })

  it('deduplicates identical inventory identities and fails conflicting rows', () => {
    const input = evidence()
    input.rows.push(structuredClone(input.rows[0]!))
    const plan = createGroupCommercePlan({ evidence: input, manifest, now, snapshot: snapshot() })
    expect(plan.entries.find((row) => row.productId === 63)?.after.departures).toHaveLength(1)
    input.rows.push({ ...structuredClone(input.rows[0]!), priceFrom: 742, exactRowPerPaxPrice: 'USD 742/pax' })
    expect(() => createGroupCommercePlan({ evidence: input, manifest, now, snapshot: snapshot() })).toThrow(
      /Conflicting departure rows/,
    )
  })

  it('rejects stale evidence and generic InStock-style evidence', () => {
    const stale = evidence()
    stale.expiresAt = '2026-07-31T09:59:59.000Z'
    expect(() => createGroupCommercePlan({ evidence: stale, manifest, now, snapshot: snapshot() })).toThrow(/stale/)
    const generic = evidence()
    generic.rows[0]!.sourceStatus = 'in-stock' as never
    expect(() => createGroupCommercePlan({ evidence: generic, manifest, now, snapshot: snapshot() })).toThrow(
      /exact guaranteed date/,
    )
  })

  it('links canary to the immutable full plan and supports symmetric rehearsal rollback', () => {
    const before = snapshot()
    const full = createGroupCommercePlan({ evidence: evidence(), manifest, now, snapshot: before })
    const canary = deriveGroupCommerceCanaryPlan({ fullPlan: full, productId: 63 })
    expect(canary.parentPlanSha256).toBe(groupCommerceChecksum(full))
    const canarySha = groupCommerceChecksum(canary)
    expect(() =>
      assertGroupCommerceCanaryPromotion({
        canaryPlan: canary,
        canaryPlanSha256: canarySha,
        fullPlan: full,
      }),
    ).not.toThrow()
    const after = transitionGroupCommerceSnapshot({
      expectedPlanSha256: canarySha,
      mode: 'apply',
      now,
      plan: canary,
      snapshot: before,
    })
    expect(verifyGroupCommerceSnapshot({ expectedState: 'after', plan: canary, snapshot: after })).toEqual({
      verified: 1,
      state: 'after',
    })
    const restored = transitionGroupCommerceSnapshot({
      expectedPlanSha256: canarySha,
      mode: 'rollback',
      now,
      plan: canary,
      snapshot: after,
    })
    expect(groupCommerceChecksum(restored.products)).toBe(groupCommerceChecksum(before.products))
  })

  it('creates full and canary plans from one snapshot and requires an immutable verify attestation', () => {
    const bundle = createGroupCommercePlanBundle({
      evidence: evidence(),
      manifest,
      now,
      productId: 63,
      snapshot: snapshot(),
    })
    expect(bundle.canaryPlan.parentPlanSha256).toBe(bundle.fullPlanSha256)
    expect(bundle.canaryPlan.entries[0]).toEqual(
      bundle.fullPlan.entries.find(({ productId }) => productId === 63),
    )
    const receipt = {
      schemaVersion: 1 as const,
      planSha256: bundle.canaryPlanSha256,
      releaseSha: bundle.canaryPlan.releaseSha,
      createdDepartureIDs: [901],
    }
    const attestation = createGroupCommerceCanaryAttestation({
      canaryPlan: bundle.canaryPlan,
      canaryPlanSha256: bundle.canaryPlanSha256,
      fullPlan: bundle.fullPlan,
      receipt,
      verification: { checked: 1, state: 'after' },
      verifiedAt: '2026-07-31T10:05:00.000Z',
    })
    const attestationSha256 = groupCommerceChecksum(attestation)
    expect(
      assertGroupCommerceCanaryAttestation({
        attestation,
        attestationSha256,
        canaryPlan: bundle.canaryPlan,
        canaryPlanSha256: bundle.canaryPlanSha256,
        fullPlan: bundle.fullPlan,
        receipt,
      }),
    ).toMatchObject({
      attestationSha256,
      canaryPlanSha256: bundle.canaryPlanSha256,
      fullPlanSha256: bundle.fullPlanSha256,
    })

    expect(() =>
      assertGroupCommerceCanaryAttestation({
        attestation,
        attestationSha256,
        canaryPlan: bundle.canaryPlan,
        canaryPlanSha256: bundle.canaryPlanSha256,
        fullPlan: bundle.fullPlan,
        receipt: { ...receipt, createdDepartureIDs: [902] },
      }),
    ).toThrow(/immutable canary/)

    const substitutedCanary = structuredClone(bundle.canaryPlan)
    substitutedCanary.entries[0]!.after.tourType = 'private'
    expect(() =>
      assertGroupCommerceCanaryPromotion({
        canaryPlan: substitutedCanary,
        canaryPlanSha256: groupCommerceChecksum(substitutedCanary),
        fullPlan: bundle.fullPlan,
      }),
    ).toThrow(/immutable full plan/)
  })

  it('rejects an expired apply plan but still permits an exact rollback', () => {
    const before = snapshot()
    const plan = createGroupCommercePlan({ evidence: evidence(), manifest, now, snapshot: before })
    const planSha256 = groupCommerceChecksum(plan)
    const after = transitionGroupCommerceSnapshot({
      expectedPlanSha256: planSha256,
      mode: 'apply',
      now,
      plan,
      snapshot: before,
    })
    const expiredNow = new Date('2026-07-31T17:30:00.000Z')
    expect(() =>
      transitionGroupCommerceSnapshot({
        expectedPlanSha256: planSha256,
        mode: 'apply',
        now: expiredNow,
        plan,
        snapshot: before,
      }),
    ).toThrow(/Plan has expired/)
    expect(() =>
      transitionGroupCommerceSnapshot({
        expectedPlanSha256: planSha256,
        mode: 'rollback',
        now: expiredNow,
        plan,
        snapshot: after,
      }),
    ).not.toThrow()
  })

  it('fails closed on preimage drift and tampered plan hashes', () => {
    const before = snapshot()
    const plan = createGroupCommercePlan({ evidence: evidence(), manifest, now, snapshot: before })
    const drifted = structuredClone(before)
    drifted.products[0]!.tourType = 'private'
    expect(() =>
      transitionGroupCommerceSnapshot({
        expectedPlanSha256: groupCommerceChecksum(plan),
        mode: 'apply',
        now,
        plan,
        snapshot: drifted,
      }),
    ).toThrow(/Preimage conflict/)
    expect(() =>
      transitionGroupCommerceSnapshot({
        expectedPlanSha256: '0'.repeat(64),
        mode: 'apply',
        now,
        plan,
        snapshot: before,
      }),
    ).toThrow(/Plan SHA-256/)
  })

  it('keeps the production writer behind immutable release, backup and restore gates', () => {
    const plan = createGroupCommercePlan({ evidence: evidence(), manifest, now, snapshot: snapshot() })
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('PAYLOAD_DB_PUSH', 'false')
    try {
      expect(() =>
        assertGroupCommerceProductionWriteGate({
          backupSha256: sha,
          canaryAttestationSha256: sha,
          confirm: 'CONFIRM_WINGSSIDE_GROUP_COMMERCE_PRODUCTION_WRITE',
          expectedConfirm: 'CONFIRM_WINGSSIDE_GROUP_COMMERCE_PRODUCTION_WRITE',
          plan,
          planSha256: groupCommerceChecksum(plan),
          releaseSha: plan.releaseSha,
          restoreEvidenceSha256: sha,
          trustedCanaryAttestationSha256: sha,
          mode: 'apply',
          now,
        }),
      ).not.toThrow()
      expect(() =>
        assertGroupCommerceProductionWriteGate({
          canaryAttestationSha256: sha,
          confirm: 'CONFIRM_WINGSSIDE_GROUP_COMMERCE_PRODUCTION_WRITE',
          expectedConfirm: 'CONFIRM_WINGSSIDE_GROUP_COMMERCE_PRODUCTION_WRITE',
          plan,
          planSha256: groupCommerceChecksum(plan),
          releaseSha: plan.releaseSha,
          trustedCanaryAttestationSha256: sha,
          mode: 'apply',
          now,
        }),
      ).toThrow(/backupSha256/)
      expect(() =>
        assertGroupCommerceProductionWriteGate({
          backupSha256: sha,
          confirm: 'CONFIRM_WINGSSIDE_GROUP_COMMERCE_PRODUCTION_WRITE',
          expectedConfirm: 'CONFIRM_WINGSSIDE_GROUP_COMMERCE_PRODUCTION_WRITE',
          plan,
          planSha256: groupCommerceChecksum(plan),
          releaseSha: plan.releaseSha,
          restoreEvidenceSha256: sha,
          mode: 'apply',
          now,
        }),
      ).toThrow(/trusted canary attestation/)
      expect(() =>
        assertGroupCommerceProductionWriteGate({
          backupSha256: sha,
          canaryAttestationSha256: sha,
          confirm: 'CONFIRM_WINGSSIDE_GROUP_COMMERCE_PRODUCTION_WRITE',
          expectedConfirm: 'CONFIRM_WINGSSIDE_GROUP_COMMERCE_PRODUCTION_WRITE',
          plan,
          planSha256: groupCommerceChecksum(plan),
          releaseSha: plan.releaseSha,
          restoreEvidenceSha256: sha,
          trustedCanaryAttestationSha256: sha,
          mode: 'apply',
          now: new Date(plan.expiresAt),
        }),
      ).toThrow(/apply plan has expired/)
      expect(() =>
        assertGroupCommerceProductionWriteGate({
          backupSha256: sha,
          confirm: 'CONFIRM_WINGSSIDE_GROUP_COMMERCE_PRODUCTION_ROLLBACK',
          expectedConfirm: 'CONFIRM_WINGSSIDE_GROUP_COMMERCE_PRODUCTION_ROLLBACK',
          plan,
          planSha256: groupCommerceChecksum(plan),
          releaseSha: plan.releaseSha,
          restoreEvidenceSha256: sha,
          mode: 'rollback',
          now: new Date(plan.expiresAt),
        }),
      ).not.toThrow()
    } finally {
      vi.unstubAllEnvs()
    }
  })
})
