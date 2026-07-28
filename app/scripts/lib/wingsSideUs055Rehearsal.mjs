import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

export const rehearsalDatabasePattern = /rehearsal/i
export const loopbackHosts = new Set(['127.0.0.1', '::1', 'localhost'])

export const sha256 = (value) => createHash('sha256').update(value).digest('hex')

export const stableJSONStringify = (value) => {
  if (value === undefined) return '"__undefined__"'
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stableJSONStringify).join(',')}]`
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableJSONStringify(value[key])}`)
    .join(',')}}`
}

export const canonicalChecksum = (value) => sha256(stableJSONStringify(value))

export const assertDisposablePostgresTarget = (rawURL) => {
  let target
  try {
    target = new URL(String(rawURL || ''))
  } catch {
    throw new Error('US-055 rehearsal requires a valid PostgreSQL URL')
  }
  if (!['postgres:', 'postgresql:'].includes(target.protocol)) {
    throw new Error('US-055 rehearsal requires PostgreSQL')
  }
  if (!loopbackHosts.has(target.hostname)) {
    throw new Error('US-055 rehearsal accepts only a loopback PostgreSQL target')
  }
  const database = decodeURIComponent(target.pathname.replace(/^\/+/, ''))
  if (!database || !rehearsalDatabasePattern.test(database)) {
    throw new Error('US-055 rehearsal database name must contain rehearsal')
  }
  if (!target.port || Number(target.port) < 1024 || Number(target.port) > 65535) {
    throw new Error('US-055 rehearsal requires an explicit unprivileged loopback port')
  }
  return {
    database,
    hostname: target.hostname,
    port: Number(target.port),
    username: decodeURIComponent(target.username),
  }
}

export const redactDatabaseURL = (rawURL) => {
  const target = new URL(rawURL)
  if (target.password) target.password = '[REDACTED]'
  return target.toString()
}

export const parseLoopbackDockerPort = (value) => {
  const match = String(value).trim().match(/^127\.0\.0\.1:(\d+)$/)
  if (!match) throw new Error('Docker did not publish PostgreSQL on IPv4 loopback')
  const port = Number(match[1])
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    throw new Error('Docker returned an invalid rehearsal port')
  }
  return port
}

export const postgresReadinessProbeArgs = ({ containerName, database, user }) => [
  'exec',
  containerName,
  'pg_isready',
  '--host',
  '127.0.0.1',
  '--port',
  '5432',
  '--username',
  user,
  '--dbname',
  database,
]

const allowedChildEnvironmentKeys = new Set([
  'APPDATA',
  'CI',
  'ComSpec',
  'COMSPEC',
  'LANG',
  'LOCALAPPDATA',
  'Path',
  'PATH',
  'PATHEXT',
  'PNPM_HOME',
  'SystemRoot',
  'SYSTEMROOT',
  'TEMP',
  'TMP',
  'USERPROFILE',
])

export const buildSanitizedChildEnvironment = (source, overrides) => ({
  ...Object.fromEntries(
    Object.entries(source).filter(
      ([key, value]) => allowedChildEnvironmentKeys.has(key) && value !== undefined,
    ),
  ),
  ...overrides,
})

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export const classifyDockerInspectResult = (result, containerName) => {
  if (result?.error || result?.signal || result?.status === null || result?.status === undefined) {
    return 'unverified'
  }
  if (result.status === 0) return 'present'
  if (result.status !== 1) return 'unverified'

  const escapedContainerName = escapeRegExp(containerName)
  const stderr = String(result.stderr || '').trim()
  const confirmedAbsentPatterns = [
    new RegExp(`^Error: No such object: ${escapedContainerName}$`, 'i'),
    new RegExp(`^Error: No such container: ${escapedContainerName}$`, 'i'),
    new RegExp(
      `^Error response from daemon: No such container: ${escapedContainerName}$`,
      'i',
    ),
  ]
  return confirmedAbsentPatterns.some((pattern) => pattern.test(stderr)) ? 'absent' : 'unverified'
}

export const loadBaselineSource = async (sourcePath, manifestPath) => {
  const [sourceRaw, manifestRaw] = await Promise.all([
    readFile(path.resolve(sourcePath), 'utf8'),
    readFile(path.resolve(manifestPath), 'utf8'),
  ])
  const sourceDocument = JSON.parse(sourceRaw)
  const manifest = JSON.parse(manifestRaw)
  const tours = Array.isArray(sourceDocument) ? sourceDocument : sourceDocument.tours
  if (!Array.isArray(tours) || tours.length !== 22) {
    throw new Error('US-055 rehearsal baseline requires exactly 22 source tours')
  }
  if (!Array.isArray(manifest.tours) || manifest.tours.length !== 22) {
    throw new Error('US-055 rehearsal source manifest requires exactly 22 tours')
  }
  const identities = tours.map((tour) => ({
    checksum: String(tour.sourceChecksum || tour.checksum || ''),
    slug: String(tour.slug || ''),
  }))
  const expected = manifest.tours.map((tour) => ({
    checksum: String(tour.checksum || ''),
    slug: String(tour.slug || ''),
  }))
  const bySlug = (left, right) => left.slug.localeCompare(right.slug)
  if (
    new Set(identities.map(({ slug }) => slug)).size !== 22 ||
    identities.some(({ checksum, slug }) => !slug || !/^[a-f0-9]{64}$/.test(checksum)) ||
    JSON.stringify([...identities].sort(bySlug)) !== JSON.stringify([...expected].sort(bySlug))
  ) {
    throw new Error('US-055 rehearsal source inventory does not match the sealed 22-tour manifest')
  }
  return { sourceDocument, sourceRaw, tours }
}

const optionalString = (value) => (value === null || value === undefined ? null : String(value))

const canonicalFrozenTours = (tours) =>
  [...tours]
    .sort((left, right) => String(left.slug).localeCompare(String(right.slug)))
    .map((tour) => ({
      excludes: (tour.excludes || []).map((row) => ({
        id: String(row.id),
        label: String(row.label),
      })),
      includes: (tour.includes || []).map((row) => ({
        id: String(row.id),
        label: String(row.label),
      })),
      itineraryDays: (tour.itineraryDays || []).map((day) => ({
        accommodation: optionalString(day.accommodation),
        dayNumber: Number(day.dayNumber),
        meals: optionalString(day.meals),
        route: optionalString(day.route),
        summary: String(day.summary),
        title: String(day.title),
        transport: optionalString(day.transport),
      })),
      slug: String(tour.slug),
      summary: String(tour.summary),
      title: String(tour.title),
    }))

export const buildFrozenSourceProof = (inputTours) => {
  const tours = canonicalFrozenTours(inputTours)
  const serviceRows = tours.flatMap((tour) =>
    ['includes', 'excludes'].flatMap((bucket) =>
      tour[bucket].map((row) => ({
        checksum: canonicalChecksum(row),
        identity: `${tour.slug}\0${bucket}\0${row.id}`,
      })),
    ),
  )
  const itineraryDays = tours.flatMap((tour) =>
    tour.itineraryDays.map((day) => ({
      checksum: canonicalChecksum(day),
      identity: `${tour.slug}\0${day.dayNumber}`,
    })),
  )
  const tourChecksums = tours.map((tour) => ({
    checksum: canonicalChecksum(tour),
    slug: tour.slug,
  }))
  if (
    tours.length !== 22 ||
    itineraryDays.length !== 116 ||
    serviceRows.length !== 331 ||
    new Set(tours.map(({ slug }) => slug)).size !== 22 ||
    new Set(serviceRows.map(({ identity }) => identity)).size !== 331 ||
    new Set(itineraryDays.map(({ identity }) => identity)).size !== 116
  ) {
    throw new Error('US-055 frozen source requires exact 22 tours, 116 days, and 331 service rows')
  }
  return {
    artifactChecksum: canonicalChecksum(tours),
    itineraryChecksum: canonicalChecksum(itineraryDays),
    itineraryDays: 116,
    serviceChecksum: canonicalChecksum(serviceRows),
    serviceRows: 331,
    tourChecksums,
    tours: 22,
  }
}

export const loadFrozenSourceSnapshot = async (snapshotPath) => {
  const bytes = await readFile(path.resolve(snapshotPath))
  const snapshot = JSON.parse(bytes.toString('utf8'))
  const { snapshotChecksum, ...withoutChecksum } = snapshot
  if (
    snapshot.version !== 1 ||
    snapshot.sourceLocale !== 'en' ||
    snapshot.site?.code !== 'wing-side' ||
    canonicalChecksum(withoutChecksum) !== snapshotChecksum
  ) {
    throw new Error('US-055 frozen source snapshot checksum or identity is invalid')
  }
  return {
    artifactRawSha256: sha256(bytes),
    proof: buildFrozenSourceProof(snapshot.tours),
    snapshot,
  }
}

export const assertArtifactInputContract = (input) => {
  const keys = ['catalogPath', 'catalogSha256', 'planPath', 'planSha256']
  const supplied = keys.filter((key) => Boolean(input?.[key]))
  if (supplied.length === 0) return { status: 'pending', reason: 'catalog-r3-not-supplied' }
  if (supplied.length !== keys.length) {
    throw new Error(`US-055 rehearsal artifact contract requires ${keys.join(', ')}`)
  }
  for (const key of ['catalogSha256', 'planSha256']) {
    if (!/^[a-f0-9]{64}$/.test(input[key])) {
      throw new Error(`US-055 rehearsal ${key} must be a lowercase SHA-256`)
    }
  }
  return {
    status: 'pending',
    reason: 'frozen-artifacts-supplied-lifecycle-not-executed',
    validatedArtifacts: true,
  }
}
