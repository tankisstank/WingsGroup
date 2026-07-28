import type {
  WingsSideD4CReference,
  WingsSideD4CSourceAsset,
} from './wingsSideTourMediaD4C'

export type WingsSideD4CPerceptualFingerprint = {
  centerDHash: string
  fullDHash: string
}

export type WingsSideD4CReplacementCandidate = {
  aspectDelta: number
  candidateMediaIDs: number[]
  candidateSha256: string
  centerDistance: number
  fullDistance: number
  sameRole: boolean
  sameTour: boolean
  score: number
  slotDistance: number | null
}

export type WingsSideD4CDisposition = 'clean' | 'watermark-positive'

export type WingsSideD4CZoomIndex = {
  assets?: Array<{ sourceSha256?: string }>
  priorCleanHashCount?: number
  sheets?: Array<{ byteLength?: number; path?: string; sha256?: string }>
  sourceSnapshotSha256?: string
}

export type WingsSideD4CReplacementMapping = {
  applyContract?: {
    mode?: string
    preserveSourceMediaIDs?: boolean
    productionWrite?: boolean
    sourceMediaWrite?: boolean
  }
  candidates?: Array<{
    candidateMediaIDs?: number[]
    candidateSha256?: string
    matchType?: 'exact-duplicate' | 'near-duplicate'
    sourceMediaIDs?: number[]
    sourceSha256?: string
  }>
  coverage?: {
    acceptedCandidateCount?: number
    blockedPositiveCount?: number
    exactDuplicateAcceptedCount?: number
    manuallyRejectedNearDuplicateCount?: number
    nearDuplicateAcceptedCount?: number
    reclassifiedFalseNegativeCount?: number
    revalidatedCleanCount?: number
  }
  rejectedNearDuplicates?: Array<{
    candidateMediaIDs?: number[]
    candidateSha256?: string
    confidence?: string
    reason?: string
    sourceMediaIDs?: number[]
    sourceSha256?: string
  }>
  sourceSnapshotSha256?: string
}

const hexadecimalPattern = /^[a-f0-9]+$/u
const sha256Pattern = /^[a-f0-9]{64}$/u

const equalNumbers = (left: number[] | undefined, right: number[]): boolean =>
  Array.isArray(left) &&
  left.length === right.length &&
  left.every((value, index) => value === right[index])

export const validateWingsSideD4CZoomIndexCoverage = ({
  expectedHashes,
  sourceSnapshotSha256,
  zoomIndex,
}: {
  expectedHashes: ReadonlySet<string>
  sourceSnapshotSha256: string
  zoomIndex: WingsSideD4CZoomIndex
}): void => {
  const hashes = zoomIndex.assets?.map(({ sourceSha256 }) => sourceSha256) ?? []
  const actualHashes = new Set(hashes)
  if (
    zoomIndex.sourceSnapshotSha256 !== sourceSnapshotSha256 ||
    zoomIndex.priorCleanHashCount !== expectedHashes.size ||
    hashes.length !== expectedHashes.size ||
    actualHashes.size !== expectedHashes.size ||
    hashes.some(
      (hash): boolean =>
        typeof hash !== 'string' || !sha256Pattern.test(hash) || !expectedHashes.has(hash),
    ) ||
    [...expectedHashes].some((hash) => !actualHashes.has(hash)) ||
    !Array.isArray(zoomIndex.sheets) ||
    zoomIndex.sheets.length !== 25
  ) {
    throw new Error('D4-C R4 clean zoom index coverage is invalid')
  }
}

export const validateWingsSideD4CReplacementMapping = ({
  assetsByHash,
  mapping,
  reclassifiedFalseNegativeCount,
  sourceSnapshotSha256,
  supersedingDispositionByHash,
}: {
  assetsByHash: ReadonlyMap<string, WingsSideD4CSourceAsset>
  mapping: WingsSideD4CReplacementMapping
  reclassifiedFalseNegativeCount: number
  sourceSnapshotSha256: string
  supersedingDispositionByHash: ReadonlyMap<string, WingsSideD4CDisposition>
}): void => {
  const candidates = mapping.candidates
  const rejected = mapping.rejectedNearDuplicates
  const positiveCount = [...supersedingDispositionByHash.values()].filter(
    (value) => value === 'watermark-positive',
  ).length
  const cleanCount = supersedingDispositionByHash.size - positiveCount
  if (
    mapping.sourceSnapshotSha256 !== sourceSnapshotSha256 ||
    mapping.applyContract?.mode !== 'no-write-candidate-map' ||
    mapping.applyContract.sourceMediaWrite !== false ||
    mapping.applyContract.productionWrite !== false ||
    mapping.applyContract.preserveSourceMediaIDs !== true ||
    !Array.isArray(candidates) ||
    !Array.isArray(rejected)
  ) {
    throw new Error('D4-C replacement mapping contract is invalid')
  }

  const validateBoundPair = (
    pair: NonNullable<WingsSideD4CReplacementMapping['candidates']>[number],
    expectedCandidateDisposition: WingsSideD4CDisposition,
  ): void => {
    const source = assetsByHash.get(String(pair.sourceSha256))
    const replacement = assetsByHash.get(String(pair.candidateSha256))
    if (
      !source ||
      !replacement ||
      source.sha256 === replacement.sha256 ||
      supersedingDispositionByHash.get(source.sha256) !== 'watermark-positive' ||
      supersedingDispositionByHash.get(replacement.sha256) !== expectedCandidateDisposition ||
      !equalNumbers(pair.sourceMediaIDs, source.mediaIDs) ||
      !equalNumbers(pair.candidateMediaIDs, replacement.mediaIDs)
    ) {
      throw new Error('D4-C replacement mapping contains an unbound candidate')
    }
  }

  candidates.forEach((candidate) => {
    validateBoundPair(candidate, 'clean')
    if (
      candidate.matchType !== 'exact-duplicate' &&
      candidate.matchType !== 'near-duplicate'
    ) {
      throw new Error('D4-C replacement mapping candidate match type is invalid')
    }
  })
  const candidatePairs = new Set(
    candidates.map(({ candidateSha256, sourceSha256 }) => `${sourceSha256}:${candidateSha256}`),
  )
  if (candidatePairs.size !== candidates.length) {
    throw new Error('D4-C replacement mapping contains a duplicate candidate pair')
  }

  rejected.forEach((pair) => {
    validateBoundPair(pair, 'watermark-positive')
    if (pair.confidence !== 'rejected' || !pair.reason?.trim()) {
      throw new Error('D4-C rejected near-duplicate record is invalid')
    }
  })
  const rejectedPairs = new Set(
    rejected.map(({ candidateSha256, sourceSha256 }) => `${sourceSha256}:${candidateSha256}`),
  )
  if (rejectedPairs.size !== rejected.length) {
    throw new Error('D4-C rejected near-duplicate records contain duplicates')
  }

  if (
    mapping.coverage?.acceptedCandidateCount !== candidates.length ||
    mapping.coverage.blockedPositiveCount !== positiveCount - candidates.length ||
    mapping.coverage.revalidatedCleanCount !== cleanCount ||
    mapping.coverage.reclassifiedFalseNegativeCount !== reclassifiedFalseNegativeCount ||
    mapping.coverage.exactDuplicateAcceptedCount !==
      candidates.filter(({ matchType }) => matchType === 'exact-duplicate').length ||
    mapping.coverage.nearDuplicateAcceptedCount !==
      candidates.filter(({ matchType }) => matchType === 'near-duplicate').length ||
    mapping.coverage.manuallyRejectedNearDuplicateCount !== rejected.length
  ) {
    throw new Error('D4-C replacement mapping coverage is invalid')
  }
}

const sample = (
  pixels: Uint8Array,
  size: number,
  x: number,
  y: number,
  xStart: number,
  yStart: number,
  xEnd: number,
  yEnd: number,
  sampleWidth: number,
  sampleHeight: number,
): number => {
  const sourceX = Math.min(
    size - 1,
    Math.max(
      0,
      Math.round(xStart + (x / Math.max(1, sampleWidth - 1)) * (xEnd - xStart)),
    ),
  )
  const sourceY = Math.min(
    size - 1,
    Math.max(
      0,
      Math.round(yStart + (y / Math.max(1, sampleHeight - 1)) * (yEnd - yStart)),
    ),
  )
  return pixels[sourceY * size + sourceX] ?? 0
}

const regionDHash = (
  pixels: Uint8Array,
  size: number,
  region: { xEnd: number; xStart: number; yEnd: number; yStart: number },
): string => {
  const columns = 17
  const rows = 16
  let bits = ''
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < columns - 1; x += 1) {
      const left = sample(
        pixels,
        size,
        x,
        y,
        region.xStart,
        region.yStart,
        region.xEnd,
        region.yEnd,
        columns,
        rows,
      )
      const right = sample(
        pixels,
        size,
        x + 1,
        y,
        region.xStart,
        region.yStart,
        region.xEnd,
        region.yEnd,
        columns,
        rows,
      )
      bits += left > right ? '1' : '0'
    }
  }
  return bits
    .match(/.{1,4}/gu)!
    .map((nibble) => Number.parseInt(nibble, 2).toString(16))
    .join('')
}

export const buildWingsSideD4CPerceptualFingerprint = (
  pixels: Uint8Array,
  size = 64,
): WingsSideD4CPerceptualFingerprint => {
  if (size < 17 || pixels.length !== size * size) {
    throw new Error('D4-C replacement fingerprint requires a square grayscale raster')
  }
  return {
    centerDHash: regionDHash(pixels, size, {
      xEnd: size - 5,
      xStart: 4,
      yEnd: size - 11,
      yStart: 4,
    }),
    fullDHash: regionDHash(pixels, size, {
      xEnd: size - 1,
      xStart: 0,
      yEnd: size - 1,
      yStart: 0,
    }),
  }
}

export const normalizedDHashDistance = (left: string, right: string): number => {
  if (
    left.length === 0 ||
    left.length !== right.length ||
    !hexadecimalPattern.test(left) ||
    !hexadecimalPattern.test(right)
  ) {
    throw new Error('D4-C replacement dHash values must be equal-length lowercase hex')
  }
  let changedBits = 0
  for (let index = 0; index < left.length; index += 1) {
    let xor = Number.parseInt(left[index]!, 16) ^ Number.parseInt(right[index]!, 16)
    while (xor > 0) {
      changedBits += xor & 1
      xor >>>= 1
    }
  }
  return changedBits / (left.length * 4)
}

const roles = (references: WingsSideD4CReference[]): Set<string> =>
  new Set(
    references.map(({ fieldPath }) => {
      if (fieldPath === 'heroMedia') return 'hero'
      if (fieldPath === 'marketCard.thumbnailOverride') return 'market-card'
      if (fieldPath === 'routeViz.mapImage') return 'route-map'
      return fieldPath.startsWith('gallery[') ? 'gallery' : fieldPath
    }),
  )

const gallerySlots = (references: WingsSideD4CReference[]): number[] =>
  references.flatMap(({ fieldPath }) => {
    const match = /^gallery\[(\d+)\]$/u.exec(fieldPath)
    return match ? [Number(match[1])] : []
  })

const minimumSlotDistance = (
  source: WingsSideD4CReference[],
  candidate: WingsSideD4CReference[],
): number | null => {
  const sourceSlots = gallerySlots(source)
  const candidateSlots = gallerySlots(candidate)
  if (sourceSlots.length === 0 || candidateSlots.length === 0) return null
  return Math.min(
    ...sourceSlots.flatMap((left) => candidateSlots.map((right) => Math.abs(left - right))),
  )
}

const sharesValue = (left: Set<string>, right: Set<string>): boolean =>
  [...left].some((value) => right.has(value))

export const rankWingsSideD4CReplacementCandidates = ({
  cleanAssets,
  fingerprints,
  source,
}: {
  cleanAssets: WingsSideD4CSourceAsset[]
  fingerprints: ReadonlyMap<string, WingsSideD4CPerceptualFingerprint>
  source: WingsSideD4CSourceAsset
}): WingsSideD4CReplacementCandidate[] => {
  const sourceFingerprint = fingerprints.get(source.sha256)
  if (!sourceFingerprint) throw new Error(`Missing D4-C fingerprint ${source.sha256}`)
  const sourceTours = new Set(source.references.map(({ tourSlug }) => tourSlug))
  const sourceRoles = roles(source.references)
  const sourceAspect =
    source.width && source.height ? source.width / source.height : null

  return cleanAssets
    .map((candidate): WingsSideD4CReplacementCandidate => {
      const candidateFingerprint = fingerprints.get(candidate.sha256)
      if (!candidateFingerprint) throw new Error(`Missing D4-C fingerprint ${candidate.sha256}`)
      const sameTour = sharesValue(
        sourceTours,
        new Set(candidate.references.map(({ tourSlug }) => tourSlug)),
      )
      const sameRole = sharesValue(sourceRoles, roles(candidate.references))
      const candidateAspect =
        candidate.width && candidate.height ? candidate.width / candidate.height : null
      const aspectDelta =
        sourceAspect && candidateAspect
          ? Math.abs(Math.log(sourceAspect / candidateAspect))
          : 1
      const fullDistance = normalizedDHashDistance(
        sourceFingerprint.fullDHash,
        candidateFingerprint.fullDHash,
      )
      const centerDistance = normalizedDHashDistance(
        sourceFingerprint.centerDHash,
        candidateFingerprint.centerDHash,
      )
      const slotDistance = minimumSlotDistance(source.references, candidate.references)
      const score =
        centerDistance * 0.5 +
        fullDistance * 0.3 +
        Math.min(aspectDelta, 1) * 0.1 +
        (sameTour ? 0 : 0.07) +
        (sameRole ? 0 : 0.03)
      return {
        aspectDelta,
        candidateMediaIDs: candidate.mediaIDs,
        candidateSha256: candidate.sha256,
        centerDistance,
        fullDistance,
        sameRole,
        sameTour,
        score,
        slotDistance,
      }
    })
    .sort(
      (left, right) =>
        left.score - right.score ||
        Number(right.sameTour) - Number(left.sameTour) ||
        Number(right.sameRole) - Number(left.sameRole) ||
        (left.slotDistance ?? Number.MAX_SAFE_INTEGER) -
          (right.slotDistance ?? Number.MAX_SAFE_INTEGER) ||
        left.candidateSha256.localeCompare(right.candidateSha256),
    )
}

export const isWingsSideD4CReviewCandidate = (
  candidate: WingsSideD4CReplacementCandidate,
): boolean =>
  candidate.sameTour &&
  candidate.sameRole &&
  candidate.aspectDelta <= 0.12 &&
  candidate.centerDistance <= 0.22 &&
  candidate.fullDistance <= 0.25 &&
  candidate.score <= 0.2
