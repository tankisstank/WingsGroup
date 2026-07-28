import 'dotenv/config'

import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createLocalReq, getPayload, type Payload } from 'payload'

import {
  assertCredentialsProductionEnvironment,
  assertReleaseSourceCommit,
} from './lib/wingsSideCredentialsProduction'
import {
  parseWingsSideTourEditorialCatalogV2,
  wingsSideCanonicalPricingDisclosureCount,
} from './lib/wingsSideTourEditorialLocalization'
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

export const preflightWingsSideEditorialCatalogArtifact = async ({
  catalogPath,
  cwd = process.cwd(),
  expectedPricingDisclosureCount = wingsSideCanonicalPricingDisclosureCount,
  expectedSha256,
  protectedSha256,
}: {
  catalogPath?: string
  cwd?: string
  expectedPricingDisclosureCount?: number
  expectedSha256?: string
  protectedSha256?: string
}) => {
  const suppliedPath = String(catalogPath || '').trim()
  if (!suppliedPath) {
    throw new Error(
      'All tour editorial production phases require --catalog=<reviewed-catalog-v2-path>',
    )
  }
  const protectedExpected = String(protectedSha256 || '').trim()
  const cliExpected = String(expectedSha256 || '').trim()
  if (!/^[a-f0-9]{64}$/u.test(protectedExpected)) {
    throw new Error('Catalog v2 requires a protected lowercase SHA-256')
  }
  if (cliExpected && cliExpected !== protectedExpected) {
    throw new Error('CLI catalog SHA-256 conflicts with the protected release value')
  }
  const resolvedCatalogPath = path.resolve(cwd, suppliedPath)
  let bytes: Buffer
  try {
    bytes = await readFile(resolvedCatalogPath)
  } catch {
    throw new Error(`Catalog v2 artifact is missing or unreadable: ${resolvedCatalogPath}`)
  }
  const actualSha256 = createHash('sha256').update(bytes).digest('hex')
  if (actualSha256 !== protectedExpected) {
    throw new Error('Catalog v2 artifact SHA-256 does not match the trusted release value')
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(bytes.toString('utf8'))
  } catch {
    throw new Error('Catalog v2 artifact is not valid JSON')
  }
  const catalog = parseWingsSideTourEditorialCatalogV2(parsed, {
    expectedPricingDisclosureCount,
  })
  const freeze = (value: unknown): unknown => {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      Object.freeze(value)
      for (const child of Object.values(value)) freeze(child)
    }
    return value
  }
  freeze(catalog)
  return {
    catalog,
    catalogPath: resolvedCatalogPath,
    catalogSha256: actualSha256,
  }
}

export const assertWingsSideEditorialCatalogArtifactBinding = ({
  catalogSha256,
  protectedSha256,
}: {
  catalogSha256: string
  protectedSha256?: string
}) => {
  if (String(protectedSha256 || '').trim() !== catalogSha256) {
    throw new Error('Catalog v2 immutable hash no longer matches protected release configuration')
  }
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
  const catalogArtifact = await preflightWingsSideEditorialCatalogArtifact({
    catalogPath:
      argumentValue('--catalog') || process.env.WINGSSIDE_TOUR_EDITORIAL_CATALOG_V2_PATH,
    expectedSha256:
      argumentValue('--catalog-sha256'),
    protectedSha256: process.env.WINGSSIDE_TOUR_EDITORIAL_CATALOG_V2_SHA256,
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
    const catalog = catalogArtifact.catalog
    if (
      preparedPlan &&
      preparedPlan.plan.approvalSnapshotChecksum !== catalog.approvalManifest.checksum
    ) {
      throw new Error('Catalog v2 approval snapshot does not match the supplied production plan')
    }

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
        catalogSha256: catalogArtifact.catalogSha256,
        tours: plan.expectedTourCount,
      })
      return
    }

    const { plan, planPath, planSha256 } = preparedPlan!
    if (phase === 'verify') {
      assertWingsSideEditorialCatalogArtifactBinding({
        catalogSha256: catalogArtifact.catalogSha256,
        protectedSha256: process.env.WINGSSIDE_TOUR_EDITORIAL_CATALOG_V2_SHA256,
      })
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
    assertWingsSideEditorialCatalogArtifactBinding({
      catalogSha256: catalogArtifact.catalogSha256,
      protectedSha256: process.env.WINGSSIDE_TOUR_EDITORIAL_CATALOG_V2_SHA256,
    })
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

const isDirectExecution =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))

if (isDirectExecution) {
  void main().then(
    () => process.exit(0),
    (error) => {
      console.error(error instanceof Error ? error.message : error)
      process.exit(1)
    },
  )
}
