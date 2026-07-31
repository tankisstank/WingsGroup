import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

import manifestJSON from '../../scripts/data/wingsside-group-commerce-v1/classification.json'
import { buildUs057BoundBackupManifest } from '../../scripts/lib/wingsSideUs057ReleaseEvidence'
import type { CommercePlan } from '../../scripts/lib/wingsSideGroupCommerceLifecycle'

const temporaryDirectories: string[] = []
const sha256 = (filename: string) =>
  createHash('sha256').update(readFileSync(filename)).digest('hex')

const fixture = () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'us057-release-evidence-'))
  temporaryDirectories.push(directory)
  const backupPath = path.join(directory, 'preapply.dump.age')
  const planPath = path.join(directory, 'plan.json')
  const restoreEvidencePath = path.join(directory, 'restore.json')
  const releaseSha = 'a'.repeat(40)
  writeFileSync(backupPath, 'encrypted-backup-fixture')
  const plan: CommercePlan = {
    schemaVersion: 1,
    kind: 'full',
    siteCode: 'wings-side',
    batchId: 'wingsside-bestprice-22-20260717',
    releaseSha,
    createdAt: '2026-07-31T09:00:00.000Z',
    expiresAt: '2026-07-31T17:00:00.000Z',
    sourceEvidenceSha256: 'b'.repeat(64),
    entries: manifestJSON.products.map((product) => ({
      productId: product.productId,
      sourceId: product.sourceId,
      classification: product.classification as never,
      preimageSha256: 'c'.repeat(64),
      postimageSha256: 'd'.repeat(64),
      before: {
        productId: product.productId,
        sourceId: product.sourceId,
        siteCode: 'wings-side',
        batchId: 'wingsside-bestprice-22-20260717',
        tourType: null,
        departures: [],
      },
      after: {
        productId: product.productId,
        sourceId: product.sourceId,
        siteCode: 'wings-side',
        batchId: 'wingsside-bestprice-22-20260717',
        tourType: product.classification as never,
        departures: [],
      },
    })),
  }
  writeFileSync(planPath, JSON.stringify(plan))
  writeFileSync(restoreEvidencePath, JSON.stringify({
    assertionProfile: 'wingsside-us057',
    backupChecksumSha256: sha256(backupPath),
    profileEvidence: {
      governedColumns: 9,
      inventoryIdentityIndexes: 1,
      us057Migrations: 2,
      wingSideSites: 1,
      wingSideTours: 22,
    },
    restoreListVerified: true,
    status: 'ok',
    targetDatabase: 'wingstravel_us057_restore_drill',
  }))
  return { backupPath, planPath, releaseSha, restoreEvidencePath }
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) rmSync(directory, { force: true, recursive: true })
})

describe('US057 production release evidence binding', () => {
  it('binds exact backup, restore assertions, full plan and rollback release', () => {
    const input = fixture()
    const result = buildUs057BoundBackupManifest({
      ...input,
      databaseHost: 'postgres',
      databaseName: 'wingstravel',
      rollbackRelease: '/home/ubuntu/wings-travel/releases/wingsside-us056-rollback',
      rollbackReleaseSha: 'e'.repeat(40),
    })
    expect(result).toMatchObject({
      checksumSha256: sha256(input.backupPath),
      database: 'wingstravel',
      databaseHost: 'postgres',
      encrypted: true,
      intendedReleaseSha: input.releaseSha,
      restoreDrillVerified: true,
      restoreListVerified: true,
    })
    expect(result.intendedPlanSha256).toMatch(/^[a-f0-9]{64}$/u)
    expect(result.restoreEvidenceSha256).toMatch(/^[a-f0-9]{64}$/u)
  })

  it('rejects incomplete profile evidence and a production restore target', () => {
    const input = fixture()
    const restore = JSON.parse(readFileSync(input.restoreEvidencePath, 'utf8'))
    restore.profileEvidence.us057Migrations = 1
    restore.targetDatabase = 'wingstravel'
    writeFileSync(input.restoreEvidencePath, JSON.stringify(restore))
    expect(() => buildUs057BoundBackupManifest({
      ...input,
      databaseHost: 'postgres',
      databaseName: 'wingstravel',
      rollbackRelease: '/home/ubuntu/wings-travel/releases/wingsside-us056-rollback',
      rollbackReleaseSha: 'e'.repeat(40),
    })).toThrow(/disposable-drill contract/)
  })
})
