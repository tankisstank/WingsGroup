import { createHash } from 'node:crypto'

import { describe, expect, it, vi } from 'vitest'

import {
  preflightWingsSideEnglishEditorialProductionCLI,
  resolveWingsSideEnglishEditorialProtectedInputs,
  runWingsSideEnglishEditorialProductionCLI,
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
  createWingsSideEnglishEditorialRuntimeTargetAttestation,
  readFrozenWingsSideEnglishEditorialArtifact,
  transitionWingsSideTourEnglishEditorialRuntime,
  verifyWingsSideTourEnglishEditorialRuntime,
  WingsSideEnglishEditorialAmbiguousCommitError,
  wingsSideEnglishEditorialRuntimeGovernanceChecksum,
  type WingsSideTourEnglishEditorialRuntimeAdapter,
  type WingsSideTourEnglishEditorialRuntimeRow,
} from '../../scripts/lib/wingsSideTourEnglishEditorialRuntime'

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T
const sha256 = (value: string | Buffer) => createHash('sha256').update(value).digest('hex')
const slugs = Array.from({ length: 22 }, (_, index) => `tour-${index + 1}`)
const releaseSha = 'a'.repeat(40)
const databaseIdentitySha256 = 'd'.repeat(64)
const sourceSnapshotSha256 = 'e'.repeat(64)

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
  failures: { commit?: Error; kill?: Error } = {},
) => {
  let state = clone(initial)
  let snapshot: typeof state | null = null
  let writes = 0
  const calls = {
    begin: vi.fn(),
    commit: vi.fn(),
    kill: vi.fn(),
  }
  const transactionTokens: {
    commits: Array<{ id: string }>
    kills: Array<{ id: string }>
    reads: Array<{ id: string }>
    writes: Array<{ id: string }>
  } = { commits: [], kills: [], reads: [], writes: [] }
  const adapter: WingsSideTourEnglishEditorialRuntimeAdapter<{ id: string }> = {
    beginTransaction: async () => {
      calls.begin()
      snapshot = clone(state)
      return { id: 'transaction' }
    },
    commitTransaction: async (transaction) => {
      calls.commit()
      transactionTokens.commits.push(transaction)
      if (failures.commit) throw failures.commit
      snapshot = null
    },
    killTransaction: async (transaction) => {
      calls.kill()
      transactionTokens.kills.push(transaction)
      if (failures.kill) throw failures.kill
      state = clone(snapshot!)
      snapshot = null
    },
    readTours: async (transaction) => {
      transactionTokens.reads.push(transaction)
      return clone(state)
    },
    writeTour: async ({ document, tourID, transaction }) => {
      transactionTokens.writes.push(transaction)
      writes += 1
      if (failAtWrite === writes) throw new Error('injected partial write')
      const index = state.findIndex((row) => String(row.tourID) === String(tourID))
      state[index] = { ...state[index]!, document: clone(document) }
    },
  }
  return { adapter, calls, state: () => state, transactionTokens }
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
    const applyToken = runtime.transactionTokens.commits[0]
    expect(runtime.transactionTokens.reads.slice(0, 2)).toEqual([applyToken, applyToken])
    expect(runtime.transactionTokens.writes.slice(0, 22).every((token) => token === applyToken)).toBe(
      true,
    )
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

  it('reports commit failure as ambiguous and never attempts kill after commit begins', async () => {
    const value = fixture()
    const commitFailure = new Error('connection lost during commit')
    const runtime = adapterFixture(value.rows, undefined, { commit: commitFailure })
    const result = transitionWingsSideTourEnglishEditorialRuntime({
      adapter: runtime.adapter,
      config: value.config,
      direction: 'apply',
      manifest: value.manifest,
      plan: value.plan,
    })
    await expect(result).rejects.toBeInstanceOf(WingsSideEnglishEditorialAmbiguousCommitError)
    await expect(result).rejects.toMatchObject({
      cause: commitFailure,
      code: 'WINGSSIDE_EN_EDITORIAL_AMBIGUOUS_COMMIT',
      requiresVerify: true,
    })
    expect(runtime.calls.kill).not.toHaveBeenCalled()
  })

  it('preserves both primary mutation and cleanup failures', async () => {
    const value = fixture()
    const primary = new Error('primary write failure')
    const cleanup = new Error('kill failed')
    const runtime = adapterFixture(value.rows, 1, { kill: cleanup })
    runtime.adapter.writeTour = async () => {
      throw primary
    }
    const result = transitionWingsSideTourEnglishEditorialRuntime({
      adapter: runtime.adapter,
      config: value.config,
      direction: 'apply',
      manifest: value.manifest,
      plan: value.plan,
    })
    await expect(result).rejects.toBeInstanceOf(AggregateError)
    await expect(result).rejects.toMatchObject({ cause: primary, errors: [primary, cleanup] })
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
      ADMIN_EMAIL: 'admin@wingside.vn',
      WINGSSIDE_EN_EDITORIAL_DATABASE_IDENTITY_SHA256: databaseIdentitySha256,
      WINGSSIDE_EN_EDITORIAL_ENVIRONMENT_KIND: 'production',
      WINGSSIDE_EN_EDITORIAL_CONFIG_PATH: 'config',
      WINGSSIDE_EN_EDITORIAL_CONFIG_SHA256: sha256(files.config),
      WINGSSIDE_EN_EDITORIAL_MANIFEST_PATH: 'manifest',
      WINGSSIDE_EN_EDITORIAL_MANIFEST_SHA256: sha256(files.manifest),
      WINGSSIDE_EN_EDITORIAL_PLAN_PATH: 'plan',
      WINGSSIDE_EN_EDITORIAL_SITE_CODE: 'wing-side',
      WINGSSIDE_EN_EDITORIAL_SOURCE_KIND: 'database-snapshot',
      WINGSSIDE_EN_EDITORIAL_SOURCE_SHA256: sourceSnapshotSha256,
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
    return { base, env, io, value }
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

  it.each([
    ['ADMIN_EMAIL', '--admin-email'],
    ['WINGSSIDE_EN_EDITORIAL_DATABASE_IDENTITY_SHA256', '--database-identity-sha256'],
    ['WINGSSIDE_EN_EDITORIAL_ENVIRONMENT_KIND', '--environment-kind'],
    ['WINGSSIDE_EN_EDITORIAL_CONFIG_PATH', '--config'],
    ['WINGSSIDE_EN_EDITORIAL_CONFIG_SHA256', '--config-sha256'],
    ['WINGSSIDE_EN_EDITORIAL_MANIFEST_PATH', '--manifest'],
    ['WINGSSIDE_EN_EDITORIAL_MANIFEST_SHA256', '--manifest-sha256'],
    ['WINGSSIDE_EN_EDITORIAL_PLAN_PATH', '--plan'],
    ['WINGSSIDE_TOUR_EDITORIAL_PLAN_SHA256', '--plan-sha256'],
    ['WINGSTRAVEL_RELEASE_SHA', '--release-sha'],
    ['WINGSSIDE_EN_EDITORIAL_SITE_CODE', '--site-code'],
    ['WINGSSIDE_EN_EDITORIAL_SOURCE_KIND', '--source-kind'],
    ['WINGSSIDE_EN_EDITORIAL_SOURCE_SHA256', '--source-sha256'],
  ])('requires protected environment %s even for verify', (envName, cliName) => {
    const value = cliFixture()
    const missing = { ...value.env, [envName]: undefined }
    expect(() =>
      resolveWingsSideEnglishEditorialProtectedInputs({
        argv: ['verify', `${cliName}=attacker-value`],
        env: missing,
      }),
    ).toThrow(/environment value is required/)
  })

  it.each([
    ['ADMIN_EMAIL', '--admin-email'],
    ['WINGSSIDE_EN_EDITORIAL_DATABASE_IDENTITY_SHA256', '--database-identity-sha256'],
    ['WINGSSIDE_EN_EDITORIAL_ENVIRONMENT_KIND', '--environment-kind'],
    ['WINGSSIDE_EN_EDITORIAL_CONFIG_PATH', '--config'],
    ['WINGSSIDE_EN_EDITORIAL_CONFIG_SHA256', '--config-sha256'],
    ['WINGSSIDE_EN_EDITORIAL_MANIFEST_PATH', '--manifest'],
    ['WINGSSIDE_EN_EDITORIAL_MANIFEST_SHA256', '--manifest-sha256'],
    ['WINGSSIDE_EN_EDITORIAL_PLAN_PATH', '--plan'],
    ['WINGSSIDE_TOUR_EDITORIAL_PLAN_SHA256', '--plan-sha256'],
    ['WINGSTRAVEL_RELEASE_SHA', '--release-sha'],
    ['WINGSSIDE_EN_EDITORIAL_SITE_CODE', '--site-code'],
    ['WINGSSIDE_EN_EDITORIAL_SOURCE_KIND', '--source-kind'],
    ['WINGSSIDE_EN_EDITORIAL_SOURCE_SHA256', '--source-sha256'],
  ])('rejects optional CLI echo conflict for protected %s', (_envName, cliName) => {
    const value = cliFixture()
    expect(() =>
      resolveWingsSideEnglishEditorialProtectedInputs({
        argv: ['verify', `${cliName}=attacker-value`],
        env: value.env,
      }),
    ).toThrow(/CLI\/environment conflict/)
  })

  it('keeps verify preflight read-only', () => {
    const value = cliFixture()
    expect(
      preflightWingsSideEnglishEditorialProductionCLI({
        argv: ['verify', ...value.base],
        env: value.env,
        io: value.io,
      }).phase,
    ).toBe('verify')
  })

  it('cannot bypass the real release guard with an injected authorization function', () => {
    const value = cliFixture()
    const fakeAuthorization = vi.fn()
    expect(() =>
      preflightWingsSideEnglishEditorialProductionCLI({
        argv: [
          'apply',
          ...value.base,
          '--confirm=CONFIRM_WINGSSIDE_ENGLISH_EDITORIAL_PRODUCTION_WRITE',
        ],
        env: value.env,
        io: value.io,
        releaseGuard: fakeAuthorization,
      } as never),
    ).toThrow(/DATABASE_URL is required/)
    expect(fakeAuthorization).not.toHaveBeenCalled()
  })

  it('does not construct an adapter before apply passes the real release guard', async () => {
    const value = cliFixture()
    const adapterFactory = vi.fn()
    await expect(
      runWingsSideEnglishEditorialProductionCLI({
        adapterFactory,
        argv: [
          'apply',
          ...value.base,
          '--confirm=CONFIRM_WINGSSIDE_ENGLISH_EDITORIAL_PRODUCTION_WRITE',
        ],
        env: value.env,
        io: value.io,
      }),
    ).rejects.toThrow(/DATABASE_URL is required/)
    expect(adapterFactory).not.toHaveBeenCalled()
  })

  it('rejects an unattested reused adapter even when its 22 rows are exact after-state', async () => {
    const value = cliFixture()
    const afterRows = value.value.rows.map((row, index) => ({
      ...row,
      document: clone(value.value.plan.entries[index]!.after),
    }))
    const runtime = adapterFixture(afterRows)
    await expect(
      runWingsSideEnglishEditorialProductionCLI({
        adapterFactory: async () => runtime.adapter as never,
        argv: ['verify', ...value.base],
        env: value.env,
        io: value.io,
      }),
    ).rejects.toThrow('attested adapter bundle')
    expect(runtime.calls.begin).not.toHaveBeenCalled()
  })

  it('enforces production target attestation for verify and accepts the valid bound adapter', async () => {
    const value = cliFixture()
    const afterRows = value.value.rows.map((row, index) => ({
      ...row,
      document: clone(value.value.plan.entries[index]!.after),
    }))
    const rejected = adapterFixture(afterRows)
    await expect(
      runWingsSideEnglishEditorialProductionCLI({
        adapterFactory: async ({ artifacts }) => ({
          adapter: rejected.adapter,
          attestation: Object.freeze({
            databaseIdentitySha256,
            environmentKind: 'staging',
            governanceChecksum: wingsSideEnglishEditorialRuntimeGovernanceChecksum(artifacts),
            releaseSha,
            siteCode: 'wing-side',
            sourceKind: 'database-snapshot',
            sourceSha256: sourceSnapshotSha256,
          }) as never,
        }),
        argv: ['verify', ...value.base],
        env: value.env,
        io: value.io,
      }),
    ).rejects.toThrow('target attestation shape is invalid')
    expect(rejected.calls.begin).not.toHaveBeenCalled()

    const accepted = adapterFixture(afterRows)
    await expect(
      runWingsSideEnglishEditorialProductionCLI({
        adapterFactory: async ({ artifacts }) => ({
          adapter: accepted.adapter,
          attestation: createWingsSideEnglishEditorialRuntimeTargetAttestation({
            databaseIdentitySha256,
            environmentKind: 'production',
            governanceChecksum: wingsSideEnglishEditorialRuntimeGovernanceChecksum(artifacts),
            releaseSha,
            siteCode: 'wing-side',
            sourceKind: 'database-snapshot',
            sourceSha256: sourceSnapshotSha256,
          }),
        }),
        argv: ['verify', ...value.base],
        env: value.env,
        io: value.io,
      }),
    ).resolves.toEqual({ checked: 22, state: 'after' })
    expect(accepted.calls.begin).toHaveBeenCalledOnce()
    expect(accepted.calls.kill).toHaveBeenCalledOnce()
  })

  it.each([
    ['database', { databaseIdentitySha256: 'f'.repeat(64) }],
    ['artifact governance', { governanceChecksum: 'f'.repeat(64) }],
    ['source', { sourceSha256: 'f'.repeat(64) }],
    ['release', { releaseSha: 'b'.repeat(40) }],
    ['site', { siteCode: 'other' }],
  ])('rejects wrong attested %s identity before verify reads', async (_label, override) => {
    const value = cliFixture()
    const afterRows = value.value.rows.map((row, index) => ({
      ...row,
      document: clone(value.value.plan.entries[index]!.after),
    }))
    const runtime = adapterFixture(afterRows)
    await expect(
      runWingsSideEnglishEditorialProductionCLI({
        adapterFactory: async ({ artifacts }) => ({
          adapter: runtime.adapter,
          attestation: Object.freeze({
            databaseIdentitySha256,
            environmentKind: 'production',
            governanceChecksum: wingsSideEnglishEditorialRuntimeGovernanceChecksum(artifacts),
            releaseSha,
            siteCode: 'wing-side',
            sourceKind: 'database-snapshot',
            sourceSha256: sourceSnapshotSha256,
            ...override,
          }) as never,
        }),
        argv: ['verify', ...value.base],
        env: value.env,
        io: value.io,
      }),
    ).rejects.toThrow(/target attestation/)
    expect(runtime.calls.begin).not.toHaveBeenCalled()
  })
})
