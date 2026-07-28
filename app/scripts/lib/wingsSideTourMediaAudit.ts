import { createHash } from 'node:crypto'

export type MediaKind = 'image' | 'video'
export type OcrState = 'hit' | 'pass' | 'unknown' | 'unscanned'
export type ManualReviewState = 'failed' | 'not-reviewed' | 'passed' | 'required'

export type NormalizedMediaAuditInput = {
  checksum?: null | string
  dimensions?: null | {
    height: number
    width: number
  }
  filename?: null | string
  id?: null | number | string
  kind?: MediaKind
  manualReview?: null | {
    reason?: null | string
    state: ManualReviewState
  }
  ocr?: null | {
    state: OcrState
    text?: null | string
  }
  url?: null | string
  videoSamples?: null | Array<{
    label?: null | string
    position: 'end' | 'middle' | 'scene' | 'start'
    timestampSeconds?: null | number
  }>
}

export type NormalizedTourMediaAuditInput = {
  gallery?: null | NormalizedMediaAuditInput[]
  heroMedia?: null | NormalizedMediaAuditInput
  itineraryDays?: null | Array<{
    gallery?: null | NormalizedMediaAuditInput[]
    media?: null | NormalizedMediaAuditInput
  }>
  marketCard?: null | {
    thumbnailOverride?: null | NormalizedMediaAuditInput
  }
  meta?: null | {
    image?: null | NormalizedMediaAuditInput
  }
  relatedCardMedia?: null | NormalizedMediaAuditInput[]
  routeViz?: null | {
    mapImage?: null | NormalizedMediaAuditInput
  }
  tourID: number | string
  tourSlug: string
}

export type MediaAuditReference = {
  fieldPath: string
  tourID: string
  tourSlug: string
}

export type MediaAuditFindingCode =
  | 'conflicting-identity'
  | 'duplicate-identity'
  | 'manual-review-failed'
  | 'manual-review-required'
  | 'missing-checksum'
  | 'missing-id'
  | 'missing-source'
  | 'ocr-source-brand-hit'
  | 'ocr-unscanned'

export type MediaAuditFinding = {
  assetIdentity: string
  code: MediaAuditFindingCode
  message: string
  references: MediaAuditReference[]
}

export type VideoSampleRequirement = {
  label: string
  position: 'end' | 'middle' | 'scene' | 'start'
  timestampSeconds?: number
}

export type MediaAuditAsset = {
  checksum: null | string
  dimensions: null | {
    height: number
    width: number
  }
  filename: null | string
  identity: string
  kind: MediaKind
  manualReview: {
    reason: null | string
    state: ManualReviewState
  }
  mediaID: null | string
  ocr: {
    state: OcrState
    text: null | string
  }
  references: MediaAuditReference[]
  source: null | string
  url: null | string
  videoSampleRequirements: VideoSampleRequirement[]
}

export type WingsSideTourMediaAuditReport = {
  aggregateChecksum: string
  assets: MediaAuditAsset[]
  findings: MediaAuditFinding[]
  releaseGate: {
    blockingFindingCount: number
    passed: boolean
  }
  schemaVersion: 1
  tourCount: number
}

type CollectedReference = {
  media: NormalizedMediaAuditInput
  reference: MediaAuditReference
}

const defaultSourceBrandPatterns = [/\bbest\s*price(?:\s+travel)?\b/i]

const text = (value: null | number | string | undefined): null | string => {
  if (value === null || value === undefined) return null
  const normalized = String(value).trim()
  return normalized || null
}

const compareReferences = (left: MediaAuditReference, right: MediaAuditReference): number =>
  left.tourSlug.localeCompare(right.tourSlug) ||
  left.fieldPath.localeCompare(right.fieldPath) ||
  left.tourID.localeCompare(right.tourID)

const collectMedia = (
  target: CollectedReference[],
  tour: NormalizedTourMediaAuditInput,
  fieldPath: string,
  media: null | NormalizedMediaAuditInput | undefined,
): void => {
  if (!media) return
  target.push({
    media,
    reference: {
      fieldPath,
      tourID: String(tour.tourID),
      tourSlug: tour.tourSlug,
    },
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

const defaultVideoRequirements = (): VideoSampleRequirement[] => [
  { label: 'first-frame', position: 'start' },
  { label: 'middle-frame', position: 'middle' },
  { label: 'last-frame', position: 'end' },
]

const videoRequirements = (media: NormalizedMediaAuditInput): VideoSampleRequirement[] => {
  if (media.kind !== 'video') return []
  if (!media.videoSamples?.length) return defaultVideoRequirements()
  return media.videoSamples
    .map((sample, index) => ({
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

const normalizedAsset = (
  identity: string,
  media: NormalizedMediaAuditInput,
  references: MediaAuditReference[],
): MediaAuditAsset => ({
  checksum: text(media.checksum),
  dimensions: media.dimensions
    ? { height: media.dimensions.height, width: media.dimensions.width }
    : null,
  filename: text(media.filename),
  identity,
  kind: media.kind ?? 'image',
  manualReview: {
    reason: text(media.manualReview?.reason),
    state: media.manualReview?.state ?? 'not-reviewed',
  },
  mediaID: text(media.id),
  ocr: {
    state: media.ocr?.state ?? 'unknown',
    text: text(media.ocr?.text),
  },
  references: [...references].sort(compareReferences),
  source: text(media.filename) ?? text(media.url),
  url: text(media.url),
  videoSampleRequirements: videoRequirements(media),
})

const identitySignature = (media: NormalizedMediaAuditInput): string =>
  JSON.stringify({
    checksum: text(media.checksum),
    filename: text(media.filename),
    kind: media.kind ?? 'image',
    url: text(media.url),
  })

const finding = (
  asset: MediaAuditAsset,
  code: MediaAuditFindingCode,
  message: string,
): MediaAuditFinding => ({
  assetIdentity: asset.identity,
  code,
  message,
  references: asset.references,
})

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

export const buildWingsSideTourMediaAuditReport = ({
  sourceBrandPatterns = defaultSourceBrandPatterns,
  tours,
}: {
  sourceBrandPatterns?: RegExp[]
  tours: NormalizedTourMediaAuditInput[]
}): WingsSideTourMediaAuditReport => {
  const collected = collectWingsSideTourMediaReferences(tours)
  const withIDs = new Map<string, CollectedReference[]>()
  const missingIDs: CollectedReference[] = []

  for (const entry of collected) {
    const mediaID = text(entry.media.id)
    if (!mediaID) {
      missingIDs.push(entry)
      continue
    }
    const identity = `media:${mediaID}`
    withIDs.set(identity, [...(withIDs.get(identity) ?? []), entry])
  }

  const findings: MediaAuditFinding[] = []
  const assets: MediaAuditAsset[] = []

  for (const [identity, entries] of [...withIDs].sort(([left], [right]) =>
    left.localeCompare(right),
  )) {
    const references = entries.map(({ reference }) => reference)
    const asset = normalizedAsset(identity, entries[0]!.media, references)
    assets.push(asset)
    const signatures = new Set(entries.map(({ media }) => identitySignature(media)))
    if (signatures.size > 1) {
      findings.push(
        finding(
          asset,
          'conflicting-identity',
          'The same stable media ID resolves to conflicting source metadata.',
        ),
      )
    } else if (entries.length > 1) {
      findings.push(
        finding(
          asset,
          'duplicate-identity',
          'The media ID is reused; all references were retained in one inventory asset.',
        ),
      )
    }
  }

  missingIDs.forEach((entry, index) => {
    const identity = `missing:${entry.reference.tourSlug}:${entry.reference.fieldPath}:${index + 1}`
    const asset = normalizedAsset(identity, entry.media, [entry.reference])
    assets.push(asset)
    findings.push(finding(asset, 'missing-id', 'Media reference has no stable media ID.'))
  })

  assets.sort((left, right) => left.identity.localeCompare(right.identity))
  for (const asset of assets) {
    if (!asset.source) {
      findings.push(finding(asset, 'missing-source', 'Media has neither a filename nor a URL.'))
    }
    if (!asset.checksum) {
      findings.push(finding(asset, 'missing-checksum', 'Media has no content checksum.'))
    }
    if (asset.ocr.state === 'hit') {
      findings.push(
        finding(asset, 'ocr-source-brand-hit', 'OCR is explicitly marked as a watermark hit.'),
      )
    } else if (
      asset.ocr.text &&
      sourceBrandPatterns.some((pattern) => {
        pattern.lastIndex = 0
        return pattern.test(asset.ocr.text!)
      })
    ) {
      findings.push(
        finding(asset, 'ocr-source-brand-hit', 'OCR text contains a configured source brand.'),
      )
    } else if (asset.ocr.state === 'unknown' || asset.ocr.state === 'unscanned') {
      findings.push(finding(asset, 'ocr-unscanned', 'OCR evidence is absent or incomplete.'))
    }
    if (asset.manualReview.state === 'failed') {
      findings.push(
        finding(asset, 'manual-review-failed', 'Manual visual review failed for this asset.'),
      )
    } else if (asset.manualReview.state !== 'passed') {
      findings.push(
        finding(
          asset,
          'manual-review-required',
          'A passed manual visual review is required before release.',
        ),
      )
    }
  }

  findings.sort(
    (left, right) =>
      left.assetIdentity.localeCompare(right.assetIdentity) ||
      left.code.localeCompare(right.code) ||
      left.message.localeCompare(right.message),
  )

  const reportWithoutChecksum = {
    assets,
    findings,
    releaseGate: {
      blockingFindingCount: findings.filter(({ code }) => code !== 'duplicate-identity').length,
      passed: findings.every(({ code }) => code === 'duplicate-identity'),
    },
    schemaVersion: 1 as const,
    tourCount: new Set(tours.map(({ tourID }) => String(tourID))).size,
  }

  return {
    aggregateChecksum: wingsSideTourMediaAuditChecksum(reportWithoutChecksum),
    ...reportWithoutChecksum,
  }
}

export const assertWingsSideTourMediaReleaseGate = (
  report: WingsSideTourMediaAuditReport,
): void => {
  const { aggregateChecksum: _checksum, ...reportWithoutChecksum } = report
  const expectedChecksum = wingsSideTourMediaAuditChecksum(reportWithoutChecksum)
  if (expectedChecksum !== report.aggregateChecksum) {
    throw new Error('WingSide media audit report integrity checksum mismatch')
  }
  if (!report.releaseGate.passed || report.releaseGate.blockingFindingCount > 0) {
    throw new Error(
      `WingSide media release gate blocked by ${report.releaseGate.blockingFindingCount} finding(s)`,
    )
  }
}
