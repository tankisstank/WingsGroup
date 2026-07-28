import { createHash } from 'node:crypto'
import { readFile, realpath, stat } from 'node:fs/promises'
import path from 'node:path'

import {
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
  manifestSha256: string
}

export type MediaProvenanceEvidence = {
  approvedAt: string
  approvedBy: string
  licenseReference: string
  licenseType: 'licensed' | 'owned'
  owner: string
  publicUseApproved: boolean
  sourceReference: string
}

export type ManualReviewerEvidence = {
  artifactRelativePath: string
  artifactSha256?: string
  reason?: null | string
  reviewedAt: string
  reviewerID: string
  state: ManualReviewState
}

export type OcrAttestation = {
  engine: string
  engineVersion: string
  frameHashes: string[]
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

export type OcrEvidenceAdapter = {
  scan(input: {
    asset: { bytes: Uint8Array; sha256: string }
    frames: Array<{
      bytes: Uint8Array
      label: string
      position: LocalVideoFrameSource['position']
      sha256: string
      timestampSeconds?: number
    }>
    kind: MediaKind
    mediaID: string
  }): Promise<OcrAttestation>
}

export type WingsSideTourMediaEvidenceBundle = {
  aggregateChecksum: string
  evidenceContract: 'local-byte-evidence-producer'
  manifest: WingsSideTourMediaManifest
  manifestSha256: string
  releaseBinding: WingsSideTourMediaReleaseBinding
  schemaVersion: 1
  tours: NormalizedTourMediaAuditInput[]
}

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

const readApprovedFile = async (
  approvedRoot: string,
  relativePath: string,
): Promise<{ absolutePath: string; bytes: Uint8Array; sha256: string }> => {
  const requested = requiredText(relativePath, 'relative asset path')
  if (path.isAbsolute(requested)) {
    throw new Error('WingSide media evidence asset path must be relative to approved root')
  }
  const lexicalPath = path.resolve(approvedRoot, requested)
  if (!isWithinRoot(approvedRoot, lexicalPath)) {
    throw new Error('WingSide media evidence asset path escapes approved root')
  }
  const absolutePath = await realpath(lexicalPath)
  if (!isWithinRoot(approvedRoot, absolutePath)) {
    throw new Error('WingSide media evidence symlink escapes approved root')
  }
  if (!(await stat(absolutePath)).isFile()) {
    throw new Error('WingSide media evidence source must be a regular file')
  }
  const bytes = await readFile(absolutePath)
  return { absolutePath, bytes, sha256: hashBytes(bytes) }
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
  manifest: WingsSideTourMediaManifest,
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
  if (wingsSideTourMediaManifestChecksum(manifest) !== expected.manifestSha256) {
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

const assertProvenance = (evidence: MediaProvenanceEvidence): void => {
  requiredText(evidence.owner, 'provenance owner')
  requiredText(evidence.sourceReference, 'provenance source reference')
  requiredText(evidence.licenseReference, 'license reference')
  requiredText(evidence.approvedBy, 'provenance approver')
  assertTimestamp(evidence.approvedAt, 'provenance approval time')
  if (!['licensed', 'owned'].includes(evidence.licenseType) || evidence.publicUseApproved !== true) {
    throw new Error('WingSide media evidence requires an approved owned or licensed asset')
  }
}

const assertManualReview = (evidence: ManualReviewerEvidence): void => {
  requiredText(evidence.reviewerID, 'manual reviewer ID')
  requiredText(evidence.artifactRelativePath, 'manual review artifact path')
  assertTimestamp(evidence.reviewedAt, 'manual review time')
  if (evidence.artifactSha256) {
    assertSha256(evidence.artifactSha256, 'manual review artifact checksum')
  }
  if (evidence.state !== 'passed') {
    throw new Error('WingSide media evidence requires passed manual reviewer evidence')
  }
}

const produceMedia = async (
  source: LocalMediaEvidenceSource,
  approvedRoot: string,
  adapter: OcrEvidenceAdapter,
): Promise<NormalizedMediaAuditInput> => {
  assertProvenance(source.provenance)
  assertManualReview(source.manualReview)
  const asset = await readApprovedFile(approvedRoot, source.relativePath)
  const reviewArtifact = await readApprovedFile(
    approvedRoot,
    source.manualReview.artifactRelativePath,
  )
  if (
    source.manualReview.artifactSha256 &&
    source.manualReview.artifactSha256 !== reviewArtifact.sha256
  ) {
    throw new Error('WingSide media evidence manual review artifact byte checksum mismatch')
  }
  const kind = source.kind ?? 'image'
  const frameSources = kind === 'video' ? source.videoFrames ?? [] : []
  if (kind === 'video' && frameSources.length === 0) {
    throw new Error('WingSide media evidence requires local sampled frames for video')
  }
  const frames = await Promise.all(
    frameSources.map(async (frame, index) => {
      const file = await readApprovedFile(approvedRoot, frame.relativePath)
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
  const ocr = await adapter.scan({
    asset: { bytes: asset.bytes, sha256: asset.sha256 },
    frames,
    kind,
    mediaID: String(source.id),
  })
  requiredText(ocr.engine, 'OCR engine')
  requiredText(ocr.engineVersion, 'OCR engine version')
  assertTimestamp(ocr.runAt, 'OCR run time')
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

  return {
    checksum: asset.sha256,
    dimensions: source.dimensions,
    filename: path.basename(asset.absolutePath),
    id: source.id,
    kind,
    manualReview: {
      artifactSha256: reviewArtifact.sha256,
      reason: source.manualReview.reason,
      reviewedAt: source.manualReview.reviewedAt,
      reviewerID: source.manualReview.reviewerID,
      state: source.manualReview.state,
    },
    ocr: { ...ocr, frameHashes: actualFrameHashes },
    provenance: source.provenance,
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

export const produceWingsSideTourMediaEvidence = async ({
  approvedRoot,
  manifest,
  ocrAdapter,
  releaseBinding,
  tours,
  trusted,
}: {
  approvedRoot: string
  manifest: WingsSideTourMediaManifest
  ocrAdapter: OcrEvidenceAdapter
  releaseBinding: WingsSideTourMediaReleaseBinding
  tours: LocalTourMediaEvidenceSource[]
  trusted: WingsSideTourMediaTrustedExpectation
}): Promise<{ bundle: WingsSideTourMediaEvidenceBundle; report: WingsSideTourMediaAuditReport }> => {
  const root = await realpath(path.resolve(approvedRoot))
  if (!(await stat(root)).isDirectory()) {
    throw new Error('WingSide media evidence approved root must be a directory')
  }
  assertCanonicalManifest(manifest)
  assertReleaseBinding(releaseBinding, trusted, manifest)
  const producedMedia = new Map<string, Promise<NormalizedMediaAuditInput>>()
  const produceOnce = (media: LocalMediaEvidenceSource): Promise<NormalizedMediaAuditInput> => {
    const key = wingsSideTourMediaAuditChecksum(media)
    const existing = producedMedia.get(key)
    if (existing) return existing
    const pending = produceMedia(media, root, ocrAdapter)
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
    releaseBinding,
    schemaVersion: 1 as const,
    tours: normalizedTours,
  }
  const bundle = {
    aggregateChecksum: wingsSideTourMediaAuditChecksum(body),
    ...body,
  }
  return {
    bundle,
    report: buildWingsSideTourMediaAuditReport({
      manifest: canonicalManifest,
      tours: normalizedTours,
    }),
  }
}
