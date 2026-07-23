import { createHash } from 'node:crypto'
import fs from 'node:fs'

export type WingsSideReleaseWriteGuardArgs = {
  backupPath?: string
  backupSha256?: string
  production: boolean
  productionConfirm?: string
  releaseSha?: string
  rollbackRelease?: string
}

type ReleaseEnvironment = Partial<Record<string, string | undefined>>

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
