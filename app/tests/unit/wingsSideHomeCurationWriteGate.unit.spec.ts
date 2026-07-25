import fs from 'node:fs'
import { createHash } from 'node:crypto'
import os from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import {
  assertHomeCurationWriteGate,
  homeCurationDatabaseName,
  parseHomeCurationCLIArgs,
} from '../../scripts/lib/wingsSideHomeCurationWriteGate'

const temporaryPaths: string[] = []

afterEach(() => {
  for (const target of temporaryPaths.splice(0)) fs.rmSync(target, { force: true, recursive: true })
})

const productionFixture = () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'wingsside-home-curation-guard-'))
  temporaryPaths.push(directory)
  const backupPath = path.join(directory, 'us050.dump.age')
  const backupSha256 = '4f7ccdd29300a236c2e9b6632fe1715dbfb8a64bf63849d7b28e90143d0e8939'
  const releaseSha = '815d34bcb105eb19fd9ef4352581b5160774f9e5'
  const rollbackRelease = '/home/ubuntu/wings-travel/releases/wingsside-us052-f12077d'
  const rollbackReleaseSha = 'f12077d92394f0e07aa21d05d6ef98ae762f4844'
  fs.writeFileSync(backupPath, 'encrypted-us050-backup')
  fs.writeFileSync(
    `${backupPath}.json`,
    JSON.stringify({
      checksumSha256: backupSha256,
      database: 'wingstravel',
      encrypted: true,
      file: 'us050.dump.age',
      format: 'postgres-custom',
      intendedReleaseSha: releaseSha,
      restoreListVerified: true,
      rollbackRelease,
      rollbackReleaseSha,
    }),
  )
  const manifestSha256 = createHash('sha256')
    .update(fs.readFileSync(`${backupPath}.json`))
    .digest('hex')
  const rollbackShaPath = path.posix.join(rollbackRelease, 'RELEASE_SHA')
  return {
    args: {
      adminEmail: 'admin@wingside.vn',
      backupPath,
      backupSha256,
      localConfirm: false,
      production: true,
      productionConfirm: 'wing-side',
      releaseSha,
      rollbackRelease,
    },
    env: {
      ADMIN_EMAIL: 'admin@wingside.vn',
      DATABASE_URL: 'postgresql://user:secret@postgres:5432/wingstravel',
      NODE_ENV: 'production',
      PAYLOAD_DB_PUSH: 'false',
      POSTGRES_DB: 'wingstravel',
      WINGSSIDE_RELEASE_BACKUP_MANIFEST_SHA256: manifestSha256,
      WINGSSIDE_RELEASE_BACKUP_SHA256: backupSha256,
      WINGSSIDE_RELEASE_REMEDIATION_ALLOW: 'production',
      WINGSSIDE_RELEASE_SHA: releaseSha,
      WINGSSIDE_ROLLBACK_RELEASE_PATH: rollbackRelease,
      WINGSSIDE_ROLLBACK_RELEASE_SHA: rollbackReleaseSha,
    },
    io: {
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
          ? '/home/ubuntu/wings-travel/shared/backups/us050.dump.age'
          : String(target) === rollbackRelease
            ? rollbackRelease
          : fs.realpathSync(target)) as typeof fs.realpathSync,
      statSync: ((target: fs.PathLike) =>
        String(target) === rollbackRelease
          ? { isDirectory: () => true }
          : fs.statSync(target)) as typeof fs.statSync,
    },
  }
}

describe('WingSide Home curation write gate', () => {
  it('parses production proof arguments without weakening local confirmation', () => {
    expect(
      parseHomeCurationCLIArgs([
        '--apply',
        '--production',
        '--confirm-production=wing-side',
        '--release-sha=abc',
        '--backup',
        '/backups/us050.dump.age',
      ]),
    ).toMatchObject({
      backupPath: '/backups/us050.dump.age',
      localConfirm: false,
      production: true,
      productionConfirm: 'wing-side',
      releaseSha: 'abc',
    })
  })

  it('allows the existing explicit local SQLite apply contract', () => {
    expect(() =>
      assertHomeCurationWriteGate({
        args: {
          environment: 'local',
          localConfirm: true,
          production: false,
        },
        databaseName: 'sqlite',
        env: { NODE_ENV: 'development' },
        mode: 'apply',
      }),
    ).not.toThrow()
  })

  it('allows production only with the complete release and backup contract', () => {
    const fixture = productionFixture()
    expect(() =>
      assertHomeCurationWriteGate({
        args: fixture.args,
        databaseName: 'postgres',
        env: fixture.env,
        io: fixture.io,
        mode: 'apply',
      }),
    ).not.toThrow()
  })

  it('rejects production when the backup checksum drifts', () => {
    const fixture = productionFixture()
    fixture.args.backupSha256 = '0'.repeat(64)
    expect(() =>
      assertHomeCurationWriteGate({
        args: fixture.args,
        databaseName: 'postgres',
        env: fixture.env,
        io: fixture.io,
        mode: 'apply',
      }),
    ).toThrow(/backup checksum mismatch/)
  })

  it('rejects a production flag against SQLite', () => {
    const fixture = productionFixture()
    expect(() =>
      assertHomeCurationWriteGate({
        args: fixture.args,
        databaseName: 'sqlite',
        env: fixture.env,
        io: fixture.io,
        mode: 'apply',
      }),
    ).toThrow(/requires Payload PostgreSQL/)
  })

  it('classifies the database before Payload initialization', () => {
    expect(homeCurationDatabaseName(undefined)).toBe('sqlite')
    expect(homeCurationDatabaseName('file:./data/local.db')).toBe('sqlite')
    expect(homeCurationDatabaseName('postgresql://user:secret@postgres:5432/wingstravel')).toBe(
      'postgres',
    )
  })

  it('rejects production before Payload initialization when schema push is enabled', () => {
    const fixture = productionFixture()
    fixture.env.PAYLOAD_DB_PUSH = 'true'
    expect(() =>
      assertHomeCurationWriteGate({
        args: fixture.args,
        databaseName: homeCurationDatabaseName(fixture.env.DATABASE_URL),
        env: fixture.env,
        io: fixture.io,
        mode: 'apply',
      }),
    ).toThrow(/PAYLOAD_DB_PUSH=false/)
  })

  it('rejects a self-attested backup that is not bound by the trusted environment', () => {
    const fixture = productionFixture()
    fixture.env.WINGSSIDE_RELEASE_BACKUP_SHA256 = '0'.repeat(64)
    expect(() =>
      assertHomeCurationWriteGate({
        args: fixture.args,
        databaseName: 'postgres',
        env: fixture.env,
        io: fixture.io,
        mode: 'apply',
      }),
    ).toThrow(/trusted release environment/)
  })

  it('keeps audit mode read-only without requiring write credentials', () => {
    expect(
      assertHomeCurationWriteGate({
        args: { localConfirm: false, production: false },
        databaseName: 'postgres',
        env: { NODE_ENV: 'production', PAYLOAD_DB_PUSH: 'false' },
        mode: 'audit',
      }),
    ).toEqual({ environment: 'read-only', productionMutation: false })
  })

  it('blocks production audit before Payload initialization when schema push is enabled', () => {
    expect(() =>
      assertHomeCurationWriteGate({
        args: { localConfirm: false, production: false },
        databaseName: 'postgres',
        env: { NODE_ENV: 'production', PAYLOAD_DB_PUSH: 'true' },
        mode: 'audit',
      }),
    ).toThrow(/PAYLOAD_DB_PUSH=false/)
  })

  it('rejects a manifest whose bytes drift from the trusted checksum', () => {
    const fixture = productionFixture()
    fs.appendFileSync(`${fixture.args.backupPath}.json`, ' ')
    expect(() =>
      assertHomeCurationWriteGate({
        args: fixture.args,
        databaseName: 'postgres',
        env: fixture.env,
        io: fixture.io,
        mode: 'apply',
      }),
    ).toThrow(/manifest checksum mismatch/)
  })
})
