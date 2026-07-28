import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  assertArtifactInputContract,
  assertDisposablePostgresTarget,
  buildFrozenSourceProof,
  buildSanitizedChildEnvironment,
  classifyDockerInspectResult,
  loadBaselineSource,
  loadFrozenSourceSnapshot,
  parseLoopbackDockerPort,
  postgresReadinessProbeArgs,
  redactDatabaseURL,
} from '../../scripts/lib/wingsSideUs055Rehearsal.mjs'
import {
  us055HomeFixtureLocales,
  us055WhyTravelRoleSlugs,
} from '../../scripts/lib/wingsSideUs055HomeFixture'

describe('US-055 disposable rehearsal guards', () => {
  it('seeds the governed WingSide Home before the exact tour fixture and binds four roles', () => {
    const runner = fs.readFileSync('scripts/run-wingsside-us055-rehearsal.mjs', 'utf8')
    const editorialSeed = fs.readFileSync(
      'scripts/seed-wingsside-tour-editorial-rehearsal.ts',
      'utf8',
    )
    const selectiveSeed = runner.indexOf("SEED_ONLY_SITE: 'wing-side'")
    const exactTourSeed = runner.indexOf("'scripts/seed-wingsside-tour-editorial-rehearsal.ts'")

    expect(selectiveSeed).toBeGreaterThan(-1)
    expect(exactTourSeed).toBeGreaterThan(selectiveSeed)
    expect(runner).toContain("'--reuse-seeded-home'")
    expect(runner).toContain(
      "'local-design,flexible-planning,style-matching,collaborative-care'",
    )
    expect(runner).toContain('selectiveSeedMediaPaths')
    expect(runner).toContain('selectiveSeedMediaBaseline')
    expect(runner).toContain('captureUs055HomeFixtureProof')
    expect(runner).toContain('finalHomeProof.checksum !== homeBaselineProof.checksum')
    expect(editorialSeed).toContain('applyWingsSideHiFiContentSeed')
    expect(editorialSeed).toContain('us055WhyTravelRoleSlugs.map')
    expect(editorialSeed).toContain('slugToRehearsalTourID.get(slug)')
  })

  it('seals the five-locale Home fixture and approved four role-to-slug mapping', () => {
    expect(us055HomeFixtureLocales).toEqual(['en', 'vi', 'it', 'es', 'pt'])
    expect(us055WhyTravelRoleSlugs).toEqual([
      {
        key: 'local-design',
        slug: 'best-of-northern-vietnam-hanoi-ninh-binh-sapa-halong-6-days',
      },
      {
        key: 'flexible-planning',
        slug: 'northern-vietnam-highlights-for-family-6-days',
      },
      {
        key: 'style-matching',
        slug: 'vietnam-luxury-wellness-retreat-escape-8-days',
      },
      {
        key: 'collaborative-care',
        slug: 'highlights-of-vietnam-from-north-to-south-12-days',
      },
    ])
  })

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
    ).toEqual({
      reason: 'frozen-artifacts-supplied-lifecycle-not-executed',
      status: 'pending',
      validatedArtifacts: true,
    })
  })

  it('binds the baseline to the sealed exact 22-tour identity inventory', async () => {
    const baseline = await loadBaselineSource(
      'scripts/data/wingsside-tour-content-candidates/en.json',
      'scripts/data/wingsside-tour-editorial/source-manifest.json',
    )
    expect(baseline.tours).toHaveLength(22)
    expect(new Set(baseline.tours.map(({ slug }) => slug)).size).toBe(22)
  })

  it('uses final TCP readiness rather than the init temporary Unix-socket server', () => {
    const args = postgresReadinessProbeArgs({
      containerName: 'us055-rehearsal',
      database: 'us055_rehearsal',
      user: 'rehearsal_operator',
    })
    expect(args).toContain('--host')
    expect(args[args.indexOf('--host') + 1]).toBe('127.0.0.1')
    expect(args).toContain('--port')
    expect(args[args.indexOf('--port') + 1]).toBe('5432')
  })

  it('does not inherit SMTP, Redis, release, or production mutation capabilities', () => {
    const result = buildSanitizedChildEnvironment(
      {
        NODE_OPTIONS: '--require C:\\host\\inject.js',
        PATH: 'safe-path',
        REDIS_URL: 'redis://production',
        SMTP_PASSWORD: 'production-secret',
        WINGSTRAVEL_RELEASE_SHA: 'production-release',
      },
      { DATABASE_URL: 'postgresql://explicit-rehearsal' },
    )
    expect(result).toEqual({
      DATABASE_URL: 'postgresql://explicit-rehearsal',
      PATH: 'safe-path',
    })
  })

  it('allows only an explicit child NODE_OPTIONS value instead of inheriting the host value', () => {
    expect(
      buildSanitizedChildEnvironment(
        { NODE_OPTIONS: '--require /host/inject.js', PATH: 'safe-path' },
        { NODE_OPTIONS: '' },
      ),
    ).toEqual({ NODE_OPTIONS: '', PATH: 'safe-path' })
  })

  it('confirms cleanup only for the exact Docker no-such-container response', () => {
    const containerName = 'wingsside-us055-rehearsal-safe'
    expect(
      classifyDockerInspectResult(
        { status: 1, stderr: `Error: No such object: ${containerName}` },
        containerName,
      ),
    ).toBe('absent')
    expect(
      classifyDockerInspectResult(
        {
          status: 1,
          stderr: `Error response from daemon: No such container: ${containerName}`,
        },
        containerName,
      ),
    ).toBe('absent')
    expect(
      classifyDockerInspectResult(
        { status: 1, stderr: 'error during connect: Docker daemon is unavailable' },
        containerName,
      ),
    ).toBe('unverified')
    expect(
      classifyDockerInspectResult(
        { status: 1, stderr: 'permission denied while trying to connect' },
        containerName,
      ),
    ).toBe('unverified')
    expect(
      classifyDockerInspectResult(
        { status: 1, stderr: 'Error: No such object: another-container' },
        containerName,
      ),
    ).toBe('unverified')
    expect(classifyDockerInspectResult({ status: 0, stderr: '' }, containerName)).toBe('present')
    expect(
      classifyDockerInspectResult(
        { status: null, signal: 'SIGTERM', error: new Error('timed out') },
        containerName,
      ),
    ).toBe('unverified')
  })

  it('binds full 22/116/331 source content and rejects frozen artifact drift', async () => {
    const snapshotPath = path.resolve(
      '..',
      'docs/stories/epics/E08-wingsside-inbound-upgrade/US-055-real-tour-why-travel/evidence/rehearsal/frozen-source-snapshot.json',
    )
    const frozen = await loadFrozenSourceSnapshot(snapshotPath)
    expect(frozen.proof).toMatchObject({ itineraryDays: 116, serviceRows: 331, tours: 22 })

    const rowLoss = structuredClone(frozen.snapshot.tours)
    rowLoss[0].includes.pop()
    expect(() => buildFrozenSourceProof(rowLoss)).toThrow('exact 22 tours, 116 days, and 331')

    const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'us055-frozen-negative-'))
    try {
      const drifted = structuredClone(frozen.snapshot)
      drifted.tours[0].itineraryDays[0].summary = 'substituted after snapshot checksum'
      const driftedPath = path.join(temporaryDirectory, 'snapshot.json')
      fs.writeFileSync(driftedPath, JSON.stringify(drifted))
      await expect(loadFrozenSourceSnapshot(driftedPath)).rejects.toThrow(
        'snapshot checksum or identity is invalid',
      )
    } finally {
      fs.rmSync(temporaryDirectory, { force: true, recursive: true })
    }
  })
})
