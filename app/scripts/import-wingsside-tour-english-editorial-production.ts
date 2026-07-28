import 'dotenv/config'

import fs from 'node:fs'
import { pathToFileURL } from 'node:url'

import {
  transitionWingsSideTourEnglishEditorialRuntime,
  verifyWingsSideTourEnglishEditorialRuntime,
  loadFrozenWingsSideEnglishEditorialArtifacts,
  type WingsSideTourEnglishEditorialRuntimeAdapter,
} from './lib/wingsSideTourEnglishEditorialRuntime'
import {
  assertWingsSideEditorialProductionWriteGuard,
  type WingsSideEditorialProductionWriteGuardArgs,
} from './lib/wingsSideReleaseWriteGuard'

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
  if (cliValue && envValue && cliValue !== envValue) {
    throw new Error(`Protected English editorial CLI/environment conflict: ${name}`)
  }
  return cliValue || envValue
}

const phaseFrom = (argv: string[]): Phase => {
  const phase = argumentValue(argv, '--phase') || argv.find((value) => !value.startsWith('--'))
  if (!phase || !(['apply', 'rollback', 'verify'] as const).includes(phase as Phase)) {
    throw new Error('Choose one English editorial phase: apply, rollback, or verify')
  }
  return phase as Phase
}

const required = (value: string | undefined, label: string) => {
  if (!value) throw new Error(`English editorial production requires ${label}`)
  return value
}

export const preflightWingsSideEnglishEditorialProductionCLI = ({
  argv,
  env = process.env,
  io = fs,
  releaseGuard = assertWingsSideEditorialProductionWriteGuard,
}: {
  argv: string[]
  env?: ReleaseEnvironment
  io?: ArtifactIO
  releaseGuard?: (
    args: WingsSideEditorialProductionWriteGuardArgs,
    env: ReleaseEnvironment,
  ) => unknown
}) => {
  const phase = phaseFrom(argv)
  const siteCode = protectedValue({
    argv,
    envValue: env.WINGSSIDE_EN_EDITORIAL_SITE_CODE,
    name: '--site-code',
  })
  if (siteCode !== 'wing-side') {
    throw new Error('English editorial production requires protected site code wing-side')
  }
  const releaseSha = protectedValue({
    argv,
    envValue: env.WINGSTRAVEL_RELEASE_SHA,
    name: '--release-sha',
  })
  const configSha256 = protectedValue({
    argv,
    envValue: env.WINGSSIDE_EN_EDITORIAL_CONFIG_SHA256,
    name: '--config-sha256',
  })
  const manifestSha256 = protectedValue({
    argv,
    envValue: env.WINGSSIDE_EN_EDITORIAL_MANIFEST_SHA256,
    name: '--manifest-sha256',
  })
  const planSha256 = protectedValue({
    argv,
    envValue: env.WINGSSIDE_TOUR_EDITORIAL_PLAN_SHA256,
    name: '--plan-sha256',
  })
  const artifacts = loadFrozenWingsSideEnglishEditorialArtifacts({
    config: {
      path: required(argumentValue(argv, '--config'), '--config'),
      sha256: required(configSha256, '--config-sha256'),
    },
    io,
    manifest: {
      path: required(argumentValue(argv, '--manifest'), '--manifest'),
      sha256: required(manifestSha256, '--manifest-sha256'),
    },
    plan: {
      path: required(argumentValue(argv, '--plan'), '--plan'),
      sha256: required(planSha256, '--plan-sha256'),
    },
  })
  if (artifacts.plan.releaseSha !== releaseSha || artifacts.manifest.releaseSha !== releaseSha) {
    throw new Error('English editorial artifact release SHA does not match protected release')
  }

  if (phase === 'apply' || phase === 'rollback') {
    const expectedConfirmation =
      phase === 'apply' ? applyConfirmation : rollbackConfirmation
    if (argumentValue(argv, '--confirm') !== expectedConfirmation) {
      throw new Error(`${phase} requires --confirm=${expectedConfirmation}`)
    }
    const adminEmail = protectedValue({
      argv,
      envValue: env.IMPORT_ADMIN_EMAIL,
      name: '--admin-email',
    })
    releaseGuard(
      {
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
      },
      env,
    )
  }
  return { artifacts, phase }
}

export const runWingsSideEnglishEditorialProductionCLI = async <Transaction>({
  adapter,
  argv,
  env = process.env,
  io = fs,
  releaseGuard = assertWingsSideEditorialProductionWriteGuard,
}: {
  adapter: WingsSideTourEnglishEditorialRuntimeAdapter<Transaction>
  argv: string[]
  env?: ReleaseEnvironment
  io?: ArtifactIO
  releaseGuard?: (
    args: WingsSideEditorialProductionWriteGuardArgs,
    env: ReleaseEnvironment,
  ) => unknown
}) => {
  const { artifacts, phase } = preflightWingsSideEnglishEditorialProductionCLI({
    argv,
    env,
    io,
    releaseGuard,
  })
  if (phase === 'verify') {
    return verifyWingsSideTourEnglishEditorialRuntime({
      adapter,
      config: artifacts.config,
      expectedState: 'after',
      manifest: artifacts.manifest,
      plan: artifacts.plan,
    })
  }
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
