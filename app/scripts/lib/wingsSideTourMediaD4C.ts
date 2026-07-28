import { createHash } from 'node:crypto'

import { wingsSideTourMediaAuditChecksum } from './wingsSideTourMediaAudit'

export type WingsSideD4CTourRow = {
  heroMediaID: null | number
  marketCardMediaID: null | number
  routeMapMediaID: null | number
  tourID: number
  tourSlug: string
}

export type WingsSideD4CRelationRow = {
  mediaID: number
  order: null | number
  path: string
  tourID: number
}

export type WingsSideD4CMediaRow = {
  filename: string
  height: null | number
  mediaID: number
  mimeType: null | string
  recordedByteLength: null | number
  width: null | number
}

export type WingsSideD4CAssetBytes = {
  byteLength: number
  sha256: string
}

export type WingsSideD4CReference = {
  fieldPath: string
  mediaID: number
  tourID: number
  tourSlug: string
}

export type WingsSideD4CSourceAsset = {
  byteLength: number
  filenames: string[]
  height: null | number
  mediaIDs: number[]
  mimeTypes: string[]
  references: WingsSideD4CReference[]
  sha256: string
  width: null | number
}

export type WingsSideTourMediaD4CManifest = {
  assets: WingsSideD4CSourceAsset[]
  coverage: {
    sourceReferenceCount: number
    tourCount: number
    uniqueContentHashCount: number
    uniqueMediaIDCount: number
  }
  editorialSourceManifestSha256: string
  input: {
    databaseFilename: string
    databaseSha256: string
    mediaRootReference: string
  }
  schemaVersion: 1
  sourceSnapshotSha256: string
  tours: Array<{ tourID: number; tourSlug: string }>
}

const sha256Pattern = /^[a-f0-9]{64}$/u

export const wingsSideD4CSha256 = (bytes: Buffer | string): string =>
  createHash('sha256').update(bytes).digest('hex')

const compareReferences = (
  left: WingsSideD4CReference,
  right: WingsSideD4CReference,
): number =>
  left.tourSlug.localeCompare(right.tourSlug) ||
  left.fieldPath.localeCompare(right.fieldPath) ||
  left.mediaID - right.mediaID

const relationFieldPath = (row: WingsSideD4CRelationRow): string => {
  const path = row.path.trim()
  if (!path) throw new Error('WingSide D4-C relation path cannot be empty')
  if (row.order === null) return path
  if (!Number.isInteger(row.order) || row.order < 1) {
    throw new Error(`WingSide D4-C relation ${path} has invalid order`)
  }
  return `${path}[${row.order - 1}]`
}

export const buildWingsSideTourMediaD4CManifest = ({
  databaseFilename,
  databaseSha256,
  editorialSourceManifestSha256,
  loadAsset,
  mediaRootReference,
  mediaRows,
  relationRows,
  tourRows,
}: {
  databaseFilename: string
  databaseSha256: string
  editorialSourceManifestSha256: string
  loadAsset: (filename: string) => WingsSideD4CAssetBytes
  mediaRootReference: string
  mediaRows: WingsSideD4CMediaRow[]
  relationRows: WingsSideD4CRelationRow[]
  tourRows: WingsSideD4CTourRow[]
}): WingsSideTourMediaD4CManifest => {
  if (tourRows.length !== 22) {
    throw new Error(`WingSide D4-C inventory requires exactly 22 tours; received ${tourRows.length}`)
  }
  if (
    !sha256Pattern.test(databaseSha256) ||
    !sha256Pattern.test(editorialSourceManifestSha256)
  ) {
    throw new Error('WingSide D4-C input checksums must be lowercase SHA-256')
  }

  const sortedTours = [...tourRows].sort((left, right) =>
    left.tourSlug.localeCompare(right.tourSlug),
  )
  const tourIDs = new Set(sortedTours.map(({ tourID }) => tourID))
  const tourSlugs = new Set(sortedTours.map(({ tourSlug }) => tourSlug))
  if (tourIDs.size !== 22 || tourSlugs.size !== 22) {
    throw new Error('WingSide D4-C inventory tour IDs and slugs must be unique')
  }
  if (sortedTours.some(({ tourSlug }) => !tourSlug.trim())) {
    throw new Error('WingSide D4-C inventory tour slugs cannot be empty')
  }

  const references: WingsSideD4CReference[] = []
  for (const tour of sortedTours) {
    const add = (fieldPath: string, mediaID: null | number): void => {
      if (mediaID === null) return
      references.push({
        fieldPath,
        mediaID,
        tourID: tour.tourID,
        tourSlug: tour.tourSlug,
      })
    }
    add('heroMedia', tour.heroMediaID)
    add('marketCard.thumbnailOverride', tour.marketCardMediaID)
    add('routeViz.mapImage', tour.routeMapMediaID)
  }
  const tourByID = new Map(sortedTours.map((tour) => [tour.tourID, tour]))
  for (const relation of relationRows) {
    const tour = tourByID.get(relation.tourID)
    if (!tour) {
      throw new Error(`WingSide D4-C relation references unexpected tour ${relation.tourID}`)
    }
    references.push({
      fieldPath: relationFieldPath(relation),
      mediaID: relation.mediaID,
      tourID: tour.tourID,
      tourSlug: tour.tourSlug,
    })
  }
  references.sort(compareReferences)
  if (references.length === 0) throw new Error('WingSide D4-C inventory has no media references')

  const mediaByID = new Map(mediaRows.map((row) => [row.mediaID, row]))
  if (mediaByID.size !== mediaRows.length) {
    throw new Error('WingSide D4-C inventory contains duplicate media rows')
  }
  const referencedMediaIDs = [...new Set(references.map(({ mediaID }) => mediaID))].sort(
    (left, right) => left - right,
  )
  const grouped = new Map<
    string,
    {
      byteLength: number
      filenames: Set<string>
      height: null | number
      mediaIDs: Set<number>
      mimeTypes: Set<string>
      references: WingsSideD4CReference[]
      sha256: string
      width: null | number
    }
  >()

  for (const mediaID of referencedMediaIDs) {
    const row = mediaByID.get(mediaID)
    if (!row) throw new Error(`WingSide D4-C inventory is missing media row ${mediaID}`)
    if (!row.filename.trim()) throw new Error(`WingSide D4-C media ${mediaID} has no filename`)
    const bytes = loadAsset(row.filename)
    if (!sha256Pattern.test(bytes.sha256) || bytes.byteLength <= 0) {
      throw new Error(`WingSide D4-C media ${mediaID} has invalid source bytes`)
    }
    if (
      row.recordedByteLength !== null &&
      row.recordedByteLength > 0 &&
      row.recordedByteLength !== bytes.byteLength
    ) {
      throw new Error(`WingSide D4-C media ${mediaID} byte length differs from Payload metadata`)
    }
    const existing = grouped.get(bytes.sha256)
    if (
      existing &&
      (existing.byteLength !== bytes.byteLength ||
        existing.width !== row.width ||
        existing.height !== row.height)
    ) {
      throw new Error(`WingSide D4-C content hash ${bytes.sha256} has conflicting metadata`)
    }
    const asset = existing ?? {
      byteLength: bytes.byteLength,
      filenames: new Set<string>(),
      height: row.height,
      mediaIDs: new Set<number>(),
      mimeTypes: new Set<string>(),
      references: [],
      sha256: bytes.sha256,
      width: row.width,
    }
    asset.filenames.add(row.filename)
    asset.mediaIDs.add(mediaID)
    if (row.mimeType?.trim()) asset.mimeTypes.add(row.mimeType.trim())
    asset.references.push(...references.filter((reference) => reference.mediaID === mediaID))
    grouped.set(bytes.sha256, asset)
  }

  const assets = [...grouped.values()]
    .map((asset): WingsSideD4CSourceAsset => ({
      byteLength: asset.byteLength,
      filenames: [...asset.filenames].sort(),
      height: asset.height,
      mediaIDs: [...asset.mediaIDs].sort((left, right) => left - right),
      mimeTypes: [...asset.mimeTypes].sort(),
      references: asset.references.sort(compareReferences),
      sha256: asset.sha256,
      width: asset.width,
    }))
    .sort((left, right) => left.sha256.localeCompare(right.sha256))

  const snapshotBody = {
    assets,
    editorialSourceManifestSha256,
    input: {
      databaseFilename,
      databaseSha256,
      mediaRootReference,
    },
    tours: sortedTours.map(({ tourID, tourSlug }) => ({ tourID, tourSlug })),
  }
  return {
    ...snapshotBody,
    coverage: {
      sourceReferenceCount: references.length,
      tourCount: sortedTours.length,
      uniqueContentHashCount: assets.length,
      uniqueMediaIDCount: referencedMediaIDs.length,
    },
    schemaVersion: 1,
    sourceSnapshotSha256: wingsSideTourMediaAuditChecksum(snapshotBody),
  }
}

export const assertWingsSideTourMediaD4CManifestEqual = (
  expected: WingsSideTourMediaD4CManifest,
  actual: WingsSideTourMediaD4CManifest,
): void => {
  if (expected.sourceSnapshotSha256 !== actual.sourceSnapshotSha256) {
    throw new Error('WingSide D4-C sealed source snapshot checksum mismatch')
  }
  if (wingsSideTourMediaAuditChecksum(expected) !== wingsSideTourMediaAuditChecksum(actual)) {
    throw new Error('WingSide D4-C canonical inventory differs from sealed manifest')
  }
}
