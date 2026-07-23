import { createHash } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const backupFile = process.env.BACKUP_FILE ? path.resolve(process.env.BACKUP_FILE) : null
const restoreURL = process.env.RESTORE_DATABASE_URL
const ageIdentity = process.env.BACKUP_AGE_IDENTITY

if (!backupFile || !fs.existsSync(backupFile)) throw new Error('BACKUP_FILE must exist.')
if (!restoreURL || !/^postgres(?:ql)?:\/\//i.test(restoreURL)) {
  throw new Error('RESTORE_DATABASE_URL must be a PostgreSQL URL.')
}
if (process.env.DATABASE_URL && restoreURL === process.env.DATABASE_URL) {
  throw new Error('Restore drill target must not equal DATABASE_URL.')
}

const database = new URL(restoreURL)
const databaseName = database.pathname.replace(/^\//, '')
if (!/(restore|drill|test|e2e)/i.test(databaseName)) {
  throw new Error('Restore target database name must contain restore, drill, test, or e2e.')
}
const loopback = ['127.0.0.1', '::1', 'localhost'].includes(database.hostname)
if (!loopback && process.env.ALLOW_REMOTE_RESTORE_DRILL !== 'true') {
  throw new Error('Remote restore drill requires ALLOW_REMOTE_RESTORE_DRILL=true.')
}

const pgEnv = {
  ...process.env,
  PGDATABASE: databaseName,
  PGHOST: database.hostname,
  PGPASSWORD: decodeURIComponent(database.password),
  PGPORT: database.port || '5432',
  PGUSER: decodeURIComponent(database.username),
}
const run = (command, args, { capture = false } = {}) => {
  const result = spawnSync(command, args, {
    encoding: capture ? 'utf8' : undefined,
    env: pgEnv,
    stdio: capture ? 'pipe' : 'inherit',
  })
  if (result.error || result.status !== 0) {
    throw new Error(`${command} failed with exit code ${result.status ?? 'unknown'}.`)
  }
  return capture ? result.stdout.trim() : ''
}
const checksum = (filePath) =>
  new Promise((resolve, reject) => {
    const hash = createHash('sha256')
    const stream = fs.createReadStream(filePath)
    stream.on('data', (chunk) => hash.update(chunk))
    stream.on('error', reject)
    stream.on('end', () => resolve(hash.digest('hex')))
  })

const startedAt = Date.now()
const temporaryDump = path.join(os.tmpdir(), `wingstravel-restore-${process.pid}-${Date.now()}.dump`)
let dumpPath = backupFile

try {
  const manifestPath = `${backupFile}.json`
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
    if (manifest.checksumSha256 !== await checksum(backupFile)) throw new Error('Backup checksum mismatch.')
  }

  if (backupFile.endsWith('.age')) {
    if (!ageIdentity) throw new Error('Encrypted backup requires BACKUP_AGE_IDENTITY.')
    run('age', ['--decrypt', '--identity', ageIdentity, '--output', temporaryDump, backupFile])
    dumpPath = temporaryDump
  }

  run('pg_restore', [
    '--clean',
    '--if-exists',
    '--exit-on-error',
    '--no-owner',
    '--no-acl',
    '--dbname',
    databaseName,
    dumpPath,
  ])

  const activeSites = Number(
    run('psql', ['--tuples-only', '--no-align', '--command', 'select count(*) from sites where is_active = true;'], { capture: true }),
  )
  const homepages = Number(
    run('psql', ['--tuples-only', '--no-align', '--command', "select count(distinct site_id) from pages where pathname = '/' and _status = 'published';"], { capture: true }),
  )
  if (activeSites < 6 || homepages < 6) {
    throw new Error(`Restore validation failed: activeSites=${activeSites}, homepages=${homepages}.`)
  }

  console.log(JSON.stringify({
    activeSites,
    durationSeconds: Math.round((Date.now() - startedAt) / 1000),
    homepages,
    status: 'ok',
    targetDatabase: databaseName,
  }))
} finally {
  fs.rmSync(temporaryDump, { force: true })
}
