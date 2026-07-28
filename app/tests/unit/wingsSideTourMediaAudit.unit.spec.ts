import { describe, expect, it } from 'vitest'

import {
  assertWingsSideTourMediaReleaseGate,
  buildWingsSideTourMediaAuditReport,
  collectWingsSideTourMediaReferences,
  wingsSideTourMediaAuditChecksum,
  type NormalizedMediaAuditInput,
  type NormalizedTourMediaAuditInput,
  type WingsSideTourMediaManifest,
} from '../../scripts/lib/wingsSideTourMediaAudit'

const hash = (character: string) => character.repeat(64)
const reviewedAt = '2026-07-28T04:00:00.000Z'
const cleanMedia = (id: string, overrides: Partial<NormalizedMediaAuditInput> = {}) => ({
  checksum: hash('a'),
  dimensions: { height: 900, width: 1600 },
  filename: `${id}.jpg`,
  id,
  kind: 'image' as const,
  manualReview: {
    artifactSha256: hash('e'),
    reviewedAt,
    reviewerID: 'reviewer-01',
    state: 'passed' as const,
  },
  ocr: {
    engine: 'fixture-ocr',
    engineVersion: '1.0.0',
    frameHashes: [hash('b')],
    runAt: reviewedAt,
    state: 'pass' as const,
    text: 'mountains and river',
  },
  provenance: {
    approvedAt: reviewedAt,
    approvedBy: 'rights-reviewer-01',
    licenseReference: 'rights-ledger:fixture',
    licenseType: 'owned' as const,
    owner: 'WingsGroup',
    publicUseApproved: true,
    sourceReference: 'asset-library:fixture',
  },
  ...overrides,
})

const manifest = (): WingsSideTourMediaManifest => ({
  schemaVersion: 1,
  tours: Array.from({ length: 22 }, (_, index) => ({
    tourID: index + 1,
    tourSlug: `tour-${index + 1}`,
  })),
})
const cleanTours = (): NormalizedTourMediaAuditInput[] =>
  manifest().tours.map(({ tourID, tourSlug }, index) => ({
    heroMedia: cleanMedia(`media-${index + 1}`),
    tourID,
    tourSlug,
  }))
const build = (
  tours: NormalizedTourMediaAuditInput[] = cleanTours(),
  canonical: WingsSideTourMediaManifest = manifest(),
) => buildWingsSideTourMediaAuditReport({ manifest: canonical, tours })

describe('WingSide tour media audit corrective gate', () => {
  it('collects every governed media location', () => {
    const tour = cleanTours()[0]!
    const media = cleanMedia('location')
    Object.assign(tour, {
      gallery: [media],
      itineraryDays: [{ gallery: [media], media }],
      marketCard: { thumbnailOverride: media },
      meta: { image: media },
      relatedCardMedia: [media],
      routeViz: { mapImage: media },
    })
    expect(
      collectWingsSideTourMediaReferences([tour]).map(({ reference }) => reference.fieldPath),
    ).toEqual([
      'gallery[0]',
      'heroMedia',
      'itineraryDays[0].gallery[0]',
      'itineraryDays[0].media',
      'marketCard.thumbnailOverride',
      'meta.image',
      'relatedCardMedia[0]',
      'routeViz.mapImage',
    ])
  })

  it('rejects the reviewer false-pass for an empty inventory', () => {
    const report = build([])
    expect(report.releaseGate.passed).toBe(false)
    expect(report.coverage).toMatchObject({ matchedTourCount: 0, missingTourCount: 22 })
    expect(() => assertWingsSideTourMediaReleaseGate(report, manifest())).toThrow(
      'coverage mismatch',
    )
  })

  it.each([
    ['partial', cleanTours().slice(0, 21), 'missing-tour'],
    [
      'extra',
      [
        ...cleanTours(),
        { heroMedia: cleanMedia('extra'), tourID: 23, tourSlug: 'tour-23' },
      ],
      'extra-tour',
    ],
    [
      'mismatched identity',
      cleanTours().map((tour, index) =>
        index === 0 ? { ...tour, tourSlug: 'tour-2' } : tour,
      ),
      'mismatched-tour-identity',
    ],
  ])('rejects %s exact-22 coverage', (_label, tours, findingCode) => {
    const report = build(tours)
    expect(report.findings.map(({ code }) => code)).toContain(findingCode)
    expect(report.releaseGate.passed).toBe(false)
  })

  it.each([
    [
      'duplicate input ID',
      cleanTours().map((tour, index) => (index === 1 ? { ...tour, tourID: 1 } : tour)),
      'duplicate-input-tour-id',
    ],
    [
      'duplicate input slug',
      cleanTours().map((tour, index) =>
        index === 1 ? { ...tour, tourSlug: 'tour-1' } : tour,
      ),
      'duplicate-input-tour-slug',
    ],
  ])('rejects %s', (_label, tours, findingCode) => {
    expect(build(tours).findings.map(({ code }) => code)).toContain(findingCode)
  })

  it.each([
    [
      'wrong cardinality',
      { schemaVersion: 1 as const, tours: manifest().tours.slice(0, 21) },
      'invalid-manifest-cardinality',
    ],
    [
      'duplicate manifest ID',
      {
        schemaVersion: 1 as const,
        tours: manifest().tours.map((tour, index) =>
          index === 1 ? { ...tour, tourID: 1 } : tour,
        ),
      },
      'duplicate-manifest-tour-id',
    ],
    [
      'duplicate manifest slug',
      {
        schemaVersion: 1 as const,
        tours: manifest().tours.map((tour, index) =>
          index === 1 ? { ...tour, tourSlug: 'tour-1' } : tour,
        ),
      },
      'duplicate-manifest-tour-slug',
    ],
    [
      'blank manifest identity',
      {
        schemaVersion: 1 as const,
        tours: manifest().tours.map((tour, index) =>
          index === 1 ? { ...tour, tourSlug: ' ' } : tour,
        ),
      },
      'invalid-manifest-identity',
    ],
  ])('rejects canonical manifest with %s', (_label, canonical, findingCode) => {
    expect(build(cleanTours(), canonical).findings.map(({ code }) => code)).toContain(findingCode)
  })

  it('rejects a canonical tour with no media references', () => {
    const tours = cleanTours()
    tours[0] = { tourID: 1, tourSlug: 'tour-1' }
    expect(build(tours).findings.map(({ code }) => code)).toContain('no-media-references')
  })

  it('keeps legitimate identical multi-reference reuse clean and nonblocking', () => {
    const tours = cleanTours()
    tours[1]!.heroMedia = tours[0]!.heroMedia
    const report = build(tours)
    expect(report.assets.find(({ identity }) => identity === 'media:media-1')?.references).toHaveLength(
      2,
    )
    expect(report.findings).toEqual([])
    expect(() => assertWingsSideTourMediaReleaseGate(report, manifest())).not.toThrow()
  })

  it.each([
    ['OCR hit', { ocr: { ...cleanMedia('x').ocr!, state: 'hit' as const } }],
    ['OCR unknown', { ocr: { ...cleanMedia('x').ocr!, state: 'unknown' as const } }],
    [
      'manual failure',
      { manualReview: { ...cleanMedia('x').manualReview!, state: 'failed' as const } },
    ],
    ['dimensions', { dimensions: { height: 1, width: 1 } }],
    ['kind', { kind: 'video' as const, videoSamples: [] }],
    ['source', { filename: 'different.jpg' }],
    ['checksum', { checksum: hash('c') }],
    [
      'video samples',
      {
        kind: 'video' as const,
        videoSamples: [{ frameHash: hash('d'), position: 'scene' as const }],
      },
    ],
  ])('blocks conflicting reused-ID evidence: %s', (_label, override) => {
    const tours = cleanTours()
    tours[1]!.heroMedia = { ...cleanMedia('media-1'), ...override }
    const report = build(tours)
    expect(report.findings.map(({ code }) => code)).toContain('conflicting-evidence')
    expect(report.releaseGate.passed).toBe(false)
  })

  it('blocks adverse reused-ID evidence regardless of input order', () => {
    const clean = cleanMedia('shared')
    const adverse = {
      ...cleanMedia('shared'),
      manualReview: {
        ...cleanMedia('shared').manualReview!,
        state: 'failed' as const,
      },
      ocr: { ...cleanMedia('shared').ocr!, state: 'hit' as const },
    }
    const forward = cleanTours()
    forward[0]!.heroMedia = clean
    forward[1]!.heroMedia = adverse
    const reverse = cleanTours()
    reverse[0]!.heroMedia = adverse
    reverse[1]!.heroMedia = clean

    for (const report of [build(forward), build(reverse)]) {
      expect(report.findings.map(({ code }) => code)).toEqual(
        expect.arrayContaining([
          'conflicting-evidence',
          'manual-review-failed',
          'ocr-source-brand-hit',
        ]),
      )
      expect(report.releaseGate.passed).toBe(false)
    }
  })

  it('requires lowercase SHA-256 and complete OCR/reviewer metadata', () => {
    const tours = cleanTours()
    tours[0]!.heroMedia = cleanMedia('bad', {
      checksum: 'ABC',
      manualReview: { state: 'passed' },
      ocr: { frameHashes: ['ABC'], state: 'pass' },
    })
    const codes = build(tours).findings.map(({ code }) => code)
    expect(codes).toContain('invalid-checksum')
    expect(codes).toContain('missing-evidence-metadata')
  })

  it('requires frame hashes for video sample evidence', () => {
    const tours = cleanTours()
    tours[0]!.heroMedia = cleanMedia('video', { filename: 'video.mp4', kind: 'video' })
    const report = build(tours)
    expect(
      report.assets
        .find(({ identity }) => identity === 'media:video')
        ?.observations[0]?.videoSamples.map(({ position }) => position),
    ).toEqual(['start', 'middle', 'end'])
    expect(report.findings.map(({ code }) => code)).toContain('missing-evidence-metadata')
  })

  it('is deterministic under tour order reversal', () => {
    expect(build(cleanTours())).toEqual(build([...cleanTours()].reverse()))
  })

  it('rejects aggregate report tampering and manifest substitution', () => {
    const report = build()
    report.assets[0]!.observations[0]!.filename = 'tampered.jpg'
    expect(() => assertWingsSideTourMediaReleaseGate(report, manifest())).toThrow(
      'integrity checksum mismatch',
    )

    const cleanReport = build()
    const substituted = manifest()
    substituted.tours[0] = { tourID: 1, tourSlug: 'substituted' }
    expect(() => assertWingsSideTourMediaReleaseGate(cleanReport, substituted)).toThrow(
      'manifest checksum mismatch',
    )
  })

  it('rejects duplicate canonical identities and a forged gate summary at assertion time', () => {
    const duplicate = manifest()
    duplicate.tours[1] = { ...duplicate.tours[1]!, tourID: 1 }
    const duplicateReport = build(cleanTours(), duplicate)
    expect(() => assertWingsSideTourMediaReleaseGate(duplicateReport, duplicate)).toThrow(
      'manifest identities are invalid',
    )

    const forged = build()
    forged.releaseGate = { blockingFindingCount: 1, passed: false }
    const { aggregateChecksum: _checksum, ...body } = forged
    forged.aggregateChecksum = wingsSideTourMediaAuditChecksum(body)
    expect(() => assertWingsSideTourMediaReleaseGate(forged, manifest())).toThrow(
      'release-gate summary mismatch',
    )
  })

  it('labels the output as evidence manifest verification, not OCR execution', () => {
    expect(build().evidenceContract).toBe('manifest-verification-only')
  })
})
