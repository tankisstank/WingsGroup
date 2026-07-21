#!/usr/bin/env node
/**
 * Ephemeral PostgreSQL proof for wingsSideHiFi:
 * 1) empty → head migrations (includes 20260721_180000_wings_side_hifi_page_contract)
 * 2) Payload create/read/update of one page with nested localized arrays in EN + VI
 *
 * Usage (from app/):
 *   node scripts/wings-side-hifi-pg-crud-smoke.mjs
 */
import { spawn, spawnSync } from 'node:child_process'
import process from 'node:process'

const PG_IMAGE = 'postgres:16-alpine'
const PG_CONTAINER = `wings-hifi-crud-${Date.now()}`
const PG_USER = 'smoke'
const PG_PASSWORD = 'smoke'
const PG_DB = 'wings_hifi_crud'

const log = (m) => console.log(`[hifi-pg-crud] ${m}`)
const sh = (cmd, args, opts = {}) => {
  const res = spawnSync(cmd, args, { encoding: 'utf8', ...opts })
  return { status: res.status ?? -1, stdout: res.stdout || '', stderr: res.stderr || '' }
}
const teardown = () => sh('docker', ['rm', '-f', PG_CONTAINER])

const waitForPostgres = async (maxSeconds = 60) => {
  for (let i = 0; i < maxSeconds; i++) {
    const res = sh('docker', ['exec', PG_CONTAINER, 'pg_isready', '-U', PG_USER, '-d', PG_DB])
    if (res.status === 0 && /accepting connections/.test(res.stdout)) return true
    await new Promise((r) => setTimeout(r, 1000))
  }
  return false
}

const run = (cmd, args, env = {}) =>
  new Promise((resolve) => {
    const child = spawn(cmd, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: process.platform === 'win32',
      env: { ...process.env, ...env },
    })
    let out = ''
    let err = ''
    child.stdout.on('data', (d) => {
      out += d
      process.stdout.write(d)
    })
    child.stderr.on('data', (d) => {
      err += d
      process.stderr.write(d)
    })
    child.on('close', (code) => resolve({ status: code ?? -1, stdout: out, stderr: err }))
  })

async function main() {
  if (sh('docker', ['version', '--format', '{{.Server.Version}}']).status !== 0) {
    console.error('Docker required')
    return 2
  }

  log(`starting ${PG_IMAGE}`)
  const start = sh('docker', [
    'run',
    '-d',
    '--name',
    PG_CONTAINER,
    '-e',
    `POSTGRES_USER=${PG_USER}`,
    '-e',
    `POSTGRES_PASSWORD=${PG_PASSWORD}`,
    '-e',
    `POSTGRES_DB=${PG_DB}`,
    '-p',
    '127.0.0.1::5432',
    PG_IMAGE,
  ])
  if (start.status !== 0) {
    console.error(start.stderr)
    return 2
  }

  try {
    if (!(await waitForPostgres())) return 2
    const port = sh('docker', ['port', PG_CONTAINER, '5432/tcp']).stdout
      .trim()
      .match(/:(\d+)$/)?.[1]
    if (!port) return 2
    const databaseURL = `postgresql://${PG_USER}:${PG_PASSWORD}@127.0.0.1:${port}/${PG_DB}`
    const baseEnv = {
      DATABASE_URL: databaseURL,
      PAYLOAD_DB_PUSH: 'false',
      PAYLOAD_SECRET: 'hifi-crud-smoke-secret',
      NODE_OPTIONS: '--no-deprecation',
      NEXT_PUBLIC_SERVER_URL: 'http://127.0.0.1:3000',
    }

    log('migrate empty -> head...')
    const migrate = await run('pnpm', ['exec', 'payload', 'migrate'], baseEnv)
    if (migrate.status !== 0) {
      console.error('migrate failed')
      return 1
    }

    log('Payload CRUD EN+VI nested arrays...')
    const crud = await run(
      'pnpm',
      ['exec', 'tsx', 'scripts/lib/wingsSideHiFiPgCrudProof.ts'],
      baseEnv,
    )
    if (crud.status !== 0) {
      console.error('CRUD proof failed')
      return 1
    }

    log('PASS: migrate empty→head + Payload create/read/update EN+VI on ephemeral PostgreSQL')
    return 0
  } finally {
    teardown()
  }
}

main()
  .then((c) => process.exit(c ?? 0))
  .catch((e) => {
    console.error(e)
    teardown()
    process.exit(2)
  })
