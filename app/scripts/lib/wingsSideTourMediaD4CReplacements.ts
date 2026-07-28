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

const hexadecimalPattern = /^[a-f0-9]+$/u

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
