import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { DatabaseSync } from 'node:sqlite'

const appRoot = process.cwd()
const targetDatabaseURL = process.env.DATABASE_URL
const requiredSiteCodes = [
  'wings-group',
  'wings-go',
  'wing-side',
  'wings-plus',
  'wings-care',
  'wings-pass',
]
const requiredWingsSidePaths = ['/', '/destinations', '/styles', '/packages', '/plan-your-trip']

if (!targetDatabaseURL) {
  console.error(
    '[phase1-e2e-db] DATABASE_URL is required. Use pnpm test:e2e to provision PostgreSQL.',
  )
  process.exit(2)
}

const isPostgres = /^postgres(?:ql)?:\/\//.test(targetDatabaseURL)
const isSQLite = targetDatabaseURL.startsWith('file:')

if (!isPostgres && !isSQLite) {
  console.error('[phase1-e2e-db] DATABASE_URL must use postgresql://, postgres://, or file:.')
  process.exit(2)
}

const databaseName = isPostgres ? new URL(targetDatabaseURL).pathname.replace(/^\//, '') : ''
const hasSafeDatabaseName = /(?:^|[_-])(e2e|test|ci)(?:$|[_-])/i.test(databaseName)

if (isPostgres && !hasSafeDatabaseName && process.env.E2E_ALLOW_DATABASE_RESET !== 'true') {
  console.error(
    `[phase1-e2e-db] Refusing to seed PostgreSQL database "${databaseName}". Use a disposable database whose name contains e2e/test/ci.`,
  )
  process.exit(2)
}

const runPnpm = (pnpmArgs, extraEnv = {}) => {
  const pnpmCLI = process.env.npm_execpath
  const command = pnpmCLI ? process.execPath : process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
  const commandArgs = pnpmCLI ? [pnpmCLI, ...pnpmArgs] : pnpmArgs

  const result = spawnSync(command, commandArgs, {
    cwd: appRoot,
    env: {
      ...process.env,
      DATABASE_URL: targetDatabaseURL,
      PAYLOAD_DB_PUSH: 'false',
      ...extraEnv,
    },
    stdio: 'inherit',
  })

  if (result.error) {
    console.error(`[phase1-e2e-db] Failed to run pnpm ${pnpmArgs.join(' ')}:`, result.error)
  }

  return result.status ?? 1
}

const toSQLitePath = (databaseURL) => {
  const rawPath = databaseURL.replace(/^file:/, '')
  return path.isAbsolute(rawPath) ? rawPath : path.resolve(appRoot, rawPath)
}

const hasRequiredPhase1Sites = (sqlitePath) => {
  if (!fs.existsSync(sqlitePath)) return false

  const db = new DatabaseSync(sqlitePath, { open: true })

  try {
    const rows = db.prepare('select code from sites order by code').all()
    const codes = new Set(rows.map((row) => row.code).filter(Boolean))
    const wingsSideSite = db.prepare('select id from sites where code = ? limit 1').get('wing-side')
    const pathSet = new Set(
      wingsSideSite
        ? db
            .prepare('select pathname from pages where site_id = ?')
            .all(wingsSideSite.id)
            .map((row) => row.pathname)
            .filter(Boolean)
        : [],
    )

    return (
      requiredSiteCodes.every((code) => codes.has(code)) &&
      requiredWingsSidePaths.every((pathname) => pathSet.has(pathname))
    )
  } catch {
    return false
  } finally {
    db.close()
  }
}

const removeSQLiteFiles = (sqlitePath) => {
  for (const suffix of ['', '-shm', '-wal', '-journal']) {
    fs.rmSync(`${sqlitePath}${suffix}`, { force: true })
  }
}

if (isPostgres) {
  console.log(
    `[phase1-e2e-db] Applying committed migrations to disposable PostgreSQL database ${databaseName}`,
  )
  if (runPnpm(['exec', 'payload', 'migrate']) !== 0) process.exit(1)

  console.log('[phase1-e2e-db] Seeding deterministic phase-1 fixtures')
  if (runPnpm(['exec', 'tsx', 'scripts/seed-subsites.ts']) !== 0) process.exit(1)
} else {
  const sqlitePath = toSQLitePath(targetDatabaseURL)

  if (!hasRequiredPhase1Sites(sqlitePath) || process.env.FORCE_PHASE1_E2E_DB_RESEED === 'true') {
    removeSQLiteFiles(sqlitePath)
    fs.mkdirSync(path.dirname(sqlitePath), { recursive: true })
    console.log('[phase1-e2e-db] Seeding opt-in local SQLite bootstrap database')
    if (runPnpm(['exec', 'tsx', 'scripts/seed-subsites.ts'], { PAYLOAD_DB_PUSH: 'true' }) !== 0) {
      process.exit(1)
    }
  } else {
    console.log('[phase1-e2e-db] Reusing verified opt-in SQLite bootstrap database')
  }
}

if (runPnpm(['exec', 'tsx', 'scripts/seed-phase1-e2e-smoke.ts']) !== 0) process.exit(1)

console.log(
  `[phase1-e2e-db] PASS: ${isPostgres ? 'PostgreSQL' : 'SQLite bootstrap'} fixtures are ready`,
)
