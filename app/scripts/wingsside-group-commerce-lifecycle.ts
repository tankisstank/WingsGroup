import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import {
  assertGroupCommerceCanaryPromotion,
  createGroupCommercePlan,
  deriveGroupCommerceCanaryPlan,
  groupCommerceChecksum,
  transitionGroupCommerceSnapshot,
  verifyGroupCommerceSnapshot,
  type ClassificationManifest,
  type CommercePlan,
  type CommerceSnapshot,
  type SourceEvidence,
} from './lib/wingsSideGroupCommerceLifecycle'

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

const main = async () => {
  const phase = process.argv[2]
  const manifest = await readJSON<ClassificationManifest>(
    value('--classification') ||
      path.resolve('scripts/data/wingsside-group-commerce-v1/classification.json'),
  )
  if (phase === 'plan') {
    const snapshot = await readJSON<CommerceSnapshot>(value('--snapshot'))
    const evidence = await readJSON<SourceEvidence>(value('--evidence'))
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
  const snapshot = await readJSON<CommerceSnapshot>(value('--snapshot'))
  const planSha256 = value('--plan-sha256')
  if (!planSha256) throw new Error('--plan-sha256 is required')
  if (phase === 'verify') {
    if (groupCommerceChecksum(plan) !== planSha256) throw new Error('Plan SHA-256 does not match')
    const result = verifyGroupCommerceSnapshot({
      expectedState: value('--state') === 'before' ? 'before' : 'after',
      plan,
      snapshot,
    })
    console.log(JSON.stringify(result))
    return
  }
  if (phase !== 'apply' && phase !== 'rollback') {
    throw new Error('Choose plan, apply, verify, or rollback')
  }
  if (plan.kind === 'full') {
    const canaryPlan = await readJSON<CommercePlan>(value('--canary-plan'))
    const canaryPlanSha256 = value('--canary-plan-sha256')
    if (!canaryPlanSha256) throw new Error('--canary-plan-sha256 is required for full promotion')
    assertGroupCommerceCanaryPromotion({ canaryPlan, canaryPlanSha256, fullPlan: plan })
  }
  const output = await writeJSON(
    value('--output'),
    transitionGroupCommerceSnapshot({ expectedPlanSha256: planSha256, mode: phase, plan, snapshot }),
  )
  console.log(JSON.stringify({ output, phase, rehearsalOnly: true }))
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
