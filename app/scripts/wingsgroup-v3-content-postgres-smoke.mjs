#!/usr/bin/env node

/* Process-isolated disposable PostgreSQL proof for governed WingsGroup media. */
import { createHash } from 'node:crypto'
import { spawn, spawnSync } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const container = `wings-content-smoke-${Date.now()}`
const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'wp-rel-27-media-'))
const runToken = path.basename(tempRoot)
const operationID = 'op-20260824-wingsgroup-v3-media-smoke'
const fixtureStems = [
  'wingsgroup-hero-discovery-guide',
  'wingsgroup-hero-private-consultation',
  'wingsgroup-hero-airport-welcome',
  'wingsgroup-hero-partner-meeting',
  'wingsgroup-ecosystem-hero',
  'wingsgroup-vietnam-discovery',
  'wingsgroup-airport-service',
  'wingsgroup-corporate-partnership',
  'wingsgroup-travel-support',
  'wingsgroup-journey-consultation',
  'wingsgroup-archive-01',
  'wingsgroup-archive-02',
  'wingsgroup-proof-archive-01',
]
const mediaDirectory = path.resolve(import.meta.dirname, '../public/media')
const manifestPath = path.join(tempRoot, 'manifest.json')
const statePath = path.join(tempRoot, 'phase-state.json')

const sh = (command, args, options = {}) => {
  const result = spawnSync(command, args, { encoding: 'utf8', ...options })
  return { status: result.status ?? -1, stdout: result.stdout || '', stderr: result.stderr || '' }
}

const run = (command, args, environment = process.env) =>
  new Promise((resolve) => {
    const child = spawn(command, args, { env: environment, stdio: ['ignore', 'pipe', 'pipe'] })
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
  throw new Error('Disposable PostgreSQL did not become ready after 60 health checks.')
}

const teardown = async () => {
  try {
    const state = JSON.parse(await readFile(statePath, 'utf8'))
    await Promise.all((state.generatedMedia || []).map((filename) => rm(filename, { force: true })))
  } catch {
    // Continue cleanup if a phase failed before writing state.
  }
  await rm(tempRoot, { force: true, recursive: true })
  sh('docker', ['rm', '-f', container])
}

const writeFixture = async () => {
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
      attachmentId: `wp-rel-24-fixture-${runToken}`,
      assetsDirectory: tempRoot,
      manifest: 'local-fixture',
    },
    version: 1,
  }
  const { default: sharp } = await import('sharp')
  for (let index = 0; index < fixtureStems.length; index += 1) {
    const file = `${fixtureStems[index]}-${runToken}.png`
    const bytes = await sharp({
      create: {
        background: { b: 203, g: 91, r: 17 + index * 13 },
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
  await writeFile(manifestPath, `${JSON.stringify(manifest)}\n`)
}

try {
  if (sh('docker', ['version', '--format', '{{.Server.Version}}']).status !== 0)
    throw new Error('Docker is unavailable.')
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
  const databaseURL = `postgresql://smoke:smoke@127.0.0.1:${port}/wings_content_smoke`
  const environment = {
    ...process.env,
    DATABASE_URL: databaseURL,
    NODE_ENV: 'test',
    PAYLOAD_DB_PUSH: 'false',
    PAYLOAD_SECRET: 'wp-rel-27-local-only',
    NODE_OPTIONS: '--no-deprecation',
    WP_REL_27_MANIFEST: manifestPath,
    WP_REL_27_MEDIA_DIRECTORY: mediaDirectory,
    WP_REL_27_OPERATION_ID: operationID,
    WP_REL_27_ROOT: tempRoot,
    WP_REL_27_STATE: statePath,
  }
  await writeFixture()
  const migrated = await run('pnpm', ['exec', 'payload', 'migrate'], environment)
  if (migrated.code !== 0) throw new Error('Payload migration failed on disposable PostgreSQL.')
  const phaseResults = []
  for (const phase of ['bootstrap', 'apply', 'publish', 'verify', 'content-rollback', 'content']) {
    const result = await run(
      'pnpm',
      ['exec', 'tsx', 'scripts/wingsgroup-v3-media-process-phase.mjs', phase],
      environment,
    )
    phaseResults.push({ phase, exitCode: result.code })
    if (result.code !== 0) throw new Error(`Process-isolated media phase failed: ${phase}`)
  }
  const proof = JSON.parse(await readFile(statePath, 'utf8'))
  if (
    proof.apply?.created !== 13 ||
    proof.publish?.localizedAltVerified !== 26 ||
    proof.publish?.responsiveDerivatives?.persisted !== 78 ||
    proof.publish?.publication !== 'published' ||
    proof.verify?.verified !== 13 ||
    proof.content?.routeCount !== 10 ||
    proof.content?.publishedLocales !== 16 ||
    proof.content?.firstWrites !== 20 ||
    proof.content?.secondWrites !== 20 ||
    proof.content?.formPresent !== true ||
    proof.contentRollback?.error !== 'WP-REL-35 induced mid-content-write failure.' ||
    proof.contentRollback?.pageWrites !== 1 ||
    proof.contentRollback?.formCount !== 0 ||
    proof.contentRollback?.pageCount !== 0 ||
    proof.contentRollback?.settingsUnchanged !== true
  )
    throw new Error(`Process-isolated media proof counts did not match: ${JSON.stringify(proof)}`)
  console.log(JSON.stringify({ phaseResults, proof, status: 'pass' }, null, 2))
} finally {
  await teardown()
}
