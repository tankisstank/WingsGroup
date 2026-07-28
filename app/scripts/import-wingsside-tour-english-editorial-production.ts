import 'dotenv/config'

import fs from 'node:fs'
import { pathToFileURL } from 'node:url'

import {
  transitionWingsSideTourEnglishEditorialRuntime,
  verifyWingsSideTourEnglishEditorialRuntime,
  loadFrozenWingsSideEnglishEditorialArtifacts,
  type WingsSideTourEnglishEditorialRuntimeAdapter,
} from './lib/wingsSideTourEnglishEditorialRuntime'
import { assertWingsSideEditorialProductionWriteGuard } from './lib/wingsSideReleaseWriteGuard'
import type { WingsSideEditorialProductionWriteGuardArgs } from './lib/wingsSideReleaseWriteGuard'

type Phase = 'apply' | 'rollback' | 'verify'
type ReleaseEnvironment = Partial<Record<string, string | undefined>>
type ArtifactIO = Pick<typeof fs, 'readFileSync'>

const applyConfirmation = 'CONFIRM_WINGSSIDE_ENGLISH_EDITORIAL_PRODUCTION_WRITE'
const rollbackConfirmation = 'CONFIRM_WINGSSIDE_ENGLISH_EDITORIAL_PRODUCTION_ROLLBACK'

const argumentValue = (argv: string[], name: string): string | undefined => {
  const inline = argv.find((argument) => argument.startsWith(`${name}=`))
  if (inline) return inline.slice(name.length + 1)
  const index = argv.indexOf(name)
  return index >= 0 ? argv[index + 1] : undefined
}

const protectedValue = ({
  argv,
  envValue,
  name,
}: {
  argv: string[]
  envValue: string | undefined
  name: string
}) => {
  const cliValue = argumentValue(argv, name)
  if (!envValue) {
    throw new Error(`Protected English editorial environment value is required: ${name}`)
  }
  if (cliValue && cliValue !== envValue) {
    throw new Error(`Protected English editorial CLI/environment conflict: ${name}`)
  }
  return envValue
}

const phaseFrom = (argv: string[]): Phase => {
  const phase = argumentValue(argv, '--phase') || argv.find((value) => !value.startsWith('--'))
  if (!phase || !(['apply', 'rollback', 'verify'] as const).includes(phase as Phase)) {
    throw new Error('Choose one English editorial phase: apply, rollback, or verify')
  }
  return phase as Phase
}

export const resolveWingsSideEnglishEditorialProtectedInputs = ({
  argv,
  env = process.env,
}: {
  argv: string[]
  env?: ReleaseEnvironment
}) => ({
  adminEmail: protectedValue({
    argv,
    envValue: env.ADMIN_EMAIL,
    name: '--admin-email',
  }),
  configPath: protectedValue({
    argv,
    envValue: env.WINGSSIDE_EN_EDITORIAL_CONFIG_PATH,
    name: '--config',
  }),
  configSha256: protectedValue({
    argv,
    envValue: env.WINGSSIDE_EN_EDITORIAL_CONFIG_SHA256,
    name: '--config-sha256',
  }),
  manifestPath: protectedValue({
    argv,
    envValue: env.WINGSSIDE_EN_EDITORIAL_MANIFEST_PATH,
    name: '--manifest',
  }),
  manifestSha256: protectedValue({
    argv,
    envValue: env.WINGSSIDE_EN_EDITORIAL_MANIFEST_SHA256,
    name: '--manifest-sha256',
  }),
  planPath: protectedValue({
    argv,
    envValue: env.WINGSSIDE_EN_EDITORIAL_PLAN_PATH,
    name: '--plan',
  }),
  planSha256: protectedValue({
    argv,
    envValue: env.WINGSSIDE_TOUR_EDITORIAL_PLAN_SHA256,
    name: '--plan-sha256',
  }),
  releaseSha: protectedValue({
    argv,
    envValue: env.WINGSTRAVEL_RELEASE_SHA,
    name: '--release-sha',
  }),
  siteCode: protectedValue({
    argv,
    envValue: env.WINGSSIDE_EN_EDITORIAL_SITE_CODE,
    name: '--site-code',
  }),
})

export const preflightWingsSideEnglishEditorialProductionCLI = ({
  argv,
  env = process.env,
  io = fs,
}: {
  argv: string[]
  env?: ReleaseEnvironment
  io?: ArtifactIO
}) => {
  const phase = phaseFrom(argv)
  const protectedInputs = resolveWingsSideEnglishEditorialProtectedInputs({ argv, env })
  const {
    adminEmail,
    configPath,
    configSha256,
    manifestPath,
    manifestSha256,
    planPath,
    planSha256,
    releaseSha,
    siteCode,
  } = protectedInputs
  if (siteCode !== 'wing-side') {
    throw new Error('English editorial production requires protected site code wing-side')
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
    if (argumentValue(argv, '--confirm') !== expectedConfirmation) {
      throw new Error(`${phase} requires --confirm=${expectedConfirmation}`)
    }
    mutationGuardArgs = {
      adminEmail,
      backupPath: argumentValue(argv, '--backup'),
      backupSha256: argumentValue(argv, '--backup-sha256'),
      planSha256: artifacts.planArtifactSha256,
      production: true,
      productionConfirm: argumentValue(argv, '--confirm-production'),
      releaseSha,
      releaseSourceSha: artifacts.plan.releaseSha,
      restoreEvidencePath: argumentValue(argv, '--restore-evidence'),
      restoreEvidenceSha256: argumentValue(argv, '--restore-evidence-sha256'),
      rollbackRelease: argumentValue(argv, '--rollback-release'),
    }
    assertWingsSideEditorialProductionWriteGuard(mutationGuardArgs, env)
  }
  return { artifacts, mutationGuardArgs, phase }
}

export const runWingsSideEnglishEditorialProductionCLI = async <Transaction>({
  adapterFactory,
  argv,
  env = process.env,
  io = fs,
}: {
  adapterFactory: (args: {
    artifacts: ReturnType<typeof loadFrozenWingsSideEnglishEditorialArtifacts>
    phase: Phase
  }) =>
    | Promise<WingsSideTourEnglishEditorialRuntimeAdapter<Transaction>>
    | WingsSideTourEnglishEditorialRuntimeAdapter<Transaction>
  argv: string[]
  env?: ReleaseEnvironment
  io?: ArtifactIO
}) => {
  const { artifacts, mutationGuardArgs, phase } =
    preflightWingsSideEnglishEditorialProductionCLI({
    argv,
    env,
    io,
  })
  const adapter = await adapterFactory({ artifacts, phase })
  if (phase === 'verify') {
    return verifyWingsSideTourEnglishEditorialRuntime({
      adapter,
      config: artifacts.config,
      expectedState: 'after',
      manifest: artifacts.manifest,
      plan: artifacts.plan,
    })
  }
  assertWingsSideEditorialProductionWriteGuard(mutationGuardArgs!, env)
  return transitionWingsSideTourEnglishEditorialRuntime({
    adapter,
    config: artifacts.config,
    direction: phase,
    manifest: artifacts.manifest,
    plan: artifacts.plan,
  })
}

const invokedDirectly =
  Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]!).href

if (invokedDirectly) {
  console.error(
    'English editorial production requires an application-owned transactional adapter; no write was attempted.',
  )
  process.exitCode = 1
}
