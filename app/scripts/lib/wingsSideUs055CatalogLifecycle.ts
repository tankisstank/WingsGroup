import {
  createHash,
  randomBytes,
  sign,
  verify,
  type KeyObject,
} from 'node:crypto'
import { open, readFile, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { createLocalReq, getPayload, type Payload, type PayloadRequest } from 'payload'

import { assertWingsSideCatalogDevelopmentTeamApprovalAudit } from './wingsSideTourEditorialCatalogAuthoring'
import {
  parseWingsSideTourEditorialCatalogV2,
  wingsSideCanonicalPricingDisclosureCount,
  type WingsSideTourEditorialCatalog,
} from './wingsSideTourEditorialLocalization'
import {
  assertEditorialPlanShape,
  editorialChecksum,
  editorialStableJSONStringify,
  type WingsSideTourEditorialPlan,
} from './wingsSideTourEditorialProduction'
import {
  applyWingsSideTourEditorialProductionPlan,
  createWingsSideTourEditorialProductionPlan,
  rollbackWingsSideTourEditorialProductionPlan,
  verifyWingsSideTourEditorialProductionPlan,
} from './wingsSideTourEditorialProductionRuntime'

export const us055RehearsalAdminEmail =
  'wingsside-tour-editorial-rehearsal@internal.invalid'

export type Us055RehearsalStage =
  | 'plan'
  | 'apply'
  | 'verify-after'
  | 'rollback'
  | 'verify-before'

export type Us055TargetIdentity = {
  database: string
  host: string
  port: number
}

export type Us055ArtifactBinding = {
  backupSha256: string
  beforeArtifactChecksum: string
  catalogRawSha256: string
  planCanonicalSha256: string
  planRawSha256: string
  releaseSourceCommit: string
  restoreEvidenceSha256: string
}

export type Us055TargetProofPayload = {
  artifacts: Us055ArtifactBinding
  expiresAt: string
  issuedAt: string
  keyID: string
  nonce: string
  runID: string
  stage: Us055RehearsalStage
  target: Us055TargetIdentity
  version: 1
}

export type Us055TargetProof = {
  payload: Us055TargetProofPayload
  signature: string
}

export type Us055TargetProofTrust = {
  fingerprint: string
  keyID: string
  publicKey: KeyObject
}

export type Us055CatalogLifecycleSession = {
  artifacts: Omit<Us055ArtifactBinding, 'backupSha256' | 'restoreEvidenceSha256'>
  catalog: WingsSideTourEditorialCatalog
  catalogPath: string
  close: (timeoutMilliseconds?: number) => Promise<void>
  payload: Payload
  plan: WingsSideTourEditorialPlan
  planPath: string
  req: PayloadRequest
  runID: string
  target: Us055TargetIdentity
}

type ClosablePayload = Pick<Payload, 'destroy'> & {
  db?: {
    pool?: {
      on?: (event: 'error', listener: (error: Error) => void) => unknown
    }
  }
}

const sha256 = (value: string | Buffer) =>
  createHash('sha256').update(value).digest('hex')

const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMilliseconds: number,
  label: string,
): Promise<T> => {
  let timer: NodeJS.Timeout | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(
          () => reject(new Error(`${label} exceeded ${timeoutMilliseconds}ms`)),
          timeoutMilliseconds,
        )
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

export const createBoundPayloadCloser = (
  payload: ClosablePayload,
  onPoolCloseError: (error: Error) => void = () => {},
) => {
  let closePromise: Promise<void> | undefined
  return (timeoutMilliseconds = 5_000) => {
    if (!closePromise) {
      // pg-pool can emit an Error event while its owned clients are ending.
      // Install the listener only at shutdown so an event cannot terminate the
      // process before cleanup evidence is made terminal.
      payload.db?.pool?.on?.('error', onPoolCloseError)
      // Payload.destroy() owns the database-adapter shutdown. Calling pool.end()
      // separately races or double-closes the same PostgreSQL pool.
      closePromise = withTimeout(
        payload.destroy(),
        timeoutMilliseconds,
        'US-055 Payload/PostgreSQL close',
      )
    }
    return closePromise
  }
}

const freeze = (value: unknown): unknown => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const child of Object.values(value)) freeze(child)
  }
  return value
}

const assertLowerSha256 = (label: string, value: string) => {
  if (!/^[a-f0-9]{64}$/u.test(value)) {
    throw new Error(`${label} must be a lowercase SHA-256`)
  }
}

const assertReleaseCommit = (value: string) => {
  if (!/^[a-f0-9]{40}$/u.test(value)) {
    throw new Error('US-055 rehearsal release source commit must be a full lowercase Git SHA')
  }
  return value
}

export const assertUs055CatalogLifecycleTarget = ({
  databaseURL,
  environment = process.env,
}: {
  databaseURL: string
  environment?: Partial<NodeJS.ProcessEnv>
}): Us055TargetIdentity => {
  if (environment.WINGSSIDE_TOUR_EDITORIAL_REHEARSAL_ALLOW !== 'disposable-postgres') {
    throw new Error('US-055 lifecycle requires the disposable-postgres rehearsal allow value')
  }
  if (environment.PAYLOAD_DB_PUSH !== 'false') {
    throw new Error('US-055 lifecycle requires PAYLOAD_DB_PUSH=false')
  }
  for (const key of [
    'VERCEL',
    'VERCEL_ENV',
    'RAILWAY_ENVIRONMENT',
    'RAILWAY_ENVIRONMENT_NAME',
    'WINGSSIDE_RELEASE_WRITE_ALLOW',
    'WINGSSIDE_RELEASE_WRITE_EVIDENCE',
  ]) {
    if (String(environment[key] || '').trim()) {
      throw new Error(`US-055 lifecycle refuses production capability marker ${key}`)
    }
  }
  let url: URL
  try {
    url = new URL(databaseURL)
  } catch {
    throw new Error('US-055 lifecycle requires a valid PostgreSQL URL')
  }
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
    throw new Error('US-055 lifecycle requires PostgreSQL')
  }
  if (!new Set(['127.0.0.1', '::1', 'localhost']).has(url.hostname)) {
    throw new Error('US-055 lifecycle accepts only a loopback PostgreSQL target')
  }
  const database = decodeURIComponent(url.pathname.replace(/^\/+/u, ''))
  if (!/rehearsal/iu.test(database)) {
    throw new Error('US-055 lifecycle database name must contain rehearsal')
  }
  const port = Number(url.port)
  if (!url.port || !Number.isInteger(port) || port < 1024 || port > 65535) {
    throw new Error('US-055 lifecycle requires an explicit unprivileged loopback port')
  }
  return { database, host: url.hostname, port }
}

export const loadUs055CatalogArtifact = async ({
  catalogPath,
  expectedRawSha256,
}: {
  catalogPath: string
  expectedRawSha256: string
}) => {
  assertLowerSha256('US-055 catalog trusted raw hash', expectedRawSha256)
  const resolved = path.resolve(catalogPath)
  const bytes = await readFile(resolved)
  const actualRawSha256 = sha256(bytes)
  if (actualRawSha256 !== expectedRawSha256) {
    throw new Error('US-055 catalog raw SHA-256 does not match external trust input')
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(bytes.toString('utf8'))
  } catch {
    throw new Error('US-055 catalog is not valid JSON')
  }
  const catalog = parseWingsSideTourEditorialCatalogV2(parsed, {
    expectedPricingDisclosureCount: wingsSideCanonicalPricingDisclosureCount,
  })
  assertWingsSideCatalogDevelopmentTeamApprovalAudit(catalog)
  freeze(catalog)
  return { catalog, catalogPath: resolved, catalogRawSha256: actualRawSha256 }
}

const resolveRehearsalAdmin = async (payload: Payload) => {
  const result = await payload.find({
    collection: 'users',
    depth: 0,
    limit: 2,
    overrideAccess: true,
    pagination: false,
    where: { email: { equals: us055RehearsalAdminEmail } },
  })
  if (result.docs.length !== 1 || result.docs[0]!.role !== 'super-admin') {
    throw new Error('US-055 lifecycle requires exactly one seeded rehearsal super-admin')
  }
  return result.docs[0]!
}

export const prepareUs055CatalogLifecycle = async ({
  catalogPath,
  catalogRawSha256,
  databaseURL,
  environment = process.env,
  outputDirectory,
  releaseSourceCommit,
  runID,
}: {
  catalogPath: string
  catalogRawSha256: string
  databaseURL: string
  environment?: Partial<NodeJS.ProcessEnv>
  outputDirectory: string
  releaseSourceCommit: string
  runID: string
}): Promise<Us055CatalogLifecycleSession> => {
  const target = assertUs055CatalogLifecycleTarget({ databaseURL, environment })
  assertReleaseCommit(releaseSourceCommit)
  if (!/^[a-z0-9][a-z0-9_-]{5,80}$/iu.test(runID)) {
    throw new Error('US-055 lifecycle run ID is invalid')
  }
  const artifact = await loadUs055CatalogArtifact({
    catalogPath,
    expectedRawSha256: catalogRawSha256,
  })
  const { default: config } = await import('../../src/payload.config')
  const payload = await getPayload({ config })
  const closePayload = createBoundPayloadCloser(payload)
  let keepPayload = false
  try {
    if (!payload.db.packageName.includes('db-postgres')) {
      throw new Error(`US-055 lifecycle requires PostgreSQL, observed ${payload.db.packageName}`)
    }
    const admin = await resolveRehearsalAdmin(payload)
    const req = await createLocalReq(
      { user: { ...admin, collection: 'users' } as never },
      payload,
    )
    const plan = await createWingsSideTourEditorialProductionPlan({
      catalog: artifact.catalog,
      payload,
      releaseSourceCommit,
      req,
      runID,
    })
    const planCanonicalSha256 = editorialChecksum(plan)
    const rawPlan = `${JSON.stringify(plan, null, 2)}\n`
    const planRawSha256 = sha256(rawPlan)
    const planPath = path.resolve(outputDirectory, `catalog-plan-${runID}.json`)
    const handle = await open(planPath, 'wx', 0o600)
    try {
      await handle.writeFile(rawPlan, 'utf8')
    } finally {
      await handle.close()
    }
    keepPayload = true
    return {
      artifacts: {
        beforeArtifactChecksum: plan.aggregateChecksums.before,
        catalogRawSha256: artifact.catalogRawSha256,
        planCanonicalSha256,
        planRawSha256,
        releaseSourceCommit,
      },
      catalog: artifact.catalog,
      catalogPath: artifact.catalogPath,
      close: closePayload,
      payload,
      plan,
      planPath,
      req,
      runID,
      target,
    }
  } finally {
    if (!keepPayload) {
      await closePayload()
    }
  }
}

export const publicKeyFingerprint = (publicKey: KeyObject) =>
  sha256(publicKey.export({ format: 'der', type: 'spki' }) as Buffer)

const proofBytes = (payload: Us055TargetProofPayload) =>
  Buffer.from(editorialStableJSONStringify(payload), 'utf8')

export const createUs055TargetProof = ({
  artifacts,
  keyID,
  now = new Date(),
  privateKey,
  runID,
  stage,
  target,
  ttlMilliseconds = 5 * 60_000,
}: {
  artifacts: Us055ArtifactBinding
  keyID: string
  now?: Date
  privateKey: KeyObject
  runID: string
  stage: Us055RehearsalStage
  target: Us055TargetIdentity
  ttlMilliseconds?: number
}): Us055TargetProof => {
  if (privateKey.type !== 'private' || privateKey.asymmetricKeyType !== 'ed25519') {
    throw new Error('US-055 target proof signer must be an Ed25519 private key')
  }
  const payload: Us055TargetProofPayload = {
    artifacts,
    expiresAt: new Date(now.getTime() + ttlMilliseconds).toISOString(),
    issuedAt: now.toISOString(),
    keyID,
    nonce: randomBytes(24).toString('base64url'),
    runID,
    stage,
    target,
    version: 1,
  }
  return {
    payload,
    signature: sign(null, proofBytes(payload), privateKey).toString('base64'),
  }
}

const consumeReplayLedger = async ({
  ledgerPath,
  proofDigest,
  nonce,
}: {
  ledgerPath: string
  nonce: string
  proofDigest: string
}) => {
  const resolved = path.resolve(ledgerPath)
  const lockPath = `${resolved}.lock`
  const lock = await open(lockPath, 'wx', 0o600).catch(() => {
    throw new Error('US-055 target proof replay ledger is locked')
  })
  try {
    let entries: Array<{ nonce: string; proofDigest: string }> = []
    try {
      entries = JSON.parse(await readFile(resolved, 'utf8'))
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }
    if (
      entries.some(
        (entry) => entry.nonce === nonce || entry.proofDigest === proofDigest,
      )
    ) {
      throw new Error('US-055 target proof replay detected')
    }
    const temporary = `${resolved}.${process.pid}.${randomBytes(8).toString('hex')}.tmp`
    await writeFile(
      temporary,
      `${JSON.stringify([...entries, { nonce, proofDigest }], null, 2)}\n`,
      { encoding: 'utf8', flag: 'wx', mode: 0o600 },
    )
    await rename(temporary, resolved)
  } finally {
    await lock.close()
    await rm(lockPath, { force: true })
  }
}

export const authorizeUs055TargetProof = async ({
  artifacts,
  ledgerPath,
  now = new Date(),
  proof,
  runID,
  stage,
  target,
  trust,
}: {
  artifacts: Us055ArtifactBinding
  ledgerPath: string
  now?: Date
  proof: Us055TargetProof
  runID: string
  stage: Us055RehearsalStage
  target: Us055TargetIdentity
  trust: Us055TargetProofTrust
}) => {
  if (
    trust.publicKey.type !== 'public' ||
    trust.publicKey.asymmetricKeyType !== 'ed25519'
  ) {
    throw new Error('US-055 target proof trust key must be an Ed25519 public key')
  }
  assertLowerSha256('US-055 trust fingerprint', trust.fingerprint)
  if (publicKeyFingerprint(trust.publicKey) !== trust.fingerprint) {
    throw new Error('US-055 target proof public key fingerprint is not trusted')
  }
  const payload = proof?.payload
  if (
    payload?.version !== 1 ||
    payload.keyID !== trust.keyID ||
    payload.runID !== runID ||
    payload.stage !== stage ||
    editorialChecksum(payload.target) !== editorialChecksum(target) ||
    editorialChecksum(payload.artifacts) !== editorialChecksum(artifacts)
  ) {
    throw new Error('US-055 target proof binding mismatch')
  }
  const issuedAt = Date.parse(payload.issuedAt)
  const expiresAt = Date.parse(payload.expiresAt)
  if (
    !Number.isFinite(issuedAt) ||
    !Number.isFinite(expiresAt) ||
    issuedAt > now.getTime() + 30_000 ||
    expiresAt <= now.getTime() ||
    expiresAt - issuedAt > 5 * 60_000 ||
    !/^[A-Za-z0-9_-]{32}$/u.test(payload.nonce)
  ) {
    throw new Error('US-055 target proof is stale, future-dated, or malformed')
  }
  if (
    !verify(
      null,
      proofBytes(payload),
      trust.publicKey,
      Buffer.from(proof.signature, 'base64'),
    )
  ) {
    throw new Error('US-055 target proof signature is invalid')
  }
  const proofDigest = sha256(
    Buffer.concat([proofBytes(payload), Buffer.from(proof.signature, 'base64')]),
  )
  await consumeReplayLedger({ ledgerPath, nonce: payload.nonce, proofDigest })
  return { nonce: payload.nonce, proofDigest, stage }
}

export const executeUs055CatalogLifecycle = async ({
  artifacts,
  captureAppliedProof,
  captureFinalProof,
  ledgerPath,
  onStage = async () => {},
  session,
  signProof,
  trust,
}: {
  artifacts: Us055ArtifactBinding
  captureAppliedProof: () => Promise<unknown> | unknown
  captureFinalProof: () => Promise<unknown> | unknown
  ledgerPath: string
  onStage?: (
    stage: Us055RehearsalStage,
    state: 'before' | 'after',
    details?: unknown,
  ) => Promise<void>
  session: Us055CatalogLifecycleSession
  signProof: (stage: Us055RehearsalStage) => Promise<Us055TargetProof> | Us055TargetProof
  trust: Us055TargetProofTrust
}) => {
  if (
    editorialChecksum(session.artifacts) !==
    editorialChecksum({
      beforeArtifactChecksum: artifacts.beforeArtifactChecksum,
      catalogRawSha256: artifacts.catalogRawSha256,
      planCanonicalSha256: artifacts.planCanonicalSha256,
      planRawSha256: artifacts.planRawSha256,
      releaseSourceCommit: artifacts.releaseSourceCommit,
    })
  ) {
    throw new Error('US-055 backup/restore artifact binding does not match prepared plan')
  }
  const authorize = async (stage: Us055RehearsalStage) =>
    authorizeUs055TargetProof({
      artifacts,
      ledgerPath,
      proof: await signProof(stage),
      runID: session.runID,
      stage,
      target: session.target,
      trust,
    })

  const stageProofs: Array<{ nonce: string; proofDigest: string; stage: string }> = []
  await onStage('plan', 'before')
  stageProofs.push(await authorize('plan'))
  await onStage('plan', 'after')
  await onStage('apply', 'before')
  stageProofs.push(await authorize('apply'))
  const apply = await applyWingsSideTourEditorialProductionPlan({
    catalog: session.catalog,
    payload: session.payload,
    plan: session.plan,
    req: session.req,
  })
  await onStage('apply', 'after', apply)
  await onStage('verify-after', 'before')
  stageProofs.push(await authorize('verify-after'))
  const verifyAfter = await verifyWingsSideTourEditorialProductionPlan({
    expectedState: 'after',
    payload: session.payload,
    plan: session.plan,
    req: session.req,
  })
  const appliedProof = await captureAppliedProof()
  await onStage('verify-after', 'after', verifyAfter)
  await onStage('rollback', 'before')
  stageProofs.push(await authorize('rollback'))
  const rollback = await rollbackWingsSideTourEditorialProductionPlan({
    catalog: session.catalog,
    payload: session.payload,
    plan: session.plan,
    req: session.req,
  })
  await onStage('rollback', 'after', rollback)
  await onStage('verify-before', 'before')
  stageProofs.push(await authorize('verify-before'))
  const verifyBefore = await verifyWingsSideTourEditorialProductionPlan({
    expectedState: 'before',
    payload: session.payload,
    plan: session.plan,
    req: session.req,
  })
  const finalProof = await captureFinalProof()
  await onStage('verify-before', 'after', verifyBefore)
  return {
    appliedProof,
    apply,
    finalProof,
    rollback,
    stageProofs,
    verifyAfter,
    verifyBefore,
  }
}

export const readUs055LifecyclePlan = async ({
  expectedCanonicalSha256,
  expectedRawSha256,
  planPath,
}: {
  expectedCanonicalSha256: string
  expectedRawSha256: string
  planPath: string
}) => {
  const bytes = await readFile(path.resolve(planPath))
  if (sha256(bytes) !== expectedRawSha256) {
    throw new Error('US-055 lifecycle plan raw SHA-256 mismatch')
  }
  const plan = JSON.parse(bytes.toString('utf8')) as WingsSideTourEditorialPlan
  assertEditorialPlanShape(plan)
  if (editorialChecksum(plan) !== expectedCanonicalSha256) {
    throw new Error('US-055 lifecycle plan canonical SHA-256 mismatch')
  }
  return plan
}
