import { createHash } from 'node:crypto'

import type { WingsSideTourMediaD4CManifest } from './wingsSideTourMediaD4C'

export type WingsSideD4CDisposition =
  | 'clean'
  | 'watermark-positive'
  | 'uncertain'
  | 'rejected'

export type WingsSideD4CReviewAsset = {
  contactSheet: string
  contactSheetCell: number
  disposition: WingsSideD4CDisposition
  filename: string
  mediaIDs: number[]
  notes: string
  output: null | {
    filename: string
    height: number
    sha256: string
    width: number
  }
  source: {
    byteLength: number
    height: null | number
    sha256: string
    width: null | number
  }
}

export type WingsSideD4CReviewManifest = {
  assets: WingsSideD4CReviewAsset[]
  coverage: {
    acceptedOutputCount: number
    cleanCount: number
    rejectedCount: number
    reviewedCount: number
    uncertainCount: number
    uniqueContentHashCount: number
    watermarkPositiveCount: number
  }
  decision: 'D4-C'
  direction: {
    authority: 'project-owner-direction'
    statement: string
  }
  reviewMethod: {
    contactSheetColumns: number
    contactSheetRows: number
    reviewer: string
    statement: string
  }
  schemaVersion: 1
  sourceSnapshotSha256: string
}

const sha256Pattern = /^[a-f0-9]{64}$/u

const exactObject = (
  value: unknown,
  keys: string[],
  label: string,
): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`WingSide D4-C review ${label} must be an object`)
  }
  const record = value as Record<string, unknown>
  if (Object.keys(record).sort().join('\0') !== [...keys].sort().join('\0')) {
    throw new Error(`WingSide D4-C review ${label} contains missing or unknown fields`)
  }
  return record
}

const nonEmptyString = (value: unknown, label: string): string => {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`WingSide D4-C review ${label} must be a non-empty string`)
  }
  return value
}

const integer = (value: unknown, label: string): number => {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new Error(`WingSide D4-C review ${label} must be a non-negative integer`)
  }
  return value
}

const digest = (value: string): string =>
  createHash('sha256').update(value).digest('hex')

export const buildWingsSideD4CReviewDraft = ({
  inventory,
  sheetColumns = 5,
  sheetRows = 5,
}: {
  inventory: WingsSideTourMediaD4CManifest
  sheetColumns?: number
  sheetRows?: number
}): WingsSideD4CReviewManifest => {
  if (sheetColumns < 1 || sheetRows < 1) {
    throw new Error('WingSide D4-C review contact-sheet dimensions must be positive')
  }
  const cellsPerSheet = sheetColumns * sheetRows
  const assets = inventory.assets.map((asset, index): WingsSideD4CReviewAsset => ({
    contactSheet: `contact-sheets/sheet-${String(Math.floor(index / cellsPerSheet) + 1).padStart(2, '0')}.jpg`,
    contactSheetCell: (index % cellsPerSheet) + 1,
    disposition: 'uncertain',
    filename: asset.filenames[0]!,
    mediaIDs: asset.mediaIDs,
    notes: 'Pending manual visual disposition.',
    output: null,
    source: {
      byteLength: asset.byteLength,
      height: asset.height,
      sha256: asset.sha256,
      width: asset.width,
    },
  }))
  return {
    assets,
    coverage: {
      acceptedOutputCount: 0,
      cleanCount: 0,
      rejectedCount: 0,
      reviewedCount: 0,
      uncertainCount: assets.length,
      uniqueContentHashCount: assets.length,
      watermarkPositiveCount: 0,
    },
    decision: 'D4-C',
    direction: {
      authority: 'project-owner-direction',
      statement:
        'Proceed with D4-C watermark removal. This direction does not assert ownership or license rights.',
    },
    reviewMethod: {
      contactSheetColumns: sheetColumns,
      contactSheetRows: sheetRows,
      reviewer: 'native-codex-visual-review',
      statement:
        'Every unique source hash is reviewed visually at contact-sheet scale; uncertain cells require source-resolution inspection.',
    },
    schemaVersion: 1,
    sourceSnapshotSha256: inventory.sourceSnapshotSha256,
  }
}

export const summarizeWingsSideD4CReview = (
  assets: WingsSideD4CReviewAsset[],
): WingsSideD4CReviewManifest['coverage'] => ({
  acceptedOutputCount: assets.filter(({ output }) => output !== null).length,
  cleanCount: assets.filter(({ disposition }) => disposition === 'clean').length,
  rejectedCount: assets.filter(({ disposition }) => disposition === 'rejected').length,
  reviewedCount: assets.filter(({ disposition }) => disposition !== 'uncertain').length,
  uncertainCount: assets.filter(({ disposition }) => disposition === 'uncertain').length,
  uniqueContentHashCount: assets.length,
  watermarkPositiveCount: assets.filter(
    ({ disposition }) => disposition === 'watermark-positive',
  ).length,
})

export const parseWingsSideD4CReviewManifest = (
  value: unknown,
  inventory?: WingsSideTourMediaD4CManifest,
): WingsSideD4CReviewManifest => {
  const root = exactObject(
    value,
    [
      'assets',
      'coverage',
      'decision',
      'direction',
      'reviewMethod',
      'schemaVersion',
      'sourceSnapshotSha256',
    ],
    'manifest',
  )
  if (root.schemaVersion !== 1 || root.decision !== 'D4-C') {
    throw new Error('WingSide D4-C review schemaVersion or decision is invalid')
  }
  if (typeof root.sourceSnapshotSha256 !== 'string' || !sha256Pattern.test(root.sourceSnapshotSha256)) {
    throw new Error('WingSide D4-C review source snapshot must be lowercase SHA-256')
  }
  const direction = exactObject(
    root.direction,
    ['authority', 'statement'],
    'direction',
  )
  if (direction.authority !== 'project-owner-direction') {
    throw new Error('WingSide D4-C review direction authority is invalid')
  }
  const reviewMethod = exactObject(
    root.reviewMethod,
    ['contactSheetColumns', 'contactSheetRows', 'reviewer', 'statement'],
    'review method',
  )
  if (!Array.isArray(root.assets)) {
    throw new Error('WingSide D4-C review assets must be an array')
  }
  const dispositions = new Set<WingsSideD4CDisposition>([
    'clean',
    'watermark-positive',
    'uncertain',
    'rejected',
  ])
  const assets = root.assets.map((entry, index): WingsSideD4CReviewAsset => {
    const asset = exactObject(
      entry,
      [
        'contactSheet',
        'contactSheetCell',
        'disposition',
        'filename',
        'mediaIDs',
        'notes',
        'output',
        'source',
      ],
      `asset ${index}`,
    )
    if (!dispositions.has(asset.disposition as WingsSideD4CDisposition)) {
      throw new Error(`WingSide D4-C review asset ${index} disposition is invalid`)
    }
    if (!Array.isArray(asset.mediaIDs) || asset.mediaIDs.length < 1) {
      throw new Error(`WingSide D4-C review asset ${index} mediaIDs are invalid`)
    }
    const source = exactObject(
      asset.source,
      ['byteLength', 'height', 'sha256', 'width'],
      `asset ${index} source`,
    )
    if (typeof source.sha256 !== 'string' || !sha256Pattern.test(source.sha256)) {
      throw new Error(`WingSide D4-C review asset ${index} source hash is invalid`)
    }
    let output: WingsSideD4CReviewAsset['output'] = null
    if (asset.output !== null) {
      const parsedOutput = exactObject(
        asset.output,
        ['filename', 'height', 'sha256', 'width'],
        `asset ${index} output`,
      )
      if (
        typeof parsedOutput.sha256 !== 'string' ||
        !sha256Pattern.test(parsedOutput.sha256)
      ) {
        throw new Error(`WingSide D4-C review asset ${index} output hash is invalid`)
      }
      output = {
        filename: nonEmptyString(parsedOutput.filename, `asset ${index} output filename`),
        height: integer(parsedOutput.height, `asset ${index} output height`),
        sha256: parsedOutput.sha256,
        width: integer(parsedOutput.width, `asset ${index} output width`),
      }
      if (asset.disposition !== 'watermark-positive') {
        throw new Error('WingSide D4-C review outputs require watermark-positive disposition')
      }
    }
    return {
      contactSheet: nonEmptyString(asset.contactSheet, `asset ${index} contact sheet`),
      contactSheetCell: integer(asset.contactSheetCell, `asset ${index} contact-sheet cell`),
      disposition: asset.disposition as WingsSideD4CDisposition,
      filename: nonEmptyString(asset.filename, `asset ${index} filename`),
      mediaIDs: asset.mediaIDs.map((id, idIndex) => integer(id, `asset ${index} mediaID ${idIndex}`)),
      notes: nonEmptyString(asset.notes, `asset ${index} notes`),
      output,
      source: {
        byteLength: integer(source.byteLength, `asset ${index} source byteLength`),
        height: source.height === null ? null : integer(source.height, `asset ${index} source height`),
        sha256: source.sha256,
        width: source.width === null ? null : integer(source.width, `asset ${index} source width`),
      },
    }
  })
  const coverage = summarizeWingsSideD4CReview(assets)
  const suppliedCoverage = exactObject(
    root.coverage,
    Object.keys(coverage),
    'coverage',
  )
  for (const [key, expected] of Object.entries(coverage)) {
    if (suppliedCoverage[key] !== expected) {
      throw new Error(`WingSide D4-C review coverage ${key} does not match assets`)
    }
  }
  const parsed: WingsSideD4CReviewManifest = {
    assets,
    coverage,
    decision: 'D4-C',
    direction: {
      authority: 'project-owner-direction',
      statement: nonEmptyString(direction.statement, 'direction statement'),
    },
    reviewMethod: {
      contactSheetColumns: integer(reviewMethod.contactSheetColumns, 'contact-sheet columns'),
      contactSheetRows: integer(reviewMethod.contactSheetRows, 'contact-sheet rows'),
      reviewer: nonEmptyString(reviewMethod.reviewer, 'reviewer'),
      statement: nonEmptyString(reviewMethod.statement, 'review statement'),
    },
    schemaVersion: 1,
    sourceSnapshotSha256: root.sourceSnapshotSha256,
  }
  if (inventory) {
    if (
      parsed.sourceSnapshotSha256 !== inventory.sourceSnapshotSha256 ||
      parsed.assets.length !== inventory.assets.length
    ) {
      throw new Error('WingSide D4-C review does not cover the canonical source snapshot')
    }
    parsed.assets.forEach((asset, index) => {
      const source = inventory.assets[index]
      if (
        !source ||
        asset.source.sha256 !== source.sha256 ||
        asset.source.byteLength !== source.byteLength ||
        asset.filename !== source.filenames[0] ||
        digest(asset.mediaIDs.join(',')) !== digest(source.mediaIDs.join(','))
      ) {
        throw new Error(`WingSide D4-C review asset ${index} differs from canonical inventory`)
      }
    })
  }
  return parsed
}
