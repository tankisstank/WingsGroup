import { createHash } from 'node:crypto'
import { readFile, rm, writeFile, mkdtemp } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  assertWingsGroupV3ProductionMediaGate,
  buildWingsGroupV3MediaGovernance,
  initializeWingsGroupV3ProductionWriter,
  parseWingsGroupV3MediaCommand,
  verifyWingsGroupV3Media,
  validateWingsGroupV3DerivativeLedger,
  type WingsGroupV3ProductionApplyArgs,
  WINGSGROUP_V3_PRODUCTION_CONFIRMATION_PREFIX,
  WINGSGROUP_V3_PRODUCTION_PUBLICATION_CONFIRMATION_PREFIX,
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

const verificationManifest = {
  licenseScope: 'WingsGroup editorial-service scope',
  media: [],
  publicationState: 'approved-for-production',
  rights: {
    evidence: 'Approved handoff evidence',
    restriction: 'Editorial use only',
    state: 'approved',
  },
  siteCode: 'wings-group',
  sourcePackage: {
    archiveSha256: archiveSha256,
    attachmentId: 'verification-attachment',
  },
  version: 1,
} as never

const verificationRecord = {
  alt: { en: 'Verified English alt', vi: 'Alt tiếng Việt đã xác minh' },
  derivatives: [
    { file: 'one.webp', format: 'webp' as const, width: 640 },
    { file: 'one.avif', format: 'avif' as const, width: 640 },
  ],
  focal: { x: 50, y: 50 },
  importFilename: 'verification.png',
  role: 'service-verification',
  sourceDimensions: { height: 1024, width: 1536 },
  sourceFile: 'verification.png',
  sourceFileSha256: 'f'.repeat(64),
  sourceIdentity: 'verification-attachment:f'.repeat(1),
  usageScope: 'editorial-service' as const,
}

const verificationPlan = { records: [verificationRecord] } as never

const createVerificationPayload = ({
  altOverrides = {},
  documentOverrides = {},
  governanceOverrides = {},
}: {
  altOverrides?: Partial<Record<'en' | 'vi', string>>
  documentOverrides?: Record<string, unknown>
  governanceOverrides?: Record<string, unknown>
} = {}) => {
  const expectedGovernance = buildWingsGroupV3MediaGovernance({
    manifest: verificationManifest,
    record: verificationRecord,
  })
  return {
    find: async ({ locale }: { locale?: 'en' | 'vi' }) => ({
      docs: [
        {
          id: 101,
          site: 7,
          width: verificationRecord.sourceDimensions.width,
          height: verificationRecord.sourceDimensions.height,
          filename: verificationRecord.importFilename,
          alt: altOverrides[locale || 'vi'] || verificationRecord.alt[locale || 'vi'],
          governance: { ...expectedGovernance, ...governanceOverrides },
          ...documentOverrides,
        },
      ],
    }),
  } as never
}

describe('WingsGroup v3 production media writer gate', () => {
  it('fails closed when a governed Payload derivative is missing or its persisted hash differs', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'wg-v3-derivative-ledger-'))
    const derivatives = [640, 960, 1440].flatMap((width) =>
      (['webp', 'avif'] as const).map((format) => ({
        file: `wingsgroup-airport-service-abcdef123456-${width}.${format}`,
        format,
        width,
      })),
    )
    const record = {
      derivatives,
      sourceFile: 'wingsgroup-airport-service.png',
    } as never
    try {
      for (const [index, derivative] of derivatives.entries()) {
        if (index > 0) await writeFile(path.join(root, derivative.file), `derivative-${index}`)
      }
      const sizes = Object.fromEntries(
        derivatives.map((derivative) => [
          `wingsgroup-v3-${derivative.width}-${derivative.format}`,
          {
            filename: derivative.file,
            height: 400,
            mimeType: `image/${derivative.format}`,
            width: derivative.width,
          },
        ]),
      )
      await expect(
        validateWingsGroupV3DerivativeLedger({
          document: { sizes },
          mediaDirectory: root,
          publicOrigin: 'https://wingsgroup.example',
          record,
        }),
      ).rejects.toThrow(/missing|ENOENT/)

      for (const [index, derivative] of derivatives.entries()) {
        if (index === 0) await writeFile(path.join(root, derivative.file), 'derivative-0')
      }
      const ledger = derivatives.map((derivative, index) => ({
        format: derivative.format,
        height: 400,
        sha256: index === 0 ? '0'.repeat(64) : hash(`derivative-${index}`),
        url: `https://wingsgroup.example/media/${derivative.file}`,
        width: derivative.width,
      }))
      await expect(
        validateWingsGroupV3DerivativeLedger({
          document: { governance: { responsiveDerivatives: ledger }, sizes },
          mediaDirectory: root,
          publicOrigin: 'https://wingsgroup.example',
          record,
        }),
      ).rejects.toThrow(/ledger/)
    } finally {
      await rm(root, { force: true, recursive: true })
    }
  })

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
    expect(
      parseWingsGroupV3MediaCommand([
        'production-publish',
        '--manifest=/tmp/manifest.json',
        '--assets-dir=/tmp/assets',
        '--site-code=wings-group',
        '--publish-confirm=publication-token',
      ]),
    ).toMatchObject({ apply: true, phase: 'production-publish', production: true })
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

  it('requires a second operation-bound confirmation for production publication', async () => {
    const fixture = await createFixture()
    try {
      const args = baseArgs(fixture)
      const env = baseEnv(fixture)
      const publicationConfirmation = `${WINGSGROUP_V3_PRODUCTION_PUBLICATION_CONFIRMATION_PREFIX}:${operationID}`
      args.publishConfirm = publicationConfirmation
      env.WINGSGROUP_V3_PRODUCTION_PUBLICATION_CONFIRMATION_TOKEN = publicationConfirmation
      expect(
        assertWingsGroupV3ProductionMediaGate({
          args,
          env,
          manifest,
          phase: 'publish',
          plan,
        }),
      ).toMatchObject({ operationID, planSha256, releaseSha })

      delete env.WINGSGROUP_V3_PRODUCTION_PUBLICATION_CONFIRMATION_TOKEN
      expect(() =>
        assertWingsGroupV3ProductionMediaGate({
          args,
          env,
          manifest,
          phase: 'publish',
          plan,
        }),
      ).toThrow(/publication confirmation/)
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
      'empty database path',
      (_args, env) => {
        env.DATABASE_URL = 'postgresql://operator@postgres/'
        env.WINGSGROUP_V3_PRODUCTION_DATABASE_NAME = ''
      },
      /exact nonempty PostgreSQL database path/,
    ],
    [
      'ambiguous database path',
      (_args, env) => (env.DATABASE_URL = `${databaseURL}/other`),
      /exact nonempty PostgreSQL database path/,
    ],
    [
      'empty trusted database binding',
      (_args, env) => (env.WINGSGROUP_V3_PRODUCTION_DATABASE_NAME = ''),
      /exact nonempty database-name binding/,
    ],
    [
      'database query override',
      (_args, env) => (env.DATABASE_URL = `${databaseURL}?dbname=other`),
      /exact nonempty PostgreSQL database path/,
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

  it('verifies both localized alts and reports responsive derivatives as pending, not verified', async () => {
    const result = await verifyWingsGroupV3Media({
      manifest: verificationManifest,
      payload: createVerificationPayload(),
      plan: verificationPlan,
      req: {} as never,
      siteID: 7,
    })

    expect(result).toMatchObject({
      localizedAltVerified: 2,
      responsiveDerivatives: {
        persisted: 0,
        planned: 2,
        state: 'pending',
        verified: false,
      },
      verified: 1,
    })
  })

  it.each([
    ['vi localized alt', { vi: 'wrong Vietnamese alt' }, /localized alt/],
    ['en localized alt', { en: 'wrong English alt' }, /localized alt/],
  ])('rejects a mismatched %s', async (_name, altOverrides, pattern) => {
    await expect(
      verifyWingsGroupV3Media({
        manifest: verificationManifest,
        payload: createVerificationPayload({ altOverrides }),
        plan: verificationPlan,
        req: {} as never,
        siteID: 7,
      }),
    ).rejects.toThrow(pattern)
  })

  it.each([
    ['managedBy', { managedBy: 'other' }],
    ['source identity', { sourceIdentity: 'other-identity' }],
    ['archive checksum', { sourceArchiveSha256: 'e'.repeat(64) }],
    ['attachment identity', { sourceAttachmentId: 'other-attachment' }],
    ['source checksum', { sourceFileSha256: 'e'.repeat(64) }],
    ['source filename', { sourceFilename: 'other.png' }],
    ['provenance', { provenanceReference: 'other-reference' }],
    ['rights state', { rightsState: 'pending' }],
    ['rights evidence', { rightsEvidence: 'other evidence' }],
    ['usage scope', { usageScope: 'other-scope' }],
    ['publication state', { publicationState: 'published' }],
    ['derivative state', { derivativeState: 'verified' }],
    ['responsive derivative inventory', { responsiveDerivatives: [{ width: 640 }] }],
  ])('rejects a mismatched persisted governance %s', async (_name, governanceOverrides) => {
    await expect(
      verifyWingsGroupV3Media({
        manifest: verificationManifest,
        payload: createVerificationPayload({ governanceOverrides }),
        plan: verificationPlan,
        req: {} as never,
        siteID: 7,
      }),
    ).rejects.toThrow(/persisted governance/)
  })
})
