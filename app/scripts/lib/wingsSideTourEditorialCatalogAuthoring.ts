import crypto from 'node:crypto'

import {
  assertWingsSideTourEditorialCatalog,
  editorialPricingApprovalChecksum,
  editorialServiceLabelChecksum,
  editorialSourceChecksum,
  parseWingsSideTourEditorialCatalogV2,
  wingsSideCanonicalPricingDisclosureCount,
  wingsSideTourEditorialLocales,
  type EditorialServiceBucket,
  type EditorialSourceTour,
  type PricingApprovalManifest,
  type WingsSideTourEditorialCatalog,
  type WingsSideTourEditorialLocale,
  type WingsSideTourEditorialLocaleFile,
  type WingsSideTourEditorialSourceManifest,
} from './wingsSideTourEditorialLocalization'

type SourceServiceRow = {
  governed: boolean
  sourceBucket: EditorialServiceBucket
  sourceLabel: string
  sourceLabelChecksum: string
  sourceRowID: string
}

export type CatalogAuthoringDraftRow = SourceServiceRow & {
  legacySuggestions: Record<
    WingsSideTourEditorialLocale,
    { label: string | null; positionalAmbiguity: true }
  >
  missingDisposition: boolean
  missingLocaleLabels: WingsSideTourEditorialLocale[]
}

export type CatalogAuthoringDraftPacket = {
  blockingFlags: string[]
  expectedGovernedDisclosureCount: number
  generatedFrom: 'frozen-en-inventory-and-legacy-locales'
  governedDisclosureCount: number
  packetChecksum: string
  sourceManifestChecksum: string
  status: 'DRAFT_REVIEW_REQUIRED'
  tours: Array<{
    rows: CatalogAuthoringDraftRow[]
    slug: string
    sourceChecksum: string
  }>
  version: 1
}

export type ReviewedCatalogRowDecision = {
  labels: Record<WingsSideTourEditorialLocale, string>
  positionalMappingReviewed: true
  rationale: string
  slug: string
  sourceLabelChecksum: string
  sourceRowID: string
  targetBucket: EditorialServiceBucket
}

export type CatalogAuthoringReviewArtifact = {
  approvalManifest: PricingApprovalManifest
  decisions: ReviewedCatalogRowDecision[]
  draftPacketChecksum: string
  version: 1
}

export type CatalogAuthoringReconciliation = {
  candidate: WingsSideTourEditorialCatalog
  candidateChecksum: string
  summary: {
    bucketMoves: number
    governedDispositions: number
    labelChangesFromLegacySuggestion: number
    reviewedRows: number
  }
}

const pricingDisclosurePattern =
  /\b(?:peak|high) season\b|\bfuel surcharge\b|\bcompulsory dinner\b/iu

const normalize = (value: unknown) =>
  String(value || '')
    .normalize('NFKC')
    .replace(/\s+/gu, ' ')
    .trim()

const stableJSONStringify = (value: unknown): string => {
  if (value === undefined) return '"__undefined__"'
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stableJSONStringify).join(',')}]`
  const object = value as Record<string, unknown>
  return `{${Object.keys(object)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableJSONStringify(object[key])}`)
    .join(',')}}`
}

export const catalogAuthoringChecksum = (value: unknown) =>
  crypto.createHash('sha256').update(stableJSONStringify(value)).digest('hex')

const withoutPacketChecksum = (packet: CatalogAuthoringDraftPacket) => {
  const { packetChecksum: _packetChecksum, ...rest } = packet
  return rest
}

const assertExactInventory = ({
  localeFiles,
  sourceManifest,
  sourceTours,
}: {
  localeFiles: WingsSideTourEditorialLocaleFile[]
  sourceManifest: WingsSideTourEditorialSourceManifest
  sourceTours: EditorialSourceTour[]
}) => {
  if (
    sourceManifest.version !== 1 ||
    sourceManifest.sourceLocale !== 'en' ||
    sourceManifest.generatedFrom !== 'wing-side-published-en-tour-products'
  ) {
    throw new Error('Invalid frozen WingSide source manifest')
  }
  const sourceBySlug = new Map(sourceTours.map((tour) => [tour.slug, tour]))
  if (sourceBySlug.size !== sourceTours.length) throw new Error('Duplicate source tour slug')
  const manifestBySlug = new Map(sourceManifest.tours.map((tour) => [tour.slug, tour.checksum]))
  if (manifestBySlug.size !== sourceManifest.tours.length) {
    throw new Error('Duplicate source manifest slug')
  }
  if (
    sourceBySlug.size !== manifestBySlug.size ||
    [...sourceBySlug].some(
      ([slug, tour]) => manifestBySlug.get(slug) !== editorialSourceChecksum(tour),
    )
  ) {
    throw new Error('Frozen English source inventory drifted from its manifest')
  }
  const fileByLocale = new Map(localeFiles.map((file) => [file.locale, file]))
  if (
    fileByLocale.size !== wingsSideTourEditorialLocales.length ||
    wingsSideTourEditorialLocales.some((locale) => !fileByLocale.has(locale))
  ) {
    throw new Error('Exactly vi,it,es,pt legacy locale files are required')
  }
  for (const locale of wingsSideTourEditorialLocales) {
    const file = fileByLocale.get(locale)!
    const slugs = file.tours.map(({ slug }) => slug)
    if (new Set(slugs).size !== slugs.length) throw new Error(`Duplicate ${locale} legacy slug`)
    if (
      slugs.length !== sourceBySlug.size ||
      slugs.some((slug) => !sourceBySlug.has(slug))
    ) {
      throw new Error(`${locale} legacy inventory differs from frozen source`)
    }
  }
  return { fileByLocale, sourceBySlug }
}

const sourceRows = (tour: EditorialSourceTour): SourceServiceRow[] => {
  const rows = [
    ...(tour.includes || []).map((row) => ({ row, sourceBucket: 'includes' as const })),
    ...(tour.excludes || []).map((row) => ({ row, sourceBucket: 'excludes' as const })),
  ].map(({ row, sourceBucket }) => {
    const sourceRowID = normalize(row.id)
    const sourceLabel = normalize(row.label)
    if (!sourceRowID || !sourceLabel) {
      throw new Error(`Source service row requires stable ID and label: ${tour.slug}`)
    }
    return {
      governed: pricingDisclosurePattern.test(sourceLabel),
      sourceBucket,
      sourceLabel,
      sourceLabelChecksum: editorialServiceLabelChecksum(sourceLabel),
      sourceRowID,
    }
  })
  if (new Set(rows.map(({ sourceRowID }) => sourceRowID)).size !== rows.length) {
    throw new Error(`Duplicate sourceRowID: ${tour.slug}`)
  }
  return rows
}

export const buildWingsSideCatalogAuthoringDraft = ({
  expectedGovernedDisclosureCount = wingsSideCanonicalPricingDisclosureCount,
  localeFiles,
  sourceManifest,
  sourceTours,
}: {
  expectedGovernedDisclosureCount?: number
  localeFiles: WingsSideTourEditorialLocaleFile[]
  sourceManifest: WingsSideTourEditorialSourceManifest
  sourceTours: EditorialSourceTour[]
}): CatalogAuthoringDraftPacket => {
  const { fileByLocale } = assertExactInventory({ localeFiles, sourceManifest, sourceTours })
  const tours = [...sourceTours]
    .sort((left, right) => left.slug.localeCompare(right.slug))
    .map((tour) => {
      const rows = sourceRows(tour).map((row) => {
        const sourceBucketRows = sourceRows(tour).filter(
          ({ sourceBucket }) => sourceBucket === row.sourceBucket,
        )
        const position = sourceBucketRows.findIndex(
          ({ sourceRowID }) => sourceRowID === row.sourceRowID,
        )
        const legacySuggestions = Object.fromEntries(
          wingsSideTourEditorialLocales.map((locale) => {
            const legacyTour = fileByLocale.get(locale)!.tours.find(
              (candidate) => candidate.slug === tour.slug,
            )!
            const labels = legacyTour[row.sourceBucket]
            return [
              locale,
              {
                label: normalize(labels[position]) || null,
                positionalAmbiguity: true as const,
              },
            ]
          }),
        ) as CatalogAuthoringDraftRow['legacySuggestions']
        return {
          ...row,
          legacySuggestions,
          missingDisposition: row.governed,
          missingLocaleLabels: wingsSideTourEditorialLocales.filter(
            (locale) => !legacySuggestions[locale].label,
          ),
        }
      })
      return {
        rows,
        slug: tour.slug,
        sourceChecksum: editorialSourceChecksum(tour),
      }
    })
  const governedDisclosureCount = tours.flatMap(({ rows }) => rows).filter(
    ({ governed }) => governed,
  ).length
  const blockingFlags = [
    ...(governedDisclosureCount === expectedGovernedDisclosureCount
      ? []
      : [
          `governed-disclosure-count:${governedDisclosureCount}/${expectedGovernedDisclosureCount}`,
        ]),
    ...tours.flatMap(({ rows, slug }) =>
      rows.flatMap((row) => [
        `positional-mapping-review-required:${slug}:${row.sourceRowID}`,
        ...row.missingLocaleLabels.map(
          (locale) => `missing-legacy-label:${locale}:${slug}:${row.sourceRowID}`,
        ),
      ]),
    ),
  ].sort()
  const draft = {
    blockingFlags,
    expectedGovernedDisclosureCount,
    generatedFrom: 'frozen-en-inventory-and-legacy-locales' as const,
    governedDisclosureCount,
    packetChecksum: '',
    sourceManifestChecksum: catalogAuthoringChecksum(sourceManifest),
    status: 'DRAFT_REVIEW_REQUIRED' as const,
    tours,
    version: 1 as const,
  }
  draft.packetChecksum = catalogAuthoringChecksum(withoutPacketChecksum(draft))
  return draft
}

export const reconcileWingsSideCatalogAuthoringReview = ({
  draft,
  localeFiles,
  review,
  sourceManifest,
  sourceTours,
  trustedApprovers,
}: {
  draft: CatalogAuthoringDraftPacket
  localeFiles: WingsSideTourEditorialLocaleFile[]
  review: CatalogAuthoringReviewArtifact
  sourceManifest: WingsSideTourEditorialSourceManifest
  sourceTours: EditorialSourceTour[]
  trustedApprovers: string[]
}): CatalogAuthoringReconciliation => {
  const rebuilt = buildWingsSideCatalogAuthoringDraft({
    expectedGovernedDisclosureCount: draft.expectedGovernedDisclosureCount,
    localeFiles,
    sourceManifest,
    sourceTours,
  })
  if (
    review.version !== 1 ||
    draft.packetChecksum !== catalogAuthoringChecksum(withoutPacketChecksum(draft)) ||
    review.draftPacketChecksum !== draft.packetChecksum ||
    rebuilt.packetChecksum !== draft.packetChecksum
  ) {
    throw new Error('Draft/review artifact is stale or tampered')
  }
  if (
    draft.governedDisclosureCount !== draft.expectedGovernedDisclosureCount ||
    draft.expectedGovernedDisclosureCount !== wingsSideCanonicalPricingDisclosureCount
  ) {
    throw new Error('Canonical reconciliation requires exactly 38 governed disclosures')
  }
  const trusted = [...new Set(trustedApprovers.map(normalize).filter(Boolean))].sort()
  if (
    trusted.length === 0 ||
    JSON.stringify([...review.approvalManifest.trustedApprovers].map(normalize).sort()) !==
      JSON.stringify(trusted) ||
    !trusted.includes(normalize(review.approvalManifest.approvedBy))
  ) {
    throw new Error('Approval manifest is not bound to the external trusted approver policy')
  }
  const draftRows = draft.tours.flatMap(({ rows, slug }) =>
    rows.map((row) => ({ ...row, slug })),
  )
  const decisionKeys = review.decisions.map(({ slug, sourceRowID }) => `${slug}:${sourceRowID}`)
  if (
    new Set(decisionKeys).size !== decisionKeys.length ||
    review.decisions.length !== draftRows.length
  ) {
    throw new Error('Review decisions must cover every source row exactly once')
  }
  const decisionByKey = new Map(
    review.decisions.map((decision) => [`${decision.slug}:${decision.sourceRowID}`, decision]),
  )
  for (const row of draftRows) {
    const decision = decisionByKey.get(`${row.slug}:${row.sourceRowID}`)
    if (
      !decision ||
      decision.positionalMappingReviewed !== true ||
      decision.sourceLabelChecksum !== row.sourceLabelChecksum ||
      wingsSideTourEditorialLocales.some((locale) => !normalize(decision.labels?.[locale])) ||
      (!row.governed && decision.targetBucket !== row.sourceBucket) ||
      (row.governed && !normalize(decision.rationale))
    ) {
      throw new Error(`Incomplete or ambiguous reviewed row: ${row.slug}:${row.sourceRowID}`)
    }
  }
  const legacyByLocale = new Map(
    localeFiles.map((file) => [
      file.locale,
      new Map(file.tours.map((tour) => [tour.slug, tour])),
    ]),
  )
  const catalog: WingsSideTourEditorialCatalog = {
    approvalManifest: { ...review.approvalManifest },
    pricingDispositions: draftRows
      .filter(({ governed }) => governed)
      .map((row) => {
        const decision = decisionByKey.get(`${row.slug}:${row.sourceRowID}`)!
        return {
          approvalArtifactID: review.approvalManifest.approvalArtifactID,
          approvedAt: review.approvalManifest.approvedAt,
          approvedBy: review.approvalManifest.approvedBy,
          approvedTargetBucket: decision.targetBucket,
          rationale: decision.rationale,
          slug: row.slug,
          sourceBucket: row.sourceBucket,
          sourceLabel: row.sourceLabel,
          sourceLabelChecksum: row.sourceLabelChecksum,
          sourceRowID: row.sourceRowID,
        }
      }),
    sourceLocale: 'en',
    targetLocales: [...wingsSideTourEditorialLocales],
    tours: draft.tours.map(({ rows, slug, sourceChecksum }) => ({
      locales: Object.fromEntries(
        wingsSideTourEditorialLocales.map((locale) => {
          const legacy = legacyByLocale.get(locale)!.get(slug)!
          const localizedRows = rows.map((row) => {
            const decision = decisionByKey.get(`${slug}:${row.sourceRowID}`)!
            return {
              label: normalize(decision.labels[locale]),
              sourceRowID: row.sourceRowID,
              targetBucket: decision.targetBucket,
            }
          })
          return [
            locale,
            {
              ...legacy,
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
  if (catalog.approvalManifest.checksum !== editorialPricingApprovalChecksum(catalog)) {
    throw new Error('Externally supplied approval checksum does not match the candidate catalog')
  }
  parseWingsSideTourEditorialCatalogV2(catalog, {
    expectedPricingDisclosureCount: wingsSideCanonicalPricingDisclosureCount,
  })
  assertWingsSideTourEditorialCatalog({ catalog, sourceTours })
  let labelChangesFromLegacySuggestion = 0
  for (const row of draftRows) {
    const decision = decisionByKey.get(`${row.slug}:${row.sourceRowID}`)!
    for (const locale of wingsSideTourEditorialLocales) {
      if (normalize(row.legacySuggestions[locale].label) !== normalize(decision.labels[locale])) {
        labelChangesFromLegacySuggestion += 1
      }
    }
  }
  return {
    candidate: catalog,
    candidateChecksum: catalogAuthoringChecksum(catalog),
    summary: {
      bucketMoves: draftRows.filter(
        (row) =>
          decisionByKey.get(`${row.slug}:${row.sourceRowID}`)!.targetBucket !== row.sourceBucket,
      ).length,
      governedDispositions: catalog.pricingDispositions.length,
      labelChangesFromLegacySuggestion,
      reviewedRows: draftRows.length,
    },
  }
}
