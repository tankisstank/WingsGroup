import { describe, expect, it } from 'vitest'

import { validateEcosystemProfiles } from '@/blocks/WingsGroupEcosystem/config'
import { validateProofRecords } from '@/blocks/WingsGroupProofArchive/config'
import { validateConsultationChannels, validateMediaGovernance } from '@/fields/wingsGroupV3'
import { resolveSiteSettingsUpsert } from '../../scripts/lib/wingsGroupV3MediaPlan'
import {
  applyWingsGroupV3MediaWithRecovery,
  backupLocalDatabase,
  importWingsGroupV3Media,
  parseWingsGroupV3MediaCommand,
  recoverWingsGroupV3MediaApply,
  WingsGroupV3MediaApplyError,
} from '../../scripts/import-wingsgroup-v3-media'
import {
  buildWingsGroupV3MediaPlan,
  parseWingsGroupV3MediaManifest,
} from '../../scripts/lib/wingsGroupV3MediaPlan'
import fs from 'node:fs/promises'
import { createHash } from 'node:crypto'
import os from 'node:os'
import path from 'node:path'
import sharp from 'sharp'

const sha = 'a'.repeat(64)

describe('WingsGroup v3 fail-closed governance', () => {
  it('keeps unconfigured consultation channels non-blocking but gates approved URLs', () => {
    expect(validateConsultationChannels([{ key: 'zalo', state: 'unconfigured' }])).toBe(true)
    expect(
      validateConsultationChannels([{ key: 'zalo', state: 'approved', url: 'http://x' }]),
    ).toMatch(/HTTPS/)
    expect(
      validateConsultationChannels([
        {
          key: 'zalo',
          owner: 'Commercial operations',
          sla: '4 business hours',
          state: 'approved',
          trackingReference: 'analytics-test-1',
          url: 'https://example.com/zalo',
        },
      ]),
    ).toBe(true)
  })

  it('does not allow WingsGroup media publication without rights and verified WebP/AVIF', () => {
    expect(
      validateMediaGovernance({ managedBy: 'wingsgroup-v3', publicationState: 'published' }),
    ).toMatch(/attachment/)
    expect(
      validateMediaGovernance({
        derivativeState: 'verified',
        managedBy: 'wingsgroup-v3',
        provenanceReference: 'manifest:v1',
        publicationState: 'published',
        responsiveDerivatives: [
          { format: 'webp', sha256: sha, url: 'https://cdn.example/a.webp', width: 640 },
          { format: 'avif', sha256: sha, url: 'https://cdn.example/a.avif', width: 640 },
        ],
        rightsEvidence: 'stakeholder-approval',
        rightsState: 'approved',
        sourceArchiveSha256: sha,
        sourceAttachmentId: 'attachment-1',
        sourceFileSha256: sha,
        sourceIdentity: `attachment-1:${sha}`,
      }),
    ).toBe(true)
  })

  it('gates approved proof and ecosystem deep links on complete evidence', () => {
    expect(
      validateProofRecords([
        { key: 'licence', permissionState: 'pending', publicationState: 'approved' },
      ]),
    ).toMatch(/source/)
    expect(
      validateEcosystemProfiles([
        { brandKey: 'wingsgo', cta: { state: 'contact-fallback' }, proofState: 'pending' },
        {
          brandKey: 'wing-side',
          cta: { state: 'approved-deep-link', url: 'https://wingside.vn' },
          proofState: 'pending',
        },
      ]),
    ).toMatch(/owner/)
  })

  it('rejects nondeterministic duplicate site-settings instead of choosing limit:1', () => {
    expect(() =>
      resolveSiteSettingsUpsert({
        settings: [
          { id: 10, site: 1 },
          { id: 11, site: { id: 1 } },
        ],
        sites: [{ code: 'wings-group', id: 1 }],
      }),
    ).toThrow(/found 2/)
  })

  it('keeps media lifecycle plan-only and rejects apply/verify/rollback', () => {
    expect(() =>
      parseWingsGroupV3MediaCommand([
        'plan',
        '--manifest=/tmp/manifest.json',
        '--assets-dir=/tmp/assets',
      ]),
    ).not.toThrow()
    expect(() =>
      parseWingsGroupV3MediaCommand([
        'apply',
        '--manifest=/tmp/manifest.json',
        '--assets-dir=/tmp/assets',
      ]),
    ).toThrow(/--site-code=wings-group/)
    expect(() =>
      parseWingsGroupV3MediaCommand([
        'apply',
        '--manifest=/tmp/manifest.json',
        '--assets-dir=/tmp/assets',
        '--site-code=wings-group',
      ]),
    ).not.toThrow()
    for (const command of ['verify', 'rollback']) {
      expect(() =>
        parseWingsGroupV3MediaCommand([
          command,
          '--manifest=/tmp/manifest.json',
          '--assets-dir=/tmp/assets',
        ]),
      ).toThrow(/supports only/)
    }
  })

  it('rolls back only this import and preserves concurrent tenant files and writes', async () => {
    const rootDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'wg-v3-recovery-'))
    const assetsDirectory = path.join(rootDirectory, 'assets')
    const mediaDirectory = path.join(rootDirectory, 'media')
    const databasePath = path.join(rootDirectory, 'payload.sqlite')
    const backupPath = path.join(rootDirectory, 'payload.sqlite.bak')
    await fs.mkdir(assetsDirectory)
    await fs.mkdir(mediaDirectory)
    await fs.writeFile(databasePath, 'database-before-apply')
    await fs.copyFile(databasePath, backupPath)
    const preExistingUpload = path.join(mediaDirectory, 'pre-existing-tenant-upload.png')
    const concurrentUpload = path.join(mediaDirectory, 'unrelated-concurrent-tenant-upload.png')
    await fs.writeFile(preExistingUpload, 'do-not-delete')

    const media = []
    for (let index = 0; index < 2; index += 1) {
      const file = `recovery-fixture-${index}.png`
      const bytes = await sharp({
        create: {
          background: { b: index, g: 20 + index, r: 40 + index },
          channels: 3,
          height: 4,
          width: 4,
        },
      })
        .png()
        .toBuffer()
      await fs.writeFile(path.join(assetsDirectory, file), bytes)
      media.push({
        actualDimensions: '4x4',
        alt: { en: `English ${index}`, vi: `Tiếng Việt ${index}` },
        dimensions: '4x4',
        file,
        focal: { x: 50, y: 50 },
        role: `Recovery fixture ${index}`,
        sha256: createHash('sha256').update(bytes).digest('hex'),
        usageScope: 'editorial-service',
      })
    }
    const manifest = JSON.parse(
      await fs.readFile(
        path.resolve(process.cwd(), '../docs/product/wingsgroup-v3-media-manifest.json'),
        'utf8',
      ),
    )
    const plan = {
      errors: [],
      planned: media.length,
      records: media.map((item, index) => ({
        alt: item.alt,
        focal: item.focal,
        importFilename: item.file,
        role: item.role,
        sourceDimensions: { height: 4, width: 4 },
        sourceFile: item.file,
        sourceFileSha256: item.sha256,
        sourceIdentity: `fixture-attachment:${item.sha256}`,
        usageScope: item.usageScope,
        index,
      })),
    } as never
    const documents: Array<Record<string, any>> = []
    const databaseState = { targetRecords: [] as number[], unrelatedWrites: [] as string[] }
    const transactionIDs: unknown[] = []
    let createCount = 0
    let rollbackCount = 0
    let commitCount = 0
    let destroyCount = 0
    const payload = {
      db: {
        beginTransaction: async () => 'transaction-1',
        commitTransaction: async () => {
          commitCount += 1
        },
        rollbackTransaction: async () => {
          rollbackCount += 1
          databaseState.targetRecords = []
        },
      },
      find: async (args: { req?: { transactionID?: unknown } }) => {
        transactionIDs.push(args.req?.transactionID)
        return { docs: [] }
      },
      create: async (args: {
        data: Record<string, any>
        file: { name: string }
        req?: { transactionID?: unknown }
      }) => {
        transactionIDs.push(args.req?.transactionID)
        createCount += 1
        databaseState.targetRecords.push(createCount)
        if (createCount === 1) {
          databaseState.unrelatedWrites.push('tenant-42-write-after-apply-start')
          await fs.writeFile(concurrentUpload, 'unrelated upload')
        }
        await fs.writeFile(
          path.join(mediaDirectory, `run-owned-${createCount}.png`),
          'import upload',
        )
        await fs.writeFile(
          path.join(mediaDirectory, `run-owned-${createCount}-thumbnail.png`),
          'import derivative',
        )
        await fs.writeFile(databasePath, `transaction-db-write-${createCount}`)
        const document = {
          ...args.data,
          filename: `run-owned-${createCount}.png`,
          height: 4,
          id: createCount,
          sizes: { thumbnail: { filename: `run-owned-${createCount}-thumbnail.png` } },
          width: 4,
        }
        documents.push(document)
        return document
      },
      update: async (args: {
        id: number
        data: Record<string, any>
        locale: string
        req?: { transactionID?: unknown }
      }) => {
        transactionIDs.push(args.req?.transactionID)
        const document = documents.find((item) => item.id === args.id)!
        if (args.locale === 'en' && args.id === 2) {
          await fs.appendFile(databasePath, '|unrelated-db-write-after-apply-start')
          throw new Error('simulated second-record English-alt failure')
        }
        if (args.locale === 'en') {
          const alt = typeof document.alt === 'object' ? document.alt : { vi: document.alt }
          document.alt = { ...alt, en: args.data.alt }
        }
        return document
      },
      destroy: async () => {
        destroyCount += 1
      },
    }
    try {
      const failure = await applyWingsGroupV3MediaWithRecovery({
        assetsDirectory,
        backupPath,
        databasePath,
        manifest,
        mediaDirectory,
        payload: payload as never,
        plan,
        req: { payload } as never,
        siteID: 7,
      }).catch((error: unknown) => error)
      expect(failure).toBeInstanceOf(WingsGroupV3MediaApplyError)
      expect((failure as WingsGroupV3MediaApplyError).message).toContain(
        'simulated second-record English-alt failure',
      )
      expect((failure as WingsGroupV3MediaApplyError).recovery.success).toBe(true)
      expect((failure as WingsGroupV3MediaApplyError).recovery.transactionRollback).toMatchObject({
        status: 'rolled-back',
        succeeded: true,
      })
      expect(
        (failure as WingsGroupV3MediaApplyError).recovery.runOwnedFileCleanup.removedFiles,
      ).toHaveLength(4)
      expect(rollbackCount).toBe(1)
      expect(commitCount).toBe(0)
      expect(transactionIDs.every((transactionID) => transactionID === 'transaction-1')).toBe(true)
      expect(await fs.readFile(databasePath, 'utf8')).toBe(
        'transaction-db-write-2|unrelated-db-write-after-apply-start',
      )
      expect(databaseState).toEqual({
        targetRecords: [],
        unrelatedWrites: ['tenant-42-write-after-apply-start'],
      })
      expect(await fs.readFile(preExistingUpload)).toEqual(Buffer.from('do-not-delete'))
      expect(await fs.readFile(concurrentUpload)).toEqual(Buffer.from('unrelated upload'))
      for (const filename of [
        'run-owned-1.png',
        'run-owned-1-thumbnail.png',
        'run-owned-2.png',
        'run-owned-2-thumbnail.png',
      ]) {
        await expect(fs.access(path.join(mediaDirectory, filename))).rejects.toThrow()
      }
      expect(createCount).toBe(2)
      expect(destroyCount).toBe(1)
    } finally {
      await fs.rm(rootDirectory, { force: true, recursive: true })
    }
  })

  it('fails before mutation when the adapter cannot provide an isolated transaction', async () => {
    const rootDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'wg-v3-transaction-guard-'))
    const assetsDirectory = path.join(rootDirectory, 'assets')
    const mediaDirectory = path.join(rootDirectory, 'media')
    const backupPath = path.join(rootDirectory, 'payload.sqlite.bak')
    const databasePath = path.join(rootDirectory, 'payload.sqlite')
    await fs.mkdir(assetsDirectory)
    await fs.mkdir(mediaDirectory)
    await fs.writeFile(databasePath, 'database')
    await fs.copyFile(databasePath, backupPath)
    const manifest = JSON.parse(
      await fs.readFile(
        path.resolve(process.cwd(), '../docs/product/wingsgroup-v3-media-manifest.json'),
        'utf8',
      ),
    )
    const plan = {
      errors: [],
      planned: 0,
      records: [],
    }
    let createCount = 0
    let destroyCount = 0
    const payload = {
      db: {},
      create: async () => {
        createCount += 1
        return {}
      },
      destroy: async () => {
        destroyCount += 1
      },
    }

    try {
      const failure = await applyWingsGroupV3MediaWithRecovery({
        assetsDirectory,
        backupPath,
        databasePath,
        manifest,
        mediaDirectory,
        payload: payload as never,
        plan: plan as never,
        req: {} as never,
        siteID: 7,
      }).catch((error: unknown) => error)
      expect(failure).toBeInstanceOf(WingsGroupV3MediaApplyError)
      expect((failure as WingsGroupV3MediaApplyError).message).toMatch(
        /requires an isolated Payload/,
      )
      expect((failure as WingsGroupV3MediaApplyError).recovery.transactionRollback).toMatchObject({
        status: 'unsupported',
        succeeded: true,
      })
      expect((failure as WingsGroupV3MediaApplyError).recovery.manualRecoveryRequired).toBe(false)
      expect(createCount).toBe(0)
      expect(destroyCount).toBe(1)
    } finally {
      await fs.rm(rootDirectory, { force: true, recursive: true })
    }
  })

  it('retains the backup path and requires manual recovery when rollback fails', async () => {
    const rootDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'wg-v3-rollback-failure-'))
    const ownedFile = path.join(rootDirectory, 'run-owned.png')
    await fs.writeFile(ownedFile, 'manual recovery artifact')
    let destroyCount = 0
    const payload = {
      db: {
        rollbackTransaction: async () => {
          throw new Error('simulated rollback failure')
        },
      },
      destroy: async () => {
        destroyCount += 1
      },
    }
    try {
      const recovery = await recoverWingsGroupV3MediaApply({
        backupPath: path.join(rootDirectory, 'retained-backup.sqlite'),
        databasePath: path.join(rootDirectory, 'payload.sqlite'),
        payload: payload as never,
        req: { transactionID: 'transaction-1' } as never,
        runOwnedUploadFiles: new Set([ownedFile]),
        transactionStatus: 'active',
      })
      expect(recovery).toMatchObject({
        manualRecoveryRequired: true,
        payloadClosed: true,
        success: false,
        transactionRollback: {
          status: 'rollback-failed',
          succeeded: false,
        },
      })
      expect(recovery.backupPath).toContain('retained-backup.sqlite')
      expect(recovery.runOwnedFileCleanup).toMatchObject({ attempted: false, success: false })
      await expect(fs.access(ownedFile)).resolves.toBeUndefined()
      expect(destroyCount).toBe(1)
    } finally {
      await fs.rm(rootDirectory, { force: true, recursive: true })
    }
  })

  it('retains the production guard and cross-tenant source-identity guard', async () => {
    const environment = process.env as Record<string, string | undefined>
    const originalNodeEnv = environment.NODE_ENV
    environment.NODE_ENV = 'production'
    try {
      expect(() => backupLocalDatabase()).toThrow(/restricted to an explicit local SQLite/)
    } finally {
      if (originalNodeEnv === undefined) delete environment.NODE_ENV
      else environment.NODE_ENV = originalNodeEnv
    }

    const manifest = JSON.parse(
      await fs.readFile(
        path.resolve(process.cwd(), '../docs/product/wingsgroup-v3-media-manifest.json'),
        'utf8',
      ),
    )
    const plan = {
      errors: [],
      records: [
        {
          alt: { en: 'English', vi: 'Tiếng Việt' },
          focal: { x: 50, y: 50 },
          importFilename: 'guard.png',
          role: 'Guard fixture',
          sourceDimensions: { height: 4, width: 4 },
          sourceFile: 'guard.png',
          sourceFileSha256: sha,
          sourceIdentity: `fixture-attachment:${sha}`,
          usageScope: 'editorial-service',
        },
      ],
      planned: 1,
    }
    const payload = {
      find: async (args: { collection: string; where: unknown }) => {
        if (args.collection !== 'media') return { docs: [] }
        const serialized = JSON.stringify(args.where)
        return serialized.includes('site') && serialized.includes('sourceIdentity')
          ? { docs: [] }
          : { docs: [{ site: 42 }] }
      },
    }
    await expect(
      importWingsGroupV3Media({
        apply: false,
        assetsDirectory: '/tmp/unused',
        manifest,
        payload: payload as never,
        plan: plan as never,
        req: {} as never,
        siteID: 7,
      }),
    ).rejects.toThrow(/across tenants/)
  })

  it('records the handoff dimensions discrepancy without changing the source checksum', async () => {
    const manifest = JSON.parse(
      await fs.readFile(
        path.resolve(process.cwd(), '../docs/product/wingsgroup-v3-media-manifest.json'),
        'utf8',
      ),
    )
    const airport = manifest.media.find(
      (item: { file: string }) => item.file === 'wingsgroup-hero-airport-welcome.png',
    )
    expect(airport).toMatchObject({
      actualDimensions: '1536x1024',
      dimensions: '1536x1024',
      upstreamManifestDimensions: '1672x941',
      sha256: '640599489eeaf79a02439d001bd120741a8f2faeacd86669b2401803c391479a',
    })
    expect(manifest.media).toHaveLength(13)
  })

  it('seeds exactly 13 governed records and reuses them on a second run', async () => {
    const assetsDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'wg-v3-idempotency-'))
    const documents: Array<Record<string, any>> = []
    const manifestMedia = []
    const getEquals = (value: unknown, key: string): unknown => {
      if (!value || typeof value !== 'object') return undefined
      if (key in value && (value as Record<string, any>)[key]?.equals !== undefined) {
        return (value as Record<string, any>)[key].equals
      }
      for (const child of Object.values(value)) {
        const result = getEquals(child, key)
        if (result !== undefined) return result
      }
      return undefined
    }
    const payload = {
      find: async (args: { collection: string; where: unknown }) => {
        if (args.collection !== 'media') return { docs: [] }
        const identity = getEquals(args.where, 'governance.sourceIdentity')
        const siteID = getEquals(args.where, 'site')
        return {
          docs: documents.filter(
            (document) =>
              (identity === undefined || document.governance.sourceIdentity === identity) &&
              (siteID === undefined || String(document.site) === String(siteID)),
          ),
        }
      },
      create: async (args: { data: Record<string, any>; file: { name: string } }) => {
        const document = {
          ...args.data,
          filename: args.file.name,
          height: 4,
          id: documents.length + 1,
          width: 4,
        }
        documents.push(document)
        return document
      },
      update: async (args: { id: number; data: Record<string, any>; locale: string }) => {
        const document = documents.find((item) => item.id === args.id)!
        if (args.locale === 'en') {
          const alt = typeof document.alt === 'object' ? document.alt : { vi: document.alt }
          document.alt = { ...alt, en: args.data.alt }
        } else {
          Object.assign(document, args.data)
          const alt = typeof document.alt === 'object' ? document.alt : { en: document.alt }
          document.alt = { ...alt, vi: args.data.alt }
        }
        return document
      },
    }

    try {
      for (let index = 0; index < 13; index += 1) {
        const file = `fixture-${index}.png`
        const bytes = await sharp({
          create: {
            background: { b: index, g: 20 + index, r: 40 + index },
            channels: 3,
            height: 4,
            width: 4,
          },
        })
          .png()
          .toBuffer()
        await fs.writeFile(path.join(assetsDirectory, file), bytes)
        manifestMedia.push({
          actualDimensions: '4x4',
          alt: { en: `English ${index}`, vi: `Tiếng Việt ${index}` },
          dimensions: '4x4',
          file,
          focal: { x: 50, y: 50 },
          role: `Role ${index}`,
          sha256: createHash('sha256').update(bytes).digest('hex'),
          usageScope: 'editorial-service',
        })
      }
      const manifest = parseWingsGroupV3MediaManifest({
        licenseScope: 'Development only',
        media: manifestMedia,
        publicationState: 'pending-production',
        rights: {
          evidence: 'fixture approval',
          restriction: 'Development only',
          state: 'approved',
        },
        siteCode: 'wings-group',
        sourcePackage: {
          archiveSha256: 'a'.repeat(64),
          assetsDirectory: 'fixture',
          attachmentId: 'fixture-attachment',
          manifest: 'fixture-manifest',
        },
        version: 1,
      })
      const plan = await buildWingsGroupV3MediaPlan({ assetsDirectory, manifest })
      const first = await importWingsGroupV3Media({
        apply: true,
        assetsDirectory,
        manifest,
        payload: payload as never,
        plan,
        req: { transactionID: 'fixture-transaction' } as never,
        siteID: 7,
      })
      const second = await importWingsGroupV3Media({
        apply: true,
        assetsDirectory,
        manifest,
        payload: payload as never,
        plan,
        req: { transactionID: 'fixture-transaction' } as never,
        siteID: 7,
      })

      expect(first).toMatchObject({ created: 13, reused: 0, verified: 13 })
      expect(second).toMatchObject({ created: 0, reused: 13, verified: 13 })
      expect(documents).toHaveLength(13)
      expect(new Set(documents.map((document) => document.governance.sourceIdentity)).size).toBe(13)
      expect(
        documents.every((document) => document.governance.publicationState === 'pending'),
      ).toBe(true)
      expect(documents.every((document) => document.alt.vi && document.alt.en)).toBe(true)
    } finally {
      await fs.rm(assetsDirectory, { force: true, recursive: true })
    }
  })

  it('blocks a manifest/file dimension mismatch', async () => {
    const assetsDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'wg-v3-media-'))
    try {
      const media = []
      for (let index = 0; index < 13; index += 1) {
        const file = `fixture-${index}.png`
        const bytes = await sharp({
          create: {
            background: { b: index, g: 20 + index, r: 40 + index },
            channels: 3,
            height: 4,
            width: 4,
          },
        })
          .png()
          .toBuffer()
        await fs.writeFile(path.join(assetsDirectory, file), bytes)
        media.push({
          alt: { en: `English ${index}`, vi: `Tiếng Việt ${index}` },
          dimensions: index === 4 ? '5x4' : '4x4',
          file,
          role: `Role ${index}`,
          sha256: createHash('sha256').update(bytes).digest('hex'),
        })
      }
      const manifest = parseWingsGroupV3MediaManifest({
        media,
        publicationState: 'ready_for_payload_import_not_published',
        rights: { evidence: 'fixture approval', restriction: 'editorial only', state: 'approved' },
        siteCode: 'wings-group',
        sourcePackage: {
          archiveSha256: 'a'.repeat(64),
          assetsDirectory: 'fixture',
          attachmentId: 'fixture-attachment',
          manifest: 'fixture-manifest',
        },
        version: 1,
      })
      const plan = await buildWingsGroupV3MediaPlan({ assetsDirectory, manifest })
      expect(plan.errors).toContainEqual(expect.stringMatching(/fixture-4.*dimensions/))
      expect(plan.planned).toBe(12)
    } finally {
      await fs.rm(assetsDirectory, { force: true, recursive: true })
    }
  })
})
