import 'dotenv/config'

import fs from 'node:fs'
import { pathToFileURL } from 'node:url'

import {
  executeWingsSideEnglishEditorialGuardedRuntime,
  issueWingsSideEnglishEditorialGuardedCapabilityFromProtectedEnvironment,
  loadFrozenWingsSideEnglishEditorialArtifacts,
  type WingsSideEnglishEditorialGuardedCapability,
  type WingsSideEnglishEditorialExpectedRuntimeTarget,
  type WingsSideTourEnglishEditorialRuntimeAdapter,
} from './lib/wingsSideTourEnglishEditorialRuntime'
import { assertWingsSideEditorialProductionWriteGuard } from './lib/wingsSideReleaseWriteGuard'
import type { WingsSideEditorialProductionWriteGuardArgs } from './lib/wingsSideReleaseWriteGuard'
import { executeWingsSideTourEnglishEditorialWithPayloadAdapter } from './lib/wingsSideTourEnglishEditorialPayloadAdapter'

type Phase = 'apply' | 'rollback' | 'verify'
type ReleaseEnvironment = Partial<Record<string, string | undefined>>
type ArtifactIO = Pick<typeof fs, 'readFileSync'>

const applyConfirmation = 'CONFIRM_WINGSSIDE_ENGLISH_EDITORIAL_PRODUCTION_WRITE'
const rollbackConfirmation = 'CONFIRM_WINGSSIDE_ENGLISH_EDITORIAL_PRODUCTION_ROLLBACK'

const allowedFlags = new Set([
  '--admin-email',
  '--backup',
  '--backup-sha256',
  '--config',
  '--config-sha256',
  '--confirm',
  '--confirm-production',
  '--current-database',
  '--database-identity-sha256',
  '--environment-kind',
  '--manifest',
  '--manifest-sha256',
  '--phase',
  '--plan',
  '--plan-sha256',
  '--release-sha',
  '--restore-evidence',
  '--restore-evidence-sha256',
  '--rollback-release',
  '--site-code',
  '--source-kind',
  '--source-sha256',
  '--target-key-id',
  '--target-public-key-spki-base64',
])

export const parseWingsSideEnglishEditorialProductionArguments = (argv: string[]) => {
  const values = new Map<string, string>()
  const phases: Phase[] = []
  for (const argument of argv) {
    if (!argument.startsWith('--')) {
      if (!(['apply', 'rollback', 'verify'] as const).includes(argument as Phase)) {
        throw new Error(`Unknown English editorial CLI argument: ${argument}`)
      }
      phases.push(argument as Phase)
      continue
    }
    const separator = argument.indexOf('=')
    const name = separator === -1 ? argument : argument.slice(0, separator)
    if (!allowedFlags.has(name) || separator === -1) {
      throw new Error(`Unknown or malformed English editorial CLI flag: ${argument}`)
    }
    if (values.has(name)) throw new Error(`Duplicate English editorial CLI flag: ${name}`)
    const value = argument.slice(separator + 1).trim()
    if (!value) throw new Error(`English editorial CLI flag ${name} requires a value`)
    values.set(name, value)
  }
  const inlinePhase = values.get('--phase')
  if (inlinePhase) {
    if (!(['apply', 'rollback', 'verify'] as const).includes(inlinePhase as Phase)) {
      throw new Error('Choose one English editorial phase: apply, rollback, or verify')
    }
    phases.push(inlinePhase as Phase)
  }
  if (phases.length !== 1) {
    throw new Error('Choose exactly one English editorial phase: apply, rollback, or verify')
  }
  return { phase: phases[0]!, values }
}

const protectedValue = ({
  values,
  envValue,
  name,
}: {
  values: ReadonlyMap<string, string>
  envValue: string | undefined
  name: string
}) => {
  const cliValue = values.get(name)
  if (!envValue) {
    throw new Error(`Protected English editorial environment value is required: ${name}`)
  }
  if (cliValue && cliValue !== envValue) {
    throw new Error(`Protected English editorial CLI/environment conflict: ${name}`)
  }
  return envValue
}

export const resolveWingsSideEnglishEditorialProtectedInputs = ({
  argv,
  env = process.env,
}: {
  argv: string[]
  env?: ReleaseEnvironment
}) => {
  const { values } = parseWingsSideEnglishEditorialProductionArguments(argv)
  return {
  adminEmail: protectedValue({
    values,
    envValue: env.ADMIN_EMAIL,
    name: '--admin-email',
  }),
  configPath: protectedValue({
    values,
    envValue: env.WINGSSIDE_EN_EDITORIAL_CONFIG_PATH,
    name: '--config',
  }),
  configSha256: protectedValue({
    values,
    envValue: env.WINGSSIDE_EN_EDITORIAL_CONFIG_SHA256,
    name: '--config-sha256',
  }),
  currentDatabase: protectedValue({
    values,
    envValue: env.WINGSSIDE_EN_EDITORIAL_CURRENT_DATABASE,
    name: '--current-database',
  }),
  databaseIdentitySha256: protectedValue({
    values,
    envValue: env.WINGSSIDE_EN_EDITORIAL_DATABASE_IDENTITY_SHA256,
    name: '--database-identity-sha256',
  }),
  environmentKind: protectedValue({
    values,
    envValue: env.WINGSSIDE_EN_EDITORIAL_ENVIRONMENT_KIND,
    name: '--environment-kind',
  }),
  manifestPath: protectedValue({
    values,
    envValue: env.WINGSSIDE_EN_EDITORIAL_MANIFEST_PATH,
    name: '--manifest',
  }),
  manifestSha256: protectedValue({
    values,
    envValue: env.WINGSSIDE_EN_EDITORIAL_MANIFEST_SHA256,
    name: '--manifest-sha256',
  }),
  planPath: protectedValue({
    values,
    envValue: env.WINGSSIDE_EN_EDITORIAL_PLAN_PATH,
    name: '--plan',
  }),
  planSha256: protectedValue({
    values,
    envValue: env.WINGSSIDE_TOUR_EDITORIAL_PLAN_SHA256,
    name: '--plan-sha256',
  }),
  releaseSha: protectedValue({
    values,
    envValue: env.WINGSTRAVEL_RELEASE_SHA,
    name: '--release-sha',
  }),
  siteCode: protectedValue({
    values,
    envValue: env.WINGSSIDE_EN_EDITORIAL_SITE_CODE,
    name: '--site-code',
  }),
  sourceKind: protectedValue({
    values,
    envValue: env.WINGSSIDE_EN_EDITORIAL_SOURCE_KIND,
    name: '--source-kind',
  }),
  sourceSha256: protectedValue({
    values,
    envValue: env.WINGSSIDE_EN_EDITORIAL_SOURCE_SHA256,
    name: '--source-sha256',
  }),
  targetKeyID: protectedValue({
    values,
    envValue: env.WINGSSIDE_EN_EDITORIAL_TARGET_KEY_ID,
    name: '--target-key-id',
  }),
  targetPublicKeySpkiBase64: protectedValue({
    values,
    envValue: env.WINGSSIDE_EN_EDITORIAL_TARGET_PUBLIC_KEY_SPKI_BASE64,
    name: '--target-public-key-spki-base64',
  }),
  }
}

export const preflightWingsSideEnglishEditorialProductionCLI = ({
  argv,
  env = process.env,
  io = fs,
}: {
  argv: string[]
  env?: ReleaseEnvironment
  io?: ArtifactIO
}) => {
  const parsedArguments = parseWingsSideEnglishEditorialProductionArguments(argv)
  const phase = parsedArguments.phase
  const { values } = parsedArguments
  const protectedInputs = resolveWingsSideEnglishEditorialProtectedInputs({ argv, env })
  const {
    adminEmail,
    configPath,
    configSha256,
    currentDatabase,
    databaseIdentitySha256,
    environmentKind,
    manifestPath,
    manifestSha256,
    planPath,
    planSha256,
    releaseSha,
    siteCode,
    sourceKind,
    sourceSha256,
    targetKeyID: _targetKeyID,
    targetPublicKeySpkiBase64: _targetPublicKeySpkiBase64,
  } = protectedInputs
  if (siteCode !== 'wing-side') {
    throw new Error('English editorial production requires protected site code wing-side')
  }
  if (
    !/^[A-Za-z0-9_-]+$/u.test(currentDatabase) ||
    !/^[a-f0-9]{64}$/u.test(databaseIdentitySha256) ||
    environmentKind !== 'production' ||
    !['database-snapshot', 'source-inventory'].includes(sourceKind) ||
    !/^[a-f0-9]{64}$/u.test(sourceSha256)
  ) {
    throw new Error('English editorial protected runtime target identity is invalid')
  }
  const artifacts = loadFrozenWingsSideEnglishEditorialArtifacts({
    config: {
      path: configPath,
      sha256: configSha256,
    },
    io,
    manifest: {
      path: manifestPath,
      sha256: manifestSha256,
    },
    plan: {
      path: planPath,
      sha256: planSha256,
    },
  })
  if (artifacts.plan.releaseSha !== releaseSha || artifacts.manifest.releaseSha !== releaseSha) {
    throw new Error('English editorial artifact release SHA does not match protected release')
  }

  let mutationGuardArgs: null | WingsSideEditorialProductionWriteGuardArgs = null
  if (phase === 'apply' || phase === 'rollback') {
    const expectedConfirmation =
      phase === 'apply' ? applyConfirmation : rollbackConfirmation
    if (values.get('--confirm') !== expectedConfirmation) {
      throw new Error(`${phase} requires --confirm=${expectedConfirmation}`)
    }
    mutationGuardArgs = {
      adminEmail,
      backupPath: values.get('--backup'),
      backupSha256: values.get('--backup-sha256'),
      planSha256: artifacts.planArtifactSha256,
      production: true,
      productionConfirm: values.get('--confirm-production'),
      releaseSha,
      releaseSourceSha: artifacts.plan.releaseSha,
      restoreEvidencePath: values.get('--restore-evidence'),
      restoreEvidenceSha256: values.get('--restore-evidence-sha256'),
      rollbackRelease: values.get('--rollback-release'),
    }
    assertWingsSideEditorialProductionWriteGuard(mutationGuardArgs, env)
  }
  const expectedTarget: WingsSideEnglishEditorialExpectedRuntimeTarget = Object.freeze({
    currentDatabase,
    databaseIdentitySha256,
    environmentKind,
    releaseSha,
    siteCode,
    sourceKind: sourceKind as WingsSideEnglishEditorialExpectedRuntimeTarget['sourceKind'],
    sourceSha256,
  })
  return { artifacts, expectedTarget, mutationGuardArgs, phase }
}

export const runWingsSideEnglishEditorialProductionCLI = async <Transaction>({
  adapterFactory,
  argv,
  env = process.env,
  guardedExecutor,
  io = fs,
}: {
  adapterFactory?: (args: {
    artifacts: ReturnType<typeof loadFrozenWingsSideEnglishEditorialArtifacts>
    phase: Phase
  }) =>
    | Promise<WingsSideTourEnglishEditorialRuntimeAdapter<Transaction>>
    | WingsSideTourEnglishEditorialRuntimeAdapter<Transaction>
  argv: string[]
  env?: ReleaseEnvironment
  guardedExecutor?: (args: {
    artifacts: ReturnType<typeof loadFrozenWingsSideEnglishEditorialArtifacts>
    capability: WingsSideEnglishEditorialGuardedCapability
    phase: Phase
  }) => Promise<unknown>
  io?: ArtifactIO
}) => {
  if (env !== process.env) {
    throw new Error('English editorial production verifier environment is non-injectable')
  }
  if (Boolean(adapterFactory) === Boolean(guardedExecutor)) {
    throw new Error('English editorial production requires exactly one guarded runtime provider')
  }
  const { artifacts, expectedTarget, mutationGuardArgs, phase } =
    preflightWingsSideEnglishEditorialProductionCLI({
    argv,
    env,
    io,
  })
  const capability = issueWingsSideEnglishEditorialGuardedCapabilityFromProtectedEnvironment({
    artifacts,
    expected: expectedTarget,
    mutationGuardArgs,
    phase,
  })
  if (guardedExecutor) {
    return guardedExecutor({ artifacts, capability, phase })
  }
  const adapter = await adapterFactory!({ artifacts, phase })
  if (!adapter) throw new Error('English editorial adapter factory must return an adapter')
  if (phase !== 'verify') assertWingsSideEditorialProductionWriteGuard(mutationGuardArgs!, env)
  return executeWingsSideEnglishEditorialGuardedRuntime({
    adapter,
    capability,
    phase,
  })
}

const invokedDirectly =
  Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]!).href

if (invokedDirectly) {
  void runWingsSideEnglishEditorialProductionCLI({
    argv: process.argv.slice(2),
    guardedExecutor: ({ capability, phase }) =>
      executeWingsSideTourEnglishEditorialWithPayloadAdapter({ capability, phase }),
  }).then(
    (result) => console.log(JSON.stringify(result)),
    (error) => {
      console.error(error instanceof Error ? error.message : error)
      process.exitCode = 1
    },
  )
}
