import { createHash } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const backupFile = process.env.BACKUP_FILE ? path.resolve(process.env.BACKUP_FILE) : null
const restoreDatabaseName = process.env.RESTORE_DATABASE_NAME
const restoreURL = process.env.RESTORE_DATABASE_URL || (
  restoreDatabaseName && process.env.DATABASE_URL
    ? (() => {
        const value = new URL(process.env.DATABASE_URL)
        value.pathname = `/${restoreDatabaseName}`
        return value.toString()
      })()
    : undefined
)
const ageIdentity = process.env.BACKUP_AGE_IDENTITY
const assertionProfile = process.env.RESTORE_ASSERTION_PROFILE || ''

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
const backupChecksumSha256 = await checksum(backupFile)

try {
  const manifestPath = `${backupFile}.json`
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
    if (manifest.checksumSha256 !== backupChecksumSha256) throw new Error('Backup checksum mismatch.')
  }

  if (backupFile.endsWith('.age')) {
    if (!ageIdentity) throw new Error('Encrypted backup requires BACKUP_AGE_IDENTITY.')
    run('age', ['--decrypt', '--identity', ageIdentity, '--output', temporaryDump, backupFile])
    dumpPath = temporaryDump
  }

  const restoreList = run('pg_restore', ['--list', dumpPath], { capture: true })
  if (!restoreList.includes('TABLE')) throw new Error('Backup restore list does not contain table entries.')

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

  let profileEvidence = null
  if (assertionProfile === 'wingsside-us057') {
    const wingSideSites = Number(
      run('psql', ['--tuples-only', '--no-align', '--command', "select count(*) from sites where code = 'wing-side';"], { capture: true }),
    )
    const wingSideTours = Number(
      run('psql', [
        '--tuples-only',
        '--no-align',
        '--command',
        "select count(*) from tour_products where site_id = (select id from sites where code = 'wing-side') and id between 62 and 83;",
      ], { capture: true }),
    )
    const us057Migrations = Number(
      run('psql', [
        '--tuples-only',
        '--no-align',
        '--command',
        "select count(*) from payload_migrations where name in ('20260731_090000_tour_commerce_freshness_identity','20260731_100000_tour_departure_source_provenance');",
      ], { capture: true }),
    )
    const governedColumns = Number(
      run('psql', [
        '--tuples-only',
        '--no-align',
        '--command',
        "select count(*) from information_schema.columns where table_schema='public' and table_name='tour_departures' and column_name in ('verified_at','expires_at','inventory_identity','source_provenance_source_system','source_provenance_source_url','source_provenance_source_page_sha256','source_provenance_source_row_sha256','source_provenance_checked_at','source_provenance_managed_by');",
      ], { capture: true }),
    )
    const inventoryIdentityIndexes = Number(
      run('psql', [
        '--tuples-only',
        '--no-align',
        '--command',
        "select count(*) from pg_indexes where schemaname='public' and tablename='tour_departures' and indexname='tour_departures_inventory_identity_unique';",
      ], { capture: true }),
    )
    if (
      wingSideSites !== 1 ||
      wingSideTours !== 22 ||
      us057Migrations !== 2 ||
      governedColumns !== 9 ||
      inventoryIdentityIndexes !== 1
    ) {
      throw new Error(
        `US057 restore assertions failed: wingSideSites=${wingSideSites}, wingSideTours=${wingSideTours}, migrations=${us057Migrations}, governedColumns=${governedColumns}, inventoryIdentityIndexes=${inventoryIdentityIndexes}.`,
      )
    }
    profileEvidence = {
      governedColumns,
      inventoryIdentityIndexes,
      us057Migrations,
      wingSideSites,
      wingSideTours,
    }
  } else if (assertionProfile) {
    throw new Error(`Unknown RESTORE_ASSERTION_PROFILE: ${assertionProfile}`)
  }

  console.log(JSON.stringify({
    activeSites,
    backupChecksumSha256,
    durationSeconds: Math.round((Date.now() - startedAt) / 1000),
    homepages,
    assertionProfile: assertionProfile || null,
    profileEvidence,
    restoreListVerified: true,
    verifiedAt: new Date().toISOString(),
    status: 'ok',
    targetDatabase: databaseName,
  }))
} finally {
  fs.rmSync(temporaryDump, { force: true })
}
