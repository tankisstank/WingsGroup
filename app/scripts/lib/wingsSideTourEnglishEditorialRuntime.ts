import { createHash } from 'node:crypto'
import fs from 'node:fs'

import {
  applyWingsSideTourEnglishEditorialPlan,
  assertWingsSideTourEnglishEditorialConfigArtifact,
  assertWingsSideTourEnglishEditorialGovernance,
  assertWingsSideTourEnglishEditorialManifest,
  assertWingsSideTourEnglishEditorialPlan,
  rollbackWingsSideTourEnglishEditorialPlan,
  verifyWingsSideTourEnglishEditorialPlan,
  wingsSideTourEnglishEditorialChecksum,
  type WingsSideTourEnglishEditorialConfig,
  type WingsSideTourEnglishEditorialConfigArtifact,
  type WingsSideTourEnglishEditorialDocument,
  type WingsSideTourEnglishEditorialManifest,
  type WingsSideTourEnglishEditorialPlan,
} from './wingsSideTourEnglishEditorial'

export type WingsSideTourEnglishEditorialRuntimeRow = {
  document: WingsSideTourEnglishEditorialDocument
  locale: 'en'
  siteCode: 'wing-side'
  tourID: number | string
}

export type WingsSideTourEnglishEditorialRuntimeAdapter<Transaction> = {
  beginTransaction: () => Promise<null | Transaction>
  commitTransaction: (transaction: Transaction) => Promise<void>
  killTransaction: (transaction: Transaction) => Promise<void>
  readTours: (transaction: Transaction) => Promise<WingsSideTourEnglishEditorialRuntimeRow[]>
  writeTour: (args: {
    document: WingsSideTourEnglishEditorialDocument
    tourID: number | string
    transaction: Transaction
  }) => Promise<void>
}

export type WingsSideEnglishEditorialEnvironmentKind = 'production'
export type WingsSideEnglishEditorialSourceKind = 'database-snapshot' | 'source-inventory'

export type WingsSideEnglishEditorialRuntimeTargetAttestation = Readonly<{
  databaseIdentitySha256: string
  environmentKind: WingsSideEnglishEditorialEnvironmentKind
  governanceChecksum: string
  releaseSha: string
  siteCode: 'wing-side'
  sourceKind: WingsSideEnglishEditorialSourceKind
  sourceSha256: string
}>

export type WingsSideEnglishEditorialExpectedRuntimeTarget = Readonly<
  Omit<WingsSideEnglishEditorialRuntimeTargetAttestation, 'governanceChecksum'>
>

export type WingsSideEnglishEditorialAttestedRuntimeAdapter<Transaction> = Readonly<{
  adapter: WingsSideTourEnglishEditorialRuntimeAdapter<Transaction>
  attestation: WingsSideEnglishEditorialRuntimeTargetAttestation
}>

export class WingsSideEnglishEditorialAmbiguousCommitError extends Error {
  readonly code = 'WINGSSIDE_EN_EDITORIAL_AMBIGUOUS_COMMIT'
  readonly requiresVerify = true

  constructor(cause: unknown) {
    super('English editorial commit outcome is ambiguous; run guarded verify before retrying', {
      cause,
    })
    this.name = 'WingsSideEnglishEditorialAmbiguousCommitError'
  }
}

const killPreservingPrimary = async <Transaction>({
  adapter,
  primary,
  transaction,
}: {
  adapter: WingsSideTourEnglishEditorialRuntimeAdapter<Transaction>
  primary: unknown
  transaction: Transaction
}) => {
  try {
    await adapter.killTransaction(transaction)
  } catch (killError) {
    throw new AggregateError(
      [primary, killError],
      'English editorial mutation failed and transaction cleanup also failed',
      { cause: primary },
    )
  }
}

type ArtifactIO = Pick<typeof fs, 'readFileSync'>

const deepFreeze = <T>(value: T): T => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child)
  }
  return value
}

export const readFrozenWingsSideEnglishEditorialArtifact = <T>({
  expectedSha256,
  filePath,
  io = fs,
  validate,
}: {
  expectedSha256: string
  filePath: string
  io?: ArtifactIO
  validate: (value: unknown) => T
}): { sha256: string; value: Readonly<T> } => {
  if (!/^[0-9a-f]{64}$/u.test(expectedSha256)) {
    throw new Error('English editorial artifact requires a lowercase SHA-256')
  }
  const bytes = io.readFileSync(filePath)
  const sha256 = createHash('sha256').update(bytes).digest('hex')
  if (sha256 !== expectedSha256) {
    throw new Error(`English editorial artifact checksum mismatch: ${filePath}`)
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(bytes.toString())
  } catch {
    throw new Error(`English editorial artifact is invalid JSON: ${filePath}`)
  }
  return { sha256, value: deepFreeze(validate(parsed)) }
}

const configFrom = (value: unknown): WingsSideTourEnglishEditorialConfigArtifact => {
  const artifact = value as WingsSideTourEnglishEditorialConfigArtifact
  assertWingsSideTourEnglishEditorialConfigArtifact(artifact)
  return artifact
}

const manifestFrom = (value: unknown): WingsSideTourEnglishEditorialManifest => {
  const manifest = value as WingsSideTourEnglishEditorialManifest
  assertWingsSideTourEnglishEditorialManifest(manifest)
  return manifest
}

const planFrom = (value: unknown): WingsSideTourEnglishEditorialPlan => {
  const plan = value as WingsSideTourEnglishEditorialPlan
  assertWingsSideTourEnglishEditorialPlan(plan)
  return plan
}

export const loadFrozenWingsSideEnglishEditorialArtifacts = ({
  config,
  io = fs,
  manifest,
  plan,
}: {
  config: { path: string; sha256: string }
  io?: ArtifactIO
  manifest: { path: string; sha256: string }
  plan: { path: string; sha256: string }
}) => {
  const configArtifact = readFrozenWingsSideEnglishEditorialArtifact({
    expectedSha256: config.sha256,
    filePath: config.path,
    io,
    validate: configFrom,
  })
  const manifestArtifact = readFrozenWingsSideEnglishEditorialArtifact({
    expectedSha256: manifest.sha256,
    filePath: manifest.path,
    io,
    validate: manifestFrom,
  })
  const planArtifact = readFrozenWingsSideEnglishEditorialArtifact({
    expectedSha256: plan.sha256,
    filePath: plan.path,
    io,
    validate: planFrom,
  })
  assertWingsSideTourEnglishEditorialGovernance({
    config: configArtifact.value.config,
    manifest: manifestArtifact.value,
    plan: planArtifact.value,
  })
  return deepFreeze({
    config: configArtifact.value.config,
    configGovernance: configArtifact.value,
    configArtifactSha256: configArtifact.sha256,
    manifest: manifestArtifact.value,
    manifestArtifactSha256: manifestArtifact.sha256,
    plan: planArtifact.value,
    planArtifactSha256: planArtifact.sha256,
  })
}

type LoadedEnglishEditorialArtifacts = ReturnType<
  typeof loadFrozenWingsSideEnglishEditorialArtifacts
>

const sha256Pattern = /^[a-f0-9]{64}$/u
const releaseShaPattern = /^[a-f0-9]{40}$/u

export const wingsSideEnglishEditorialRuntimeGovernanceChecksum = (
  artifacts: LoadedEnglishEditorialArtifacts,
) =>
  wingsSideTourEnglishEditorialChecksum({
    configArtifactSha256: artifacts.configArtifactSha256,
    manifestArtifactSha256: artifacts.manifestArtifactSha256,
    planArtifactSha256: artifacts.planArtifactSha256,
    releaseSha: artifacts.plan.releaseSha,
    siteCode: artifacts.plan.siteCode,
    sourceInventory: artifacts.manifest.tours.map(
      ({ slug, sourceChecksum, tourID }) => ({
        slug,
        sourceChecksum,
        tourID,
      }),
    ),
  })

const assertRuntimeTargetShape = (
  target: WingsSideEnglishEditorialExpectedRuntimeTarget,
): void => {
  if (
    !sha256Pattern.test(target.databaseIdentitySha256) ||
    target.environmentKind !== 'production' ||
    !releaseShaPattern.test(target.releaseSha) ||
    target.siteCode !== 'wing-side' ||
    !['database-snapshot', 'source-inventory'].includes(target.sourceKind) ||
    !sha256Pattern.test(target.sourceSha256)
  ) {
    throw new Error('English editorial runtime target attestation shape is invalid')
  }
}

export const createWingsSideEnglishEditorialRuntimeTargetAttestation = (
  value: WingsSideEnglishEditorialRuntimeTargetAttestation,
): WingsSideEnglishEditorialRuntimeTargetAttestation => {
  assertRuntimeTargetShape(value)
  if (!sha256Pattern.test(value.governanceChecksum)) {
    throw new Error('English editorial runtime target governance checksum is invalid')
  }
  return deepFreeze({ ...value })
}

export const assertWingsSideEnglishEditorialRuntimeTarget = ({
  artifacts,
  attestation,
  expected,
}: {
  artifacts: LoadedEnglishEditorialArtifacts
  attestation: WingsSideEnglishEditorialRuntimeTargetAttestation
  expected: WingsSideEnglishEditorialExpectedRuntimeTarget
}): void => {
  assertRuntimeTargetShape(expected)
  assertRuntimeTargetShape(attestation)
  if (!Object.isFrozen(attestation)) {
    throw new Error('English editorial runtime target attestation must be immutable')
  }
  const governanceChecksum = wingsSideEnglishEditorialRuntimeGovernanceChecksum(artifacts)
  if (
    attestation.governanceChecksum !== governanceChecksum ||
    attestation.databaseIdentitySha256 !== expected.databaseIdentitySha256 ||
    attestation.environmentKind !== expected.environmentKind ||
    attestation.releaseSha !== expected.releaseSha ||
    attestation.releaseSha !== artifacts.plan.releaseSha ||
    attestation.releaseSha !== artifacts.manifest.releaseSha ||
    attestation.siteCode !== expected.siteCode ||
    attestation.siteCode !== artifacts.plan.siteCode ||
    attestation.siteCode !== artifacts.manifest.siteCode ||
    attestation.sourceKind !== expected.sourceKind ||
    attestation.sourceSha256 !== expected.sourceSha256
  ) {
    throw new Error('English editorial runtime adapter target attestation mismatch')
  }
}

const assertRuntimeInventory = (
  rows: WingsSideTourEnglishEditorialRuntimeRow[],
  plan: WingsSideTourEnglishEditorialPlan,
) => {
  if (rows.length !== plan.expectedTourCount) {
    throw new Error(`English editorial runtime requires exactly 22 tours, found ${rows.length}`)
  }
  const ids = rows.map(({ tourID }) => String(tourID))
  const slugs = rows.map(({ document }) => document.slug)
  if (new Set(ids).size !== rows.length || new Set(slugs).size !== rows.length) {
    throw new Error('English editorial runtime contains duplicate tour identity')
  }
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index]!
    const expected = plan.tourIdentities[index]!
    if (
      row.siteCode !== plan.siteCode ||
      row.locale !== 'en' ||
      String(row.tourID) !== String(expected.tourID) ||
      row.document.slug !== expected.slug
    ) {
      throw new Error(`English editorial runtime identity/order mismatch at index ${index}`)
    }
  }
}

const stateOf = (
  rows: WingsSideTourEnglishEditorialRuntimeRow[],
  plan: WingsSideTourEnglishEditorialPlan,
): 'after' | 'before' => {
  const states = rows.map(({ document }, index) => {
    const checksum = wingsSideTourEnglishEditorialChecksum(document)
    const entry = plan.entries[index]!
    if (checksum === entry.sourceChecksum) return 'before'
    if (checksum === entry.afterChecksum) return 'after'
    throw new Error(`English editorial runtime source drift: ${entry.slug}`)
  })
  if (states.every((state) => state === 'before')) return 'before'
  if (states.every((state) => state === 'after')) return 'after'
  throw new Error('English editorial runtime refused partial/mixed state')
}

export const verifyWingsSideTourEnglishEditorialRuntime = async <Transaction>({
  adapter,
  config,
  expectedState,
  manifest,
  plan,
}: {
  adapter: WingsSideTourEnglishEditorialRuntimeAdapter<Transaction>
  config: WingsSideTourEnglishEditorialConfig
  expectedState: 'after' | 'before'
  manifest: WingsSideTourEnglishEditorialManifest
  plan: WingsSideTourEnglishEditorialPlan
}) => {
  assertWingsSideTourEnglishEditorialGovernance({ config, manifest, plan })
  const transaction = await adapter.beginTransaction()
  if (transaction === null || transaction === undefined) {
    throw new Error('English editorial verification could not start required transaction')
  }
  let checked = 0
  try {
    const rows = await adapter.readTours(transaction)
    assertRuntimeInventory(rows, plan)
    verifyWingsSideTourEnglishEditorialPlan(
      plan,
      rows.map(({ document }) => document),
      expectedState === 'after' ? 'applied' : 'rolled-back',
    )
    checked = rows.length
  } catch (error) {
    await killPreservingPrimary({ adapter, primary: error, transaction })
    throw error
  }
  await adapter.killTransaction(transaction)
  return { checked, state: expectedState }
}

export const transitionWingsSideTourEnglishEditorialRuntime = async <Transaction>({
  adapter,
  config,
  direction,
  manifest,
  plan,
}: {
  adapter: WingsSideTourEnglishEditorialRuntimeAdapter<Transaction>
  config: WingsSideTourEnglishEditorialConfig
  direction: 'apply' | 'rollback'
  manifest: WingsSideTourEnglishEditorialManifest
  plan: WingsSideTourEnglishEditorialPlan
}) => {
  assertWingsSideTourEnglishEditorialGovernance({ config, manifest, plan })
  let transaction: null | Transaction = null
  let commitStarted = false
  try {
    transaction = await adapter.beginTransaction()
    if (transaction === null || transaction === undefined) {
      throw new Error('English editorial runtime could not start required transaction')
    }
    const rows = await adapter.readTours(transaction)
    assertRuntimeInventory(rows, plan)
    const currentState = stateOf(rows, plan)
    const targetState = direction === 'apply' ? 'after' : 'before'
    if (currentState === targetState) {
      commitStarted = true
      await adapter.commitTransaction(transaction)
      transaction = null
      return { state: targetState, unchanged: 22, updated: 0 }
    }
    const target =
      direction === 'apply'
        ? applyWingsSideTourEnglishEditorialPlan(
            plan,
            rows.map(({ document }) => document),
          )
        : rollbackWingsSideTourEnglishEditorialPlan(
            plan,
            rows.map(({ document }) => document),
          )
    for (let index = 0; index < target.length; index += 1) {
      await adapter.writeTour({
        document: target[index]!,
        tourID: plan.entries[index]!.tourID,
        transaction,
      })
    }
    const afterRows = await adapter.readTours(transaction)
    assertRuntimeInventory(afterRows, plan)
    if (stateOf(afterRows, plan) !== targetState) {
      throw new Error('English editorial runtime post-write verification failed')
    }
    commitStarted = true
    await adapter.commitTransaction(transaction)
    transaction = null
    return { state: targetState, unchanged: 0, updated: 22 }
  } catch (error) {
    if (transaction !== null && transaction !== undefined) {
      if (commitStarted) throw new WingsSideEnglishEditorialAmbiguousCommitError(error)
      await killPreservingPrimary({ adapter, primary: error, transaction })
    }
    throw error
  }
}
