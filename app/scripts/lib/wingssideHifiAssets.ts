import { createHash } from 'node:crypto'
import path from 'node:path'

import {
  wingsSideHiFiAssets as runtimeAssets,
  type WingsSideHiFiAssetKey as RuntimeAssetKey,
} from '../../src/utilities/wingsSideHiFiMedia'

export const WINGSSIDE_HIFI_SITE_CODE = 'wing-side'
export const WINGSSIDE_HIFI_ROLLBACK_MEDIA_POLICY =
  'retain-report-created-media-for-payload-version-history' as const

export const wingsSideHiFiAssets = runtimeAssets
export type WingsSideHiFiAssetKey = RuntimeAssetKey

export type PageMediaBinding = {
  asset: WingsSideHiFiAssetKey
  fieldPath: string
  pagePath:
    | '/'
    | '/packages'
    | '/destinations'
    | '/styles'
    | '/plan-your-trip'
    | '/travel-guide'
    | '/about-us'
    | '/contact-us'
}

export const wingsSidePageMediaBindings: readonly PageMediaBinding[] = [
  { asset: 'heroHalong', fieldPath: 'hero.media', pagePath: '/' },
  { asset: 'heroHalong', fieldPath: 'hero.slides.0.media', pagePath: '/' },
  { asset: 'hanoi', fieldPath: 'hero.slides.1.media', pagePath: '/' },
  { asset: 'hoian', fieldPath: 'hero.slides.2.media', pagePath: '/' },
  { asset: 'heroHalong', fieldPath: 'meta.image', pagePath: '/' },
  { asset: 'heroHalong', fieldPath: 'hero.media', pagePath: '/packages' },
  { asset: 'heroHalong', fieldPath: 'meta.image', pagePath: '/packages' },
  { asset: 'hanoi', fieldPath: 'hero.media', pagePath: '/destinations' },
  { asset: 'culture', fieldPath: 'hero.media', pagePath: '/styles' },
  { asset: 'planner', fieldPath: 'hero.media', pagePath: '/plan-your-trip' },
  { asset: 'sapa', fieldPath: 'hero.media', pagePath: '/travel-guide' },
  { asset: 'planner', fieldPath: 'hero.media', pagePath: '/about-us' },
  { asset: 'halong', fieldPath: 'hero.media', pagePath: '/contact-us' },
] as const

export const sha256 = (value: Buffer | string): string =>
  createHash('sha256').update(value).digest('hex')

export const deterministicHiFiFilename = (file: string, digest: string): string => {
  const extension = path.extname(file).toLowerCase()
  const basename = path.basename(file)
  const stem = basename
    .slice(0, basename.length - path.extname(basename).length)
    .replace(/[^a-z0-9-]+/gi, '-')
    .toLowerCase()
  return `wingsside-hifi-${stem}-${digest.slice(0, 12)}${extension}`
}

const relationID = (value: unknown): number | string | null => {
  if (typeof value === 'number' || typeof value === 'string') return value
  if (value && typeof value === 'object' && 'id' in value) {
    const id = (value as { id?: unknown }).id
    return typeof id === 'number' || typeof id === 'string' ? id : null
  }
  return null
}

export const readRelationAtPath = (document: Record<string, unknown>, fieldPath: string) => {
  const parts = fieldPath.split('.')
  let current: unknown = document

  for (const part of parts) {
    if (current === null || current === undefined) return null
    current = Array.isArray(current)
      ? current[Number(part)]
      : (current as Record<string, unknown>)[part]
  }

  return relationID(current)
}

export const writeRelationAtPath = (
  document: Record<string, unknown>,
  fieldPath: string,
  value: number | string | null,
): void => {
  const parts = fieldPath.split('.')
  let current: unknown = document

  for (let index = 0; index < parts.length - 1; index += 1) {
    const part = parts[index]
    const next = Array.isArray(current)
      ? current[Number(part)]
      : (current as Record<string, unknown>)[part]
    if (next === null || next === undefined || typeof next !== 'object') {
      throw new Error(
        `Cannot apply media binding at ${fieldPath}; missing ${parts.slice(0, index + 1).join('.')}`,
      )
    }
    current = next
  }

  const last = parts.at(-1)!
  if (Array.isArray(current)) current[Number(last)] = value
  else (current as Record<string, unknown>)[last] = value
}

export const bindingSnapshotChecksum = (snapshot: Record<string, number | string | null>): string =>
  sha256(
    JSON.stringify(Object.entries(snapshot).sort(([left], [right]) => left.localeCompare(right))),
  )
