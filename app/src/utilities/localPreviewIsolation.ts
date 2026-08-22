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
const PREVIEW_CAPABILITY_ENV = 'E09_PREVIEW_ROOT_CAPABILITY'
const PREVIEW_CAPABILITY_TTL_MS = 15 * 60 * 1000

type PreviewRootMarker = {
  contract: 'wingsgroup-e09-preview-root'
  databaseFilename: typeof PREVIEW_DATABASE_FILENAME
  mediaDirectory: typeof PREVIEW_MEDIA_DIRECTORY
  capabilityProof: string
  createdAt: number
  expiresAt: number
  rootPath: string
  version: typeof PREVIEW_CONTRACT_VERSION
}

export type WingsGroupLocalPreviewIsolation = {
  databasePath: string
  databaseURL: string
  mediaDirectory: string
  capability: string
  capabilityExpiresAt: number
  rootPath: string
}

type PreviewLeafHandle = {
  descriptorPath: string
  fd: number
}

type PreviewLease = {
  handles: Set<number>
  isolation: WingsGroupLocalPreviewIsolation
}

const openDirectoryFlags =
  fs.constants.O_RDONLY | fs.constants.O_DIRECTORY | fs.constants.O_NOFOLLOW
const readWriteNoFollowFlags = fs.constants.O_RDWR | fs.constants.O_NOFOLLOW
const exclusiveWriteNoFollowFlags =
  fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_NOFOLLOW
const readWriteCreateNoFollowFlags =
  fs.constants.O_RDWR | fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_NOFOLLOW

// This lease only deduplicates imports inside one process. A new process must
// reauthenticate the persisted marker with E09_PREVIEW_ROOT_CAPABILITY.
const leasesByRoot = new Map<string, PreviewLease>()

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

const descriptorPath = (fd: number): string => path.join('/proc/self/fd', String(fd))

const currentUserID = (): number | null =>
  typeof process.getuid === 'function' ? process.getuid() : null

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

const assertMode = (stat: fs.Stats, expectedMode: number, label: string): void => {
  if ((stat.mode & 0o777) !== expectedMode) {
    throw isolationError(`${label} must have mode ${expectedMode.toString(8)}.`)
  }
}

const assertOwnedByCurrentUser = (stat: fs.Stats, label: string): void => {
  const uid = currentUserID()
  if (uid !== null && stat.uid !== uid) {
    throw isolationError(`${label} is not owned by the current user.`)
  }
}

const capabilityProof = ({
  capability,
  createdAt,
  expiresAt,
  rootPath,
}: {
  capability: string
  createdAt: number
  expiresAt: number
  rootPath: string
}): string =>
  crypto
    .createHmac('sha256', capability)
    .update(`${rootPath}\u0000${createdAt}\u0000${expiresAt}`)
    .digest('hex')

const parseCapability = (value: string | undefined): string => {
  const capability = value?.trim() || ''
  if (!/^[a-f0-9]{64}$/.test(capability)) {
    throw isolationError(
      `a ${PREVIEW_CAPABILITY_ENV} capability is required to reuse an existing preview root.`,
    )
  }
  return capability
}

const createMarker = (
  rootFD: number,
  rootPath: string,
  capability: string,
  createdAt: number,
  expiresAt: number,
): void => {
  const markerPath = safePath(rootFD, PREVIEW_ROOT_MARKER)
  const marker: PreviewRootMarker = {
    contract: 'wingsgroup-e09-preview-root',
    databaseFilename: PREVIEW_DATABASE_FILENAME,
    mediaDirectory: PREVIEW_MEDIA_DIRECTORY,
    capabilityProof: capabilityProof({ capability, createdAt, expiresAt, rootPath }),
    createdAt,
    expiresAt,
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

const assertValidMarker = (
  marker: PreviewRootMarker,
  rootPath: string,
  capability: string,
): void => {
  const now = Date.now()
  if (
    marker.contract !== 'wingsgroup-e09-preview-root' ||
    marker.version !== PREVIEW_CONTRACT_VERSION ||
    marker.rootPath !== rootPath ||
    marker.databaseFilename !== PREVIEW_DATABASE_FILENAME ||
    marker.mediaDirectory !== PREVIEW_MEDIA_DIRECTORY ||
    !Number.isSafeInteger(marker.createdAt) ||
    !Number.isSafeInteger(marker.expiresAt) ||
    marker.createdAt > now ||
    marker.expiresAt <= marker.createdAt ||
    marker.expiresAt <= now ||
    marker.expiresAt - marker.createdAt > PREVIEW_CAPABILITY_TTL_MS ||
    !/^[a-f0-9]{64}$/.test(marker.capabilityProof)
  ) {
    throw isolationError('the root ownership marker is not current for this preview contract.')
  }

  const expectedProof = Buffer.from(
    capabilityProof({
      capability,
      createdAt: marker.createdAt,
      expiresAt: marker.expiresAt,
      rootPath: marker.rootPath,
    }),
    'hex',
  )
  const actualProof = Buffer.from(marker.capabilityProof, 'hex')
  if (
    expectedProof.length !== actualProof.length ||
    !crypto.timingSafeEqual(expectedProof, actualProof)
  ) {
    throw isolationError('the preview root capability does not authenticate the ownership marker.')
  }
}

const readAndVerifyMarker = (
  rootFD: number,
  rootPath: string,
  capability: string,
): PreviewRootMarker => {
  const markerPath = safePath(rootFD, PREVIEW_ROOT_MARKER)
  let markerFD: number
  try {
    markerFD = fs.openSync(markerPath, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW)
  } catch {
    throw isolationError('the root ownership marker is missing or cannot be opened safely.')
  }

  try {
    const markerStat = fs.fstatSync(markerFD)
    if (!markerStat.isFile() || markerStat.isSymbolicLink()) {
      throw isolationError('the root ownership marker is not a regular file.')
    }
    assertOwnedByCurrentUser(markerStat, 'root ownership marker')
    assertMode(markerStat, PREVIEW_FILE_MODE, 'root ownership marker')
    let marker: PreviewRootMarker
    try {
      marker = JSON.parse(fs.readFileSync(markerFD, 'utf8')) as PreviewRootMarker
    } catch {
      throw isolationError('the root ownership marker is not valid JSON.')
    }
    assertValidMarker(marker, rootPath, capability)
    return marker
  } finally {
    fs.closeSync(markerFD)
  }
}

const openVerifiedRoot = ({
  capability,
  createdAt,
  expiresAt,
  rootPath,
  wasCreated,
}: {
  capability: string
  createdAt?: number
  expiresAt?: number
  rootPath: string
  wasCreated: boolean
}): { capabilityExpiresAt: number; fd: number } => {
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
    assertOwnedByCurrentUser(openedRootStat, 'preview root')
    if (wasCreated) fs.fchmodSync(rootFD, PREVIEW_DIRECTORY_MODE)
    const securedRootStat = fs.fstatSync(rootFD)
    assertMode(securedRootStat, PREVIEW_DIRECTORY_MODE, 'preview root')
    if (wasCreated) {
      if (createdAt === undefined || expiresAt === undefined) {
        throw isolationError('the new preview root has no capability lifetime.')
      }
      createMarker(rootFD, rootPath, capability, createdAt, expiresAt)
    }
    const marker = readAndVerifyMarker(rootFD, rootPath, capability)

    return { capabilityExpiresAt: marker.expiresAt, fd: rootFD }
  } catch (error) {
    fs.closeSync(rootFD)
    throw error
  }
}

const ensureOwnedMediaDirectory = (rootFD: number, wasCreated: boolean): PreviewLeafHandle => {
  const safeMediaPath = safePath(rootFD, PREVIEW_MEDIA_DIRECTORY)
  const mediaStat = lstatIfPresent(safeMediaPath)
  if (mediaStat?.isSymbolicLink()) {
    throw isolationError('the configured media leaf is a symlink.')
  }
  if (wasCreated && mediaStat) {
    throw isolationError('the media directory must be created exclusively by this workflow.')
  }
  if (!wasCreated && !mediaStat) {
    throw isolationError('the run-owned media directory is missing.')
  }

  if (wasCreated) {
    try {
      fs.mkdirSync(safeMediaPath, { mode: PREVIEW_DIRECTORY_MODE })
    } catch {
      throw isolationError('the media directory could not be created exclusively.')
    }
  }

  let mediaFD: number
  try {
    mediaFD = fs.openSync(safeMediaPath, openDirectoryFlags)
  } catch {
    throw isolationError('the preview media leaf could not be opened without following a symlink.')
  }
  try {
    if (wasCreated) fs.fchmodSync(mediaFD, PREVIEW_DIRECTORY_MODE)
    const openedMediaStat = fs.fstatSync(mediaFD)
    const currentMediaStat = lstatIfPresent(safeMediaPath)
    assertRegularDirectory(currentMediaStat, 'preview media directory')
    if (!currentMediaStat)
      throw isolationError('preview media directory disappeared while opening.')
    const verifiedMediaStat = currentMediaStat
    assertSameFilesystemObject(verifiedMediaStat, openedMediaStat, 'preview media directory')
    assertOwnedByCurrentUser(openedMediaStat, 'preview media directory')
    assertMode(openedMediaStat, PREVIEW_DIRECTORY_MODE, 'preview media directory')
    return { descriptorPath: descriptorPath(mediaFD), fd: mediaFD }
  } catch (error) {
    fs.closeSync(mediaFD)
    throw error
  }
}

const ensureOwnedDatabaseFile = (rootFD: number, wasCreated: boolean): PreviewLeafHandle => {
  const safeDatabasePath = safePath(rootFD, PREVIEW_DATABASE_FILENAME)
  const existingDatabaseStat = lstatIfPresent(safeDatabasePath)
  if (existingDatabaseStat?.isSymbolicLink()) {
    throw isolationError('the configured database leaf is a symlink.')
  }
  if (wasCreated && existingDatabaseStat) {
    throw isolationError('the database must be created exclusively by this workflow.')
  }
  if (!wasCreated && !existingDatabaseStat) {
    throw isolationError('the run-owned database is missing.')
  }

  let databaseFD: number
  try {
    databaseFD = wasCreated
      ? fs.openSync(safeDatabasePath, readWriteCreateNoFollowFlags, PREVIEW_FILE_MODE)
      : fs.openSync(safeDatabasePath, readWriteNoFollowFlags)
    if (wasCreated) fs.fchmodSync(databaseFD, PREVIEW_FILE_MODE)
  } catch {
    throw isolationError(
      wasCreated
        ? 'the preview database could not be created exclusively.'
        : 'the preview database could not be opened without following a symlink.',
    )
  }

  try {
    const openedDatabaseStat = fs.fstatSync(databaseFD)
    const currentDatabaseStat = lstatIfPresent(safeDatabasePath)
    if (
      !currentDatabaseStat ||
      !currentDatabaseStat.isFile() ||
      currentDatabaseStat.isSymbolicLink()
    ) {
      throw isolationError('the preview database must remain a regular file.')
    }
    const verifiedDatabaseStat = currentDatabaseStat
    assertSameFilesystemObject(verifiedDatabaseStat, openedDatabaseStat, 'preview database')
    assertOwnedByCurrentUser(openedDatabaseStat, 'preview database')
    assertMode(openedDatabaseStat, PREVIEW_FILE_MODE, 'preview database')
    return { descriptorPath: descriptorPath(databaseFD), fd: databaseFD }
  } catch (error) {
    fs.closeSync(databaseFD)
    throw error
  }
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

  const existingLease = leasesByRoot.get(rootPath)
  if (existingLease) return existingLease.isolation

  const rootBefore = lstatIfPresent(rootPath)
  if (rootBefore?.isSymbolicLink()) {
    throw isolationError('the configured e09-preview-* root is a symlink.')
  }
  if (rootBefore && !rootBefore.isDirectory()) {
    throw isolationError('the configured e09-preview-* root is not a directory.')
  }
  const wasCreated = !rootBefore
  const capability = wasCreated
    ? crypto.randomBytes(32).toString('hex')
    : parseCapability(process.env[PREVIEW_CAPABILITY_ENV])
  const createdAt = wasCreated ? Date.now() : undefined
  const expiresAt = createdAt === undefined ? undefined : createdAt + PREVIEW_CAPABILITY_TTL_MS

  if (wasCreated) {
    try {
      fs.mkdirSync(rootPath, { mode: PREVIEW_DIRECTORY_MODE })
    } catch {
      throw isolationError(
        'the preview root was not absent or could not be created exclusively by this workflow.',
      )
    }
  }

  const openFDs = new Set<number>()
  try {
    const verifiedRoot = openVerifiedRoot({
      capability,
      createdAt,
      expiresAt,
      rootPath,
      wasCreated,
    })
    const rootFD = verifiedRoot.fd
    openFDs.add(rootFD)
    const media = ensureOwnedMediaDirectory(rootFD, wasCreated)
    openFDs.add(media.fd)
    const database = ensureOwnedDatabaseFile(rootFD, wasCreated)
    openFDs.add(database.fd)
    const isolation = {
      databasePath: database.descriptorPath,
      databaseURL: `file:${database.descriptorPath}`,
      mediaDirectory: media.descriptorPath,
      capability,
      capabilityExpiresAt: verifiedRoot.capabilityExpiresAt,
      rootPath,
    }
    leasesByRoot.set(rootPath, { handles: openFDs, isolation })
    return isolation
  } catch (error) {
    for (const fd of openFDs) fs.closeSync(fd)
    throw error
  }
}

export const releaseWingsGroupLocalPreviewIsolation = (rootPath: string): void => {
  const resolvedRootPath = path.resolve(rootPath)
  const lease = leasesByRoot.get(resolvedRootPath)
  if (!lease) return
  for (const fd of lease.handles) fs.closeSync(fd)
  leasesByRoot.delete(resolvedRootPath)
}
