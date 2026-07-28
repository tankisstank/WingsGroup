import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  buildWingsSideD4CPerceptualFingerprint,
  isWingsSideD4CReviewCandidate,
  normalizedDHashDistance,
  rankWingsSideD4CReplacementCandidates,
  sealWingsSideD4CRejectedNearDuplicates,
  validateWingsSideD4CReplacementMapping,
  validateWingsSideD4CZoomIndexCoverage,
  type WingsSideD4CReplacementMapping,
  type WingsSideD4CZoomIndex,
} from '../../scripts/lib/wingsSideTourMediaD4CReplacements'
import type { WingsSideD4CSourceAsset } from '../../scripts/lib/wingsSideTourMediaD4C'

const asset = (
  sha256: string,
  tourSlug: string,
  fieldPath: string,
  mediaID: number,
): WingsSideD4CSourceAsset => ({
  byteLength: 10,
  filenames: [`${sha256}.jpg`],
  height: 450,
  mediaIDs: [mediaID],
  mimeTypes: ['image/jpeg'],
  references: [{ fieldPath, mediaID, tourID: 1, tourSlug }],
  sha256,
  width: 800,
})

describe('WingSide D4-C governed replacement analysis', () => {
  it('builds deterministic fingerprints and validates distance inputs', () => {
    const pixels = Uint8Array.from({ length: 64 * 64 }, (_, index) => index % 256)
    const first = buildWingsSideD4CPerceptualFingerprint(pixels)
    const second = buildWingsSideD4CPerceptualFingerprint(pixels)
    expect(first).toEqual(second)
    expect(first.fullDHash).toHaveLength(64)
    expect(normalizedDHashDistance(first.fullDHash, second.fullDHash)).toBe(0)
    expect(() => normalizedDHashDistance('abc', 'def0')).toThrow('equal-length')
  })

  it('prefers same-tour, same-role, compatible candidates deterministically', () => {
    const source = asset('a'.repeat(64), 'tour-a', 'gallery[4]', 1)
    const sameTour = asset('b'.repeat(64), 'tour-a', 'gallery[5]', 2)
    const otherTour = asset('c'.repeat(64), 'tour-b', 'gallery[4]', 3)
    const fingerprints = new Map([
      [source.sha256, { centerDHash: '0'.repeat(64), fullDHash: '0'.repeat(64) }],
      [sameTour.sha256, { centerDHash: '0'.repeat(64), fullDHash: '0'.repeat(64) }],
      [otherTour.sha256, { centerDHash: '0'.repeat(64), fullDHash: '0'.repeat(64) }],
    ])
    const ranked = rankWingsSideD4CReplacementCandidates({
      cleanAssets: [otherTour, sameTour],
      fingerprints,
      source,
    })
    expect(ranked.map(({ candidateSha256 }) => candidateSha256)).toEqual([
      sameTour.sha256,
      otherTour.sha256,
    ])
    expect(ranked[0]).toMatchObject({
      sameRole: true,
      sameTour: true,
      slotDistance: 1,
    })
    expect(isWingsSideD4CReviewCandidate(ranked[0]!)).toBe(true)
    expect(isWingsSideD4CReviewCandidate(ranked[1]!)).toBe(false)
  })

  it('rejects visually distant or aspect-incompatible automatic review candidates', () => {
    const base = {
      aspectDelta: 0,
      candidateMediaIDs: [2],
      candidateSha256: 'b'.repeat(64),
      centerDistance: 0.1,
      fullDistance: 0.1,
      sameRole: true,
      sameTour: true,
      score: 0.1,
      slotDistance: 1,
    }
    expect(isWingsSideD4CReviewCandidate(base)).toBe(true)
    expect(isWingsSideD4CReviewCandidate({ ...base, aspectDelta: 0.2 })).toBe(false)
    expect(isWingsSideD4CReviewCandidate({ ...base, centerDistance: 0.3 })).toBe(false)
    expect(isWingsSideD4CReviewCandidate({ ...base, sameTour: false })).toBe(false)
  })

  it('rejects duplicate, missing, and extra zoom-index entries', () => {
    const hashes = ['a'.repeat(64), 'b'.repeat(64), 'c'.repeat(64)]
    const base: WingsSideD4CZoomIndex = {
      assets: hashes.map((sourceSha256) => ({ sourceSha256 })),
      priorCleanHashCount: hashes.length,
      sheets: Array.from({ length: 25 }, (_, index) => ({
        byteLength: 1,
        path: `sheet-${index}.jpg`,
        sha256: 'd'.repeat(64),
      })),
      sourceSnapshotSha256: 'e'.repeat(64),
    }
    const validate = (zoomIndex: WingsSideD4CZoomIndex) =>
      validateWingsSideD4CZoomIndexCoverage({
        expectedHashes: new Set(hashes),
        sourceSnapshotSha256: 'e'.repeat(64),
        zoomIndex,
      })
    expect(() =>
      validate({
        ...base,
        assets: [base.assets![0]!, base.assets![0]!, base.assets![2]!],
      }),
    ).toThrow('coverage is invalid')
    expect(() => validate({ ...base, assets: base.assets!.slice(0, 2) })).toThrow(
      'coverage is invalid',
    )
    expect(() =>
      validate({
        ...base,
        assets: [...base.assets!.slice(0, 2), { sourceSha256: 'f'.repeat(64) }],
      }),
    ).toThrow('coverage is invalid')
  })

  it('rejects mappings to R4 positives and tampered rejected-pair evidence', () => {
    const source = asset('a'.repeat(64), 'tour-a', 'gallery[1]', 1)
    const rejectedCandidate = asset('b'.repeat(64), 'tour-a', 'gallery[2]', 2)
    const cleanCandidate = asset('c'.repeat(64), 'tour-a', 'gallery[3]', 3)
    const assetsByHash = new Map(
      [source, rejectedCandidate, cleanCandidate].map((entry) => [entry.sha256, entry]),
    )
    const supersedingDispositionByHash = new Map<
      string,
      'clean' | 'watermark-positive'
    >([
      [source.sha256, 'watermark-positive'],
      [rejectedCandidate.sha256, 'watermark-positive'],
      [cleanCandidate.sha256, 'clean'],
    ])
    const mapping: WingsSideD4CReplacementMapping = {
      applyContract: {
        mode: 'no-write-candidate-map',
        preserveSourceMediaIDs: true,
        productionWrite: false,
        sourceMediaWrite: false,
      },
      candidates: [],
      coverage: {
        acceptedCandidateCount: 0,
        blockedPositiveCount: 2,
        exactDuplicateAcceptedCount: 0,
        manuallyRejectedNearDuplicateCount: 1,
        nearDuplicateAcceptedCount: 0,
        reclassifiedFalseNegativeCount: 1,
        revalidatedCleanCount: 1,
      },
      rejectedNearDuplicates: [
        {
          candidateMediaIDs: rejectedCandidate.mediaIDs,
          candidateSha256: rejectedCandidate.sha256,
          confidence: 'rejected',
          matchType: 'near-duplicate',
          reason: 'Visible watermark.',
          sourceMediaIDs: source.mediaIDs,
          sourceSha256: source.sha256,
        },
      ],
      rejectedNearDuplicateDecisionSha256: '',
      sourceSnapshotSha256: 'd'.repeat(64),
    }
    mapping.rejectedNearDuplicateDecisionSha256 =
      sealWingsSideD4CRejectedNearDuplicates(mapping.rejectedNearDuplicates!)
    const expectedRejectedNearDuplicates = structuredClone(
      mapping.rejectedNearDuplicates!,
    )
    const validate = (candidate: WingsSideD4CReplacementMapping) =>
      validateWingsSideD4CReplacementMapping({
        assetsByHash,
        expectedRejectedNearDuplicates,
        mapping: candidate,
        reclassifiedFalseNegativeCount: 1,
        sourceSnapshotSha256: 'd'.repeat(64),
        supersedingDispositionByHash,
      })
    expect(() => validate(mapping)).not.toThrow()
    expect(() =>
      validate({
        ...mapping,
        candidates: [
          {
            candidateMediaIDs: rejectedCandidate.mediaIDs,
            candidateSha256: rejectedCandidate.sha256,
            sourceMediaIDs: source.mediaIDs,
            sourceSha256: source.sha256,
          },
        ],
      }),
    ).toThrow('unbound candidate')
    expect(() =>
      validate({
        ...mapping,
        rejectedNearDuplicates: [
          { ...mapping.rejectedNearDuplicates![0]!, candidateMediaIDs: [999] },
        ],
      }),
    ).toThrow('unbound candidate')
    expect(() =>
      validate({
        ...mapping,
        coverage: { ...mapping.coverage, manuallyRejectedNearDuplicateCount: 0 },
      }),
    ).toThrow('coverage is invalid')
    const substitutedPair = {
      ...mapping.rejectedNearDuplicates![0]!,
      candidateMediaIDs: source.mediaIDs,
      candidateSha256: source.sha256,
      sourceMediaIDs: rejectedCandidate.mediaIDs,
      sourceSha256: rejectedCandidate.sha256,
    }
    expect(() =>
      validate({
        ...mapping,
        rejectedNearDuplicateDecisionSha256:
          sealWingsSideD4CRejectedNearDuplicates([substitutedPair]),
        rejectedNearDuplicates: [substitutedPair],
      }),
    ).toThrow('sealed exact set')
    expect(() =>
      validate({
        ...mapping,
        rejectedNearDuplicateDecisionSha256:
          sealWingsSideD4CRejectedNearDuplicates([]),
        rejectedNearDuplicates: [],
      }),
    ).toThrow('sealed exact set')
    expect(() =>
      validate({
        ...mapping,
        rejectedNearDuplicateDecisionSha256:
          sealWingsSideD4CRejectedNearDuplicates([
            ...mapping.rejectedNearDuplicates!,
            substitutedPair,
          ]),
        rejectedNearDuplicates: [
          ...mapping.rejectedNearDuplicates!,
          substitutedPair,
        ],
      }),
    ).toThrow('sealed exact set')
    expect(() =>
      validate({
        ...mapping,
        rejectedNearDuplicates: [
          {
            ...mapping.rejectedNearDuplicates![0]!,
            reason: 'Tampered reason.',
          },
        ],
      }),
    ).toThrow('sealed exact set')
    expect(() =>
      validate({
        ...mapping,
        rejectedNearDuplicates: [
          {
            ...mapping.rejectedNearDuplicates![0]!,
            confidence: undefined,
          },
        ],
      }),
    ).toThrow('record is invalid')
  })

  it('does not persist a machine-specific absolute source path in R4 evidence', () => {
    const evidenceRoot = path.resolve(
      process.cwd(),
      '../docs/stories/epics/E08-wingsside-inbound-upgrade/US-055-real-tour-why-travel/evidence/wp2-media/r4',
    )
    for (const filename of ['README.md', 'candidate-ranking.json']) {
      const contents = readFileSync(path.join(evidenceRoot, filename), 'utf8')
      expect(contents).not.toMatch(/[A-Za-z]:\\(?:repo|temp)\\/u)
      expect(contents).not.toContain(
        ['E:', 'repo', 'WingsTravel', 'app', 'public', 'media'].join('\\'),
      )
    }
  })
})
