import { describe, expect, it } from 'vitest'

import {
  buildWingsSideCatalogAuthoringDraft,
  catalogAuthoringChecksum,
  reconcileWingsSideCatalogAuthoringReview,
  type CatalogAuthoringReviewArtifact,
  type ReviewedCatalogRowDecision,
} from '../../scripts/lib/wingsSideTourEditorialCatalogAuthoring'
import {
  editorialPricingApprovalChecksum,
  editorialSourceChecksum,
  wingsSideTourEditorialLocales,
  type EditorialSourceTour,
  type WingsSideTourEditorialCatalog,
  type WingsSideTourEditorialLocaleFile,
  type WingsSideTourEditorialSourceManifest,
} from '../../scripts/lib/wingsSideTourEditorialLocalization'

const slug = 'review-fixture-tour'

const source = (): EditorialSourceTour => ({
  excludes: [],
  includes: Array.from({ length: 38 }, (_, index) => ({
    id: `row-${index + 1}`,
    label: `Peak season surcharge ${index + 1}`,
  })),
  itineraryDays: [],
  slug,
  summary: 'Frozen English source summary for the review fixture.',
  title: 'Frozen English review fixture',
})

const localizedContent = (locale: string) => ({
  excludes: [],
  includes: Array.from({ length: 38 }, (_, index) => `${locale} label ${index + 1}`),
  itineraryDays: [],
  meta: {
    breadcrumbLabel: `${locale} breadcrumb`,
    description: `${locale} localized description`,
    title: `${locale} meta title`,
  },
  primaryCTALabel: `${locale} plan`,
  routeSummary: `${locale} route`,
  servicesSummary: {
    hotelSummary: `${locale} hotel`,
    mealsSummary: `${locale} meals`,
    operatorNotes: `${locale} notes`,
    transportSummary: `${locale} transport`,
  },
  slug,
  summary: `${locale} localized summary`,
  title: `${locale} localized title`,
})

const localeFiles = (): WingsSideTourEditorialLocaleFile[] =>
  wingsSideTourEditorialLocales.map((locale) => ({
    locale,
    tours: [localizedContent(locale)],
    version: 1,
    voice: 'calm-specific-consultative',
  }))

const manifest = (tour = source()): WingsSideTourEditorialSourceManifest => ({
  generatedFrom: 'wing-side-published-en-tour-products',
  sourceLocale: 'en',
  tours: [{ checksum: editorialSourceChecksum(tour), slug }],
  version: 1,
})

const decisions = (): ReviewedCatalogRowDecision[] =>
  Array.from({ length: 38 }, (_, index) => ({
    labels: Object.fromEntries(
      wingsSideTourEditorialLocales.map((locale) => [locale, `${locale} approved ${index + 1}`]),
    ) as ReviewedCatalogRowDecision['labels'],
    positionalMappingReviewed: true,
    rationale: `Approved governed disclosure ${index + 1}`,
    slug,
    sourceLabelChecksum: catalogAuthoringDraft().tours[0]!.rows[index]!.sourceLabelChecksum,
    sourceRowID: `row-${index + 1}`,
    targetBucket: 'includes',
  }))

const catalogAuthoringDraft = () =>
  buildWingsSideCatalogAuthoringDraft({
    localeFiles: localeFiles(),
    sourceManifest: manifest(),
    sourceTours: [source()],
  })

const review = (): CatalogAuthoringReviewArtifact => {
  const draft = catalogAuthoringDraft()
  const rowDecisions = decisions()
  const approvalManifest = {
    approvalArtifactID: 'external-review-artifact-1',
    approvedAt: '2026-07-28T00:00:00.000Z',
    approvedBy: 'trusted-reviewer',
    checksum: '',
    expectedPricingDisclosureCount: 38,
    trustedApprovers: ['trusted-reviewer'],
    version: 1 as const,
  }
  const candidate: WingsSideTourEditorialCatalog = {
    approvalManifest,
    pricingDispositions: draft.tours[0]!.rows.map((row, index) => ({
      approvalArtifactID: approvalManifest.approvalArtifactID,
      approvedAt: approvalManifest.approvedAt,
      approvedBy: approvalManifest.approvedBy,
      approvedTargetBucket: 'includes',
      rationale: rowDecisions[index]!.rationale,
      slug,
      sourceBucket: 'includes',
      sourceLabel: row.sourceLabel,
      sourceLabelChecksum: row.sourceLabelChecksum,
      sourceRowID: row.sourceRowID,
    })),
    sourceLocale: 'en',
    targetLocales: [...wingsSideTourEditorialLocales],
    tours: [
      {
        locales: Object.fromEntries(
          wingsSideTourEditorialLocales.map((locale) => [
            locale,
            {
              ...localizedContent(locale),
              excludes: [],
              includes: rowDecisions.map((decision) => ({
                label: decision.labels[locale],
                sourceRowID: decision.sourceRowID,
                targetBucket: 'includes',
              })),
            },
          ]),
        ) as unknown as WingsSideTourEditorialCatalog['tours'][number]['locales'],
        slug,
        sourceChecksum: editorialSourceChecksum(source()),
      },
    ],
    version: 2,
  }
  approvalManifest.checksum = editorialPricingApprovalChecksum(candidate)
  return {
    approvalManifest,
    decisions: rowDecisions,
    draftPacketChecksum: draft.packetChecksum,
    version: 1,
  }
}

describe('WingSide catalog-v2 authoring and reconciliation', () => {
  it('builds a deterministic draft with 38 governed rows and unresolved positional flags', () => {
    const first = catalogAuthoringDraft()
    const second = catalogAuthoringDraft()
    expect(first).toEqual(second)
    expect(first.status).toBe('DRAFT_REVIEW_REQUIRED')
    expect(first.governedDisclosureCount).toBe(38)
    expect(first.tours[0]!.rows).toHaveLength(38)
    expect(first.tours[0]!.rows.every(({ missingDisposition }) => missingDisposition)).toBe(true)
    expect(first.blockingFlags).toContain(
      'positional-mapping-review-required:review-fixture-tour:row-1',
    )
    expect(first.packetChecksum).toMatch(/^[a-f0-9]{64}$/u)
  })

  it('surfaces missing legacy labels without inventing replacements', () => {
    const files = localeFiles()
    files[0]!.tours[0]!.includes[0] = ''
    const draft = buildWingsSideCatalogAuthoringDraft({
      localeFiles: files,
      sourceManifest: manifest(),
      sourceTours: [source()],
    })
    expect(draft.tours[0]!.rows[0]!.legacySuggestions.vi.label).toBeNull()
    expect(draft.blockingFlags).toContain('missing-legacy-label:vi:review-fixture-tour:row-1')
  })

  it('fails closed on source drift and duplicate stable row IDs', () => {
    const drifted = source()
    drifted.title = 'Changed after manifest'
    expect(() =>
      buildWingsSideCatalogAuthoringDraft({
        localeFiles: localeFiles(),
        sourceManifest: manifest(),
        sourceTours: [drifted],
      }),
    ).toThrow('source inventory drifted')

    const duplicate = source()
    duplicate.includes![1]!.id = duplicate.includes![0]!.id
    expect(() =>
      buildWingsSideCatalogAuthoringDraft({
        localeFiles: localeFiles(),
        sourceManifest: manifest(duplicate),
        sourceTours: [duplicate],
      }),
    ).toThrow('Duplicate sourceRowID')
  })

  it('reconciles only complete externally approved row decisions', () => {
    const draft = catalogAuthoringDraft()
    const artifact = review()
    const result = reconcileWingsSideCatalogAuthoringReview({
      draft,
      localeFiles: localeFiles(),
      review: artifact,
      sourceManifest: manifest(),
      sourceTours: [source()],
      trustedApprovers: ['trusted-reviewer'],
    })
    expect(result.candidate.version).toBe(2)
    expect(result.candidate.pricingDispositions).toHaveLength(38)
    expect(result.summary).toEqual({
      bucketMoves: 0,
      governedDispositions: 38,
      labelChangesFromLegacySuggestion: 152,
      reviewedRows: 38,
    })
    expect(result.candidateChecksum).toBe(catalogAuthoringChecksum(result.candidate))
  })

  it('rejects ambiguity, missing labels, stale approval and untrusted approvers', () => {
    const draft = catalogAuthoringDraft()

    const staleDraft = structuredClone(draft)
    staleDraft.tours[0]!.rows[0]!.sourceLabel = 'Changed after draft checksum'
    expect(() =>
      reconcileWingsSideCatalogAuthoringReview({
        draft: staleDraft,
        localeFiles: localeFiles(),
        review: review(),
        sourceManifest: manifest(),
        sourceTours: [source()],
        trustedApprovers: ['trusted-reviewer'],
      }),
    ).toThrow('stale or tampered')

    const ambiguous = review()
    ambiguous.decisions[0]!.positionalMappingReviewed = false as true
    expect(() =>
      reconcileWingsSideCatalogAuthoringReview({
        draft,
        localeFiles: localeFiles(),
        review: ambiguous,
        sourceManifest: manifest(),
        sourceTours: [source()],
        trustedApprovers: ['trusted-reviewer'],
      }),
    ).toThrow('Incomplete or ambiguous')

    const duplicated = review()
    duplicated.decisions[37] = { ...duplicated.decisions[0]! }
    expect(() =>
      reconcileWingsSideCatalogAuthoringReview({
        draft,
        localeFiles: localeFiles(),
        review: duplicated,
        sourceManifest: manifest(),
        sourceTours: [source()],
        trustedApprovers: ['trusted-reviewer'],
      }),
    ).toThrow('every source row exactly once')

    const missing = review()
    missing.decisions[0]!.labels.pt = ''
    expect(() =>
      reconcileWingsSideCatalogAuthoringReview({
        draft,
        localeFiles: localeFiles(),
        review: missing,
        sourceManifest: manifest(),
        sourceTours: [source()],
        trustedApprovers: ['trusted-reviewer'],
      }),
    ).toThrow('Incomplete or ambiguous')

    const stale = review()
    stale.approvalManifest.checksum = '0'.repeat(64)
    expect(() =>
      reconcileWingsSideCatalogAuthoringReview({
        draft,
        localeFiles: localeFiles(),
        review: stale,
        sourceManifest: manifest(),
        sourceTours: [source()],
        trustedApprovers: ['trusted-reviewer'],
      }),
    ).toThrow('approval checksum')

    expect(() =>
      reconcileWingsSideCatalogAuthoringReview({
        draft,
        localeFiles: localeFiles(),
        review: review(),
        sourceManifest: manifest(),
        sourceTours: [source()],
        trustedApprovers: ['different-reviewer'],
      }),
    ).toThrow('external trusted approver policy')
  })
})
