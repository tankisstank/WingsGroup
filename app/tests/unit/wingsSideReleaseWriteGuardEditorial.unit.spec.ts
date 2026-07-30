import { createHash } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  assertWingsSideEditorialProductionWriteGuard,
  initializeWingsSideEditorialProductionWriter,
  type WingsSideEditorialProductionWriteGuardArgs,
} from '../../scripts/lib/wingsSideReleaseWriteGuard'

const temporaryPaths: string[] = []
const sha256 = (value: Buffer | string) => createHash('sha256').update(value).digest('hex')

afterEach(() => {
  for (const target of temporaryPaths.splice(0)) {
    fs.rmSync(target, { force: true, recursive: true })
  }
})

const fixture = () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'wingsside-editorial-guard-'))
  temporaryPaths.push(directory)
  const backupPath = path.join(directory, 'tour-editorial.dump.age')
  const restoreEvidencePath = path.join(directory, 'restore-drill.json')
  const releaseSha = 'a'.repeat(40)
  const rollbackReleaseSha = 'b'.repeat(40)
  const rollbackRelease = '/home/ubuntu/wings-travel/releases/previous-release'
  const planSha256 = 'c'.repeat(64)
  fs.writeFileSync(backupPath, 'encrypted-production-backup')
  fs.writeFileSync(restoreEvidencePath, '{"restore":"verified"}')
  const backupSha256 = sha256(fs.readFileSync(backupPath))
  const restoreEvidenceSha256 = sha256(fs.readFileSync(restoreEvidencePath))
  fs.writeFileSync(
    `${backupPath}.json`,
    JSON.stringify({
      checksumSha256: backupSha256,
      database: 'wingstravel',
      databaseHost: 'postgres',
      encrypted: true,
      file: 'tour-editorial.dump.age',
      format: 'postgres-custom',
      intendedPlanSha256: planSha256,
      intendedReleaseSha: releaseSha,
      restoreDrillVerified: true,
      restoreEvidenceSha256,
      restoreListVerified: true,
      rollbackRelease,
      rollbackReleaseSha,
    }),
  )
  const manifestSha256 = sha256(fs.readFileSync(`${backupPath}.json`))
  const rollbackShaPath = path.posix.join(rollbackRelease, 'RELEASE_SHA')
  const args: WingsSideEditorialProductionWriteGuardArgs = {
    adminEmail: 'release-admin@wingside.vn',
    backupPath,
    backupSha256,
    planSha256,
    production: true,
    productionConfirm: 'wing-side',
    releaseSha,
    releaseSourceSha: releaseSha,
    restoreEvidencePath,
    restoreEvidenceSha256,
    rollbackRelease,
  }
  const env = {
    ADMIN_EMAIL: args.adminEmail,
    DATABASE_URL: 'postgresql://user:secret@postgres:5432/wingstravel',
    NODE_ENV: 'production',
    PAYLOAD_DB_PUSH: 'false',
    POSTGRES_DB: 'wingstravel',
    WINGSSIDE_RELEASE_BACKUP_MANIFEST_SHA256: manifestSha256,
    WINGSSIDE_RELEASE_BACKUP_SHA256: backupSha256,
    WINGSSIDE_RELEASE_DATABASE_HOST: 'postgres',
    WINGSSIDE_RELEASE_DATABASE_NAME: 'wingstravel',
    WINGSSIDE_RELEASE_REMEDIATION_ALLOW: 'production',
    WINGSSIDE_RELEASE_RESTORE_EVIDENCE_SHA256: restoreEvidenceSha256,
    WINGSSIDE_RELEASE_SHA: releaseSha,
    WINGSSIDE_ROLLBACK_RELEASE_PATH: rollbackRelease,
    WINGSSIDE_ROLLBACK_RELEASE_SHA: rollbackReleaseSha,
    WINGSSIDE_TOUR_EDITORIAL_PLAN_SHA256: planSha256,
    WINGSTRAVEL_RELEASE_SHA: releaseSha,
  }
  const io = {
    existsSync: (target: fs.PathLike) =>
      String(target) === rollbackRelease ||
      String(target) === rollbackShaPath ||
      fs.existsSync(target),
    readFileSync: ((target: fs.PathOrFileDescriptor, encoding?: BufferEncoding) =>
      String(target) === rollbackShaPath
        ? rollbackReleaseSha
        : fs.readFileSync(target, encoding as BufferEncoding)) as typeof fs.readFileSync,
    realpathSync: ((target: fs.PathLike) =>
      String(target) === backupPath
        ? '/home/ubuntu/wings-travel/shared/backups/tour-editorial.dump.age'
        : String(target) === rollbackRelease
          ? rollbackRelease
          : fs.realpathSync(target)) as typeof fs.realpathSync,
    statSync: ((target: fs.PathLike) =>
      String(target) === rollbackRelease
        ? { isDirectory: () => true }
        : fs.statSync(target)) as typeof fs.statSync,
  }
  return { args, env, io }
}

describe('WingSide tour editorial production release guard', () => {
  it('accepts only a fully bound immutable production evidence package', () => {
    const value = fixture()
    expect(
      assertWingsSideEditorialProductionWriteGuard(value.args, value.env, value.io),
    ).toMatchObject({
      databaseHost: 'postgres',
      databaseName: 'wingstravel',
      operator: 'release-admin@wingside.vn',
      planSha256: 'c'.repeat(64),
      releaseSha: 'a'.repeat(40),
      rollbackReleaseSha: 'b'.repeat(40),
    })
  })

  it.each([
    {
      name: 'production confirmation',
      mutate: ({ args }: ReturnType<typeof fixture>) => {
        args.productionConfirm = undefined
      },
      pattern: /confirm-production/,
    },
    {
      name: 'schema migration lock',
      mutate: ({ env }: ReturnType<typeof fixture>) => {
        env.PAYLOAD_DB_PUSH = 'true'
      },
      pattern: /PAYLOAD_DB_PUSH=false/,
    },
    {
      name: 'operator identity',
      mutate: ({ args }: ReturnType<typeof fixture>) => {
        args.adminEmail = undefined
      },
      pattern: /admin-email/,
    },
    {
      name: 'supplied plan checksum',
      mutate: ({ args }: ReturnType<typeof fixture>) => {
        args.planSha256 = undefined
      },
      pattern: /plan-sha256/,
    },
    {
      name: 'trusted plan checksum',
      mutate: ({ env }: ReturnType<typeof fixture>) => {
        env.WINGSSIDE_TOUR_EDITORIAL_PLAN_SHA256 = 'd'.repeat(64)
      },
      pattern: /plan checksum/,
    },
    {
      name: 'release source binding',
      mutate: ({ args }: ReturnType<typeof fixture>) => {
        args.releaseSourceSha = 'd'.repeat(40)
      },
      pattern: /release source SHA/,
    },
    {
      name: 'release SHA',
      mutate: ({ args }: ReturnType<typeof fixture>) => {
        args.releaseSha = undefined
      },
      pattern: /release-sha/,
    },
    {
      name: 'database host allowlist',
      mutate: ({ env }: ReturnType<typeof fixture>) => {
        env.WINGSSIDE_RELEASE_DATABASE_HOST = 'other'
      },
      pattern: /database target/,
    },
    {
      name: 'database name allowlist',
      mutate: ({ env }: ReturnType<typeof fixture>) => {
        env.WINGSSIDE_RELEASE_DATABASE_NAME = 'other'
      },
      pattern: /database target/,
    },
    {
      name: 'trusted backup checksum',
      mutate: ({ env }: ReturnType<typeof fixture>) => {
        env.WINGSSIDE_RELEASE_BACKUP_SHA256 = 'd'.repeat(64)
      },
      pattern: /backup checksum/,
    },
    {
      name: 'encrypted backup file',
      mutate: ({ args }: ReturnType<typeof fixture>) => {
        fs.rmSync(args.backupPath!)
      },
      pattern: /encrypted production backup is missing/,
    },
    {
      name: 'backup manifest file',
      mutate: ({ args }: ReturnType<typeof fixture>) => {
        fs.rmSync(`${args.backupPath}.json`)
      },
      pattern: /backup manifest is missing/,
    },
    {
      name: 'trusted backup manifest checksum',
      mutate: ({ env }: ReturnType<typeof fixture>) => {
        env.WINGSSIDE_RELEASE_BACKUP_MANIFEST_SHA256 = 'd'.repeat(64)
      },
      pattern: /manifest checksum mismatch/,
    },
    {
      name: 'restore-drill evidence file',
      mutate: ({ args }: ReturnType<typeof fixture>) => {
        args.restoreEvidencePath = undefined
      },
      pattern: /restore-drill evidence/,
    },
    {
      name: 'restore-drill evidence checksum',
      mutate: ({ env }: ReturnType<typeof fixture>) => {
        env.WINGSSIDE_RELEASE_RESTORE_EVIDENCE_SHA256 = 'd'.repeat(64)
      },
      pattern: /restore-drill evidence/,
    },
    {
      name: 'supplied restore-drill checksum',
      mutate: ({ args }: ReturnType<typeof fixture>) => {
        args.restoreEvidenceSha256 = undefined
      },
      pattern: /restore-evidence-sha256/,
    },
    {
      name: 'pre-authorized rollback path',
      mutate: ({ env }: ReturnType<typeof fixture>) => {
        env.WINGSSIDE_ROLLBACK_RELEASE_PATH =
          '/home/ubuntu/wings-travel/releases/not-authorized'
      },
      pattern: /rollback release/,
    },
    {
      name: 'pre-authorized rollback SHA',
      mutate: ({ env }: ReturnType<typeof fixture>) => {
        env.WINGSSIDE_ROLLBACK_RELEASE_SHA = 'd'.repeat(40)
      },
      pattern: /rollback release SHA/,
    },
    {
      name: 'restore-list verification in manifest',
      mutate: ({ args, env }: ReturnType<typeof fixture>) => {
        const manifestPath = `${args.backupPath}.json`
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as Record<
          string,
          unknown
        >
        manifest.restoreListVerified = false
        fs.writeFileSync(manifestPath, JSON.stringify(manifest))
        env.WINGSSIDE_RELEASE_BACKUP_MANIFEST_SHA256 = sha256(fs.readFileSync(manifestPath))
      },
      pattern: /restoreListVerified mismatch/,
    },
    {
      name: 'plan binding in manifest',
      mutate: ({ args, env }: ReturnType<typeof fixture>) => {
        const manifestPath = `${args.backupPath}.json`
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as Record<
          string,
          unknown
        >
        manifest.intendedPlanSha256 = 'd'.repeat(64)
        fs.writeFileSync(manifestPath, JSON.stringify(manifest))
        env.WINGSSIDE_RELEASE_BACKUP_MANIFEST_SHA256 = sha256(fs.readFileSync(manifestPath))
      },
      pattern: /intendedPlanSha256 mismatch/,
    },
    {
      name: 'restore-drill verification in manifest',
      mutate: ({ args, env }: ReturnType<typeof fixture>) => {
        const manifestPath = `${args.backupPath}.json`
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as Record<
          string,
          unknown
        >
        manifest.restoreDrillVerified = false
        fs.writeFileSync(manifestPath, JSON.stringify(manifest))
        env.WINGSSIDE_RELEASE_BACKUP_MANIFEST_SHA256 = sha256(fs.readFileSync(manifestPath))
      },
      pattern: /restoreDrillVerified mismatch/,
    },
  ])('blocks a missing or invalid $name artifact before writer initialization', async ({
    mutate,
    pattern,
  }) => {
    const value = fixture()
    mutate(value)
    const initialize = vi.fn(async () => ({ initialized: true }))
    await expect(
      initializeWingsSideEditorialProductionWriter({
        args: value.args,
        env: value.env,
        initialize,
        io: value.io,
      }),
    ).rejects.toThrow(pattern)
    expect(initialize).not.toHaveBeenCalled()
  })
})
