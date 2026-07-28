import { describe, expect, it } from 'vitest'

import {
  assertWingsSideTourMediaReleaseGate,
  buildWingsSideTourMediaAuditReport,
  collectWingsSideTourMediaReferences,
  type NormalizedMediaAuditInput,
  type NormalizedTourMediaAuditInput,
} from '../../scripts/lib/wingsSideTourMediaAudit'

const cleanMedia = (id: string, overrides: Partial<NormalizedMediaAuditInput> = {}) => ({
  checksum: `sha256-${id}`,
  dimensions: { height: 900, width: 1600 },
  filename: `${id}.jpg`,
  id,
  kind: 'image' as const,
  manualReview: { state: 'passed' as const },
  ocr: { state: 'pass' as const, text: 'mountains and river' },
  ...overrides,
})

const allLocationsTour = (): NormalizedTourMediaAuditInput => ({
  gallery: [cleanMedia('gallery')],
  heroMedia: cleanMedia('hero'),
  itineraryDays: [
    {
      gallery: [cleanMedia('day-gallery')],
      media: cleanMedia('day-media'),
    },
  ],
  marketCard: { thumbnailOverride: cleanMedia('market') },
  meta: { image: cleanMedia('meta') },
  relatedCardMedia: [cleanMedia('related')],
  routeViz: { mapImage: cleanMedia('route') },
  tourID: 22,
  tourSlug: 'sample-tour',
})

describe('WingSide tour media audit', () => {
  it('collects every governed tour media location', () => {
    expect(
      collectWingsSideTourMediaReferences([allLocationsTour()]).map(
        ({ reference }) => reference.fieldPath,
      ),
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

  it('deduplicates by stable media ID and retains every reference', () => {
    const shared = cleanMedia('shared')
    const report = buildWingsSideTourMediaAuditReport({
      tours: [
        { heroMedia: shared, tourID: 1, tourSlug: 'alpha' },
        { meta: { image: shared }, tourID: 2, tourSlug: 'beta' },
      ],
    })

    expect(report.assets).toHaveLength(1)
    expect(report.assets[0]?.references).toHaveLength(2)
    expect(report.findings.map(({ code }) => code)).toEqual(['duplicate-identity'])
    expect(report.releaseGate).toEqual({ blockingFindingCount: 0, passed: true })
  })

  it('returns deterministic sorting and aggregate checksums', () => {
    const alpha = { heroMedia: cleanMedia('alpha'), tourID: 1, tourSlug: 'alpha' }
    const beta = { heroMedia: cleanMedia('beta'), tourID: 2, tourSlug: 'beta' }
    const first = buildWingsSideTourMediaAuditReport({ tours: [beta, alpha] })
    const second = buildWingsSideTourMediaAuditReport({ tours: [alpha, beta] })

    expect(first).toEqual(second)
    expect(first.aggregateChecksum).toMatch(/^[a-f0-9]{64}$/)
  })

  it('creates first, middle and last requirements for video by default', () => {
    const report = buildWingsSideTourMediaAuditReport({
      tours: [
        {
          heroMedia: cleanMedia('video', { filename: 'video.mp4', kind: 'video' }),
          tourID: 1,
          tourSlug: 'video-tour',
        },
      ],
    })

    expect(report.assets[0]?.videoSampleRequirements).toEqual([
      { label: 'first-frame', position: 'start' },
      { label: 'middle-frame', position: 'middle' },
      { label: 'last-frame', position: 'end' },
    ])
  })

  it('preserves and deterministically sorts explicit scene samples', () => {
    const report = buildWingsSideTourMediaAuditReport({
      tours: [
        {
          heroMedia: cleanMedia('video', {
            filename: 'video.mp4',
            kind: 'video',
            videoSamples: [
              { label: 'late-scene', position: 'scene', timestampSeconds: 40 },
              { label: 'early-scene', position: 'scene', timestampSeconds: 5 },
            ],
          }),
          tourID: 1,
          tourSlug: 'video-tour',
        },
      ],
    })

    expect(report.assets[0]?.videoSampleRequirements).toEqual([
      { label: 'early-scene', position: 'scene', timestampSeconds: 5 },
      { label: 'late-scene', position: 'scene', timestampSeconds: 40 },
    ])
  })

  it.each([
    ['explicit hit', { state: 'hit' as const, text: null }],
    ['recognized source brand', { state: 'pass' as const, text: 'BestPrice Travel' }],
  ])('blocks an OCR source-brand finding for %s', (_label, ocr) => {
    const report = buildWingsSideTourMediaAuditReport({
      tours: [
        {
          heroMedia: cleanMedia('ocr', { ocr }),
          tourID: 1,
          tourSlug: 'ocr-tour',
        },
      ],
    })

    expect(report.findings.map(({ code }) => code)).toContain('ocr-source-brand-hit')
    expect(report.releaseGate.passed).toBe(false)
  })

  it.each(['unknown', 'unscanned'] as const)('blocks %s OCR evidence', (state) => {
    const report = buildWingsSideTourMediaAuditReport({
      tours: [
        {
          heroMedia: cleanMedia('ocr', { ocr: { state } }),
          tourID: 1,
          tourSlug: 'ocr-tour',
        },
      ],
    })
    expect(report.findings.map(({ code }) => code)).toContain('ocr-unscanned')
  })

  it('does not flag OCR text after a clean scan', () => {
    const report = buildWingsSideTourMediaAuditReport({
      tours: [{ heroMedia: cleanMedia('clean'), tourID: 1, tourSlug: 'clean-tour' }],
    })
    expect(report.findings).toEqual([])
  })

  it('flags conflicting stable identities', () => {
    const report = buildWingsSideTourMediaAuditReport({
      tours: [
        { heroMedia: cleanMedia('same'), tourID: 1, tourSlug: 'alpha' },
        {
          heroMedia: cleanMedia('same', { filename: 'other.jpg' }),
          tourID: 2,
          tourSlug: 'beta',
        },
      ],
    })
    expect(report.findings.map(({ code }) => code)).toContain('conflicting-identity')
  })

  it('flags missing ID, source, checksum and manual review', () => {
    const report = buildWingsSideTourMediaAuditReport({
      tours: [
        {
          heroMedia: {
            manualReview: { state: 'required', reason: 'Inspect corner marks' },
            ocr: { state: 'pass', text: 'clean' },
          },
          tourID: 1,
          tourSlug: 'incomplete-tour',
        },
      ],
    })
    expect(report.findings.map(({ code }) => code)).toEqual([
      'manual-review-required',
      'missing-checksum',
      'missing-id',
      'missing-source',
    ])
  })

  it('passes a clean release gate and rejects a blocked report', () => {
    const clean = buildWingsSideTourMediaAuditReport({
      tours: [{ heroMedia: cleanMedia('clean'), tourID: 1, tourSlug: 'clean-tour' }],
    })
    expect(() => assertWingsSideTourMediaReleaseGate(clean)).not.toThrow()

    const blocked = buildWingsSideTourMediaAuditReport({
      tours: [
        {
          heroMedia: cleanMedia('blocked', { manualReview: { state: 'not-reviewed' } }),
          tourID: 1,
          tourSlug: 'blocked-tour',
        },
      ],
    })
    expect(() => assertWingsSideTourMediaReleaseGate(blocked)).toThrow(
      'blocked by 1 finding(s)',
    )
  })

  it('rejects a report whose integrity checksum was altered', () => {
    const report = buildWingsSideTourMediaAuditReport({
      tours: [{ heroMedia: cleanMedia('clean'), tourID: 1, tourSlug: 'clean-tour' }],
    })
    report.assets[0]!.filename = 'tampered.jpg'
    expect(() => assertWingsSideTourMediaReleaseGate(report)).toThrow('integrity checksum mismatch')
  })
})
