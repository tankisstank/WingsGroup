import os from 'node:os'
import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { DatabaseSync } from 'node:sqlite'
import { pathToFileURL } from 'node:url'

import { describe, expect, it, vi } from 'vitest'

import {
  assertWingsGroupPreviewMediaPending,
  parseWingsGroupV3PreviewSeedCommand,
  WINGSGROUP_PREVIEW_MEDIA_FILENAMES,
} from '../../scripts/seed-wingsgroup-v3-home-preview'
import { seedWingsGroupV3PreviewMedia } from '../../scripts/lib/wingsGroupV3PreviewMediaSeed'
import {
  prepareWingsGroupLocalPreviewIsolation,
  releaseWingsGroupLocalPreviewIsolation,
} from '@/utilities/localPreviewIsolation'
import { resolveLocalDatabaseURL } from '@/utilities/localDatabase'
import { resolveWingsGroupLocalPreviewMediaDirectory } from '@/utilities/localPreviewMedia'
import { repairLocalSQLiteSchema } from '@/utilities/repairLocalSQLiteSchema'
import type {
  WingsGroupV3MediaManifest,
  WingsGroupV3MediaPlan,
  WingsGroupV3MediaPlanItem,
} from '../../scripts/lib/wingsGroupV3MediaPlan'

type PreviewSeedRecord = Pick<
  WingsGroupV3MediaPlanItem,
  'alt' | 'focal' | 'sourceFile' | 'sourceFileSha256' | 'sourceIdentity'
> & { site?: number | string }

type PreviewSeedManifest = Pick<WingsGroupV3MediaManifest, 'sourcePackage'>

type FakeMediaDocument = {
  filename: string
  governance: Record<string, unknown>
  height: number
  id: number
  site: number
  width: number
}

type FakePayloadData = {
  governance?: Record<string, unknown>
  site?: number
}

type FakeWhereClause = Record<string, { equals?: string } | undefined>

type FakePayloadArgs = {
  data?: FakePayloadData
  file?: { name: string }
  id?: number
  where?: FakeWhereClause & { and?: FakeWhereClause[] }
}

vi.mock('../../scripts/import-wingsgroup-v3-media', () => ({
  buildWingsGroupV3MediaSeedData: ({
    manifest,
    record,
    siteID,
  }: {
    manifest: PreviewSeedManifest
    record: PreviewSeedRecord
    siteID: number | string
  }) => ({
    alt: record.alt.vi,
    focalX: record.focal.x,
    focalY: record.focal.y,
    governance: {
      managedBy: 'wingsgroup-v3',
      publicationState: 'pending',
      sourceFilename: record.sourceFile,
      sourceIdentity: record.sourceIdentity,
      sourceFileSha256: record.sourceFileSha256,
      sourceArchiveSha256: manifest.sourcePackage.archiveSha256,
    },
    site: siteID,
  }),
}))

const pendingMedia = (sourceFilename: string) => ({
  governance: {
    managedBy: 'wingsgroup-v3',
    publicationState: 'pending',
    sourceFilename,
  },
})

describe('E09-20 local preview seed', () => {
  it('keeps all 13 governed editorial assets pending', () => {
    const media = WINGSGROUP_PREVIEW_MEDIA_FILENAMES.map(pendingMedia)

    expect(() => assertWingsGroupPreviewMediaPending(media)).not.toThrow()
    expect(() =>
      assertWingsGroupPreviewMediaPending([
        ...media.slice(0, -1),
        pendingMedia(WINGSGROUP_PREVIEW_MEDIA_FILENAMES.at(-1)!),
      ]),
    ).not.toThrow()
    expect(() =>
      assertWingsGroupPreviewMediaPending([
        ...media.slice(0, -1),
        {
          governance: {
            managedBy: 'wingsgroup-v3',
            publicationState: 'published',
            sourceFilename: WINGSGROUP_PREVIEW_MEDIA_FILENAMES.at(-1),
          },
        },
      ]),
    ).toThrow(/remain pending/)
  })

  it('uses the draft page path and contains no media promotion mutation', () => {
    const source = fs.readFileSync(
      path.resolve(process.cwd(), 'scripts/seed-wingsgroup-v3-home-preview.ts'),
      'utf8',
    )

    expect(source).toContain("_status: 'draft'")
    expect(source).toContain('WINGSGROUP_LOCAL_DRAFT_PREVIEW_CONTEXT')
    expect(source).not.toContain("publicationState: 'published'")
    expect(source).toContain('E09_PREVIEW_MEDIA_SEED')
    expect(source).toContain('seedWingsGroupV3PreviewMedia')
  })

  it('requires explicit assets and a newly created preview database', () => {
    expect(() => parseWingsGroupV3PreviewSeedCommand(['--apply'])).toThrow('--assets-dir')
    expect(
      parseWingsGroupV3PreviewSeedCommand([
        '--apply',
        '--assets-dir=/tmp/e09-preview-assets',
        '--manifest=/tmp/manifest.json',
      ]),
    ).toMatchObject({
      apply: true,
      assetsDirectory: '/tmp/e09-preview-assets',
      manifestPath: '/tmp/manifest.json',
    })
    expect(() =>
      prepareWingsGroupLocalPreviewIsolation({
        databaseURL: 'file:./e09-preview.db',
        mediaDirectory: './media',
      }),
    ).toThrow(/direct \/tmp or \/dev\/shm/)

    const preExistingRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'e09-preview-preexisting-'))
    try {
      expect(() =>
        prepareWingsGroupLocalPreviewIsolation({
          databaseURL: `file:${path.join(preExistingRoot, 'e09-preview.db')}`,
          mediaDirectory: path.join(preExistingRoot, 'media'),
        }),
      ).toThrow(/capability|already exists|created exclusively/)
    } finally {
      fs.rmSync(preExistingRoot, { recursive: true, force: true })
    }
  })

  it('rejects a copied valid marker without the out-of-band capability before consumers mutate', () => {
    const sourceRoot = path.join(os.tmpdir(), `e09-preview-${randomUUID()}`)
    const forgedRoot = path.join(os.tmpdir(), `e09-preview-${randomUUID()}`)
    const sourceDatabaseURL = `file:${path.join(sourceRoot, 'e09-preview.db')}`
    const sourceMediaDirectory = path.join(sourceRoot, 'media')
    const forgedDatabaseURL = `file:${path.join(forgedRoot, 'e09-preview.db')}`
    const forgedMediaDirectory = path.join(forgedRoot, 'media')
    let payloadImport = 0
    let schemaRepair = 0
    let payloadWrite = 0

    try {
      const source = prepareWingsGroupLocalPreviewIsolation({
        databaseURL: sourceDatabaseURL,
        mediaDirectory: sourceMediaDirectory,
      })
      const marker = fs.readFileSync(path.join(sourceRoot, '.e09-preview-root.json'), 'utf8')
      releaseWingsGroupLocalPreviewIsolation(source.rootPath)

      fs.mkdirSync(forgedRoot, { mode: 0o700 })
      fs.writeFileSync(path.join(forgedRoot, '.e09-preview-root.json'), marker, { mode: 0o600 })

      expect(() => {
        const isolation = prepareWingsGroupLocalPreviewIsolation({
          databaseURL: forgedDatabaseURL,
          mediaDirectory: forgedMediaDirectory,
        })
        payloadImport += 1
        schemaRepair += 1
        payloadWrite += 1
        return isolation
      }).toThrow(/capability|authenticate|current/)
      expect({ payloadImport, schemaRepair, payloadWrite }).toEqual({
        payloadImport: 0,
        schemaRepair: 0,
        payloadWrite: 0,
      })
      expect(fs.existsSync(path.join(forgedRoot, 'e09-preview.db'))).toBe(false)
      expect(fs.existsSync(forgedMediaDirectory)).toBe(false)
    } finally {
      releaseWingsGroupLocalPreviewIsolation(sourceRoot)
      releaseWingsGroupLocalPreviewIsolation(forgedRoot)
      fs.rmSync(sourceRoot, { recursive: true, force: true })
      fs.rmSync(forgedRoot, { recursive: true, force: true })
    }
  })

  it('rejects arbitrary preview media directories and production preview configuration', () => {
    const environment = process.env as Record<string, string | undefined>
    const originalNodeEnv = environment.NODE_ENV
    const originalSeedFlag = environment.E09_PREVIEW_MEDIA_SEED
    environment.E09_PREVIEW_MEDIA_SEED = 'true'
    expect(() => resolveWingsGroupLocalPreviewMediaDirectory('/tmp/not-e09/media')).toThrow(
      /e09-preview|exclusive|DATABASE_URL/,
    )

    delete environment.E09_PREVIEW_MEDIA_DIRECTORY
    expect(() => resolveWingsGroupLocalPreviewMediaDirectory()).toThrow(/public\/media/)

    environment.NODE_ENV = 'production'
    try {
      expect(() =>
        resolveWingsGroupLocalPreviewMediaDirectory('/tmp/e09-preview-production/media'),
      ).toThrow(/non-production/)
    } finally {
      if (originalNodeEnv === undefined) delete environment.NODE_ENV
      else environment.NODE_ENV = originalNodeEnv
      if (originalSeedFlag === undefined) delete environment.E09_PREVIEW_MEDIA_SEED
      else environment.E09_PREVIEW_MEDIA_SEED = originalSeedFlag
    }
  })

  it('rejects symlinked preview roots and media/database leaves before mutation', () => {
    const outsideRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'e09-unowned-target-'))
    const symlinkedRoot = path.join(os.tmpdir(), `e09-preview-${randomUUID()}`)
    const databaseURL = `file:${path.join(symlinkedRoot, 'e09-preview.db')}`
    const mediaDirectory = path.join(symlinkedRoot, 'media')
    let payloadMutations = 0
    const environment = process.env as Record<string, string | undefined>
    const originalCapability = environment.E09_PREVIEW_ROOT_CAPABILITY

    try {
      fs.symlinkSync(outsideRoot, symlinkedRoot, 'dir')
      expect(() => {
        const isolation = prepareWingsGroupLocalPreviewIsolation({
          databaseURL,
          mediaDirectory,
        })
        payloadMutations += 1
        return isolation
      }).toThrow(/symlink/)
      expect(payloadMutations).toBe(0)
      expect(fs.existsSync(path.join(outsideRoot, 'e09-preview.db'))).toBe(false)

      fs.rmSync(symlinkedRoot, { force: true })
      const owned = prepareWingsGroupLocalPreviewIsolation({ databaseURL, mediaDirectory })
      environment.E09_PREVIEW_ROOT_CAPABILITY = owned.capability
      releaseWingsGroupLocalPreviewIsolation(owned.rootPath)

      const mediaSentinel = path.join(outsideRoot, 'media-sentinel.txt')
      fs.writeFileSync(mediaSentinel, 'untouched')
      fs.rmSync(mediaDirectory, { recursive: true, force: true })
      fs.symlinkSync(outsideRoot, mediaDirectory, 'dir')
      expect(() => {
        const isolation = prepareWingsGroupLocalPreviewIsolation({
          databaseURL,
          mediaDirectory,
        })
        payloadMutations += 1
        return isolation
      }).toThrow(/symlink/)
      expect(payloadMutations).toBe(0)
      expect(fs.readFileSync(mediaSentinel, 'utf8')).toBe('untouched')

      fs.rmSync(mediaDirectory, { force: true })
      fs.mkdirSync(mediaDirectory, { mode: 0o700 })
      fs.chmodSync(mediaDirectory, 0o700)
      fs.rmSync(path.join(symlinkedRoot, 'e09-preview.db'), { force: true })
      fs.symlinkSync(outsideRoot, path.join(symlinkedRoot, 'e09-preview.db'), 'file')
      expect(() => prepareWingsGroupLocalPreviewIsolation({ databaseURL, mediaDirectory })).toThrow(
        /symlink/,
      )
      expect(payloadMutations).toBe(0)
      expect(fs.existsSync(path.join(outsideRoot, 'e09-preview.db'))).toBe(false)
    } finally {
      if (originalCapability === undefined) delete environment.E09_PREVIEW_ROOT_CAPABILITY
      else environment.E09_PREVIEW_ROOT_CAPABILITY = originalCapability
      releaseWingsGroupLocalPreviewIsolation(symlinkedRoot)
      fs.rmSync(symlinkedRoot, { recursive: true, force: true })
      fs.rmSync(outsideRoot, { recursive: true, force: true })
    }
  })

  it('keeps SQLite and Payload descriptor consumers safe after leaf symlink replacement', async () => {
    const rootPath = path.join(os.tmpdir(), `e09-preview-${randomUUID()}`)
    const databaseURL = `file:${path.join(rootPath, 'e09-preview.db')}`
    const mediaDirectory = path.join(rootPath, 'media')
    const outsideRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'e09-preview-external-'))
    const outsideDatabase = path.join(outsideRoot, 'external.db')
    const outsideMedia = path.join(outsideRoot, 'external-media')
    const environment = process.env as Record<string, string | undefined>
    const originals = {
      capability: environment.E09_PREVIEW_ROOT_CAPABILITY,
      databaseURL: environment.DATABASE_URL,
      mediaDirectory: environment.E09_PREVIEW_MEDIA_DIRECTORY,
      mediaSeed: environment.E09_PREVIEW_MEDIA_SEED,
      nodeEnv: environment.NODE_ENV,
    }

    try {
      environment.DATABASE_URL = databaseURL
      environment.E09_PREVIEW_MEDIA_DIRECTORY = mediaDirectory
      environment.E09_PREVIEW_MEDIA_SEED = 'true'
      environment.NODE_ENV = 'test'
      fs.writeFileSync(outsideDatabase, 'external database must remain unchanged')
      fs.mkdirSync(outsideMedia)
      fs.writeFileSync(
        path.join(outsideMedia, 'sentinel.txt'),
        'external media must remain unchanged',
      )

      const isolation = prepareWingsGroupLocalPreviewIsolation({ databaseURL, mediaDirectory })
      expect(isolation.databasePath).toMatch(/^\/proc\/self\/fd\/\d+$/)
      expect(isolation.mediaDirectory).toMatch(/^\/proc\/self\/fd\/\d+$/)

      fs.rmSync(mediaDirectory, { recursive: true, force: true })
      fs.symlinkSync(outsideMedia, mediaDirectory, 'dir')
      fs.rmSync(path.join(rootPath, 'e09-preview.db'), { force: true })
      fs.symlinkSync(outsideDatabase, path.join(rootPath, 'e09-preview.db'), 'file')

      const payloadStaticDir = resolveWingsGroupLocalPreviewMediaDirectory(mediaDirectory)
      expect(payloadStaticDir).toBe(isolation.mediaDirectory)
      await repairLocalSQLiteSchema(resolveLocalDatabaseURL(isolation.databaseURL))
      const database = new DatabaseSync(isolation.databasePath)
      try {
        database.exec('CREATE TABLE IF NOT EXISTS descriptor_consumer_proof (value TEXT);')
      } finally {
        database.close()
      }

      expect(() =>
        fs.writeFileSync(path.join(payloadStaticDir, 'must-not-escape.txt'), 'descriptor-safe'),
      ).toThrow()
      expect(fs.readFileSync(outsideDatabase, 'utf8')).toBe(
        'external database must remain unchanged',
      )
      expect(fs.readFileSync(path.join(outsideMedia, 'sentinel.txt'), 'utf8')).toBe(
        'external media must remain unchanged',
      )
      expect(fs.existsSync(path.join(outsideMedia, 'must-not-escape.txt'))).toBe(false)
    } finally {
      if (originals.capability === undefined) delete environment.E09_PREVIEW_ROOT_CAPABILITY
      else environment.E09_PREVIEW_ROOT_CAPABILITY = originals.capability
      if (originals.databaseURL === undefined) delete environment.DATABASE_URL
      else environment.DATABASE_URL = originals.databaseURL
      if (originals.mediaDirectory === undefined) delete environment.E09_PREVIEW_MEDIA_DIRECTORY
      else environment.E09_PREVIEW_MEDIA_DIRECTORY = originals.mediaDirectory
      if (originals.mediaSeed === undefined) delete environment.E09_PREVIEW_MEDIA_SEED
      else environment.E09_PREVIEW_MEDIA_SEED = originals.mediaSeed
      if (originals.nodeEnv === undefined) delete environment.NODE_ENV
      else environment.NODE_ENV = originals.nodeEnv
      releaseWingsGroupLocalPreviewIsolation(rootPath)
      fs.rmSync(rootPath, { recursive: true, force: true })
      fs.rmSync(outsideRoot, { recursive: true, force: true })
    }
  })

  it('supports separate seed/server handoff only with the authenticated capability', () => {
    const rootPath = path.join(os.tmpdir(), `e09-preview-${randomUUID()}`)
    const databaseURL = `file:${path.join(rootPath, 'e09-preview.db')}`
    const mediaDirectory = path.join(rootPath, 'media')
    const isolationURL = pathToFileURL(
      path.resolve(process.cwd(), 'src/utilities/localPreviewIsolation.ts'),
    ).href
    const payloadConfigURL = pathToFileURL(
      path.resolve(process.cwd(), 'src/payload.config.ts'),
    ).href
    const childSource = `
      import fs from 'node:fs'
      import path from 'node:path'
      import { DatabaseSync } from 'node:sqlite'
      import {
        prepareWingsGroupLocalPreviewIsolation,
        releaseWingsGroupLocalPreviewIsolation,
      } from ${JSON.stringify(isolationURL)}

      const isolation = prepareWingsGroupLocalPreviewIsolation({
        databaseURL: ${JSON.stringify(databaseURL)},
        mediaDirectory: ${JSON.stringify(mediaDirectory)},
      })
      if (process.env.HANDOFF_MODE === 'server') {
        const { default: payloadConfigPromise } = await import(${JSON.stringify(payloadConfigURL)})
        const payloadConfig = await payloadConfigPromise
        const mediaCollection = payloadConfig.collections.find((collection) => collection.slug === 'media')
        const staticDir = mediaCollection?.upload?.staticDir
        if (typeof staticDir !== 'string' || !/^\\/proc\\/self\\/fd\\/\\d+$/.test(staticDir))
          throw new Error('Payload config did not retain a descriptor-backed media consumer')
      }
      const database = new DatabaseSync(isolation.databasePath)
      database.exec('CREATE TABLE IF NOT EXISTS process_handoff (value TEXT);')
      database.close()
      fs.writeFileSync(path.join(isolation.mediaDirectory, process.env.HANDOFF_MODE + '.txt'), 'safe')
      console.log(JSON.stringify({
        capability: isolation.capability,
        capabilityExpiresAt: isolation.capabilityExpiresAt,
        databasePath: isolation.databasePath,
        mediaDirectory: isolation.mediaDirectory,
      }))
      releaseWingsGroupLocalPreviewIsolation(isolation.rootPath)
    `
    const runChild = (mode: 'seed' | 'server', capability?: string) => {
      const childEnvironment: Record<string, string | undefined> = {
        ...process.env,
        DATABASE_URL: databaseURL,
        E09_PREVIEW_MEDIA_DIRECTORY: mediaDirectory,
        E09_PREVIEW_MEDIA_SEED: 'true',
        HANDOFF_MODE: mode,
        NODE_ENV: 'test',
        NODE_NO_WARNINGS: '1',
      }
      if (capability === undefined) delete childEnvironment.E09_PREVIEW_ROOT_CAPABILITY
      else childEnvironment.E09_PREVIEW_ROOT_CAPABILITY = capability
      return spawnSync(
        process.execPath,
        ['--import=tsx/esm', '--input-type=module', '-e', childSource],
        {
          cwd: process.cwd(),
          encoding: 'utf8',
          env: childEnvironment as NodeJS.ProcessEnv,
        },
      )
    }

    try {
      const first = runChild('seed')
      expect(first.status, first.stderr).toBe(0)
      const firstResult = JSON.parse(first.stdout.trim()) as {
        capability: string
        capabilityExpiresAt: number
      }
      expect(firstResult.capability).toMatch(/^[a-f0-9]{64}$/)
      expect(firstResult.capabilityExpiresAt).toBeGreaterThan(Date.now())

      const second = runChild('server', firstResult.capability)
      expect(second.status, second.stderr).toBe(0)
      const secondResult = JSON.parse(second.stdout.trim()) as {
        capability: string
        databasePath: string
        mediaDirectory: string
      }
      expect(secondResult.capability).toBe(firstResult.capability)
      expect(secondResult.databasePath).toMatch(/^\/proc\/self\/fd\/\d+$/)
      expect(secondResult.mediaDirectory).toMatch(/^\/proc\/self\/fd\/\d+$/)
      expect(fs.existsSync(path.join(mediaDirectory, 'seed.txt'))).toBe(true)
      expect(fs.existsSync(path.join(mediaDirectory, 'server.txt'))).toBe(true)

      const denied = runChild('server')
      expect(denied.status).not.toBe(0)
      expect(`${denied.stdout}\n${denied.stderr}`).toMatch(/capability|authenticate/)
    } finally {
      releaseWingsGroupLocalPreviewIsolation(rootPath)
      fs.rmSync(rootPath, { recursive: true, force: true })
    }
  }, 15000)

  it('creates and reuses 13 governed pending media records in one fresh fixture', async () => {
    const rootPath = path.join(os.tmpdir(), `e09-preview-${randomUUID()}`)
    const databaseURL = `file:${path.join(rootPath, 'e09-preview.db')}`
    const mediaDirectory = path.join(rootPath, 'media')
    const assetsDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'e09-preview-assets-'))
    const environment = process.env as Record<string, string | undefined>
    const originals = {
      databaseURL: environment.DATABASE_URL,
      mediaDirectory: environment.E09_PREVIEW_MEDIA_DIRECTORY,
      mediaSeed: environment.E09_PREVIEW_MEDIA_SEED,
      nodeEnv: environment.NODE_ENV,
    }

    const records = WINGSGROUP_PREVIEW_MEDIA_FILENAMES.map((sourceFile, index) => ({
      alt: { en: `English ${index}`, vi: `Tiếng Việt ${index}` },
      derivatives: [],
      focal: { x: 50, y: 50 },
      importFilename: `import-${index}.png`,
      role: 'editorial-service',
      sourceDimensions: { height: 1, width: 1 },
      sourceFile,
      sourceFileSha256: `${String(index).padStart(2, '0')}`.repeat(32),
      sourceIdentity: `preview-test:${index}`,
      usageScope: 'editorial-service' as const,
    }))
    const manifest = {
      licenseScope: 'test-only',
      publicationState: 'pending-production',
      rights: { evidence: 'test', restriction: 'test', state: 'approved' },
      sourcePackage: {
        archiveSha256: 'a'.repeat(64),
        attachmentId: 'preview-test',
        assetsDirectory: 'assets',
        manifest: 'manifest',
      },
    } as unknown as WingsGroupV3MediaManifest
    const plan = {
      archiveSha256: 'a'.repeat(64),
      attachmentId: 'preview-test',
      errors: [],
      planChecksum: 'test',
      planned: records.length,
      records,
      siteCode: 'wings-group',
    } as unknown as WingsGroupV3MediaPlan
    const documents = new Map<string, FakeMediaDocument>()
    const payload = {
      create: async ({ data, file }: FakePayloadArgs) => {
        if (!data?.governance || data.site === undefined || !file) {
          throw new Error('Incomplete fake media create')
        }
        const document = {
          governance: data.governance,
          height: 1,
          id: documents.size + 1,
          site: data.site,
          width: 1,
          filename: file.name,
        }
        const sourceIdentity = data.governance.sourceIdentity
        if (typeof sourceIdentity !== 'string') throw new Error('Missing fake source identity')
        documents.set(sourceIdentity, document)
        return document
      },
      delete: async ({ id }: FakePayloadArgs) => {
        if (id === undefined) throw new Error('Missing fake media id')
        for (const [identity, document] of documents) {
          if (document.id === id) documents.delete(identity)
        }
      },
      find: async ({ where }: FakePayloadArgs) => {
        const clauses: FakeWhereClause[] = Array.isArray(where?.and)
          ? where.and
          : where
            ? [where]
            : []
        const identityClause = clauses.find((clause) => clause?.['governance.sourceIdentity'])
        const identity = identityClause?.['governance.sourceIdentity']?.equals
        const document = identity ? documents.get(identity) : undefined
        return { docs: document ? [document] : [] }
      },
      update: async ({ id, data }: FakePayloadArgs) => {
        if (id === undefined) throw new Error('Missing fake media id')
        const document = [...documents.values()].find((value) => value.id === id)
        if (!document) throw new Error(`Unknown test media ${id}`)
        if (data?.governance) document.governance = data.governance
        return document
      },
    }

    try {
      environment.DATABASE_URL = databaseURL
      environment.E09_PREVIEW_MEDIA_DIRECTORY = mediaDirectory
      environment.E09_PREVIEW_MEDIA_SEED = 'true'
      environment.NODE_ENV = 'test'
      for (const record of records)
        fs.writeFileSync(path.join(assetsDirectory, record.sourceFile), 'x')

      const isolation = prepareWingsGroupLocalPreviewIsolation({
        databaseURL,
        mediaDirectory,
      })
      const first = await seedWingsGroupV3PreviewMedia({
        assetsDirectory,
        manifest,
        mediaDirectory: isolation.mediaDirectory,
        payload: payload as never,
        plan,
        req: {} as never,
        siteID: 1,
      })
      const second = await seedWingsGroupV3PreviewMedia({
        assetsDirectory,
        manifest,
        mediaDirectory: isolation.mediaDirectory,
        payload: payload as never,
        plan,
        req: {} as never,
        siteID: 1,
      })

      expect(first).toMatchObject({ created: 13, reused: 0, verified: 13 })
      expect(second).toMatchObject({ created: 0, reused: 13, verified: 13 })
      expect(documents).toHaveLength(13)
      expect(
        [...documents.values()].every(
          (document) => document.governance.publicationState === 'pending',
        ),
      ).toBe(true)
    } finally {
      if (originals.databaseURL === undefined) delete environment.DATABASE_URL
      else environment.DATABASE_URL = originals.databaseURL
      if (originals.mediaDirectory === undefined) delete environment.E09_PREVIEW_MEDIA_DIRECTORY
      else environment.E09_PREVIEW_MEDIA_DIRECTORY = originals.mediaDirectory
      if (originals.mediaSeed === undefined) delete environment.E09_PREVIEW_MEDIA_SEED
      else environment.E09_PREVIEW_MEDIA_SEED = originals.mediaSeed
      if (originals.nodeEnv === undefined) delete environment.NODE_ENV
      else environment.NODE_ENV = originals.nodeEnv
      releaseWingsGroupLocalPreviewIsolation(rootPath)
      fs.rmSync(rootPath, { recursive: true, force: true })
      fs.rmSync(assetsDirectory, { recursive: true, force: true })
    }
  })
})
