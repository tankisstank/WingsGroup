import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const PREVIEW_ROOTS = ['/tmp', '/dev/shm'] as const
const PREVIEW_ROOT_PREFIX = 'e09-preview-'
const PREVIEW_ROOT_MARKER = '.e09-preview-root.json'
const PREVIEW_DATABASE_FILENAME = 'e09-preview.db'
const PREVIEW_MEDIA_DIRECTORY = 'media'
const PREVIEW_CONTRACT_VERSION = 1
const PREVIEW_DIRECTORY_MODE = 0o700
const PREVIEW_FILE_MODE = 0o600

type PreviewRootMarker = {
  contract: 'wingsgroup-e09-preview-root'
  databaseFilename: typeof PREVIEW_DATABASE_FILENAME
  mediaDirectory: typeof PREVIEW_MEDIA_DIRECTORY
  nonce: string
  rootPath: string
  version: typeof PREVIEW_CONTRACT_VERSION
}

export type WingsGroupLocalPreviewIsolation = {
  databasePath: string
  databaseURL: string
  mediaDirectory: string
  rootPath: string
}

const openDirectoryFlags =
  fs.constants.O_RDONLY | fs.constants.O_DIRECTORY | fs.constants.O_NOFOLLOW
const readOnlyNoFollowFlags = fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW
const exclusiveWriteNoFollowFlags =
  fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_NOFOLLOW

const handlesByRoot = new Map<string, Set<number>>()

const isolationError = (message: string): Error =>
  new Error(`E09 local preview isolation rejected: ${message}`)

const lstatIfPresent = (value: string): fs.Stats | null => {
  try {
    return fs.lstatSync(value)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw error
  }
}

const isDirectPreviewRoot = (rootPath: string): boolean =>
  PREVIEW_ROOTS.some(
    (temporaryRoot) =>
      path.dirname(rootPath) === temporaryRoot &&
      path.basename(rootPath).startsWith(PREVIEW_ROOT_PREFIX) &&
      path.basename(rootPath).length > PREVIEW_ROOT_PREFIX.length,
  )

const assertDirectPreviewRoot = (rootPath: string): void => {
  if (!isDirectPreviewRoot(rootPath)) {
    throw isolationError('the root must be a new direct /tmp or /dev/shm e09-preview-* directory.')
  }

  const temporaryRoot = path.dirname(rootPath)
  const temporaryRootStat = fs.lstatSync(temporaryRoot)
  if (!temporaryRootStat.isDirectory() || temporaryRootStat.isSymbolicLink()) {
    throw isolationError(`temporary parent is not a real directory: ${temporaryRoot}`)
  }
}

const safePath = (directoryFD: number, child: string): string =>
  path.join('/proc/self/fd', String(directoryFD), child)

const assertSameFilesystemObject = (left: fs.Stats, right: fs.Stats, label: string): void => {
  if (left.dev !== right.dev || left.ino !== right.ino) {
    throw isolationError(`${label} changed while it was being opened.`)
  }
}

const assertRegularDirectory = (stat: fs.Stats | null, label: string): void => {
  if (!stat || !stat.isDirectory() || stat.isSymbolicLink()) {
    throw isolationError(`${label} must be a real directory created by the preview workflow.`)
  }
}

const assertRegularFileOrMissing = (stat: fs.Stats | null, label: string): void => {
  if (stat && (!stat.isFile() || stat.isSymbolicLink())) {
    throw isolationError(`${label} must be a regular file and may not be a symlink.`)
  }
}

const readMarker = (markerPath: string, rootPath: string): PreviewRootMarker => {
  const markerStat = lstatIfPresent(markerPath)
  if (!markerStat || !markerStat.isFile() || markerStat.isSymbolicLink()) {
    throw isolationError('the root ownership marker is missing or is not a regular file.')
  }

  let marker: PreviewRootMarker
  const markerFD = fs.openSync(markerPath, readOnlyNoFollowFlags)
  try {
    marker = JSON.parse(fs.readFileSync(markerFD, 'utf8')) as PreviewRootMarker
  } catch {
    throw isolationError('the root ownership marker is not valid JSON.')
  } finally {
    fs.closeSync(markerFD)
  }

  if (
    marker.contract !== 'wingsgroup-e09-preview-root' ||
    marker.version !== PREVIEW_CONTRACT_VERSION ||
    marker.rootPath !== rootPath ||
    marker.databaseFilename !== PREVIEW_DATABASE_FILENAME ||
    marker.mediaDirectory !== PREVIEW_MEDIA_DIRECTORY ||
    !/^[a-f0-9]{64}$/.test(marker.nonce)
  ) {
    throw isolationError('the root ownership marker does not prove this preview contract.')
  }

  return marker
}

const createMarker = (rootFD: number, rootPath: string): void => {
  const markerPath = safePath(rootFD, PREVIEW_ROOT_MARKER)
  const marker: PreviewRootMarker = {
    contract: 'wingsgroup-e09-preview-root',
    databaseFilename: PREVIEW_DATABASE_FILENAME,
    mediaDirectory: PREVIEW_MEDIA_DIRECTORY,
    nonce: crypto.randomBytes(32).toString('hex'),
    rootPath,
    version: PREVIEW_CONTRACT_VERSION,
  }
  const markerFD = fs.openSync(markerPath, exclusiveWriteNoFollowFlags, PREVIEW_FILE_MODE)
  try {
    fs.writeFileSync(markerFD, `${JSON.stringify(marker)}\n`, 'utf8')
    fs.fsyncSync(markerFD)
  } finally {
    fs.closeSync(markerFD)
  }
}

const openVerifiedRoot = (rootPath: string, wasCreated: boolean): number => {
  let rootFD: number
  try {
    rootFD = fs.openSync(rootPath, openDirectoryFlags)
  } catch {
    throw isolationError('the root could not be opened without following a symlink.')
  }

  try {
    const rootStat = fs.lstatSync(rootPath)
    const openedRootStat = fs.fstatSync(rootFD)
    if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) {
      throw isolationError('the root must be a real directory, not a symlink.')
    }
    assertSameFilesystemObject(rootStat, openedRootStat, 'preview root')

    const markerPath = safePath(rootFD, PREVIEW_ROOT_MARKER)
    if (wasCreated) createMarker(rootFD, rootPath)
    else readMarker(markerPath, rootPath)

    return rootFD
  } catch (error) {
    fs.closeSync(rootFD)
    throw error
  }
}

const ensureOwnedMediaDirectory = (rootFD: number, rootPath: string, mediaPath: string): string => {
  const mediaPathStat = lstatIfPresent(mediaPath)
  if (mediaPathStat?.isSymbolicLink()) {
    throw isolationError('the configured media leaf is a symlink.')
  }

  const safeMediaPath = safePath(rootFD, PREVIEW_MEDIA_DIRECTORY)
  const mediaStat = lstatIfPresent(safeMediaPath)
  if (!mediaStat) {
    try {
      fs.mkdirSync(safeMediaPath, { mode: PREVIEW_DIRECTORY_MODE })
    } catch {
      throw isolationError('the media directory could not be created exclusively.')
    }
  }

  assertRegularDirectory(lstatIfPresent(safeMediaPath), 'preview media directory')
  const currentMediaPathStat = lstatIfPresent(mediaPath)
  if (currentMediaPathStat?.isSymbolicLink()) {
    throw isolationError('the configured media leaf became a symlink.')
  }
  if (currentMediaPathStat) assertRegularDirectory(currentMediaPathStat, 'preview media directory')
  if (path.resolve(mediaPath) !== path.join(rootPath, PREVIEW_MEDIA_DIRECTORY)) {
    throw isolationError('media must be the derived media leaf of the preview root.')
  }
  return safeMediaPath
}

const ensureOwnedDatabaseFile = (rootFD: number, databasePath: string): string => {
  const safeDatabasePath = safePath(rootFD, PREVIEW_DATABASE_FILENAME)
  const existingDatabaseStat = lstatIfPresent(safeDatabasePath)
  assertRegularFileOrMissing(existingDatabaseStat, 'preview database')
  if (!existingDatabaseStat) {
    let databaseFD: number
    try {
      databaseFD = fs.openSync(safeDatabasePath, exclusiveWriteNoFollowFlags, PREVIEW_FILE_MODE)
    } catch {
      throw isolationError('the preview database could not be created exclusively.')
    }
    fs.closeSync(databaseFD)
  }

  const currentDatabaseStat = lstatIfPresent(safeDatabasePath)
  assertRegularFileOrMissing(currentDatabaseStat, 'preview database')
  if (
    path.resolve(databasePath) !== path.join(path.dirname(databasePath), PREVIEW_DATABASE_FILENAME)
  ) {
    throw isolationError('database must be the derived e09-preview.db leaf of the preview root.')
  }
  return safeDatabasePath
}

const databasePathFromURL = (databaseURL: string | undefined): string => {
  if (!databaseURL?.startsWith('file:')) {
    throw isolationError('DATABASE_URL must be an explicit local file: SQLite URL.')
  }
  const rawPath = databaseURL.slice('file:'.length)
  if (!rawPath || rawPath.includes('?') || rawPath.includes('#')) {
    throw isolationError('DATABASE_URL must identify one local SQLite file.')
  }
  return path.resolve(rawPath)
}

export const prepareWingsGroupLocalPreviewIsolation = ({
  databaseURL,
  mediaDirectory,
}: {
  databaseURL: string | undefined
  mediaDirectory: string
}): WingsGroupLocalPreviewIsolation => {
  const databasePath = databasePathFromURL(databaseURL)
  const resolvedMediaPath = path.resolve(mediaDirectory)
  const rootPath = path.dirname(databasePath)

  assertDirectPreviewRoot(rootPath)
  if (path.basename(databasePath) !== PREVIEW_DATABASE_FILENAME) {
    throw isolationError(`database must be named ${PREVIEW_DATABASE_FILENAME}.`)
  }
  if (resolvedMediaPath !== path.join(rootPath, PREVIEW_MEDIA_DIRECTORY)) {
    throw isolationError(
      `media must be exactly ${path.join(rootPath, PREVIEW_MEDIA_DIRECTORY)} so DB and media share one root.`,
    )
  }

  const rootBefore = lstatIfPresent(rootPath)
  if (rootBefore?.isSymbolicLink()) {
    throw isolationError('the configured e09-preview-* root is a symlink.')
  }
  if (rootBefore && !rootBefore.isDirectory()) {
    throw isolationError('the configured e09-preview-* root is not a directory.')
  }

  let wasCreated = false
  if (!rootBefore) {
    try {
      fs.mkdirSync(rootPath, { mode: PREVIEW_DIRECTORY_MODE })
      fs.chmodSync(rootPath, PREVIEW_DIRECTORY_MODE)
      wasCreated = true
    } catch {
      throw isolationError(
        'the preview root was not absent or could not be created exclusively by this workflow.',
      )
    }
  }

  const rootFD = openVerifiedRoot(rootPath, wasCreated)
  try {
    const safeMediaDirectory = ensureOwnedMediaDirectory(rootFD, rootPath, resolvedMediaPath)
    const safeDatabasePath = ensureOwnedDatabaseFile(rootFD, databasePath)
    const handles = handlesByRoot.get(rootPath) || new Set<number>()
    handles.add(rootFD)
    handlesByRoot.set(rootPath, handles)
    return {
      databasePath,
      databaseURL: `file:${safeDatabasePath}`,
      mediaDirectory: safeMediaDirectory,
      rootPath,
    }
  } catch (error) {
    fs.closeSync(rootFD)
    throw error
  }
}

export const releaseWingsGroupLocalPreviewIsolation = (rootPath: string): void => {
  const handles = handlesByRoot.get(path.resolve(rootPath))
  if (!handles) return
  for (const rootFD of handles) fs.closeSync(rootFD)
  handlesByRoot.delete(path.resolve(rootPath))
}
