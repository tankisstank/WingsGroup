import { createHash } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

import { assertTourEditorialProductionEvidence } from '../../scripts/lib/wingsSideTourEditorialProductionGate'

const files: string[] = []
const digest = (value: string) => createHash('sha256').update(value).digest('hex')

afterEach(() => {
  for (const file of files.splice(0)) fs.rmSync(file, { force: true, recursive: true })
})

const fixture = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wingside-editorial-gate-'))
  const backupPath = path.join(dir, 'production.dump.age')
  const backup = 'encrypted production dump'
  fs.writeFileSync(backupPath, backup)
  const backupSha256 = digest(backup)
  const manifest = JSON.stringify({
    checksumSha256: backupSha256,
    database: 'wingstravel',
    encrypted: true,
    file: 'production.dump.age',
    format: 'postgres-custom',
  })
  const manifestPath = `${backupPath}.json`
  fs.writeFileSync(manifestPath, manifest)
  const restorePath = path.join(dir, 'restore-drill.json')
  fs.writeFileSync(
    restorePath,
    JSON.stringify({
      backupChecksumSha256: backupSha256,
      status: 'ok',
      targetDatabase: 'wingstravel_restore_drill',
    }),
  )
  files.push(dir)
  return {
    args: { backupPath, backupSha256, restoreDrillEvidencePath: restorePath },
    env: {
      DATABASE_URL: 'postgresql://user:secret@postgres:5432/wingstravel',
      NODE_ENV: 'production',
      PAYLOAD_DB_PUSH: 'false',
      WINGSSIDE_RELEASE_REMEDIATION_ALLOW: 'production',
      WINGSSIDE_RELEASE_BACKUP_MANIFEST_SHA256: digest(manifest),
      WINGSSIDE_RELEASE_BACKUP_SHA256: backupSha256,
    },
  }
}

describe('WingSide tour editorial production backup gate', () => {
  it('accepts a checksummed encrypted backup and verified restore drill', () => {
    const value = fixture()
    expect(
      assertTourEditorialProductionEvidence({
        ...value,
        databaseURL: value.env.DATABASE_URL,
        phase: 'apply',
      }),
    ).toEqual({ environment: 'production' })
  })

  it('rejects a production write without restore evidence', () => {
    const value = fixture()
    expect(() =>
      assertTourEditorialProductionEvidence({
        args: { ...value.args, restoreDrillEvidencePath: undefined },
        databaseURL: value.env.DATABASE_URL,
        env: value.env,
        phase: 'apply',
      }),
    ).toThrow(/restore-drill evidence/)
  })

  it('allows the disposable PostgreSQL rehearsal marker only on loopback', () => {
    expect(
      assertTourEditorialProductionEvidence({
        args: {},
        databaseURL: 'postgresql://rehearsal@127.0.0.1:55432/wingside_rehearsal',
        env: {
          NODE_ENV: 'production',
          WINGSSIDE_TOUR_EDITORIAL_REHEARSAL_ALLOW: 'disposable-postgres',
        },
        phase: 'apply',
      }),
    ).toEqual({ environment: 'rehearsal' })
  })

  it('never requires backup evidence for read-only planning', () => {
    expect(
      assertTourEditorialProductionEvidence({ args: {}, databaseURL: '', phase: 'plan' }),
    ).toEqual({ environment: 'read-only' })
  })

  it('rejects a backup manifest for a different database', () => {
    const value = fixture()
    const manifestPath = `${value.args.backupPath}.json`
    const mismatched = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
    mismatched.database = 'another_database'
    fs.writeFileSync(manifestPath, JSON.stringify(mismatched))
    value.env.WINGSSIDE_RELEASE_BACKUP_MANIFEST_SHA256 = digest(
      JSON.stringify(mismatched),
    )
    expect(() =>
      assertTourEditorialProductionEvidence({
        ...value,
        databaseURL: value.env.DATABASE_URL,
        env: value.env,
        phase: 'apply',
      }),
    ).toThrow(/does not match/)
  })
})
