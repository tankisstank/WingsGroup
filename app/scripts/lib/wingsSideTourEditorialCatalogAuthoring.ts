import crypto from 'node:crypto'
import fs from 'node:fs'

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
} from './wingsSideTourEditorialLocalization'

export const wingsSideCatalogExpectedTourCount = 22

export type CatalogAuthoringSourceTour = EditorialSourceTour & {
  tourID: number | string
}

export type CatalogAuthoringSourceManifest = {
  expectedGovernedDisclosureCount: 38
  expectedTourCount: 22
  generatedFrom: 'wing-side-published-en-tour-products'
  siteCode: 'wing-side'
  sourceLocale: 'en'
  tours: Array<{
    checksum: string
    governedRows: Array<{
      sourceBucket: EditorialServiceBucket
      sourceLabelChecksum: string
      sourceRowID: string
    }>
    slug: string
    tourID: number | string
  }>
  version: 2
}

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
  localeArtifacts: Record<
    WingsSideTourEditorialLocale,
    {
      artifactSha256: string
      contentChecksum: string
    }
  >
  packetChecksum: string
  sourceManifestChecksum: string
  sourceManifestArtifactSha256: string
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
  fullCandidateChecksum: string
  version: 1
}

export type CatalogAuthoringLocaleArtifact = {
  contentChecksum: string
  locale: WingsSideTourEditorialLocale
  sha256: string
  value: Readonly<WingsSideTourEditorialLocaleFile>
}

export type CatalogAuthoringApprovalPolicy = {
  reviewArtifactSha256: string
  trustedApprovers: string[]
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

const normalizeString = (value: unknown, label: string) => {
  if (typeof value !== 'string') throw new Error(`${label} must be a string`)
  return value
    .normalize('NFKC')
    .replace(/\s+/gu, ' ')
    .trim()
}

const normalizeOptionalString = (value: unknown, label: string) =>
  value === null || value === undefined ? '' : normalizeString(value, label)

const assertSha256: (value: unknown, label: string) => asserts value is string = (
  value,
  label,
) => {
  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/u.test(value)) {
    throw new Error(`${label} must be a lowercase SHA-256`)
  }
}

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

const deepFreeze = <T>(value: T): Readonly<T> => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child)
  }
  return value
}

export const readFrozenCatalogAuthoringArtifact = <T>({
  expectedSha256,
  filePath,
  io = fs,
  validate,
}: {
  expectedSha256: string
  filePath: string
  io?: Pick<typeof fs, 'readFileSync'>
  validate: (value: unknown) => T
}): { contentChecksum: string; sha256: string; value: Readonly<T> } => {
  assertSha256(expectedSha256, 'Protected artifact checksum')
  const bytes = io.readFileSync(filePath)
  const sha256 = crypto.createHash('sha256').update(bytes).digest('hex')
  if (sha256 !== expectedSha256) throw new Error(`Catalog artifact checksum mismatch: ${filePath}`)
  let parsed: unknown
  try {
    parsed = JSON.parse(bytes.toString())
  } catch {
    throw new Error(`Catalog artifact is invalid JSON: ${filePath}`)
  }
  const value = deepFreeze(validate(parsed))
  return { contentChecksum: catalogAuthoringChecksum(value), sha256, value }
}

const withoutPacketChecksum = (packet: CatalogAuthoringDraftPacket) => {
  const { packetChecksum: _packetChecksum, ...rest } = packet
  return rest
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value))

const assertIdentity: (
  value: unknown,
  label: string,
) => asserts value is number | string = (value, label) => {
  if (
    (typeof value !== 'string' && typeof value !== 'number') ||
    (typeof value === 'string' && !value.trim()) ||
    (typeof value === 'number' && !Number.isSafeInteger(value))
  ) {
    throw new Error(`${label} must be a non-empty string or safe integer`)
  }
}

export const parseCatalogAuthoringSourceManifest = (
  value: unknown,
): CatalogAuthoringSourceManifest => {
  if (!isRecord(value) || !Array.isArray(value.tours)) {
    throw new Error('Invalid canonical catalog source manifest')
  }
  const manifest = value as unknown as CatalogAuthoringSourceManifest
  if (
    manifest.version !== 2 ||
    manifest.siteCode !== 'wing-side' ||
    manifest.sourceLocale !== 'en' ||
    manifest.generatedFrom !== 'wing-side-published-en-tour-products' ||
    manifest.expectedTourCount !== wingsSideCatalogExpectedTourCount ||
    manifest.expectedGovernedDisclosureCount !== wingsSideCanonicalPricingDisclosureCount
  ) {
    throw new Error('Invalid canonical catalog source manifest')
  }
  for (const [tourIndex, tour] of manifest.tours.entries()) {
    if (!isRecord(tour) || !Array.isArray(tour.governedRows)) {
      throw new Error(`Invalid canonical manifest tour at index ${tourIndex}`)
    }
    normalizeString(tour.slug, `Manifest tour slug ${tourIndex}`)
    assertIdentity(tour.tourID, `Manifest tour ID ${tourIndex}`)
    assertSha256(tour.checksum, `Manifest source checksum ${tourIndex}`)
    for (const [rowIndex, row] of tour.governedRows.entries()) {
      if (
        !isRecord(row) ||
        (row.sourceBucket !== 'includes' && row.sourceBucket !== 'excludes')
      ) {
        throw new Error(`Invalid governed manifest row ${tourIndex}:${rowIndex}`)
      }
      normalizeString(row.sourceRowID, `Manifest governed row ID ${tourIndex}:${rowIndex}`)
      assertSha256(
        row.sourceLabelChecksum,
        `Manifest governed row label checksum ${tourIndex}:${rowIndex}`,
      )
    }
  }
  return manifest
}

export const parseCatalogAuthoringReviewArtifact = (
  value: unknown,
): CatalogAuthoringReviewArtifact => {
  if (!isRecord(value) || !isRecord(value.approvalManifest) || !Array.isArray(value.decisions)) {
    throw new Error('Invalid catalog review artifact')
  }
  const review = value as unknown as CatalogAuthoringReviewArtifact
  if (
    review.version !== 1 ||
    typeof review.draftPacketChecksum !== 'string' ||
    review.approvalManifest.version !== 1 ||
    !Array.isArray(review.approvalManifest.trustedApprovers) ||
    review.approvalManifest.expectedPricingDisclosureCount !==
      wingsSideCanonicalPricingDisclosureCount
  ) {
    throw new Error('Invalid catalog review artifact')
  }
  assertSha256(review.draftPacketChecksum, 'Review draft packet checksum')
  assertSha256(review.fullCandidateChecksum, 'Review full candidate checksum')
  normalizeString(review.approvalManifest.approvalArtifactID, 'Approval artifact ID')
  normalizeString(review.approvalManifest.approvedAt, 'Approval timestamp')
  normalizeString(review.approvalManifest.approvedBy, 'Approval reviewer')
  assertSha256(review.approvalManifest.checksum, 'Approval checksum')
  for (const [index, approver] of review.approvalManifest.trustedApprovers.entries()) {
    normalizeString(approver, `Approval trusted approver ${index}`)
  }
  for (const [index, decision] of review.decisions.entries()) {
    if (!isRecord(decision) || !isRecord(decision.labels)) {
      throw new Error(`Invalid catalog review decision ${index}`)
    }
    if (
      stableJSONStringify(Object.keys(decision.labels).sort()) !==
      stableJSONStringify([...wingsSideTourEditorialLocales].sort())
    ) {
      throw new Error(`Decision labels must contain exactly vi,it,es,pt at index ${index}`)
    }
    normalizeString(decision.slug, `Decision slug ${index}`)
    normalizeString(decision.sourceRowID, `Decision row ID ${index}`)
    normalizeString(decision.rationale, `Decision rationale ${index}`)
    assertSha256(decision.sourceLabelChecksum, `Decision source label checksum ${index}`)
    if (
      decision.positionalMappingReviewed !== true ||
      (decision.targetBucket !== 'includes' && decision.targetBucket !== 'excludes')
    ) {
      throw new Error(`Invalid catalog review decision ${index}`)
    }
    for (const locale of wingsSideTourEditorialLocales) {
      normalizeString(decision.labels[locale], `Decision ${locale} label ${index}`)
    }
  }
  return review
}

export const parseCatalogAuthoringDraftPacket = (value: unknown): CatalogAuthoringDraftPacket => {
  if (!isRecord(value) || !Array.isArray(value.tours)) {
    throw new Error('Invalid catalog draft packet')
  }
  const draft = value as unknown as CatalogAuthoringDraftPacket
  if (
    draft.version !== 1 ||
    draft.status !== 'DRAFT_REVIEW_REQUIRED' ||
    !Array.isArray(draft.blockingFlags)
  ) {
    throw new Error('Invalid catalog draft packet')
  }
  assertSha256(draft.packetChecksum, 'Draft packet checksum')
  assertSha256(draft.sourceManifestChecksum, 'Draft source manifest checksum')
  assertSha256(draft.sourceManifestArtifactSha256, 'Draft source manifest artifact checksum')
  if (
    !isRecord(draft.localeArtifacts) ||
    stableJSONStringify(Object.keys(draft.localeArtifacts).sort()) !==
      stableJSONStringify([...wingsSideTourEditorialLocales].sort())
  ) {
    throw new Error('Draft locale artifacts must contain exactly vi,it,es,pt')
  }
  for (const locale of wingsSideTourEditorialLocales) {
    const artifact = draft.localeArtifacts[locale]
    if (!isRecord(artifact)) throw new Error(`Invalid draft ${locale} locale artifact`)
    assertSha256(artifact.artifactSha256, `Draft ${locale} locale artifact checksum`)
    assertSha256(artifact.contentChecksum, `Draft ${locale} locale content checksum`)
  }
  return draft
}

export const parseCatalogAuthoringLocaleFile = (
  value: unknown,
  expectedLocale: WingsSideTourEditorialLocale,
): WingsSideTourEditorialLocaleFile => {
  if (!isRecord(value) || !Array.isArray(value.tours)) {
    throw new Error(`Invalid ${expectedLocale} catalog locale artifact`)
  }
  const file = value as unknown as WingsSideTourEditorialLocaleFile
  if (
    file.version !== 1 ||
    file.locale !== expectedLocale ||
    file.voice !== 'calm-specific-consultative'
  ) {
    throw new Error(`Invalid ${expectedLocale} catalog locale artifact`)
  }
  return file
}

const verifiedLocaleFiles = (
  localeArtifacts: readonly CatalogAuthoringLocaleArtifact[],
): {
  localeArtifacts: CatalogAuthoringDraftPacket['localeArtifacts']
  localeFiles: WingsSideTourEditorialLocaleFile[]
} => {
  const artifactsByLocale = new Map(localeArtifacts.map((artifact) => [artifact.locale, artifact]))
  if (
    artifactsByLocale.size !== wingsSideTourEditorialLocales.length ||
    wingsSideTourEditorialLocales.some((locale) => !artifactsByLocale.has(locale))
  ) {
    throw new Error('Exactly vi,it,es,pt protected locale artifacts are required')
  }
  const bindings = {} as CatalogAuthoringDraftPacket['localeArtifacts']
  const localeFiles = wingsSideTourEditorialLocales.map((locale) => {
    const artifact = artifactsByLocale.get(locale)!
    assertSha256(artifact.sha256, `Protected ${locale} locale artifact checksum`)
    assertSha256(artifact.contentChecksum, `Protected ${locale} locale content checksum`)
    if (
      artifact.value.locale !== locale ||
      artifact.contentChecksum !== catalogAuthoringChecksum(artifact.value) ||
      !Object.isFrozen(artifact.value)
    ) {
      throw new Error(`Protected ${locale} locale artifact is not immutable or content-verified`)
    }
    bindings[locale] = {
      artifactSha256: artifact.sha256,
      contentChecksum: artifact.contentChecksum,
    }
    return artifact.value as WingsSideTourEditorialLocaleFile
  })
  return { localeArtifacts: bindings, localeFiles }
}

const assertExactInventory = ({
  localeFiles,
  sourceManifest,
  sourceTours,
}: {
  localeFiles: WingsSideTourEditorialLocaleFile[]
  sourceManifest: CatalogAuthoringSourceManifest
  sourceTours: CatalogAuthoringSourceTour[]
}) => {
  parseCatalogAuthoringSourceManifest(sourceManifest)
  if (
    sourceTours.length !== wingsSideCatalogExpectedTourCount ||
    sourceManifest.tours.length !== wingsSideCatalogExpectedTourCount
  ) {
    throw new Error('Canonical catalog authoring requires exactly 22 tours')
  }
  const sourceBySlug = new Map(sourceTours.map((tour) => [tour.slug, tour]))
  for (const [index, tour] of sourceTours.entries()) {
    normalizeString(tour.slug, `Source tour slug ${index}`)
    normalizeString(tour.title, `Source tour title ${index}`)
    normalizeString(tour.summary, `Source tour summary ${index}`)
    assertIdentity(tour.tourID, `Source tour ID ${index}`)
  }
  if (sourceBySlug.size !== sourceTours.length) throw new Error('Duplicate source tour slug')
  const manifestBySlug = new Map(sourceManifest.tours.map((tour) => [tour.slug, tour]))
  if (manifestBySlug.size !== sourceManifest.tours.length) {
    throw new Error('Duplicate source manifest slug')
  }
  if (
    sourceBySlug.size !== manifestBySlug.size ||
    [...sourceBySlug].some(
      ([slug, tour]) => {
        const governed = sourceRows(tour)
          .filter(({ governed }) => governed)
          .map(({ sourceBucket, sourceLabelChecksum, sourceRowID }) => ({
            sourceBucket,
            sourceLabelChecksum,
            sourceRowID,
          }))
        const expected = manifestBySlug.get(slug)
        return (
          !expected ||
          String(expected.tourID) !== String(tour.tourID) ||
          expected.checksum !== editorialSourceChecksum(tour) ||
          stableJSONStringify(expected.governedRows) !== stableJSONStringify(governed)
        )
      },
    )
  ) {
    throw new Error('Frozen English source inventory drifted from its manifest')
  }
  const identities = sourceManifest.tours.map(({ slug, tourID }) => `${String(tourID)}\0${slug}`)
  const observedIdentities = sourceTours.map(
    ({ slug, tourID }) => `${String(tourID)}\0${slug}`,
  )
  const governedKeys = sourceManifest.tours.flatMap(({ governedRows, slug }) =>
    governedRows.map(({ sourceRowID }) => `${slug}\0${sourceRowID}`),
  )
  if (
    new Set(sourceManifest.tours.map(({ tourID }) => String(tourID))).size !==
      wingsSideCatalogExpectedTourCount ||
    new Set(identities).size !== wingsSideCatalogExpectedTourCount ||
    stableJSONStringify(observedIdentities) !== stableJSONStringify(identities) ||
    governedKeys.length !== wingsSideCanonicalPricingDisclosureCount ||
    new Set(governedKeys).size !== wingsSideCanonicalPricingDisclosureCount
  ) {
    throw new Error('Canonical manifest requires exact 22 tour and 38 governed row identities')
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
    if (
      file.version !== 1 ||
      file.locale !== locale ||
      file.voice !== 'calm-specific-consultative'
    ) {
      throw new Error(`Invalid ${locale} legacy locale file`)
    }
    for (const [tourIndex, tour] of file.tours.entries()) {
      normalizeString(tour.slug, `${locale} legacy slug ${tourIndex}`)
      for (const [rowIndex, label] of [...tour.includes, ...tour.excludes].entries()) {
        normalizeString(label, `${locale} legacy service label ${tourIndex}:${rowIndex}`)
      }
    }
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
    if (typeof row.id !== 'string' && typeof row.id !== 'number') {
      throw new Error(`Source service row ID must be a string or number: ${tour.slug}`)
    }
    const sourceRowID =
      typeof row.id === 'string'
        ? normalizeString(row.id, `Source row ID ${tour.slug}`)
        : String(row.id)
    const sourceLabel = normalizeString(row.label, `Source row label ${tour.slug}:${sourceRowID}`)
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
  expectedSourceManifestSha256,
  localeArtifacts,
  sourceManifestArtifactSha256,
  sourceManifest,
  sourceTours,
}: {
  expectedGovernedDisclosureCount?: number
  expectedSourceManifestSha256: string
  localeArtifacts: readonly CatalogAuthoringLocaleArtifact[]
  sourceManifest: CatalogAuthoringSourceManifest
  sourceManifestArtifactSha256: string
  sourceTours: CatalogAuthoringSourceTour[]
}): CatalogAuthoringDraftPacket => {
  assertSha256(sourceManifestArtifactSha256, 'Protected source manifest artifact checksum')
  assertSha256(expectedSourceManifestSha256, 'Expected source manifest artifact checksum')
  if (sourceManifestArtifactSha256 !== expectedSourceManifestSha256) {
    throw new Error('Source manifest checksum does not match protected release policy')
  }
  const verifiedLocales = verifiedLocaleFiles(localeArtifacts)
  const { fileByLocale } = assertExactInventory({
    localeFiles: verifiedLocales.localeFiles,
    sourceManifest,
    sourceTours,
  })
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
                label: normalizeOptionalString(
                  labels[position],
                  `Legacy ${locale} service label ${tour.slug}:${row.sourceRowID}`,
                ) || null,
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
    localeArtifacts: verifiedLocales.localeArtifacts,
    packetChecksum: '',
    sourceManifestChecksum: catalogAuthoringChecksum(sourceManifest),
    sourceManifestArtifactSha256,
    status: 'DRAFT_REVIEW_REQUIRED' as const,
    tours,
    version: 1 as const,
  }
  draft.packetChecksum = catalogAuthoringChecksum(withoutPacketChecksum(draft))
  return draft
}

export const reconcileWingsSideCatalogAuthoringReview = ({
  approvalPolicy,
  draft,
  localeArtifacts,
  review,
  reviewArtifactSha256,
  expectedSourceManifestSha256,
  sourceManifestArtifactSha256,
  sourceManifest,
  sourceTours,
}: {
  approvalPolicy: CatalogAuthoringApprovalPolicy
  draft: CatalogAuthoringDraftPacket
  localeArtifacts: readonly CatalogAuthoringLocaleArtifact[]
  review: CatalogAuthoringReviewArtifact
  reviewArtifactSha256: string
  expectedSourceManifestSha256: string
  sourceManifest: CatalogAuthoringSourceManifest
  sourceManifestArtifactSha256: string
  sourceTours: CatalogAuthoringSourceTour[]
}): CatalogAuthoringReconciliation => {
  parseCatalogAuthoringDraftPacket(draft)
  parseCatalogAuthoringReviewArtifact(review)
  assertSha256(reviewArtifactSha256, 'Review artifact checksum')
  assertSha256(approvalPolicy.reviewArtifactSha256, 'Protected review artifact checksum')
  if (reviewArtifactSha256 !== approvalPolicy.reviewArtifactSha256) {
    throw new Error('Review artifact checksum does not match protected release policy')
  }
  const rebuilt = buildWingsSideCatalogAuthoringDraft({
    expectedGovernedDisclosureCount: draft.expectedGovernedDisclosureCount,
    expectedSourceManifestSha256,
    localeArtifacts,
    sourceManifestArtifactSha256,
    sourceManifest,
    sourceTours,
  })
  if (
    review.version !== 1 ||
    draft.packetChecksum !== catalogAuthoringChecksum(withoutPacketChecksum(draft)) ||
    review.draftPacketChecksum !== draft.packetChecksum ||
    rebuilt.packetChecksum !== draft.packetChecksum ||
    draft.sourceManifestArtifactSha256 !== sourceManifestArtifactSha256 ||
    stableJSONStringify(draft.localeArtifacts) !==
      stableJSONStringify(rebuilt.localeArtifacts)
  ) {
    throw new Error('Draft/review artifact is stale or tampered')
  }
  if (
    draft.governedDisclosureCount !== draft.expectedGovernedDisclosureCount ||
    draft.expectedGovernedDisclosureCount !== wingsSideCanonicalPricingDisclosureCount
  ) {
    throw new Error('Canonical reconciliation requires exactly 38 governed disclosures')
  }
  const trusted = [
    ...new Set(
      approvalPolicy.trustedApprovers
        .map((value, index) => normalizeString(value, `Protected trusted approver ${index}`))
        .filter(Boolean),
    ),
  ].sort()
  if (
    trusted.length === 0 ||
    JSON.stringify(
      [...review.approvalManifest.trustedApprovers]
        .map((value, index) => normalizeString(value, `Review trusted approver ${index}`))
        .sort(),
    ) !==
      JSON.stringify(trusted) ||
    !trusted.includes(normalizeString(review.approvalManifest.approvedBy, 'Approved reviewer'))
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
      wingsSideTourEditorialLocales.some(
        (locale) => !normalizeString(decision.labels?.[locale], `Decision ${locale} label`),
      ) ||
      (!row.governed && decision.targetBucket !== row.sourceBucket) ||
      (row.governed && !normalizeString(decision.rationale, 'Decision rationale'))
    ) {
      throw new Error(`Incomplete or ambiguous reviewed row: ${row.slug}:${row.sourceRowID}`)
    }
  }
  const verifiedLocales = verifiedLocaleFiles(localeArtifacts)
  const legacyByLocale = new Map(
    verifiedLocales.localeFiles.map((file) => [
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
              label: normalizeString(decision.labels[locale], `Decision ${locale} label`),
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
  const fullCandidateChecksum = catalogAuthoringChecksum(catalog)
  if (review.fullCandidateChecksum !== fullCandidateChecksum) {
    throw new Error('Review full candidate checksum does not match the candidate catalog')
  }
  parseWingsSideTourEditorialCatalogV2(catalog, {
    expectedPricingDisclosureCount: wingsSideCanonicalPricingDisclosureCount,
  })
  assertWingsSideTourEditorialCatalog({ catalog, sourceTours })
  let labelChangesFromLegacySuggestion = 0
  for (const row of draftRows) {
    const decision = decisionByKey.get(`${row.slug}:${row.sourceRowID}`)!
    for (const locale of wingsSideTourEditorialLocales) {
      if (
        normalizeOptionalString(row.legacySuggestions[locale].label, `Legacy ${locale} label`) !==
        normalizeString(decision.labels[locale], `Decision ${locale} label`)
      ) {
        labelChangesFromLegacySuggestion += 1
      }
    }
  }
  return {
    candidate: catalog,
    candidateChecksum: fullCandidateChecksum,
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
