import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import sharp from 'sharp'

import {
  parseWingsSideTourMediaD4CManifest,
  readWingsSideD4CVerifiedFile,
  resolveWingsSideD4CApprovedRoot,
} from './lib/wingsSideTourMediaD4C'
import { parseWingsSideD4CReviewManifest } from './lib/wingsSideTourMediaD4CReview'
import {
  buildWingsSideD4CPerceptualFingerprint,
  isWingsSideD4CReviewCandidate,
  rankWingsSideD4CReplacementCandidates,
  validateWingsSideD4CReplacementMapping,
  validateWingsSideD4CZoomIndexCoverage,
  type WingsSideD4CDisposition,
  type WingsSideD4CPerceptualFingerprint,
  type WingsSideD4CRejectedNearDuplicate,
  type WingsSideD4CReplacementMapping,
  type WingsSideD4CZoomIndex,
} from './lib/wingsSideTourMediaD4CReplacements'

const expectedRejectedNearDuplicates: WingsSideD4CRejectedNearDuplicate[] = [
  {
    candidateMediaIDs: [2721],
    candidateSha256: '0b4977613ebd884cfe70b854772b6980fd644dc2536cb71b1048151182d7f2d5',
    confidence: 'rejected',
    matchType: 'near-duplicate',
    reason:
      'Near-identical cave frame, but the proposed candidate visibly retains the BestPrice Travel wordmark in the upper-right region and was reclassified watermark-positive by R4.',
    sourceMediaIDs: [2730],
    sourceSha256: '4b450b90b82d8bcba8c9c6321ae14872935451782ef9d5e0ffa07a313a8b4b6c',
  },
  {
    candidateMediaIDs: [6647],
    candidateSha256: '77809644dd4e2dca09b5e9d4345a9df62176b4137c56e57b7a62a6648b75d857',
    confidence: 'rejected',
    matchType: 'near-duplicate',
    reason:
      'Near-identical cave frame, but the proposed candidate visibly retains the BestPrice Travel wordmark in the lower-left region and was reclassified watermark-positive by R4.',
    sourceMediaIDs: [6659],
    sourceSha256: '627e96721a0d0f9469a7e8aac7be8b540d6f1af5d4c51f50b1b2f55fba30dcc8',
  },
  {
    candidateMediaIDs: [6579],
    candidateSha256: 'bbe612e8ab9dd832b762bd7f4d1fac721dfd8a419198e2bde1853f8c6b3c7439',
    confidence: 'rejected',
    matchType: 'near-duplicate',
    reason:
      'Near-identical Hoi An portrait frame, but the proposed candidate visibly retains the BestPrice Travel wordmark in the lower-left region and was reclassified watermark-positive by R4.',
    sourceMediaIDs: [5872],
    sourceSha256: '95ea117d6b31d3161816ec03956eb50904e27467c027b42556db64c3794d6988',
  },
  {
    candidateMediaIDs: [6442],
    candidateSha256: '714a471fccfe62a7723704802440d49f311310212c6ad41c827aa397d69e510a',
    confidence: 'rejected',
    matchType: 'near-duplicate',
    reason:
      'Near-identical post-office group frame, but the proposed candidate visibly retains the BestPrice Travel wordmark in the lower-right region and was reclassified watermark-positive by R4.',
    sourceMediaIDs: [6421],
    sourceSha256: 'b6111ae17dba8a37cd0731f26fe0f85c6536fd9ab4b759d59f96e0dccda93cfe',
  },
]

const args = process.argv.slice(2)
const mode = args[0]
if (mode !== 'prepare-audit' && mode !== 'analyze' && mode !== 'verify') {
  throw new Error(
    'Usage: tsx scripts/analyze-wingsside-tour-media-d4c-replacements.ts <prepare-audit|analyze|verify> --inventory <json> --disposition <json> --media-root <dir> --evidence-root <dir>',
  )
}
const value = (name: string): string => {
  const index = args.indexOf(name)
  const result = index >= 0 ? args[index + 1]?.trim() : ''
  if (!result || result.startsWith('--')) throw new Error(`Missing ${name}`)
  return result
}

const inventoryPath = path.resolve(value('--inventory'))
const dispositionPath = path.resolve(value('--disposition'))
const evidenceRoot = path.resolve(value('--evidence-root'))
const mediaRoot = await resolveWingsSideD4CApprovedRoot(value('--media-root'))
const inventoryRaw = await readFile(inventoryPath, 'utf8')
const dispositionRaw = await readFile(dispositionPath, 'utf8')
const inventory = parseWingsSideTourMediaD4CManifest(JSON.parse(inventoryRaw) as unknown)
const disposition = parseWingsSideD4CReviewManifest(
  JSON.parse(dispositionRaw) as unknown,
  inventory,
)
const dispositionByHash = new Map(
  disposition.assets.map((asset) => [asset.source.sha256, asset.disposition]),
)
const positives = inventory.assets.filter(
  ({ sha256 }) => dispositionByHash.get(sha256) === 'watermark-positive',
)
const clean = inventory.assets.filter(({ sha256 }) => dispositionByHash.get(sha256) === 'clean')
if (positives.length !== 191 || clean.length !== 395) {
  throw new Error(`D4-C replacement analysis requires exactly 191 positive and 395 clean hashes`)
}

const sha256 = (bytes: Buffer | string): string =>
  createHash('sha256').update(bytes).digest('hex')
const assetByHash = new Map(inventory.assets.map((asset) => [asset.sha256, asset]))
const bytesByHash = new Map<string, Buffer>()
const fingerprints = new Map<string, WingsSideD4CPerceptualFingerprint>()
let verifiedByteLength = 0

for (const asset of inventory.assets) {
  const source = await readWingsSideD4CVerifiedFile({
    approvedRootRealPath: mediaRoot,
    relativePath: asset.filenames[0]!,
  })
  if (source.sha256 !== asset.sha256 || source.bytes.byteLength !== asset.byteLength) {
    throw new Error(`D4-C replacement source binding failed for ${asset.sha256}`)
  }
  const pixels = await sharp(source.bytes)
    .rotate()
    .resize(64, 64, { fit: 'fill' })
    .greyscale()
    .raw()
    .toBuffer()
  bytesByHash.set(asset.sha256, source.bytes)
  fingerprints.set(asset.sha256, buildWingsSideD4CPerceptualFingerprint(pixels))
  verifiedByteLength += source.bytes.byteLength
}

if (mode === 'prepare-audit') {
  const auditRoot = path.join(evidenceRoot, 'clean-zoom-sheets')
  await mkdir(auditRoot, { recursive: true })
  const columns = 4
  const rows = 4
  const perSheet = columns * rows
  const cellWidth = 480
  const fullHeight = 270
  const zoomHeight = 90
  const labelHeight = 30
  const cellHeight = fullHeight + zoomHeight + labelHeight
  const auditAssets = clean.map((asset, index) => ({
    cell: (index % perSheet) + 1,
    filename: asset.filenames[0],
    mediaIDs: asset.mediaIDs,
    sheet: Math.floor(index / perSheet) + 1,
    sourceSha256: asset.sha256,
  }))
  const sheets = []
  for (let offset = 0; offset < clean.length; offset += perSheet) {
    const page = clean.slice(offset, offset + perSheet)
    const composites: sharp.OverlayOptions[] = []
    for (let index = 0; index < page.length; index += 1) {
      const asset = page[index]!
      const oriented = await sharp(bytesByHash.get(asset.sha256)!)
        .rotate()
        .toBuffer({ resolveWithObject: true })
      const width = oriented.info.width
      const height = oriented.info.height
      const rightLeft = Math.floor(width / 2)
      const bottomTop = Math.floor(height / 2)
      const [full, topRight, bottomLeft, bottomRight] = await Promise.all([
        sharp(oriented.data)
          .resize(cellWidth, fullHeight, { background: '#202020', fit: 'contain' })
          .jpeg({ quality: 90 })
          .toBuffer(),
        sharp(oriented.data)
          .extract({ height: Math.max(1, bottomTop), left: rightLeft, top: 0, width: width - rightLeft })
          .resize(cellWidth / 3, zoomHeight, { fit: 'fill' })
          .jpeg({ quality: 92 })
          .toBuffer(),
        sharp(oriented.data)
          .extract({ height: height - bottomTop, left: 0, top: bottomTop, width: Math.max(1, rightLeft) })
          .resize(cellWidth / 3, zoomHeight, { fit: 'fill' })
          .jpeg({ quality: 92 })
          .toBuffer(),
        sharp(oriented.data)
          .extract({ height: height - bottomTop, left: rightLeft, top: bottomTop, width: width - rightLeft })
          .resize(cellWidth / 3, zoomHeight, { fit: 'fill' })
          .jpeg({ quality: 92 })
          .toBuffer(),
      ])
      const x = (index % columns) * cellWidth
      const y = Math.floor(index / columns) * cellHeight
      composites.push({ input: full, left: x, top: y })
      composites.push({ input: topRight, left: x, top: y + fullHeight })
      composites.push({ input: bottomLeft, left: x + cellWidth / 3, top: y + fullHeight })
      composites.push({ input: bottomRight, left: x + (cellWidth / 3) * 2, top: y + fullHeight })
      composites.push({
        input: Buffer.from(
          `<svg width="${cellWidth}" height="${labelHeight}"><rect width="100%" height="100%" fill="#111"/><text x="7" y="19" fill="#fff" font-size="13" font-family="Arial">${index + 1}. ${asset.sha256.slice(0, 12)} IDs ${asset.mediaIDs.join(',')}</text><text x="410" y="19" fill="#aaa" font-size="11" font-family="Arial">TR BL BR</text></svg>`,
        ),
        left: x,
        top: y + fullHeight + zoomHeight,
      })
    }
    const sheetNumber = Math.floor(offset / perSheet) + 1
    const sheetPath = path.join(
      auditRoot,
      `sheet-${String(sheetNumber).padStart(2, '0')}.jpg`,
    )
    await sharp({
      create: {
        background: '#202020',
        channels: 3,
        height: rows * cellHeight,
        width: columns * cellWidth,
      },
    })
      .composite(composites)
      .jpeg({ quality: 92 })
      .toFile(sheetPath)
    const sheetBytes = await readFile(sheetPath)
    sheets.push({
      byteLength: sheetBytes.byteLength,
      path: path.relative(evidenceRoot, sheetPath).replaceAll(path.sep, '/'),
      sha256: sha256(sheetBytes),
    })
  }
  const auditManifest = {
    assets: auditAssets,
    auditMethod: {
      cellLayout:
        'Full frame plus 2x top-right, bottom-left, and bottom-right quadrant views at original-source decode.',
      columns,
      rows,
      statement:
        'R4 superseding audit of all 395 R3-clean hashes. Zoom sheets support manual watermark disposition and do not assert ownership or license rights.',
    },
    priorCleanHashCount: clean.length,
    schemaVersion: 1,
    sheets,
    sourceSnapshotSha256: inventory.sourceSnapshotSha256,
  }
  await writeFile(
    path.join(evidenceRoot, 'clean-zoom-index.json'),
    `${JSON.stringify(auditManifest, null, 2)}\n`,
    'utf8',
  )
  process.stdout.write(
    `${JSON.stringify({ mode, priorCleanHashCount: clean.length, sheetCount: sheets.length })}\n`,
  )
  process.exit(0)
}

const auditDecisionsRaw = await readFile(
  path.join(evidenceRoot, 'clean-zoom-decisions.json'),
  'utf8',
)
const auditDecisions = JSON.parse(auditDecisionsRaw) as {
  positiveHashes?: string[]
  reviewedHashCount?: number
  schemaVersion?: number
}
if (
  auditDecisions.schemaVersion !== 1 ||
  auditDecisions.reviewedHashCount !== clean.length ||
  !Array.isArray(auditDecisions.positiveHashes) ||
  new Set(auditDecisions.positiveHashes).size !== auditDecisions.positiveHashes.length ||
  auditDecisions.positiveHashes.some((hash) => !clean.some((asset) => asset.sha256 === hash))
) {
  throw new Error('D4-C R4 clean zoom decisions do not exactly bind the prior-clean set')
}
const supersedingPositiveHashes = new Set([
  ...positives.map(({ sha256 }) => sha256),
  ...auditDecisions.positiveHashes,
])
const supersedingPositives = inventory.assets.filter(({ sha256 }) =>
  supersedingPositiveHashes.has(sha256),
)
const revalidatedClean = inventory.assets.filter(
  ({ sha256 }) => !supersedingPositiveHashes.has(sha256),
)
const supersedingDispositionDocument = {
  assets: inventory.assets.map((asset) => {
    const r3Disposition = dispositionByHash.get(asset.sha256)
    const reclassifiedByR4 = auditDecisions.positiveHashes!.includes(asset.sha256)
    return {
      disposition: supersedingPositiveHashes.has(asset.sha256)
        ? 'watermark-positive'
        : 'clean',
      filename: asset.filenames[0],
      mediaIDs: asset.mediaIDs,
      r3Disposition,
      r4Reason: reclassifiedByR4
        ? 'Visible BestPrice Travel branding confirmed in sealed R4 original-resolution zone audit.'
        : r3Disposition === 'watermark-positive'
          ? 'R3 positive disposition retained.'
          : 'No visible BestPrice Travel branding observed in sealed R4 original-resolution zone audit.',
      sourceSha256: asset.sha256,
    }
  }),
  coverage: {
    cleanHashCount: revalidatedClean.length,
    reclassifiedFalseNegativeCount: auditDecisions.positiveHashes.length,
    reviewedHashCount: inventory.assets.length,
    watermarkPositiveHashCount: supersedingPositives.length,
  },
  r3DispositionSha256: sha256(dispositionRaw),
  r4CleanZoomDecisionsSha256: sha256(auditDecisionsRaw),
  schemaVersion: 1,
  sourceSnapshotSha256: inventory.sourceSnapshotSha256,
  statement:
    'R4 supersedes R3 technical watermark dispositions while preserving R3 as immutable history. This is a visual technical classification, not an ownership or license claim.',
}
const supersedingDispositionByHash = new Map<string, WingsSideD4CDisposition>(
  supersedingDispositionDocument.assets.map(({ disposition: value, sourceSha256 }) => [
    sourceSha256,
    value as WingsSideD4CDisposition,
  ]),
)

const ranking = supersedingPositives.map((source) => {
  const candidates = rankWingsSideD4CReplacementCandidates({
    cleanAssets: revalidatedClean,
    fingerprints,
    source,
  })
  return {
    reviewCandidates: candidates.filter(isWingsSideD4CReviewCandidate).slice(0, 3),
    sourceFilename: source.filenames[0],
    sourceMediaIDs: source.mediaIDs,
    sourceSha256: source.sha256,
    topCandidates: candidates.slice(0, 3),
  }
})
const reviewPairs = ranking.flatMap((entry) =>
  entry.reviewCandidates.map((candidate) => ({
    ...candidate,
    sourceFilename: entry.sourceFilename,
    sourceMediaIDs: entry.sourceMediaIDs,
    sourceSha256: entry.sourceSha256,
  })),
)

const rankingDocument = {
  algorithm: {
    aspectWeight: 0.1,
    centerDHashWeight: 0.5,
    fullDHashWeight: 0.3,
    rolePenalty: 0.03,
    statement:
      'Deterministic 256-bit grayscale dHash ranking. Review eligibility requires same tour, same semantic role, compatible aspect, and bounded full/center distance. Ranking is not acceptance.',
    tourPenalty: 0.07,
    version: 1,
  },
  coverage: {
    cleanHashCount: revalidatedClean.length,
    positiveHashCount: supersedingPositives.length,
    reclassifiedFalseNegativeCount: auditDecisions.positiveHashes.length,
    positiveWithReviewCandidateCount: new Set(reviewPairs.map(({ sourceSha256 }) => sourceSha256))
      .size,
    reviewPairCount: reviewPairs.length,
    verifiedByteLength,
    verifiedHashCount: inventory.assets.length,
  },
  dispositionSha256: sha256(dispositionRaw),
  inventorySha256: sha256(inventoryRaw),
  ranking,
  schemaVersion: 1,
  sourceBinding: {
    approvedRootContract:
      'Runtime --media-root resolved and constrained by resolveWingsSideD4CApprovedRoot; no machine-specific path is persisted.',
    noWrite: true,
    sourceSnapshotSha256: inventory.sourceSnapshotSha256,
  },
}

const rankingPath = path.join(evidenceRoot, 'candidate-ranking.json')
const mappingPath = path.join(evidenceRoot, 'candidate-mapping.json')
const supersedingDispositionPath = path.join(evidenceRoot, 'superseding-disposition.json')
if (mode === 'verify') {
  const expectedRanking = `${JSON.stringify(rankingDocument, null, 2)}\n`
  if ((await readFile(rankingPath, 'utf8')) !== expectedRanking) {
    throw new Error('D4-C replacement ranking differs from deterministic source analysis')
  }
  if (
    (await readFile(supersedingDispositionPath, 'utf8')) !==
    `${JSON.stringify(supersedingDispositionDocument, null, 2)}\n`
  ) {
    throw new Error('D4-C R4 superseding disposition differs from sealed audit decisions')
  }
  const zoomIndex = JSON.parse(
    await readFile(path.join(evidenceRoot, 'clean-zoom-index.json'), 'utf8'),
  ) as WingsSideD4CZoomIndex
  validateWingsSideD4CZoomIndexCoverage({
    expectedHashes: new Set(clean.map(({ sha256: hash }) => hash)),
    sourceSnapshotSha256: inventory.sourceSnapshotSha256,
    zoomIndex,
  })
  for (const sheet of zoomIndex.sheets!) {
    if (
      typeof sheet.path !== 'string' ||
      typeof sheet.byteLength !== 'number' ||
      typeof sheet.sha256 !== 'string'
    ) {
      throw new Error('D4-C R4 clean zoom sheet entry is invalid')
    }
    const sheetBytes = await readFile(path.join(evidenceRoot, sheet.path))
    if (sheetBytes.byteLength !== sheet.byteLength || sha256(sheetBytes) !== sheet.sha256) {
      throw new Error(`D4-C R4 clean zoom sheet integrity failed: ${sheet.path}`)
    }
  }
  const mapping = JSON.parse(
    await readFile(mappingPath, 'utf8'),
  ) as WingsSideD4CReplacementMapping
  validateWingsSideD4CReplacementMapping({
    assetsByHash: assetByHash,
    expectedRejectedNearDuplicates,
    mapping,
    reclassifiedFalseNegativeCount: auditDecisions.positiveHashes.length,
    sourceSnapshotSha256: inventory.sourceSnapshotSha256,
    supersedingDispositionByHash,
  })
  process.stdout.write(
    `${JSON.stringify({ coverage: mapping.coverage, mode, sourceSnapshotSha256: inventory.sourceSnapshotSha256 })}\n`,
  )
  process.exit(0)
}

await mkdir(path.join(evidenceRoot, 'review-pairs'), { recursive: true })
await writeFile(rankingPath, `${JSON.stringify(rankingDocument, null, 2)}\n`, {
  encoding: 'utf8',
})
await writeFile(
  supersedingDispositionPath,
  `${JSON.stringify(supersedingDispositionDocument, null, 2)}\n`,
  'utf8',
)

const pairWidth = 600
const imageHeight = 300
const labelHeight = 58
const pairsPerSheet = 4
for (let offset = 0; offset < reviewPairs.length; offset += pairsPerSheet) {
  const page = reviewPairs.slice(offset, offset + pairsPerSheet)
  const composites: sharp.OverlayOptions[] = []
  for (let index = 0; index < page.length; index += 1) {
    const pair = page[index]!
    const source = assetByHash.get(pair.sourceSha256)!
    const candidate = assetByHash.get(pair.candidateSha256)!
    const [sourceThumb, candidateThumb] = await Promise.all(
      [source, candidate].map((asset) =>
        sharp(bytesByHash.get(asset.sha256)!)
          .rotate()
          .resize(pairWidth / 2, imageHeight, { background: '#202020', fit: 'contain' })
          .jpeg({ quality: 88 })
          .toBuffer(),
      ),
    )
    const y = index * (imageHeight + labelHeight)
    composites.push({ input: sourceThumb, left: 0, top: y })
    composites.push({ input: candidateThumb, left: pairWidth / 2, top: y })
    composites.push({
      input: Buffer.from(
        `<svg width="${pairWidth}" height="${labelHeight}"><rect width="100%" height="100%" fill="#111"/><text x="8" y="18" fill="#ff8a80" font-size="13" font-family="Arial">POS ${pair.sourceSha256.slice(0, 12)} IDs ${source.mediaIDs.join(',')}</text><text x="308" y="18" fill="#80cbc4" font-size="13" font-family="Arial">CLEAN ${pair.candidateSha256.slice(0, 12)} IDs ${candidate.mediaIDs.join(',')}</text><text x="8" y="40" fill="#ddd" font-size="12" font-family="Arial">score ${pair.score.toFixed(4)} full ${pair.fullDistance.toFixed(4)} center ${pair.centerDistance.toFixed(4)} slot ${pair.slotDistance ?? 'n/a'}</text></svg>`,
      ),
      left: 0,
      top: y + imageHeight,
    })
  }
  const sheetNumber = Math.floor(offset / pairsPerSheet) + 1
  await sharp({
    create: {
      background: '#202020',
      channels: 3,
      height: page.length * (imageHeight + labelHeight),
      width: pairWidth,
    },
  })
    .composite(composites)
    .jpeg({ quality: 90 })
    .toFile(
      path.join(
        evidenceRoot,
        'review-pairs',
        `sheet-${String(sheetNumber).padStart(2, '0')}.jpg`,
      ),
    )
}

process.stdout.write(
  `${JSON.stringify({ coverage: rankingDocument.coverage, mode, rankingPath, reviewSheetCount: Math.ceil(reviewPairs.length / pairsPerSheet) })}\n`,
)
