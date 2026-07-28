import { createHash, generateKeyPairSync, sign } from 'node:crypto'

import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../scripts/lib/wingsSideReleaseWriteGuard', async (importOriginal) => {
  const original =
    await importOriginal<typeof import('../../scripts/lib/wingsSideReleaseWriteGuard')>()
  return {
    ...original,
    assertWingsSideEditorialProductionWriteGuard: (...args: Parameters<
      typeof original.assertWingsSideEditorialProductionWriteGuard
    >) => {
      if (process.env.WINGSSIDE_EN_EDITORIAL_TEST_GUARD === 'true') return
      return original.assertWingsSideEditorialProductionWriteGuard(...args)
    },
  }
})

import {
  parseWingsSideEnglishEditorialProductionArguments,
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
  executeWingsSideEnglishEditorialGuardedRuntime,
  executeWingsSideEnglishEditorialGuardedRuntimeWithAdapterFactory,
  issueWingsSideEnglishEditorialGuardedCapabilityFromProtectedEnvironment,
  loadFrozenWingsSideEnglishEditorialArtifacts,
  readFrozenWingsSideEnglishEditorialArtifact,
  WingsSideEnglishEditorialAmbiguousCommitError,
  wingsSideEnglishEditorialTargetProofSigningDigest,
  type WingsSideEnglishEditorialSignedTargetProof,
  type WingsSideEnglishEditorialTargetChallenge,
  type WingsSideEnglishEditorialRuntimeTargetAttestation,
  type WingsSideTourEnglishEditorialRuntimeAdapter,
  type WingsSideTourEnglishEditorialRuntimeRow,
} from '../../scripts/lib/wingsSideTourEnglishEditorialRuntime'

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T
const sha256 = (value: string | Buffer) => createHash('sha256').update(value).digest('hex')
const slugs = Array.from({ length: 22 }, (_, index) => `tour-${index + 1}`)
const releaseSha = 'a'.repeat(40)
const databaseIdentitySha256 = 'd'.repeat(64)
const sourceSnapshotSha256 = 'e'.repeat(64)
const currentDatabase = 'wings_travel'
const targetKeyID = 'runtime-target-key-01'
const targetKeys = generateKeyPairSync('ed25519')
const targetPublicKeySpkiBase64 = targetKeys.publicKey
  .export({ format: 'der', type: 'spki' })
  .toString('base64')
const transactionSessionID = 'postgres-session-0001'

const signTargetProof = (
  payload: WingsSideEnglishEditorialRuntimeTargetAttestation,
): WingsSideEnglishEditorialSignedTargetProof => ({
  payload,
  signature: {
    algorithm: 'ed25519',
    keyID: targetKeyID,
    valueBase64: sign(
      null,
      Buffer.from(wingsSideEnglishEditorialTargetProofSigningDigest(payload), 'utf8'),
      targetKeys.privateKey,
    ).toString('base64'),
  },
})

afterEach(() => {
  vi.unstubAllEnvs()
})

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

const artifactsByPlan = new WeakMap<object, ReturnType<typeof loadArtifactsFixture>>()

function loadArtifactsFixture({
  manifest,
  plan,
}: {
  manifest: ReturnType<typeof buildWingsSideTourEnglishEditorialManifest>
  plan: ReturnType<typeof buildWingsSideTourEnglishEditorialPlan>
}) {
  const configGovernance = buildWingsSideTourEnglishEditorialConfigArtifact(config)
  const files = {
    config: JSON.stringify(configGovernance),
    manifest: JSON.stringify(manifest),
    plan: JSON.stringify(plan),
  }
  return loadFrozenWingsSideEnglishEditorialArtifacts({
    config: { path: 'config', sha256: sha256(files.config) },
    io: {
      readFileSync: ((filePath: string) =>
        Buffer.from(files[filePath as keyof typeof files])) as typeof import('node:fs').readFileSync,
    },
    manifest: { path: 'manifest', sha256: sha256(files.manifest) },
    plan: { path: 'plan', sha256: sha256(files.plan) },
  })
}

const stubProtectedTargetEnvironment = (artifacts: ReturnType<typeof loadArtifactsFixture>) => {
  vi.stubEnv('WINGSSIDE_EN_EDITORIAL_CURRENT_DATABASE', currentDatabase)
  vi.stubEnv('WINGSSIDE_EN_EDITORIAL_DATABASE_IDENTITY_SHA256', databaseIdentitySha256)
  vi.stubEnv('WINGSSIDE_EN_EDITORIAL_ENVIRONMENT_KIND', 'production')
  vi.stubEnv('WINGSSIDE_EN_EDITORIAL_SITE_CODE', 'wing-side')
  vi.stubEnv('WINGSSIDE_EN_EDITORIAL_SOURCE_KIND', 'database-snapshot')
  vi.stubEnv('WINGSSIDE_EN_EDITORIAL_SOURCE_SHA256', sourceSnapshotSha256)
  vi.stubEnv('WINGSSIDE_EN_EDITORIAL_TARGET_KEY_ID', targetKeyID)
  vi.stubEnv('WINGSSIDE_EN_EDITORIAL_TARGET_PUBLIC_KEY_SPKI_BASE64', targetPublicKeySpkiBase64)
  vi.stubEnv('WINGSSIDE_EN_EDITORIAL_CONFIG_SHA256', artifacts.configArtifactSha256)
  vi.stubEnv('WINGSSIDE_EN_EDITORIAL_MANIFEST_SHA256', artifacts.manifestArtifactSha256)
  vi.stubEnv('WINGSSIDE_TOUR_EDITORIAL_PLAN_SHA256', artifacts.planArtifactSha256)
  vi.stubEnv('WINGSTRAVEL_RELEASE_SHA', releaseSha)
}

const issueCapabilityForPlan = (
  plan: object,
  phase: 'apply' | 'rollback' | 'verify',
) => {
  const artifacts = artifactsByPlan.get(plan)
  if (!artifacts) throw new Error('missing fixture artifacts')
  stubProtectedTargetEnvironment(artifacts)
  if (phase !== 'verify') vi.stubEnv('WINGSSIDE_EN_EDITORIAL_TEST_GUARD', 'true')
  return issueWingsSideEnglishEditorialGuardedCapabilityFromProtectedEnvironment({
    artifacts,
    expected: {
      currentDatabase,
      databaseIdentitySha256,
      environmentKind: 'production',
      releaseSha,
      siteCode: 'wing-side',
      sourceKind: 'database-snapshot',
      sourceSha256: sourceSnapshotSha256,
    },
    mutationGuardArgs: phase === 'verify' ? null : ({} as never),
    phase,
  })
}

const transitionWingsSideTourEnglishEditorialRuntime = <Transaction>({
  adapter,
  direction,
  plan,
}: {
  adapter: WingsSideTourEnglishEditorialRuntimeAdapter<Transaction>
  config: unknown
  direction: 'apply' | 'rollback'
  manifest: unknown
  plan: object
}) =>
  executeWingsSideEnglishEditorialGuardedRuntime({
    adapter,
    capability: issueCapabilityForPlan(plan, direction),
    phase: direction,
  })

const verifyWingsSideTourEnglishEditorialRuntime = <Transaction>({
  adapter,
  plan,
}: {
  adapter: WingsSideTourEnglishEditorialRuntimeAdapter<Transaction>
  config: unknown
  expectedState: 'after' | 'before'
  manifest: unknown
  plan: object
}) =>
  executeWingsSideEnglishEditorialGuardedRuntime({
    adapter,
    capability: issueCapabilityForPlan(plan, 'verify'),
    phase: 'verify',
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
  const artifacts = loadArtifactsFixture({ manifest, plan })
  artifactsByPlan.set(plan, artifacts)
  return { artifacts, config, manifest, plan, rows }
}

const adapterFixture = (
  initial: WingsSideTourEnglishEditorialRuntimeRow[],
  failAtWrite?: number,
  failures: { commit?: Error; kill?: Error } = {},
  mutateProof?: (
    proof: WingsSideEnglishEditorialSignedTargetProof,
    challenge: WingsSideEnglishEditorialTargetChallenge,
  ) => WingsSideEnglishEditorialSignedTargetProof,
) => {
  let state = clone(initial)
  let snapshot: typeof state | null = null
  let writes = 0
  const calls = {
    attest: vi.fn(),
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
    attestTarget: async ({ challenge }) => {
      calls.attest(challenge)
      const payload = {
        currentDatabase,
        databaseIdentitySha256,
        environmentKind: 'production' as const,
        governanceChecksum: challenge.governanceChecksum,
        planArtifactSha256: challenge.planArtifactSha256,
        releaseSha,
        siteCode: 'wing-side' as const,
        sourceKind: 'database-snapshot' as const,
        sourceSha256: sourceSnapshotSha256,
        stage: challenge.stage,
        transactionNonce: challenge.nonce,
        transactionSessionID,
      }
      const proof = signTargetProof(payload)
      return mutateProof?.(proof, challenge) ?? proof
    },
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
    expect(runtime.calls.attest.mock.calls.slice(0, 2).map(([challenge]) => challenge.stage)).toEqual(
      ['after-begin', 'before-commit'],
    )
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

  it('rechecks the signed transaction target immediately before commit and blocks a switch', async () => {
    const value = fixture()
    const runtime = adapterFixture(value.rows, undefined, {}, (proof, challenge) =>
      challenge.stage === 'before-commit'
        ? signTargetProof({
            ...proof.payload,
            transactionSessionID: 'postgres-session-switched',
          })
        : proof,
    )
    await expect(
      transitionWingsSideTourEnglishEditorialRuntime({
        adapter: runtime.adapter,
        config: value.config,
        direction: 'apply',
        manifest: value.manifest,
        plan: value.plan,
      }),
    ).rejects.toThrow('signed target proof mismatch')
    expect(runtime.calls.commit).not.toHaveBeenCalled()
    expect(runtime.calls.kill).toHaveBeenCalledOnce()
    expect(runtime.state()).toEqual(value.rows)
  })

  it('does not accept a caller-forged opaque guarded capability', async () => {
    const value = fixture()
    const runtime = adapterFixture(value.rows)
    await expect(
      executeWingsSideEnglishEditorialGuardedRuntime({
        adapter: runtime.adapter,
        capability: Object.freeze({}) as never,
        phase: 'apply',
      }),
    ).rejects.toThrow('issued guarded capability')
    expect(runtime.calls.begin).not.toHaveBeenCalled()
  })

  it('supplies only capability-bound immutable artifacts to a guarded adapter factory', async () => {
    const value = fixture()
    const runtime = adapterFixture(value.rows)
    const adapterFactory = vi.fn((_boundArtifacts: unknown) => runtime.adapter)
    const capability = issueCapabilityForPlan(value.plan, 'apply')
    await expect(
      executeWingsSideEnglishEditorialGuardedRuntimeWithAdapterFactory({
        adapterFactory,
        capability,
        phase: 'apply',
      }),
    ).resolves.toEqual({ state: 'after', unchanged: 0, updated: 22 })
    expect(adapterFactory).toHaveBeenCalledOnce()
    expect(adapterFactory).toHaveBeenCalledWith(value.artifacts)
    expect(Object.isFrozen(adapterFactory.mock.calls[0]![0])).toBe(true)
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
      WINGSSIDE_EN_EDITORIAL_CURRENT_DATABASE: currentDatabase,
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
      WINGSSIDE_EN_EDITORIAL_TARGET_KEY_ID: targetKeyID,
      WINGSSIDE_EN_EDITORIAL_TARGET_PUBLIC_KEY_SPKI_BASE64: targetPublicKeySpkiBase64,
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
    ['WINGSSIDE_EN_EDITORIAL_CURRENT_DATABASE', '--current-database'],
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
    ['WINGSSIDE_EN_EDITORIAL_TARGET_KEY_ID', '--target-key-id'],
    ['WINGSSIDE_EN_EDITORIAL_TARGET_PUBLIC_KEY_SPKI_BASE64', '--target-public-key-spki-base64'],
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
    ['WINGSSIDE_EN_EDITORIAL_CURRENT_DATABASE', '--current-database'],
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
    ['WINGSSIDE_EN_EDITORIAL_TARGET_KEY_ID', '--target-key-id'],
    ['WINGSSIDE_EN_EDITORIAL_TARGET_PUBLIC_KEY_SPKI_BASE64', '--target-public-key-spki-base64'],
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

  it('rejects an injectable environment in the production runner', async () => {
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
    ).rejects.toThrow(/environment is non-injectable/)
    expect(adapterFactory).not.toHaveBeenCalled()
  })

  const stubCLIEnvironment = (env: Record<string, string>) => {
    for (const [name, entry] of Object.entries(env)) vi.stubEnv(name, entry)
  }

  it('requires fresh valid Ed25519 target proofs for guarded verify', async () => {
    const value = cliFixture()
    stubCLIEnvironment(value.env)
    const afterRows = value.value.rows.map((row, index) => ({
      ...row,
      document: clone(value.value.plan.entries[index]!.after),
    }))
    const runtime = adapterFixture(afterRows)
    await expect(
      runWingsSideEnglishEditorialProductionCLI({
        adapterFactory: async () => runtime.adapter,
        argv: ['verify', ...value.base],
        io: value.io,
      }),
    ).resolves.toEqual({ checked: 22, state: 'after' })
    expect(runtime.calls.attest).toHaveBeenCalledTimes(2)
    expect(runtime.calls.attest.mock.calls.map(([challenge]) => challenge.stage)).toEqual([
      'after-begin',
      'before-verify-close',
    ])
  })

  it('rejects a proof forged by the adapter caller before reading rows', async () => {
    const value = cliFixture()
    stubCLIEnvironment(value.env)
    const afterRows = value.value.rows.map((row, index) => ({
      ...row,
      document: clone(value.value.plan.entries[index]!.after),
    }))
    const runtime = adapterFixture(afterRows, undefined, {}, (proof) => ({
      ...proof,
      signature: { ...proof.signature, valueBase64: Buffer.from('forged').toString('base64') },
    }))
    await expect(
      runWingsSideEnglishEditorialProductionCLI({
        adapterFactory: async () => runtime.adapter,
        argv: ['verify', ...value.base],
        io: value.io,
      }),
    ).rejects.toThrow('target proof signature is invalid')
    expect(runtime.transactionTokens.reads).toHaveLength(0)
    expect(runtime.calls.kill).toHaveBeenCalledOnce()
  })

  it('rejects a signed transaction-session switch at the second verify proof', async () => {
    const value = cliFixture()
    stubCLIEnvironment(value.env)
    const afterRows = value.value.rows.map((row, index) => ({
      ...row,
      document: clone(value.value.plan.entries[index]!.after),
    }))
    const runtime = adapterFixture(afterRows, undefined, {}, (proof, challenge) =>
      challenge.stage === 'before-verify-close'
        ? signTargetProof({
            ...proof.payload,
            transactionSessionID: 'postgres-session-switched',
          })
        : proof,
    )
    await expect(
      runWingsSideEnglishEditorialProductionCLI({
        adapterFactory: async () => runtime.adapter,
        argv: ['verify', ...value.base],
        io: value.io,
      }),
    ).rejects.toThrow('signed target proof mismatch')
    expect(runtime.calls.kill).toHaveBeenCalledOnce()
  })

  it('rejects replay of the after-begin proof as the final proof', async () => {
    const value = cliFixture()
    stubCLIEnvironment(value.env)
    const afterRows = value.value.rows.map((row, index) => ({
      ...row,
      document: clone(value.value.plan.entries[index]!.after),
    }))
    let first: WingsSideEnglishEditorialSignedTargetProof | undefined
    const runtime = adapterFixture(afterRows, undefined, {}, (proof) => {
      if (!first) {
        first = proof
        return proof
      }
      return first
    })
    await expect(
      runWingsSideEnglishEditorialProductionCLI({
        adapterFactory: async () => runtime.adapter,
        argv: ['verify', ...value.base],
        io: value.io,
      }),
    ).rejects.toThrow('signed target proof mismatch')
  })

  it('strictly rejects duplicates, unknown flags, missing values, and multiple phases', () => {
    expect(() =>
      parseWingsSideEnglishEditorialProductionArguments([
        'verify',
        '--config=one',
        '--config=two',
      ]),
    ).toThrow('Duplicate')
    expect(() =>
      parseWingsSideEnglishEditorialProductionArguments(['verify', '--unknown=value']),
    ).toThrow('Unknown')
    expect(() =>
      parseWingsSideEnglishEditorialProductionArguments(['verify', '--config']),
    ).toThrow('malformed')
    expect(() =>
      parseWingsSideEnglishEditorialProductionArguments(['verify', '--phase=apply']),
    ).toThrow('exactly one')
  })
})
