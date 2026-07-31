import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'

import {
  groupCommerceChecksum,
  type CommercePlan,
} from './wingsSideGroupCommerceLifecycle'

const sha256File = (filename: string) =>
  createHash('sha256').update(readFileSync(filename)).digest('hex')

const fullGitSha = (value: string, label: string) => {
  if (!/^[a-f0-9]{40}$/u.test(value)) throw new Error(`${label} must be a full lowercase Git SHA`)
  return value
}

export type Us057RestoreEvidence = {
  assertionProfile?: unknown
  backupChecksumSha256?: unknown
  profileEvidence?: {
    governedColumns?: unknown
    inventoryIdentityIndexes?: unknown
    us057Migrations?: unknown
    wingSideSites?: unknown
    wingSideTours?: unknown
  }
  restoreListVerified?: unknown
  status?: unknown
  targetDatabase?: unknown
}

export const buildUs057BoundBackupManifest = ({
  backupPath,
  databaseHost,
  databaseName,
  planPath,
  releaseSha,
  restoreEvidencePath,
  rollbackRelease,
  rollbackReleaseSha,
}: {
  backupPath: string
  databaseHost: string
  databaseName: string
  planPath: string
  releaseSha: string
  restoreEvidencePath: string
  rollbackRelease: string
  rollbackReleaseSha: string
}) => {
  fullGitSha(releaseSha, 'releaseSha')
  fullGitSha(rollbackReleaseSha, 'rollbackReleaseSha')
  if (releaseSha === rollbackReleaseSha) throw new Error('Rollback release must differ from release')
  if (!backupPath.endsWith('.dump.age')) throw new Error('US057 production backup must end with .dump.age')
  if (databaseHost !== 'postgres') throw new Error('US057 production database host must be postgres')
  if (!databaseName || !rollbackRelease.startsWith('/home/ubuntu/wings-travel/releases/')) {
    throw new Error('US057 database or rollback release scope is invalid')
  }

  const plan = JSON.parse(readFileSync(planPath, 'utf8')) as CommercePlan
  if (
    plan.releaseSha !== releaseSha ||
    plan.siteCode !== 'wings-side' ||
    plan.batchId !== 'wingsside-bestprice-22-20260717' ||
    plan.kind !== 'full' ||
    plan.entries.length !== 22
  ) {
    throw new Error('US057 full plan does not match the immutable release and 22-tour scope')
  }
  const intendedPlanSha256 = groupCommerceChecksum(plan)
  const checksumSha256 = sha256File(backupPath)
  const restoreEvidenceSha256 = sha256File(restoreEvidencePath)
  const restore = JSON.parse(readFileSync(restoreEvidencePath, 'utf8')) as Us057RestoreEvidence
  const profile = restore.profileEvidence || {}
  if (
    restore.status !== 'ok' ||
    restore.assertionProfile !== 'wingsside-us057' ||
    restore.backupChecksumSha256 !== checksumSha256 ||
    restore.restoreListVerified !== true ||
    restore.targetDatabase === databaseName ||
    profile.wingSideSites !== 1 ||
    profile.wingSideTours !== 22 ||
    profile.us057Migrations !== 2 ||
    profile.governedColumns !== 9 ||
    profile.inventoryIdentityIndexes !== 1
  ) {
    throw new Error('Restore evidence does not satisfy the exact US057 disposable-drill contract')
  }

  return {
    checksumSha256,
    createdAt: new Date().toISOString(),
    database: databaseName,
    databaseHost,
    encrypted: true,
    file: path.basename(backupPath),
    format: 'postgres-custom',
    intendedPlanSha256,
    intendedReleaseSha: releaseSha,
    restoreDrillVerified: true,
    restoreEvidenceSha256,
    restoreListVerified: true,
    rollbackRelease,
    rollbackReleaseSha,
    sizeBytes: readFileSync(backupPath).byteLength,
  }
}

