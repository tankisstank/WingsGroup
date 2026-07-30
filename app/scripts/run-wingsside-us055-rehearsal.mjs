import { generateKeyPairSync, randomBytes, randomUUID } from 'node:crypto'
import {
  access,
  appendFile,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises'
import { request } from 'node:http'
import { createServer } from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import {
  assertArtifactInputContract,
  assertDisposablePostgresTarget,
  buildSanitizedChildEnvironment,
  buildFrozenSourceProof,
  canonicalChecksum,
  classifyDockerInspectResult,
  loadFrozenSourceSnapshot,
  parseLoopbackDockerPort,
  postgresReadinessProbeArgs,
  extractUs055AppliedArtifactChecksum,
  sha256,
} from './lib/wingsSideUs055Rehearsal.mjs'
import {
  createUs055TargetProof,
  executeUs055CatalogLifecycle,
  prepareUs055CatalogLifecycle,
  publicKeyFingerprint,
} from './lib/wingsSideUs055CatalogLifecycle.ts'
import {
  runUs055AppliedStateE2EGate,
  terminateUs055E2EProcessTree,
} from './lib/wingsSideUs055AppliedStateE2E.mjs'
import { captureUs055HomeFixtureProof } from './lib/wingsSideUs055HomeFixture.ts'

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = path.dirname(appRoot)
const payloadTypesPath = path.join(appRoot, 'src', 'payload-types.ts')
const payloadTypesOriginal = await readFile(payloadTypesPath)
const selectiveSeedMediaDirectory = path.join(appRoot, 'public', 'media')
const selectiveSeedMediaPaths = [
  'wingsside-vietnam-journey-hero.png',
  'wingsside-destination-hub.png',
  'wingsside-travel-styles.png',
  'wingsside-sample-itineraries.png',
].map((filename) => path.join(selectiveSeedMediaDirectory, filename))
const listSelectiveSeedMediaFiles = async () => {
  try {
    return (await readdir(selectiveSeedMediaDirectory)).sort()
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return []
    }
    throw error
  }
}
const selectiveSeedMediaBaseline = await listSelectiveSeedMediaFiles()
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
const journalRoot = path.resolve(
  process.env.US055_REHEARSAL_JOURNAL_DIR || path.join(evidenceRoot, 'journals'),
)
const journalPath = path.join(journalRoot, `us055-rehearsal-${runToken}.journal.jsonl`)
const dumpPath = path.join(os.tmpdir(), `us055-rehearsal-${runToken}.dump`)
const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'us055-rehearsal-'))
const envFile = path.join(temporaryDirectory, 'postgres.env')
const startedAt = new Date()
const checks = []
let cleanupVerified = false
let cleanupAttempts = 0
let cleanupVerification = 'not-attempted'
let databaseURL
let imageReference
let catalogLifecycleSession
let homeBaselineProof
let payloadTypesRestored = false
let selectiveSeedMediaOwned = false
let selectiveSeedMediaCleanupVerified = true
const lifecycleCatalogPath = String(process.env.US055_REHEARSAL_CATALOG_PATH || '').trim()
const lifecycleCatalogSha256 = String(
  process.env.US055_REHEARSAL_CATALOG_SHA256 || '',
).trim()
const lifecycleReleaseCommit = String(
  process.env.US055_REHEARSAL_RELEASE_SHA || '',
).trim()
const lifecycleRequested =
  process.env.US055_REHEARSAL_EXECUTE_CATALOG_LIFECYCLE === 'true'
const homeDiagnosticRequested =
  process.env.US055_REHEARSAL_HOME_DIAGNOSTIC === 'true'

const ephemeralLoopbackPort = () =>
  new Promise((resolve, reject) => {
    const server = createServer()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (!address || typeof address === 'string') {
        server.close()
        reject(new Error('US-055 Home diagnostic could not allocate a loopback port'))
        return
      }
      server.close((error) => (error ? reject(error) : resolve(address.port)))
    })
  })

const requestLocalHome = (port) =>
  new Promise((resolve, reject) => {
    const req = request(
      {
        hostname: '127.0.0.1',
        method: 'GET',
        path: '/wingsside',
        port,
      },
      (response) => {
        const chunks = []
        response.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
        response.once('error', reject)
        response.once('end', () =>
          resolve({
            body: Buffer.concat(chunks).toString('utf8'),
            status: response.statusCode || 0,
          }),
        )
      },
    )
    req.setTimeout(30_000, () => req.destroy(new Error('Home diagnostic request timed out')))
    req.once('error', reject)
    req.end()
  })

const journal = async (stage, state, details = {}) => {
  await mkdir(journalRoot, { recursive: true })
  await appendFile(
    journalPath,
    `${JSON.stringify({
      at: new Date().toISOString(),
      details,
      runID: runToken,
      stage,
      state,
    })}\n`,
    { encoding: 'utf8', mode: 0o600 },
  )
}

const restoreGeneratedPayloadTypes = async () => {
  const payloadTypesCurrent = await readFile(payloadTypesPath)
  if (!payloadTypesCurrent.equals(payloadTypesOriginal)) {
    await writeFile(payloadTypesPath, payloadTypesOriginal)
    payloadTypesRestored = true
  }
}

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

const writeEvidence = async (status) => {
  const result = {
    artifactContractVersion: 1,
    checks,
    completedAt: new Date().toISOString(),
    durationSeconds: Math.round((Date.now() - startedAt.getTime()) / 1000),
    evidenceContainsCredentials: false,
    image: imageReference || 'postgres:16-unresolved',
    journalPath,
    mode: 'disposable-local-rehearsal',
    runID: runToken,
    status,
  }
  await mkdir(evidenceRoot, { recursive: true })
  await writeFile(evidencePath, `${JSON.stringify(result, null, 2)}\n`, 'utf8')
  return result
}

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

const captureFrozenSource = (targetDatabase) =>
  buildFrozenSourceProof(databaseTours(targetDatabase))

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
  await journal('release-head-binding', 'before')
  const worktreeHead = run('git', ['rev-parse', 'HEAD'], { cwd: repoRoot })
  if (lifecycleRequested && lifecycleReleaseCommit !== worktreeHead) {
    throw new Error(`US-055 rehearsal release SHA must equal worktree HEAD ${worktreeHead}`)
  }
  await journal('release-head-binding', 'after', { worktreeHead })
  for (const mediaPath of selectiveSeedMediaPaths) {
    try {
      await access(mediaPath)
      throw new Error(`US-055 rehearsal refuses to overwrite pre-existing seed media: ${mediaPath}`)
    } catch (error) {
      if (
        !(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT')
      ) {
        throw error
      }
    }
  }
  await writeFile(
    envFile,
    `POSTGRES_DB=${database}\nPOSTGRES_USER=${user}\nPOSTGRES_PASSWORD=${password}\n`,
    { encoding: 'utf8', mode: 0o600 },
  )
  await journal('frozen-source-artifact', 'before')
  const frozenSource = await loadFrozenSourceSnapshot(frozenSourceSnapshotPath)
  record('frozen-source-artifact', {
    artifactChecksum: frozenSource.proof.artifactChecksum,
    artifactRawSha256: frozenSource.artifactRawSha256,
    itineraryDays: frozenSource.proof.itineraryDays,
    serviceRows: frozenSource.proof.serviceRows,
    snapshotChecksum: frozenSource.snapshot.snapshotChecksum,
    tours: frozenSource.proof.tours,
  })
  await journal('frozen-source-artifact', 'after')

  await journal('container-start', 'before')
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
  await journal('container-start', 'after', { containerName })

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
    NODE_ENV: 'test',
    NODE_OPTIONS: '',
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
  await journal('payload-migrations', 'before')
  try {
    run('pnpm', ['exec', 'payload', 'migrate'], { env: guardedEnv })
  } finally {
    // Payload migration may regenerate this tracked source file. Restore it
    // immediately, before seed/Payload initialization can wait on PostgreSQL.
    await restoreGeneratedPayloadTypes()
  }
  record('payload-migrations', { payloadDbPush: false })
  if (payloadTypesRestored) {
    record('generated-payload-types-restored', {
      path: 'app/src/payload-types.ts',
      timing: 'immediately-after-migration',
    })
  }
  await journal('payload-migrations', 'after')

  await journal('wingsside-home-seed', 'before')
  selectiveSeedMediaOwned = true
  run('pnpm', ['exec', 'tsx', 'scripts/seed-subsites.ts'], {
    env: {
      ...guardedEnv,
      PAYLOAD_IMPORT_ORIGINALS_ONLY: 'true',
      SEED_ONLY_SITE: 'wing-side',
      WINGSSIDE_REHEARSAL_EXIT_AFTER_SEED: 'true',
    },
  })
  const homeSeedProof = {
    homePages: Number(
      dockerSQL(
        database,
        "select count(*) from pages where site_id = (select id from sites where code = 'wing-side') and pathname = '/' and _status = 'published';",
      ),
    ),
    media: Number(
      dockerSQL(
        database,
        "select count(*) from media where site_id = (select id from sites where code = 'wing-side');",
      ),
    ),
    sites: Number(dockerSQL(database, "select count(*) from sites where code = 'wing-side';")),
    tourProducts: Number(
      dockerSQL(
        database,
        "select count(*) from tour_products where site_id = (select id from sites where code = 'wing-side');",
      ),
    ),
  }
  if (
    homeSeedProof.homePages !== 1 ||
    homeSeedProof.media !== 4 ||
    homeSeedProof.sites !== 1 ||
    homeSeedProof.tourProducts !== 0
  ) {
    throw new Error(`WingSide selective Home seed proof drifted: ${JSON.stringify(homeSeedProof)}`)
  }
  record('wingsside-home-seed', homeSeedProof)
  await journal('wingsside-home-seed', 'after', homeSeedProof)

  await journal('rehearsal-seed', 'before')
  run(
    'pnpm',
    [
      'exec',
      'tsx',
      'scripts/seed-wingsside-tour-editorial-rehearsal.ts',
      '--source-snapshot',
      frozenSourceSnapshotPath,
      '--reuse-seeded-home',
    ],
    { env: guardedEnv },
  )
  const sourceProof = verifyFrozenSource(database, frozenSource.proof)
  const homeWhyTravelProof = {
    distinctTours: Number(
      dockerSQL(
        database,
        "select count(distinct tour_id) from home_why_tour_slots where _parent_id = (select id from pages where site_id = (select id from sites where code = 'wing-side') and pathname = '/' limit 1);",
      ),
    ),
    roles: dockerSQL(
      database,
      "select string_agg(key::text, ',' order by _order) from home_why_tour_slots where _parent_id = (select id from pages where site_id = (select id from sites where code = 'wing-side') and pathname = '/' limit 1);",
    ),
  }
  if (
    homeWhyTravelProof.distinctTours !== 4 ||
    homeWhyTravelProof.roles !==
      'local-design,flexible-planning,style-matching,collaborative-care'
  ) {
    throw new Error(
      `WingSide rehearsal Why Travel fixture proof drifted: ${JSON.stringify(homeWhyTravelProof)}`,
    )
  }
  record('seed-full-frozen-source', sourceProof)
  record('seed-home-why-travel', homeWhyTravelProof)
  await journal('rehearsal-seed', 'after', { ...sourceProof, homeWhyTravelProof })

  if (homeDiagnosticRequested) {
    await journal('home-route-diagnostic', 'before')
    const port = await ephemeralLoopbackPort()
    const server = spawn(
      'pnpm',
      ['exec', 'next', 'dev', '--webpack', '--hostname', '127.0.0.1', '--port', String(port)],
      {
        cwd: appRoot,
        detached: process.platform !== 'win32',
        env: guardedEnv,
        shell: process.platform === 'win32',
        stdio: 'ignore',
        windowsHide: true,
      },
    )
    try {
      let response
      for (let attempt = 0; attempt < 180; attempt += 1) {
        if (server.exitCode !== null || server.signalCode !== null) {
          throw new Error('US-055 Home diagnostic Next server exited before readiness')
        }
        try {
          response = await requestLocalHome(port)
          if (response.status === 200) break
        } catch {
          // Expected while the isolated Next server compiles.
        }
        await new Promise((resolve) => setTimeout(resolve, 1_000))
      }
      const requiredMarkers = [
        'data-od-id="home-why"',
        'data-od-id="why-featured"',
        'data-od-id="why-flexible"',
        'data-od-id="why-style"',
        'data-od-id="why-care"',
      ]
      const markerPresence = Object.fromEntries(
        requiredMarkers.map((marker) => [marker, response?.body.includes(marker) || false]),
      )
      const canonicalMatch =
        response?.body.match(
          /<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i,
        ) ||
        response?.body.match(
          /<link[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["'][^>]*>/i,
        )
      const firstMarkerIndex = response?.body.indexOf('data-od-id=') ?? -1
      const snippetStart = Math.max(0, firstMarkerIndex)
      const diagnostics = {
        bodyBytes: Buffer.byteLength(response?.body || '', 'utf8'),
        canonicalHref: canonicalMatch?.[1] || null,
        htmlLangEn: /<html[^>]*lang=["']en["'][^>]*>/i.test(response?.body || ''),
        markerPresence,
        responseSha256: sha256(Buffer.from(response?.body || '', 'utf8')),
        routeMode: 'local-tenant-alias',
        snippet: (response?.body || '')
          .slice(snippetStart, snippetStart + 360)
          .replace(/\s+/g, ' '),
        status: response?.status || 0,
      }
      if (
        response?.status !== 200 ||
        !Object.values(markerPresence).every(Boolean) ||
        !diagnostics.htmlLangEn ||
        diagnostics.canonicalHref !== 'https://wingside.vn'
      ) {
        await journal('home-route-diagnostic', 'failed', diagnostics)
        throw new Error(
          `US-055 Home route diagnostic failed: ${JSON.stringify(diagnostics)}`,
        )
      }
      const homeRouteProof = {
        canonical: 'https://wingside.vn',
        httpStatus: 200,
        locale: 'en',
        markerCount: 4,
        path: '/wingsside',
      }
      record('home-route-diagnostic', homeRouteProof)
      await journal('home-route-diagnostic', 'after', homeRouteProof)
    } finally {
      await terminateUs055E2EProcessTree(server)
    }
  }

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

  if (
    lifecycleRequested &&
    (!lifecycleCatalogPath || !lifecycleCatalogSha256 || !lifecycleReleaseCommit)
  ) {
    throw new Error(
      'US-055 catalog lifecycle requires catalog path, trusted catalog SHA-256, and release SHA',
    )
  }
  if (lifecycleRequested) {
    await journal('catalog-plan-prepare', 'before')
    const previousEnvironment = {
      DATABASE_URL: process.env.DATABASE_URL,
      NODE_ENV: process.env.NODE_ENV,
      PAYLOAD_DB_PUSH: process.env.PAYLOAD_DB_PUSH,
      PAYLOAD_SECRET: process.env.PAYLOAD_SECRET,
      WINGSSIDE_TOUR_EDITORIAL_REHEARSAL_ALLOW:
        process.env.WINGSSIDE_TOUR_EDITORIAL_REHEARSAL_ALLOW,
    }
    Object.assign(process.env, guardedEnv)
    try {
      catalogLifecycleSession = await prepareUs055CatalogLifecycle({
        catalogPath: lifecycleCatalogPath,
        catalogRawSha256: lifecycleCatalogSha256,
        databaseURL,
        environment: guardedEnv,
        outputDirectory: temporaryDirectory,
        releaseSourceCommit: lifecycleReleaseCommit,
        runID: runToken,
      })
      homeBaselineProof = await captureUs055HomeFixtureProof({
        payload: catalogLifecycleSession.payload,
        req: catalogLifecycleSession.req,
      })
    } finally {
      for (const [key, value] of Object.entries(previousEnvironment)) {
        if (value === undefined) delete process.env[key]
        else process.env[key] = value
      }
    }
    record('catalog-plan', {
      catalogRawSha256: catalogLifecycleSession.artifacts.catalogRawSha256,
      pathScope: 'external-temporary-directory',
      planCanonicalSha256: catalogLifecycleSession.artifacts.planCanonicalSha256,
      planRawSha256: catalogLifecycleSession.artifacts.planRawSha256,
    })
    record('home-baseline-proof', {
      checksum: homeBaselineProof.checksum,
      localeCount: homeBaselineProof.localeCount,
      roleCount: homeBaselineProof.roleCount,
    })
    await journal('catalog-plan-prepare', 'after', {
      planCanonicalSha256: catalogLifecycleSession.artifacts.planCanonicalSha256,
    })
  }

  await journal('backup', 'before')
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
  await journal('backup', 'after', { backupSha256, bytes: dumpBytes.length })

  await journal('restore-drill', 'before')
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
  const restoreEvidenceSha256 = canonicalChecksum({
    artifactChecksum: restoredProof.artifactChecksum,
    database: restoreDatabase,
    itineraryChecksum: restoredProof.itineraryChecksum,
    serviceChecksum: restoredProof.serviceChecksum,
  })
  record('restore-drill', {
    artifactChecksum: restoredProof.artifactChecksum,
    database: restoreDatabase,
    itineraryChecksum: restoredProof.itineraryChecksum,
    itineraryDays: restoredProof.itineraryDays,
    serviceChecksum: restoredProof.serviceChecksum,
    serviceRows: restoredProof.serviceRows,
    tours: restoredProof.tours,
  })
  await journal('restore-drill', 'after', { restoreEvidenceSha256 })

  if (catalogLifecycleSession) {
    const { privateKey, publicKey } = generateKeyPairSync('ed25519')
    const fingerprint = publicKeyFingerprint(publicKey)
    const keyID = `us055-rehearsal-${fingerprint.slice(0, 16)}`
    const artifacts = {
      ...catalogLifecycleSession.artifacts,
      backupSha256,
      restoreEvidenceSha256,
    }
    const baselineProof = sourceProof
    const lifecycle = await executeUs055CatalogLifecycle({
      artifacts,
      captureAppliedProof: async () => ({
        frozenSource: captureFrozenSource(database),
        home: await captureUs055HomeFixtureProof({
          payload: catalogLifecycleSession.payload,
          req: catalogLifecycleSession.req,
        }),
      }),
      captureFinalProof: async () => {
        const finalHomeProof = await captureUs055HomeFixtureProof({
          payload: catalogLifecycleSession.payload,
          req: catalogLifecycleSession.req,
        })
        if (finalHomeProof.checksum !== homeBaselineProof.checksum) {
          throw new Error(
            `US-055 Home fixture rollback checksum mismatch: ${finalHomeProof.checksum}`,
          )
        }
        return {
          frozenSource: verifyFrozenSource(database, baselineProof),
          home: finalHomeProof,
        }
      },
      ledgerPath: path.join(temporaryDirectory, 'catalog-lifecycle-replay-ledger.json'),
      onAppliedStateGate: (state, details) =>
        journal('catalog-lifecycle:applied-state-e2e-110', state, details || {}),
      onStage: (stage, state, details) =>
        journal(`catalog-lifecycle:${stage}`, state, details || {}),
      runAppliedStateGate: () =>
        runUs055AppliedStateE2EGate({
          appRoot,
          databaseURL,
          environment: guardedEnv,
          outputDirectory: temporaryDirectory,
          payloadSecret,
        }),
      session: catalogLifecycleSession,
      signProof: (stage) =>
        createUs055TargetProof({
          artifacts,
          keyID,
          privateKey,
          runID: runToken,
          stage,
          target: catalogLifecycleSession.target,
        }),
      trust: { fingerprint, keyID, publicKey },
    })
    checks.push({
      appliedArtifactChecksum: extractUs055AppliedArtifactChecksum(
        lifecycle.appliedProof,
      ),
      appliedProof: lifecycle.appliedProof,
      appliedStateE2E: lifecycle.appliedStateGate,
      backupSha256,
      baselineProof,
      finalProof: lifecycle.finalProof,
      keyFingerprint: fingerprint,
      keyID,
      name: 'catalog-plan-apply-verify-rollback-verify',
      planCanonicalSha256: artifacts.planCanonicalSha256,
      planRawSha256: artifacts.planRawSha256,
      replayLedgerScope: 'external-temporary-directory',
      restoreEvidenceSha256,
      stageProofs: lifecycle.stageProofs,
      status: 'pass',
      verifyAfter: lifecycle.verifyAfter,
      verifyBefore: lifecycle.verifyBefore,
    })
  } else {
    const artifactPhases = await readInputContract()
    checks.push({
      name: 'catalog-plan-apply-verify-rollback-verify',
      ...artifactPhases,
    })
  }
} catch (error) {
  const message = String(error instanceof Error ? error.message : error).replaceAll(
    password,
    '[REDACTED]',
  )
  checks.push({
    name: 'run',
    status: 'fail',
    message,
  })
  await journal('run', 'failed', { message }).catch(() => {})
} finally {
  const preCleanupFailed = checks.some(({ status }) => status === 'fail')
  await writeEvidence(preCleanupFailed ? 'failed-cleanup-pending' : 'cleanup-pending')
  await journal('cleanup', 'before').catch(() => {})

  try {
    await restoreGeneratedPayloadTypes()
  } catch (error) {
    checks.push({
      name: 'generated-payload-types-restored',
      status: 'fail',
      message: String(error instanceof Error ? error.message : error),
    })
  }

  if (catalogLifecycleSession) {
    try {
      await catalogLifecycleSession.close(5_000)
      record('catalog-lifecycle-payload-close')
    } catch (error) {
      checks.push({
        name: 'catalog-lifecycle-payload-close',
        status: 'fail',
        message: String(error instanceof Error ? error.message : error),
      })
    }
  }
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
    cleanupVerification = classifyDockerInspectResult(inspect, containerName)
    cleanupVerified = cleanupVerification === 'absent'
    if (!cleanupVerified) await new Promise((resolve) => setTimeout(resolve, 500))
  }
  await rm(temporaryDirectory, { force: true, recursive: true }).catch(() => {})
  await rm(dumpPath, { force: true }).catch(() => {})
  if (selectiveSeedMediaOwned) {
    selectiveSeedMediaCleanupVerified = false
    for (const mediaPath of selectiveSeedMediaPaths) {
      await rm(mediaPath, { force: true }).catch(() => {})
    }
    const remainingMedia = []
    for (const mediaPath of selectiveSeedMediaPaths) {
      try {
        await access(mediaPath)
        remainingMedia.push(mediaPath)
      } catch (error) {
        if (
          !(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT')
        ) {
          remainingMedia.push(mediaPath)
        }
      }
    }
    const finalMediaFiles = await listSelectiveSeedMediaFiles().catch(() => null)
    selectiveSeedMediaCleanupVerified =
      remainingMedia.length === 0 &&
      finalMediaFiles !== null &&
      JSON.stringify(finalMediaFiles) === JSON.stringify(selectiveSeedMediaBaseline)
  }
  checks.push({
    attempts: cleanupAttempts,
    containerName,
    name: 'cleanup',
    selectiveSeedMedia: selectiveSeedMediaCleanupVerified ? 'absent' : 'unverified',
    status: cleanupVerified && selectiveSeedMediaCleanupVerified ? 'pass' : 'fail',
    verification: cleanupVerification,
  })
  await journal('cleanup', 'after', {
    attempts: cleanupAttempts,
    selectiveSeedMedia: selectiveSeedMediaCleanupVerified ? 'absent' : 'unverified',
    verification: cleanupVerification,
  }).catch(() => {})
  const failed = checks.some(({ status }) => status === 'fail')
  const terminalStatus = failed
    ? 'failed'
    : catalogLifecycleSession
      ? 'catalog-lifecycle-complete'
      : 'baseline-ready-catalog-pending'
  const result = await writeEvidence(terminalStatus)
  await journal('terminal-evidence', 'written', { status: terminalStatus }).catch(() => {})
  console.log(JSON.stringify({ evidencePath, journalPath, status: result.status }))
  process.exit(failed ? 1 : 0)
}
