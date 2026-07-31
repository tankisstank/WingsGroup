#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process'
import process from 'node:process'

const image = 'postgres:16-alpine'
const container = `wings-group-commerce-crud-${Date.now()}`
const user = 'smoke'
const password = 'smoke'
const database = 'wings_group_commerce_crud'
const shell = (command, args, options = {}) =>
  spawnSync(command, args, { encoding: 'utf8', ...options })
const teardown = () => shell('docker', ['rm', '-f', container])
const run = (command, args, env) =>
  new Promise((resolve) => {
    const child = spawn(command, args, {
      env: { ...process.env, ...env },
      shell: process.platform === 'win32',
      stdio: 'inherit',
    })
    child.on('close', (code) => resolve(code ?? 1))
  })

const waitForPostgres = async () => {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const result = shell('docker', ['exec', container, 'pg_isready', '-U', user, '-d', database])
    if (result.status === 0) return true
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
  return false
}

async function main() {
  if (shell('docker', ['version', '--format', '{{.Server.Version}}']).status !== 0) {
    throw new Error('Docker is required for PostgreSQL group-commerce CRUD proof')
  }
  const started = shell('docker', [
    'run',
    '-d',
    '--name',
    container,
    '-e',
    `POSTGRES_USER=${user}`,
    '-e',
    `POSTGRES_PASSWORD=${password}`,
    '-e',
    `POSTGRES_DB=${database}`,
    '-p',
    '127.0.0.1::5432',
    image,
  ])
  if (started.status !== 0) throw new Error(started.stderr)

  try {
    if (!(await waitForPostgres())) throw new Error('PostgreSQL did not become ready')
    const port = shell('docker', ['port', container, '5432/tcp'])
      .stdout.trim()
      .match(/:(\d+)$/)?.[1]
    if (!port) throw new Error('Could not resolve PostgreSQL port')
    const env = {
      DATABASE_URL: `postgresql://${user}:${password}@127.0.0.1:${port}/${database}`,
      NEXT_PUBLIC_SERVER_URL: 'http://127.0.0.1:3000',
      NODE_OPTIONS: '--no-deprecation',
      PAYLOAD_DB_PUSH: 'false',
      PAYLOAD_SECRET: 'group-commerce-crud-smoke-secret',
    }
    if ((await run('pnpm', ['exec', 'payload', 'migrate'], env)) !== 0) {
      throw new Error('Group-commerce PostgreSQL migration failed')
    }
    if (
      (await run(
        'pnpm',
        ['exec', 'tsx', 'scripts/lib/wingsSideGroupCommercePgCrudProof.ts'],
        env,
      )) !== 0
    ) {
      throw new Error('Group-commerce PostgreSQL CRUD proof failed')
    }
    console.log(
      '[group-commerce-pg-crud] PASS: exact 22-tour canary/full apply→verify→rollback',
    )
  } finally {
    teardown()
  }
}

main().catch((error) => {
  console.error(error)
  teardown()
  process.exitCode = 1
})
