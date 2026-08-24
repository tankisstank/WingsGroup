#!/usr/bin/env node

/*
 * Disposable PostgreSQL integration proof for the governed WingsGroup content
 * importer. It creates only local synthetic fixture bytes and tears down both
 * the database container and generated media files before exiting.
 */
import { createHash } from 'node:crypto'
import { spawn, spawnSync } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const container = `wings-content-smoke-${Date.now()}`
const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'wp-rel-22-content-'))
const operationID = 'op-20260824-wingsgroup-v3-content-smoke'
const fixtureFiles = [
  'wingsgroup-hero-discovery-guide.png',
  'wingsgroup-hero-private-consultation.png',
  'wingsgroup-hero-airport-welcome.png',
  'wingsgroup-hero-partner-meeting.png',
  'wingsgroup-ecosystem-hero.png',
  'wingsgroup-vietnam-discovery.png',
  'wingsgroup-airport-service.png',
  'wingsgroup-corporate-partnership.png',
  'wingsgroup-travel-support.png',
  'wingsgroup-journey-consultation.png',
  'wingsgroup-archive-01.png',
  'wingsgroup-archive-02.png',
  'wingsgroup-proof-archive-01.png',
]
let databaseURL
let payload
const generatedMedia = new Set()

const sh = (command, args, options = {}) => {
  const result = spawnSync(command, args, { encoding: 'utf8', ...options })
  return { status: result.status ?? -1, stdout: result.stdout || '', stderr: result.stderr || '' }
}

const run = (command, args, environment = process.env) =>
  new Promise((resolve) => {
    const child = spawn(command, args, {
      env: environment,
      shell: process.platform === 'win32',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => {
      stdout += chunk
      process.stdout.write(chunk)
    })
    child.stderr.on('data', (chunk) => {
      stderr += chunk
      process.stderr.write(chunk)
    })
    child.on('close', (code) => resolve({ code: code ?? -1, stderr, stdout }))
  })

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')
const waitForPostgres = async () => {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const result = sh('docker', [
      'exec',
      container,
      'pg_isready',
      '-U',
      'smoke',
      '-d',
      'wings_content_smoke',
    ])
    if (result.status === 0 && /accepting connections/.test(result.stdout)) return
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
  const state = sh('docker', [
    'inspect',
    '--format',
    '{{.State.Status}} exit={{.State.ExitCode}} error={{.State.Error}}',
    container,
  ])
  const logs = sh('docker', ['logs', '--tail', '40', container])
  throw new Error(
    [
      'Disposable PostgreSQL did not become ready after 60 health checks.',
      `Container state: ${state.stdout.trim() || state.stderr.trim() || '<unavailable>'}`,
      `Container log tail:\n${logs.stdout.trim() || logs.stderr.trim() || '<empty>'}`,
    ].join('\n'),
  )
}

const teardown = async () => {
  const pool = payload?.db?.pool
  if (pool && typeof pool.end === 'function') {
    const idleClients = new Set((pool._idle || []).map(({ client }) => client))
    for (const client of pool._clients || []) {
      if (!idleClients.has(client) && typeof client.release === 'function') {
        try {
          client.release()
        } catch {
          // The disposable harness must continue cleanup if a client is already released.
        }
      }
    }
    await pool.end().catch(() => undefined)
  }
  if (payload) await payload.destroy().catch(() => undefined)
  await Promise.all([...generatedMedia].map((filename) => rm(filename, { force: true })))
  await rm(tempRoot, { force: true, recursive: true })
  sh('docker', ['rm', '-f', container])
}

const writeEnglishMediaLocaleFixture = async ({ alt, mediaID, payload, postgresAdapter }) => {
  const write = await payload.db.drizzle.execute(
    postgresAdapter.sql`
      INSERT INTO "media_locales" ("alt", "_locale", "_parent_id")
      VALUES (${alt}, 'en', ${mediaID})
      ON CONFLICT ("_locale", "_parent_id")
      DO UPDATE SET "alt" = EXCLUDED."alt"
    `,
  )
  if (write.rowCount !== 1)
    throw new Error(`EN media locale fixture write affected ${write.rowCount} rows.`)
  const rows = await payload.db.drizzle.execute(
    postgresAdapter.sql`
      SELECT "alt", "_locale", "_parent_id"
      FROM "media_locales"
      WHERE "_locale" = 'en' AND "_parent_id" = ${mediaID}
    `,
  )
  if (rows.rows.length !== 1 || rows.rows[0]?.alt !== alt || rows.rows[0]?._locale !== 'en') {
    throw new Error(`EN media locale fixture row is invalid: ${JSON.stringify(rows.rows[0])}`)
  }
}

try {
  if (sh('docker', ['version', '--format', '{{.Server.Version}}']).status !== 0) {
    throw new Error('Docker is unavailable for the disposable PostgreSQL proof.')
  }
  const started = sh('docker', [
    'run',
    '-d',
    '--name',
    container,
    '-e',
    'POSTGRES_USER=smoke',
    '-e',
    'POSTGRES_PASSWORD=smoke',
    '-e',
    'POSTGRES_DB=wings_content_smoke',
    '-p',
    '127.0.0.1::5432',
    '--tmpfs',
    '/var/lib/postgresql/data:rw,size=512m',
    'postgres:16-alpine',
  ])
  if (started.status !== 0) throw new Error(started.stderr.trim() || 'Could not start PostgreSQL.')
  await waitForPostgres()
  const port = sh('docker', ['port', container, '5432/tcp'])
    .stdout.trim()
    .match(/:(\d+)$/)?.[1]
  if (!port) throw new Error('Could not resolve disposable PostgreSQL port.')
  databaseURL = `postgresql://smoke:smoke@127.0.0.1:${port}/wings_content_smoke`
  const environment = {
    ...process.env,
    DATABASE_URL: databaseURL,
    NODE_ENV: 'test',
    PAYLOAD_DB_PUSH: 'false',
    PAYLOAD_SECRET: 'wp-rel-22-local-only',
    NODE_OPTIONS: '--no-deprecation',
  }
  const migrated = await run('pnpm', ['exec', 'payload', 'migrate'], environment)
  if (migrated.code !== 0) throw new Error('Payload migration failed on disposable PostgreSQL.')

  process.env.DATABASE_URL = databaseURL
  process.env.PAYLOAD_DB_PUSH = 'false'
  process.env.PAYLOAD_SECRET = 'wp-rel-22-local-only'
  process.env.NODE_ENV = 'test'
  const [
    { createLocalReq, getPayload, commitTransaction, initTransaction },
    sharpModule,
    content,
    media,
    mediaPlanHelpers,
    wingsGroupV3Fields,
    postgresAdapter,
  ] = await Promise.all([
    import('payload'),
    import('sharp'),
    import('./import-wingsgroup-v3-content.ts'),
    import('./import-wingsgroup-v3-media.ts'),
    import('./lib/wingsGroupV3MediaPlan.ts'),
    import('../src/fields/wingsGroupV3.ts'),
    import('@payloadcms/db-postgres'),
  ])
  const sharp = sharpModule.default
  payload = await getPayload({ config: (await import('../src/payload.config.ts')).default })
  const bootstrapReq = await createLocalReq(
    { context: { disableRevalidate: true, seed: true }, user: { id: 0, role: 'super-admin' } },
    payload,
  )
  const site = await payload.create({
    collection: 'sites',
    data: {
      code: 'wings-group',
      defaultLocale: 'vi',
      isActive: true,
      name: 'WingsGroup',
      primaryDomain: 'wingsgroup.test',
      supportedLocales: ['vi', 'en'],
    },
    overrideAccess: true,
    req: bootstrapReq,
  })
  const operator = await payload.create({
    collection: 'users',
    data: {
      email: 'wp-rel-22-operator@wingsgroup.test',
      name: 'WP-REL-22 operator',
      password: 'local-only-password',
      role: 'super-admin',
      sites: [site.id],
    },
    overrideAccess: true,
    req: bootstrapReq,
  })
  const req = await createLocalReq(
    { context: { disableRevalidate: true, seed: true }, user: operator },
    payload,
  )
  await payload.create({
    collection: 'site-settings',
    data: {
      branding: { logoText: 'WingsGroup', themeKey: 'wings-group' },
      site: site.id,
      siteName: 'WingsGroup',
    },
    overrideAccess: true,
    req,
  })

  const manifest = {
    licenseScope: 'Local integration fixture only.',
    media: [],
    publicationState: 'approved-for-production',
    rights: {
      evidence: 'Local integration fixture.',
      restriction: 'Local only.',
      state: 'approved',
    },
    siteCode: 'wings-group',
    sourcePackage: {
      archiveSha256: 'e'.repeat(64),
      attachmentId: 'wp-rel-22-fixture',
      assetsDirectory: tempRoot,
      manifest: 'local-fixture',
    },
    version: 1,
  }
  for (let index = 0; index < 13; index += 1) {
    const file = fixtureFiles[index]
    const bytes = await sharp({
      create: {
        background: { b: 40 + index, g: 80, r: 160 },
        channels: 3,
        height: 1024,
        width: 1536,
      },
    })
      .png()
      .toBuffer()
    await writeFile(path.join(tempRoot, file), bytes)
    manifest.media.push({
      actualDimensions: '1536x1024',
      alt: { en: `English fixture alt ${index}`, vi: `Mô tả fixture tiếng Việt ${index}` },
      dimensions: '1536x1024',
      file,
      focal: { x: 50, y: 50 },
      role: `fixture-${index}`,
      sha256: sha256(bytes),
      usageScope: 'editorial-service',
    })
  }
  const mediaManifest = mediaPlanHelpers.parseWingsGroupV3MediaManifest(manifest)
  const mediaPlan = await mediaPlanHelpers.buildWingsGroupV3MediaPlan({
    assetsDirectory: tempRoot,
    manifest: mediaManifest,
  })
  if (
    mediaPlan.errors.length ||
    mediaPlan.records.length !== 13 ||
    mediaPlan.records.reduce((count, record) => count + record.derivatives.length, 0) !== 78
  ) {
    throw new Error(
      'The integration fixture did not produce exactly 13 sources and 78 derivatives.',
    )
  }
  for (const record of mediaPlan.records) {
    const bytes = await readFile(path.join(tempRoot, record.sourceFile))
    const document = await payload.create({
      collection: 'media',
      context: { disableRevalidate: true, seed: true },
      data: media.buildWingsGroupV3MediaSeedData({
        manifest: mediaManifest,
        record,
        siteID: site.id,
      }),
      file: {
        data: bytes,
        mimetype: 'image/png',
        name: record.importFilename,
        size: bytes.byteLength,
      },
      locale: 'vi',
      overrideAccess: true,
      req,
    })
    for (const filename of [
      document.filename,
      ...Object.values(document.sizes || {}).map((size) => size?.filename),
    ].filter(Boolean))
      generatedMedia.add(path.resolve('public/media', filename))
    const ledger = await media.validateWingsGroupV3DerivativeLedger({
      document,
      mediaDirectory: media.WINGSGROUP_V3_MEDIA_DIRECTORY,
      publicOrigin: 'https://wingsgroup.test',
      record,
    })
    await writeEnglishMediaLocaleFixture({
      alt: record.alt.en,
      mediaID: document.id,
      payload,
      postgresAdapter,
    })
    await payload.update({
      collection: 'media',
      context: { disableRevalidate: true, seed: true },
      data: {
        governance: {
          ...media.buildWingsGroupV3MediaGovernance({ manifest: mediaManifest, record }),
          derivativeState: 'verified',
          publicationState: 'published',
          responsiveDerivatives: ledger,
        },
      },
      id: document.id,
      locale: 'vi',
      overrideAccess: true,
      req: {
        ...req,
        context: {
          ...req.context,
          ...wingsGroupV3Fields.createWingsGroupV3ProductionPublishContext(operationID),
        },
      },
    })
    await writeEnglishMediaLocaleFixture({
      alt: record.alt.en,
      mediaID: document.id,
      payload,
      postgresAdapter,
    })
  }
  const contentPlan = content.buildWingsGroupV3ContentPlan({ mediaPlan })
  const inventory = await content.readWingsGroupV3ContentInventory({
    manifest: mediaManifest,
    mediaPlan,
    payload,
    publicOrigin: 'https://wingsgroup.test',
    req,
    siteID: site.id,
  })
  const contentReq = await createLocalReq(
    { context: { disableRevalidate: true, seed: true }, user: operator },
    payload,
  )
  const transactionID = await initTransaction(contentReq)
  if (!transactionID) throw new Error('Content integration transaction did not start.')
  await content.applyWingsGroupV3Content({ inventory, payload, req: contentReq })
  await commitTransaction(contentReq)
  const postApply = await content.readWingsGroupV3ContentInventory({
    manifest: mediaManifest,
    mediaPlan,
    payload,
    publicOrigin: 'https://wingsgroup.test',
    req: contentReq,
    siteID: site.id,
  })
  const verification = content.verifyWingsGroupV3ContentInventory({
    formID: postApply.form.id,
    inventory: postApply,
  })
  if (verification.publishedLocales !== 16 || verification.routeCount !== 10)
    throw new Error('Content integration publication counts did not match the governed contract.')
  console.log(
    JSON.stringify({
      derivativeCount: 78,
      mediaCount: 13,
      planChecksum: contentPlan.contentChecksum,
      publishedLocales: verification.publishedLocales,
      routeCount: verification.routeCount,
      status: 'pass',
    }),
  )
} finally {
  await teardown()
}
