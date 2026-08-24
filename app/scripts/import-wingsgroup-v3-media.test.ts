import { createHash } from 'node:crypto'
import { readFile, rm, writeFile, mkdtemp } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  assertWingsGroupV3ProductionMediaGate,
  initializeWingsGroupV3ProductionWriter,
  parseWingsGroupV3MediaCommand,
  type WingsGroupV3ProductionApplyArgs,
  WINGSGROUP_V3_PRODUCTION_CONFIRMATION_PREFIX,
} from './import-wingsgroup-v3-media'

const archiveSha256 = 'a'.repeat(64)
const planSha256 = 'b'.repeat(64)
const releaseSha = 'c'.repeat(40)
const operationID = 'op-20260824-wingsgroup-v3-media'
const databaseName = 'wingsgroup'
const databaseURL = `postgresql://operator:never-logged@postgres/${databaseName}`

const manifest = {
  sourcePackage: { archiveSha256 },
} as never
const plan = {
  errors: [],
  planChecksum: planSha256,
  planned: 13,
  records: Array.from({ length: 13 }, (_, index) => ({
    derivatives: Array.from({ length: 6 }, (_, derivativeIndex) => ({
      file: `derivative-${index}-${derivativeIndex}`,
      format: derivativeIndex % 2 === 0 ? 'webp' : 'avif',
      width: 640,
    })),
  })),
} as never

const hash = (value: string) => createHash('sha256').update(value).digest('hex')

const createFixture = async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'wg-v3-production-gate-'))
  const backupEvidencePath = path.join(root, 'backup-evidence.json')
  const restoreEvidencePath = path.join(root, 'restore-evidence.json')
  const backupSha256 = 'd'.repeat(64)
  const restoreEvidence = {
    archiveSha256,
    backupSha256,
    databaseHost: 'postgres',
    databaseName,
    disposableRestore: true,
    operationID,
    planSha256,
    releaseSha,
    status: 'verified',
    targetDatabase: 'wingsgroup-restore-rehearsal',
  }
  const restoreEvidenceBytes = `${JSON.stringify(restoreEvidence)}\n`
  const restoreEvidenceSha256 = hash(restoreEvidenceBytes)
  const backupEvidence = {
    archiveSha256,
    backupSha256,
    databaseHost: 'postgres',
    databaseName,
    encrypted: true,
    format: 'postgres-custom',
    operationID,
    planSha256,
    releaseSha,
    restoreEvidenceSha256,
    status: 'verified',
  }
  const backupEvidenceBytes = `${JSON.stringify(backupEvidence)}\n`
  await writeFile(backupEvidencePath, backupEvidenceBytes)
  await writeFile(restoreEvidencePath, restoreEvidenceBytes)
  return {
    backupEvidencePath,
    backupEvidenceSha256: hash(backupEvidenceBytes),
    restoreEvidencePath,
    restoreEvidenceSha256,
    root,
  }
}

type FixtureEnvironment = Record<string, string | undefined>

const baseArgs = (
  fixture: Awaited<ReturnType<typeof createFixture>>,
): WingsGroupV3ProductionApplyArgs => ({
  archiveSha256,
  backupEvidencePath: fixture.backupEvidencePath,
  backupEvidenceSha256: fixture.backupEvidenceSha256,
  confirm: `${WINGSGROUP_V3_PRODUCTION_CONFIRMATION_PREFIX}:${operationID}`,
  operationID,
  planSha256,
  releaseSha,
  restoreEvidencePath: fixture.restoreEvidencePath,
  restoreEvidenceSha256: fixture.restoreEvidenceSha256,
  siteCode: 'wings-group',
})

const baseEnv = (fixture: Awaited<ReturnType<typeof createFixture>>): FixtureEnvironment => ({
  DATABASE_URL: databaseURL,
  NODE_ENV: 'production',
  PAYLOAD_DB_PUSH: 'false',
  WINGSGROUP_V3_MEDIA_ARCHIVE_SHA256: archiveSha256,
  WINGSGROUP_V3_MEDIA_PLAN_SHA256: planSha256,
  WINGSGROUP_V3_PRODUCTION_ALLOW: 'production',
  WINGSGROUP_V3_PRODUCTION_BACKUP_EVIDENCE_SHA256: fixture.backupEvidenceSha256,
  WINGSGROUP_V3_PRODUCTION_CONFIRMATION_TOKEN: `${WINGSGROUP_V3_PRODUCTION_CONFIRMATION_PREFIX}:${operationID}`,
  WINGSGROUP_V3_PRODUCTION_DATABASE_HOST: 'postgres',
  WINGSGROUP_V3_PRODUCTION_DATABASE_NAME: databaseName,
  WINGSGROUP_V3_PRODUCTION_OPERATION_ID: operationID,
  WINGSGROUP_V3_PRODUCTION_RELEASE_SHA: releaseSha,
  WINGSGROUP_V3_PRODUCTION_RESTORE_EVIDENCE_SHA256: fixture.restoreEvidenceSha256,
  WINGSGROUP_V3_PRODUCTION_SITE_CODE: 'wings-group',
  WINGSTRAVEL_RELEASE_SHA: releaseSha,
})

describe('WingsGroup v3 production media writer gate', () => {
  it('keeps plan/local apply distinct and accepts only explicit production verbs', () => {
    expect(
      parseWingsGroupV3MediaCommand([
        'plan',
        '--manifest=/tmp/manifest.json',
        '--assets-dir=/tmp/assets',
      ]),
    ).toMatchObject({ apply: false, phase: 'plan', production: false })
    expect(
      parseWingsGroupV3MediaCommand([
        'apply',
        '--manifest=/tmp/manifest.json',
        '--assets-dir=/tmp/assets',
        '--site-code=wings-group',
      ]),
    ).toMatchObject({ apply: true, phase: 'apply', production: false })
    expect(
      parseWingsGroupV3MediaCommand([
        'production-verify',
        '--manifest=/tmp/manifest.json',
        '--assets-dir=/tmp/assets',
        '--site-code=wings-group',
      ]),
    ).toMatchObject({ apply: false, phase: 'production-verify', production: true })
    expect(() =>
      parseWingsGroupV3MediaCommand([
        'rollback',
        '--manifest=/tmp/manifest.json',
        '--assets-dir=/tmp/assets',
      ]),
    ).toThrow(/backup\/restore only/)
  })

  it('accepts a fully bound production operation without initializing Payload', async () => {
    const fixture = await createFixture()
    try {
      const args = baseArgs(fixture)
      const env = baseEnv(fixture)
      let initialized = false
      const result = await initializeWingsGroupV3ProductionWriter({
        args,
        env,
        initialize: async (binding) => {
          initialized = true
          return binding
        },
        manifest,
        plan,
      })
      expect(initialized).toBe(true)
      expect(result).toMatchObject({
        archiveSha256,
        databaseName,
        operationID,
        planSha256,
        releaseSha,
      })
    } finally {
      await rm(fixture.root, { force: true, recursive: true })
    }
  })

  const missingGateCases: Array<
    [string, (args: WingsGroupV3ProductionApplyArgs, env: FixtureEnvironment) => void, RegExp]
  > = [
    ['confirmation token', (args) => (args.confirm = undefined), /confirmation token/],
    ['site scope', (args) => (args.siteCode = 'other-site'), /site-code|site scope/],
    [
      'trusted site scope',
      (_args, env) => (env.WINGSGROUP_V3_PRODUCTION_SITE_CODE = 'other-site'),
      /site scope/,
    ],
    ['runtime environment', (_args, env) => (env.NODE_ENV = 'development'), /NODE_ENV/],
    ['schema push lock', (_args, env) => (env.PAYLOAD_DB_PUSH = 'true'), /PAYLOAD_DB_PUSH/],
    [
      'database protocol',
      (_args, env) => (env.DATABASE_URL = 'file:production.sqlite'),
      /PostgreSQL/,
    ],
    [
      'production marker',
      (_args, env) => (env.WINGSGROUP_V3_PRODUCTION_ALLOW = 'local'),
      /target marker/,
    ],
    [
      'database target',
      (_args, env) => (env.WINGSGROUP_V3_PRODUCTION_DATABASE_NAME = 'other'),
      /database target/,
    ],
    [
      'archive binding',
      (_args, env) => (env.WINGSGROUP_V3_MEDIA_ARCHIVE_SHA256 = 'e'.repeat(64)),
      /archive checksum/,
    ],
    [
      'plan binding',
      (_args, env) => (env.WINGSGROUP_V3_MEDIA_PLAN_SHA256 = 'e'.repeat(64)),
      /plan checksum/,
    ],
    [
      'release binding',
      (_args, env) => (env.WINGSTRAVEL_RELEASE_SHA = 'e'.repeat(40)),
      /release SHA/,
    ],
    [
      'operation binding',
      (_args, env) => (env.WINGSGROUP_V3_PRODUCTION_OPERATION_ID = 'other-operation-id'),
      /operation binding/,
    ],
    [
      'backup evidence binding',
      (args) => (args.backupEvidenceSha256 = 'e'.repeat(64)),
      /backup evidence checksum binding/,
    ],
    [
      'restore evidence binding',
      (args) => (args.restoreEvidenceSha256 = 'e'.repeat(64)),
      /restore evidence checksum binding/,
    ],
    [
      'backup evidence',
      (args) => (args.backupEvidencePath = undefined),
      /encrypted backup evidence/,
    ],
    [
      'restore evidence',
      (args) => (args.restoreEvidencePath = undefined),
      /disposable restore evidence/,
    ],
  ]

  it.each(missingGateCases)(
    'rejects before Payload initialization when %s is missing or mismatched',
    async (_name, mutate, pattern) => {
      const fixture = await createFixture()
      try {
        const args = baseArgs(fixture)
        const env = baseEnv(fixture)
        mutate(args, env)
        let initialized = false
        await expect(
          initializeWingsGroupV3ProductionWriter({
            args,
            env,
            initialize: async () => {
              initialized = true
              return true
            },
            manifest,
            plan,
          }),
        ).rejects.toThrow(pattern)
        expect(initialized).toBe(false)
      } finally {
        await rm(fixture.root, { force: true, recursive: true })
      }
    },
  )

  it('rejects a production-looking environment when the explicit evidence contract is absent', async () => {
    const fixture = await createFixture()
    try {
      const args = baseArgs(fixture)
      const env = baseEnv(fixture)
      delete env.WINGSGROUP_V3_PRODUCTION_CONFIRMATION_TOKEN
      let initialized = false
      await expect(
        initializeWingsGroupV3ProductionWriter({
          args,
          env,
          initialize: async () => {
            initialized = true
            return true
          },
          manifest,
          plan,
        }),
      ).rejects.toThrow(/confirmation token/)
      expect(initialized).toBe(false)
    } finally {
      await rm(fixture.root, { force: true, recursive: true })
    }
  })

  it('does not require backup evidence for read-only production verification', async () => {
    const fixture = await createFixture()
    try {
      const args = baseArgs(fixture)
      const env = baseEnv(fixture)
      args.backupEvidencePath = undefined
      args.backupEvidenceSha256 = undefined
      args.restoreEvidencePath = undefined
      args.restoreEvidenceSha256 = undefined
      delete env.WINGSGROUP_V3_PRODUCTION_BACKUP_EVIDENCE_SHA256
      delete env.WINGSGROUP_V3_PRODUCTION_CONFIRMATION_TOKEN
      delete env.WINGSGROUP_V3_PRODUCTION_RESTORE_EVIDENCE_SHA256
      expect(
        assertWingsGroupV3ProductionMediaGate({
          args,
          env,
          manifest,
          phase: 'verify',
          plan,
        }),
      ).toMatchObject({ operationID, planSha256, releaseSha })
    } finally {
      await rm(fixture.root, { force: true, recursive: true })
    }
  })

  it('does not expose evidence contents or database credentials in the gate error surface', async () => {
    const fixture = await createFixture()
    try {
      const args = baseArgs(fixture)
      args.backupEvidenceSha256 = 'e'.repeat(64)
      const env = baseEnv(fixture)
      expect(() =>
        assertWingsGroupV3ProductionMediaGate({ args, env, manifest, phase: 'apply', plan }),
      ).toThrow(/backup evidence checksum binding/)
      try {
        assertWingsGroupV3ProductionMediaGate({ args, env, manifest, phase: 'apply', plan })
      } catch (error) {
        const message = String(error)
        expect(message).not.toContain('operator:never-logged')
        expect(message).not.toContain('backupSha256')
      }
      expect(await readFile(fixture.backupEvidencePath, 'utf8')).toContain('backupSha256')
    } finally {
      await rm(fixture.root, { force: true, recursive: true })
    }
  })
})
