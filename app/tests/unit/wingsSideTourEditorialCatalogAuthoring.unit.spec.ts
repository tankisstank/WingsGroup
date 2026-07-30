import { createHash, generateKeyPairSync, sign } from 'node:crypto'
import { resolve } from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import {
  assertCatalogAuthoringCLITrustBoundary,
  resolveProtectedCatalogAuthoringPath,
  resolveProtectedCatalogAuthoringValue,
} from '../../scripts/generate-wingsside-tour-editorial-catalog-v2'
import {
  buildWingsSideCatalogAuthoringDraft,
  catalogAuthoringChecksum,
  catalogAuthoringReviewSigningDigest,
  parseCatalogAuthoringReviewArtifact,
  readFrozenCatalogAuthoringArtifact,
  reconcileWingsSideCatalogAuthoringReview,
  wingsSideCatalogDevelopmentTeamApprovalPolicy,
  type CatalogAuthoringReviewArtifact,
  type CatalogAuthoringLocaleArtifact,
  type CatalogAuthoringSourceManifest,
  type CatalogAuthoringSourceTour,
  type ReviewedCatalogRowDecision,
} from '../../scripts/lib/wingsSideTourEditorialCatalogAuthoring'
import {
  editorialPricingApprovalChecksum,
  editorialServiceLabelChecksum,
  editorialSourceChecksum,
  wingsSideTourEditorialLocales,
  type WingsSideTourEditorialCatalog,
  type WingsSideTourEditorialLocaleFile,
} from '../../scripts/lib/wingsSideTourEditorialLocalization'

const sha256 = (value: string | Buffer) => createHash('sha256').update(value).digest('hex')
const slugs = Array.from({ length: 22 }, (_, index) => `review-fixture-tour-${index + 1}`)
const approvalKeys = generateKeyPairSync('ed25519')
const approvalKeyID = 'development-team-catalog-key-01'
const approvalPublicKeySpkiBase64 = approvalKeys.publicKey
  .export({ format: 'der', type: 'spki' })
  .toString('base64')

const signReviewArtifact = (artifact: CatalogAuthoringReviewArtifact) => {
  artifact.signature.valueBase64 = sign(
    null,
    Buffer.from(catalogAuthoringReviewSigningDigest(artifact), 'utf8'),
    approvalKeys.privateKey,
  ).toString('base64')
  return artifact
}

const sourceTours = (): CatalogAuthoringSourceTour[] =>
  slugs.map((slug, tourIndex) => ({
    excludes: [],
    includes:
      tourIndex === 0
        ? Array.from({ length: 38 }, (_, index) => ({
            id: `row-${index + 1}`,
            label: `Peak season surcharge ${index + 1}`,
          }))
        : [],
    itineraryDays: [],
    slug,
    summary: `Frozen English source summary for ${slug}.`,
    title: `Frozen English ${slug}`,
    tourID: tourIndex + 1,
  }))

const localizedContent = (locale: string, slug: string, rowCount: number) => ({
  excludes: [],
  includes: Array.from({ length: rowCount }, (_, index) => `${locale} label ${index + 1}`),
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
    tours: slugs.map((slug, index) => localizedContent(locale, slug, index === 0 ? 38 : 0)),
    version: 1,
    voice: 'calm-specific-consultative',
  }))

const freeze = <T>(value: T): Readonly<T> => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const child of Object.values(value as Record<string, unknown>)) freeze(child)
  }
  return value
}

const localeArtifacts = (
  files = localeFiles(),
): CatalogAuthoringLocaleArtifact[] =>
  files.map((file) => {
    const value = freeze(structuredClone(file))
    return {
      contentChecksum: catalogAuthoringChecksum(value),
      locale: file.locale,
      sha256: sha256(Buffer.from(JSON.stringify(file))),
      value,
    }
  })

const manifest = (tours = sourceTours()): CatalogAuthoringSourceManifest => ({
  expectedGovernedDisclosureCount: 38,
  expectedTourCount: 22,
  generatedFrom: 'wing-side-published-en-tour-products',
  siteCode: 'wing-side',
  sourceLocale: 'en',
  tours: tours.map((tour) => ({
    checksum: editorialSourceChecksum(tour),
    governedRows: [...(tour.includes ?? []), ...(tour.excludes ?? [])]
      .filter(({ label }) => /\b(?:peak|high) season\b|\bfuel surcharge\b|\bcompulsory dinner\b/iu.test(label ?? ''))
      .map((row) => ({
        sourceBucket: 'includes' as const,
        sourceLabelChecksum: editorialServiceLabelChecksum(String(row.label)),
        sourceRowID: String(row.id),
      })),
    slug: tour.slug,
    tourID: tour.tourID,
  })),
  version: 2,
})

const manifestDigest = (value = manifest()) => catalogAuthoringChecksum(value)

const draft = () => {
  const sourceManifest = manifest()
  const digest = manifestDigest(sourceManifest)
  return buildWingsSideCatalogAuthoringDraft({
    expectedSourceManifestSha256: digest,
    localeArtifacts: localeArtifacts(),
    sourceManifest,
    sourceManifestArtifactSha256: digest,
    sourceTours: sourceTours(),
  })
}

const decisions = (packet = draft()): ReviewedCatalogRowDecision[] =>
  packet.tours.flatMap(({ rows, slug }) =>
    rows.map((row, index) => ({
      labels: Object.fromEntries(
        wingsSideTourEditorialLocales.map((locale) => [
          locale,
          `${locale} approved ${index + 1}`,
        ]),
      ) as ReviewedCatalogRowDecision['labels'],
      positionalMappingReviewed: true,
      rationale: `Approved governed disclosure ${index + 1}`,
      slug,
      sourceLabelChecksum: row.sourceLabelChecksum,
      sourceRowID: row.sourceRowID,
      targetBucket: row.sourceBucket,
    })),
  )

const review = (): CatalogAuthoringReviewArtifact => {
  const packet = draft()
  const rowDecisions = decisions(packet)
  const approvalManifest = {
    ...wingsSideCatalogDevelopmentTeamApprovalPolicy,
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
    pricingDispositions: packet.tours.flatMap(({ rows, slug }) =>
      rows.map((row) => {
        const decision = rowDecisions.find(
          (entry) => entry.slug === slug && entry.sourceRowID === row.sourceRowID,
        )!
        return {
          approvalArtifactID: approvalManifest.approvalArtifactID,
          approvedAt: approvalManifest.approvedAt,
          approvedBy: approvalManifest.approvedBy,
          approvedTargetBucket: decision.targetBucket,
          rationale: decision.rationale,
          slug,
          sourceBucket: row.sourceBucket,
          sourceLabel: row.sourceLabel,
          sourceLabelChecksum: row.sourceLabelChecksum,
          sourceRowID: row.sourceRowID,
        }
      }),
    ),
    sourceLocale: 'en',
    targetLocales: [...wingsSideTourEditorialLocales],
    tours: packet.tours.map(({ rows, slug, sourceChecksum }) => ({
      locales: Object.fromEntries(
        wingsSideTourEditorialLocales.map((locale) => {
          const content = localizedContent(locale, slug, rows.length)
          const localizedRows = rows.map((row) => {
            const decision = rowDecisions.find(
              (entry) => entry.slug === slug && entry.sourceRowID === row.sourceRowID,
            )!
            return {
              label: decision.labels[locale],
              sourceRowID: row.sourceRowID,
              targetBucket: decision.targetBucket,
            }
          })
          return [
            locale,
            {
              ...content,
              excludes: localizedRows.filter(({ targetBucket }) => targetBucket === 'excludes'),
              includes: localizedRows.filter(({ targetBucket }) => targetBucket === 'includes'),
            },
          ]
        }),
      ) as unknown as WingsSideTourEditorialCatalog['tours'][number]['locales'],
      slug,
      sourceChecksum,
    })),
    version: 2,
  }
  approvalManifest.checksum = editorialPricingApprovalChecksum(candidate)
  const artifact: CatalogAuthoringReviewArtifact = {
    approvalManifest,
    decisions: rowDecisions,
    draftPacketChecksum: packet.packetChecksum,
    fullCandidateChecksum: catalogAuthoringChecksum(candidate),
    signature: {
      algorithm: 'ed25519',
      keyID: approvalKeyID,
      signedAt: approvalManifest.approvedAt,
      signerID: approvalManifest.approvedBy,
      valueBase64: '',
    },
    version: 1,
  }
  return signReviewArtifact(artifact)
}

const reconcile = (artifact = review(), policyApprovers = ['trusted-reviewer']) => {
  const sourceManifest = manifest()
  const sourceDigest = manifestDigest(sourceManifest)
  const reviewDigest = catalogAuthoringChecksum(artifact)
  return reconcileWingsSideCatalogAuthoringReview({
    approvalPolicy: {
      ...wingsSideCatalogDevelopmentTeamApprovalPolicy,
      keyID: approvalKeyID,
      publicKeySpkiBase64: approvalPublicKeySpkiBase64,
      reviewArtifactSha256: reviewDigest,
      trustedSignerIDs: policyApprovers,
    },
    draft: draft(),
    expectedSourceManifestSha256: sourceDigest,
    localeArtifacts: localeArtifacts(),
    review: artifact,
    reviewArtifactSha256: reviewDigest,
    sourceManifest,
    sourceManifestArtifactSha256: sourceDigest,
    sourceTours: sourceTours(),
  })
}

describe('WingSide catalog-v2 canonical authoring and reconciliation', () => {
  it('builds a deterministic exact-22 draft with 38 governed row identities', () => {
    const first = draft()
    expect(first).toEqual(draft())
    expect(first.tours).toHaveLength(22)
    expect(first.governedDisclosureCount).toBe(38)
    expect(first.tours.flatMap(({ rows }) => rows)).toHaveLength(38)
    expect(first.sourceManifestArtifactSha256).toBe(manifestDigest())
    expect(Object.keys(first.localeArtifacts).sort()).toEqual(['es', 'it', 'pt', 'vi'])
    for (const artifact of Object.values(first.localeArtifacts)) {
      expect(artifact.artifactSha256).toMatch(/^[a-f0-9]{64}$/u)
      expect(artifact.contentChecksum).toMatch(/^[a-f0-9]{64}$/u)
    }
  })

  it('rejects the previous one-tour/38-row self-consistent false pass', () => {
    const tours = sourceTours().slice(0, 1)
    const sourceManifest = manifest(tours)
    const digest = manifestDigest(sourceManifest)
    expect(() =>
      buildWingsSideCatalogAuthoringDraft({
        expectedSourceManifestSha256: digest,
        localeArtifacts: localeArtifacts(
          localeFiles().map((file) => ({ ...file, tours: file.tours.slice(0, 1) })),
        ),
        sourceManifest,
        sourceManifestArtifactSha256: digest,
        sourceTours: tours,
      }),
    ).toThrow('exactly 22 tours')
  })

  it('rejects swapped governed row identities even when labels remain valid', () => {
    const sourceManifest = manifest()
    const firstRows = sourceManifest.tours[0]!.governedRows
    ;[firstRows[0]!.sourceRowID, firstRows[1]!.sourceRowID] = [
      firstRows[1]!.sourceRowID,
      firstRows[0]!.sourceRowID,
    ]
    const digest = manifestDigest(sourceManifest)
    expect(() =>
      buildWingsSideCatalogAuthoringDraft({
        expectedSourceManifestSha256: digest,
        localeArtifacts: localeArtifacts(),
        sourceManifest,
        sourceManifestArtifactSha256: digest,
        sourceTours: sourceTours(),
      }),
    ).toThrow('source inventory drifted')
  })

  it('rejects a supplied manifest that does not match the protected digest', () => {
    const sourceManifest = manifest()
    expect(() =>
      buildWingsSideCatalogAuthoringDraft({
        expectedSourceManifestSha256: 'f'.repeat(64),
        localeArtifacts: localeArtifacts(),
        sourceManifest,
        sourceManifestArtifactSha256: manifestDigest(sourceManifest),
        sourceTours: sourceTours(),
      }),
    ).toThrow('protected release policy')
  })

  it('reconciles complete externally governed evidence', () => {
    const result = reconcile()
    expect(result.candidate.tours).toHaveLength(22)
    expect(result.candidate.pricingDispositions).toHaveLength(38)
    expect(result.summary.governedDispositions).toBe(38)
  })

  it('requires the protected review to attest the full candidate checksum', () => {
    const artifact = review()
    artifact.fullCandidateChecksum = 'f'.repeat(64)
    expect(() => reconcile(signReviewArtifact(artifact))).toThrow(
      'Review full candidate checksum does not match the candidate catalog',
    )
  })

  it('rejects D6-C policy substitution and fabricated approval signatures', () => {
    const substituted = review()
    const sourceManifest = manifest()
    const sourceDigest = manifestDigest(sourceManifest)
    const reviewDigest = catalogAuthoringChecksum(substituted)
    expect(() =>
      reconcileWingsSideCatalogAuthoringReview({
        approvalPolicy: {
          ...wingsSideCatalogDevelopmentTeamApprovalPolicy,
          keyID: approvalKeyID,
          policyID: 'self-authored-policy' as never,
          publicKeySpkiBase64: approvalPublicKeySpkiBase64,
          reviewArtifactSha256: reviewDigest,
          trustedSignerIDs: ['trusted-reviewer'],
        },
        draft: draft(),
        expectedSourceManifestSha256: sourceDigest,
        localeArtifacts: localeArtifacts(),
        review: substituted,
        reviewArtifactSha256: reviewDigest,
        sourceManifest,
        sourceManifestArtifactSha256: sourceDigest,
        sourceTours: sourceTours(),
      }),
    ).toThrow('policy substitution')

    const forged = review()
    forged.signature.valueBase64 = Buffer.from('fabricated').toString('base64')
    expect(() => reconcile(forged)).toThrow('approval signature is invalid')
  })

  it('rejects a self-authorized reviewer absent from protected approvers', () => {
    expect(() => reconcile(review(), ['release-manager'])).toThrow(
      'protected development-team signer policy',
    )
  })

  it('rejects review bytes outside protected digest and a tampered reconcile draft', () => {
    const artifact = review()
    const sourceManifest = manifest()
    const sourceDigest = manifestDigest(sourceManifest)
    const reviewDigest = catalogAuthoringChecksum(artifact)
    const tamperedDraft = structuredClone(draft())
    tamperedDraft.tours[0]!.rows[0]!.sourceLabel = 'tampered after draft'

    expect(() =>
      reconcileWingsSideCatalogAuthoringReview({
        approvalPolicy: {
          ...wingsSideCatalogDevelopmentTeamApprovalPolicy,
          keyID: approvalKeyID,
          publicKeySpkiBase64: approvalPublicKeySpkiBase64,
          reviewArtifactSha256: 'f'.repeat(64),
          trustedSignerIDs: ['trusted-reviewer'],
        },
        draft: draft(),
        expectedSourceManifestSha256: sourceDigest,
        localeArtifacts: localeArtifacts(),
        review: artifact,
        reviewArtifactSha256: reviewDigest,
        sourceManifest,
        sourceManifestArtifactSha256: sourceDigest,
        sourceTours: sourceTours(),
      }),
    ).toThrow('protected release policy')

    expect(() =>
      reconcileWingsSideCatalogAuthoringReview({
        approvalPolicy: {
          ...wingsSideCatalogDevelopmentTeamApprovalPolicy,
          keyID: approvalKeyID,
          publicKeySpkiBase64: approvalPublicKeySpkiBase64,
          reviewArtifactSha256: reviewDigest,
          trustedSignerIDs: ['trusted-reviewer'],
        },
        draft: tamperedDraft,
        expectedSourceManifestSha256: sourceDigest,
        localeArtifacts: localeArtifacts(),
        review: artifact,
        reviewArtifactSha256: reviewDigest,
        sourceManifest,
        sourceManifestArtifactSha256: sourceDigest,
        sourceTours: sourceTours(),
      }),
    ).toThrow('stale or tampered')
  })

  it('rejects post-review locale content tampering with unchanged service rows', () => {
    const artifact = review()
    const sourceManifest = manifest()
    const sourceDigest = manifestDigest(sourceManifest)
    const reviewDigest = catalogAuthoringChecksum(artifact)
    const fields = ['title', 'summary', 'itinerary', 'meta', 'servicesSummary'] as const

    for (const field of fields) {
      const tamperedFiles = localeFiles()
      const content = tamperedFiles[0]!.tours[0]!
      if (field === 'title') content.title = 'Tampered title after review'
      if (field === 'summary') content.summary = 'Tampered summary after review'
      if (field === 'itinerary') {
        content.itineraryDays = [
          {
            dayNumber: 1,
            route: 'Tampered route',
            summary: 'Tampered itinerary summary',
            title: 'Tampered itinerary title',
          },
        ]
      }
      if (field === 'meta') content.meta.description = 'Tampered meta after review'
      if (field === 'servicesSummary') {
        content.servicesSummary.operatorNotes = 'Tampered services summary after review'
      }

      expect(() =>
        reconcileWingsSideCatalogAuthoringReview({
          approvalPolicy: {
            ...wingsSideCatalogDevelopmentTeamApprovalPolicy,
            keyID: approvalKeyID,
            publicKeySpkiBase64: approvalPublicKeySpkiBase64,
            reviewArtifactSha256: reviewDigest,
            trustedSignerIDs: ['trusted-reviewer'],
          },
          draft: draft(),
          expectedSourceManifestSha256: sourceDigest,
          localeArtifacts: localeArtifacts(tamperedFiles),
          review: artifact,
          reviewArtifactSha256: reviewDigest,
          sourceManifest,
          sourceManifestArtifactSha256: sourceDigest,
          sourceTours: sourceTours(),
        }),
      ).toThrow('stale or tampered')
    }
  })

  it('requires protected environment trust and accepts only identical CLI echoes', () => {
    expect(() =>
      resolveProtectedCatalogAuthoringValue({
        cliName: '--manifest-sha256',
        cliValue: 'a'.repeat(64),
        envName: 'WINGSSIDE_CATALOG_SOURCE_MANIFEST_SHA256',
      }),
    ).toThrow('Protected environment')
    expect(() =>
      resolveProtectedCatalogAuthoringValue({
        cliName: '--manifest-sha256',
        cliValue: 'b'.repeat(64),
        envName: 'WINGSSIDE_CATALOG_SOURCE_MANIFEST_SHA256',
        envValue: 'a'.repeat(64),
      }),
    ).toThrow('CLI/environment conflict')
    expect(
      resolveProtectedCatalogAuthoringValue({
        cliName: '--manifest-sha256',
        cliValue: 'a'.repeat(64),
        envName: 'WINGSSIDE_CATALOG_SOURCE_MANIFEST_SHA256',
        envValue: 'a'.repeat(64),
      }),
    ).toBe('a'.repeat(64))
  })

  it('forces draft rebuild and rejects CLI-supplied approver trust', () => {
    expect(() => assertCatalogAuthoringCLITrustBoundary('draft', ['--draft'])).toThrow(
      'always rebuilds',
    )
    expect(() =>
      assertCatalogAuthoringCLITrustBoundary('reconcile', [
        '--trusted-approvers=attacker@example.com',
      ]),
    ).toThrow('protected configuration')
    expect(() =>
      assertCatalogAuthoringCLITrustBoundary('reconcile', [
        '--approval-public-key-spki-base64=attacker',
      ]),
    ).toThrow('protected configuration')
    expect(() =>
      assertCatalogAuthoringCLITrustBoundary('draft', ['--legacy-dir=unprotected']),
    ).toThrow('forbidden')
  })

  it('requires protected locale paths and accepts only identical resolved CLI echoes', () => {
    expect(() =>
      resolveProtectedCatalogAuthoringPath({
        cliName: '--locale-vi',
        envName: 'WINGSSIDE_CATALOG_LOCALE_VI_PATH',
        envValue: 'protected/vi.json',
      }),
    ).toThrow('Missing required')
    expect(() =>
      resolveProtectedCatalogAuthoringPath({
        cliName: '--locale-vi',
        cliValue: 'untrusted/vi.json',
        envName: 'WINGSSIDE_CATALOG_LOCALE_VI_PATH',
        envValue: 'protected/vi.json',
      }),
    ).toThrow('CLI/environment conflict')
    expect(
      resolveProtectedCatalogAuthoringPath({
        cliName: '--locale-vi',
        cliValue: 'protected/vi.json',
        envName: 'WINGSSIDE_CATALOG_LOCALE_VI_PATH',
        envValue: 'protected/vi.json',
      }),
    ).toBe(resolve('protected/vi.json'))
  })

  it('rejects non-string decision labels and rationale without coercion', () => {
    const nonStringLabel = review() as unknown as {
      decisions: Array<{ labels: Record<string, unknown> }>
    }
    nonStringLabel.decisions[0]!.labels.vi = 123
    expect(() => parseCatalogAuthoringReviewArtifact(nonStringLabel)).toThrow(
      'Decision vi label 0 must be a string',
    )

    const nonStringRationale = review() as unknown as {
      decisions: Array<{ rationale: unknown }>
    }
    nonStringRationale.decisions[0]!.rationale = { text: 'approved' }
    expect(() => parseCatalogAuthoringReviewArtifact(nonStringRationale)).toThrow(
      'Decision rationale 0 must be a string',
    )
  })

  it('single-reads, byte-hashes, validates, and freezes governance artifacts', () => {
    const value = manifest()
    const bytes = Buffer.from(JSON.stringify(value))
    const readFileSync = vi.fn(() => bytes)
    const artifact = readFrozenCatalogAuthoringArtifact({
      expectedSha256: sha256(bytes),
      filePath: 'manifest.json',
      io: { readFileSync: readFileSync as never },
      validate: (parsed) => parsed as CatalogAuthoringSourceManifest,
    })
    bytes.fill(0)
    expect(readFileSync).toHaveBeenCalledOnce()
    expect(Object.isFrozen(artifact.value)).toBe(true)
    expect(Object.isFrozen(artifact.value.tours)).toBe(true)
    expect(() =>
      readFrozenCatalogAuthoringArtifact({
        expectedSha256: 'f'.repeat(64),
        filePath: 'manifest.json',
        io: { readFileSync: (() => Buffer.from(JSON.stringify(value))) as never },
        validate: (parsed) => parsed,
      }),
    ).toThrow('checksum mismatch')
  })
})
