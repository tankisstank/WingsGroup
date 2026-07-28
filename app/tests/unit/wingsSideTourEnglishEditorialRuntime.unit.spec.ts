import { createHash } from 'node:crypto'

import { describe, expect, it, vi } from 'vitest'

import {
  preflightWingsSideEnglishEditorialProductionCLI,
} from '../../scripts/import-wingsside-tour-english-editorial-production'
import {
  assertWingsSideTourEnglishEditorialGovernance,
  buildWingsSideTourEnglishEditorialConfigArtifact,
  buildWingsSideTourEnglishEditorialManifest,
  buildWingsSideTourEnglishEditorialPlan,
  wingsSideTourEnglishEditorialChecksum,
  type WingsSideTourEnglishEditorialConfig,
  type WingsSideTourEnglishEditorialDocument,
} from '../../scripts/lib/wingsSideTourEnglishEditorial'
import {
  readFrozenWingsSideEnglishEditorialArtifact,
  transitionWingsSideTourEnglishEditorialRuntime,
  verifyWingsSideTourEnglishEditorialRuntime,
  type WingsSideTourEnglishEditorialRuntimeAdapter,
  type WingsSideTourEnglishEditorialRuntimeRow,
} from '../../scripts/lib/wingsSideTourEnglishEditorialRuntime'

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T
const sha256 = (value: string | Buffer) => createHash('sha256').update(value).digest('hex')
const slugs = Array.from({ length: 22 }, (_, index) => `tour-${index + 1}`)
const releaseSha = 'a'.repeat(40)

const config: WingsSideTourEnglishEditorialConfig = {
  allCapsAllowlist: ['UNESCO', 'IATA'],
  editorialPaths: ['title', 'summary', 'content', 'itineraryDays', 'includes', 'excludes'],
  lockedFactualPaths: ['durationDays', 'priceFrom'],
  publicTextPaths: ['title', 'summary', 'content', 'itineraryDays', 'includes', 'excludes'],
  requiredPaths: ['title', 'summary', 'itineraryDays'],
  serviceRowPaths: ['includes', 'excludes'],
}

const source = (slug: string): WingsSideTourEnglishEditorialDocument => ({
  content: { body: `A private journey for ${slug}.` },
  durationDays: 3,
  excludes: [{ id: `${slug}-exclude`, label: 'International flights' }],
  includes: [{ id: `${slug}-include`, label: 'Local transport' }],
  itineraryDays: [{ id: `${slug}-day`, summary: 'Meet the host', title: 'Arrival' }],
  priceFrom: 100,
  slug,
  summary: `Original summary for ${slug}.`,
  title: `Original ${slug}`,
})

const fixture = () => {
  const sourceTours = slugs.map(source)
  const proposedTours = sourceTours.map((tour) => ({
    ...tour,
    summary: `Tailored summary for ${tour.slug}.`,
    title: `WingSide ${tour.slug}`,
  }))
  const manifest = buildWingsSideTourEnglishEditorialManifest({
    config,
    releaseSha,
    tours: sourceTours.map((tour, index) => ({
      slug: tour.slug,
      sourceChecksum: wingsSideTourEnglishEditorialChecksum(tour),
      tourID: index + 1,
    })),
  })
  const plan = buildWingsSideTourEnglishEditorialPlan({
    config,
    createdAt: '2026-07-28T00:00:00.000Z',
    expectedSlugs: slugs,
    manifest,
    proposedTours,
    runID: 'runtime-unit',
    sourceTours,
  })
  const rows: WingsSideTourEnglishEditorialRuntimeRow[] = sourceTours.map((document, index) => ({
    document,
    locale: 'en',
    siteCode: 'wing-side',
    tourID: index + 1,
  }))
  return { config, manifest, plan, rows }
}

const adapterFixture = (
  initial: WingsSideTourEnglishEditorialRuntimeRow[],
  failAtWrite?: number,
) => {
  let state = clone(initial)
  let snapshot: typeof state | null = null
  let writes = 0
  const calls = {
    begin: vi.fn(),
    commit: vi.fn(),
    kill: vi.fn(),
  }
  const adapter: WingsSideTourEnglishEditorialRuntimeAdapter<{ id: string }> = {
    beginTransaction: async () => {
      calls.begin()
      snapshot = clone(state)
      return { id: 'transaction' }
    },
    commitTransaction: async () => {
      calls.commit()
      snapshot = null
    },
    killTransaction: async () => {
      calls.kill()
      state = clone(snapshot!)
      snapshot = null
    },
    readTours: async () => clone(state),
    writeTour: async ({ document, tourID }) => {
      writes += 1
      if (failAtWrite === writes) throw new Error('injected partial write')
      const index = state.findIndex((row) => String(row.tourID) === String(tourID))
      state[index] = { ...state[index]!, document: clone(document) }
    },
  }
  return { adapter, calls, state: () => state }
}

describe('WingSide English editorial canonical runtime', () => {
  it('applies, verifies, rolls back, and remains idempotent transactionally', async () => {
    const value = fixture()
    const runtime = adapterFixture(value.rows)
    await expect(
      transitionWingsSideTourEnglishEditorialRuntime({
        adapter: runtime.adapter,
        config: value.config,
        direction: 'apply',
        manifest: value.manifest,
        plan: value.plan,
      }),
    ).resolves.toEqual({ state: 'after', unchanged: 0, updated: 22 })
    await expect(
      verifyWingsSideTourEnglishEditorialRuntime({
        adapter: runtime.adapter,
        config: value.config,
        expectedState: 'after',
        manifest: value.manifest,
        plan: value.plan,
      }),
    ).resolves.toEqual({ checked: 22, state: 'after' })
    await expect(
      transitionWingsSideTourEnglishEditorialRuntime({
        adapter: runtime.adapter,
        config: value.config,
        direction: 'apply',
        manifest: value.manifest,
        plan: value.plan,
      }),
    ).resolves.toEqual({ state: 'after', unchanged: 22, updated: 0 })
    await expect(
      transitionWingsSideTourEnglishEditorialRuntime({
        adapter: runtime.adapter,
        config: value.config,
        direction: 'rollback',
        manifest: value.manifest,
        plan: value.plan,
      }),
    ).resolves.toEqual({ state: 'before', unchanged: 0, updated: 22 })
    await expect(
      transitionWingsSideTourEnglishEditorialRuntime({
        adapter: runtime.adapter,
        config: value.config,
        direction: 'rollback',
        manifest: value.manifest,
        plan: value.plan,
      }),
    ).resolves.toEqual({ state: 'before', unchanged: 22, updated: 0 })
  })

  it('kills a partial transaction and restores the complete before state', async () => {
    const value = fixture()
    const runtime = adapterFixture(value.rows, 3)
    await expect(
      transitionWingsSideTourEnglishEditorialRuntime({
        adapter: runtime.adapter,
        config: value.config,
        direction: 'apply',
        manifest: value.manifest,
        plan: value.plan,
      }),
    ).rejects.toThrow('injected partial write')
    expect(runtime.calls.commit).not.toHaveBeenCalled()
    expect(runtime.calls.kill).toHaveBeenCalledOnce()
    expect(runtime.state()).toEqual(value.rows)
  })

  it.each([
    ['missing', (rows: WingsSideTourEnglishEditorialRuntimeRow[]) => rows.slice(0, -1)],
    ['duplicate', (rows: WingsSideTourEnglishEditorialRuntimeRow[]) => [...rows.slice(0, -1), rows[0]!]],
    ['reordered', (rows: WingsSideTourEnglishEditorialRuntimeRow[]) => [rows[1]!, rows[0]!, ...rows.slice(2)]],
  ])('fails closed for a %s tour inventory', async (_name, mutate) => {
    const value = fixture()
    const runtime = adapterFixture(mutate(value.rows))
    await expect(
      transitionWingsSideTourEnglishEditorialRuntime({
        adapter: runtime.adapter,
        config: value.config,
        direction: 'apply',
        manifest: value.manifest,
        plan: value.plan,
      }),
    ).rejects.toThrow(/exactly 22|duplicate|identity\/order/)
    expect(runtime.calls.kill).toHaveBeenCalledOnce()
  })

  it('rejects wrong config, manifest release, site, and tour identity bindings', () => {
    const value = fixture()
    expect(() =>
      assertWingsSideTourEnglishEditorialGovernance({
        config: { ...value.config, riskyPhrases: ['changed'] },
        manifest: value.manifest,
        plan: value.plan,
      }),
    ).toThrow(/governance binding/)

    const wrongReleaseManifest = buildWingsSideTourEnglishEditorialManifest({
      config: value.config,
      releaseSha: 'b'.repeat(40),
      tours: value.manifest.tours,
    })
    expect(() =>
      assertWingsSideTourEnglishEditorialGovernance({
        config: value.config,
        manifest: wrongReleaseManifest,
        plan: value.plan,
      }),
    ).toThrow(/governance binding/)

    const wrongTourManifest = buildWingsSideTourEnglishEditorialManifest({
      config: value.config,
      releaseSha,
      tours: value.manifest.tours.map((tour, index) =>
        index === 0 ? { ...tour, tourID: 999 } : tour,
      ),
    })
    expect(() =>
      assertWingsSideTourEnglishEditorialGovernance({
        config: value.config,
        manifest: wrongTourManifest,
        plan: value.plan,
      }),
    ).toThrow(/governance binding/)

    const wrongSite = clone(value.manifest)
    wrongSite.siteCode = 'other' as 'wing-side'
    const { checksum: _checksum, ...payload } = wrongSite
    wrongSite.checksum = wingsSideTourEnglishEditorialChecksum(payload)
    expect(() =>
      assertWingsSideTourEnglishEditorialGovernance({
        config: value.config,
        manifest: wrongSite,
        plan: value.plan,
      }),
    ).toThrow(/Invalid WingSide English editorial manifest/)
  })

  it('reads artifact bytes once, validates their hash, and deeply freezes the parsed value', () => {
    const bytes = Buffer.from(JSON.stringify({ nested: { value: 1 } }))
    const readFileSync = vi.fn(() => bytes)
    const artifact = readFrozenWingsSideEnglishEditorialArtifact({
      expectedSha256: sha256(bytes),
      filePath: 'artifact.json',
      io: { readFileSync: readFileSync as never },
      validate: (value) => value as { nested: { value: number } },
    })
    bytes.fill(0)
    expect(readFileSync).toHaveBeenCalledOnce()
    expect(artifact.value.nested.value).toBe(1)
    expect(Object.isFrozen(artifact.value)).toBe(true)
    expect(Object.isFrozen(artifact.value.nested)).toBe(true)
  })
})

describe('WingSide English editorial guarded CLI preflight', () => {
  const cliFixture = () => {
    const value = fixture()
    const files = {
      config: JSON.stringify(buildWingsSideTourEnglishEditorialConfigArtifact(value.config)),
      manifest: JSON.stringify(value.manifest),
      plan: JSON.stringify(value.plan),
    }
    const env = {
      IMPORT_ADMIN_EMAIL: 'admin@wingside.vn',
      WINGSSIDE_EN_EDITORIAL_CONFIG_SHA256: sha256(files.config),
      WINGSSIDE_EN_EDITORIAL_MANIFEST_SHA256: sha256(files.manifest),
      WINGSSIDE_EN_EDITORIAL_SITE_CODE: 'wing-side',
      WINGSSIDE_TOUR_EDITORIAL_PLAN_SHA256: sha256(files.plan),
      WINGSTRAVEL_RELEASE_SHA: releaseSha,
    }
    const io = {
      readFileSync: ((filePath: string) =>
        Buffer.from(files[filePath as keyof typeof files])) as typeof import('node:fs').readFileSync,
    }
    const base = [
      '--config=config',
      '--manifest=manifest',
      '--plan=plan',
      '--site-code=wing-side',
      `--release-sha=${releaseSha}`,
    ]
    return { base, env, io }
  }

  it('rejects protected CLI/environment conflicts before artifact reads', () => {
    const value = cliFixture()
    const readFileSync = vi.fn(value.io.readFileSync)
    expect(() =>
      preflightWingsSideEnglishEditorialProductionCLI({
        argv: ['verify', ...value.base, `--config-sha256=${'f'.repeat(64)}`],
        env: value.env,
        io: { readFileSync: readFileSync as never },
      }),
    ).toThrow(/CLI\/environment conflict/)
    expect(readFileSync).not.toHaveBeenCalled()
  })

  it('keeps verify read-only and invokes the release guard for apply', () => {
    const value = cliFixture()
    const releaseGuard = vi.fn()
    expect(
      preflightWingsSideEnglishEditorialProductionCLI({
        argv: ['verify', ...value.base],
        env: value.env,
        io: value.io,
        releaseGuard,
      }).phase,
    ).toBe('verify')
    expect(releaseGuard).not.toHaveBeenCalled()

    expect(
      preflightWingsSideEnglishEditorialProductionCLI({
        argv: [
          'apply',
          ...value.base,
          '--confirm=CONFIRM_WINGSSIDE_ENGLISH_EDITORIAL_PRODUCTION_WRITE',
        ],
        env: value.env,
        io: value.io,
        releaseGuard,
      }).phase,
    ).toBe('apply')
    expect(releaseGuard).toHaveBeenCalledOnce()
  })

  it('rejects a protected admin CLI/environment conflict before the release guard', () => {
    const value = cliFixture()
    const releaseGuard = vi.fn()
    expect(() =>
      preflightWingsSideEnglishEditorialProductionCLI({
        argv: [
          'apply',
          ...value.base,
          '--admin-email=other@wingside.vn',
          '--confirm=CONFIRM_WINGSSIDE_ENGLISH_EDITORIAL_PRODUCTION_WRITE',
        ],
        env: value.env,
        io: value.io,
        releaseGuard,
      }),
    ).toThrow(/CLI\/environment conflict/)
    expect(releaseGuard).not.toHaveBeenCalled()
  })
})
