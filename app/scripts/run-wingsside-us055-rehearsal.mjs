import { randomBytes, randomUUID } from 'node:crypto'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import {
  assertArtifactInputContract,
  assertDisposablePostgresTarget,
  buildSanitizedChildEnvironment,
  buildFrozenSourceProof,
  loadFrozenSourceSnapshot,
  parseLoopbackDockerPort,
  postgresReadinessProbeArgs,
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
const frozenSourceSnapshotPath = path.resolve(
  repoRoot,
  'docs/stories/epics/E08-wingsside-inbound-upgrade/US-055-real-tour-why-travel/evidence/rehearsal/frozen-source-snapshot.json',
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
let cleanupAttempts = 0
let databaseURL
let imageReference

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

const databaseTours = (targetDatabase) => {
  const tours = JSON.parse(
    dockerSQL(
      targetDatabase,
      `select coalesce(json_agg(json_build_object(
         'id', q.id, 'slug', q.slug, 'summary', q.summary, 'title', q.title
       ) order by q.slug), '[]'::json)
       from (
         select t.id, t.slug, l.summary, l.title
         from tour_products t
         join tour_products_locales l on l._parent_id = t.id and l._locale = 'en'
       ) q;`,
    ),
  )
  const services = JSON.parse(
    dockerSQL(
      targetDatabase,
      `select coalesce(json_agg(json_build_object(
         'slug', q.slug, 'bucket', q.bucket, 'id', q.id, 'label', q.label
       ) order by q.slug, q.bucket, q.row_order, q.id), '[]'::json)
       from (
         select t.slug, 'includes' as bucket, r.id, l.label, r._order as row_order
         from tour_products t
         join tour_products_includes r on r._parent_id = t.id
         join tour_products_includes_locales l on l._parent_id = r.id and l._locale = 'en'
         union all
         select t.slug, 'excludes' as bucket, r.id, l.label, r._order as row_order
         from tour_products t
         join tour_products_excludes r on r._parent_id = t.id
         join tour_products_excludes_locales l on l._parent_id = r.id and l._locale = 'en'
       ) q;`,
    ),
  )
  const days = JSON.parse(
    dockerSQL(
      targetDatabase,
      `select coalesce(json_agg(json_build_object(
         'slug', q.slug, 'accommodation', q.accommodation, 'dayNumber', q.day_number,
         'meals', q.meals, 'route', q.route, 'summary', q.summary, 'title', q.title,
         'transport', q.transport
       ) order by q.slug, q.row_order, q.id), '[]'::json)
       from (
         select t.slug, r.id, r._order as row_order, r.day_number,
                l.accommodation, l.meals, l.route, l.summary, l.title, l.transport
         from tour_products t
         join tour_products_itinerary_days r on r._parent_id = t.id
         join tour_products_itinerary_days_locales l
           on l._parent_id = r.id and l._locale = 'en'
       ) q;`,
    ),
  )
  const bySlug = new Map(
    tours.map((tour) => [
      tour.slug,
      {
        excludes: [],
        includes: [],
        itineraryDays: [],
        slug: tour.slug,
        summary: tour.summary,
        title: tour.title,
      },
    ]),
  )
  for (const row of services) {
    const tour = bySlug.get(row.slug)
    if (!tour || !['includes', 'excludes'].includes(row.bucket)) {
      throw new Error('Rehearsal database contains an unscoped service row')
    }
    tour[row.bucket].push({ id: String(row.id), label: row.label })
  }
  for (const day of days) {
    const tour = bySlug.get(day.slug)
    if (!tour) throw new Error('Rehearsal database contains an unscoped itinerary row')
    const { slug: _slug, ...content } = day
    tour.itineraryDays.push(content)
  }
  return [...bySlug.values()]
}

const verifyFrozenSource = (targetDatabase, expectedProof) => {
  const actualProof = buildFrozenSourceProof(databaseTours(targetDatabase))
  if (JSON.stringify(actualProof) !== JSON.stringify(expectedProof)) {
    throw new Error(`Rehearsal ${targetDatabase} full frozen source proof mismatch`)
  }
  return actualProof
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
      'frozen artifacts validated only; lifecycle plan/apply/verify/rollback/verify was not executed',
  }
}

try {
  await writeFile(
    envFile,
    `POSTGRES_DB=${database}\nPOSTGRES_USER=${user}\nPOSTGRES_PASSWORD=${password}\n`,
    { encoding: 'utf8', mode: 0o600 },
  )
  const frozenSource = await loadFrozenSourceSnapshot(frozenSourceSnapshotPath)
  record('frozen-source-artifact', {
    artifactChecksum: frozenSource.proof.artifactChecksum,
    artifactRawSha256: frozenSource.artifactRawSha256,
    itineraryDays: frozenSource.proof.itineraryDays,
    serviceRows: frozenSource.proof.serviceRows,
    snapshotChecksum: frozenSource.snapshot.snapshotChecksum,
    tours: frozenSource.proof.tours,
  })

  run('docker', ['pull', 'postgres:16'])
  imageReference = run('docker', [
    'image',
    'inspect',
    'postgres:16',
    '--format',
    '{{index .RepoDigests 0}}',
  ])
  if (!/^postgres@sha256:[a-f0-9]{64}$/u.test(imageReference)) {
    throw new Error('PostgreSQL image did not resolve to an immutable official digest')
  }
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
    imageReference,
  ])
  record('container-started', {
    image: 'postgres:16',
    imageReference,
    persistentVolume: false,
  })

  let ready = false
  let readinessAttempts = 0
  for (let attempt = 0; attempt < 60; attempt += 1) {
    readinessAttempts = attempt + 1
    const probe = spawnSync(
      'docker',
      postgresReadinessProbeArgs({ containerName, database, user }),
      { encoding: 'utf8', windowsHide: true },
    )
    if (probe.status === 0) {
      ready = true
      break
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  if (!ready) throw new Error('Disposable PostgreSQL did not become ready')
  record('postgres-final-server-readiness', {
    attempts: readinessAttempts,
    host: '127.0.0.1',
    port: 5432,
    transport: 'tcp',
  })
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

  const guardedEnv = buildSanitizedChildEnvironment(process.env, {
    CRON_SECRET: '',
    DATABASE_URL: databaseURL,
    IMPORT_ADMIN_EMAIL: '',
    NODE_ENV: 'production',
    PAYLOAD_DB_PUSH: 'false',
    PAYLOAD_SECRET: payloadSecret,
    REDIS_URL: '',
    SMTP_FROM_EMAIL: '',
    SMTP_HOST: '',
    SMTP_PASSWORD: '',
    SMTP_USER: '',
    WINGSSIDE_TOUR_EDITORIAL_CATALOG_V2_PATH: '',
    WINGSSIDE_TOUR_EDITORIAL_CATALOG_V2_SHA256: '',
    WINGSSIDE_TOUR_EDITORIAL_REHEARSAL_ALLOW: 'disposable-postgres',
    WINGSTRAVEL_RELEASE_SHA: '',
  })
  record('child-environment-sanitized', {
    inheritedKeys: Object.keys(buildSanitizedChildEnvironment(process.env, {})).sort(),
    productionCapabilitiesBlanked: [
      'CRON_SECRET',
      'IMPORT_ADMIN_EMAIL',
      'REDIS_URL',
      'SMTP_FROM_EMAIL',
      'SMTP_HOST',
      'SMTP_PASSWORD',
      'SMTP_USER',
      'WINGSSIDE_TOUR_EDITORIAL_CATALOG_V2_PATH',
      'WINGSSIDE_TOUR_EDITORIAL_CATALOG_V2_SHA256',
      'WINGSTRAVEL_RELEASE_SHA',
    ],
  })
  if (guardedEnv.PAYLOAD_DB_PUSH !== 'false') throw new Error('PAYLOAD_DB_PUSH guard drifted')
  run('pnpm', ['exec', 'payload', 'migrate'], { env: guardedEnv })
  record('payload-migrations', { payloadDbPush: false })

  run(
    'pnpm',
    [
      'exec',
      'tsx',
      'scripts/seed-wingsside-tour-editorial-rehearsal.ts',
      '--source-snapshot',
      frozenSourceSnapshotPath,
    ],
    { env: guardedEnv },
  )
  const sourceProof = verifyFrozenSource(database, frozenSource.proof)
  record('seed-full-frozen-source', sourceProof)

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
  const restoredProof = verifyFrozenSource(restoreDatabase, frozenSource.proof)
  record('restore-drill', {
    artifactChecksum: restoredProof.artifactChecksum,
    database: restoreDatabase,
    itineraryChecksum: restoredProof.itineraryChecksum,
    itineraryDays: restoredProof.itineraryDays,
    serviceChecksum: restoredProof.serviceChecksum,
    serviceRows: restoredProof.serviceRows,
    tours: restoredProof.tours,
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
  for (let attempt = 0; attempt < 3 && !cleanupVerified; attempt += 1) {
    cleanupAttempts = attempt + 1
    spawnSync('docker', ['rm', '--force', containerName], {
      encoding: 'utf8',
      stdio: 'pipe',
      timeout: 15_000,
      windowsHide: true,
    })
    const inspect = spawnSync('docker', ['inspect', containerName], {
      encoding: 'utf8',
      stdio: 'pipe',
      timeout: 5_000,
      windowsHide: true,
    })
    cleanupVerified = inspect.status !== null && inspect.status !== 0
    if (!cleanupVerified) await new Promise((resolve) => setTimeout(resolve, 500))
  }
  await rm(temporaryDirectory, { force: true, recursive: true })
  await rm(dumpPath, { force: true })
}

checks.push({
  attempts: cleanupAttempts,
  containerName,
  name: 'cleanup',
  status: cleanupVerified ? 'pass' : 'fail',
})
const failed = checks.some(({ status }) => status === 'fail')
const result = {
  artifactContractVersion: 1,
  checks,
  completedAt: new Date().toISOString(),
  durationSeconds: Math.round((Date.now() - startedAt.getTime()) / 1000),
  evidenceContainsCredentials: false,
  image: imageReference || 'postgres:16-unresolved',
  mode: 'disposable-local-rehearsal',
  runID: runToken,
  status: failed ? 'failed' : 'baseline-ready-catalog-pending',
}
await mkdir(evidenceRoot, { recursive: true })
await writeFile(evidencePath, `${JSON.stringify(result, null, 2)}\n`, 'utf8')
console.log(JSON.stringify({ evidencePath, status: result.status }))
if (failed) process.exitCode = 1
