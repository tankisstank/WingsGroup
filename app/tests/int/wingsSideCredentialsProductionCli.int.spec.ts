import config from '@/payload.config'
import { execFile } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { afterAll, describe, expect, it } from 'vitest'
import { createLocalReq, getPayload, type Payload, type PayloadRequest } from 'payload'

import { loadWingsSideCredentialManifest } from '../../scripts/lib/wingsSideCredentials'
import {
  plannedCredentialUploadPaths,
  wingsSideCredentialsProductionLocales,
} from '../../scripts/lib/wingsSideCredentialsProduction'

const execFileAsync = promisify(execFile)
const runCliProof = process.env.RUN_CREDENTIALS_PRODUCTION_CLI_INT === 'true'
const cliDescribe = runCliProof ? describe : describe.skip
const releaseSha = '0123456789abcdef0123456789abcdef01234567'
const adminEmail = `credentials-cli-proof-${process.pid}-${Date.now()}@internal.invalid`
const mediaStaticDir = path.resolve(process.cwd(), 'public', 'media')

type JsonLine = Record<string, unknown>

const pnpmEntrypoint = process.env.npm_execpath

const runImporter = async (args: string[]) => {
  if (!pnpmEntrypoint) {
    throw new Error('RUN_CREDENTIALS_PRODUCTION_CLI_INT requires running tests through pnpm')
  }
  const { stdout } = await execFileAsync(
    process.execPath,
    [pnpmEntrypoint, 'exec', 'tsx', 'scripts/import-wingsside-credentials-production.ts', ...args],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        IMPORT_ADMIN_EMAIL: adminEmail,
        NODE_ENV: 'production',
        PAYLOAD_DB_PUSH: 'false',
        WINGSTRAVEL_RELEASE_SHA: releaseSha,
      },
      maxBuffer: 1024 * 1024 * 8,
    },
  )
  const lines = stdout
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('{'))
    .map((line) => JSON.parse(line) as JsonLine)
  return { lines, stdout }
}

const lastLineWith = (lines: JsonLine[], key: string) => {
  const line = [...lines].reverse().find((candidate) => candidate[key] !== undefined)
  if (!line) throw new Error(`Missing CLI JSON line with ${key}`)
  return line
}

cliDescribe('WingsSide credentials production CLI disposable PostgreSQL proof', () => {
  let payload: Payload | undefined
  let req: PayloadRequest | undefined
  let pageID: number | string | undefined
  let siteID: number | string | undefined
  let userID: number | string | undefined
  let artifactRoot: string | undefined

  const cleanup = async () => {
    const cleanupPayload = payload || (await getPayload({ config }))
    const manifest = await loadWingsSideCredentialManifest()
    const media = await cleanupPayload.find({
      collection: 'media',
      depth: 0,
      limit: 100,
      overrideAccess: true,
      pagination: false,
      where: { filename: { in: manifest.items.map((item) => item.file) } },
    })
    for (const item of media.docs) {
      await cleanupPayload.delete({
        collection: 'media',
        context: { disableRevalidate: true },
        id: item.id,
        overrideAccess: true,
      })
    }
    for (const item of manifest.items) {
      for (const file of await plannedCredentialUploadPaths({
        file: item.file,
        mediaRoot: mediaStaticDir,
      })) {
        await fs.rm(file, { force: true })
      }
    }
    if (pageID) {
      await cleanupPayload.delete({
        collection: 'pages',
        context: { disableRevalidate: true },
        id: pageID,
        overrideAccess: true,
      })
    }
    if (siteID) {
      await cleanupPayload.delete({
        collection: 'sites',
        context: { disableRevalidate: true },
        id: siteID,
        overrideAccess: true,
      })
    }
    if (userID) {
      await cleanupPayload.delete({
        collection: 'users',
        context: { disableRevalidate: true },
        id: userID,
        overrideAccess: true,
      })
    }
    if (!payload) await cleanupPayload.destroy()
    if (artifactRoot) await fs.rm(artifactRoot, { force: true, recursive: true })
  }

  afterAll(async () => {
    await cleanup()
    if (payload) await payload.destroy()
  }, 120_000)

  it('runs plan, apply, verify, rollback, reapply, no-op and final rollback through the CLI', async () => {
    payload = await getPayload({ config })
    expect(payload.db.packageName).toContain('db-postgres')
    req = await createLocalReq(
      {
        user: {
          collection: 'users',
          createdAt: new Date(0).toISOString(),
          email: adminEmail,
          id: 0,
          role: 'super-admin',
          sites: [],
          updatedAt: new Date(0).toISOString(),
        } as never,
      },
      payload,
    )
    await cleanup()

    const site = await payload.create({
      collection: 'sites',
      context: { disableRevalidate: true },
      data: {
        code: 'wings-side',
        defaultLocale: 'en',
        isActive: false,
        name: 'WingsSide CLI proof',
        primaryDomain: `wingsside-cli-proof-${process.pid}.invalid`,
        supportedLocales: [...wingsSideCredentialsProductionLocales],
      },
      overrideAccess: true,
      req,
    })
    siteID = site.id
    const page = await payload.create({
      collection: 'pages',
      context: { disableRevalidate: true },
      data: {
        _status: 'published',
        hero: { type: 'none' },
        layout: [{ blockType: 'content', columns: [] }] as never,
        pathname: '/',
        site: siteID,
        slug: 'home',
        title: 'Home',
      },
      locale: 'en',
      overrideAccess: true,
      req,
    })
    pageID = page.id
    for (const locale of wingsSideCredentialsProductionLocales) {
      await payload.update({
        collection: 'pages',
        context: { disableRevalidate: true },
        data: {
          _status: 'published',
          layout: [{ blockType: 'content', columns: [] }] as never,
          title: `Home ${locale}`,
        },
        id: pageID,
        locale,
        overrideAccess: true,
        req,
      })
    }
    const user = await payload.create({
      collection: 'users',
      context: { disableRevalidate: true },
      data: {
        email: adminEmail,
        name: 'Credentials CLI Proof',
        password: 'test',
        role: 'super-admin',
      },
      overrideAccess: true,
      req,
    })
    userID = user.id
    await payload.destroy()
    payload = undefined
    req = undefined

    artifactRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'wings-credentials-cli-'))
    const planPath = path.join(artifactRoot, 'plan.json')
    const plan = await runImporter(['plan', '--output', planPath])
    const planSha256 = String(lastLineWith(plan.lines, 'planSha256').planSha256)
    expect(planSha256).toMatch(/^[a-f0-9]{64}$/u)

    await runImporter([
      'apply',
      '--plan',
      planPath,
      '--plan-sha256',
      planSha256,
      '--confirm',
      'CONFIRM_WINGSSIDE_CREDENTIALS_PRODUCTION_WRITE',
    ])
    await runImporter(['verify', '--plan', planPath, '--plan-sha256', planSha256])
    await runImporter([
      'rollback',
      '--plan',
      planPath,
      '--plan-sha256',
      planSha256,
      '--confirm',
      'CONFIRM_WINGSSIDE_CREDENTIALS_PRODUCTION_ROLLBACK',
    ])
    await runImporter([
      'apply',
      '--plan',
      planPath,
      '--plan-sha256',
      planSha256,
      '--confirm',
      'CONFIRM_WINGSSIDE_CREDENTIALS_PRODUCTION_WRITE',
    ])
    const noop = await runImporter([
      'apply',
      '--plan',
      planPath,
      '--plan-sha256',
      planSha256,
      '--confirm',
      'CONFIRM_WINGSSIDE_CREDENTIALS_PRODUCTION_WRITE',
    ])
    expect(lastLineWith(noop.lines, 'writes').writes).toBe(0)
    await runImporter([
      'rollback',
      '--plan',
      planPath,
      '--plan-sha256',
      planSha256,
      '--confirm',
      'CONFIRM_WINGSSIDE_CREDENTIALS_PRODUCTION_ROLLBACK',
    ])
  }, 300_000)
})
