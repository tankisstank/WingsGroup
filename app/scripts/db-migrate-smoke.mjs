#!/usr/bin/env node
/**
 * PostgreSQL Migration Smoke Gate (US-025)
 *
 * Proves that the committed Payload migrations apply cleanly from an empty
 * baseline to head on a REAL PostgreSQL instance (matching production:
 * postgres:16-alpine), so a schema change cannot reach staging/production with
 * an unrunnable or divergent migration path.
 *
 * This exists because decision 0007 runs SQLite for local bootstrap and
 * PostgreSQL for staging/production. `repairLocalSQLiteSchema` is a local
 * convenience and is NEVER a substitute for a real migration on PostgreSQL.
 *
 * Exit codes:
 *   0  clean apply, empty -> head, and `migrate:status` reports no pending
 *   1  migration apply failure OR pending/divergent migrations remain
 *   2  environment/setup failure (Docker or PostgreSQL unavailable) so a
 *      missing service is never silently treated as pass
 */

import { spawn, spawnSync } from 'node:child_process'
import process from 'node:process'

const PG_IMAGE = 'postgres:16-alpine'
const PG_CONTAINER = `wings-migrate-smoke-${Date.now()}`
const PG_USER = 'smoke'
const PG_PASSWORD = 'smoke'
const PG_DB = 'wings_migrate_smoke'
let databaseURL

const log = (msg) => console.log(`[migrate-smoke] ${msg}`)
const fail = (code, msg) => {
  console.error(`[migrate-smoke] FAIL(${code}): ${msg}`)
  return code
}

function sh(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { encoding: 'utf8', ...opts })
  return { status: res.status ?? -1, stdout: res.stdout || '', stderr: res.stderr || '' }
}

function dockerAvailable() {
  const res = sh('docker', ['version', '--format', '{{.Server.Version}}'])
  return res.status === 0
}

function teardown() {
  log(`tearing down container ${PG_CONTAINER}`)
  sh('docker', ['rm', '-f', PG_CONTAINER])
}

async function waitForPostgres(maxSeconds = 60) {
  for (let i = 0; i < maxSeconds; i++) {
    const res = sh('docker', ['exec', PG_CONTAINER, 'pg_isready', '-U', PG_USER, '-d', PG_DB])
    if (res.status === 0 && /accepting connections/.test(res.stdout)) return true
    await new Promise((r) => setTimeout(r, 1000))
  }
  return false
}

function runPayload(args) {
  // Runs the project's payload CLI with the ephemeral Postgres URL.
  return new Promise((resolve) => {
    const child = spawn('pnpm', ['exec', 'payload', ...args], {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: process.platform === 'win32',
      env: {
        ...process.env,
        DATABASE_URL: databaseURL,
        PAYLOAD_DB_PUSH: 'false',
        PAYLOAD_SECRET: process.env.PAYLOAD_SECRET || 'smoke-secret-not-for-production',
        NODE_OPTIONS: '--no-deprecation',
        NEXT_PUBLIC_SERVER_URL: process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000',
      },
    })
    let out = ''
    let err = ''
    child.stdout.on('data', (d) => {
      const s = d.toString()
      out += s
      process.stdout.write(s)
    })
    child.stderr.on('data', (d) => {
      const s = d.toString()
      err += s
      process.stderr.write(s)
    })
    child.on('close', (code) => resolve({ status: code ?? -1, stdout: out, stderr: err }))
  })
}

async function main() {
  if (!dockerAvailable()) {
    return fail(2, 'Docker is not available; cannot run PostgreSQL migration smoke gate.')
  }

  const requestedPort = process.env.SMOKE_PG_PORT
  log(
    `starting ephemeral ${PG_IMAGE} on ${requestedPort ? `port ${requestedPort}` : 'an ephemeral host port'}`,
  )
  const start = sh('docker', [
    'run', '-d',
    '--name', PG_CONTAINER,
    '-e', `POSTGRES_USER=${PG_USER}`,
    '-e', `POSTGRES_PASSWORD=${PG_PASSWORD}`,
    '-e', `POSTGRES_DB=${PG_DB}`,
    '-p', requestedPort ? `127.0.0.1:${requestedPort}:5432` : '127.0.0.1::5432',
    PG_IMAGE,
  ])
  if (start.status !== 0) {
    teardown()
    return fail(2, `could not start PostgreSQL container: ${start.stderr.trim()}`)
  }

  try {
    log('waiting for PostgreSQL to accept connections...')
    const ready = await waitForPostgres()
    if (!ready) return fail(2, 'PostgreSQL did not become ready within timeout.')

    const portResult = sh('docker', ['port', PG_CONTAINER, '5432/tcp'])
    const port = portResult.stdout.trim().match(/:(\d+)$/)?.[1]
    if (!port) return fail(2, `could not determine PostgreSQL host port: ${portResult.stderr.trim()}`)
    databaseURL = `postgresql://${PG_USER}:${PG_PASSWORD}@127.0.0.1:${port}/${PG_DB}`

    log('PostgreSQL ready. Applying migrations empty -> head...')
    const migrate = await runPayload(['migrate'])
    if (migrate.status !== 0) {
      return fail(1, `payload migrate exited ${migrate.status}; migrations do not apply cleanly on PostgreSQL.`)
    }

    log('verifying no pending/divergent migrations remain (migrate:status)...')
    const status = await runPayload(['migrate:status'])
    if (status.status !== 0) {
      return fail(1, `payload migrate:status exited ${status.status}.`)
    }
    // Payload prints one row per migration with a final Yes/No applied column.
    // Do not infer success from process exit alone: migrate:status exits zero even
    // when migrations are pending.
    const plainStatus = status.stdout.replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, '')
    const unappliedRows = plainStatus
      .split(/\r?\n/)
      .filter((line) => /^\s*│\s*\d{8}[_-]\S+.*│\s*No\s*│\s*$/i.test(line))
    if (unappliedRows.length > 0) {
      return fail(1, `migrate:status reports unapplied migrations:\n${unappliedRows.join('\n')}`)
    }

    log('PostgreSQL version in use:')
    const ver = sh('docker', ['exec', PG_CONTAINER, 'psql', '-U', PG_USER, '-d', PG_DB, '-tAc', 'select version();'])
    log(ver.stdout.trim() || '(version query failed, non-fatal)')

    log('PASS: all committed migrations applied empty->head on real PostgreSQL with no pending delta.')
    return 0
  } finally {
    teardown()
  }
}

main()
  .then((code) => process.exit(code))
  .catch((e) => {
    console.error(`[migrate-smoke] unexpected error: ${e?.stack || e}`)
    teardown()
    process.exit(2)
  })
