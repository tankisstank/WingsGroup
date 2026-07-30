import { createHash, createPublicKey, randomBytes, verify } from 'node:crypto'
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
  type WingsSideTourEnglishEditorialConfigArtifact,
  type WingsSideTourEnglishEditorialDocument,
  type WingsSideTourEnglishEditorialManifest,
  type WingsSideTourEnglishEditorialPlan,
} from './wingsSideTourEnglishEditorial'
import { assertWingsSideEditorialProductionWriteGuard } from './wingsSideReleaseWriteGuard'
import type { WingsSideEditorialProductionWriteGuardArgs } from './wingsSideReleaseWriteGuard'

export type WingsSideTourEnglishEditorialRuntimeRow = {
  document: WingsSideTourEnglishEditorialDocument
  locale: 'en'
  siteCode: 'wing-side'
  tourID: number | string
}

export type WingsSideTourEnglishEditorialRuntimeAdapter<Transaction> = {
  attestTarget: (args: {
    challenge: WingsSideEnglishEditorialTargetChallenge
    transaction: Transaction
  }) => Promise<WingsSideEnglishEditorialSignedTargetProof>
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
  currentDatabase: string
  databaseIdentitySha256: string
  environmentKind: WingsSideEnglishEditorialEnvironmentKind
  governanceChecksum: string
  releaseSha: string
  siteCode: 'wing-side'
  sourceKind: WingsSideEnglishEditorialSourceKind
  sourceSha256: string
  transactionNonce: string
  transactionSessionID: string
  stage: WingsSideEnglishEditorialTargetProofStage
  planArtifactSha256: string
}>

export type WingsSideEnglishEditorialExpectedRuntimeTarget = Readonly<
  Omit<
    WingsSideEnglishEditorialRuntimeTargetAttestation,
    | 'governanceChecksum'
    | 'planArtifactSha256'
    | 'stage'
    | 'transactionNonce'
    | 'transactionSessionID'
  >
>

export type WingsSideEnglishEditorialTargetProofStage =
  | 'after-begin'
  | 'before-commit'
  | 'before-verify-close'

export type WingsSideEnglishEditorialTargetChallenge = Readonly<{
  governanceChecksum: string
  nonce: string
  planArtifactSha256: string
  stage: WingsSideEnglishEditorialTargetProofStage
}>

export type WingsSideEnglishEditorialSignedTargetProof = Readonly<{
  payload: WingsSideEnglishEditorialRuntimeTargetAttestation
  signature: Readonly<{
    algorithm: 'ed25519'
    keyID: string
    valueBase64: string
  }>
}>

export type WingsSideEnglishEditorialProtectedCryptoPolicy = Readonly<{
  keyID: string
  publicKeySpkiBase64: string
}>

declare const guardedCapabilityBrand: unique symbol
export type WingsSideEnglishEditorialGuardedCapability = Readonly<{
  [guardedCapabilityBrand]: true
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
    const primaryMessage = primary instanceof Error ? primary.message : String(primary)
    const cleanupMessage = killError instanceof Error ? killError.message : String(killError)
    throw new AggregateError(
      [primary, killError],
      `English editorial mutation failed and transaction cleanup also failed; primary=${primaryMessage}; cleanup=${cleanupMessage}`,
      { cause: primary },
    )
  }
}

type ArtifactIO = Pick<typeof fs, 'readFileSync'>
const loadedArtifactSets = new WeakSet<object>()

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
  const loaded = deepFreeze({
    config: configArtifact.value.config,
    configGovernance: configArtifact.value,
    configArtifactSha256: configArtifact.sha256,
    manifest: manifestArtifact.value,
    manifestArtifactSha256: manifestArtifact.sha256,
    plan: planArtifact.value,
    planArtifactSha256: planArtifact.sha256,
  })
  loadedArtifactSets.add(loaded)
  return loaded
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
    !target.currentDatabase ||
    !/^[A-Za-z0-9_-]+$/u.test(target.currentDatabase) ||
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

type CapabilityDetails = {
  artifacts: LoadedEnglishEditorialArtifacts
  expected: WingsSideEnglishEditorialExpectedRuntimeTarget
  keyID: string
  mutationGuardArgs: null | WingsSideEditorialProductionWriteGuardArgs
  phase: 'apply' | 'rollback' | 'verify'
  publicKey: ReturnType<typeof createPublicKey>
}

const capabilityDetails = new WeakMap<object, CapabilityDetails>()

const requiredProtectedEnvironment = (name: string): string => {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`English editorial protected runtime environment is required: ${name}`)
  return value
}

export const issueWingsSideEnglishEditorialGuardedCapabilityFromProtectedEnvironment = ({
  artifacts,
  expected,
  mutationGuardArgs,
  phase,
}: {
  artifacts: LoadedEnglishEditorialArtifacts
  expected: WingsSideEnglishEditorialExpectedRuntimeTarget
  mutationGuardArgs: null | WingsSideEditorialProductionWriteGuardArgs
  phase: 'apply' | 'rollback' | 'verify'
}): WingsSideEnglishEditorialGuardedCapability => {
  if (!loadedArtifactSets.has(artifacts)) {
    throw new Error('English editorial guarded capability requires loader-authenticated artifacts')
  }
  assertRuntimeTargetShape(expected)
  const protectedExpected = {
    currentDatabase: requiredProtectedEnvironment('WINGSSIDE_EN_EDITORIAL_CURRENT_DATABASE'),
    databaseIdentitySha256: requiredProtectedEnvironment(
      'WINGSSIDE_EN_EDITORIAL_DATABASE_IDENTITY_SHA256',
    ),
    environmentKind: requiredProtectedEnvironment('WINGSSIDE_EN_EDITORIAL_ENVIRONMENT_KIND'),
    releaseSha: requiredProtectedEnvironment('WINGSTRAVEL_RELEASE_SHA'),
    siteCode: requiredProtectedEnvironment('WINGSSIDE_EN_EDITORIAL_SITE_CODE'),
    sourceKind: requiredProtectedEnvironment('WINGSSIDE_EN_EDITORIAL_SOURCE_KIND'),
    sourceSha256: requiredProtectedEnvironment('WINGSSIDE_EN_EDITORIAL_SOURCE_SHA256'),
  }
  if (
    wingsSideTourEnglishEditorialChecksum(expected) !==
    wingsSideTourEnglishEditorialChecksum(protectedExpected)
  ) {
    throw new Error('English editorial guarded capability does not match protected environment')
  }
  if (
    artifacts.plan.releaseSha !== expected.releaseSha ||
    artifacts.manifest.releaseSha !== expected.releaseSha ||
    artifacts.plan.siteCode !== expected.siteCode ||
    artifacts.manifest.siteCode !== expected.siteCode
  ) {
    throw new Error('English editorial guarded capability artifact target mismatch')
  }
  if (
    artifacts.configArtifactSha256 !==
      requiredProtectedEnvironment('WINGSSIDE_EN_EDITORIAL_CONFIG_SHA256') ||
    artifacts.manifestArtifactSha256 !==
      requiredProtectedEnvironment('WINGSSIDE_EN_EDITORIAL_MANIFEST_SHA256') ||
    artifacts.planArtifactSha256 !==
      requiredProtectedEnvironment('WINGSSIDE_TOUR_EDITORIAL_PLAN_SHA256')
  ) {
    throw new Error('English editorial guarded capability artifact checksum mismatch')
  }
  if (phase === 'apply' || phase === 'rollback') {
    if (!mutationGuardArgs) {
      throw new Error('English editorial guarded mutation capability requires release guard inputs')
    }
    assertWingsSideEditorialProductionWriteGuard(mutationGuardArgs, process.env)
  } else if (mutationGuardArgs !== null) {
    throw new Error('English editorial verify capability cannot carry mutation authorization')
  }
  const keyID = requiredProtectedEnvironment('WINGSSIDE_EN_EDITORIAL_TARGET_KEY_ID')
  const publicKeySpkiBase64 = requiredProtectedEnvironment(
    'WINGSSIDE_EN_EDITORIAL_TARGET_PUBLIC_KEY_SPKI_BASE64',
  )
  let publicKey: ReturnType<typeof createPublicKey>
  try {
    publicKey = createPublicKey({
      format: 'der',
      key: Buffer.from(publicKeySpkiBase64, 'base64'),
      type: 'spki',
    })
  } catch {
    throw new Error('English editorial protected target public key is invalid')
  }
  if (publicKey.asymmetricKeyType !== 'ed25519') {
    throw new Error('English editorial protected target key must be Ed25519')
  }
  const capability = deepFreeze({}) as WingsSideEnglishEditorialGuardedCapability
  capabilityDetails.set(capability, {
    artifacts,
    expected,
    keyID,
    mutationGuardArgs,
    phase,
    publicKey,
  })
  return capability
}

export const wingsSideEnglishEditorialTargetProofSigningDigest = (
  payload: WingsSideEnglishEditorialRuntimeTargetAttestation,
): string => wingsSideTourEnglishEditorialChecksum({ payload, schemaVersion: 1 })

const assertSignedRuntimeTargetProof = ({
  capability,
  challenge,
  proof,
  priorSessionID,
}: {
  capability: WingsSideEnglishEditorialGuardedCapability
  challenge: WingsSideEnglishEditorialTargetChallenge
  proof: WingsSideEnglishEditorialSignedTargetProof
  priorSessionID?: string
}): string => {
  const details = capabilityDetails.get(capability)
  if (!details) throw new Error('English editorial runtime requires an issued guarded capability')
  const { artifacts, expected, keyID, publicKey } = details
  const payload = proof?.payload
  const signature = proof?.signature
  if (!payload || !signature) throw new Error('English editorial runtime target proof is required')
  assertRuntimeTargetShape(payload)
  if (
    !sha256Pattern.test(payload.governanceChecksum) ||
    !sha256Pattern.test(payload.planArtifactSha256) ||
    !/^[a-f0-9]{64}$/u.test(payload.transactionNonce) ||
    !payload.transactionSessionID ||
    payload.transactionSessionID.length < 16 ||
    payload.stage !== challenge.stage ||
    payload.transactionNonce !== challenge.nonce ||
    payload.planArtifactSha256 !== challenge.planArtifactSha256 ||
    payload.governanceChecksum !== challenge.governanceChecksum ||
    payload.currentDatabase !== expected.currentDatabase ||
    payload.databaseIdentitySha256 !== expected.databaseIdentitySha256 ||
    payload.environmentKind !== expected.environmentKind ||
    payload.releaseSha !== expected.releaseSha ||
    payload.releaseSha !== artifacts.plan.releaseSha ||
    payload.releaseSha !== artifacts.manifest.releaseSha ||
    payload.siteCode !== expected.siteCode ||
    payload.siteCode !== artifacts.plan.siteCode ||
    payload.siteCode !== artifacts.manifest.siteCode ||
    payload.sourceKind !== expected.sourceKind ||
    payload.sourceSha256 !== expected.sourceSha256 ||
    (priorSessionID !== undefined && payload.transactionSessionID !== priorSessionID)
  ) {
    throw new Error('English editorial runtime signed target proof mismatch')
  }
  if (
    signature.algorithm !== 'ed25519' ||
    signature.keyID !== keyID ||
    !signature.valueBase64 ||
    !verify(
      null,
      Buffer.from(wingsSideEnglishEditorialTargetProofSigningDigest(payload), 'utf8'),
      publicKey,
      Buffer.from(signature.valueBase64, 'base64'),
    )
  ) {
    throw new Error('English editorial runtime target proof signature is invalid')
  }
  return payload.transactionSessionID
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

const challengeFor = (
  details: CapabilityDetails,
  nonce: string,
  stage: WingsSideEnglishEditorialTargetProofStage,
): WingsSideEnglishEditorialTargetChallenge =>
  deepFreeze({
    governanceChecksum: wingsSideEnglishEditorialRuntimeGovernanceChecksum(details.artifacts),
    nonce,
    planArtifactSha256: details.artifacts.planArtifactSha256,
    stage,
  })

const verifyWingsSideTourEnglishEditorialRuntime = async <Transaction>({
  adapter,
  capability,
  expectedState,
}: {
  adapter: WingsSideTourEnglishEditorialRuntimeAdapter<Transaction>
  capability: WingsSideEnglishEditorialGuardedCapability
  expectedState: 'after' | 'before'
}) => {
  const details = capabilityDetails.get(capability)
  if (!details) throw new Error('English editorial runtime requires an issued guarded capability')
  const { config, manifest, plan } = details.artifacts
  assertWingsSideTourEnglishEditorialGovernance({ config, manifest, plan })
  const nonce = randomBytes(32).toString('hex')
  const transaction = await adapter.beginTransaction()
  if (transaction === null || transaction === undefined) {
    throw new Error('English editorial verification could not start required transaction')
  }
  let checked = 0
  try {
    const firstChallenge = challengeFor(details, nonce, 'after-begin')
    const sessionID = assertSignedRuntimeTargetProof({
      capability,
      challenge: firstChallenge,
      proof: await adapter.attestTarget({ challenge: firstChallenge, transaction }),
    })
    const rows = await adapter.readTours(transaction)
    assertRuntimeInventory(rows, plan)
    verifyWingsSideTourEnglishEditorialPlan(
      plan,
      rows.map(({ document }) => document),
      expectedState === 'after' ? 'applied' : 'rolled-back',
    )
    checked = rows.length
    const finalChallenge = challengeFor(details, nonce, 'before-verify-close')
    assertSignedRuntimeTargetProof({
      capability,
      challenge: finalChallenge,
      priorSessionID: sessionID,
      proof: await adapter.attestTarget({ challenge: finalChallenge, transaction }),
    })
  } catch (error) {
    await killPreservingPrimary({ adapter, primary: error, transaction })
    throw error
  }
  await adapter.killTransaction(transaction)
  return { checked, state: expectedState }
}

const transitionWingsSideTourEnglishEditorialRuntime = async <Transaction>({
  adapter,
  capability,
  direction,
}: {
  adapter: WingsSideTourEnglishEditorialRuntimeAdapter<Transaction>
  capability: WingsSideEnglishEditorialGuardedCapability
  direction: 'apply' | 'rollback'
}) => {
  const details = capabilityDetails.get(capability)
  if (!details) throw new Error('English editorial runtime requires an issued guarded capability')
  const { config, manifest, plan } = details.artifacts
  assertWingsSideTourEnglishEditorialGovernance({ config, manifest, plan })
  let transaction: null | Transaction = null
  let commitStarted = false
  const nonce = randomBytes(32).toString('hex')
  try {
    transaction = await adapter.beginTransaction()
    if (transaction === null || transaction === undefined) {
      throw new Error('English editorial runtime could not start required transaction')
    }
    const firstChallenge = challengeFor(details, nonce, 'after-begin')
    const sessionID = assertSignedRuntimeTargetProof({
      capability,
      challenge: firstChallenge,
      proof: await adapter.attestTarget({ challenge: firstChallenge, transaction }),
    })
    const rows = await adapter.readTours(transaction)
    assertRuntimeInventory(rows, plan)
    const currentState = stateOf(rows, plan)
    const targetState = direction === 'apply' ? 'after' : 'before'
    if (currentState === targetState) {
      const commitChallenge = challengeFor(details, nonce, 'before-commit')
      assertSignedRuntimeTargetProof({
        capability,
        challenge: commitChallenge,
        priorSessionID: sessionID,
        proof: await adapter.attestTarget({ challenge: commitChallenge, transaction }),
      })
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
    const commitChallenge = challengeFor(details, nonce, 'before-commit')
    assertSignedRuntimeTargetProof({
      capability,
      challenge: commitChallenge,
      priorSessionID: sessionID,
      proof: await adapter.attestTarget({ challenge: commitChallenge, transaction }),
    })
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

export const executeWingsSideEnglishEditorialGuardedRuntime = async <Transaction>({
  adapter,
  capability,
  phase,
}: {
  adapter: WingsSideTourEnglishEditorialRuntimeAdapter<Transaction>
  capability: WingsSideEnglishEditorialGuardedCapability
  phase: 'apply' | 'rollback' | 'verify'
}) => {
  const details = capabilityDetails.get(capability)
  if (!details) throw new Error('English editorial runtime requires an issued guarded capability')
  if (details.phase !== phase) {
    throw new Error('English editorial guarded capability phase mismatch')
  }
  if (phase !== 'verify') {
    assertWingsSideEditorialProductionWriteGuard(details.mutationGuardArgs!, process.env)
  }
  return phase === 'verify'
    ? verifyWingsSideTourEnglishEditorialRuntime({
        adapter,
        capability,
        expectedState: 'after',
      })
    : transitionWingsSideTourEnglishEditorialRuntime({
        adapter,
        capability,
        direction: phase,
      })
}

export const executeWingsSideEnglishEditorialGuardedRuntimeWithAdapterFactory = async <
  Transaction,
>({
  adapterFactory,
  capability,
  phase,
}: {
  adapterFactory: (artifacts: LoadedEnglishEditorialArtifacts) =>
    | Promise<WingsSideTourEnglishEditorialRuntimeAdapter<Transaction>>
    | WingsSideTourEnglishEditorialRuntimeAdapter<Transaction>
  capability: WingsSideEnglishEditorialGuardedCapability
  phase: 'apply' | 'rollback' | 'verify'
}) => {
  const details = capabilityDetails.get(capability)
  if (!details) throw new Error('English editorial runtime requires an issued guarded capability')
  if (details.phase !== phase) {
    throw new Error('English editorial guarded capability phase mismatch')
  }
  if (phase !== 'verify') {
    assertWingsSideEditorialProductionWriteGuard(details.mutationGuardArgs!, process.env)
  }
  const adapter = await adapterFactory(details.artifacts)
  if (!adapter) throw new Error('English editorial guarded adapter factory returned no adapter')
  return executeWingsSideEnglishEditorialGuardedRuntime({
    adapter,
    capability,
    phase,
  })
}
