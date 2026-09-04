import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import {
  assertTourTaxonomyWriteGate,
  parseTourTaxonomyCLIArgs,
} from '../../scripts/lib/wingsSideTourTaxonomyWriteGate'
import { wingsSideTourTaxonomyMappingRevision } from '../../scripts/lib/wingsSideTourTaxonomy'

const temporaryPaths: string[] = []

afterEach(() => {
  for (const target of temporaryPaths.splice(0)) fs.rmSync(target, { force: true, recursive: true })
})

const productionFixture = () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'wingsside-taxonomy-gate-'))
  temporaryPaths.push(directory)
  const backupPath = path.join(directory, 'us049.dump.age')
  fs.writeFileSync(backupPath, 'encrypted-backup-fixture')
  const releaseSha = '053290d000000000000000000000000000000000'
  return {
    args: {
      backupPath,
      backupSha256: 'c3cf2fed53d08256a06c02adf9f7a723b3ac21c3aa6080474a2f394c9f606bed',
      editorialApproval: wingsSideTourTaxonomyMappingRevision,
      production: true,
      productionConfirm: 'wing-side',
      releaseSha,
      rollbackRelease: '/home/ubuntu/wings-travel/releases/wingside-wp5-a0761ec',
    },
    env: {
      DATABASE_URL: 'postgresql://user:secret@postgres:5432/wingstravel',
      NODE_ENV: 'production',
      WINGSSIDE_RELEASE_REMEDIATION_ALLOW: 'production',
      WINGSSIDE_RELEASE_SHA: releaseSha,
    },
  }
}

describe('WingSide taxonomy write gate', () => {
  it('parses both inline and separate CLI values', () => {
    expect(
      parseTourTaxonomyCLIArgs([
        '--production',
        '--confirm-production=wing-side',
        '--plan',
        'plan.json',
      ]),
    ).toMatchObject({
      planPath: 'plan.json',
      production: true,
      productionConfirm: 'wing-side',
    })
  })

  it('accepts an approved local SQLite write', () => {
    expect(
      assertTourTaxonomyWriteGate({
        args: {
          editorialApproval: wingsSideTourTaxonomyMappingRevision,
          production: false,
        },
        env: { DATABASE_URL: 'file:E:/tmp/wingsside.db', NODE_ENV: 'development' },
        mode: 'apply',
      }),
    ).toEqual({ environment: 'local-sqlite', productionMutation: false })
  })

  it('requires the shared guard for a PostgreSQL rehearsal clone', () => {
    expect(() =>
      assertTourTaxonomyWriteGate({
        args: {
          editorialApproval: wingsSideTourTaxonomyMappingRevision,
          production: false,
        },
        env: {
          DATABASE_URL: 'postgresql://user@127.0.0.1:5432/wingstravel_clone',
          NODE_ENV: 'test',
        },
        mode: 'apply',
      }),
    ).toThrow(/WINGSSIDE_RELEASE_REMEDIATION_ALLOW/)
  })

  it('accepts production only with immutable release and encrypted backup evidence', () => {
    const fixture = productionFixture()
    expect(
      assertTourTaxonomyWriteGate({
        args: fixture.args,
        env: fixture.env,
        mode: 'apply',
      }),
    ).toEqual({ environment: 'production', productionMutation: true })
  })

  it('keeps production dry-run read-only without requiring write credentials', () => {
    expect(
      assertTourTaxonomyWriteGate({
        args: { production: false },
        env: { DATABASE_URL: 'postgresql://user@postgres:5432/wingstravel', NODE_ENV: 'production' },
        mode: 'dry-run',
      }),
    ).toEqual({ environment: 'dry-run', productionMutation: false })
  })
})
