import { describe, expect, it } from 'vitest'

import {
  assertArtifactInputContract,
  assertDisposablePostgresTarget,
  loadBaselineSource,
  parseLoopbackDockerPort,
  redactDatabaseURL,
} from '../../scripts/lib/wingsSideUs055Rehearsal.mjs'

describe('US-055 disposable rehearsal guards', () => {
  it('accepts only an explicit loopback PostgreSQL rehearsal target', () => {
    expect(
      assertDisposablePostgresTarget(
        'postgresql://worker:secret@127.0.0.1:55432/wingsside_us055_rehearsal_a1',
      ),
    ).toMatchObject({
      database: 'wingsside_us055_rehearsal_a1',
      hostname: '127.0.0.1',
      port: 55432,
    })
    for (const value of [
      'postgresql://worker:secret@db.internal:5432/wingsside_us055_rehearsal',
      'postgresql://worker:secret@127.0.0.1:5432/wingsside_production',
      'sqlite:///tmp/rehearsal.db',
      'postgresql://worker:secret@127.0.0.1/wingsside_us055_rehearsal',
    ]) {
      expect(() => assertDisposablePostgresTarget(value)).toThrow()
    }
  })

  it('accepts only Docker IPv4 loopback port output', () => {
    expect(parseLoopbackDockerPort('127.0.0.1:49177')).toBe(49177)
    expect(() => parseLoopbackDockerPort('0.0.0.0:49177')).toThrow()
    expect(() => parseLoopbackDockerPort('[::]:49177')).toThrow()
  })

  it('redacts credentials from evidence URLs', () => {
    const result = redactDatabaseURL(
      'postgresql://worker:super-secret@127.0.0.1:55432/wingsside_rehearsal',
    )
    expect(result).not.toContain('super-secret')
    expect(decodeURIComponent(result)).toContain('[REDACTED]')
  })

  it('keeps catalog-dependent phases pending until the complete frozen contract exists', () => {
    expect(assertArtifactInputContract({})).toEqual({
      reason: 'catalog-r3-not-supplied',
      status: 'pending',
    })
    expect(() =>
      assertArtifactInputContract({
        catalogPath: 'catalog.json',
        catalogSha256: 'a'.repeat(64),
      }),
    ).toThrow('requires catalogPath, catalogSha256, planPath, planSha256')
    expect(
      assertArtifactInputContract({
        catalogPath: 'catalog.json',
        catalogSha256: 'a'.repeat(64),
        planPath: 'plan.json',
        planSha256: 'b'.repeat(64),
      }),
    ).toEqual({ status: 'supplied' })
  })

  it('binds the baseline to the sealed exact 22-tour identity inventory', async () => {
    const baseline = await loadBaselineSource(
      'scripts/data/wingsside-tour-content-candidates/en.json',
      'scripts/data/wingsside-tour-editorial/source-manifest.json',
    )
    expect(baseline.tours).toHaveLength(22)
    expect(new Set(baseline.tours.map(({ slug }) => slug)).size).toBe(22)
  })
})
