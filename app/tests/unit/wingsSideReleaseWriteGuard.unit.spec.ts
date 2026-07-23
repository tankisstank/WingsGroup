import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { assertWingsSideReleaseWriteGuard } from '../../scripts/lib/wingsSideReleaseWriteGuard'

const temporaryPaths: string[] = []

afterEach(() => {
  for (const target of temporaryPaths.splice(0)) fs.rmSync(target, { force: true, recursive: true })
})

const productionFixture = () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'wingsside-release-guard-'))
  temporaryPaths.push(directory)
  const backupPath = path.join(directory, 'wp5.dump.age')
  fs.writeFileSync(backupPath, 'encrypted-backup-fixture')
  return {
    args: {
      backupPath,
      backupSha256: 'c3cf2fed53d08256a06c02adf9f7a723b3ac21c3aa6080474a2f394c9f606bed',
      production: true,
      productionConfirm: 'wing-side',
      releaseSha: '053290d000000000000000000000000000000000',
      rollbackRelease: '/home/ubuntu/wings-travel/releases/us046-adaptive-a083127-20260719T121049Z',
    },
    env: {
      DATABASE_URL: 'postgresql://user:secret@postgres:5432/wingstravel',
      NODE_ENV: 'production',
      WINGSSIDE_RELEASE_REMEDIATION_ALLOW: 'production',
      WINGSSIDE_RELEASE_SHA: '053290d000000000000000000000000000000000',
    },
  }
}

describe('WingSide release write guard', () => {
  it('accepts an explicit local clone write', () => {
    expect(() =>
      assertWingsSideReleaseWriteGuard(
        { production: false },
        {
          DATABASE_URL: 'postgresql://local@127.0.0.1:25434/wingstravel_wp4r',
          NODE_ENV: 'test',
          WINGSSIDE_RELEASE_REMEDIATION_ALLOW: 'local-clone',
        },
      ),
    ).not.toThrow()
  })

  it('accepts production only with the complete backup and release contract', () => {
    const fixture = productionFixture()
    expect(() => assertWingsSideReleaseWriteGuard(fixture.args, fixture.env)).not.toThrow()
  })

  it('rejects a mismatched encrypted backup checksum', () => {
    const fixture = productionFixture()
    fixture.args.backupSha256 = '0'.repeat(64)
    expect(() => assertWingsSideReleaseWriteGuard(fixture.args, fixture.env)).toThrow(
      /backup checksum mismatch/,
    )
  })

  it('rejects a release SHA that does not match the deployment environment', () => {
    const fixture = productionFixture()
    fixture.env.WINGSSIDE_RELEASE_SHA = '1'.repeat(40)
    expect(() => assertWingsSideReleaseWriteGuard(fixture.args, fixture.env)).toThrow(
      /release SHA does not match/,
    )
  })

  it('rejects production writes to a non-compose database host', () => {
    const fixture = productionFixture()
    fixture.env.DATABASE_URL = 'postgresql://user:secret@127.0.0.1:5432/wingstravel'
    expect(() => assertWingsSideReleaseWriteGuard(fixture.args, fixture.env)).toThrow(
      /database host must be postgres/,
    )
  })
})
