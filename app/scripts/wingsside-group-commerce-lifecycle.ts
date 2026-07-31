import 'dotenv/config'

import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { createLocalReq, getPayload, type Payload } from 'payload'

import {
  assertGroupCommerceCanaryAttestation,
  assertGroupCommerceCanaryPromotion,
  assertGroupCommerceProductionWriteGate,
  createGroupCommerceCanaryAttestation,
  createGroupCommercePlan,
  createGroupCommercePlanBundle,
  groupCommerceChecksum,
  WINGSSIDE_GROUP_COMMERCE_APPLY_CONFIRM,
  WINGSSIDE_GROUP_COMMERCE_ROLLBACK_CONFIRM,
  type ClassificationManifest,
  type CommercePlan,
  type GroupCommerceCanaryAttestation,
  type GroupCommerceCanaryReceipt,
  type SourceEvidence,
} from './lib/wingsSideGroupCommerceLifecycle'
import {
  mutateGroupCommercePayload,
  readGroupCommercePayloadSnapshot,
  recoverGroupCommerceMutationReceipt,
  verifyGroupCommercePayload,
  type GroupCommerceMutationReceipt,
} from './lib/wingsSideGroupCommercePayloadAdapter'
import {
  captureBestPriceExactRowEvidence,
  type BestPriceEvidenceCandidate,
} from './lib/wingsSideBestPriceEvidence'
import { assertWingsSideEditorialProductionWriteGuard } from './lib/wingsSideReleaseWriteGuard'

type Phase =
  | 'apply'
  | 'attest-canary'
  | 'capture-evidence'
  | 'plan'
  | 'recover-receipt'
  | 'rollback'
  | 'verify'

const value = (name: string) => {
  const inline = process.argv.find((argument) => argument.startsWith(`${name}=`))
  if (inline) return inline.slice(name.length + 1)
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : undefined
}

const readJSON = async <T>(filename?: string): Promise<T> => {
  if (!filename) throw new Error('Required JSON path is missing')
  return JSON.parse(await readFile(path.resolve(filename), 'utf8')) as T
}

const writeJSON = async (filename: string | undefined, data: unknown) => {
  if (!filename) throw new Error('--output is required')
  const resolved = path.resolve(filename)
  await writeFile(resolved, `${JSON.stringify(data, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' })
  return resolved
}

const loadPayload = async () => {
  if (process.env.PAYLOAD_DB_PUSH !== 'false') throw new Error('All DB phases require PAYLOAD_DB_PUSH=false')
  const { default: config } = await import('../src/payload.config')
  return getPayload({ config })
}

const resolveRequest = async (payload: Payload, phase: Phase) => {
  if (phase === 'apply' || phase === 'rollback') {
    const email = String(value('--admin-email') || process.env.IMPORT_ADMIN_EMAIL || '').trim()
    const users = await payload.find({
      collection: 'users',
      depth: 0,
      limit: 2,
      overrideAccess: true,
      pagination: false,
      where: { email: { equals: email } },
    })
    if (!email || users.docs.length !== 1 || users.docs[0]!.role !== 'super-admin') {
      throw new Error('Mutation operator must resolve to exactly one super-admin')
    }
    return createLocalReq({ user: users.docs[0] as never }, payload)
  }
  return createLocalReq(
    {
      user: {
        collection: 'users',
        id: 0,
        email: 'wingsside-group-commerce-read@internal.invalid',
        role: 'super-admin',
      } as never,
    },
    payload,
  )
}

const releaseGuardArgs = (
  planSha256: string,
  backupBindingSha256: string,
  confirm: string | undefined,
) => ({
  adminEmail: value('--admin-email') || process.env.IMPORT_ADMIN_EMAIL,
  backupBindingSha256,
  backupPath: value('--backup'),
  backupSha256: value('--backup-sha256'),
  planSha256,
  production: true,
  productionConfirm: value('--confirm-production'),
  releaseSha: value('--release-sha'),
  releaseSourceSha: value('--release-sha'),
  restoreEvidencePath: value('--restore-evidence'),
  restoreEvidenceSha256: value('--restore-evidence-sha256'),
  rollbackRelease: value('--rollback-release'),
  confirm,
})

const assertMutationGates = ({
  backupBindingSha256,
  canaryAttestationSha256,
  expectedConfirm,
  plan,
  planSha256,
}: {
  backupBindingSha256: string
  canaryAttestationSha256?: string
  expectedConfirm: string
  plan: CommercePlan
  planSha256: string
}) => {
  const args = releaseGuardArgs(planSha256, backupBindingSha256, value('--confirm'))
  assertWingsSideEditorialProductionWriteGuard(args)
  assertGroupCommerceProductionWriteGate({
    backupSha256: args.backupSha256,
    canaryAttestationSha256,
    confirm: args.confirm,
    expectedConfirm,
    plan,
    planSha256,
    releaseSha: args.releaseSha,
    restoreEvidenceSha256: args.restoreEvidenceSha256,
    trustedCanaryAttestationSha256:
      process.env.WINGSSIDE_GROUP_COMMERCE_CANARY_ATTESTATION_SHA256,
    mode: expectedConfirm === WINGSSIDE_GROUP_COMMERCE_APPLY_CONFIRM ? 'apply' : 'rollback',
  })
}

const main = async () => {
  const phase = process.argv[2] as Phase
  if (
    ![
      'apply',
      'attest-canary',
      'capture-evidence',
      'plan',
      'recover-receipt',
      'rollback',
      'verify',
    ].includes(phase)
  ) {
    throw new Error(
      'Choose capture-evidence, plan, apply, attest-canary, recover-receipt, verify, or rollback',
    )
  }
  const manifest = await readJSON<ClassificationManifest>(
    value('--classification') ||
      path.resolve('scripts/data/wingsside-group-commerce-v1/classification.json'),
  )
  if (phase === 'capture-evidence') {
    const candidates = await readJSON<BestPriceEvidenceCandidate[]>(value('--candidates'))
    const evidence = await captureBestPriceExactRowEvidence({
      candidates,
      manifest,
      ttlHours: Number(value('--ttl-hours') || 8),
    })
    const output = await writeJSON(value('--output'), evidence)
    console.log(JSON.stringify({ output, evidenceSha256: groupCommerceChecksum(evidence), rows: evidence.rows.length }))
    return
  }
  const releaseSha = String(value('--release-sha') || process.env.WINGSTRAVEL_RELEASE_SHA || '')
  const payload = await loadPayload()
  try {
    const req = await resolveRequest(payload, phase)
    if (phase === 'plan') {
      const evidence = await readJSON<SourceEvidence>(value('--evidence'))
      const snapshot = await readGroupCommercePayloadSnapshot({ manifest, payload, releaseSha, req })
      const canaryId = Number(value('--canary'))
      if (canaryId) {
        const canaryOutputArg = value('--canary-output')
        if (!canaryOutputArg) {
          throw new Error('--canary requires --canary-output so full and canary plans share one snapshot')
        }
        if (path.resolve(value('--output') || '') === path.resolve(canaryOutputArg)) {
          throw new Error('--output and --canary-output must be different paths')
        }
        const bundle = createGroupCommercePlanBundle({
          evidence,
          manifest,
          productId: canaryId as 63 | 69,
          snapshot,
        })
        const output = await writeJSON(value('--output'), bundle.fullPlan)
        const canaryOutput = await writeJSON(canaryOutputArg, bundle.canaryPlan)
        console.log(
          JSON.stringify({
            output,
            planSha256: bundle.fullPlanSha256,
            entries: bundle.fullPlan.entries.length,
            canaryOutput,
            canaryPlanSha256: bundle.canaryPlanSha256,
            canaryEntries: bundle.canaryPlan.entries.length,
          }),
        )
        return
      }
      const plan = createGroupCommercePlan({ evidence, manifest, snapshot })
      const output = await writeJSON(value('--output'), plan)
      console.log(
        JSON.stringify({
          output,
          planSha256: groupCommerceChecksum(plan),
          entries: plan.entries.length,
        }),
      )
      return
    }
    const plan = await readJSON<CommercePlan>(value('--plan'))
    const planSha256 = String(value('--plan-sha256') || '')
    if (groupCommerceChecksum(plan) !== planSha256) throw new Error('Plan SHA-256 does not match')
    if (releaseSha !== plan.releaseSha) throw new Error('Release SHA does not match the immutable plan')
    if (phase === 'recover-receipt') {
      const result = await recoverGroupCommerceMutationReceipt({
        manifest,
        payload,
        plan,
        planSha256,
        req,
      })
      const output = await writeJSON(value('--output'), result)
      console.log(JSON.stringify({ output, phase, created: result.createdDepartureIDs.length }))
      return
    }
    if (phase === 'verify') {
      const result = await verifyGroupCommercePayload({
        expectedState: value('--state') === 'before' ? 'before' : 'after',
        manifest,
        payload,
        plan,
        req,
      })
      console.log(JSON.stringify(result))
      return
    }
    if (phase === 'attest-canary') {
      if (plan.kind !== 'canary') throw new Error('attest-canary requires a canary plan')
      const fullPlan = await readJSON<CommercePlan>(value('--parent-plan'))
      const receipt = await readJSON<GroupCommerceCanaryReceipt>(value('--receipt'))
      const verification = await verifyGroupCommercePayload({
        expectedState: 'after',
        manifest,
        payload,
        plan,
        req,
      })
      const attestation = createGroupCommerceCanaryAttestation({
        canaryPlan: plan,
        canaryPlanSha256: planSha256,
        fullPlan,
        receipt,
        verification,
      })
      const output = await writeJSON(value('--output'), attestation)
      console.log(
        JSON.stringify({
          output,
          phase,
          attestationSha256: groupCommerceChecksum(attestation),
          checked: verification.checked,
          state: verification.state,
        }),
      )
      return
    }
    let backupBindingSha256 = planSha256
    let canaryAttestationSha256: string | undefined
    if (plan.kind === 'full') {
      const canaryPlan = await readJSON<CommercePlan>(value('--canary-plan'))
      const canaryPlanSha256 = String(value('--canary-plan-sha256') || '')
      assertGroupCommerceCanaryPromotion({ canaryPlan, canaryPlanSha256, fullPlan: plan })
      if (phase === 'apply') {
        const attestation = await readJSON<GroupCommerceCanaryAttestation>(
          value('--canary-attestation'),
        )
        const receipt = await readJSON<GroupCommerceCanaryReceipt>(value('--canary-receipt'))
        canaryAttestationSha256 = String(value('--canary-attestation-sha256') || '')
        assertGroupCommerceCanaryAttestation({
          attestation,
          attestationSha256: canaryAttestationSha256,
          canaryPlan,
          canaryPlanSha256,
          fullPlan: plan,
          receipt,
        })
        await verifyGroupCommercePayload({
          expectedState: 'after',
          manifest,
          payload,
          plan: canaryPlan,
          req,
        })
      }
    } else {
      const parentPlan = await readJSON<CommercePlan>(value('--parent-plan'))
      assertGroupCommerceCanaryPromotion({
        canaryPlan: plan,
        canaryPlanSha256: planSha256,
        fullPlan: parentPlan,
      })
      backupBindingSha256 = groupCommerceChecksum(parentPlan)
    }
    assertMutationGates({
      backupBindingSha256,
      canaryAttestationSha256,
      expectedConfirm:
        phase === 'apply'
          ? WINGSSIDE_GROUP_COMMERCE_APPLY_CONFIRM
          : WINGSSIDE_GROUP_COMMERCE_ROLLBACK_CONFIRM,
      plan,
      planSha256,
    })
    const receipt =
      phase === 'rollback'
        ? await readJSON<GroupCommerceMutationReceipt>(value('--receipt'))
        : undefined
    // Re-check both gates immediately before the transaction.
    assertMutationGates({
      backupBindingSha256,
      canaryAttestationSha256,
      expectedConfirm:
        phase === 'apply'
          ? WINGSSIDE_GROUP_COMMERCE_APPLY_CONFIRM
          : WINGSSIDE_GROUP_COMMERCE_ROLLBACK_CONFIRM,
      plan,
      planSha256,
    })
    const result = await mutateGroupCommercePayload({
      manifest,
      mode: phase,
      payload,
      plan,
      planSha256,
      receipt,
      req,
    })
    const output = await writeJSON(value('--output'), result)
    console.log(JSON.stringify({ output, phase, created: result.createdDepartureIDs.length }))
  } finally {
    await payload.destroy()
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
