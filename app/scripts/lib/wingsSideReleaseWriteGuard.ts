import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

export type WingsSideReleaseWriteGuardArgs = {
  backupPath?: string
  backupSha256?: string
  production: boolean
  productionConfirm?: string
  releaseSha?: string
  rollbackRelease?: string
}

type ReleaseEnvironment = Partial<Record<string, string | undefined>>
type ReleaseGuardIO = Pick<typeof fs, 'existsSync' | 'readFileSync' | 'realpathSync' | 'statSync'>

export type WingsSideEditorialProductionWriteGuardArgs = WingsSideReleaseWriteGuardArgs & {
  adminEmail?: string
  planSha256?: string
  releaseSourceSha?: string
  restoreEvidencePath?: string
  restoreEvidenceSha256?: string
}

type EditorialBackupManifest = {
  checksumSha256?: unknown
  database?: unknown
  databaseHost?: unknown
  encrypted?: unknown
  file?: unknown
  format?: unknown
  intendedPlanSha256?: unknown
  intendedReleaseSha?: unknown
  restoreDrillVerified?: unknown
  restoreEvidenceSha256?: unknown
  restoreListVerified?: unknown
  rollbackRelease?: unknown
  rollbackReleaseSha?: unknown
}

const productionBackupRoot = '/home/ubuntu/wings-travel/shared/backups'
const productionReleaseRoot = '/home/ubuntu/wings-travel/releases'

const sha256File = (filePath: string) =>
  createHash('sha256').update(fs.readFileSync(filePath)).digest('hex')

const parsePostgresUrl = (rawUrl: string | undefined) => {
  if (!rawUrl) throw new Error('DATABASE_URL is required')
  const databaseUrl = new URL(rawUrl)
  if (!['postgres:', 'postgresql:'].includes(databaseUrl.protocol)) {
    throw new Error('Write blocked: release remediation requires PostgreSQL')
  }
  return databaseUrl
}

const assertLocalClone = (databaseUrl: URL, env: ReleaseEnvironment) => {
  if (!['127.0.0.1', 'localhost', '::1'].includes(databaseUrl.hostname)) {
    throw new Error(`Write blocked: database host ${databaseUrl.hostname} is not local`)
  }
  const databaseName = databaseUrl.pathname.replace(/^\//, '')
  if (!/(clone|rehearsal|wp4|test)/i.test(databaseName)) {
    throw new Error(
      `Write blocked: local database "${databaseName}" is not explicitly named as a clone/rehearsal`,
    )
  }
  if (env.NODE_ENV === 'production' || env.VERCEL || env.RAILWAY_ENVIRONMENT) {
    throw new Error('Write blocked: production environment marker detected')
  }
}

const assertProduction = (
  args: WingsSideReleaseWriteGuardArgs,
  databaseUrl: URL,
  env: ReleaseEnvironment,
) => {
  if (!args.production || args.productionConfirm !== 'wing-side') {
    throw new Error(
      'Write blocked: production requires --production --confirm-production=wing-side',
    )
  }
  if (env.NODE_ENV !== 'production') {
    throw new Error('Write blocked: production remediation requires NODE_ENV=production')
  }
  if (databaseUrl.hostname !== 'postgres') {
    throw new Error(
      `Write blocked: production database host must be postgres, got ${databaseUrl.hostname}`,
    )
  }
  if (!args.releaseSha || !/^[0-9a-f]{40}$/.test(args.releaseSha)) {
    throw new Error('Write blocked: --release-sha must be a full lowercase Git SHA')
  }
  if (env.WINGSSIDE_RELEASE_SHA !== args.releaseSha) {
    throw new Error('Write blocked: release SHA does not match WINGSSIDE_RELEASE_SHA')
  }
  if (
    !args.rollbackRelease ||
    !/^\/home\/ubuntu\/wings-travel\/releases\/[A-Za-z0-9._-]+$/.test(args.rollbackRelease)
  ) {
    throw new Error('Write blocked: invalid --rollback-release path')
  }
  if (
    !args.backupPath ||
    !args.backupPath.endsWith('.dump.age') ||
    !fs.existsSync(args.backupPath)
  ) {
    throw new Error('Write blocked: encrypted production backup is missing')
  }
  if (!args.backupSha256 || !/^[0-9a-f]{64}$/.test(args.backupSha256)) {
    throw new Error('Write blocked: --backup-sha256 must be a lowercase SHA-256')
  }
  if (sha256File(args.backupPath) !== args.backupSha256) {
    throw new Error('Write blocked: encrypted production backup checksum mismatch')
  }
}

export const assertWingsSideReleaseWriteGuard = (
  args: WingsSideReleaseWriteGuardArgs,
  env: ReleaseEnvironment = process.env,
) => {
  const allow = env.WINGSSIDE_RELEASE_REMEDIATION_ALLOW
  const databaseUrl = parsePostgresUrl(env.DATABASE_URL)

  if (allow === 'local-clone') {
    if (args.production) throw new Error('Write blocked: clone mode cannot use --production')
    assertLocalClone(databaseUrl, env)
    return
  }
  if (allow === 'production') {
    assertProduction(args, databaseUrl, env)
    return
  }
  throw new Error(
    'Write blocked: WINGSSIDE_RELEASE_REMEDIATION_ALLOW must be local-clone or production',
  )
}

const trustedSha256 = (value: string | undefined, label: string) => {
  if (!value || !/^[0-9a-f]{64}$/u.test(value)) {
    throw new Error(`Write blocked: ${label} must be a lowercase SHA-256`)
  }
  return value
}

const readEditorialBackupManifest = (
  manifestPath: string,
  io: ReleaseGuardIO,
): EditorialBackupManifest => {
  if (!io.existsSync(manifestPath)) {
    throw new Error('Write blocked: trusted production backup manifest is missing')
  }
  try {
    return JSON.parse(io.readFileSync(manifestPath, 'utf8')) as EditorialBackupManifest
  } catch {
    throw new Error('Write blocked: trusted production backup manifest is invalid')
  }
}

/**
 * Strict release-evidence extension for the tour editorial production writer.
 * It deliberately calls the common guard first, then binds the mutation to a
 * reviewed plan, operator, exact database, backup manifest, restore drill, and
 * pre-authorized rollback release.
 */
export const assertWingsSideEditorialProductionWriteGuard = (
  args: WingsSideEditorialProductionWriteGuardArgs,
  env: ReleaseEnvironment = process.env,
  io: ReleaseGuardIO = fs,
) => {
  assertWingsSideReleaseWriteGuard(args, env)

  if (env.WINGSSIDE_RELEASE_REMEDIATION_ALLOW !== 'production') {
    throw new Error('Write blocked: tour editorial production writer requires production mode')
  }
  if (env.PAYLOAD_DB_PUSH !== 'false') {
    throw new Error('Write blocked: tour editorial production requires PAYLOAD_DB_PUSH=false')
  }
  if (!args.adminEmail || args.adminEmail !== env.ADMIN_EMAIL) {
    throw new Error('Write blocked: --admin-email must match trusted ADMIN_EMAIL')
  }

  const planSha256 = trustedSha256(args.planSha256, '--plan-sha256')
  if (env.WINGSSIDE_TOUR_EDITORIAL_PLAN_SHA256 !== planSha256) {
    throw new Error('Write blocked: editorial plan checksum does not match trusted environment')
  }
  if (
    !args.releaseSha ||
    args.releaseSourceSha !== args.releaseSha ||
    env.WINGSTRAVEL_RELEASE_SHA !== args.releaseSha
  ) {
    throw new Error('Write blocked: editorial release source SHA is not bound to the release')
  }

  const databaseURL = parsePostgresUrl(env.DATABASE_URL)
  const databaseName = databaseURL.pathname.replace(/^\//u, '')
  if (
    !env.WINGSSIDE_RELEASE_DATABASE_HOST ||
    databaseURL.hostname !== env.WINGSSIDE_RELEASE_DATABASE_HOST ||
    !env.WINGSSIDE_RELEASE_DATABASE_NAME ||
    databaseName !== env.WINGSSIDE_RELEASE_DATABASE_NAME ||
    env.POSTGRES_DB !== databaseName
  ) {
    throw new Error('Write blocked: editorial database target is not on the trusted allowlist')
  }

  if (
    !args.backupPath ||
    !args.backupSha256 ||
    env.WINGSSIDE_RELEASE_BACKUP_SHA256 !== args.backupSha256
  ) {
    throw new Error('Write blocked: backup checksum does not match trusted release environment')
  }
  const trustedBackupPath = io.realpathSync(args.backupPath)
  if (!trustedBackupPath.startsWith(`${productionBackupRoot}/`)) {
    throw new Error('Write blocked: backup is outside the trusted production backup directory')
  }
  const manifestPath = `${args.backupPath}.json`
  const manifestSha256 = trustedSha256(
    env.WINGSSIDE_RELEASE_BACKUP_MANIFEST_SHA256,
    'trusted production backup manifest checksum',
  )
  if (!io.existsSync(manifestPath)) {
    throw new Error('Write blocked: trusted production backup manifest is missing')
  }
  if (sha256FileWithIO(manifestPath, io) !== manifestSha256) {
    throw new Error('Write blocked: production backup manifest checksum mismatch')
  }
  const manifest = readEditorialBackupManifest(manifestPath, io)

  const restoreEvidenceSha256 = trustedSha256(
    args.restoreEvidenceSha256,
    '--restore-evidence-sha256',
  )
  if (
    !args.restoreEvidencePath ||
    !io.existsSync(args.restoreEvidencePath) ||
    env.WINGSSIDE_RELEASE_RESTORE_EVIDENCE_SHA256 !== restoreEvidenceSha256 ||
    sha256FileWithIO(args.restoreEvidencePath, io) !== restoreEvidenceSha256
  ) {
    throw new Error('Write blocked: verified restore-drill evidence is missing or mismatched')
  }

  if (
    !args.rollbackRelease ||
    args.rollbackRelease !== env.WINGSSIDE_ROLLBACK_RELEASE_PATH ||
    !env.WINGSSIDE_ROLLBACK_RELEASE_SHA ||
    !io.existsSync(args.rollbackRelease)
  ) {
    throw new Error('Write blocked: rollback release does not match trusted release environment')
  }
  const trustedRollbackPath = io.realpathSync(args.rollbackRelease)
  if (
    !trustedRollbackPath.startsWith(`${productionReleaseRoot}/`) ||
    !io.statSync(trustedRollbackPath).isDirectory()
  ) {
    throw new Error('Write blocked: rollback release is outside the trusted production release root')
  }
  const rollbackShaPath = path.posix.join(trustedRollbackPath, 'RELEASE_SHA')
  if (!io.existsSync(rollbackShaPath)) {
    throw new Error('Write blocked: rollback release SHA evidence is missing')
  }
  const rollbackReleaseSha = String(io.readFileSync(rollbackShaPath, 'utf8')).trim()
  if (
    !/^[0-9a-f]{40}$/u.test(rollbackReleaseSha) ||
    rollbackReleaseSha === args.releaseSha ||
    rollbackReleaseSha !== env.WINGSSIDE_ROLLBACK_RELEASE_SHA
  ) {
    throw new Error('Write blocked: rollback release SHA is invalid or not pre-authorized')
  }

  const expectedManifest: EditorialBackupManifest = {
    checksumSha256: args.backupSha256,
    database: databaseName,
    databaseHost: databaseURL.hostname,
    encrypted: true,
    file: path.basename(args.backupPath),
    format: 'postgres-custom',
    intendedPlanSha256: planSha256,
    intendedReleaseSha: args.releaseSha,
    restoreDrillVerified: true,
    restoreEvidenceSha256,
    restoreListVerified: true,
    rollbackRelease: args.rollbackRelease,
    rollbackReleaseSha,
  }
  for (const [field, expected] of Object.entries(expectedManifest)) {
    if (manifest[field as keyof EditorialBackupManifest] !== expected) {
      throw new Error(`Write blocked: production backup manifest ${field} mismatch`)
    }
  }

  return {
    databaseHost: databaseURL.hostname,
    databaseName,
    operator: args.adminEmail,
    planSha256,
    releaseSha: args.releaseSha,
    rollbackReleaseSha,
  }
}

export const initializeWingsSideEditorialProductionWriter = async <T>({
  args,
  env = process.env,
  initialize,
  io = fs,
}: {
  args: WingsSideEditorialProductionWriteGuardArgs
  env?: ReleaseEnvironment
  initialize: () => Promise<T>
  io?: ReleaseGuardIO
}): Promise<T> => {
  assertWingsSideEditorialProductionWriteGuard(args, env, io)
  return initialize()
}

const sha256FileWithIO = (filePath: string, io: ReleaseGuardIO) =>
  createHash('sha256').update(io.readFileSync(filePath)).digest('hex')
