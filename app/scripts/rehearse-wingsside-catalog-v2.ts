import crypto from 'node:crypto'
import fsSync from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  buildWingsSideCatalogAuthoringDraft,
  catalogAuthoringChecksum,
  catalogAuthoringReviewSigningDigest,
  parseCatalogAuthoringLocaleFile,
  readFrozenCatalogAuthoringArtifact,
  reconcileWingsSideCatalogAuthoringReview,
  wingsSideCatalogDevelopmentTeamApprovalPolicy,
  type CatalogAuthoringReviewArtifact,
  type CatalogAuthoringSourceManifest,
  type ReviewedCatalogRowDecision,
} from './lib/wingsSideTourEditorialCatalogAuthoring'
import { readProtectedWingsSideCatalogCandidateOverlay } from './lib/wingsSideCatalogCandidateOverlay'
import type { WingsSideCatalogSourceSnapshot } from './lib/wingsSideCatalogSourceSnapshot'
import {
  editorialPricingApprovalChecksum,
  wingsSideTourEditorialLocales,
  type WingsSideTourEditorialCatalog,
} from './lib/wingsSideTourEditorialLocalization'

const argument = (name: string) => {
  const inline = process.argv.find((value) => value.startsWith(`${name}=`))
  if (inline) return inline.slice(name.length + 1)
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : undefined
}
const required = (name: string) => {
  const value = argument(name)
  if (!value) throw new Error(`Missing required ${name}`)
  return value
}
const requiredPath = (name: string) => path.resolve(required(name))
const sha256 = (bytes: Buffer | string) =>
  crypto.createHash('sha256').update(bytes).digest('hex')
const readJSON = async <T>(filePath: string): Promise<T> =>
  JSON.parse(await fs.readFile(filePath, 'utf8')) as T
const jsonBytes = (value: unknown) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`)

export const runWingsSideCatalogV2Rehearsal = async () => {
  const snapshot = await readJSON<WingsSideCatalogSourceSnapshot>(requiredPath('--snapshot'))
  const sourceManifest = await readJSON<CatalogAuthoringSourceManifest>(
    requiredPath('--manifest'),
  )
  const candidateOverlay = readProtectedWingsSideCatalogCandidateOverlay({
    expectedRawSha256: required('--candidate-overlay-sha256'),
    filePath: requiredPath('--candidate-overlay'),
    snapshot,
  })
  const manifestPath = requiredPath('--manifest')
  const manifestBytes = await fs.readFile(manifestPath)
  const localeArtifacts = wingsSideTourEditorialLocales.map((locale) => {
    const filePath = requiredPath(`--locale-${locale}`)
    const bytes = fsSync.readFileSync(filePath)
    return readFrozenCatalogAuthoringArtifact({
      expectedSha256: sha256(bytes),
      filePath,
      validate: (value) => parseCatalogAuthoringLocaleFile(value, locale),
    })
  }).map((artifact, index) => ({
    ...artifact,
    locale: wingsSideTourEditorialLocales[index]!,
  }))
  const draft = buildWingsSideCatalogAuthoringDraft({
    expectedSourceManifestSha256: sha256(manifestBytes),
    localeArtifacts,
    sourceManifest,
    sourceManifestArtifactSha256: sha256(manifestBytes),
    sourceTours: snapshot.tours,
  })
  const pricingByKey = new Map(
    candidateOverlay.pricingDisclosures.map((row) => [
      `${row.slug}\0${row.sourceRowID}`,
      row,
    ]),
  )
  const decisions: ReviewedCatalogRowDecision[] = draft.tours.flatMap(({ rows, slug }) =>
    rows.map((row, rowIndex) => {
      const pricing = pricingByKey.get(`${slug}\0${row.sourceRowID}`)
      const labels = Object.fromEntries(
        wingsSideTourEditorialLocales.map((locale) => {
          const legacyTour = localeArtifacts
            .find((artifact) => artifact.locale === locale)!
            .value.tours.find((tour) => tour.slug === slug)!
          const nonGovernedPosition = rows
            .slice(0, rowIndex)
            .filter((candidate) => !candidate.governed).length
          const reviewedLegacyLabels = [...legacyTour.includes, ...legacyTour.excludes]
          const label =
            pricing?.labels[locale] ??
            row.legacySuggestions[locale].label ??
            reviewedLegacyLabels[nonGovernedPosition]
          if (!label) throw new Error(`Missing reviewed ${locale} label: ${slug}:${row.sourceRowID}`)
          return [locale, label]
        }),
      ) as ReviewedCatalogRowDecision['labels']
      return {
        labels,
        positionalMappingReviewed: true as const,
        rationale: pricing
          ? 'D6-C development-team review: pricing disclosure moved to excludes.'
          : 'D6-C development-team review: preserve source service disposition.',
        slug,
        sourceLabelChecksum: row.sourceLabelChecksum,
        sourceRowID: row.sourceRowID,
        targetBucket: pricing?.targetBucket ?? row.sourceBucket,
      }
    }),
  )
  const approvedAt = required('--approved-at')
  if (new Date(approvedAt).toISOString() !== approvedAt) {
    throw new Error('Rehearsal timestamp must be canonical ISO-8601')
  }
  const approvedBy = required('--approved-by')
  const approvalManifest = {
    ...wingsSideCatalogDevelopmentTeamApprovalPolicy,
    approvalArtifactID: required('--run-id'),
    approvedAt,
    approvedBy,
    candidateOverlayChecksum: candidateOverlay.candidateChecksum,
    checksum: '',
    expectedPricingDisclosureCount: 38,
    sourceSnapshotChecksum: snapshot.snapshotChecksum,
    trustedApprovers: [approvedBy],
    version: 1 as const,
  }
  const decisionByKey = new Map(
    decisions.map((decision) => [`${decision.slug}\0${decision.sourceRowID}`, decision]),
  )
  const localeByCode = new Map(
    localeArtifacts.map((artifact) => [
      artifact.locale,
      new Map(artifact.value.tours.map((tour) => [tour.slug, tour])),
    ]),
  )
  const candidate: WingsSideTourEditorialCatalog = {
    approvalManifest,
    pricingDispositions: draft.tours.flatMap(({ rows, slug }) =>
      rows
        .filter(({ governed }) => governed)
        .map((row) => {
          const decision = decisionByKey.get(`${slug}\0${row.sourceRowID}`)!
          return {
            approvalArtifactID: approvalManifest.approvalArtifactID,
            approvedAt,
            approvedBy,
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
    tours: draft.tours.map(({ rows, slug, sourceChecksum }) => ({
      locales: Object.fromEntries(
        wingsSideTourEditorialLocales.map((locale) => {
          const content = localeByCode.get(locale)!.get(slug)!
          const localizedRows = rows.map((row) => {
            const decision = decisionByKey.get(`${slug}\0${row.sourceRowID}`)!
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
      ) as never,
      slug,
      sourceChecksum,
    })),
    version: 2,
  }
  approvalManifest.checksum = editorialPricingApprovalChecksum(candidate)
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519')
  const publicKeyDer = publicKey.export({ format: 'der', type: 'spki' })
  const keyID = `rehearsal-${sha256(publicKeyDer).slice(0, 24)}`
  const review: CatalogAuthoringReviewArtifact = {
    approvalManifest,
    decisions,
    draftPacketChecksum: draft.packetChecksum,
    fullCandidateChecksum: catalogAuthoringChecksum(candidate),
    signature: {
      algorithm: 'ed25519',
      keyID,
      signedAt: approvedAt,
      signerID: approvedBy,
      valueBase64: '',
    },
    version: 1,
  }
  review.signature.valueBase64 = crypto
    .sign(
      null,
      Buffer.from(catalogAuthoringReviewSigningDigest(review), 'utf8'),
      privateKey,
    )
    .toString('base64')
  const reviewBytes = jsonBytes(review)
  const result = reconcileWingsSideCatalogAuthoringReview({
    approvalPolicy: {
      ...wingsSideCatalogDevelopmentTeamApprovalPolicy,
      keyID,
      publicKeySpkiBase64: publicKeyDer.toString('base64'),
      reviewArtifactSha256: sha256(reviewBytes),
      trustedSignerIDs: [approvedBy],
    },
    draft,
    expectedSourceManifestSha256: sha256(manifestBytes),
    localeArtifacts,
    review,
    reviewArtifactSha256: sha256(reviewBytes),
    sourceManifest,
    sourceManifestArtifactSha256: sha256(manifestBytes),
    sourceTours: snapshot.tours,
  })
  await fs.writeFile(requiredPath('--draft-output'), jsonBytes(draft), { flag: 'wx' })
  await fs.writeFile(requiredPath('--review-output'), reviewBytes, { flag: 'wx' })
  await fs.writeFile(requiredPath('--catalog-output'), jsonBytes(result.candidate), {
    flag: 'wx',
  })
  await fs.writeFile(
    requiredPath('--public-policy-output'),
    jsonBytes({
      ...wingsSideCatalogDevelopmentTeamApprovalPolicy,
      keyID,
      publicKeySpkiBase64: publicKeyDer.toString('base64'),
      rehearsalOnly: true,
      trustedSignerIDs: [approvedBy],
    }),
    { flag: 'wx' },
  )
  return {
    candidateChecksum: result.candidateChecksum,
    governedDispositions: result.summary.governedDispositions,
    reviewedRows: result.summary.reviewedRows,
    tourCount: result.candidate.tours.length,
  }
}

const direct =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))

if (direct) {
  void runWingsSideCatalogV2Rehearsal().then(
    (result) => console.log(JSON.stringify(result)),
    (error) => {
      console.error(error instanceof Error ? error.message : error)
      process.exitCode = 1
    },
  )
}
