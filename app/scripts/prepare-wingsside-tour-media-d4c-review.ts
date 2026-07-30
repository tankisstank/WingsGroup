import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import sharp from 'sharp'

import {
  parseWingsSideTourMediaD4CManifest,
  readWingsSideD4CVerifiedFile,
  resolveWingsSideD4CApprovedRoot,
} from './lib/wingsSideTourMediaD4C'
import {
  buildWingsSideD4CReviewDraft,
  parseWingsSideD4CReviewManifest,
  summarizeWingsSideD4CReview,
} from './lib/wingsSideTourMediaD4CReview'

const args = process.argv.slice(2)
const mode = args[0]
if (mode !== 'prepare' && mode !== 'finalize' && mode !== 'verify') {
  throw new Error(
    'Usage: tsx scripts/prepare-wingsside-tour-media-d4c-review.ts <prepare|finalize|verify> --inventory <json> --media-root <dir> --evidence-root <dir>',
  )
}
const value = (name: string): string => {
  const index = args.indexOf(name)
  const result = index >= 0 ? args[index + 1]?.trim() : ''
  if (!result || result.startsWith('--')) throw new Error(`Missing ${name}`)
  return result
}

const inventoryPath = path.resolve(value('--inventory'))
const mediaRoot = await resolveWingsSideD4CApprovedRoot(value('--media-root'))
const evidenceRoot = path.resolve(value('--evidence-root'))
const reviewPath = path.join(evidenceRoot, 'disposition-manifest.json')
const inventory = parseWingsSideTourMediaD4CManifest(
  JSON.parse(await readFile(inventoryPath, 'utf8')) as unknown,
)

if (mode === 'finalize') {
  const draft = parseWingsSideD4CReviewManifest(
    JSON.parse(await readFile(reviewPath, 'utf8')) as unknown,
    inventory,
  )
  const decisions = JSON.parse(
    await readFile(path.join(evidenceRoot, 'visual-review-decisions.json'), 'utf8'),
  ) as {
    positiveCells?: Array<{ cells: number[]; sheet: number }>
    reviewerStatement?: string
    schemaVersion?: number
  }
  if (
    decisions.schemaVersion !== 1 ||
    typeof decisions.reviewerStatement !== 'string' ||
    !decisions.reviewerStatement.trim() ||
    !Array.isArray(decisions.positiveCells)
  ) {
    throw new Error('D4-C visual review decisions are invalid')
  }
  const positives = new Set<string>()
  for (const entry of decisions.positiveCells) {
    if (
      !entry ||
      !Number.isInteger(entry.sheet) ||
      entry.sheet < 1 ||
      !Array.isArray(entry.cells)
    ) {
      throw new Error('D4-C visual review sheet decision is invalid')
    }
    for (const cell of entry.cells) {
      if (!Number.isInteger(cell) || cell < 1 || cell > 25) {
        throw new Error('D4-C visual review cell decision is invalid')
      }
      const key = `${entry.sheet}:${cell}`
      if (positives.has(key)) throw new Error(`D4-C duplicate visual decision ${key}`)
      positives.add(key)
    }
  }
  const assets = draft.assets.map((asset) => {
    const match = /sheet-(\d+)\.jpg$/u.exec(asset.contactSheet)
    if (!match) throw new Error(`D4-C contact-sheet path is invalid: ${asset.contactSheet}`)
    const key = `${Number(match[1])}:${asset.contactSheetCell}`
    const positive = positives.has(key)
    positives.delete(key)
    return {
      ...asset,
      disposition: positive ? ('watermark-positive' as const) : ('clean' as const),
      notes: positive
        ? 'Visible BestPrice Travel brand watermark/logo confirmed by manual contact-sheet review; no output accepted.'
        : 'No visible watermark/logo observed in the manual contact-sheet review.',
    }
  })
  if (positives.size > 0) {
    throw new Error(`D4-C visual decisions reference unknown cells: ${[...positives].join(',')}`)
  }
  const finalized = parseWingsSideD4CReviewManifest(
    {
      ...draft,
      assets,
      coverage: summarizeWingsSideD4CReview(assets),
      reviewMethod: {
        ...draft.reviewMethod,
        statement: decisions.reviewerStatement,
      },
    },
    inventory,
  )
  await writeFile(reviewPath, `${JSON.stringify(finalized, null, 2)}\n`, 'utf8')
  const sheetPaths = [...new Set(finalized.assets.map(({ contactSheet }) => contactSheet))].sort()
  const sheetIndex = []
  for (const relativePath of sheetPaths) {
    const bytes = await readFile(path.join(evidenceRoot, relativePath))
    sheetIndex.push({
      byteLength: bytes.byteLength,
      path: relativePath,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    })
  }
  await writeFile(
    path.join(evidenceRoot, 'contact-sheet-index.json'),
    `${JSON.stringify(
      {
        contactSheetCount: sheetIndex.length,
        dispositionManifest: 'disposition-manifest.json',
        schemaVersion: 1,
        sheets: sheetIndex,
        sourceSnapshotSha256: finalized.sourceSnapshotSha256,
      },
      null,
      2,
    )}\n`,
    'utf8',
  )
  const blockedAssets = finalized.assets
    .filter(({ disposition, output }) => disposition === 'watermark-positive' && output === null)
    .map((asset) => ({
      filename: asset.filename,
      mediaIDs: asset.mediaIDs,
      reason:
        'Visible watermark confirmed; no faithful imagegen output passed subject, framing, dimension, and watermark-removal invariants.',
      sourceSha256: asset.source.sha256,
    }))
  await writeFile(
    path.join(evidenceRoot, 'technical-blockers.json'),
    `${JSON.stringify(
      {
        blockedAssetCount: blockedAssets.length,
        blockers: blockedAssets,
        decision: 'D4-C',
        schemaVersion: 1,
        statement:
          'This is an exact per-content-hash technical blocker list. It is not a blanket rights claim and does not hide rejected candidates.',
      },
      null,
      2,
    )}\n`,
    'utf8',
  )
  process.stdout.write(`${JSON.stringify({ coverage: finalized.coverage, mode })}\n`)
  process.exit(0)
}

if (mode === 'verify') {
  const review = parseWingsSideD4CReviewManifest(
    JSON.parse(await readFile(reviewPath, 'utf8')) as unknown,
    inventory,
  )
  for (const asset of review.assets) {
    const source = await readWingsSideD4CVerifiedFile({
      approvedRootRealPath: mediaRoot,
      relativePath: asset.filename,
    })
    if (
      source.sha256 !== asset.source.sha256 ||
      source.bytes.byteLength !== asset.source.byteLength
    ) {
      throw new Error(`D4-C source immutability check failed for ${asset.filename}`)
    }
  }
  const sheetIndex = JSON.parse(
    await readFile(path.join(evidenceRoot, 'contact-sheet-index.json'), 'utf8'),
  ) as {
    contactSheetCount?: number
    sheets?: Array<{ byteLength?: number; path?: string; sha256?: string }>
    sourceSnapshotSha256?: string
  }
  if (
    sheetIndex.sourceSnapshotSha256 !== review.sourceSnapshotSha256 ||
    sheetIndex.contactSheetCount !== new Set(review.assets.map(({ contactSheet }) => contactSheet)).size ||
    !Array.isArray(sheetIndex.sheets) ||
    sheetIndex.sheets.length !== sheetIndex.contactSheetCount
  ) {
    throw new Error('D4-C contact-sheet index coverage is invalid')
  }
  for (const sheet of sheetIndex.sheets) {
    if (
      typeof sheet.path !== 'string' ||
      typeof sheet.sha256 !== 'string' ||
      typeof sheet.byteLength !== 'number'
    ) {
      throw new Error('D4-C contact-sheet index entry is invalid')
    }
    const bytes = await readFile(path.join(evidenceRoot, sheet.path))
    if (
      bytes.byteLength !== sheet.byteLength ||
      createHash('sha256').update(bytes).digest('hex') !== sheet.sha256
    ) {
      throw new Error(`D4-C contact-sheet integrity failed for ${sheet.path}`)
    }
  }
  const blockers = JSON.parse(
    await readFile(path.join(evidenceRoot, 'technical-blockers.json'), 'utf8'),
  ) as {
    blockedAssetCount?: number
    blockers?: Array<{ sourceSha256?: string }>
  }
  const expectedBlockedHashes = review.assets
    .filter(({ disposition, output }) => disposition === 'watermark-positive' && output === null)
    .map(({ source }) => source.sha256)
    .sort()
  const suppliedBlockedHashes = (blockers.blockers ?? [])
    .map(({ sourceSha256 }) => sourceSha256)
    .sort()
  if (
    blockers.blockedAssetCount !== expectedBlockedHashes.length ||
    suppliedBlockedHashes.join('\0') !== expectedBlockedHashes.join('\0')
  ) {
    throw new Error('D4-C technical blocker list does not exactly cover blocked hashes')
  }
  process.stdout.write(`${JSON.stringify({ coverage: review.coverage, mode })}\n`)
  process.exit(0)
}

const review = buildWingsSideD4CReviewDraft({ inventory })
const contactSheetRoot = path.join(evidenceRoot, 'contact-sheets')
await mkdir(contactSheetRoot, { recursive: true })
const cellWidth = 320
const cellHeight = 220
const labelHeight = 34
const perSheet = review.reviewMethod.contactSheetColumns * review.reviewMethod.contactSheetRows

for (let offset = 0; offset < review.assets.length; offset += perSheet) {
  const page = review.assets.slice(offset, offset + perSheet)
  const composites: sharp.OverlayOptions[] = []
  for (let index = 0; index < page.length; index += 1) {
    const asset = page[index]!
    const source = await readWingsSideD4CVerifiedFile({
      approvedRootRealPath: mediaRoot,
      relativePath: asset.filename,
    })
    if (
      source.sha256 !== asset.source.sha256 ||
      source.bytes.byteLength !== asset.source.byteLength
    ) {
      throw new Error(`D4-C source differs from inventory: ${asset.filename}`)
    }
    const thumbnail = await sharp(source.bytes)
      .rotate()
      .resize(cellWidth, cellHeight - labelHeight, {
        fit: 'contain',
        background: '#202020',
      })
      .jpeg({ quality: 88 })
      .toBuffer()
    const cell = index + 1
    const mediaLabel = asset.mediaIDs.slice(0, 3).join(',')
    const label = Buffer.from(
      `<svg width="${cellWidth}" height="${labelHeight}"><rect width="100%" height="100%" fill="#111"/><text x="8" y="15" fill="#fff" font-size="13" font-family="Arial">${cell}. IDs ${mediaLabel}</text><text x="8" y="30" fill="#bbb" font-size="11" font-family="Arial">${asset.source.sha256.slice(0, 12)}</text></svg>`,
    )
    const x = (index % review.reviewMethod.contactSheetColumns) * cellWidth
    const y = Math.floor(index / review.reviewMethod.contactSheetColumns) * cellHeight
    composites.push({ input: thumbnail, left: x, top: y })
    composites.push({ input: label, left: x, top: y + cellHeight - labelHeight })
  }
  const sheetNumber = Math.floor(offset / perSheet) + 1
  await sharp({
    create: {
      background: '#202020',
      channels: 3,
      height: review.reviewMethod.contactSheetRows * cellHeight,
      width: review.reviewMethod.contactSheetColumns * cellWidth,
    },
  })
    .composite(composites)
    .jpeg({ quality: 90 })
    .toFile(path.join(contactSheetRoot, `sheet-${String(sheetNumber).padStart(2, '0')}.jpg`))
}

await writeFile(reviewPath, `${JSON.stringify(review, null, 2)}\n`, {
  encoding: 'utf8',
  flag: 'wx',
})
process.stdout.write(`${JSON.stringify({ coverage: review.coverage, mode })}\n`)
