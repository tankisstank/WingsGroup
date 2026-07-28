import { describe, expect, it } from 'vitest'

import {
  buildWingsSideD4CPerceptualFingerprint,
  isWingsSideD4CReviewCandidate,
  normalizedDHashDistance,
  rankWingsSideD4CReplacementCandidates,
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
})
