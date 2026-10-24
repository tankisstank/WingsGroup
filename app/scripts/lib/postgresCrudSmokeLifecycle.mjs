import { spawn, spawnSync } from 'node:child_process'
import process from 'node:process'

const defaultShell = (command, args, options = {}) => {
  const result = spawnSync(command, args, { encoding: 'utf8', ...options })

  return {
    status: result.status ?? -1,
    stderr: result.stderr || '',
    stdout: result.stdout || '',
  }
}

const defaultRun = (command, args, env, outputMode) =>
  new Promise((resolve) => {
    const child = spawn(command, args, {
      env: { ...process.env, ...env },
      shell: process.platform === 'win32',
      stdio: outputMode === 'inherit' ? 'inherit' : ['ignore', 'pipe', 'pipe'],
    })

    if (outputMode !== 'inherit') {
      child.stdout.on('data', (data) => process.stdout.write(data))
      child.stderr.on('data', (data) => process.stderr.write(data))
    }

    child.on('close', (code) => resolve(code ?? 1))
  })

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

export class PostgresSmokeEnvironmentError extends Error {
  constructor(message, exitCode) {
    super(message)
    this.name = 'PostgresSmokeEnvironmentError'
    this.exitCode = exitCode
  }
}

export class PostgresSmokeProofError extends Error {
  constructor(message) {
    super(message)
    this.name = 'PostgresSmokeProofError'
    this.exitCode = 1
  }
}

/**
 * Runs the shared disposable PostgreSQL lifecycle while leaving proof commands
 * and their configuration in each smoke runner.
 */
export const runPostgresCrudSmoke = async ({
  container,
  database,
  environment = {},
  environmentExitCode = 1,
  environmentFailureMessage = 'Docker is required for PostgreSQL CRUD proof',
  image = 'postgres:16-alpine',
  log = () => {},
  migration = { args: ['exec', 'payload', 'migrate'] },
  migrationFailureMessage = 'PostgreSQL migration failed',
  onContainerStart = () => {},
  onMigrationStart = () => {},
  onProofStart = () => {},
  outputMode = 'inherit',
  password,
  portPattern = /:(\d+)$/,
  proof = { args: /** @type {string[]} */ ([]) },
  proofFailureMessage = 'PostgreSQL CRUD proof failed',
  shell = defaultShell,
  sleep = delay,
  user,
  waitForReady = (result) => result.status === 0,
  waitSeconds = 60,
  run = defaultRun,
}) => {
  const failEnvironment = (message) => {
    throw new PostgresSmokeEnvironmentError(message, environmentExitCode)
  }

  const dockerVersion = shell('docker', ['version', '--format', '{{.Server.Version}}'])
  if (dockerVersion.status !== 0) {
    failEnvironment(environmentFailureMessage)
  }

  if (onContainerStart) onContainerStart()
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
  if (started.status !== 0) {
    failEnvironment(started.stderr || 'Could not start PostgreSQL container')
  }

  try {
    let ready = false
    for (let attempt = 0; attempt < waitSeconds; attempt += 1) {
      const readiness = shell('docker', [
        'exec',
        container,
        'pg_isready',
        '-U',
        user,
        '-d',
        database,
      ])
      if (waitForReady(readiness)) {
        ready = true
        break
      }
      await sleep(1000)
    }
    if (!ready) failEnvironment('PostgreSQL did not become ready')

    const portResult = shell('docker', ['port', container, '5432/tcp'])
    const port = portResult.stdout.trim().match(portPattern)?.[1]
    if (!port) failEnvironment('Could not resolve PostgreSQL port')

    const runtimeEnvironment = {
      ...environment,
      DATABASE_URL: `postgresql://${user}:${password}@127.0.0.1:${port}/${database}`,
    }

    if (onMigrationStart) onMigrationStart()
    const migrationStatus = await run('pnpm', migration.args, runtimeEnvironment, outputMode)
    if (migrationStatus !== 0) throw new PostgresSmokeProofError(migrationFailureMessage)

    if (onProofStart) onProofStart()
    const proofStatus = await run('pnpm', proof.args, runtimeEnvironment, outputMode)
    if (proofStatus !== 0) throw new PostgresSmokeProofError(proofFailureMessage)

    if (proof.successMessage) log(proof.successMessage)
  } finally {
    shell('docker', ['rm', '-f', container])
  }
}
