import { createHash } from 'node:crypto'
import type { BigIntStats } from 'node:fs'
import { lstat, open, realpath, stat } from 'node:fs/promises'
import path from 'node:path'

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

const exactObject = (
  value: unknown,
  keys: string[],
  label: string,
): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`WingSide D4-C ${label} must be an object`)
  }
  const record = value as Record<string, unknown>
  if (Object.keys(record).sort().join('\0') !== [...keys].sort().join('\0')) {
    throw new Error(`WingSide D4-C ${label} contains missing or unknown fields`)
  }
  return record
}

const nonEmptyString = (value: unknown, label: string): string => {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`WingSide D4-C ${label} must be a non-empty string`)
  }
  return value
}

const integer = (value: unknown, label: string): number => {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new Error(`WingSide D4-C ${label} must be an integer`)
  }
  return value
}

const nullableInteger = (value: unknown, label: string): null | number =>
  value === null ? null : integer(value, label)

const sha256 = (value: unknown, label: string): string => {
  if (typeof value !== 'string' || !sha256Pattern.test(value)) {
    throw new Error(`WingSide D4-C ${label} must be lowercase SHA-256`)
  }
  return value
}

export const parseWingsSideD4CEditorialManifest = (
  value: unknown,
): { tours: Array<{ checksum: string; slug: string }> } => {
  const root = exactObject(
    value,
    ['generatedFrom', 'sourceLocale', 'tours', 'version'],
    'editorial manifest',
  )
  if (root.version !== 1 || root.sourceLocale !== 'en') {
    throw new Error('WingSide D4-C editorial manifest version or locale is invalid')
  }
  nonEmptyString(root.generatedFrom, 'editorial generatedFrom')
  if (!Array.isArray(root.tours) || root.tours.length !== 22) {
    throw new Error('WingSide D4-C editorial manifest must contain exactly 22 tours')
  }
  const tours = root.tours.map((entry, index) => {
    const tour = exactObject(entry, ['checksum', 'slug'], `editorial tour ${index}`)
    return {
      checksum: sha256(tour.checksum, `editorial tour ${index} checksum`),
      slug: nonEmptyString(tour.slug, `editorial tour ${index} slug`).trim(),
    }
  })
  if (new Set(tours.map(({ slug }) => slug)).size !== 22) {
    throw new Error('WingSide D4-C editorial manifest tour slugs must be unique')
  }
  return { tours }
}

const stringArray = (value: unknown, label: string): string[] => {
  if (!Array.isArray(value)) throw new Error(`WingSide D4-C ${label} must be an array`)
  return value.map((entry, index) => nonEmptyString(entry, `${label}[${index}]`))
}

const integerArray = (value: unknown, label: string): number[] => {
  if (!Array.isArray(value)) throw new Error(`WingSide D4-C ${label} must be an array`)
  return value.map((entry, index) => integer(entry, `${label}[${index}]`))
}

export const parseWingsSideTourMediaD4CManifest = (
  value: unknown,
): WingsSideTourMediaD4CManifest => {
  const root = exactObject(
    value,
    [
      'assets',
      'coverage',
      'editorialSourceManifestSha256',
      'input',
      'schemaVersion',
      'sourceSnapshotSha256',
      'tours',
    ],
    'canonical inventory',
  )
  if (root.schemaVersion !== 1) {
    throw new Error('WingSide D4-C canonical inventory schemaVersion must be 1')
  }
  const coverageInput = exactObject(
    root.coverage,
    ['sourceReferenceCount', 'tourCount', 'uniqueContentHashCount', 'uniqueMediaIDCount'],
    'canonical coverage',
  )
  const coverage = {
    sourceReferenceCount: integer(
      coverageInput.sourceReferenceCount,
      'coverage sourceReferenceCount',
    ),
    tourCount: integer(coverageInput.tourCount, 'coverage tourCount'),
    uniqueContentHashCount: integer(
      coverageInput.uniqueContentHashCount,
      'coverage uniqueContentHashCount',
    ),
    uniqueMediaIDCount: integer(
      coverageInput.uniqueMediaIDCount,
      'coverage uniqueMediaIDCount',
    ),
  }
  const inputValue = exactObject(
    root.input,
    ['databaseFilename', 'databaseSha256', 'mediaRootReference'],
    'canonical input',
  )
  const input = {
    databaseFilename: nonEmptyString(inputValue.databaseFilename, 'databaseFilename'),
    databaseSha256: sha256(inputValue.databaseSha256, 'databaseSha256'),
    mediaRootReference: nonEmptyString(inputValue.mediaRootReference, 'mediaRootReference'),
  }
  if (!Array.isArray(root.tours)) throw new Error('WingSide D4-C canonical tours must be an array')
  const tours = root.tours.map((entry, index) => {
    const tour = exactObject(entry, ['tourID', 'tourSlug'], `canonical tour ${index}`)
    return {
      tourID: integer(tour.tourID, `canonical tour ${index} ID`),
      tourSlug: nonEmptyString(tour.tourSlug, `canonical tour ${index} slug`),
    }
  })
  if (!Array.isArray(root.assets)) {
    throw new Error('WingSide D4-C canonical assets must be an array')
  }
  const assets = root.assets.map((entry, assetIndex): WingsSideD4CSourceAsset => {
    const asset = exactObject(
      entry,
      [
        'byteLength',
        'filenames',
        'height',
        'mediaIDs',
        'mimeTypes',
        'references',
        'sha256',
        'width',
      ],
      `canonical asset ${assetIndex}`,
    )
    if (!Array.isArray(asset.references)) {
      throw new Error(`WingSide D4-C canonical asset ${assetIndex} references must be an array`)
    }
    const references = asset.references.map((referenceValue, referenceIndex) => {
      const reference = exactObject(
        referenceValue,
        ['fieldPath', 'mediaID', 'tourID', 'tourSlug'],
        `canonical asset ${assetIndex} reference ${referenceIndex}`,
      )
      return {
        fieldPath: nonEmptyString(reference.fieldPath, 'reference fieldPath'),
        mediaID: integer(reference.mediaID, 'reference mediaID'),
        tourID: integer(reference.tourID, 'reference tourID'),
        tourSlug: nonEmptyString(reference.tourSlug, 'reference tourSlug'),
      }
    })
    return {
      byteLength: integer(asset.byteLength, `canonical asset ${assetIndex} byteLength`),
      filenames: stringArray(asset.filenames, `canonical asset ${assetIndex} filenames`),
      height: nullableInteger(asset.height, `canonical asset ${assetIndex} height`),
      mediaIDs: integerArray(asset.mediaIDs, `canonical asset ${assetIndex} mediaIDs`),
      mimeTypes: stringArray(asset.mimeTypes, `canonical asset ${assetIndex} mimeTypes`),
      references,
      sha256: sha256(asset.sha256, `canonical asset ${assetIndex} sha256`),
      width: nullableInteger(asset.width, `canonical asset ${assetIndex} width`),
    }
  })
  const manifest: WingsSideTourMediaD4CManifest = {
    assets,
    coverage,
    editorialSourceManifestSha256: sha256(
      root.editorialSourceManifestSha256,
      'editorialSourceManifestSha256',
    ),
    input,
    schemaVersion: 1,
    sourceSnapshotSha256: sha256(root.sourceSnapshotSha256, 'sourceSnapshotSha256'),
    tours,
  }
  if (
    coverage.tourCount !== tours.length ||
    coverage.uniqueContentHashCount !== assets.length ||
    new Set(assets.flatMap(({ mediaIDs }) => mediaIDs)).size !== coverage.uniqueMediaIDCount ||
    assets.reduce((count, asset) => count + asset.references.length, 0) !==
      coverage.sourceReferenceCount
  ) {
    throw new Error('WingSide D4-C canonical inventory coverage does not match content')
  }
  return manifest
}

const sameIdentity = (left: BigIntStats, right: BigIntStats): boolean =>
  left.dev === right.dev &&
  left.ino === right.ino &&
  left.size === right.size &&
  left.mtimeNs === right.mtimeNs &&
  left.ctimeNs === right.ctimeNs

const isWithin = (root: string, candidate: string): boolean => {
  const relative = path.relative(root, candidate)
  return relative !== '' && !relative.startsWith(`..${path.sep}`) && relative !== '..' &&
    !path.isAbsolute(relative)
}

export const resolveWingsSideD4CApprovedRoot = async (approvedRoot: string): Promise<string> => {
  const resolved = await realpath(path.resolve(approvedRoot))
  if (!(await stat(resolved)).isDirectory()) {
    throw new Error('WingSide D4-C approved media root must be a directory')
  }
  return resolved
}

export const readWingsSideD4CVerifiedFile = async ({
  approvedRootRealPath,
  relativePath,
}: {
  approvedRootRealPath: string
  relativePath: string
}): Promise<{ bytes: Buffer; realPath: string; sha256: string }> => {
  if (
    !relativePath.trim() ||
    path.isAbsolute(relativePath) ||
    relativePath.split(/[\\/]/u).some((component) => component === '..' || component === '')
  ) {
    throw new Error('WingSide D4-C media path must be a safe relative path')
  }
  const lexicalPath = path.resolve(approvedRootRealPath, relativePath)
  if (!isWithin(approvedRootRealPath, lexicalPath)) {
    throw new Error('WingSide D4-C media path escapes approved root')
  }
  let componentPath = approvedRootRealPath
  for (const component of relativePath.split(/[\\/]/u)) {
    componentPath = path.join(componentPath, component)
    const componentStat = await lstat(componentPath)
    if (componentStat.isSymbolicLink()) {
      throw new Error('WingSide D4-C media path contains a symlink or junction')
    }
  }
  const initialRealPath = await realpath(lexicalPath)
  if (!isWithin(approvedRootRealPath, initialRealPath)) {
    throw new Error('WingSide D4-C media realpath escapes approved root')
  }
  const handle = await open(initialRealPath, 'r')
  try {
    const before = await handle.stat({ bigint: true })
    if (!before.isFile()) throw new Error('WingSide D4-C media source must be a regular file')
    const bytes = await handle.readFile()
    const after = await handle.stat({ bigint: true })
    if (!sameIdentity(before, after)) {
      throw new Error('WingSide D4-C media source changed while being read')
    }
    const finalRealPath = await realpath(lexicalPath)
    const finalLexicalStat = await lstat(lexicalPath)
    if (
      finalLexicalStat.isSymbolicLink() ||
      finalRealPath !== initialRealPath ||
      !isWithin(approvedRootRealPath, finalRealPath)
    ) {
      throw new Error('WingSide D4-C media path identity changed while being read')
    }
    return { bytes, realPath: finalRealPath, sha256: wingsSideD4CSha256(bytes) }
  } finally {
    await handle.close()
  }
}

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
