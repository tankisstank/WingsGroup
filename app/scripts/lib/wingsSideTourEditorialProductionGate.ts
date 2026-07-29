import { createHash } from 'node:crypto'
import fs from 'node:fs'

export type TourEditorialProductionGateArgs = {
  backupPath?: string
  backupSha256?: string
  backupManifestSha256?: string
  restoreDrillEvidencePath?: string
}

type IO = Pick<typeof fs, 'existsSync' | 'readFileSync'>
type Env = Partial<Record<string, string | undefined>>

const sha256 = (value: Buffer | string) => createHash('sha256').update(value).digest('hex')

/**
 * Protects mutating editorial commands with independently-produced backup and
 * restore-drill evidence. Read-only plan/verify phases must not require it.
 */
export const assertTourEditorialProductionEvidence = ({
  args,
  databaseURL,
  env = process.env,
  io = fs,
  phase,
}: {
  args: TourEditorialProductionGateArgs
  databaseURL: string
  env?: Env
  io?: IO
  phase: 'apply' | 'plan' | 'rollback' | 'verify'
}) => {
  if (phase === 'plan' || phase === 'verify') return { environment: 'read-only' as const }

  // Disposable rehearsal databases are deliberately allowed to exercise the
  // same production code path without requiring a real production backup.
  if (!databaseURL) throw new Error('Tour editorial production write requires DATABASE_URL')
  const database = new URL(databaseURL)
  if (
    ['127.0.0.1', 'localhost', '::1'].includes(database.hostname) &&
    env.WINGSSIDE_TOUR_EDITORIAL_REHEARSAL_ALLOW === 'disposable-postgres'
  ) {
    return { environment: 'rehearsal' as const }
  }

  if (env.NODE_ENV !== 'production') {
    throw new Error('Tour editorial production write requires NODE_ENV=production')
  }
  if (env.PAYLOAD_DB_PUSH !== 'false') {
    throw new Error('Tour editorial production write requires PAYLOAD_DB_PUSH=false')
  }
  if (!['postgres:', 'postgresql:'].includes(database.protocol)) {
    throw new Error('Tour editorial production write requires PostgreSQL DATABASE_URL')
  }

  const backupPath = args.backupPath || env.WINGSSIDE_RELEASE_BACKUP_PATH
  const backupSha256 = args.backupSha256 || env.WINGSSIDE_RELEASE_BACKUP_SHA256
  const manifestSha256 =
    args.backupManifestSha256 || env.WINGSSIDE_RELEASE_BACKUP_MANIFEST_SHA256
  const restorePath =
    args.restoreDrillEvidencePath || env.WINGSSIDE_RELEASE_RESTORE_DRILL_EVIDENCE
  if (!backupPath || !backupPath.endsWith('.dump.age') || !io.existsSync(backupPath)) {
    throw new Error('Tour editorial production write requires an encrypted backup file')
  }
  if (!backupSha256 || !/^[0-9a-f]{64}$/.test(backupSha256)) {
    throw new Error('Tour editorial production write requires a lowercase backup SHA-256')
  }
  if (sha256(io.readFileSync(backupPath)) !== backupSha256) {
    throw new Error('Tour editorial production backup checksum mismatch')
  }

  const manifestPath = `${backupPath}.json`
  if (!io.existsSync(manifestPath)) {
    throw new Error('Tour editorial production write requires the backup manifest')
  }
  if (!manifestSha256 || !/^[0-9a-f]{64}$/.test(manifestSha256)) {
    throw new Error('Tour editorial production write requires the backup manifest SHA-256')
  }
  if (sha256(io.readFileSync(manifestPath)) !== manifestSha256) {
    throw new Error('Tour editorial production backup manifest checksum mismatch')
  }
  let manifest: Record<string, unknown>
  try {
    manifest = JSON.parse(io.readFileSync(manifestPath, 'utf8')) as Record<string, unknown>
  } catch {
    throw new Error('Tour editorial production backup manifest is invalid')
  }
  if (
    manifest.encrypted !== true ||
    manifest.checksumSha256 !== backupSha256 ||
    manifest.format !== 'postgres-custom'
  ) {
    throw new Error('Tour editorial production backup manifest is not a valid encrypted PostgreSQL backup')
  }

  if (!restorePath || !io.existsSync(restorePath)) {
    throw new Error('Tour editorial production write requires restore-drill evidence')
  }
  let restore: Record<string, unknown>
  try {
    restore = JSON.parse(io.readFileSync(restorePath, 'utf8')) as Record<string, unknown>
  } catch {
    throw new Error('Tour editorial production restore-drill evidence is invalid')
  }
  if (
    restore.status !== 'ok' ||
    restore.backupChecksumSha256 !== backupSha256 ||
    typeof restore.targetDatabase !== 'string' ||
    restore.targetDatabase === database.pathname.replace(/^\//, '')
  ) {
    throw new Error('Tour editorial production restore-drill evidence is not verified')
  }
  return { environment: 'production' as const }
}
