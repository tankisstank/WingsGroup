import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

import { assertWingsSideReleaseWriteGuard } from './wingsSideReleaseWriteGuard'

export type HomeCurationCLIArgs = {
  adminEmail?: string
  backupPath?: string
  backupSha256?: string
  environment?: string
  localConfirm: boolean
  production: boolean
  productionConfirm?: string
  releaseSha?: string
  rollbackRelease?: string
}

type HomeCurationMode = 'apply' | 'audit' | 'dry-run'
type ReleaseEnvironment = Partial<Record<string, string | undefined>>
type GateIO = Pick<typeof fs, 'existsSync' | 'readFileSync' | 'realpathSync' | 'statSync'>

type BackupManifest = {
  checksumSha256?: unknown
  database?: unknown
  encrypted?: unknown
  file?: unknown
  format?: unknown
  intendedReleaseSha?: unknown
  restoreListVerified?: unknown
  rollbackRelease?: unknown
  rollbackReleaseSha?: unknown
}

const productionBackupRoot = '/home/ubuntu/wings-travel/shared/backups'
const productionReleaseRoot = '/home/ubuntu/wings-travel/releases'

const argumentValue = (argv: string[], name: string) => {
  const inline = argv.find((argument) => argument.startsWith(`${name}=`))
  if (inline) return inline.slice(name.length + 1)
  const index = argv.indexOf(name)
  return index >= 0 ? argv[index + 1] : undefined
}

export const parseHomeCurationCLIArgs = (argv: string[]): HomeCurationCLIArgs => ({
  adminEmail: argumentValue(argv, '--admin-email'),
  backupPath: argumentValue(argv, '--backup'),
  backupSha256: argumentValue(argv, '--backup-sha256'),
  environment: argumentValue(argv, '--environment'),
  localConfirm: argv.includes('--confirm'),
  production: argv.includes('--production'),
  productionConfirm: argumentValue(argv, '--confirm-production'),
  releaseSha: argumentValue(argv, '--release-sha'),
  rollbackRelease: argumentValue(argv, '--rollback-release'),
})

export const homeCurationDatabaseName = (databaseURL: string | undefined) => {
  if (!databaseURL || databaseURL.startsWith('file:')) return 'sqlite'
  const parsed = new URL(databaseURL)
  if (['postgres:', 'postgresql:'].includes(parsed.protocol)) return 'postgres'
  throw new Error(`Write blocked: unsupported DATABASE_URL protocol ${parsed.protocol}`)
}

const readBackupManifest = (backupPath: string, io: GateIO): BackupManifest => {
  const manifestPath = `${backupPath}.json`
  if (!io.existsSync(manifestPath)) {
    throw new Error('Write blocked: trusted production backup manifest is missing')
  }
  try {
    return JSON.parse(io.readFileSync(manifestPath, 'utf8')) as BackupManifest
  } catch {
    throw new Error('Write blocked: trusted production backup manifest is invalid')
  }
}

const sha256File = (filePath: string, io: GateIO) =>
  createHash('sha256').update(io.readFileSync(filePath)).digest('hex')

const assertProductionEvidence = (
  args: HomeCurationCLIArgs,
  env: ReleaseEnvironment,
  io: GateIO,
) => {
  if (env.PAYLOAD_DB_PUSH !== 'false') {
    throw new Error('Write blocked: production curation requires PAYLOAD_DB_PUSH=false')
  }
  if (!args.adminEmail || args.adminEmail !== env.ADMIN_EMAIL) {
    throw new Error('Write blocked: --admin-email must match trusted ADMIN_EMAIL')
  }
  if (env.WINGSSIDE_RELEASE_BACKUP_SHA256 !== args.backupSha256) {
    throw new Error('Write blocked: backup checksum does not match trusted release environment')
  }
  if (!env.WINGSSIDE_RELEASE_BACKUP_MANIFEST_SHA256) {
    throw new Error('Write blocked: trusted production backup manifest checksum is missing')
  }
  if (!args.backupPath || !args.rollbackRelease || !args.releaseSha) {
    throw new Error('Write blocked: production release evidence is incomplete')
  }

  const trustedBackupPath = io.realpathSync(args.backupPath)
  const trustedBackupPrefix = `${productionBackupRoot}/`
  if (
    trustedBackupPath !== productionBackupRoot &&
    !trustedBackupPath.startsWith(trustedBackupPrefix)
  ) {
    throw new Error('Write blocked: backup is outside the trusted production backup directory')
  }

  const manifestPath = `${args.backupPath}.json`
  if (sha256File(manifestPath, io) !== env.WINGSSIDE_RELEASE_BACKUP_MANIFEST_SHA256) {
    throw new Error('Write blocked: production backup manifest checksum mismatch')
  }
  const manifest = readBackupManifest(args.backupPath, io)
  const expectedManifest = {
    checksumSha256: args.backupSha256,
    database: env.POSTGRES_DB,
    encrypted: true,
    file: path.basename(args.backupPath),
    format: 'postgres-custom',
    intendedReleaseSha: args.releaseSha,
    restoreListVerified: true,
    rollbackRelease: args.rollbackRelease,
  }
  for (const [field, expected] of Object.entries(expectedManifest)) {
    if (manifest[field as keyof BackupManifest] !== expected) {
      throw new Error(`Write blocked: production backup manifest ${field} mismatch`)
    }
  }

  if (
    args.rollbackRelease !== env.WINGSSIDE_ROLLBACK_RELEASE_PATH ||
    !env.WINGSSIDE_ROLLBACK_RELEASE_SHA
  ) {
    throw new Error('Write blocked: rollback release does not match trusted release environment')
  }
  if (!io.existsSync(args.rollbackRelease)) {
    throw new Error('Write blocked: rollback release directory is missing')
  }
  const trustedRollbackPath = io.realpathSync(args.rollbackRelease)
  if (
    !io.statSync(trustedRollbackPath).isDirectory() ||
    !trustedRollbackPath.startsWith(`${productionReleaseRoot}/`)
  ) {
    throw new Error('Write blocked: rollback release is outside the trusted production release root')
  }
  const rollbackShaPath = path.posix.join(trustedRollbackPath, 'RELEASE_SHA')
  if (!io.existsSync(rollbackShaPath)) {
    throw new Error('Write blocked: rollback release SHA evidence is missing')
  }
  const rollbackReleaseSha = io.readFileSync(rollbackShaPath, 'utf8').trim()
  if (!/^[0-9a-f]{40}$/.test(rollbackReleaseSha)) {
    throw new Error('Write blocked: rollback release SHA evidence is invalid')
  }
  if (
    rollbackReleaseSha === args.releaseSha ||
    rollbackReleaseSha !== env.WINGSSIDE_ROLLBACK_RELEASE_SHA ||
    manifest.rollbackReleaseSha !== rollbackReleaseSha
  ) {
    throw new Error('Write blocked: rollback release SHA does not match trusted backup manifest')
  }
}

export const assertHomeCurationWriteGate = ({
  args,
  databaseName,
  env = process.env,
  io = fs,
  mode,
}: {
  args: HomeCurationCLIArgs
  databaseName: string
  env?: ReleaseEnvironment
  io?: GateIO
  mode: HomeCurationMode
}) => {
  if (
    env.NODE_ENV === 'production' &&
    databaseName === 'postgres' &&
    env.PAYLOAD_DB_PUSH !== 'false'
  ) {
    throw new Error('Write blocked: production curation requires PAYLOAD_DB_PUSH=false')
  }
  if (mode !== 'apply') {
    return { environment: 'read-only' as const, productionMutation: false }
  }

  if (args.production) {
    if (databaseName !== 'postgres') {
      throw new Error('Write blocked: production Home curation requires Payload PostgreSQL')
    }
    assertWingsSideReleaseWriteGuard(
      {
        backupPath: args.backupPath,
        backupSha256: args.backupSha256,
        production: true,
        productionConfirm: args.productionConfirm,
        releaseSha: args.releaseSha,
        rollbackRelease: args.rollbackRelease,
      },
      env,
    )
    assertProductionEvidence(args, env, io)
    return { environment: 'production' as const, productionMutation: true }
  }

  if (!args.localConfirm || args.environment !== 'local') {
    throw new Error('Local apply requires --confirm and --environment=local.')
  }
  if (env.NODE_ENV === 'production' || databaseName !== 'sqlite') {
    throw new Error('Write blocked: local Home curation apply requires SQLite outside production.')
  }
  return { environment: 'local-sqlite' as const, productionMutation: false }
}
