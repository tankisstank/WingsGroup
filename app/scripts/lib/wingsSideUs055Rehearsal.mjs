import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

export const rehearsalDatabasePattern = /rehearsal/i
export const loopbackHosts = new Set(['127.0.0.1', '::1', 'localhost'])

export const sha256 = (value) => createHash('sha256').update(value).digest('hex')

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
  return { status: 'supplied' }
}
