import { createHash, createPublicKey, verify, type KeyObject } from 'node:crypto'
import { open, realpath, stat } from 'node:fs/promises'
import path from 'node:path'

import {
  assertWingsSideTourMediaAuditConsistency,
  buildWingsSideTourMediaAuditReport,
  wingsSideTourMediaAuditChecksum,
  wingsSideTourMediaExpectedTourCount,
  wingsSideTourMediaManifestChecksum,
  type ManualReviewState,
  type MediaKind,
  type NormalizedMediaAuditInput,
  type NormalizedTourMediaAuditInput,
  type OcrState,
  type WingsSideTourMediaAuditReport,
  type WingsSideTourMediaManifest,
} from './wingsSideTourMediaAudit'

export const wingsSideTourMediaManifestShaEnv =
  'WINGSSIDE_TOUR_MEDIA_EXPECTED_MANIFEST_SHA256'
export const wingsSideTourMediaEnvelopeShaEnv =
  'WINGSSIDE_TOUR_MEDIA_EXPECTED_ENVELOPE_SHA256'
export const wingsSideTourMediaPublicKeysJsonEnv =
  'WINGSSIDE_EVIDENCE_PUBLIC_KEYS_JSON'
export const wingsSideTourMediaPublicKeysShaEnv =
  'WINGSSIDE_EVIDENCE_PUBLIC_KEYS_SHA256'

const sha256Pattern = /^[a-f0-9]{64}$/
const releaseShaPattern = /^[a-f0-9]{40}$/
const isoTimestampPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/

export type WingsSideTourMediaReleaseBinding = {
  releaseCommitSha: string
  siteCode: string
  source: {
    kind: 'database-snapshot' | 'source-inventory'
    sha256: string
  }
}

export type WingsSideTourMediaTrustedExpectation = WingsSideTourMediaReleaseBinding & {
  envelopeSha256: string
  envelopeSignerID: string
  manifestSha256: string
}

export type MediaProvenanceEvidence = {
  approvedAt: string
  approvedBy: string
  artifactRelativePath: string
  artifactSha256: string
  licenseReference: string
  licenseType: 'licensed' | 'owned'
  owner: string
  publicUseApproved: boolean
  sourceReference: string
}

export type ManualReviewerEvidence = {
  artifactRelativePath: string
  artifactSha256: string
  reason?: null | string
  reviewedAt: string
  reviewerID: string
  state: ManualReviewState
}

export type OcrAttestation = {
  assetSha256: string
  attesterID: string
  engine: string
  engineVersion: string
  frameExtractions: Array<{
    frameSha256: string
    label: string
    position: LocalVideoFrameSource['position']
    sourceAssetSha256: string
    timestampSeconds?: number
  }>
  frameHashes: string[]
  kind: MediaKind
  mediaID: string
  runAt: string
  state: OcrState
  text?: null | string
}

export type LocalVideoFrameSource = {
  label?: null | string
  position: 'end' | 'middle' | 'scene' | 'start'
  relativePath: string
  timestampSeconds?: null | number
}

export type LocalMediaEvidenceSource = {
  dimensions?: null | { height: number; width: number }
  id: number | string
  kind?: MediaKind
  manualReview: ManualReviewerEvidence
  ocrArtifactRelativePath: string
  ocrArtifactSha256: string
  provenance: MediaProvenanceEvidence
  relativePath: string
  videoFrames?: null | LocalVideoFrameSource[]
}

export type LocalTourMediaEvidenceSource = {
  gallery?: null | LocalMediaEvidenceSource[]
  heroMedia?: null | LocalMediaEvidenceSource
  itineraryDays?: null | Array<{
    gallery?: null | LocalMediaEvidenceSource[]
    media?: null | LocalMediaEvidenceSource
  }>
  marketCard?: null | { thumbnailOverride?: null | LocalMediaEvidenceSource }
  meta?: null | { image?: null | LocalMediaEvidenceSource }
  relatedCardMedia?: null | LocalMediaEvidenceSource[]
  routeViz?: null | { mapImage?: null | LocalMediaEvidenceSource }
  tourID: number | string
  tourSlug: string
}

export type EvidenceArtifactSignature = {
  algorithm: 'ed25519'
  signerID: string
  valueBase64: string
}

export type SignedEvidenceArtifact<
  Kind extends 'manual-review' | 'ocr-attestation' | 'release-envelope' | 'rights-approval',
  Payload,
> = {
  artifactType: Kind
  payload: Payload
  schemaVersion: 1
  signature: EvidenceArtifactSignature
}

export type ManualReviewArtifactPayload = {
  assetSha256: string
  mediaID: string
  reason?: null | string
  reviewedAt: string
  reviewerID: string
  state: 'passed'
}

export type RightsApprovalArtifactPayload = Omit<
  MediaProvenanceEvidence,
  'artifactRelativePath' | 'artifactSha256'
> & {
  assetSha256: string
  mediaID: string
}

export type ReleaseEnvelopeMediaPolicy = {
  assetSha256: string
  manualReviewArtifactSha256: string
  mediaID: string
  ocrArtifactSha256: string
  ocrAttesterID: string
  ocrEngine: string
  ocrEngineVersion: string
  reviewerID: string
  rightsApproverID: string
  rightsArtifactSha256: string
}

export type WingsSideTourMediaReleaseEnvelopePayload = {
  manifestSha256: string
  mediaPolicies: ReleaseEnvelopeMediaPolicy[]
  releaseArtifact: { relativePath: string; sha256: string }
  releaseBinding: WingsSideTourMediaReleaseBinding
  sourceArtifact: { relativePath: string; sha256: string }
  tourInventorySha256: string
}

export type WingsSideTourMediaReleaseEnvelope = SignedEvidenceArtifact<
  'release-envelope',
  WingsSideTourMediaReleaseEnvelopePayload
>

export type WingsSideTourMediaEvidenceBundle = {
  aggregateChecksum: string
  evidenceContract: 'local-byte-evidence-producer'
  manifest: WingsSideTourMediaManifest
  manifestSha256: string
  releaseEnvelope: WingsSideTourMediaReleaseEnvelope
  releaseEnvelopeSha256: string
  releaseBinding: WingsSideTourMediaReleaseBinding
  schemaVersion: 1
  tours: NormalizedTourMediaAuditInput[]
}

const verifiedEvidenceBrand: unique symbol = Symbol('verifiedWingSideTourMediaEvidence')

export type WingsSideTourMediaEvidenceResult = {
  readonly [verifiedEvidenceBrand]: true
  bundle: WingsSideTourMediaEvidenceBundle
  releaseEvidenceChecksum: string
  report: WingsSideTourMediaAuditReport
}

type EvidenceArtifactKind = SignedEvidenceArtifact<
  'manual-review' | 'ocr-attestation' | 'release-envelope' | 'rights-approval',
  unknown
>['artifactType']

type ProtectedEvidenceKeyPolicy = {
  keys: ReadonlyMap<string, KeyObject>
  sha256: string
}

type VerifiedSignatureRecord = {
  digest: string
  purpose: EvidenceArtifactKind
  signature: EvidenceArtifactSignature
}

type AuthenticatedEvidenceRecord = {
  envelopeSha256: string
  keyPolicySha256: string
  releaseArtifactSha256: string
  releaseEvidenceChecksum: string
  signatures: readonly VerifiedSignatureRecord[]
  sourceArtifactSha256: string
}

const authenticatedEvidenceResults = new WeakMap<
  WingsSideTourMediaEvidenceResult,
  AuthenticatedEvidenceRecord
>()

const hashBytes = (bytes: Uint8Array): string =>
  createHash('sha256').update(bytes).digest('hex')

const isTimestamp = (value: string): boolean =>
  isoTimestampPattern.test(value) && !Number.isNaN(Date.parse(value))

const requiredText = (value: unknown, label: string): string => {
  const normalized = typeof value === 'string' ? value.trim() : ''
  if (!normalized) throw new Error(`WingSide media evidence missing ${label}`)
  return normalized
}

const assertSha256 = (value: string, label: string): void => {
  if (!sha256Pattern.test(value)) {
    throw new Error(`WingSide media evidence ${label} must be lowercase SHA-256`)
  }
}

const assertTimestamp = (value: string, label: string): void => {
  if (!isTimestamp(value)) {
    throw new Error(`WingSide media evidence ${label} must be a UTC ISO timestamp`)
  }
}

const canonicalRootPrefix = (root: string): string =>
  root.endsWith(path.sep) ? root : `${root}${path.sep}`

const isWithinRoot = (root: string, candidate: string): boolean => {
  if (process.platform === 'win32') {
    return candidate.toLowerCase().startsWith(canonicalRootPrefix(root).toLowerCase())
  }
  return candidate.startsWith(canonicalRootPrefix(root))
}

type ApprovedReadHooks = {
  afterInitialRealpath?: (lexicalPath: string) => Promise<void>
}

const sameFileIdentity = (
  left: { dev: bigint; ino: bigint },
  right: { dev: bigint; ino: bigint },
): boolean => left.dev === right.dev && left.ino === right.ino

const readApprovedFile = async (
  approvedRoot: string,
  relativePath: string,
  hooks?: ApprovedReadHooks,
): Promise<{ absolutePath: string; bytes: Uint8Array; sha256: string }> => {
  const requested = requiredText(relativePath, 'relative asset path')
  if (path.isAbsolute(requested)) {
    throw new Error('WingSide media evidence asset path must be relative to approved root')
  }
  const lexicalPath = path.resolve(approvedRoot, requested)
  if (!isWithinRoot(approvedRoot, lexicalPath)) {
    throw new Error('WingSide media evidence asset path escapes approved root')
  }
  const initialRealpath = await realpath(lexicalPath)
  if (!isWithinRoot(approvedRoot, initialRealpath)) {
    throw new Error('WingSide media evidence symlink escapes approved root')
  }
  const initialStat = await stat(initialRealpath, { bigint: true })
  if (!initialStat.isFile()) {
    throw new Error('WingSide media evidence source must be a regular file')
  }
  await hooks?.afterInitialRealpath?.(lexicalPath)
  const handle = await open(initialRealpath, 'r')
  try {
    const openedStat = await handle.stat({ bigint: true })
    if (!openedStat.isFile() || !sameFileIdentity(initialStat, openedStat)) {
      throw new Error('WingSide media evidence source identity changed before verified read')
    }
    const bytes = await handle.readFile()
    const readStat = await handle.stat({ bigint: true })
    if (!sameFileIdentity(openedStat, readStat) || openedStat.size !== readStat.size) {
      throw new Error('WingSide media evidence source changed while it was being read')
    }
    const finalRealpath = await realpath(lexicalPath)
    if (
      !isWithinRoot(approvedRoot, finalRealpath) ||
      path.normalize(finalRealpath) !== path.normalize(initialRealpath)
    ) {
      throw new Error('WingSide media evidence source path changed during verified read')
    }
    const finalHandle = await open(finalRealpath, 'r')
    try {
      const finalStat = await finalHandle.stat({ bigint: true })
      if (!finalStat.isFile() || !sameFileIdentity(openedStat, finalStat)) {
        throw new Error('WingSide media evidence source identity changed during verified read')
      }
    } finally {
      await finalHandle.close()
    }
    return { absolutePath: finalRealpath, bytes, sha256: hashBytes(bytes) }
  } finally {
    await handle.close()
  }
}

const assertCanonicalManifest = (manifest: WingsSideTourMediaManifest): void => {
  const ids = manifest.tours.map(({ tourID }) => String(tourID).trim())
  const slugs = manifest.tours.map(({ tourSlug }) => tourSlug.trim())
  if (
    manifest.schemaVersion !== 1 ||
    manifest.tours.length !== wingsSideTourMediaExpectedTourCount ||
    ids.some((value) => !value) ||
    slugs.some((value) => !value) ||
    new Set(ids).size !== wingsSideTourMediaExpectedTourCount ||
    new Set(slugs).size !== wingsSideTourMediaExpectedTourCount
  ) {
    throw new Error('WingSide media evidence requires the exact unique 22-tour canonical manifest')
  }
}

const assertReleaseBinding = (
  actual: WingsSideTourMediaReleaseBinding,
  expected: WingsSideTourMediaTrustedExpectation,
  manifest?: WingsSideTourMediaManifest,
): void => {
  if (!releaseShaPattern.test(actual.releaseCommitSha)) {
    throw new Error('WingSide media evidence release commit must be lowercase 40-character SHA')
  }
  assertSha256(actual.source.sha256, 'source snapshot checksum')
  assertSha256(expected.manifestSha256, 'trusted manifest checksum')
  if (
    actual.siteCode.trim() === '' ||
    !['database-snapshot', 'source-inventory'].includes(actual.source.kind)
  ) {
    throw new Error('WingSide media evidence release site or source kind is invalid')
  }
  if (manifest && wingsSideTourMediaManifestChecksum(manifest) !== expected.manifestSha256) {
    throw new Error('WingSide media evidence canonical manifest substitution detected')
  }
  if (
    actual.releaseCommitSha !== expected.releaseCommitSha ||
    actual.siteCode !== expected.siteCode ||
    actual.source.kind !== expected.source.kind ||
    actual.source.sha256 !== expected.source.sha256
  ) {
    throw new Error('WingSide media evidence trusted release binding mismatch')
  }
}

const assertExactKeys = (value: object, expected: string[], label: string): void => {
  const actual = Object.keys(value).sort()
  const canonical = [...expected].sort()
  if (
    actual.length !== canonical.length ||
    actual.some((key, index) => key !== canonical[index])
  ) {
    throw new Error(`WingSide media evidence ${label} schema contains missing or unknown fields`)
  }
}

const loadProtectedEvidenceKeyPolicy = (): ProtectedEvidenceKeyPolicy => {
  const rawJson = process.env[wingsSideTourMediaPublicKeysJsonEnv]
  const protectedSha = process.env[wingsSideTourMediaPublicKeysShaEnv]?.trim()
  if (!rawJson) {
    throw new Error(`Protected environment ${wingsSideTourMediaPublicKeysJsonEnv} is required`)
  }
  if (!protectedSha) {
    throw new Error(`Protected environment ${wingsSideTourMediaPublicKeysShaEnv} is required`)
  }
  assertSha256(protectedSha, 'protected evidence public-key policy checksum')
  if (hashBytes(Buffer.from(rawJson, 'utf8')) !== protectedSha) {
    throw new Error('WingSide media evidence protected public-key policy checksum mismatch')
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(rawJson)
  } catch {
    throw new Error('WingSide media evidence protected public-key policy must be valid JSON')
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('WingSide media evidence protected public-key policy must be an object')
  }
  const entries = Object.entries(parsed)
  if (entries.length === 0) {
    throw new Error('WingSide media evidence protected public-key policy cannot be empty')
  }
  const keys = new Map<string, KeyObject>()
  for (const [rawSignerID, encodedKey] of entries) {
    const signerID = requiredText(rawSignerID, 'public-key signer ID')
    if (
      signerID !== rawSignerID ||
      typeof encodedKey !== 'string' ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(encodedKey) ||
      encodedKey.length < 16
    ) {
      throw new Error('WingSide media evidence protected public-key policy entry is invalid')
    }
    try {
      const key = createPublicKey({
        format: 'der',
        key: Buffer.from(encodedKey, 'base64'),
        type: 'spki',
      })
      if (key.asymmetricKeyType !== 'ed25519') {
        throw new Error('not Ed25519')
      }
      keys.set(signerID, key)
    } catch {
      throw new Error(
        `WingSide media evidence protected public key for ${signerID} is not valid Ed25519 SPKI`,
      )
    }
  }
  return { keys, sha256: protectedSha }
}

export const wingsSideTourMediaEvidenceSigningDigest = (
  artifactType: SignedEvidenceArtifact<
    'manual-review' | 'ocr-attestation' | 'release-envelope' | 'rights-approval',
    unknown
  >['artifactType'],
  payload: unknown,
): string =>
  wingsSideTourMediaAuditChecksum({
    artifactType,
    payload,
    schemaVersion: 1,
  })

export const wingsSideTourMediaSourceInventoryChecksum = (
  tours: LocalTourMediaEvidenceSource[],
): string =>
  wingsSideTourMediaAuditChecksum(
    [...tours].sort(
      (left, right) =>
        left.tourSlug.localeCompare(right.tourSlug) ||
        String(left.tourID).localeCompare(String(right.tourID)),
    ),
  )

const assertSignature = ({
  artifactType,
  expectedSignerID,
  keyPolicy,
  payload,
  records,
  signature,
}: {
  artifactType: EvidenceArtifactKind
  expectedSignerID: string
  keyPolicy: ProtectedEvidenceKeyPolicy
  payload: unknown
  records: VerifiedSignatureRecord[]
  signature: EvidenceArtifactSignature
}): void => {
  assertExactKeys(signature, ['algorithm', 'signerID', 'valueBase64'], `${artifactType} signature`)
  if (
    signature.algorithm !== 'ed25519' ||
    signature.signerID !== expectedSignerID ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(signature.valueBase64) ||
    signature.valueBase64.length < 16
  ) {
    throw new Error(`WingSide media evidence ${artifactType} signature policy mismatch`)
  }
  const digest = wingsSideTourMediaEvidenceSigningDigest(artifactType, payload)
  const key = keyPolicy.keys.get(signature.signerID)
  let valid = false
  try {
    valid =
      key !== undefined &&
      verify(
        null,
        Buffer.from(digest, 'utf8'),
        key,
        Buffer.from(signature.valueBase64, 'base64'),
      )
  } catch {
    valid = false
  }
  if (!valid) {
    throw new Error(`WingSide media evidence ${artifactType} signature verification failed`)
  }
  records.push({
    digest,
    purpose: artifactType,
    signature: { ...signature },
  })
}

const parseSignedArtifact = <
  Kind extends 'manual-review' | 'ocr-attestation' | 'rights-approval',
  Payload,
>(
  bytes: Uint8Array,
  expectedType: Kind,
): SignedEvidenceArtifact<Kind, Payload> => {
  let parsed: unknown
  try {
    parsed = JSON.parse(Buffer.from(bytes).toString('utf8'))
  } catch {
    throw new Error(`WingSide media evidence ${expectedType} artifact is not valid JSON`)
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`WingSide media evidence ${expectedType} artifact must be an object`)
  }
  assertExactKeys(
    parsed,
    ['artifactType', 'payload', 'schemaVersion', 'signature'],
    `${expectedType} artifact`,
  )
  const artifact = parsed as SignedEvidenceArtifact<Kind, Payload>
  if (
    artifact.schemaVersion !== 1 ||
    artifact.artifactType !== expectedType ||
    !artifact.payload ||
    typeof artifact.payload !== 'object' ||
    Array.isArray(artifact.payload) ||
    !artifact.signature ||
    typeof artifact.signature !== 'object'
  ) {
    throw new Error(`WingSide media evidence ${expectedType} artifact schema is invalid`)
  }
  return artifact
}

const assertProvenance = (evidence: MediaProvenanceEvidence): void => {
  requiredText(evidence.owner, 'provenance owner')
  requiredText(evidence.sourceReference, 'provenance source reference')
  requiredText(evidence.licenseReference, 'license reference')
  requiredText(evidence.approvedBy, 'provenance approver')
  requiredText(evidence.artifactRelativePath, 'rights artifact path')
  assertSha256(evidence.artifactSha256, 'rights artifact checksum')
  assertTimestamp(evidence.approvedAt, 'provenance approval time')
  if (!['licensed', 'owned'].includes(evidence.licenseType) || evidence.publicUseApproved !== true) {
    throw new Error('WingSide media evidence requires an approved owned or licensed asset')
  }
}

const assertManualReview = (evidence: ManualReviewerEvidence): void => {
  requiredText(evidence.reviewerID, 'manual reviewer ID')
  requiredText(evidence.artifactRelativePath, 'manual review artifact path')
  assertTimestamp(evidence.reviewedAt, 'manual review time')
  assertSha256(evidence.artifactSha256, 'manual review artifact checksum')
  if (evidence.state !== 'passed') {
    throw new Error('WingSide media evidence requires passed manual reviewer evidence')
  }
}

const produceMedia = async (
  source: LocalMediaEvidenceSource,
  approvedRoot: string,
  policy: ReleaseEnvelopeMediaPolicy,
  keyPolicy: ProtectedEvidenceKeyPolicy,
  signatureRecords: VerifiedSignatureRecord[],
  hooks?: ApprovedReadHooks,
): Promise<NormalizedMediaAuditInput> => {
  assertProvenance(source.provenance)
  assertManualReview(source.manualReview)
  assertSha256(source.ocrArtifactSha256, 'OCR artifact checksum')
  requiredText(source.ocrArtifactRelativePath, 'OCR artifact path')
  const mediaID = String(source.id)
  if (policy.mediaID !== mediaID) {
    throw new Error('WingSide media evidence media policy identity mismatch')
  }
  const asset = await readApprovedFile(approvedRoot, source.relativePath, hooks)
  if (asset.sha256 !== policy.assetSha256) {
    throw new Error('WingSide media evidence asset bytes do not match protected envelope')
  }
  const reviewArtifact = await readApprovedFile(
    approvedRoot,
    source.manualReview.artifactRelativePath,
    hooks,
  )
  if (
    source.manualReview.artifactSha256 !== reviewArtifact.sha256 ||
    policy.manualReviewArtifactSha256 !== reviewArtifact.sha256
  ) {
    throw new Error('WingSide media evidence manual review artifact byte checksum mismatch')
  }
  const signedReview = parseSignedArtifact<'manual-review', ManualReviewArtifactPayload>(
    reviewArtifact.bytes,
    'manual-review',
  )
  assertExactKeys(
    signedReview.payload,
    [
      'assetSha256',
      'mediaID',
      ...(Object.hasOwn(signedReview.payload, 'reason') ? ['reason'] : []),
      'reviewedAt',
      'reviewerID',
      'state',
    ],
    'manual review payload',
  )
  if (
    signedReview.payload.assetSha256 !== asset.sha256 ||
    signedReview.payload.mediaID !== mediaID ||
    signedReview.payload.reviewerID !== policy.reviewerID ||
    signedReview.payload.reviewerID !== source.manualReview.reviewerID ||
    signedReview.payload.reviewedAt !== source.manualReview.reviewedAt ||
    signedReview.payload.state !== 'passed' ||
    (signedReview.payload.reason ?? null) !== (source.manualReview.reason ?? null)
  ) {
    throw new Error('WingSide media evidence manual review is not bound to the protected asset')
  }
  assertTimestamp(signedReview.payload.reviewedAt, 'signed manual review time')
  assertSignature({
    artifactType: 'manual-review',
    expectedSignerID: policy.reviewerID,
    keyPolicy,
    payload: signedReview.payload,
    records: signatureRecords,
    signature: signedReview.signature,
  })

  const rightsArtifact = await readApprovedFile(
    approvedRoot,
    source.provenance.artifactRelativePath,
    hooks,
  )
  if (
    source.provenance.artifactSha256 !== rightsArtifact.sha256 ||
    policy.rightsArtifactSha256 !== rightsArtifact.sha256
  ) {
    throw new Error('WingSide media evidence rights artifact byte checksum mismatch')
  }
  const signedRights = parseSignedArtifact<'rights-approval', RightsApprovalArtifactPayload>(
    rightsArtifact.bytes,
    'rights-approval',
  )
  assertExactKeys(
    signedRights.payload,
    [
      'approvedAt',
      'approvedBy',
      'assetSha256',
      'licenseReference',
      'licenseType',
      'mediaID',
      'owner',
      'publicUseApproved',
      'sourceReference',
    ],
    'rights approval payload',
  )
  const expectedRightsPayload: RightsApprovalArtifactPayload = {
    approvedAt: source.provenance.approvedAt,
    approvedBy: source.provenance.approvedBy,
    assetSha256: asset.sha256,
    licenseReference: source.provenance.licenseReference,
    licenseType: source.provenance.licenseType,
    mediaID,
    owner: source.provenance.owner,
    publicUseApproved: source.provenance.publicUseApproved,
    sourceReference: source.provenance.sourceReference,
  }
  if (
    policy.rightsApproverID !== signedRights.payload.approvedBy ||
    wingsSideTourMediaAuditChecksum(signedRights.payload) !==
      wingsSideTourMediaAuditChecksum(expectedRightsPayload)
  ) {
    throw new Error('WingSide media evidence rights approval is not bound to the protected asset')
  }
  assertSignature({
    artifactType: 'rights-approval',
    expectedSignerID: policy.rightsApproverID,
    keyPolicy,
    payload: signedRights.payload,
    records: signatureRecords,
    signature: signedRights.signature,
  })

  const kind = source.kind ?? 'image'
  if (!['image', 'video'].includes(kind)) {
    throw new Error('WingSide media evidence kind must be image or video')
  }
  const frameSources = kind === 'video' ? source.videoFrames ?? [] : []
  if (kind === 'video' && frameSources.length === 0) {
    throw new Error('WingSide media evidence requires local sampled frames for video')
  }
  const frames = await Promise.all(
    frameSources.map(async (frame, index) => {
      if (
        !['end', 'middle', 'scene', 'start'].includes(frame.position) ||
        (frame.timestampSeconds !== null &&
          frame.timestampSeconds !== undefined &&
          (!Number.isFinite(frame.timestampSeconds) || frame.timestampSeconds < 0))
      ) {
        throw new Error('WingSide media evidence video frame position or timestamp is invalid')
      }
      const file = await readApprovedFile(approvedRoot, frame.relativePath, hooks)
      return {
        bytes: file.bytes,
        label: requiredText(frame.label ?? `scene-${index + 1}`, 'video frame label'),
        position: frame.position,
        sha256: file.sha256,
        ...(frame.timestampSeconds === null || frame.timestampSeconds === undefined
          ? {}
          : { timestampSeconds: frame.timestampSeconds }),
      }
    }),
  )
  const ocrArtifactFile = await readApprovedFile(
    approvedRoot,
    source.ocrArtifactRelativePath,
    hooks,
  )
  if (
    source.ocrArtifactSha256 !== ocrArtifactFile.sha256 ||
    policy.ocrArtifactSha256 !== ocrArtifactFile.sha256
  ) {
    throw new Error('WingSide media evidence OCR artifact byte checksum mismatch')
  }
  const signedOcr = parseSignedArtifact<'ocr-attestation', OcrAttestation>(
    ocrArtifactFile.bytes,
    'ocr-attestation',
  )
  const ocr = signedOcr.payload
  assertExactKeys(
    ocr,
    [
      'assetSha256',
      'attesterID',
      'engine',
      'engineVersion',
      'frameExtractions',
      'frameHashes',
      'kind',
      'mediaID',
      'runAt',
      'state',
      ...(Object.hasOwn(ocr, 'text') ? ['text'] : []),
    ],
    'OCR attestation payload',
  )
  requiredText(ocr.engine, 'OCR engine')
  requiredText(ocr.engineVersion, 'OCR engine version')
  assertTimestamp(ocr.runAt, 'OCR run time')
  if (
    ocr.mediaID !== mediaID ||
    ocr.assetSha256 !== asset.sha256 ||
    ocr.kind !== kind ||
    ocr.attesterID !== policy.ocrAttesterID ||
    ocr.engine !== policy.ocrEngine ||
    ocr.engineVersion !== policy.ocrEngineVersion
  ) {
    throw new Error('WingSide media evidence OCR attestation policy or asset binding mismatch')
  }
  const expectedFrameHashes = (kind === 'image' ? [asset.sha256] : frames.map(({ sha256 }) => sha256))
    .sort()
  const actualFrameHashes = [...ocr.frameHashes].sort()
  actualFrameHashes.forEach((hash) => assertSha256(hash, 'OCR frame hash'))
  if (
    expectedFrameHashes.length !== actualFrameHashes.length ||
    expectedFrameHashes.some((hash, index) => hash !== actualFrameHashes[index])
  ) {
    throw new Error('WingSide media evidence OCR attestation is not bound to local frame bytes')
  }
  if (!['hit', 'pass'].includes(ocr.state)) {
    throw new Error('WingSide media evidence requires completed OCR evidence')
  }
  if (kind === 'image' && ocr.frameExtractions.length !== 0) {
    throw new Error('WingSide media evidence image OCR cannot claim video frame extraction')
  }
  if (kind === 'video') {
    const expectedExtractions = frames
      .map(({ bytes: _bytes, sha256, ...frame }) => ({
        frameSha256: sha256,
        label: frame.label,
        position: frame.position,
        sourceAssetSha256: asset.sha256,
        ...(frame.timestampSeconds === undefined
          ? {}
          : { timestampSeconds: frame.timestampSeconds }),
      }))
      .sort((left, right) => wingsSideTourMediaAuditChecksum(left).localeCompare(
        wingsSideTourMediaAuditChecksum(right),
      ))
    const actualExtractions = [...ocr.frameExtractions]
      .map((entry) => {
        assertExactKeys(
          entry,
          [
            'frameSha256',
            'label',
            'position',
            'sourceAssetSha256',
            ...(Object.hasOwn(entry, 'timestampSeconds') ? ['timestampSeconds'] : []),
          ],
          'video frame extraction',
        )
        return entry
      })
      .sort((left, right) => wingsSideTourMediaAuditChecksum(left).localeCompare(
        wingsSideTourMediaAuditChecksum(right),
      ))
    if (
      wingsSideTourMediaAuditChecksum(expectedExtractions) !==
      wingsSideTourMediaAuditChecksum(actualExtractions)
    ) {
      throw new Error('WingSide media evidence video frames are not bound to the source video')
    }
  }
  assertSignature({
    artifactType: 'ocr-attestation',
    expectedSignerID: policy.ocrAttesterID,
    keyPolicy,
    payload: ocr,
    records: signatureRecords,
    signature: signedOcr.signature,
  })

  return {
    checksum: asset.sha256,
    dimensions: source.dimensions,
    filename: path.basename(asset.absolutePath),
    id: source.id,
    kind,
    manualReview: {
      artifactSha256: reviewArtifact.sha256,
      reason: signedReview.payload.reason,
      reviewedAt: signedReview.payload.reviewedAt,
      reviewerID: signedReview.payload.reviewerID,
      state: signedReview.payload.state,
    },
    ocr: { ...ocr, frameHashes: actualFrameHashes },
    provenance: {
      approvedAt: signedRights.payload.approvedAt,
      approvedBy: signedRights.payload.approvedBy,
      licenseReference: signedRights.payload.licenseReference,
      licenseType: signedRights.payload.licenseType,
      owner: signedRights.payload.owner,
      publicUseApproved: signedRights.payload.publicUseApproved,
      sourceReference: signedRights.payload.sourceReference,
    },
    videoSamples: frames.map(({ bytes: _bytes, sha256, ...frame }) => ({
      ...frame,
      frameHash: sha256,
    })),
  }
}

const mapTour = async (
  tour: LocalTourMediaEvidenceSource,
  produce: (media: LocalMediaEvidenceSource) => Promise<NormalizedMediaAuditInput>,
): Promise<NormalizedTourMediaAuditInput> => {
  const map = (media: LocalMediaEvidenceSource) => produce(media)
  return {
    tourID: tour.tourID,
    tourSlug: tour.tourSlug,
    ...(tour.heroMedia ? { heroMedia: await map(tour.heroMedia) } : {}),
    ...(tour.gallery ? { gallery: await Promise.all(tour.gallery.map(map)) } : {}),
    ...(tour.itineraryDays
      ? {
          itineraryDays: await Promise.all(
            tour.itineraryDays.map(async (day) => ({
              ...(day.media ? { media: await map(day.media) } : {}),
              ...(day.gallery ? { gallery: await Promise.all(day.gallery.map(map)) } : {}),
            })),
          ),
        }
      : {}),
    ...(tour.marketCard?.thumbnailOverride
      ? { marketCard: { thumbnailOverride: await map(tour.marketCard.thumbnailOverride) } }
      : {}),
    ...(tour.meta?.image ? { meta: { image: await map(tour.meta.image) } } : {}),
    ...(tour.relatedCardMedia
      ? { relatedCardMedia: await Promise.all(tour.relatedCardMedia.map(map)) }
      : {}),
    ...(tour.routeViz?.mapImage
      ? { routeViz: { mapImage: await map(tour.routeViz.mapImage) } }
      : {}),
  }
}

export const resolveProtectedWingsSideManifestSha = (
  environment: Readonly<Record<string, string | undefined>>,
  requestedSha?: string,
): string => {
  const protectedSha = environment[wingsSideTourMediaManifestShaEnv]?.trim()
  if (!protectedSha) {
    throw new Error(`Protected environment ${wingsSideTourMediaManifestShaEnv} is required`)
  }
  assertSha256(protectedSha, 'protected manifest checksum')
  if (requestedSha && requestedSha.trim() !== protectedSha) {
    throw new Error('WingSide media evidence protected manifest checksum conflict')
  }
  return protectedSha
}

export const parseWingsSideTourMediaEvidenceCliArguments = (
  args: string[],
): {
  approvedRoot: string
  inputRelativePath: string
  releaseGate: boolean
  requestedEnvelopeSha?: string
  requestedManifestSha?: string
} => {
  const allowedValueFlags = new Set([
    '--approved-root',
    '--envelope-sha256',
    '--manifest-sha256',
  ])
  const valueFlags = new Map<string, string>()
  const positional: string[] = []
  let releaseGate = false
  for (const entry of args) {
    if (entry === '--release-gate') {
      if (releaseGate) throw new Error('Duplicate CLI flag: --release-gate')
      releaseGate = true
      continue
    }
    if (entry.startsWith('--')) {
      const separator = entry.indexOf('=')
      const name = separator === -1 ? entry : entry.slice(0, separator)
      if (!allowedValueFlags.has(name) || separator === -1) {
        throw new Error(`Unknown or malformed CLI flag: ${entry}`)
      }
      if (valueFlags.has(name)) throw new Error(`Duplicate CLI flag: ${name}`)
      const value = entry.slice(separator + 1).trim()
      if (!value) throw new Error(`CLI flag ${name} requires a value`)
      valueFlags.set(name, value)
      continue
    }
    positional.push(entry)
  }
  const inputRelativePath = positional[0]
  const approvedRoot = valueFlags.get('--approved-root')
  if (positional.length !== 1 || !inputRelativePath || !approvedRoot) {
    throw new Error(
      'Usage: <source-relative.json> --approved-root=<path> [--manifest-sha256=<protected-echo>] [--envelope-sha256=<protected-echo>] [--release-gate]',
    )
  }
  if (path.isAbsolute(inputRelativePath)) {
    throw new Error('Evidence source JSON path must be relative to approved root')
  }
  return {
    approvedRoot,
    inputRelativePath,
    releaseGate,
    ...(valueFlags.has('--envelope-sha256')
      ? { requestedEnvelopeSha: valueFlags.get('--envelope-sha256') }
      : {}),
    ...(valueFlags.has('--manifest-sha256')
      ? { requestedManifestSha: valueFlags.get('--manifest-sha256') }
      : {}),
  }
}

export const resolveProtectedWingsSideEnvelopeSha = (
  environment: Readonly<Record<string, string | undefined>>,
  requestedSha?: string,
): string => {
  const protectedSha = environment[wingsSideTourMediaEnvelopeShaEnv]?.trim()
  if (!protectedSha) {
    throw new Error(`Protected environment ${wingsSideTourMediaEnvelopeShaEnv} is required`)
  }
  assertSha256(protectedSha, 'protected release envelope checksum')
  if (requestedSha !== undefined && requestedSha.trim() !== protectedSha) {
    throw new Error('WingSide media evidence protected release envelope checksum conflict')
  }
  return protectedSha
}

const verifyReleaseEnvelope = async ({
  approvedRoot,
  envelope,
  hooks,
  keyPolicy,
  signatureRecords,
  trusted,
}: {
  approvedRoot: string
  envelope: WingsSideTourMediaReleaseEnvelope
  hooks?: ApprovedReadHooks
  keyPolicy: ProtectedEvidenceKeyPolicy
  signatureRecords: VerifiedSignatureRecord[]
  trusted: WingsSideTourMediaTrustedExpectation
}): Promise<{
  policies: Map<string, ReleaseEnvelopeMediaPolicy>
  releaseArtifactSha256: string
  sourceArtifactSha256: string
}> => {
  assertExactKeys(
    envelope,
    ['artifactType', 'payload', 'schemaVersion', 'signature'],
    'release envelope',
  )
  if (
    envelope.schemaVersion !== 1 ||
    envelope.artifactType !== 'release-envelope' ||
    !envelope.payload ||
    typeof envelope.payload !== 'object'
  ) {
    throw new Error('WingSide media evidence release envelope schema is invalid')
  }
  assertExactKeys(
    envelope.payload,
    [
      'manifestSha256',
      'mediaPolicies',
      'releaseArtifact',
      'releaseBinding',
      'sourceArtifact',
      'tourInventorySha256',
    ],
    'release envelope payload',
  )
  assertExactKeys(
    envelope.payload.releaseBinding,
    ['releaseCommitSha', 'siteCode', 'source'],
    'release binding',
  )
  assertExactKeys(
    envelope.payload.releaseBinding.source,
    ['kind', 'sha256'],
    'release source binding',
  )
  if (wingsSideTourMediaAuditChecksum(envelope) !== trusted.envelopeSha256) {
    throw new Error('WingSide media evidence protected release envelope substitution detected')
  }
  if (envelope.signature.signerID !== trusted.envelopeSignerID) {
    throw new Error('WingSide media evidence release envelope signer mismatch')
  }
  assertSignature({
    artifactType: 'release-envelope',
    expectedSignerID: trusted.envelopeSignerID,
    keyPolicy,
    payload: envelope.payload,
    records: signatureRecords,
    signature: envelope.signature,
  })
  if (envelope.payload.manifestSha256 !== trusted.manifestSha256) {
    throw new Error('WingSide media evidence envelope manifest binding mismatch')
  }
  assertSha256(envelope.payload.tourInventorySha256, 'protected tour inventory checksum')
  assertReleaseBinding(envelope.payload.releaseBinding, trusted)
  for (const artifact of [envelope.payload.sourceArtifact, envelope.payload.releaseArtifact]) {
    assertExactKeys(artifact, ['relativePath', 'sha256'], 'release artifact binding')
    requiredText(artifact.relativePath, 'release artifact path')
    assertSha256(artifact.sha256, 'release artifact checksum')
  }
  if (!Array.isArray(envelope.payload.mediaPolicies) || envelope.payload.mediaPolicies.length === 0) {
    throw new Error('WingSide media evidence release envelope requires media policies')
  }
  const policies = new Map<string, ReleaseEnvelopeMediaPolicy>()
  for (const policy of envelope.payload.mediaPolicies) {
    assertExactKeys(
      policy,
      [
        'assetSha256',
        'manualReviewArtifactSha256',
        'mediaID',
        'ocrArtifactSha256',
        'ocrAttesterID',
        'ocrEngine',
        'ocrEngineVersion',
        'reviewerID',
        'rightsApproverID',
        'rightsArtifactSha256',
      ],
      'release envelope media policy',
    )
    const mediaID = requiredText(policy.mediaID, 'policy media ID')
    if (policies.has(mediaID)) {
      throw new Error(`WingSide media evidence duplicate release policy for media ${mediaID}`)
    }
    for (const [label, digest] of [
      ['asset', policy.assetSha256],
      ['manual review artifact', policy.manualReviewArtifactSha256],
      ['rights artifact', policy.rightsArtifactSha256],
      ['OCR artifact', policy.ocrArtifactSha256],
    ] as const) {
      assertSha256(digest, `${label} policy checksum`)
    }
    requiredText(policy.reviewerID, 'policy reviewer ID')
    requiredText(policy.rightsApproverID, 'policy rights approver ID')
    requiredText(policy.ocrAttesterID, 'policy OCR attester ID')
    requiredText(policy.ocrEngine, 'policy OCR engine')
    requiredText(policy.ocrEngineVersion, 'policy OCR engine version')
    policies.set(mediaID, policy)
  }
  const sourceArtifact = await readApprovedFile(
    approvedRoot,
    envelope.payload.sourceArtifact.relativePath,
    hooks,
  )
  const releaseArtifact = await readApprovedFile(
    approvedRoot,
    envelope.payload.releaseArtifact.relativePath,
    hooks,
  )
  if (sourceArtifact.sha256 !== envelope.payload.sourceArtifact.sha256) {
    throw new Error('WingSide media evidence source snapshot actual byte checksum mismatch')
  }
  if (sourceArtifact.sha256 !== envelope.payload.releaseBinding.source.sha256) {
    throw new Error('WingSide media evidence source snapshot is not bound to release source')
  }
  if (releaseArtifact.sha256 !== envelope.payload.releaseArtifact.sha256) {
    throw new Error('WingSide media evidence release artifact actual byte checksum mismatch')
  }
  let releaseDescriptor: unknown
  try {
    releaseDescriptor = JSON.parse(Buffer.from(releaseArtifact.bytes).toString('utf8'))
  } catch {
    throw new Error('WingSide media evidence release artifact must be valid JSON')
  }
  if (
    !releaseDescriptor ||
    typeof releaseDescriptor !== 'object' ||
    Array.isArray(releaseDescriptor)
  ) {
    throw new Error('WingSide media evidence release artifact schema is invalid')
  }
  assertExactKeys(releaseDescriptor, ['releaseCommitSha', 'siteCode'], 'release artifact')
  const descriptor = releaseDescriptor as { releaseCommitSha: unknown; siteCode: unknown }
  if (
    descriptor.releaseCommitSha !== envelope.payload.releaseBinding.releaseCommitSha ||
    descriptor.siteCode !== envelope.payload.releaseBinding.siteCode
  ) {
    throw new Error('WingSide media evidence release artifact binding mismatch')
  }
  return {
    policies,
    releaseArtifactSha256: releaseArtifact.sha256,
    sourceArtifactSha256: sourceArtifact.sha256,
  }
}

export const produceWingsSideTourMediaEvidence = async ({
  approvedRoot,
  manifest,
  readHooks,
  releaseEnvelope,
  releaseBinding,
  tours,
  trusted,
}: {
  approvedRoot: string
  manifest: WingsSideTourMediaManifest
  readHooks?: ApprovedReadHooks
  releaseEnvelope: WingsSideTourMediaReleaseEnvelope
  releaseBinding: WingsSideTourMediaReleaseBinding
  tours: LocalTourMediaEvidenceSource[]
  trusted: WingsSideTourMediaTrustedExpectation
}): Promise<WingsSideTourMediaEvidenceResult> => {
  const keyPolicy = loadProtectedEvidenceKeyPolicy()
  const signatureRecords: VerifiedSignatureRecord[] = []
  const root = await realpath(path.resolve(approvedRoot))
  const rootBefore = await stat(root, { bigint: true })
  if (!rootBefore.isDirectory()) {
    throw new Error('WingSide media evidence approved root must be a directory')
  }
  assertCanonicalManifest(manifest)
  assertReleaseBinding(releaseBinding, trusted, manifest)
  if (
    releaseEnvelope.payload.tourInventorySha256 !==
    wingsSideTourMediaSourceInventoryChecksum(tours)
  ) {
    throw new Error('WingSide media evidence protected tour inventory binding mismatch')
  }
  const verifiedEnvelope = await verifyReleaseEnvelope({
    approvedRoot: root,
    envelope: releaseEnvelope,
    hooks: readHooks,
    keyPolicy,
    signatureRecords,
    trusted,
  })
  const producedMedia = new Map<string, Promise<NormalizedMediaAuditInput>>()
  const produceOnce = (media: LocalMediaEvidenceSource): Promise<NormalizedMediaAuditInput> => {
    const key = wingsSideTourMediaAuditChecksum(media)
    const existing = producedMedia.get(key)
    if (existing) return existing
    const policy = verifiedEnvelope.policies.get(String(media.id))
    if (!policy) {
      throw new Error(`WingSide media evidence missing protected policy for media ${media.id}`)
    }
    const pending = produceMedia(
      media,
      root,
      policy,
      keyPolicy,
      signatureRecords,
      readHooks,
    )
    producedMedia.set(key, pending)
    return pending
  }
  const normalizedTours = (
    await Promise.all(tours.map((tour) => mapTour(tour, produceOnce)))
  ).sort(
    (left, right) =>
      left.tourSlug.localeCompare(right.tourSlug) ||
      String(left.tourID).localeCompare(String(right.tourID)),
  )
  const canonicalManifest: WingsSideTourMediaManifest = {
    schemaVersion: 1,
    tours: manifest.tours
      .map(({ tourID, tourSlug }) => ({ tourID, tourSlug: tourSlug.trim() }))
      .sort(
        (left, right) =>
          left.tourSlug.localeCompare(right.tourSlug) ||
          String(left.tourID).localeCompare(String(right.tourID)),
      ),
  }
  const body = {
    evidenceContract: 'local-byte-evidence-producer' as const,
    manifest: canonicalManifest,
    manifestSha256: trusted.manifestSha256,
    releaseEnvelope,
    releaseEnvelopeSha256: trusted.envelopeSha256,
    releaseBinding,
    schemaVersion: 1 as const,
    tours: normalizedTours,
  }
  const bundle = {
    aggregateChecksum: wingsSideTourMediaAuditChecksum(body),
    ...body,
  }
  const releaseEvidenceBinding: NonNullable<
    WingsSideTourMediaAuditReport['releaseEvidenceBinding']
  > = {
    bundleAggregateChecksum: bundle.aggregateChecksum,
    envelopeSha256: trusted.envelopeSha256,
    releaseArtifactSha256: verifiedEnvelope.releaseArtifactSha256,
    releaseCommitSha: releaseBinding.releaseCommitSha,
    siteCode: releaseBinding.siteCode,
    sourceArtifactSha256: verifiedEnvelope.sourceArtifactSha256,
  }
  const report = buildWingsSideTourMediaAuditReport({
    manifest: canonicalManifest,
    releaseEvidenceBinding,
    tours: normalizedTours,
  })
  const rootAfter = await stat(root, { bigint: true })
  if (!rootAfter.isDirectory() || !sameFileIdentity(rootBefore, rootAfter)) {
    throw new Error('WingSide media evidence approved root identity changed during production')
  }
  if (verifiedEnvelope.policies.size !== report.assets.length) {
    throw new Error('WingSide media evidence protected media policy coverage mismatch')
  }
  const releaseEvidenceChecksum = wingsSideTourMediaAuditChecksum({
    bundleAggregateChecksum: bundle.aggregateChecksum,
    envelopeSha256: trusted.envelopeSha256,
    reportAggregateChecksum: report.aggregateChecksum,
    releaseArtifactSha256: verifiedEnvelope.releaseArtifactSha256,
    sourceArtifactSha256: verifiedEnvelope.sourceArtifactSha256,
  })
  const result = {
    bundle,
    releaseEvidenceChecksum,
    report,
  } as WingsSideTourMediaEvidenceResult
  Object.defineProperty(result, verifiedEvidenceBrand, {
    configurable: false,
    enumerable: false,
    value: true,
    writable: false,
  })
  authenticatedEvidenceResults.set(result, {
    envelopeSha256: trusted.envelopeSha256,
    keyPolicySha256: keyPolicy.sha256,
    releaseArtifactSha256: verifiedEnvelope.releaseArtifactSha256,
    releaseEvidenceChecksum,
    signatures: signatureRecords.map((record) => ({
      ...record,
      signature: { ...record.signature },
    })),
    sourceArtifactSha256: verifiedEnvelope.sourceArtifactSha256,
  })
  return result
}

export const assertWingsSideTourMediaEvidenceReleaseGate = (
  result: WingsSideTourMediaEvidenceResult,
  expectedEnvelopeSha256: string,
): void => {
  const authenticated = authenticatedEvidenceResults.get(result)
  if (!authenticated) {
    throw new Error(
      'WingSide media evidence release result was not created by the authenticated producer',
    )
  }
  assertSha256(expectedEnvelopeSha256, 'expected release envelope checksum')
  const keyPolicy = loadProtectedEvidenceKeyPolicy()
  if (
    keyPolicy.sha256 !== authenticated.keyPolicySha256 ||
    expectedEnvelopeSha256 !== authenticated.envelopeSha256
  ) {
    throw new Error('WingSide media evidence authenticated trust policy binding mismatch')
  }
  if (
    authenticated.signatures.length !== 1 + result.report.assets.length * 3 ||
    authenticated.signatures.some(({ digest, signature }) => {
      const key = keyPolicy.keys.get(signature.signerID)
      try {
        return (
          key === undefined ||
          !verify(
            null,
            Buffer.from(digest, 'utf8'),
            key,
            Buffer.from(signature.valueBase64, 'base64'),
          )
        )
      } catch {
        return true
      }
    })
  ) {
    throw new Error('WingSide media evidence authenticated signature proof mismatch')
  }
  const { aggregateChecksum: _bundleChecksum, ...bundleBody } = result.bundle
  if (
    wingsSideTourMediaAuditChecksum(bundleBody) !== result.bundle.aggregateChecksum ||
    wingsSideTourMediaAuditChecksum(result.bundle.releaseEnvelope) !== expectedEnvelopeSha256 ||
    result.bundle.releaseEnvelopeSha256 !== expectedEnvelopeSha256
  ) {
    throw new Error('WingSide media evidence bundle or protected envelope integrity mismatch')
  }
  const binding = result.report.releaseEvidenceBinding
  if (
    !binding ||
    binding.bundleAggregateChecksum !== result.bundle.aggregateChecksum ||
    binding.envelopeSha256 !== expectedEnvelopeSha256 ||
    binding.releaseCommitSha !== result.bundle.releaseBinding.releaseCommitSha ||
    binding.siteCode !== result.bundle.releaseBinding.siteCode ||
    binding.sourceArtifactSha256 !== result.bundle.releaseEnvelope.payload.sourceArtifact.sha256 ||
    binding.sourceArtifactSha256 !== authenticated.sourceArtifactSha256 ||
    binding.releaseArtifactSha256 !== result.bundle.releaseEnvelope.payload.releaseArtifact.sha256 ||
    binding.releaseArtifactSha256 !== authenticated.releaseArtifactSha256
  ) {
    throw new Error('WingSide media evidence combined release binding mismatch')
  }
  assertWingsSideTourMediaAuditConsistency(result.report, result.bundle.manifest, binding)
  const expectedCombinedChecksum = wingsSideTourMediaAuditChecksum({
    bundleAggregateChecksum: result.bundle.aggregateChecksum,
    envelopeSha256: expectedEnvelopeSha256,
    reportAggregateChecksum: result.report.aggregateChecksum,
    releaseArtifactSha256: binding.releaseArtifactSha256,
    sourceArtifactSha256: binding.sourceArtifactSha256,
  })
  if (
    result.releaseEvidenceChecksum !== expectedCombinedChecksum ||
    result.releaseEvidenceChecksum !== authenticated.releaseEvidenceChecksum
  ) {
    throw new Error('WingSide media evidence combined release checksum mismatch')
  }
}
