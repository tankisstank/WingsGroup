import config from '@/payload.config'
import fs from 'node:fs/promises'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createLocalReq, getPayload, type Payload, type PayloadRequest } from 'payload'

import {
  loadWingsSideCredentialManifest,
  wingsSideCredentialAssetRoot,
} from '../../scripts/lib/wingsSideCredentials'
import {
  buildWingsSideCredentialsPlan,
  buildWingsSideCredentialsSourceIdentity,
  classifyWingsSideCredentialsState,
  layoutChecksum,
  plannedCredentialUploadFilenames,
  wingsSideCredentialsProductionLocales,
  type CredentialHomeSnapshot,
  type CredentialMediaSnapshot,
} from '../../scripts/lib/wingsSideCredentialsProduction'
import {
  applyWingsSideCredentialsProductionPlan,
  rollbackWingsSideCredentialsProductionPlan,
} from '../../scripts/lib/wingsSideCredentialsProductionRuntime'

const runAdapterProof = process.env.RUN_CREDENTIALS_PRODUCTION_ADAPTER_INT === 'true'
const adapterDescribe = runAdapterProof ? describe : describe.skip
const releaseSha = '0123456789abcdef0123456789abcdef01234567'
const adminEmail = `credentials-production-proof-${process.pid}-${Date.now()}@internal.invalid`

const assertDisposableDatabase = () => {
  const databaseURL = process.env.DATABASE_URL
  if (
    !databaseURL ||
    process.env.CREDENTIALS_PRODUCTION_INT_DISPOSABLE_DATABASE_URL !== databaseURL
  ) {
    throw new Error(
      'Set CREDENTIALS_PRODUCTION_INT_DISPOSABLE_DATABASE_URL exactly equal to DATABASE_URL to run this destructive disposable PostgreSQL proof',
    )
  }
}

adapterDescribe('WingsSide credentials production PostgreSQL transaction proof', () => {
  let payload: Payload
  let req: PayloadRequest
  let siteID: number | string
  let collisionSiteID: number | string | undefined
  let collisionMediaID: number | string | undefined
  let userID: number | string | undefined
  const pageIDs: Array<number | string> = []
  const suffix = `${process.pid}-${Date.now()}`

  beforeAll(async () => {
    assertDisposableDatabase()
    payload = await getPayload({ config })
    expect(payload.db.packageName).toContain('db-postgres')
    const user = await payload.create({
      collection: 'users',
      context: { disableRevalidate: true },
      data: {
        email: adminEmail,
        name: 'Credentials Transaction Proof',
        password: 'test',
        role: 'super-admin',
      },
      overrideAccess: true,
    })
    userID = user.id
    req = await createLocalReq(
      {
        user: { ...user, collection: 'users' } as never,
      },
      payload,
    )

    const site = await payload.create({
      collection: 'sites',
      context: { disableRevalidate: true },
      data: {
        code: `credentials-proof-${suffix}`,
        defaultLocale: 'vi',
        isActive: false,
        name: `Credentials proof ${suffix}`,
        primaryDomain: `credentials-proof-${suffix}.invalid`,
        supportedLocales: [...wingsSideCredentialsProductionLocales],
      },
      overrideAccess: true,
      req,
    })
    siteID = site.id

    for (const locale of wingsSideCredentialsProductionLocales) {
      const page = await payload.create({
        collection: 'pages',
        context: { disableRevalidate: true },
        data: {
          _status: 'published',
          hero: { type: 'none' },
          layout: [{ blockType: 'content', columns: [] }] as never,
          pathname: '/',
          site: siteID,
          slug: `home-${locale}-${suffix}`,
          title: `Home ${locale}`,
        },
        locale,
        overrideAccess: true,
        req,
      })
      pageIDs.push(page.id)
    }
  }, 120_000)

  afterAll(async () => {
    if (!payload) return
    const manifest = await loadWingsSideCredentialManifest()
    const mediaResult = siteID
      ? await payload.find({
          collection: 'media',
          depth: 0,
          limit: 100,
          overrideAccess: true,
          pagination: false,
          req,
          where: {
            and: [
              { site: { equals: siteID } },
              { filename: { in: manifest.items.map((item) => item.file) } },
            ],
          },
        })
      : { docs: [] }
    for (const media of mediaResult.docs) {
      await payload.delete({
        collection: 'media',
        context: { disableRevalidate: true },
        id: media.id,
        overrideAccess: true,
        req,
      })
    }
    if (collisionMediaID) {
      await payload.delete({
        collection: 'media',
        context: { disableRevalidate: true },
        id: collisionMediaID,
        overrideAccess: true,
        req,
      })
    }
    for (const id of pageIDs) {
      await payload.delete({
        collection: 'pages',
        context: { disableRevalidate: true },
        id,
        overrideAccess: true,
        req,
      })
    }
    if (siteID) {
      await payload.delete({
        collection: 'sites',
        context: { disableRevalidate: true },
        id: siteID,
        overrideAccess: true,
        req,
      })
    }
    if (collisionSiteID) {
      await payload.delete({
        collection: 'sites',
        context: { disableRevalidate: true },
        id: collisionSiteID,
        overrideAccess: true,
        req,
      })
    }
    if (userID) {
      await payload.delete({
        collection: 'users',
        context: { disableRevalidate: true },
        id: userID,
        overrideAccess: true,
        req,
      })
    }
    await payload.destroy()
  }, 120_000)

  const loadSnapshot = async () => {
    const pages = []
    for (let index = 0; index < pageIDs.length; index += 1) {
      pages.push(
        await payload.findByID({
          collection: 'pages',
          depth: 0,
          id: pageIDs[index],
          locale: wingsSideCredentialsProductionLocales[index],
          overrideAccess: true,
          req,
        }),
      )
    }
    const homes: CredentialHomeSnapshot[] = pages.map((page, index) => {
      const layout = Array.isArray(page.layout) ? (page.layout as unknown[]) : []
      return {
        id: page.id,
        layout,
        layoutChecksum: layoutChecksum(layout),
        locale: wingsSideCredentialsProductionLocales[index],
        status: page._status ?? null,
      }
    })
    const manifest = await loadWingsSideCredentialManifest()
    const mediaResult = await payload.find({
      collection: 'media',
      depth: 0,
      limit: 100,
      overrideAccess: true,
      pagination: false,
      req,
      where: {
        and: [
          { site: { equals: siteID } },
          { filename: { in: manifest.items.map((item) => item.file) } },
        ],
      },
    })
    const media: CredentialMediaSnapshot[] = mediaResult.docs.map((item) => {
      const filenames = new Set<string>()
      if (typeof item.filename === 'string') filenames.add(item.filename)
      if (item.sizes && typeof item.sizes === 'object') {
        for (const size of Object.values(item.sizes as Record<string, unknown>)) {
          if (
            size &&
            typeof size === 'object' &&
            typeof (size as Record<string, unknown>).filename === 'string'
          ) {
            filenames.add((size as Record<string, unknown>).filename as string)
          }
        }
      }
      return {
        alt: item.alt ?? null,
        filename: item.filename ?? null,
        id: item.id,
        siteID,
        uploadFiles: [...filenames].map((filename) => path.resolve('public', 'media', filename)),
      }
    })
    return { homes, media }
  }

  const assertNoGlobalMediaFilenameCollisions = async () => {
    const manifest = await loadWingsSideCredentialManifest()
    const result = await payload.find({
      collection: 'media',
      depth: 0,
      limit: manifest.items.length + 1,
      overrideAccess: true,
      pagination: false,
      req,
      where: { filename: { in: manifest.items.map((item) => item.file) } },
    })
    if (result.docs.length) throw new Error('global Media filename collision')
  }

  it('rolls back injected failure, applies, no-ops, rolls back and reapplies', async () => {
    const manifest = await loadWingsSideCredentialManifest()
    const sourceIdentity = await buildWingsSideCredentialsSourceIdentity(manifest, releaseSha)
    const before = await loadSnapshot()
    const plan = await buildWingsSideCredentialsPlan({
      homes: before.homes,
      manifest,
      runID: 'adapter-proof',
      siteID,
      sourceIdentity,
    })
    const firstItem = manifest.items[0]
    const collisionSite = await payload.create({
      collection: 'sites',
      context: { disableRevalidate: true },
      data: {
        code: `credentials-collision-${suffix}`,
        defaultLocale: 'en',
        isActive: false,
        name: `Credentials collision ${suffix}`,
        primaryDomain: `credentials-collision-${suffix}.invalid`,
        supportedLocales: ['en'],
      },
      overrideAccess: true,
      req,
    })
    collisionSiteID = collisionSite.id
    const collisionBytes = await fs.readFile(
      path.join(wingsSideCredentialAssetRoot, firstItem.file),
    )
    const collisionMedia = await payload.create({
      collection: 'media',
      context: { disableRevalidate: true },
      data: { alt: 'Collision media', site: collisionSiteID } as never,
      file: {
        data: collisionBytes,
        mimetype: 'image/jpeg',
        name: firstItem.file,
        size: collisionBytes.byteLength,
      },
      locale: 'en',
      overrideAccess: true,
      req,
    })
    collisionMediaID = collisionMedia.id
    for (const filename of await plannedCredentialUploadFilenames(firstItem.file)) {
      await fs.rm(path.resolve('public', 'media', filename), { force: true })
    }
    await expect(
      applyWingsSideCredentialsProductionPlan({
        assertNoGlobalMediaFilenameCollisions,
        loadSnapshot,
        manifest,
        payload,
        plan,
        req,
      }),
    ).rejects.toThrow('global Media filename collision')
    expect(
      classifyWingsSideCredentialsState({
        ...(await loadSnapshot()),
        manifest,
        siteID,
      }).state,
    ).toBe('before')
    await expect(
      payload.findByID({
        collection: 'media',
        depth: 0,
        id: collisionMediaID,
        overrideAccess: true,
        req,
      }),
    ).resolves.toMatchObject({ filename: firstItem.file })
    await payload.delete({
      collection: 'media',
      context: { disableRevalidate: true },
      id: collisionMediaID,
      overrideAccess: true,
      req,
    })
    collisionMediaID = undefined

    const existingOriginal = path.resolve('public', 'media', firstItem.file)
    await fs.mkdir(path.dirname(existingOriginal), { recursive: true })
    await fs.writeFile(existingOriginal, 'existing-original', 'utf8')
    await expect(
      applyWingsSideCredentialsProductionPlan({ loadSnapshot, manifest, payload, plan, req }),
    ).rejects.toThrow(firstItem.file)
    await expect(fs.readFile(existingOriginal, 'utf8')).resolves.toBe('existing-original')
    await fs.rm(existingOriginal, { force: true })
    expect(
      classifyWingsSideCredentialsState({
        ...(await loadSnapshot()),
        manifest,
        siteID,
      }).state,
    ).toBe('before')

    const existingGenerated = path.resolve(
      'public',
      'media',
      'wingsside-credential-8355-300x408.jpg',
    )
    await fs.writeFile(existingGenerated, 'existing-generated', 'utf8')
    await expect(
      applyWingsSideCredentialsProductionPlan({ loadSnapshot, manifest, payload, plan, req }),
    ).rejects.toThrow('wingsside-credential-8355-300x408.jpg')
    await expect(fs.readFile(existingGenerated, 'utf8')).resolves.toBe('existing-generated')
    await fs.rm(existingGenerated, { force: true })
    expect(
      classifyWingsSideCredentialsState({
        ...(await loadSnapshot()),
        manifest,
        siteID,
      }).state,
    ).toBe('before')

    await expect(
      applyWingsSideCredentialsProductionPlan({
        failDuringCreateItemID: firstItem.id,
        loadSnapshot,
        manifest,
        payload,
        plan,
        req,
      }),
    ).rejects.toThrow('early create failure')
    for (const filename of await plannedCredentialUploadFilenames(firstItem.file)) {
      await expect(fs.access(path.resolve('public', 'media', filename))).rejects.toThrow()
    }
    expect(
      classifyWingsSideCredentialsState({
        ...(await loadSnapshot()),
        manifest,
        siteID,
      }).state,
    ).toBe('before')

    await expect(
      applyWingsSideCredentialsProductionPlan({
        failAfterCreates: 2,
        loadSnapshot,
        manifest,
        payload,
        plan,
        req,
      }),
    ).rejects.toThrow('Injected credentials import failure')
    expect(
      classifyWingsSideCredentialsState({
        ...(await loadSnapshot()),
        manifest,
        siteID,
      }).state,
    ).toBe('before')

    await applyWingsSideCredentialsProductionPlan({ loadSnapshot, manifest, payload, plan, req })
    expect(
      classifyWingsSideCredentialsState({ ...(await loadSnapshot()), manifest, siteID }).state,
    ).toBe('after')
    await expect(
      rollbackWingsSideCredentialsProductionPlan({
        failAfterDeletes: 1,
        loadSnapshot,
        manifest,
        payload,
        plan,
        req,
      }),
    ).rejects.toThrow('rollback failure after 1 media delete')
    expect(
      classifyWingsSideCredentialsState({ ...(await loadSnapshot()), manifest, siteID }).state,
    ).toBe('after')
    for (const filename of await plannedCredentialUploadFilenames(firstItem.file)) {
      await fs.access(path.resolve('public', 'media', filename))
    }
    await expect(
      applyWingsSideCredentialsProductionPlan({ loadSnapshot, manifest, payload, plan, req }),
    ).rejects.toThrow('expected before')
    await rollbackWingsSideCredentialsProductionPlan({ loadSnapshot, manifest, payload, plan, req })
    expect(
      classifyWingsSideCredentialsState({ ...(await loadSnapshot()), manifest, siteID }).state,
    ).toBe('before')
    await applyWingsSideCredentialsProductionPlan({ loadSnapshot, manifest, payload, plan, req })
    expect(
      classifyWingsSideCredentialsState({ ...(await loadSnapshot()), manifest, siteID }).state,
    ).toBe('after')
  }, 180_000)
})
