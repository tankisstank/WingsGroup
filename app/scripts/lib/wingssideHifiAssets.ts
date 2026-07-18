import { createHash } from 'node:crypto'
import path from 'node:path'

export const WINGSSIDE_HIFI_SITE_CODE = 'wings-side'
export const WINGSSIDE_HIFI_ROLLBACK_MEDIA_POLICY =
  'retain-report-created-media-for-payload-version-history' as const

export const wingsSideHiFiAssets = {
  adventure: { alt: 'Active Vietnam journey through mountain landscapes', file: 'adventure.jpg' },
  culture: { alt: 'Vietnam culture and heritage journey', file: 'culture.jpg' },
  family: { alt: 'Private family journey in Vietnam', file: 'family.jpg' },
  halong: { alt: 'Ha Long Bay limestone islands and water', file: 'halong.jpg' },
  hanoi: { alt: 'Ha Noi heritage streets and local atmosphere', file: 'hanoi.jpg' },
  heroHalong: { alt: 'Tailor-made Vietnam journey in Ha Long Bay', file: 'hero-halong.jpg' },
  hoian: { alt: 'Hoi An heritage town and lantern atmosphere', file: 'hoian.jpg' },
  hue: { alt: 'Hue imperial heritage in Central Vietnam', file: 'hue.jpg' },
  luxury: { alt: 'Luxury tailor-made Vietnam travel', file: 'luxury.jpg' },
  mekong: { alt: 'Mekong Delta waterways and local life', file: 'mekong.jpg' },
  sapa: { alt: 'Sapa mountain landscape in Northern Vietnam', file: 'sapa.jpg' },
} as const

export type WingsSideHiFiAssetKey = keyof typeof wingsSideHiFiAssets

export type PageMediaBinding = {
  asset: WingsSideHiFiAssetKey
  fieldPath: string
  pagePath: '/' | '/packages'
}

export const wingsSidePageMediaBindings: readonly PageMediaBinding[] = [
  { asset: 'heroHalong', fieldPath: 'hero.media', pagePath: '/' },
  { asset: 'heroHalong', fieldPath: 'hero.slides.0.media', pagePath: '/' },
  { asset: 'hanoi', fieldPath: 'hero.slides.1.media', pagePath: '/' },
  { asset: 'hoian', fieldPath: 'hero.slides.2.media', pagePath: '/' },
  { asset: 'hanoi', fieldPath: 'layout.1.items.0.image', pagePath: '/' },
  { asset: 'halong', fieldPath: 'layout.1.items.1.image', pagePath: '/' },
  { asset: 'luxury', fieldPath: 'layout.1.items.2.image', pagePath: '/' },
  { asset: 'hanoi', fieldPath: 'layout.3.items.0.image', pagePath: '/' },
  { asset: 'halong', fieldPath: 'layout.3.items.1.image', pagePath: '/' },
  { asset: 'hoian', fieldPath: 'layout.3.items.2.image', pagePath: '/' },
  { asset: 'hue', fieldPath: 'layout.3.items.3.image', pagePath: '/' },
  { asset: 'mekong', fieldPath: 'layout.3.items.4.image', pagePath: '/' },
  { asset: 'luxury', fieldPath: 'layout.4.items.0.image', pagePath: '/' },
  { asset: 'family', fieldPath: 'layout.4.items.1.image', pagePath: '/' },
  { asset: 'culture', fieldPath: 'layout.4.items.2.image', pagePath: '/' },
  { asset: 'adventure', fieldPath: 'layout.4.items.3.image', pagePath: '/' },
  { asset: 'heroHalong', fieldPath: 'layout.5.items.0.image', pagePath: '/' },
  { asset: 'sapa', fieldPath: 'layout.5.items.1.image', pagePath: '/' },
  { asset: 'hoian', fieldPath: 'layout.5.items.2.image', pagePath: '/' },
  { asset: 'heroHalong', fieldPath: 'meta.image', pagePath: '/' },
  { asset: 'heroHalong', fieldPath: 'hero.media', pagePath: '/packages' },
  { asset: 'heroHalong', fieldPath: 'layout.0.media', pagePath: '/packages' },
  { asset: 'heroHalong', fieldPath: 'layout.2.items.0.image', pagePath: '/packages' },
  { asset: 'sapa', fieldPath: 'layout.2.items.1.image', pagePath: '/packages' },
  { asset: 'hoian', fieldPath: 'layout.2.items.2.image', pagePath: '/packages' },
  { asset: 'heroHalong', fieldPath: 'meta.image', pagePath: '/packages' },
] as const

export const sha256 = (value: Buffer | string): string =>
  createHash('sha256').update(value).digest('hex')

export const deterministicHiFiFilename = (file: string, digest: string): string => {
  const extension = path.extname(file).toLowerCase()
  const basename = path.basename(file)
  const stem = basename.slice(0, basename.length - path.extname(basename).length)
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
      throw new Error(`Cannot apply media binding at ${fieldPath}; missing ${parts.slice(0, index + 1).join('.')}`)
    }
    current = next
  }

  const last = parts.at(-1)!
  if (Array.isArray(current)) current[Number(last)] = value
  else (current as Record<string, unknown>)[last] = value
}

export const bindingSnapshotChecksum = (
  snapshot: Record<string, number | string | null>,
): string => sha256(JSON.stringify(Object.entries(snapshot).sort(([left], [right]) => left.localeCompare(right))))
