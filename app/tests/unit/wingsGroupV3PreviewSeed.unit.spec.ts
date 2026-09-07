import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { DatabaseSync } from 'node:sqlite'
import { pathToFileURL } from 'node:url'

import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

import {
  assertWingsGroupPreviewMediaPending,
  parseWingsGroupV3PreviewSeedCommand,
  WINGSGROUP_PREVIEW_MEDIA_FILENAMES,
} from '../../scripts/seed-wingsgroup-v3-home-preview'
import { startWingsGroupLocalPreviewStore } from '@/utilities/localPreviewStore'

const sourceRoot = path.resolve(process.cwd())
const seedScript = path.resolve(sourceRoot, 'scripts/seed-wingsgroup-v3-home-preview.ts')
const payloadConfig = pathToFileURL(path.resolve(sourceRoot, 'src/payload.config.ts')).href
type ChildResult = {
  error?: Error
  status: number | null
  stderr: string
  stdout: string
}

type PipelineBody = {
  results: Array<{
    response?: { result?: { rows: Array<Array<{ value?: unknown }>> } }
  }>
}

const runProcess = (
  args: string[],
  env: NodeJS.ProcessEnv,
  timeoutMs = 60000,
): Promise<ChildResult> =>
  new Promise((resolve) => {
    const child = spawn(process.execPath, args, {
      cwd: sourceRoot,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    let error: Error | undefined
    const timeout = setTimeout(() => {
      error = new Error('child process timed out')
      child.kill('SIGTERM')
    }, timeoutMs)
    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString()
    })
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString()
    })
    child.once('error', (value) => {
      error = value instanceof Error ? value : new Error(String(value))
    })
    child.once('close', (status) => {
      clearTimeout(timeout)
      resolve({ error, status, stderr, stdout })
    })
  })

const runNode = (source: string, env: NodeJS.ProcessEnv) =>
  runProcess(['--import=tsx/esm', '--input-type=module', '-e', source], env)

const createCurrentSchemaPreviewBaseline = async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'e09-preview-baseline-'))
  const database = path.join(root, 'e09-preview.db')
  const environment: NodeJS.ProcessEnv = {
    ...process.env,
    DATABASE_URL: `file:${database}`,
    NODE_ENV: 'test',
    NODE_NO_WARNINGS: '1',
    PAYLOAD_DB_PUSH: 'true',
    PAYLOAD_SECRET: 'e09-preview-current-schema-test-secret',
  }
  const bootstrap = await runNode(
    `
      const { createLocalReq, getPayload } = await import('payload')
      const { default: config } = await import(${JSON.stringify(payloadConfig)})
      const { ensureLocalAdminUser } = await import('./src/utilities/adminSeed')
      const payload = await getPayload({ config })
      try {
        const admin = await ensureLocalAdminUser(payload)
        const req = await createLocalReq({ user: admin }, payload)
        req.context = { disableRevalidate: true, seed: true }
        const site = await payload.create({
          collection: 'sites',
          overrideAccess: true,
          req,
          data: {
            code: 'wings-group',
            defaultLocale: 'vi',
            isActive: true,
            name: 'WingsGroup',
            primaryDomain: 'wingsgroup.local',
            supportedLocales: ['vi', 'en'],
          },
        })
        await payload.create({
          collection: 'site-settings',
          locale: 'vi',
          overrideAccess: true,
          req,
          data: {
            branding: { logoText: 'WingsGroup', themeKey: 'wings-group' },
            salesEmail: 'sales@wingsgroup.vn',
            seo: { canonicalDomain: 'https://wingsgroup.vn' },
            site: site.id,
            siteName: 'WingsGroup',
            supportEmail: 'info@wingsgroup.vn',
            supportPhone: '0912910101',
          },
        })
      } finally {
        await payload.destroy()
      }
    `,
    environment,
  )
  if (bootstrap.status !== 0) {
    fs.rmSync(root, { force: true, recursive: true })
    throw new Error(`Current-schema E09 baseline bootstrap failed: ${bootstrap.stderr}`)
  }
  return { database, root }
}

const previewEnvironment = (store: { token: string; url: string }): NodeJS.ProcessEnv => ({
  ...process.env,
  DATABASE_URL: store.url,
  E09_PREVIEW_MEDIA_SEED: 'true',
  E09_PREVIEW_STORE_TOKEN: store.token,
  E09_PREVIEW_STORE_URL: store.url,
  NODE_ENV: 'test',
  NODE_NO_WARNINGS: '1',
  PAYLOAD_SECRET: 'e09-correction-3-test-secret',
})

const pipeline = async (store: { token: string; url: string }, sql: string) => {
  const response = await fetch(`${store.url}/v2/pipeline`, {
    body: JSON.stringify({
      requests: [{ stmt: { sql, want_rows: true }, type: 'execute' }],
    }),
    headers: {
      authorization: `Bearer ${store.token}`,
      'content-type': 'application/json',
    },
    method: 'POST',
  })
  return { body: (await response.json()) as PipelineBody, status: response.status }
}

const pipelineValue = (body: PipelineBody): unknown =>
  body.results[0]?.response?.result?.rows[0]?.[0]?.value

const parseJSONOutput = <T>(stdout: string): T => {
  const jsonStart = stdout.indexOf('{')
  if (jsonStart < 0) throw new Error('Child emitted no JSON summary.')
  return JSON.parse(stdout.slice(jsonStart)) as T
}

const parseSeedSummary = (stdout: string) =>
  parseJSONOutput<{
    mediaSeed: { created?: number; reused?: number; verified: number }
  }>(stdout)

const createManifestFixture = async () => {
  const assetsDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'e09-preview-assets-'))
  const media = []
  for (const [index, filename] of WINGSGROUP_PREVIEW_MEDIA_FILENAMES.entries()) {
    const bytes = await sharp({
      create: {
        channels: 3,
        background: { b: index * 7, g: index * 11, r: index * 13 },
        height: 1,
        width: 1,
      },
    })
      .png()
      .toBuffer()
    fs.writeFileSync(path.join(assetsDirectory, filename), bytes)
    media.push({
      actualDimensions: '1x1',
      alt: { en: `English ${index}`, vi: `Tiếng Việt ${index}` },
      dimensions: '1x1',
      file: filename,
      focal: { x: 50, y: 50 },
      role: 'editorial-service',
      sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
      usageScope: 'editorial-service',
    })
  }
  const manifestPath = path.join(assetsDirectory, 'manifest.json')
  fs.writeFileSync(
    manifestPath,
    JSON.stringify({
      licenseScope: 'test-only',
      media,
      publicationState: 'pending-production',
      rights: { evidence: 'test', restriction: 'test', state: 'approved' },
      siteCode: 'wings-group',
      sourcePackage: {
        archiveSha256: 'a'.repeat(64),
        attachmentId: 'e09-correction-3-test',
        assetsDirectory: 'assets',
        manifest: 'manifest',
      },
      version: 1,
    }),
  )
  return { assetsDirectory, manifestPath }
}

describe('E09 local preview correction 3', () => {
  it('keeps all 13 governed editorial assets pending and rejects the old file contract', () => {
    const media = WINGSGROUP_PREVIEW_MEDIA_FILENAMES.map((sourceFilename) => ({
      governance: {
        managedBy: 'wingsgroup-v3',
        publicationState: 'pending',
        sourceFilename,
      },
    }))
    expect(() => assertWingsGroupPreviewMediaPending(media)).not.toThrow()
    expect(() =>
      assertWingsGroupPreviewMediaPending(
        media.map((item, index) =>
          index === 12
            ? { governance: { ...item.governance, publicationState: 'published' } }
            : item,
        ),
      ),
    ).toThrow(/remain pending/)

    expect(() => parseWingsGroupV3PreviewSeedCommand(['--apply'])).toThrow('--assets-dir')
    expect(
      parseWingsGroupV3PreviewSeedCommand([
        '--apply',
        '--assets-dir=/tmp/e09-preview-assets',
        '--manifest=/tmp/manifest.json',
      ]),
    ).toMatchObject({ apply: true })

    const isolationSource = fs.readFileSync(
      path.resolve(sourceRoot, 'src/utilities/localPreviewStore.ts'),
      'utf8',
    )
    const seedSource = fs.readFileSync(seedScript, 'utf8')
    expect(isolationSource).not.toContain('/proc/self/fd/')
    expect(isolationSource).not.toContain('e09-preview.db')
    expect(seedSource).not.toContain('previewCapability')
    expect(seedSource).not.toContain('E09_PREVIEW_ROOT_CAPABILITY')
  })

  it('reproduces the old DB/deleted-alias and media-leaf swap without an external mutation', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'e09-preview-'))
    const external = fs.mkdtempSync(path.join(os.tmpdir(), 'e09-preview-external-'))
    const externalDatabase = path.join(external, 'external.db')
    const externalMedia = path.join(external, 'external-media')
    const externalWal = `${externalDatabase}-wal`
    const externalShm = `${externalDatabase}-shm`
    fs.mkdirSync(path.join(root, 'media'))
    const preparedDatabase = path.join(root, 'e09-preview.db')
    const preparedDB = new DatabaseSync(preparedDatabase)
    preparedDB.exec('CREATE TABLE preparation(value TEXT);')
    preparedDB.close()
    const store = await startWingsGroupLocalPreviewStore({ baseDatabasePath: preparedDatabase })
    try {
      fs.mkdirSync(externalMedia)
      fs.writeFileSync(path.join(externalMedia, 'sentinel.txt'), 'media sentinel')
      const externalDB = new DatabaseSync(externalDatabase)
      externalDB.exec('PRAGMA journal_mode=WAL; CREATE TABLE sentinel(value TEXT);')
      externalDB.prepare('INSERT INTO sentinel VALUES (?)').run('database sentinel')
      externalDB.close()
      fs.writeFileSync(externalWal, 'wal sentinel')
      fs.writeFileSync(externalShm, 'shm sentinel')

      // These are the exact names the old /proc/self/fd SQLite consumer
      // re-resolved after its accepted DB leaf was unlinked.
      fs.rmSync(preparedDatabase)
      fs.symlinkSync(externalDatabase, path.join(root, 'e09-preview.db'))
      fs.symlinkSync(externalDatabase, path.join(root, 'e09-preview.db (deleted)'))
      fs.rmSync(path.join(root, 'media'), { recursive: true })
      fs.symlinkSync(externalMedia, path.join(root, 'media'), 'dir')

      const pragma = await pipeline(store, 'PRAGMA journal_mode=WAL;')
      const schema = await pipeline(
        store,
        "CREATE TABLE IF NOT EXISTS correction3_probe(value TEXT); INSERT INTO correction3_probe VALUES ('memory-only');",
      )
      expect(pragma.status).toBe(200)
      expect(pipelineValue(pragma.body)).toBe('memory')
      expect(schema.status).toBe(200)

      const mediaResponse = await fetch(`${store.url}/preview-media/proof.png`, {
        body: new Uint8Array([1, 2, 3]),
        headers: {
          authorization: `Bearer ${store.token}`,
          'content-type': 'image/png',
        },
        method: 'PUT',
      })
      expect(mediaResponse.status).toBe(204)
      expect(fs.readFileSync(path.join(externalMedia, 'sentinel.txt'), 'utf8')).toBe(
        'media sentinel',
      )
      expect(fs.readFileSync(externalWal, 'utf8')).toBe('wal sentinel')
      expect(fs.readFileSync(externalShm, 'utf8')).toBe('shm sentinel')
      expect(fs.existsSync(path.join(externalMedia, 'proof.png'))).toBe(false)
      const externalRead = new DatabaseSync(externalDatabase, { readOnly: true })
      try {
        expect(externalRead.prepare('SELECT COUNT(*) AS count FROM sentinel').get()?.count).toBe(1)
      } finally {
        externalRead.close()
      }
    } finally {
      await store.close()
      fs.rmSync(root, { force: true, recursive: true })
      fs.rmSync(external, { force: true, recursive: true })
    }
  })

  it('rejects malformed, forged, expired, and post-close authorization before mutation', async () => {
    const external = fs.mkdtempSync(path.join(os.tmpdir(), 'e09-preview-auth-external-'))
    const externalDatabase = path.join(external, 'external.db')
    const store = await startWingsGroupLocalPreviewStore({ ttlMs: 0 })
    try {
      for (const token of ['', 'forged', `${store.token.slice(0, -1)}0`]) {
        const response = await fetch(`${store.url}/v2/pipeline`, {
          body: JSON.stringify({
            requests: [{ stmt: { sql: 'CREATE TABLE mutation(value TEXT)' }, type: 'execute' }],
          }),
          headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
          method: 'POST',
        })
        expect(response.status).toBe(401)
      }
      expect((await pipeline({ ...store }, 'SELECT 1')).status).toBe(401)
      expect(fs.existsSync(externalDatabase)).toBe(false)
    } finally {
      await store.close()
      fs.rmSync(external, { force: true, recursive: true })
    }

    const reused = await startWingsGroupLocalPreviewStore()
    const oldURL = reused.url
    const oldToken = reused.token
    await reused.close()
    await expect(
      fetch(`${oldURL}/v2/pipeline`, { headers: { authorization: `Bearer ${oldToken}` } }),
    ).rejects.toThrow()
  })

  it('runs the actual fresh seed twice without exposing the store token, then boots a distinct Payload process', async () => {
    const baseline = await createCurrentSchemaPreviewBaseline()
    const fixture = await createManifestFixture()
    const mediaParent = fs.mkdtempSync(path.join(os.tmpdir(), 'e09-preview-media-leaf-'))
    const mediaRoot = path.join(mediaParent, 'media')
    const externalMediaRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'e09-preview-media-target-'))
    fs.writeFileSync(path.join(externalMediaRoot, 'sentinel.txt'), 'external media sentinel')
    fs.symlinkSync(externalMediaRoot, mediaRoot, 'dir')
    const store = await startWingsGroupLocalPreviewStore({ baseDatabasePath: baseline.database })
    const environment = previewEnvironment(store)
    environment.E09_PREVIEW_MEDIA_DIRECTORY = mediaRoot
    try {
      const seedArgs = [
        '--import=tsx/esm',
        seedScript,
        '--apply',
        `--assets-dir=${fixture.assetsDirectory}`,
        `--manifest=${fixture.manifestPath}`,
      ]
      const first = await runProcess(seedArgs, environment)
      expect(
        first.status,
        JSON.stringify({ error: first.error?.message, stderr: first.stderr, stdout: first.stdout }),
      ).toBe(0)
      expect(`${first.stdout}\n${first.stderr}`).not.toContain(store.token)
      const firstSummary = parseSeedSummary(first.stdout)
      expect(firstSummary.mediaSeed).toMatchObject({ created: 13, verified: 13 })

      const second = await runProcess(seedArgs, environment)
      expect(second.status, second.stderr).toBe(0)
      expect(`${second.stdout}\n${second.stderr}`).not.toContain(store.token)
      const secondSummary = parseSeedSummary(second.stdout)
      expect(secondSummary.mediaSeed).toMatchObject({ reused: 13, verified: 13 })

      const server = await runNode(
        `
          const { createLocalReq, getPayload } = await import('payload')
          const { default: config } = await import(${JSON.stringify(payloadConfig)})
          const payload = await getPayload({ config })
          const operators = await payload.find({ collection: 'users', depth: 0, limit: 1, overrideAccess: true, pagination: false, where: { role: { equals: 'super-admin' } } })
          const operator = operators.docs[0]
          if (!operator) throw new Error('real Payload server found no local operator')
          const req = await createLocalReq({ user: operator }, payload)
          const result = await payload.find({ collection: 'media', depth: 0, limit: 30, pagination: false, req })
          const media = result.docs.filter((doc) => doc.governance?.managedBy === 'wingsgroup-v3')
          const filename = media[0]?.filename
          if (!filename) throw new Error('real Payload server found no governed media')
          const mediaCollection = payload.config.collections.find((collection) => collection.slug === 'media')
          const response = await mediaCollection.upload.handlers[0]({}, { doc: media[0], params: { collection: 'media', filename } })
          console.log(JSON.stringify({ count: media.length, status: response.status, bytes: (await response.arrayBuffer()).byteLength }))
          await payload.destroy()
        `,
        environment,
      )
      expect(server.status, server.stderr).toBe(0)
      expect(parseJSONOutput(server.stdout)).toMatchObject({ count: 13, status: 200 })

      const denied = await runNode(
        `
          const response = await fetch(${JSON.stringify(`${store.url}/v2/pipeline`)}, {
            body: JSON.stringify({ requests: [{ stmt: { sql: 'INSERT INTO media (filename) VALUES (\\'unauthorized\\')' }, type: 'execute' }] }),
            headers: { 'content-type': 'application/json' },
            method: 'POST',
          })
          console.log(JSON.stringify({ status: response.status }))
        `,
        { ...environment, E09_PREVIEW_STORE_TOKEN: '' },
      )
      expect(denied.status, denied.stderr).toBe(0)
      expect(parseJSONOutput(denied.stdout)).toMatchObject({ status: 401 })

      const remaining = await pipeline(
        store,
        "SELECT COUNT(*) AS count FROM media WHERE governance_managed_by = 'wingsgroup-v3'",
      )
      expect(remaining.status).toBe(200)
      expect(pipelineValue(remaining.body)).toBe('13')

      const media = await fetch(`${store.url}/preview-media/wg-v3-test.png`, {
        headers: { authorization: `Bearer ${store.token}` },
      })
      expect(media.status).toBe(404)
      expect(fs.readFileSync(path.join(externalMediaRoot, 'sentinel.txt'), 'utf8')).toBe(
        'external media sentinel',
      )
      expect(fs.readdirSync(externalMediaRoot)).toEqual(['sentinel.txt'])
    } finally {
      await store.close()
      fs.rmSync(baseline.root, { force: true, recursive: true })
      fs.rmSync(fixture.assetsDirectory, { force: true, recursive: true })
      fs.rmSync(mediaParent, { force: true, recursive: true })
      fs.rmSync(externalMediaRoot, { force: true, recursive: true })
    }
  }, 120000)
})
