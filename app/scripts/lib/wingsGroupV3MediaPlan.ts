import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

export const WINGSGROUP_V3_SITE_CODE = 'wings-group'
export const WINGSGROUP_V3_MEDIA_COUNT = 13
export const WINGSGROUP_V3_DERIVATIVE_WIDTHS = [640, 960, 1440] as const
export const WINGSGROUP_V3_DERIVATIVE_FORMATS = ['webp', 'avif'] as const

export type WingsGroupV3MediaManifest = {
  media: Array<{
    alt: { en: string; vi: string }
    dimensions: string
    file: string
    role: string
    sha256: string
  }>
  publicationState: string
  rights: {
    evidence: string
    restriction: string
    state: string
  }
  siteCode: string
  sourcePackage: {
    archiveSha256: string
    attachmentId: string
    assetsDirectory: string
    manifest: string
  }
  version: number
}

export type WingsGroupV3MediaPlanItem = {
  alt: { en: string; vi: string }
  derivatives: Array<{ file: string; format: 'avif' | 'webp'; width: number }>
  importFilename: string
  role: string
  sourceFile: string
  sourceFileSha256: string
  sourceIdentity: string
  sourceDimensions: { height: number; width: number }
}

export type WingsGroupV3MediaPlan = {
  archiveSha256: string
  attachmentId: string
  errors: string[]
  planChecksum: string
  planned: number
  records: WingsGroupV3MediaPlanItem[]
  siteCode: string
}

const sha256 = (value: Buffer | string): string => createHash('sha256').update(value).digest('hex')

const stable = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => `${JSON.stringify(key)}:${stable(child)}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}

const parseDimensions = (dimensions: string): { height: number; width: number } => {
  const match = /^(\d+)x(\d+)$/.exec(dimensions)
  if (!match) throw new Error(`Invalid dimensions ${dimensions}`)
  return { width: Number(match[1]), height: Number(match[2]) }
}

export const parseWingsGroupV3MediaManifest = (value: unknown): WingsGroupV3MediaManifest => {
  const manifest = value as WingsGroupV3MediaManifest
  if (!manifest || typeof manifest !== 'object') throw new Error('Manifest must be an object.')
  if (manifest.version !== 1) throw new Error(`Unsupported manifest version ${manifest.version}`)
  if (manifest.siteCode !== WINGSGROUP_V3_SITE_CODE) {
    throw new Error(`Manifest must target ${WINGSGROUP_V3_SITE_CODE}`)
  }
  if (!Array.isArray(manifest.media) || manifest.media.length !== WINGSGROUP_V3_MEDIA_COUNT) {
    throw new Error(`Manifest must contain exactly ${WINGSGROUP_V3_MEDIA_COUNT} media items.`)
  }
  if (manifest.rights?.state !== 'approved' || !manifest.rights.evidence) {
    throw new Error('Manifest rights must be approved with evidence.')
  }
  if (!/^[a-f0-9]{64}$/.test(manifest.sourcePackage?.archiveSha256 || '')) {
    throw new Error('Manifest archive SHA-256 is invalid.')
  }

  for (const key of ['file', 'sha256'] as const) {
    const values = manifest.media.map((item) => item[key])
    if (new Set(values).size !== values.length) throw new Error(`Duplicate manifest ${key}.`)
  }
  for (const item of manifest.media) {
    if (!item.file || !item.role || !item.alt?.vi || !item.alt?.en) {
      throw new Error(`Manifest media ${item.file || '<unknown>'} lacks bilingual metadata.`)
    }
    if (!/^[a-f0-9]{64}$/.test(item.sha256)) {
      throw new Error(`Manifest media ${item.file} has an invalid SHA-256.`)
    }
    parseDimensions(item.dimensions)
  }
  return manifest
}

export const buildWingsGroupV3MediaPlan = async ({
  assetsDirectory,
  manifest,
}: {
  assetsDirectory: string
  manifest: WingsGroupV3MediaManifest
}): Promise<WingsGroupV3MediaPlan> => {
  const errors: string[] = []
  const records: WingsGroupV3MediaPlanItem[] = []

  for (const item of manifest.media) {
    const sourcePath = path.resolve(assetsDirectory, item.file)
    try {
      const bytes = await fs.readFile(sourcePath)
      const actualSha = sha256(bytes)
      if (actualSha !== item.sha256) throw new Error(`checksum ${actualSha} != ${item.sha256}`)

      const expected = parseDimensions(item.dimensions)
      const metadata = await sharp(bytes).metadata()
      if (!metadata.width || !metadata.height) throw new Error('image dimensions are unavailable')
      if (metadata.width !== expected.width || metadata.height !== expected.height) {
        throw new Error(
          `dimensions ${metadata.width}x${metadata.height} != reviewed manifest ${item.dimensions}`,
        )
      }

      const stem = path.basename(item.file, path.extname(item.file))
      const identityPrefix = item.sha256.slice(0, 12)
      const importFilename = `wg-v3-${identityPrefix}-${item.file}`
      const widths = WINGSGROUP_V3_DERIVATIVE_WIDTHS.filter((width) => width <= metadata.width!)
      records.push({
        alt: item.alt,
        derivatives: widths.flatMap((width) =>
          WINGSGROUP_V3_DERIVATIVE_FORMATS.map((format) => ({
            file: `wingsgroup-v3/${stem}-${identityPrefix}-${width}.${format}`,
            format,
            width,
          })),
        ),
        importFilename,
        role: item.role,
        sourceFile: item.file,
        sourceFileSha256: item.sha256,
        sourceIdentity: `${manifest.sourcePackage.attachmentId}:${item.sha256}`,
        sourceDimensions: { height: metadata.height, width: metadata.width },
      })
    } catch (error) {
      errors.push(`${item.file}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const checksumInput = {
    archiveSha256: manifest.sourcePackage.archiveSha256,
    attachmentId: manifest.sourcePackage.attachmentId,
    records,
    siteCode: manifest.siteCode,
  }
  return {
    ...checksumInput,
    errors,
    planChecksum: sha256(stable(checksumInput)),
    planned: records.length,
  }
}

export const assertApplicableWingsGroupV3MediaPlan = (plan: WingsGroupV3MediaPlan): void => {
  if (plan.errors.length > 0) throw new Error(`Media plan has ${plan.errors.length} error(s).`)
  if (plan.planned !== WINGSGROUP_V3_MEDIA_COUNT) {
    throw new Error(`Media plan contains ${plan.planned}/${WINGSGROUP_V3_MEDIA_COUNT} records.`)
  }
  if (new Set(plan.records.map((item) => item.sourceIdentity)).size !== plan.records.length) {
    throw new Error('Media plan contains duplicate source identities.')
  }
  if (new Set(plan.records.map((item) => item.importFilename)).size !== plan.records.length) {
    throw new Error('Media plan contains duplicate import filenames.')
  }
}

export const resolveSiteSettingsUpsert = ({
  settings,
  sites,
}: {
  settings: Array<{ id: number | string; site?: unknown }>
  sites: Array<{ code?: string; id: number | string }>
}): { operation: 'update'; settingsID: number | string; siteID: number | string } => {
  const matchingSites = sites.filter((site) => site.code === WINGSGROUP_V3_SITE_CODE)
  if (matchingSites.length !== 1) {
    throw new Error(`Expected one ${WINGSGROUP_V3_SITE_CODE} site; found ${matchingSites.length}.`)
  }
  const site = matchingSites[0]
  const relationID = (value: unknown) =>
    value && typeof value === 'object' && 'id' in value
      ? (value as { id: number | string }).id
      : value
  const matchingSettings = settings.filter(
    (record) => String(relationID(record.site)) === String(site.id),
  )
  if (matchingSettings.length !== 1) {
    throw new Error(
      `Expected one site-settings record for ${WINGSGROUP_V3_SITE_CODE}; found ${matchingSettings.length}.`,
    )
  }
  return { operation: 'update', settingsID: matchingSettings[0].id, siteID: site.id }
}
