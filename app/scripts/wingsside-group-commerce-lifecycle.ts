import 'dotenv/config'

import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { createLocalReq, getPayload, type Payload } from 'payload'

import {
  assertGroupCommerceCanaryPromotion,
  assertGroupCommerceProductionWriteGate,
  createGroupCommercePlan,
  deriveGroupCommerceCanaryPlan,
  groupCommerceChecksum,
  WINGSSIDE_GROUP_COMMERCE_APPLY_CONFIRM,
  WINGSSIDE_GROUP_COMMERCE_ROLLBACK_CONFIRM,
  type ClassificationManifest,
  type CommercePlan,
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

type Phase = 'apply' | 'capture-evidence' | 'plan' | 'recover-receipt' | 'rollback' | 'verify'

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

const releaseGuardArgs = (planSha256: string, confirm: string | undefined) => ({
  adminEmail: value('--admin-email') || process.env.IMPORT_ADMIN_EMAIL,
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
  expectedConfirm,
  plan,
  planSha256,
}: {
  expectedConfirm: string
  plan: CommercePlan
  planSha256: string
}) => {
  const args = releaseGuardArgs(planSha256, value('--confirm'))
  assertWingsSideEditorialProductionWriteGuard(args)
  assertGroupCommerceProductionWriteGate({
    backupSha256: args.backupSha256,
    confirm: args.confirm,
    expectedConfirm,
    plan,
    planSha256,
    releaseSha: args.releaseSha,
    restoreEvidenceSha256: args.restoreEvidenceSha256,
    mode: expectedConfirm === WINGSSIDE_GROUP_COMMERCE_APPLY_CONFIRM ? 'apply' : 'rollback',
  })
}

const main = async () => {
  const phase = process.argv[2] as Phase
  if (!['apply', 'capture-evidence', 'plan', 'recover-receipt', 'rollback', 'verify'].includes(phase)) {
    throw new Error('Choose capture-evidence, plan, apply, recover-receipt, verify, or rollback')
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
      const fullPlan = createGroupCommercePlan({ evidence, manifest, snapshot })
      const canaryId = Number(value('--canary'))
      const plan = canaryId
        ? deriveGroupCommerceCanaryPlan({ fullPlan, productId: canaryId as 63 | 69 })
        : fullPlan
      const output = await writeJSON(value('--output'), plan)
      console.log(JSON.stringify({ output, planSha256: groupCommerceChecksum(plan), entries: plan.entries.length }))
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
    if (plan.kind === 'full') {
      const canaryPlan = await readJSON<CommercePlan>(value('--canary-plan'))
      const canaryPlanSha256 = String(value('--canary-plan-sha256') || '')
      assertGroupCommerceCanaryPromotion({ canaryPlan, canaryPlanSha256, fullPlan: plan })
    } else {
      const parentPlan = await readJSON<CommercePlan>(value('--parent-plan'))
      assertGroupCommerceCanaryPromotion({
        canaryPlan: plan,
        canaryPlanSha256: planSha256,
        fullPlan: parentPlan,
      })
    }
    assertMutationGates({
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
