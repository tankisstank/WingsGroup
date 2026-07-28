import 'dotenv/config'

import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { createLocalReq, getPayload, type Payload } from 'payload'

import {
  assertCredentialsProductionEnvironment,
  assertReleaseSourceCommit,
} from './lib/wingsSideCredentialsProduction'
import { loadWingsSideTourEditorialCatalog } from './lib/wingsSideTourEditorialLocalization'
import {
  assertEditorialPlanShape,
  editorialChecksum,
  type WingsSideTourEditorialPlan,
} from './lib/wingsSideTourEditorialProduction'
import {
  applyWingsSideTourEditorialProductionPlan,
  createWingsSideTourEditorialProductionPlan,
  rollbackWingsSideTourEditorialProductionPlan,
  verifyWingsSideTourEditorialProductionPlan,
} from './lib/wingsSideTourEditorialProductionRuntime'
import {
  assertWingsSideEditorialProductionWriteGuard,
  initializeWingsSideEditorialProductionWriter,
} from './lib/wingsSideReleaseWriteGuard'

type Phase = 'apply' | 'plan' | 'rollback' | 'verify'

const applyConfirmation = 'CONFIRM_WINGSSIDE_TOUR_EDITORIAL_PRODUCTION_WRITE'
const rollbackConfirmation = 'CONFIRM_WINGSSIDE_TOUR_EDITORIAL_PRODUCTION_ROLLBACK'

const argumentValue = (name: string): string | undefined => {
  const inline = process.argv.find((argument) => argument.startsWith(`${name}=`))
  if (inline) return inline.slice(name.length + 1)
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : undefined
}

const selectedPhase = (): Phase => {
  const phase =
    argumentValue('--phase') || process.argv.slice(2).find((argument) => !argument.startsWith('--'))
  if (!phase || !(['plan', 'apply', 'verify', 'rollback'] as const).includes(phase as Phase)) {
    throw new Error('Choose one phase: plan, apply, verify, or rollback')
  }
  return phase as Phase
}

const assertConfirmation = (phase: Phase) => {
  if (phase === 'apply' && argumentValue('--confirm') !== applyConfirmation) {
    throw new Error(`Apply requires --confirm=${applyConfirmation}`)
  }
  if (phase === 'rollback' && argumentValue('--confirm') !== rollbackConfirmation) {
    throw new Error(`Rollback requires --confirm=${rollbackConfirmation}`)
  }
}

const resolveAdmin = async (payload: Payload, phase: Phase) => {
  if (phase === 'plan' || phase === 'verify') {
    return {
      collection: 'users',
      createdAt: new Date(0).toISOString(),
      email: 'wingsside-tour-editorial-plan@internal.invalid',
      id: 0,
      role: 'super-admin',
      sites: [],
      updatedAt: new Date(0).toISOString(),
    }
  }
  const email = String(argumentValue('--admin-email') || process.env.IMPORT_ADMIN_EMAIL || '').trim()
  if (!email) throw new Error(`${phase} requires --admin-email or IMPORT_ADMIN_EMAIL`)
  const result = await payload.find({
    collection: 'users',
    depth: 0,
    limit: 2,
    overrideAccess: true,
    pagination: false,
    where: { email: { equals: email } },
  })
  if (result.docs.length !== 1 || result.docs[0]!.role !== 'super-admin') {
    throw new Error('Tour editorial production operator must resolve to exactly one super-admin')
  }
  return result.docs[0]!
}

const atomicWriteJSON = async (filePath: string, value: unknown) => {
  const resolved = path.resolve(filePath)
  const temporary = `${resolved}.${process.pid}.${Date.now()}.tmp`
  await mkdir(path.dirname(resolved), { recursive: true })
  try {
    await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
    await rename(temporary, resolved)
  } catch (error) {
    await rm(temporary, { force: true })
    throw error
  }
  return resolved
}

const readPlan = async () => {
  const planPath = argumentValue('--plan')
  if (!planPath) throw new Error('This phase requires --plan <path>')
  const resolved = path.resolve(planPath)
  const plan = JSON.parse(await readFile(resolved, 'utf8')) as WingsSideTourEditorialPlan
  assertEditorialPlanShape(plan)
  const planSha256 = editorialChecksum(plan)
  if (argumentValue('--plan-sha256') !== planSha256) {
    throw new Error('Supplied plan SHA-256 does not match canonical plan')
  }
  return { plan, planPath: resolved, planSha256 }
}

const log = (value: Record<string, unknown>) => console.log(JSON.stringify(value))

const mutationReleaseGuardArgs = ({
  planSha256,
  releaseSourceCommit,
}: {
  planSha256: string
  releaseSourceCommit: string
}) => ({
    adminEmail: argumentValue('--admin-email') || process.env.IMPORT_ADMIN_EMAIL,
    backupPath: argumentValue('--backup'),
    backupSha256: argumentValue('--backup-sha256'),
    planSha256,
    production: true,
    productionConfirm: argumentValue('--confirm-production'),
    releaseSha: argumentValue('--release-sha'),
    releaseSourceSha: releaseSourceCommit,
    restoreEvidencePath: argumentValue('--restore-evidence'),
    restoreEvidenceSha256: argumentValue('--restore-evidence-sha256'),
    rollbackRelease: argumentValue('--rollback-release'),
  })

const assertMutationReleaseGuard = (values: {
  planSha256: string
  releaseSourceCommit: string
}) => assertWingsSideEditorialProductionWriteGuard(mutationReleaseGuardArgs(values))

const main = async () => {
  const phase = selectedPhase()
  assertConfirmation(phase)
  const releaseSourceCommit = assertReleaseSourceCommit(process.env.WINGSTRAVEL_RELEASE_SHA)
  assertCredentialsProductionEnvironment({
    databaseURL: String(process.env.DATABASE_URL || ''),
    nodeEnv: process.env.NODE_ENV,
    payloadDbPush: process.env.PAYLOAD_DB_PUSH,
    payloadPackageName: '@payloadcms/db-postgres',
  })
  const preparedPlan = phase === 'plan' ? null : await readPlan()
  if (preparedPlan && preparedPlan.plan.releaseSourceCommit !== releaseSourceCommit) {
    throw new Error('Release source commit does not match the editorial plan')
  }
  const payload =
    preparedPlan && (phase === 'apply' || phase === 'rollback')
      ? await initializeWingsSideEditorialProductionWriter({
          args: mutationReleaseGuardArgs({
            planSha256: preparedPlan.planSha256,
            releaseSourceCommit,
          }),
          initialize: async () => {
            const { default: config } = await import('../src/payload.config')
            return getPayload({ config })
          },
        })
      : await (async () => {
          const { default: config } = await import('../src/payload.config')
          return getPayload({ config })
        })()
  try {
    assertCredentialsProductionEnvironment({
      databaseURL: String(process.env.DATABASE_URL || ''),
      nodeEnv: process.env.NODE_ENV,
      payloadDbPush: process.env.PAYLOAD_DB_PUSH,
      payloadPackageName: payload.db.packageName,
    })
    const admin = await resolveAdmin(payload, phase)
    const req = await createLocalReq({ user: admin as never }, payload)
    const catalog = await loadWingsSideTourEditorialCatalog()

    if (phase === 'plan') {
      const plan = await createWingsSideTourEditorialProductionPlan({
        catalog,
        payload,
        releaseSourceCommit,
        req,
        runID: randomUUID(),
      })
      const outputPath = await atomicWriteJSON(
        argumentValue('--output') ||
          path.resolve('artifacts', 'release', 'wingsside-tour-editorial', `plan-${Date.now()}.json`),
        plan,
      )
      log({
        entries: plan.entries.length,
        outputPath,
        phase,
        planSha256: editorialChecksum(plan),
        tours: plan.expectedTourCount,
      })
      return
    }

    const { plan, planPath, planSha256 } = preparedPlan!
    if (phase === 'verify') {
      const result = await verifyWingsSideTourEditorialProductionPlan({
        expectedState: 'after',
        payload,
        plan,
        req,
      })
      log({ ...result, phase, planPath, planSha256 })
      return
    }
    const failAfterUpdates = argumentValue('--fail-after-updates')
      ? Number(argumentValue('--fail-after-updates'))
      : undefined
    // Re-check immediately before the transactional mutation so evidence cannot
    // be changed between process initialization and apply/rollback.
    assertMutationReleaseGuard({ planSha256, releaseSourceCommit })
    const result =
      phase === 'apply'
        ? await applyWingsSideTourEditorialProductionPlan({
            catalog,
            failAfterUpdates,
            payload,
            plan,
            req,
          })
        : await rollbackWingsSideTourEditorialProductionPlan({
            catalog,
            failAfterUpdates,
            payload,
            plan,
            req,
          })
    log({
      ...result,
      phase,
      planPath,
      planSha256,
      state: phase === 'apply' ? 'after' : 'before',
    })
  } finally {
    await payload.destroy()
  }
}

void main().then(
  () => process.exit(0),
  (error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  },
)
