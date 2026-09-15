import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const appRoot = process.cwd()
const args = process.argv.slice(2)
const databaseEngine = (process.env.E2E_DATABASE_ENGINE || 'postgres').toLowerCase()
// The explicit SQLite mode must always own its disposable file. Never let an
// inherited DATABASE_URL redirect `test:e2e:sqlite` to a real database.
const explicitDatabaseURL = databaseEngine === 'sqlite' ? undefined : process.env.DATABASE_URL
const generatedDatabaseDir = path.join(os.tmpdir(), 'wingstravel-e2e')
const runID = `${Date.now()}-${process.pid}`
const postgresImage = process.env.E2E_POSTGRES_IMAGE || 'postgres:16-alpine'
const postgresContainer = `wingstravel-e2e-${runID}`

const run = (command, commandArgs, options = {}) => {
  const result = spawnSync(command, commandArgs, {
    cwd: appRoot,
    encoding: options.encoding,
    env: options.env || process.env,
    stdio: options.stdio || (options.encoding ? 'pipe' : 'inherit'),
  })

  if (result.error && options.reportError !== false) {
    console.error(`[phase1-e2e] Failed to run ${command} ${commandArgs.join(' ')}:`, result.error)
  }

  return result
}

const runPnpm = (pnpmArgs, env) => {
  const pnpmCLI = process.env.npm_execpath
  const command = pnpmCLI ? process.execPath : process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
  const commandArgs = pnpmCLI ? [pnpmCLI, ...pnpmArgs] : pnpmArgs

  return run(command, commandArgs, { env })
}

const dockerAvailable = () =>
  run('docker', ['version', '--format', '{{.Server.Version}}'], {
    encoding: 'utf8',
    reportError: false,
  }).status === 0

const removeContainer = () => {
  run('docker', ['rm', '--force', postgresContainer], {
    encoding: 'utf8',
    reportError: false,
  })
}

const waitForPostgres = () => {
  const deadline = Date.now() + 60_000

  while (Date.now() < deadline) {
    const ready = run(
      'docker',
      ['exec', postgresContainer, 'pg_isready', '-U', 'e2e', '-d', 'wingstravel_e2e'],
      { encoding: 'utf8', reportError: false },
    )

    if (ready.status === 0) return true

    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1_000)
  }

  return false
}

const startPostgres = () => {
  if (!dockerAvailable()) {
    throw new Error(
      'Docker is required for the default PostgreSQL E2E run. Supply a disposable DATABASE_URL or use pnpm test:e2e:sqlite for local bootstrap only.',
    )
  }

  console.log(`[phase1-e2e] Starting isolated ${postgresImage} container ${postgresContainer}`)
  const started = run('docker', [
    'run',
    '--detach',
    '--name',
    postgresContainer,
    '--env',
    'POSTGRES_USER=e2e',
    '--env',
    'POSTGRES_PASSWORD=e2e',
    '--env',
    'POSTGRES_DB=wingstravel_e2e',
    '--publish',
    '127.0.0.1::5432',
    postgresImage,
  ], { encoding: 'utf8' })

  if (started.status !== 0) {
    throw new Error(`Could not start PostgreSQL E2E container: ${started.stderr?.trim() || 'unknown error'}`)
  }

  if (!waitForPostgres()) {
    throw new Error('PostgreSQL E2E container did not become ready within 60 seconds.')
  }

  const portResult = run('docker', ['port', postgresContainer, '5432/tcp'], {
    encoding: 'utf8',
  })
  const port = portResult.stdout?.trim().match(/:(\d+)$/)?.[1]

  if (!port) {
    throw new Error(`Could not determine mapped PostgreSQL port: ${portResult.stdout || portResult.stderr}`)
  }

  return `postgresql://e2e:e2e@127.0.0.1:${port}/wingstravel_e2e`
}

const createSQLiteURL = () => {
  fs.mkdirSync(generatedDatabaseDir, { recursive: true })
  const databasePath = path.join(generatedDatabaseDir, `payload-phase1-test-${runID}.db`)

  return `file:${databasePath.replaceAll(path.sep, '/')}`
}

const sqlitePathFromURL = (databaseURL) => {
  if (!databaseURL.startsWith('file:')) return null

  const rawPath = databaseURL.replace(/^file:/, '')
  return path.isAbsolute(rawPath) ? rawPath : path.resolve(appRoot, rawPath)
}

let managedPostgres = false
let databaseURL
let exitCode = 1

try {
  if (explicitDatabaseURL) {
    databaseURL = explicitDatabaseURL
  } else if (databaseEngine === 'postgres') {
    managedPostgres = true
    databaseURL = startPostgres()
  } else if (databaseEngine === 'sqlite') {
    databaseURL = createSQLiteURL()
  } else {
    throw new Error(`Unsupported E2E_DATABASE_ENGINE "${databaseEngine}". Use "postgres" or "sqlite".`)
  }

  const sharedEnv = {
    ...process.env,
    DATABASE_URL: databaseURL,
    E2E_ALLOW_DATABASE_RESET: managedPostgres ? 'true' : process.env.E2E_ALLOW_DATABASE_RESET,
    NODE_OPTIONS: '--no-deprecation --import=tsx/esm',
    PAYLOAD_DB_PUSH: 'false',
    PAYLOAD_SECRET: 'test-only-secret-not-for-production',
  }

  const prepareResult = runPnpm(['run', 'test:e2e:prepare-db'], sharedEnv)

  if (prepareResult.status !== 0) {
    exitCode = prepareResult.status || 1
  } else {
    const testResult = runPnpm(
      ['exec', 'playwright', 'test', '--config=playwright.config.ts', ...args],
      {
        ...sharedEnv,
        PLAYWRIGHT_SKIP_PHASE1_SEED: 'true',
      },
    )
    exitCode = testResult.status || 0
  }
} catch (error) {
  console.error(`[phase1-e2e] ${error instanceof Error ? error.message : error}`)
  exitCode = 2
} finally {
  if (managedPostgres) removeContainer()

  const sqlitePath = databaseURL ? sqlitePathFromURL(databaseURL) : null
  if (sqlitePath && path.resolve(sqlitePath).startsWith(path.resolve(generatedDatabaseDir))) {
    for (const suffix of ['', '-shm', '-wal', '-journal']) {
      fs.rmSync(`${sqlitePath}${suffix}`, { force: true })
    }
  }
}

process.exit(exitCode)
