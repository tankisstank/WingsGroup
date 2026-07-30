import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

import {
  catalogAuthoringChecksum,
  wingsSideCatalogDevelopmentTeamApprovalPolicy,
  type CatalogAuthoringSourceTour,
} from './wingsSideTourEditorialCatalogAuthoring'
import {
  editorialServiceLabelChecksum,
  editorialSourceChecksum,
} from './wingsSideTourEditorialLocalization'
import type { WingsSideCatalogSourceSnapshot } from './wingsSideCatalogSourceSnapshot'

const allLocales = ['en', 'vi', 'it', 'es', 'pt'] as const
const sha256Pattern = /^[a-f0-9]{64}$/u
const gitBlobPattern = /^[a-f0-9]{40}$/u

type CandidateEnglishTour = {
  meta: { breadcrumbLabel: string; description: string; title: string }
  primaryCTALabel: string
  routeSummary: string
  slug: string
  sourceChecksum: string
  summary: string
  title: string
}

type CandidateEnglishFile = {
  locale: 'en'
  tours: CandidateEnglishTour[]
  version: 1
}

export type CandidatePricingRow = {
  labels: Record<(typeof allLocales)[number], string>
  slug: string
  sourceBucket: 'excludes' | 'includes'
  sourceLabel: string
  sourceLabelChecksum: string
  sourceRowID: string
  targetBucket: 'excludes' | 'includes'
}

type CandidatePricingFile = {
  decision: 'D4-C' | 'D6-C'
  expectedRowCount: 38
  locales: string[]
  rows: CandidatePricingRow[]
  version: 1
}

export type ArtifactBinding = {
  canonicalJsonSha256: string
  gitBlobOid: string
  leaderWorktree: {
    absolutePath: string
    canonicalJsonSha256: string
    gitBlobOid: string
    rawSha256: string
  }
  path: string
  rawSha256: string
}

export type WingsSideCatalogCandidateOverlay = {
  candidateChecksum: string
  englishTours: Array<
    Omit<CandidateEnglishTour, 'sourceChecksum'> & {
      authoredAgainstSourceChecksum: string
      preservedServiceRowChecksum: string
      sourceChecksum: string
      tourID: number | string
    }
  >
  inputArtifacts: {
    englishCandidate: ArtifactBinding
    historicalSourceManifest: ArtifactBinding
    pricingDisclosures: ArtifactBinding
  }
  pricingDisclosures: CandidatePricingRow[]
  siteCode: 'wing-side'
  sourceSnapshotChecksum: string
  supportedLocales: readonly ['en', 'vi', 'it', 'es', 'pt']
  version: 1
}

export type WingsSideCatalogCandidateReviewPacket = {
  candidateChecksum: string
  expectedGovernedDisclosureCount: 38
  expectedTourCount: 22
  policy: typeof wingsSideCatalogDevelopmentTeamApprovalPolicy
  sourceSnapshotChecksum: string
  status: 'LOCAL_REHEARSAL_REVIEW_REQUIRED'
  supportedLocales: readonly ['en', 'vi', 'it', 'es', 'pt']
  version: 1
}

export type WingsSideCatalogCandidateSignedEvidence = {
  approval: {
    approvedAt: string
    approvedBy: string
    artifactPurpose: typeof wingsSideCatalogDevelopmentTeamApprovalPolicy.artifactPurpose
    decision: typeof wingsSideCatalogDevelopmentTeamApprovalPolicy.decision
    keyID: string
    policyID: typeof wingsSideCatalogDevelopmentTeamApprovalPolicy.policyID
    policyVersion: typeof wingsSideCatalogDevelopmentTeamApprovalPolicy.policyVersion
    publicKeySpkiBase64: string
    rehearsalOnly: true
    runID: string
    signerRole: typeof wingsSideCatalogDevelopmentTeamApprovalPolicy.signerRole
  }
  reviewPacket: WingsSideCatalogCandidateReviewPacket
  signature: {
    algorithm: 'ed25519'
    valueBase64: string
  }
  version: 1
}

const hash = (algorithm: 'sha1' | 'sha256', bytes: Buffer | string) =>
  crypto.createHash(algorithm).update(bytes).digest('hex')

const gitBlobOid = (bytes: Buffer) =>
  hash('sha1', Buffer.concat([Buffer.from(`blob ${bytes.length}\0`), bytes]))

const rawJSONBinding = (filePath: string) => {
  const absolutePath = fs.realpathSync(filePath)
  const bytes = fs.readFileSync(absolutePath)
  let parsed: unknown
  try {
    parsed = JSON.parse(bytes.toString('utf8'))
  } catch {
    throw new Error(`Candidate input is invalid JSON: ${absolutePath}`)
  }
  return {
    absolutePath,
    canonicalJsonSha256: catalogAuthoringChecksum(parsed),
    gitBlobOid: gitBlobOid(bytes),
    rawSha256: hash('sha256', bytes),
  }
}

export const bindJSONArtifact = (
  filePath: string,
  leaderWorktreePath: string,
): ArtifactBinding => {
  const current = rawJSONBinding(filePath)
  const leader = rawJSONBinding(leaderWorktreePath)
  if (
    current.canonicalJsonSha256 !== leader.canonicalJsonSha256
  ) {
    throw new Error(`Leader worktree artifact content differs: ${leader.absolutePath}`)
  }
  return {
    canonicalJsonSha256: current.canonicalJsonSha256,
    gitBlobOid: current.gitBlobOid,
    leaderWorktree: leader,
    path: path.relative(process.cwd(), current.absolutePath).replaceAll('\\', '/'),
    rawSha256: current.rawSha256,
  }
}

const normalize = (value: unknown, label: string) => {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} is required`)
  return value.normalize('NFKC').replace(/\s+/gu, ' ').trim()
}

const sourceRows = (tour: CatalogAuthoringSourceTour) => [
  ...(tour.includes ?? []).map((row) => ({ row, sourceBucket: 'includes' as const })),
  ...(tour.excludes ?? []).map((row) => ({ row, sourceBucket: 'excludes' as const })),
]

const candidateChecksumPayload = (candidate: WingsSideCatalogCandidateOverlay) => ({
  englishTours: candidate.englishTours,
  inputCanonicalChecksums: {
    englishCandidate: candidate.inputArtifacts.englishCandidate.canonicalJsonSha256,
    historicalSourceManifest:
      candidate.inputArtifacts.historicalSourceManifest.canonicalJsonSha256,
    pricingDisclosures:
      candidate.inputArtifacts.pricingDisclosures.canonicalJsonSha256,
  },
  pricingDisclosures: candidate.pricingDisclosures,
  siteCode: candidate.siteCode,
  sourceSnapshotChecksum: candidate.sourceSnapshotChecksum,
  supportedLocales: candidate.supportedLocales,
  version: candidate.version,
})

const exactObject = (
  value: unknown,
  keys: readonly string[],
  label: string,
): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object`)
  }
  const record = value as Record<string, unknown>
  if (Object.keys(record).sort().join('\0') !== [...keys].sort().join('\0')) {
    throw new Error(`${label} contains missing or unknown fields`)
  }
  return record
}

const requiredHash = (value: unknown, pattern: RegExp, label: string) => {
  if (typeof value !== 'string' || !pattern.test(value)) {
    throw new Error(`${label} is invalid`)
  }
}

const validateArtifactBinding = (value: unknown, label: string) => {
  const binding = exactObject(
    value,
    [
      'canonicalJsonSha256',
      'gitBlobOid',
      'leaderWorktree',
      'path',
      'rawSha256',
    ],
    label,
  )
  const leader = exactObject(
    binding.leaderWorktree,
    ['absolutePath', 'canonicalJsonSha256', 'gitBlobOid', 'rawSha256'],
    `${label} leaderWorktree`,
  )
  requiredHash(binding.canonicalJsonSha256, sha256Pattern, `${label} canonical checksum`)
  requiredHash(binding.gitBlobOid, gitBlobPattern, `${label} git blob`)
  requiredHash(binding.rawSha256, sha256Pattern, `${label} raw checksum`)
  requiredHash(leader.canonicalJsonSha256, sha256Pattern, `${label} leader canonical checksum`)
  requiredHash(leader.gitBlobOid, gitBlobPattern, `${label} leader git blob`)
  requiredHash(leader.rawSha256, sha256Pattern, `${label} leader raw checksum`)
  normalize(binding.path, `${label} path`)
  normalize(leader.absolutePath, `${label} leader absolute path`)
  if (binding.canonicalJsonSha256 !== leader.canonicalJsonSha256) {
    throw new Error(`${label} canonical leader binding mismatch`)
  }
}

const validateFrozenSnapshot = (snapshot: WingsSideCatalogSourceSnapshot) => {
  const snapshotRecord = exactObject(
    snapshot,
    [
      'database',
      'schemaFingerprint',
      'site',
      'snapshotChecksum',
      'sourceLocale',
      'tours',
      'version',
    ],
    'Frozen catalog source snapshot',
  )
  if (
    snapshotRecord.version !== 1 ||
    snapshotRecord.sourceLocale !== 'en' ||
    !Array.isArray(snapshotRecord.tours) ||
    snapshotRecord.tours.length !== 22
  ) {
    throw new Error('Frozen catalog source snapshot requires exact 22 English tours')
  }
  const { snapshotChecksum, ...snapshotWithoutChecksum } = snapshot
  if (
    !sha256Pattern.test(snapshotChecksum) ||
    catalogAuthoringChecksum(snapshotWithoutChecksum) !== snapshotChecksum
  ) {
    throw new Error('Frozen catalog source snapshot checksum drift')
  }
  const slugs = snapshot.tours.map(({ slug }) => slug)
  const tourIDs = snapshot.tours.map(({ tourID }) => String(tourID))
  const serviceRows = snapshot.tours.flatMap((tour) => sourceRows(tour))
  const rowIDs = serviceRows.map(({ row }) => String(row.id))
  const itineraryCount = snapshot.tours.reduce(
    (count, tour) => count + (tour.itineraryDays?.length ?? 0),
    0,
  )
  if (
    new Set(slugs).size !== 22 ||
    new Set(tourIDs).size !== 22 ||
    serviceRows.length !== 331 ||
    new Set(rowIDs).size !== 331 ||
    itineraryCount !== 116
  ) {
    throw new Error('Frozen catalog source snapshot inventory differs from 22/116/331')
  }
}

export const validateWingsSideCatalogCandidateOverlay = (
  value: unknown,
  snapshot: WingsSideCatalogSourceSnapshot,
): WingsSideCatalogCandidateOverlay => {
  validateFrozenSnapshot(snapshot)
  const root = exactObject(
    value,
    [
      'candidateChecksum',
      'englishTours',
      'inputArtifacts',
      'pricingDisclosures',
      'siteCode',
      'sourceSnapshotChecksum',
      'supportedLocales',
      'version',
    ],
    'Candidate overlay',
  )
  if (
    root.version !== 1 ||
    root.siteCode !== 'wing-side' ||
    root.sourceSnapshotChecksum !== snapshot.snapshotChecksum ||
    JSON.stringify(root.supportedLocales) !== JSON.stringify(allLocales) ||
    !Array.isArray(root.englishTours) ||
    root.englishTours.length !== 22 ||
    !Array.isArray(root.pricingDisclosures) ||
    root.pricingDisclosures.length !== 38
  ) {
    throw new Error('Candidate overlay schema, source snapshot, or exact inventory mismatch')
  }
  const inputArtifacts = exactObject(
    root.inputArtifacts,
    ['englishCandidate', 'historicalSourceManifest', 'pricingDisclosures'],
    'Candidate overlay inputArtifacts',
  )
  validateArtifactBinding(inputArtifacts.englishCandidate, 'English candidate binding')
  validateArtifactBinding(
    inputArtifacts.historicalSourceManifest,
    'Historical source manifest binding',
  )
  validateArtifactBinding(inputArtifacts.pricingDisclosures, 'Pricing disclosures binding')

  const candidate = value as WingsSideCatalogCandidateOverlay
  const sourceBySlug = new Map(snapshot.tours.map((tour) => [tour.slug, tour]))
  const englishSlugs = new Set<string>()
  for (const [index, tourValue] of candidate.englishTours.entries()) {
    const tour = exactObject(
      tourValue,
      [
        'authoredAgainstSourceChecksum',
        'meta',
        'preservedServiceRowChecksum',
        'primaryCTALabel',
        'routeSummary',
        'slug',
        'sourceChecksum',
        'summary',
        'title',
        'tourID',
      ],
      `Candidate English tour ${index}`,
    )
    const meta = exactObject(
      tour.meta,
      ['breadcrumbLabel', 'description', 'title'],
      `Candidate English tour ${index} meta`,
    )
    const slug = normalize(tour.slug, `Candidate English tour ${index} slug`)
    if (englishSlugs.has(slug)) throw new Error(`Duplicate candidate English tour: ${slug}`)
    englishSlugs.add(slug)
    const source = sourceBySlug.get(slug)
    if (
      !source ||
      String(tour.tourID) !== String(source.tourID) ||
      tour.sourceChecksum !== editorialSourceChecksum(source) ||
      tour.preservedServiceRowChecksum !==
        catalogAuthoringChecksum(
          sourceRows(source).map(({ row, sourceBucket }) => ({
            sourceBucket,
            sourceLabelChecksum: editorialServiceLabelChecksum(row.label),
            sourceRowID: String(row.id),
          })),
        )
    ) {
      throw new Error(`Candidate English tour source binding mismatch: ${slug}`)
    }
    requiredHash(
      tour.authoredAgainstSourceChecksum,
      sha256Pattern,
      `${slug} authored-against checksum`,
    )
    normalize(tour.title, `${slug} title`)
    normalize(tour.summary, `${slug} summary`)
    normalize(tour.routeSummary, `${slug} route summary`)
    normalize(tour.primaryCTALabel, `${slug} CTA`)
    normalize(meta.breadcrumbLabel, `${slug} breadcrumb`)
    normalize(meta.description, `${slug} meta description`)
    normalize(meta.title, `${slug} meta title`)
  }
  if (
    englishSlugs.size !== 22 ||
    [...sourceBySlug.keys()].some((slug) => !englishSlugs.has(slug))
  ) {
    throw new Error('Candidate English tour inventory differs from frozen source snapshot')
  }

  const pricingKeys = new Set<string>()
  for (const [index, rowValue] of candidate.pricingDisclosures.entries()) {
    const row = exactObject(
      rowValue,
      [
        'labels',
        'slug',
        'sourceBucket',
        'sourceLabel',
        'sourceLabelChecksum',
        'sourceRowID',
        'targetBucket',
      ],
      `Candidate pricing row ${index}`,
    )
    const labels = exactObject(row.labels, allLocales, `Candidate pricing row ${index} labels`)
    const slug = normalize(row.slug, `Candidate pricing row ${index} slug`)
    const sourceRowID = normalize(row.sourceRowID, `Candidate pricing row ${index} sourceRowID`)
    const key = `${slug}\0${sourceRowID}`
    if (pricingKeys.has(key)) throw new Error(`Duplicate pricing disclosure identity: ${key}`)
    pricingKeys.add(key)
    const source = sourceBySlug.get(slug)
    const observed = source
      ? sourceRows(source).find(({ row: service }) => String(service.id) === sourceRowID)
      : undefined
    if (
      !observed ||
      row.sourceBucket !== observed.sourceBucket ||
      row.targetBucket !== 'excludes' ||
      normalize(row.sourceLabel, `${key} source label`) !==
        normalize(observed.row.label, `${key} observed label`) ||
      row.sourceLabelChecksum !== editorialServiceLabelChecksum(observed.row.label)
    ) {
      throw new Error(`Candidate pricing source-row binding mismatch: ${key}`)
    }
    for (const locale of allLocales) {
      normalize(labels[locale], `${key}:${locale}`)
    }
  }
  requiredHash(candidate.candidateChecksum, sha256Pattern, 'Candidate overlay checksum')
  if (
    candidate.candidateChecksum !==
    catalogAuthoringChecksum(candidateChecksumPayload(candidate))
  ) {
    throw new Error('Full candidate checksum drift')
  }
  return candidate
}

export const readProtectedWingsSideCatalogCandidateOverlay = ({
  expectedRawSha256,
  filePath,
  snapshot,
}: {
  expectedRawSha256: string
  filePath: string
  snapshot: WingsSideCatalogSourceSnapshot
}) => {
  requiredHash(expectedRawSha256, sha256Pattern, 'Expected candidate overlay SHA-256')
  const absolutePath = fs.realpathSync(filePath)
  const bytes = fs.readFileSync(absolutePath)
  if (hash('sha256', bytes) !== expectedRawSha256) {
    throw new Error('Protected candidate overlay artifact SHA-256 mismatch')
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(bytes.toString('utf8'))
  } catch {
    throw new Error('Protected candidate overlay is invalid JSON')
  }
  return validateWingsSideCatalogCandidateOverlay(parsed, snapshot)
}

export const buildWingsSideCatalogCandidateOverlay = ({
  englishCandidate,
  englishCandidatePath,
  historicalSourceManifest,
  historicalSourceManifestPath,
  leaderWorktreeAppRoot,
  pricingDisclosures,
  pricingDisclosuresPath,
  snapshot,
}: {
  englishCandidate: CandidateEnglishFile
  englishCandidatePath: string
  historicalSourceManifest: {
    tours: Array<{ checksum: string; slug: string }>
    version: 1
  }
  historicalSourceManifestPath: string
  leaderWorktreeAppRoot: string
  pricingDisclosures: CandidatePricingFile
  pricingDisclosuresPath: string
  snapshot: WingsSideCatalogSourceSnapshot
}): WingsSideCatalogCandidateOverlay => {
  if (
    snapshot.version !== 1 ||
    snapshot.site.code !== 'wing-side' ||
    snapshot.sourceLocale !== 'en' ||
    snapshot.tours.length !== 22 ||
    englishCandidate.version !== 1 ||
    englishCandidate.locale !== 'en' ||
    englishCandidate.tours.length !== 22
  ) {
    throw new Error('Candidate overlay requires exact 22-tour English source and candidate')
  }
  const sourceBySlug = new Map(snapshot.tours.map((tour) => [tour.slug, tour]))
  const historicalBySlug = new Map(
    historicalSourceManifest.tours.map((tour) => [tour.slug, tour.checksum]),
  )
  if (sourceBySlug.size !== 22) throw new Error('Source snapshot contains duplicate tour slugs')
  if (
    historicalSourceManifest.version !== 1 ||
    historicalBySlug.size !== 22 ||
    [...historicalBySlug].some(([slug]) => !sourceBySlug.has(slug))
  ) {
    throw new Error('Historical candidate source manifest must contain the same exact 22 slugs')
  }
  const candidateSlugs = englishCandidate.tours.map(({ slug }) => slug)
  if (
    new Set(candidateSlugs).size !== 22 ||
    candidateSlugs.some((slug) => !sourceBySlug.has(slug))
  ) {
    throw new Error('English candidate tour inventory differs from source snapshot')
  }
  const englishTours = [...englishCandidate.tours]
    .sort((left, right) => left.slug.localeCompare(right.slug))
    .map((candidate) => {
      const source = sourceBySlug.get(candidate.slug)!
      if (
        candidate.sourceChecksum !== historicalBySlug.get(candidate.slug) ||
        !candidate.meta ||
        Object.values(candidate.meta).some((value) => !normalize(value, candidate.slug))
      ) {
        throw new Error(`English candidate historical source binding mismatch: ${candidate.slug}`)
      }
      const { sourceChecksum: authoredAgainstSourceChecksum, ...content } = candidate
      return {
        ...content,
        authoredAgainstSourceChecksum,
        meta: {
          breadcrumbLabel: normalize(candidate.meta.breadcrumbLabel, `${candidate.slug}:breadcrumb`),
          description: normalize(candidate.meta.description, `${candidate.slug}:meta-description`),
          title: normalize(candidate.meta.title, `${candidate.slug}:meta-title`),
        },
        preservedServiceRowChecksum: catalogAuthoringChecksum(
          sourceRows(source).map(({ row, sourceBucket }) => ({
            sourceBucket,
            sourceLabelChecksum: editorialServiceLabelChecksum(row.label),
            sourceRowID: String(row.id),
          })),
        ),
        primaryCTALabel: normalize(candidate.primaryCTALabel, `${candidate.slug}:cta`),
        routeSummary: normalize(candidate.routeSummary, `${candidate.slug}:route`),
        sourceChecksum: editorialSourceChecksum(source),
        summary: normalize(candidate.summary, `${candidate.slug}:summary`),
        title: normalize(candidate.title, `${candidate.slug}:title`),
        tourID: source.tourID,
      }
    })
  if (
    pricingDisclosures.version !== 1 ||
    pricingDisclosures.expectedRowCount !== 38 ||
    pricingDisclosures.rows.length !== 38 ||
    JSON.stringify(pricingDisclosures.locales) !== JSON.stringify(allLocales)
  ) {
    throw new Error('Pricing disclosures must contain exact 38 rows and en,vi,it,es,pt')
  }
  const pricingKeys = new Set<string>()
  const pricingRows = [...pricingDisclosures.rows]
    .sort((left, right) =>
      `${left.slug}\0${left.sourceRowID}`.localeCompare(`${right.slug}\0${right.sourceRowID}`),
    )
    .map((row) => {
      const key = `${row.slug}\0${row.sourceRowID}`
      if (pricingKeys.has(key)) throw new Error(`Duplicate pricing disclosure identity: ${key}`)
      pricingKeys.add(key)
      const source = sourceBySlug.get(row.slug)
      const observed = sourceRows(source!).find(
        ({ row: service }) => String(service.id) === row.sourceRowID,
      )
      if (
        !source ||
        !observed ||
        observed.sourceBucket !== row.sourceBucket ||
        normalize(observed.row.label, key) !== normalize(row.sourceLabel, key) ||
        editorialServiceLabelChecksum(observed.row.label) !== row.sourceLabelChecksum ||
        row.targetBucket !== 'excludes' ||
        Object.keys(row.labels).sort().join(',') !== [...allLocales].sort().join(',')
      ) {
        throw new Error(`Pricing disclosure source binding mismatch: ${key}`)
      }
      for (const locale of allLocales) normalize(row.labels[locale], `${key}:${locale}`)
      return row
    })
  const candidate = {
    candidateChecksum: '',
    englishTours,
    inputArtifacts: {
      englishCandidate: bindJSONArtifact(
        englishCandidatePath,
        path.join(
          leaderWorktreeAppRoot,
          'scripts/data/wingsside-tour-content-candidates/en.json',
        ),
      ),
      historicalSourceManifest: bindJSONArtifact(
        historicalSourceManifestPath,
        path.join(
          leaderWorktreeAppRoot,
          'scripts/data/wingsside-tour-editorial/source-manifest.json',
        ),
      ),
      pricingDisclosures: bindJSONArtifact(
        pricingDisclosuresPath,
        path.join(
          leaderWorktreeAppRoot,
          'scripts/data/wingsside-tour-content-candidates/pricing-disclosures.json',
        ),
      ),
    },
    pricingDisclosures: pricingRows,
    siteCode: 'wing-side' as const,
    sourceSnapshotChecksum: snapshot.snapshotChecksum,
    supportedLocales: allLocales,
    version: 1 as const,
  }
  candidate.candidateChecksum = catalogAuthoringChecksum(candidateChecksumPayload(candidate))
  return candidate
}

export const buildWingsSideCatalogCandidateReviewPacket = (
  candidate: WingsSideCatalogCandidateOverlay,
): WingsSideCatalogCandidateReviewPacket => {
  if (
    candidate.candidateChecksum !==
    catalogAuthoringChecksum(candidateChecksumPayload(candidate))
  ) {
    throw new Error('Full candidate checksum drift')
  }
  return {
    candidateChecksum: candidate.candidateChecksum,
    expectedGovernedDisclosureCount: 38,
    expectedTourCount: 22,
    policy: wingsSideCatalogDevelopmentTeamApprovalPolicy,
    sourceSnapshotChecksum: candidate.sourceSnapshotChecksum,
    status: 'LOCAL_REHEARSAL_REVIEW_REQUIRED',
    supportedLocales: allLocales,
    version: 1,
  }
}

export const signWingsSideCatalogCandidateRehearsal = ({
  approvedAt,
  approvedBy,
  candidate,
  runID,
}: {
  approvedAt: string
  approvedBy: string
  candidate: WingsSideCatalogCandidateOverlay
  runID: string
}): WingsSideCatalogCandidateSignedEvidence => {
  if (new Date(approvedAt).toISOString() !== approvedAt) {
    throw new Error('Rehearsal approval timestamp must be canonical ISO-8601')
  }
  normalize(approvedBy, 'Rehearsal approver')
  normalize(runID, 'Rehearsal run ID')
  const reviewPacket = buildWingsSideCatalogCandidateReviewPacket(candidate)
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519')
  const publicKeyDer = publicKey.export({ format: 'der', type: 'spki' })
  const keyID = `rehearsal-${hash('sha256', publicKeyDer).slice(0, 24)}`
  const approval = {
    ...wingsSideCatalogDevelopmentTeamApprovalPolicy,
    approvedAt,
    approvedBy,
    keyID,
    publicKeySpkiBase64: publicKeyDer.toString('base64'),
    rehearsalOnly: true as const,
    runID,
  }
  const payload = catalogAuthoringChecksum({ approval, reviewPacket })
  return {
    approval,
    reviewPacket,
    signature: {
      algorithm: 'ed25519',
      valueBase64: crypto.sign(null, Buffer.from(payload, 'utf8'), privateKey).toString('base64'),
    },
    version: 1,
  }
}

export const verifyWingsSideCatalogCandidateSignedEvidence = (
  evidence: WingsSideCatalogCandidateSignedEvidence,
  candidate: WingsSideCatalogCandidateOverlay,
  options: {
    consumedEvidenceDigests?: ReadonlySet<string>
    expectedRunID?: string
  } = {},
) => {
  const expectedPacket = buildWingsSideCatalogCandidateReviewPacket(candidate)
  if (
    catalogAuthoringChecksum(evidence.reviewPacket) !==
      catalogAuthoringChecksum(expectedPacket) ||
    evidence.approval.rehearsalOnly !== true ||
    (options.expectedRunID !== undefined &&
      evidence.approval.runID !== options.expectedRunID) ||
    evidence.approval.policyID !== wingsSideCatalogDevelopmentTeamApprovalPolicy.policyID ||
    evidence.approval.policyVersion !==
      wingsSideCatalogDevelopmentTeamApprovalPolicy.policyVersion ||
    evidence.approval.signerRole !== wingsSideCatalogDevelopmentTeamApprovalPolicy.signerRole
  ) {
    throw new Error('Candidate rehearsal evidence policy or packet substitution')
  }
  const publicKey = crypto.createPublicKey({
    format: 'der',
    key: Buffer.from(evidence.approval.publicKeySpkiBase64, 'base64'),
    type: 'spki',
  })
  const digest = catalogAuthoringChecksum({
    approval: evidence.approval,
    reviewPacket: evidence.reviewPacket,
  })
  const evidenceDigest = catalogAuthoringChecksum(evidence)
  if (options.consumedEvidenceDigests?.has(evidenceDigest)) {
    throw new Error('Candidate rehearsal evidence replay detected')
  }
  if (
    publicKey.asymmetricKeyType !== 'ed25519' ||
    !crypto.verify(
      null,
      Buffer.from(digest, 'utf8'),
      publicKey,
      Buffer.from(evidence.signature.valueBase64, 'base64'),
    )
  ) {
    throw new Error('Candidate rehearsal signature is invalid')
  }
  return evidenceDigest
}
