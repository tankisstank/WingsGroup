import { createHash } from 'node:crypto'

export const wingsSideTourMediaExpectedTourCount = 22
export type MediaKind = 'image' | 'video'
export type OcrState = 'hit' | 'pass' | 'unknown' | 'unscanned'
export type ManualReviewState = 'failed' | 'not-reviewed' | 'passed' | 'required'

export type WingsSideTourMediaManifest = {
  schemaVersion: 1
  tours: Array<{ tourID: number | string; tourSlug: string }>
}

export type VideoSampleInput = {
  frameHash?: null | string
  label?: null | string
  position: 'end' | 'middle' | 'scene' | 'start'
  timestampSeconds?: null | number
}

export type NormalizedMediaAuditInput = {
  checksum?: null | string
  dimensions?: null | { height: number; width: number }
  filename?: null | string
  id?: null | number | string
  kind?: MediaKind
  manualReview?: null | {
    reason?: null | string
    reviewedAt?: null | string
    reviewerID?: null | string
    state: ManualReviewState
  }
  ocr?: null | {
    engine?: null | string
    engineVersion?: null | string
    frameHashes?: null | string[]
    runAt?: null | string
    state: OcrState
    text?: null | string
  }
  url?: null | string
  videoSamples?: null | VideoSampleInput[]
}

export type NormalizedTourMediaAuditInput = {
  gallery?: null | NormalizedMediaAuditInput[]
  heroMedia?: null | NormalizedMediaAuditInput
  itineraryDays?: null | Array<{
    gallery?: null | NormalizedMediaAuditInput[]
    media?: null | NormalizedMediaAuditInput
  }>
  marketCard?: null | { thumbnailOverride?: null | NormalizedMediaAuditInput }
  meta?: null | { image?: null | NormalizedMediaAuditInput }
  relatedCardMedia?: null | NormalizedMediaAuditInput[]
  routeViz?: null | { mapImage?: null | NormalizedMediaAuditInput }
  tourID: number | string
  tourSlug: string
}

export type MediaAuditReference = {
  fieldPath: string
  tourID: string
  tourSlug: string
}

export type MediaAuditFindingCode =
  | 'conflicting-evidence'
  | 'duplicate-input-tour-id'
  | 'duplicate-input-tour-slug'
  | 'duplicate-manifest-tour-id'
  | 'duplicate-manifest-tour-slug'
  | 'extra-tour'
  | 'invalid-checksum'
  | 'invalid-manifest-cardinality'
  | 'invalid-manifest-identity'
  | 'manual-review-failed'
  | 'manual-review-required'
  | 'mismatched-tour-identity'
  | 'missing-checksum'
  | 'missing-evidence-metadata'
  | 'missing-id'
  | 'missing-source'
  | 'missing-tour'
  | 'no-media-references'
  | 'ocr-source-brand-hit'
  | 'ocr-unscanned'

export type MediaAuditFinding = {
  assetIdentity: string
  code: MediaAuditFindingCode
  message: string
  references: MediaAuditReference[]
}

export type VideoSampleEvidence = {
  frameHash: null | string
  label: string
  position: 'end' | 'middle' | 'scene' | 'start'
  timestampSeconds?: number
}

export type MediaAuditObservation = {
  checksum: null | string
  dimensions: null | { height: number; width: number }
  filename: null | string
  kind: MediaKind
  manualReview: {
    reason: null | string
    reviewedAt: null | string
    reviewerID: null | string
    state: ManualReviewState
  }
  ocr: {
    engine: null | string
    engineVersion: null | string
    frameHashes: string[]
    runAt: null | string
    state: OcrState
    text: null | string
  }
  reference: MediaAuditReference
  source: null | string
  url: null | string
  videoSamples: VideoSampleEvidence[]
}

export type MediaAuditAsset = {
  identity: string
  mediaID: null | string
  observations: MediaAuditObservation[]
  references: MediaAuditReference[]
}

export type WingsSideTourMediaAuditReport = {
  aggregateChecksum: string
  assets: MediaAuditAsset[]
  coverage: {
    expectedTourCount: number
    extraTourCount: number
    matchedTourCount: number
    mismatchedTourCount: number
    missingTourCount: number
    observedTourCount: number
  }
  evidenceContract: 'manifest-verification-only'
  findings: MediaAuditFinding[]
  manifestChecksum: string
  releaseGate: { blockingFindingCount: number; passed: boolean }
  schemaVersion: 2
}

type CollectedReference = {
  media: NormalizedMediaAuditInput
  reference: MediaAuditReference
}

const sha256Pattern = /^[a-f0-9]{64}$/
const isoTimestampPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/
const defaultSourceBrandPatterns = [/\bbest\s*price(?:\s+travel)?\b/i]

const text = (value: null | number | string | undefined): null | string => {
  if (value === null || value === undefined) return null
  const normalized = String(value).trim()
  return normalized || null
}

const isValidTimestamp = (value: null | string): value is string =>
  Boolean(value && isoTimestampPattern.test(value) && !Number.isNaN(Date.parse(value)))

const compareReferences = (left: MediaAuditReference, right: MediaAuditReference): number =>
  left.tourSlug.localeCompare(right.tourSlug) ||
  left.fieldPath.localeCompare(right.fieldPath) ||
  left.tourID.localeCompare(right.tourID)

const stableStringify = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}

export const wingsSideTourMediaAuditChecksum = (value: unknown): string =>
  createHash('sha256').update(stableStringify(value)).digest('hex')

export const wingsSideTourMediaManifestChecksum = (
  manifest: WingsSideTourMediaManifest,
): string =>
  wingsSideTourMediaAuditChecksum({
    schemaVersion: manifest.schemaVersion,
    tours: manifest.tours
      .map(({ tourID, tourSlug }) => ({ tourID: String(tourID), tourSlug: tourSlug.trim() }))
      .sort(
        (left, right) =>
          left.tourSlug.localeCompare(right.tourSlug) || left.tourID.localeCompare(right.tourID),
      ),
  })

const collectMedia = (
  target: CollectedReference[],
  tour: NormalizedTourMediaAuditInput,
  fieldPath: string,
  media: null | NormalizedMediaAuditInput | undefined,
): void => {
  if (!media) return
  target.push({
    media,
    reference: { fieldPath, tourID: String(tour.tourID), tourSlug: tour.tourSlug },
  })
}

export const collectWingsSideTourMediaReferences = (
  tours: NormalizedTourMediaAuditInput[],
): CollectedReference[] => {
  const collected: CollectedReference[] = []
  for (const tour of tours) {
    collectMedia(collected, tour, 'heroMedia', tour.heroMedia)
    tour.gallery?.forEach((media, index) =>
      collectMedia(collected, tour, `gallery[${index}]`, media),
    )
    tour.itineraryDays?.forEach((day, dayIndex) => {
      collectMedia(collected, tour, `itineraryDays[${dayIndex}].media`, day.media)
      day.gallery?.forEach((media, mediaIndex) =>
        collectMedia(
          collected,
          tour,
          `itineraryDays[${dayIndex}].gallery[${mediaIndex}]`,
          media,
        ),
      )
    })
    collectMedia(collected, tour, 'routeViz.mapImage', tour.routeViz?.mapImage)
    collectMedia(
      collected,
      tour,
      'marketCard.thumbnailOverride',
      tour.marketCard?.thumbnailOverride,
    )
    collectMedia(collected, tour, 'meta.image', tour.meta?.image)
    tour.relatedCardMedia?.forEach((media, index) =>
      collectMedia(collected, tour, `relatedCardMedia[${index}]`, media),
    )
  }
  return collected.sort((left, right) => compareReferences(left.reference, right.reference))
}

const defaultVideoSamples = (): VideoSampleEvidence[] => [
  { frameHash: null, label: 'first-frame', position: 'start' },
  { frameHash: null, label: 'middle-frame', position: 'middle' },
  { frameHash: null, label: 'last-frame', position: 'end' },
]

const normalizeVideoSamples = (media: NormalizedMediaAuditInput): VideoSampleEvidence[] => {
  if ((media.kind ?? 'image') !== 'video') return []
  if (!media.videoSamples?.length) return defaultVideoSamples()
  return media.videoSamples
    .map((sample, index) => ({
      frameHash: text(sample.frameHash),
      label: text(sample.label) ?? `scene-${index + 1}`,
      position: sample.position,
      ...(sample.timestampSeconds === null || sample.timestampSeconds === undefined
        ? {}
        : { timestampSeconds: sample.timestampSeconds }),
    }))
    .sort(
      (left, right) =>
        left.position.localeCompare(right.position) ||
        (left.timestampSeconds ?? -1) - (right.timestampSeconds ?? -1) ||
        left.label.localeCompare(right.label),
    )
}

const normalizeObservation = (
  media: NormalizedMediaAuditInput,
  reference: MediaAuditReference,
): MediaAuditObservation => ({
  checksum: text(media.checksum),
  dimensions: media.dimensions
    ? { height: media.dimensions.height, width: media.dimensions.width }
    : null,
  filename: text(media.filename),
  kind: media.kind ?? 'image',
  manualReview: {
    reason: text(media.manualReview?.reason),
    reviewedAt: text(media.manualReview?.reviewedAt),
    reviewerID: text(media.manualReview?.reviewerID),
    state: media.manualReview?.state ?? 'not-reviewed',
  },
  ocr: {
    engine: text(media.ocr?.engine),
    engineVersion: text(media.ocr?.engineVersion),
    frameHashes: [...(media.ocr?.frameHashes ?? [])].map(String).sort(),
    runAt: text(media.ocr?.runAt),
    state: media.ocr?.state ?? 'unknown',
    text: text(media.ocr?.text),
  },
  reference,
  source: text(media.filename) ?? text(media.url),
  url: text(media.url),
  videoSamples: normalizeVideoSamples(media),
})

const evidenceSignature = (observation: MediaAuditObservation): string =>
  stableStringify({
    checksum: observation.checksum,
    dimensions: observation.dimensions,
    filename: observation.filename,
    kind: observation.kind,
    manualReview: observation.manualReview,
    ocr: observation.ocr,
    source: observation.source,
    url: observation.url,
    videoSamples: observation.videoSamples,
  })

const finding = (
  assetIdentity: string,
  code: MediaAuditFindingCode,
  message: string,
  references: MediaAuditReference[] = [],
): MediaAuditFinding => ({
  assetIdentity,
  code,
  message,
  references: [...references].sort(compareReferences),
})

const manifestCoverageFindings = ({
  manifest,
  tours,
}: {
  manifest: WingsSideTourMediaManifest
  tours: NormalizedTourMediaAuditInput[]
}): {
  coverage: WingsSideTourMediaAuditReport['coverage']
  findings: MediaAuditFinding[]
} => {
  const findings: MediaAuditFinding[] = []
  const expected = manifest.tours.map(({ tourID, tourSlug }) => ({
    tourID: String(tourID),
    tourSlug: tourSlug.trim(),
  }))
  const observed = tours.map(({ tourID, tourSlug }) => ({
    tourID: String(tourID),
    tourSlug: tourSlug.trim(),
  }))
  const duplicateValues = (
    values: string[],
    code: MediaAuditFindingCode,
    scope: string,
  ): void => {
    for (const value of [...new Set(values.filter((entry, index) => values.indexOf(entry) !== index))]) {
      findings.push(finding(`coverage:${scope}:${value}`, code, `Duplicate ${scope}: ${value}`))
    }
  }

  if (manifest.schemaVersion !== 1 || expected.length !== wingsSideTourMediaExpectedTourCount) {
    findings.push(
      finding(
        'coverage:manifest',
        'invalid-manifest-cardinality',
        `Canonical manifest must contain exactly ${wingsSideTourMediaExpectedTourCount} tours.`,
      ),
    )
  }
  for (const tour of expected) {
    if (!tour.tourID.trim() || !tour.tourSlug) {
      findings.push(
        finding(
          'coverage:manifest',
          'invalid-manifest-identity',
          'Canonical manifest tour IDs and slugs must be non-empty.',
        ),
      )
    }
  }
  duplicateValues(
    expected.map(({ tourID }) => tourID),
    'duplicate-manifest-tour-id',
    'manifest-tour-id',
  )
  duplicateValues(
    expected.map(({ tourSlug }) => tourSlug),
    'duplicate-manifest-tour-slug',
    'manifest-tour-slug',
  )
  duplicateValues(
    observed.map(({ tourID }) => tourID),
    'duplicate-input-tour-id',
    'input-tour-id',
  )
  duplicateValues(
    observed.map(({ tourSlug }) => tourSlug),
    'duplicate-input-tour-slug',
    'input-tour-slug',
  )

  const expectedPairs = new Set(expected.map(({ tourID, tourSlug }) => `${tourID}\0${tourSlug}`))
  const observedPairs = new Set(observed.map(({ tourID, tourSlug }) => `${tourID}\0${tourSlug}`))
  const expectedByID = new Map(expected.map((entry) => [entry.tourID, entry.tourSlug]))
  const expectedBySlug = new Map(expected.map((entry) => [entry.tourSlug, entry.tourID]))
  let mismatchedTourCount = 0
  let extraTourCount = 0

  for (const tour of observed) {
    const pair = `${tour.tourID}\0${tour.tourSlug}`
    if (expectedPairs.has(pair)) continue
    if (expectedByID.has(tour.tourID) || expectedBySlug.has(tour.tourSlug)) {
      mismatchedTourCount += 1
      findings.push(
        finding(
          `coverage:${tour.tourID}:${tour.tourSlug}`,
          'mismatched-tour-identity',
          `Tour ID and slug do not match the canonical manifest: ${tour.tourID}:${tour.tourSlug}`,
        ),
      )
    } else {
      extraTourCount += 1
      findings.push(
        finding(
          `coverage:${tour.tourID}:${tour.tourSlug}`,
          'extra-tour',
          `Tour is absent from the canonical manifest: ${tour.tourID}:${tour.tourSlug}`,
        ),
      )
    }
  }

  const missing = expected.filter(
    ({ tourID, tourSlug }) => !observedPairs.has(`${tourID}\0${tourSlug}`),
  )
  for (const tour of missing) {
    findings.push(
      finding(
        `coverage:${tour.tourID}:${tour.tourSlug}`,
        'missing-tour',
        `Canonical tour is missing from the audit input: ${tour.tourID}:${tour.tourSlug}`,
      ),
    )
  }

  const referenceCounts = new Map<string, number>()
  for (const entry of collectWingsSideTourMediaReferences(tours)) {
    const key = `${entry.reference.tourID}\0${entry.reference.tourSlug}`
    referenceCounts.set(key, (referenceCounts.get(key) ?? 0) + 1)
  }
  for (const tour of observed.filter(({ tourID, tourSlug }) =>
    expectedPairs.has(`${tourID}\0${tourSlug}`),
  )) {
    const key = `${tour.tourID}\0${tour.tourSlug}`
    if (!referenceCounts.get(key)) {
      findings.push(
        finding(
          `coverage:${tour.tourID}:${tour.tourSlug}`,
          'no-media-references',
          `Canonical tour has no inventoried media references: ${tour.tourID}:${tour.tourSlug}`,
        ),
      )
    }
  }

  return {
    coverage: {
      expectedTourCount: expected.length,
      extraTourCount,
      matchedTourCount: observed.filter(({ tourID, tourSlug }) =>
        expectedPairs.has(`${tourID}\0${tourSlug}`),
      ).length,
      mismatchedTourCount,
      missingTourCount: missing.length,
      observedTourCount: observed.length,
    },
    findings,
  }
}

const observationFindings = (
  asset: MediaAuditAsset,
  observation: MediaAuditObservation,
  sourceBrandPatterns: RegExp[],
): MediaAuditFinding[] => {
  const findings: MediaAuditFinding[] = []
  const refs = asset.references
  if (!observation.source) {
    findings.push(finding(asset.identity, 'missing-source', 'Media has no filename or URL.', refs))
  }
  if (!observation.checksum) {
    findings.push(finding(asset.identity, 'missing-checksum', 'Media has no checksum.', refs))
  } else if (!sha256Pattern.test(observation.checksum)) {
    findings.push(
      finding(
        asset.identity,
        'invalid-checksum',
        'Media checksum must be lowercase SHA-256.',
        refs,
      ),
    )
  }
  const ocrMetadataComplete =
    observation.ocr.engine &&
    observation.ocr.engineVersion &&
    isValidTimestamp(observation.ocr.runAt) &&
    observation.ocr.frameHashes.length > 0 &&
    observation.ocr.frameHashes.every((hash) => sha256Pattern.test(hash))
  if (!ocrMetadataComplete) {
    findings.push(
      finding(
        asset.identity,
        'missing-evidence-metadata',
        'OCR evidence requires engine, version, UTC run time, and lowercase SHA-256 frame hashes.',
        refs,
      ),
    )
  }
  if (observation.ocr.state === 'hit') {
    findings.push(
      finding(asset.identity, 'ocr-source-brand-hit', 'OCR is marked as a watermark hit.', refs),
    )
  } else if (
    observation.ocr.text &&
    sourceBrandPatterns.some((pattern) => {
      pattern.lastIndex = 0
      return pattern.test(observation.ocr.text!)
    })
  ) {
    findings.push(
      finding(
        asset.identity,
        'ocr-source-brand-hit',
        'OCR text contains a configured source brand.',
        refs,
      ),
    )
  } else if (observation.ocr.state === 'unknown' || observation.ocr.state === 'unscanned') {
    findings.push(
      finding(asset.identity, 'ocr-unscanned', 'OCR evidence is absent or incomplete.', refs),
    )
  }

  const reviewMetadataComplete =
    observation.manualReview.reviewerID && isValidTimestamp(observation.manualReview.reviewedAt)
  if (!reviewMetadataComplete) {
    findings.push(
      finding(
        asset.identity,
        'missing-evidence-metadata',
        'Manual review requires reviewer ID and UTC review time.',
        refs,
      ),
    )
  }
  if (observation.manualReview.state === 'failed') {
    findings.push(
      finding(asset.identity, 'manual-review-failed', 'Manual visual review failed.', refs),
    )
  } else if (observation.manualReview.state !== 'passed') {
    findings.push(
      finding(asset.identity, 'manual-review-required', 'Passed manual review is required.', refs),
    )
  }
  if (
    observation.kind === 'video' &&
    (observation.videoSamples.length === 0 ||
      observation.videoSamples.some(
        ({ frameHash }) => !frameHash || !sha256Pattern.test(frameHash),
      ))
  ) {
    findings.push(
      finding(
        asset.identity,
        'missing-evidence-metadata',
        'Every planned video sample requires a lowercase SHA-256 frame hash.',
        refs,
      ),
    )
  }
  return findings
}

export const buildWingsSideTourMediaAuditReport = ({
  manifest,
  sourceBrandPatterns = defaultSourceBrandPatterns,
  tours,
}: {
  manifest: WingsSideTourMediaManifest
  sourceBrandPatterns?: RegExp[]
  tours: NormalizedTourMediaAuditInput[]
}): WingsSideTourMediaAuditReport => {
  const coverageResult = manifestCoverageFindings({ manifest, tours })
  const findings = [...coverageResult.findings]
  const collected = collectWingsSideTourMediaReferences(tours)
  const grouped = new Map<string, CollectedReference[]>()
  const missingIDs: CollectedReference[] = []

  for (const entry of collected) {
    const mediaID = text(entry.media.id)
    if (!mediaID) missingIDs.push(entry)
    else {
      const identity = `media:${mediaID}`
      grouped.set(identity, [...(grouped.get(identity) ?? []), entry])
    }
  }

  const assets: MediaAuditAsset[] = []
  for (const [identity, entries] of [...grouped].sort(([left], [right]) =>
    left.localeCompare(right),
  )) {
    const observations = entries
      .map(({ media, reference }) => normalizeObservation(media, reference))
      .sort(
        (left, right) =>
          evidenceSignature(left).localeCompare(evidenceSignature(right)) ||
          compareReferences(left.reference, right.reference),
      )
    const asset: MediaAuditAsset = {
      identity,
      mediaID: identity.slice('media:'.length),
      observations,
      references: observations.map(({ reference }) => reference).sort(compareReferences),
    }
    assets.push(asset)
    if (new Set(observations.map(evidenceSignature)).size > 1) {
      findings.push(
        finding(
          identity,
          'conflicting-evidence',
          'Reused media ID has conflicting source, checksum, kind, dimensions, OCR, review, or frame evidence.',
          asset.references,
        ),
      )
    }
    for (const observation of observations) {
      findings.push(...observationFindings(asset, observation, sourceBrandPatterns))
    }
  }

  missingIDs.forEach((entry, index) => {
    const identity = `missing:${entry.reference.tourSlug}:${entry.reference.fieldPath}:${index + 1}`
    const observation = normalizeObservation(entry.media, entry.reference)
    const asset: MediaAuditAsset = {
      identity,
      mediaID: null,
      observations: [observation],
      references: [entry.reference],
    }
    assets.push(asset)
    findings.push(finding(identity, 'missing-id', 'Media has no stable ID.', asset.references))
    findings.push(...observationFindings(asset, observation, sourceBrandPatterns))
  })

  assets.sort((left, right) => left.identity.localeCompare(right.identity))
  const uniqueFindings = [
    ...new Map(
      findings.map((entry) => [
        stableStringify({
          assetIdentity: entry.assetIdentity,
          code: entry.code,
          message: entry.message,
          references: entry.references,
        }),
        entry,
      ]),
    ).values(),
  ].sort(
    (left, right) =>
      left.assetIdentity.localeCompare(right.assetIdentity) ||
      left.code.localeCompare(right.code) ||
      left.message.localeCompare(right.message),
  )

  const reportWithoutChecksum = {
    assets,
    coverage: coverageResult.coverage,
    evidenceContract: 'manifest-verification-only' as const,
    findings: uniqueFindings,
    manifestChecksum: wingsSideTourMediaManifestChecksum(manifest),
    releaseGate: {
      blockingFindingCount: uniqueFindings.length,
      passed: uniqueFindings.length === 0,
    },
    schemaVersion: 2 as const,
  }
  return {
    aggregateChecksum: wingsSideTourMediaAuditChecksum(reportWithoutChecksum),
    ...reportWithoutChecksum,
  }
}

export const assertWingsSideTourMediaReleaseGate = (
  report: WingsSideTourMediaAuditReport,
  manifest: WingsSideTourMediaManifest,
): void => {
  const { aggregateChecksum: _checksum, ...reportWithoutChecksum } = report
  if (wingsSideTourMediaAuditChecksum(reportWithoutChecksum) !== report.aggregateChecksum) {
    throw new Error('WingSide media audit report integrity checksum mismatch')
  }
  if (wingsSideTourMediaManifestChecksum(manifest) !== report.manifestChecksum) {
    throw new Error('WingSide media audit canonical manifest checksum mismatch')
  }
  const manifestIDs = manifest.tours.map(({ tourID }) => String(tourID).trim())
  const manifestSlugs = manifest.tours.map(({ tourSlug }) => tourSlug.trim())
  if (
    manifestIDs.some((value) => !value) ||
    manifestSlugs.some((value) => !value) ||
    new Set(manifestIDs).size !== wingsSideTourMediaExpectedTourCount ||
    new Set(manifestSlugs).size !== wingsSideTourMediaExpectedTourCount
  ) {
    throw new Error('WingSide media audit canonical manifest identities are invalid')
  }
  if (
    manifest.schemaVersion !== 1 ||
    manifest.tours.length !== wingsSideTourMediaExpectedTourCount ||
    report.coverage.expectedTourCount !== wingsSideTourMediaExpectedTourCount ||
    report.coverage.observedTourCount !== wingsSideTourMediaExpectedTourCount ||
    report.coverage.matchedTourCount !== wingsSideTourMediaExpectedTourCount ||
    report.coverage.missingTourCount !== 0 ||
    report.coverage.extraTourCount !== 0 ||
    report.coverage.mismatchedTourCount !== 0 ||
    report.assets.length === 0
  ) {
    throw new Error('WingSide media audit canonical 22-tour coverage mismatch')
  }
  if (
    report.releaseGate.blockingFindingCount !== report.findings.length ||
    report.releaseGate.passed !== (report.findings.length === 0)
  ) {
    throw new Error('WingSide media audit release-gate summary mismatch')
  }
  if (!report.releaseGate.passed || report.releaseGate.blockingFindingCount > 0) {
    throw new Error(
      `WingSide media release gate blocked by ${report.releaseGate.blockingFindingCount} finding(s)`,
    )
  }
}
