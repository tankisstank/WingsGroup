import { randomBytes, randomUUID } from 'node:crypto'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import {
  assertArtifactInputContract,
  assertDisposablePostgresTarget,
  loadBaselineSource,
  parseLoopbackDockerPort,
  sha256,
} from './lib/wingsSideUs055Rehearsal.mjs'

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = path.dirname(appRoot)
const runToken = randomUUID().replaceAll('-', '').slice(0, 12)
const containerName = `wingsside-us055-rehearsal-${runToken}`
const database = `wingsside_us055_rehearsal_${runToken}`
const restoreDatabase = `${database}_restore_rehearsal`
const user = 'rehearsal_operator'
const password = randomBytes(32).toString('base64url')
const payloadSecret = randomBytes(32).toString('base64url')
const sourcePath = path.resolve(
  appRoot,
  'scripts/data/wingsside-tour-content-candidates/en.json',
)
const manifestPath = path.resolve(
  appRoot,
  'scripts/data/wingsside-tour-editorial/source-manifest.json',
)
const evidenceRoot = path.resolve(
  process.env.US055_REHEARSAL_EVIDENCE_DIR ||
    path.join(
      repoRoot,
      'docs/stories/epics/E08-wingsside-inbound-upgrade/US-055-real-tour-why-travel/evidence/rehearsal',
    ),
)
const evidencePath = path.join(evidenceRoot, `r3-${runToken}.json`)
const dumpPath = path.join(os.tmpdir(), `us055-rehearsal-${runToken}.dump`)
const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'us055-rehearsal-'))
const envFile = path.join(temporaryDirectory, 'postgres.env')
const startedAt = new Date()
const checks = []
let cleanupVerified = false
let databaseURL

const run = (command, args, { capture = true, cwd = appRoot, env = process.env } = {}) => {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    env,
    shell: process.platform === 'win32' && command === 'pnpm',
    stdio: capture ? 'pipe' : 'inherit',
    windowsHide: true,
  })
  if (result.error || result.status !== 0) {
    const detail = String(result.stderr || result.stdout || result.error?.message || '')
      .replaceAll(password, '[REDACTED]')
      .slice(-2000)
    throw new Error(`${command} failed with exit code ${result.status ?? 'unknown'}: ${detail}`)
  }
  return String(result.stdout || '').trim()
}

const dockerSQL = (targetDatabase, sql) =>
  run('docker', [
    'exec',
    containerName,
    'psql',
    '--username',
    user,
    '--dbname',
    targetDatabase,
    '--tuples-only',
    '--no-align',
    '--set',
    'ON_ERROR_STOP=1',
    '--command',
    sql,
  ])

const record = (name, details = {}) => checks.push({ name, status: 'pass', ...details })

const verifyInventory = async (targetDatabase) => {
  const expected = (await loadBaselineSource(sourcePath, manifestPath)).tours
    .map(({ slug }) => String(slug))
    .sort()
  const actual = JSON.parse(
    dockerSQL(
      targetDatabase,
      "select coalesce(json_agg(slug order by slug), '[]'::json) from tour_products;",
    ),
  )
  if (actual.length !== 22 || JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Rehearsal ${targetDatabase} does not contain the sealed 22-tour inventory`)
  }
  return sha256(JSON.stringify(actual))
}

const readInputContract = async () => {
  const contractPath = process.env.US055_REHEARSAL_ARTIFACT_CONTRACT
  if (!contractPath) return assertArtifactInputContract({})
  const contract = JSON.parse(await readFile(path.resolve(contractPath), 'utf8'))
  const status = assertArtifactInputContract(contract)
  for (const [pathKey, checksumKey] of [
    ['catalogPath', 'catalogSha256'],
    ['planPath', 'planSha256'],
  ]) {
    const bytes = await readFile(path.resolve(contract[pathKey]))
    if (sha256(bytes) !== contract[checksumKey]) {
      throw new Error(`US-055 rehearsal ${pathKey} checksum mismatch`)
    }
  }
  return {
    ...status,
    reason:
      'frozen artifacts validated; guarded production-semantic phases require the leader-supplied signer and release evidence',
  }
}

try {
  await writeFile(
    envFile,
    `POSTGRES_DB=${database}\nPOSTGRES_USER=${user}\nPOSTGRES_PASSWORD=${password}\n`,
    { encoding: 'utf8', mode: 0o600 },
  )
  run('docker', ['pull', 'postgres:16'])
  run('docker', [
    'run',
    '--detach',
    '--rm',
    '--name',
    containerName,
    '--label',
    'wings.travel.scope=us055-rehearsal',
    '--env-file',
    envFile,
    '--publish',
    '127.0.0.1::5432',
    'postgres:16',
  ])
  record('container-started', { image: 'postgres:16', persistentVolume: false })

  let ready = false
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const probe = spawnSync(
      'docker',
      ['exec', containerName, 'pg_isready', '--username', user, '--dbname', database],
      { encoding: 'utf8', windowsHide: true },
    )
    if (probe.status === 0) {
      ready = true
      break
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  if (!ready) throw new Error('Disposable PostgreSQL did not become ready')
  const port = parseLoopbackDockerPort(run('docker', ['port', containerName, '5432/tcp']))
  databaseURL = `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@127.0.0.1:${port}/${database}`
  const identity = assertDisposablePostgresTarget(databaseURL)
  record('target-identity', {
    database: identity.database,
    host: identity.hostname,
    port: identity.port,
  })
  const postgresVersion = dockerSQL(database, "select current_setting('server_version');")
  if (!postgresVersion.startsWith('16.')) {
    throw new Error(`US-055 rehearsal requires PostgreSQL 16, observed ${postgresVersion}`)
  }
  record('postgres-version', { major: 16, serverVersion: postgresVersion })

  const guardedEnv = {
    ...process.env,
    DATABASE_URL: databaseURL,
    NODE_ENV: 'production',
    PAYLOAD_DB_PUSH: 'false',
    PAYLOAD_SECRET: payloadSecret,
    WINGSSIDE_TOUR_EDITORIAL_REHEARSAL_ALLOW: 'disposable-postgres',
  }
  if (guardedEnv.PAYLOAD_DB_PUSH !== 'false') throw new Error('PAYLOAD_DB_PUSH guard drifted')
  run('pnpm', ['exec', 'payload', 'migrate'], { env: guardedEnv })
  record('payload-migrations', { payloadDbPush: false })

  run(
    'pnpm',
    [
      'exec',
      'tsx',
      'scripts/seed-wingsside-tour-editorial-rehearsal.ts',
      '--source',
      sourcePath,
      '--source-manifest',
      manifestPath,
    ],
    { env: guardedEnv },
  )
  const sourceInventorySha256 = await verifyInventory(database)
  record('seed-source-inventory', { sourceInventorySha256, tours: 22 })

  dockerSQL(
    database,
    [
      'create table rehearsal_crud_probe (id integer primary key, state text not null);',
      "insert into rehearsal_crud_probe values (1, 'created');",
      "update rehearsal_crud_probe set state = 'updated' where id = 1;",
      "delete from rehearsal_crud_probe where id = 1;",
    ].join(' '),
  )
  if (dockerSQL(database, 'select count(*) from rehearsal_crud_probe;') !== '0') {
    throw new Error('PostgreSQL CRUD probe did not return to empty state')
  }
  record('postgres-crud', { create: true, delete: true, insert: true, update: true })

  run('docker', [
    'exec',
    containerName,
    'pg_dump',
    '--username',
    user,
    '--dbname',
    database,
    '--format',
    'custom',
    '--file',
    '/tmp/us055-rehearsal.dump',
  ])
  run('docker', ['cp', `${containerName}:/tmp/us055-rehearsal.dump`, dumpPath])
  const dumpBytes = await readFile(dumpPath)
  const backupSha256 = sha256(dumpBytes)
  record('backup', { bytes: dumpBytes.length, format: 'postgres-custom', sha256: backupSha256 })

  run('docker', ['exec', containerName, 'createdb', '--username', user, restoreDatabase])
  run('docker', [
    'exec',
    containerName,
    'pg_restore',
    '--username',
    user,
    '--dbname',
    restoreDatabase,
    '--exit-on-error',
    '--no-owner',
    '--no-acl',
    '/tmp/us055-rehearsal.dump',
  ])
  const restoredInventorySha256 = await verifyInventory(restoreDatabase)
  if (restoredInventorySha256 !== sourceInventorySha256) {
    throw new Error('Restored inventory checksum does not match the source database')
  }
  record('restore-drill', {
    database: restoreDatabase,
    inventorySha256: restoredInventorySha256,
    tours: 22,
  })

  const artifactPhases = await readInputContract()
  checks.push({
    name: 'catalog-plan-apply-verify-rollback-verify',
    ...artifactPhases,
  })
} catch (error) {
  checks.push({
    name: 'run',
    status: 'fail',
    message: String(error instanceof Error ? error.message : error).replaceAll(
      password,
      '[REDACTED]',
    ),
  })
} finally {
  spawnSync('docker', ['rm', '--force', containerName], {
    encoding: 'utf8',
    stdio: 'pipe',
    windowsHide: true,
  })
  const inspect = spawnSync('docker', ['inspect', containerName], {
    encoding: 'utf8',
    stdio: 'pipe',
    windowsHide: true,
  })
  cleanupVerified = inspect.status !== 0
  await rm(temporaryDirectory, { force: true, recursive: true })
  await rm(dumpPath, { force: true })
}

checks.push({ name: 'cleanup', status: cleanupVerified ? 'pass' : 'fail' })
const failed = checks.some(({ status }) => status === 'fail')
const result = {
  artifactContractVersion: 1,
  checks,
  completedAt: new Date().toISOString(),
  durationSeconds: Math.round((Date.now() - startedAt.getTime()) / 1000),
  evidenceContainsCredentials: false,
  image: 'postgres:16',
  mode: 'disposable-local-rehearsal',
  runID: runToken,
  status: failed ? 'failed' : 'baseline-ready-catalog-pending',
}
await mkdir(evidenceRoot, { recursive: true })
await writeFile(evidencePath, `${JSON.stringify(result, null, 2)}\n`, 'utf8')
console.log(JSON.stringify({ evidencePath, status: result.status }))
if (failed) process.exitCode = 1
