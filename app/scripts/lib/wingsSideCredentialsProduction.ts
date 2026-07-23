import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

import {
  buildWingsSideCredentialsBlock,
  validateWingsSideCredentialManifest,
  wingsSideCredentialAssetRoot,
  type WingsSideCredentialItem,
  type WingsSideCredentialManifest,
} from './wingsSideCredentials'

export const wingsSideCredentialsProductionSiteCode = 'wings-side'
export const wingsSideCredentialsProductionLocales = ['vi', 'en', 'it', 'es', 'pt'] as const
export const wingsSideCredentialsProductionExpectedItemCount = 24
export const wingsSideCredentialsProductionPlanSchemaVersion = 1

export type WingsSideCredentialsProductionLocale =
  (typeof wingsSideCredentialsProductionLocales)[number]
export type WingsSideCredentialsState = 'after' | 'before' | 'mixed' | 'unknown'

export type WingsSideCredentialsSourceIdentity = {
  assetRootBasename: string
  assets: Array<{ file: string; sha256: string; size: number }>
  expectedItemCount: number
  locales: WingsSideCredentialsProductionLocale[]
  manifestSha256: string
  reviewStatusTotals: { needsReview: number; verified: number }
  siteCode: string
}

export type CredentialMediaSnapshot = {
  alt: unknown
  filename: null | string
  id: number | string
  siteID: null | number | string
}

export type CredentialHomeSnapshot = {
  id: number | string
  layout: unknown[]
  layoutChecksum: string
  locale: WingsSideCredentialsProductionLocale
  status: null | string
}

export type WingsSideCredentialsSnapshot = {
  blocks: Array<{
    checksum: string
    itemCount: number
    locale: WingsSideCredentialsProductionLocale
    reviewStatusTotals: { needsReview: number; verified: number }
  }>
  homes: CredentialHomeSnapshot[]
  media: CredentialMediaSnapshot[]
  state: WingsSideCredentialsState
}

export type WingsSideCredentialsPlan = {
  aggregateChecksums: { after: string; before: string }
  createdAt: string
  expectedItemCount: 24
  expectedLocales: WingsSideCredentialsProductionLocale[]
  mediaOperations: Array<{ action: 'create'; file: string; itemID: string; sha256: string }>
  mode: 'plan'
  pageOperations: Array<{
    afterChecksum: string
    beforeChecksum: string
    beforeLayout: unknown[]
    homePageID: number | string
    locale: WingsSideCredentialsProductionLocale
  }>
  planVersion: 1
  runID: string
  siteCode: string
  siteID: number | string
  sourceIdentity: WingsSideCredentialsSourceIdentity
}

type Relation = null | number | string | { id?: number | string } | { value?: number | string }

const cloneJSON = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

export const stableJSONStringify = (value: unknown): string => {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map((item) => stableJSONStringify(item)).join(',')}]`
  const record = value as Record<string, unknown>
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableJSONStringify(record[key])}`)
    .join(',')}}`
}

export const credentialsChecksum = (value: unknown): string =>
  createHash('sha256').update(stableJSONStringify(value)).digest('hex')

export const credentialRelationID = (value: Relation): null | number | string => {
  if (typeof value === 'number' || typeof value === 'string') return value
  if (value && typeof value === 'object' && 'id' in value) return value.id ?? null
  if (value && typeof value === 'object' && 'value' in value) return value.value ?? null
  return null
}

export const credentialFileSha256 = async (filePath: string) => {
  const bytes = await fs.readFile(filePath)
  return {
    sha256: createHash('sha256').update(bytes).digest('hex'),
    size: bytes.byteLength,
  }
}

export const reviewStatusTotalsForItems = (items: WingsSideCredentialItem[]) => ({
  needsReview: items.filter((item) => item.reviewStatus === 'needs-review').length,
  verified: items.filter((item) => item.reviewStatus === 'verified').length,
})

export const aggregateReviewStatusTotals = (items: WingsSideCredentialItem[]) => {
  const perLocale = reviewStatusTotalsForItems(items)
  return {
    needsReview: perLocale.needsReview * wingsSideCredentialsProductionLocales.length,
    verified: perLocale.verified * wingsSideCredentialsProductionLocales.length,
  }
}

export const buildWingsSideCredentialsSourceIdentity = async (
  manifest: WingsSideCredentialManifest,
): Promise<WingsSideCredentialsSourceIdentity> => {
  await validateWingsSideCredentialManifest(manifest)
  if (manifest.siteCode !== wingsSideCredentialsProductionSiteCode) {
    throw new Error(
      `Production credentials import requires site code ${wingsSideCredentialsProductionSiteCode}`,
    )
  }
  const manifestFingerprint = await credentialFileSha256(
    path.join(wingsSideCredentialAssetRoot, 'manifest.json'),
  )
  const assets = await Promise.all(
    [...manifest.items]
      .sort((left, right) => left.file.localeCompare(right.file))
      .map(async (item) => ({
        file: item.file,
        ...(await credentialFileSha256(path.join(wingsSideCredentialAssetRoot, item.file))),
      })),
  )
  return {
    assetRootBasename: path.basename(wingsSideCredentialAssetRoot),
    assets,
    expectedItemCount: wingsSideCredentialsProductionExpectedItemCount,
    locales: [...wingsSideCredentialsProductionLocales],
    manifestSha256: manifestFingerprint.sha256,
    reviewStatusTotals: reviewStatusTotalsForItems(manifest.items),
    siteCode: manifest.siteCode,
  }
}

export const normalizeCredentialsBlock = (block: Record<string, unknown>) => {
  const items = Array.isArray(block.items) ? block.items : []
  return {
    ariaLabel: block.ariaLabel ?? null,
    autoplay: block.autoplay ?? null,
    blockName: block.blockName ?? null,
    blockType: block.blockType ?? null,
    description: block.description ?? null,
    eyebrow: block.eyebrow ?? null,
    fullBleed: block.fullBleed ?? null,
    intervalMs: block.intervalMs ?? null,
    items: items.map((item) => {
      const row = item && typeof item === 'object' ? (item as Record<string, unknown>) : {}
      return {
        description: row.description ?? null,
        image: credentialRelationID(row.image as Relation),
        issuedOn: row.issuedOn ?? null,
        issuer: row.issuer ?? null,
        kind: row.kind ?? null,
        label: row.label ?? null,
        mark: row.mark ?? null,
        recognitionYear: row.recognitionYear ?? null,
        recipient: row.recipient ?? null,
        referenceCode: row.referenceCode ?? null,
        reviewStatus: row.reviewStatus ?? null,
        sourceFilename: row.sourceFilename ?? null,
        title: row.title ?? null,
      }
    }),
    title: block.title ?? null,
  }
}

const stripCredentialsBlocks = (layout: unknown[]) =>
  layout.filter(
    (block) =>
      !(
        block &&
        typeof block === 'object' &&
        (block as Record<string, unknown>).blockType === 'credentialsCarousel'
      ),
  )

export const layoutChecksum = (layout: unknown[]) => credentialsChecksum(layout)

export const afterBlockChecksum = ({
  locale,
  manifest,
  mediaIDs,
}: {
  locale: WingsSideCredentialsProductionLocale
  manifest: WingsSideCredentialManifest
  mediaIDs: Map<string, number | string>
}) =>
  credentialsChecksum(
    normalizeCredentialsBlock(buildWingsSideCredentialsBlock({ locale, manifest, mediaIDs })),
  )

export const classifyWingsSideCredentialsState = ({
  homes,
  manifest,
  media,
  siteID,
}: {
  homes: CredentialHomeSnapshot[]
  manifest: WingsSideCredentialManifest
  media: CredentialMediaSnapshot[]
  siteID: number | string
}): WingsSideCredentialsSnapshot => {
  const expectedFiles = new Set(manifest.items.map((item) => item.file))
  const scopedMedia = media.filter(
    (item) =>
      item.filename && expectedFiles.has(item.filename) && String(item.siteID) === String(siteID),
  )
  const homesByLocale = new Map(homes.map((home) => [home.locale, home]))
  const mediaByFilename = new Map(scopedMedia.map((item) => [String(item.filename), item]))
  const mediaIDs = new Map<string, number | string>()
  for (const item of manifest.items) {
    const mediaItem = mediaByFilename.get(item.file)
    if (mediaItem) mediaIDs.set(item.id, mediaItem.id)
  }

  const blocks = wingsSideCredentialsProductionLocales.flatMap((locale) => {
    const home = homesByLocale.get(locale)
    const layout = Array.isArray(home?.layout) ? home.layout : []
    return layout
      .filter(
        (block) =>
          block &&
          typeof block === 'object' &&
          (block as Record<string, unknown>).blockType === 'credentialsCarousel',
      )
      .map((block) => {
        const normalized = normalizeCredentialsBlock(block as Record<string, unknown>)
        const rows = normalized.items
        return {
          checksum: credentialsChecksum(normalized),
          itemCount: rows.length,
          locale,
          reviewStatusTotals: {
            needsReview: rows.filter((row) => row.reviewStatus === 'needs-review').length,
            verified: rows.filter((row) => row.reviewStatus === 'verified').length,
          },
        }
      })
  })

  const everyLocaleHasOneHome =
    homes.length === wingsSideCredentialsProductionLocales.length &&
    wingsSideCredentialsProductionLocales.every((locale) => {
      const home = homesByLocale.get(locale)
      return home?.status === 'published'
    })
  const noCredentialBlocks = blocks.length === 0
  const noCredentialMedia = scopedMedia.length === 0
  let state: WingsSideCredentialsState = 'unknown'

  if (everyLocaleHasOneHome && noCredentialBlocks && noCredentialMedia) {
    state = 'before'
  } else if (
    everyLocaleHasOneHome &&
    scopedMedia.length === manifest.items.length &&
    mediaIDs.size === manifest.items.length
  ) {
    const afterBlocksMatch = wingsSideCredentialsProductionLocales.every((locale) => {
      const localeBlocks = blocks.filter((block) => block.locale === locale)
      return (
        localeBlocks.length === 1 &&
        localeBlocks[0].itemCount === wingsSideCredentialsProductionExpectedItemCount &&
        localeBlocks[0].checksum === afterBlockChecksum({ locale, manifest, mediaIDs })
      )
    })
    state =
      afterBlocksMatch && blocks.length === wingsSideCredentialsProductionLocales.length
        ? 'after'
        : 'mixed'
  } else if (blocks.length > 0 || scopedMedia.length > 0) {
    state = 'mixed'
  }

  return { blocks, homes, media: scopedMedia, state }
}

export const buildWingsSideCredentialsPlan = async ({
  homes,
  manifest,
  runID,
  siteID,
  sourceIdentity,
}: {
  homes: CredentialHomeSnapshot[]
  manifest: WingsSideCredentialManifest
  runID: string
  siteID: number | string
  sourceIdentity: WingsSideCredentialsSourceIdentity
}): Promise<WingsSideCredentialsPlan> => {
  const mediaOperations = manifest.items.map((item) => {
    const asset = sourceIdentity.assets.find((candidate) => candidate.file === item.file)
    if (!asset) throw new Error(`Missing source fingerprint for ${item.file}`)
    return { action: 'create' as const, file: item.file, itemID: item.id, sha256: asset.sha256 }
  })
  const placeholderMediaIDs = new Map(
    manifest.items.map((item) => [item.id, `planned:${item.file}`]),
  )
  const pageOperations = wingsSideCredentialsProductionLocales.map((locale) => {
    const home = homes.find((candidate) => candidate.locale === locale)
    if (!home) throw new Error(`Missing ${locale} Home page snapshot`)
    const afterLayout = [
      ...stripCredentialsBlocks(home.layout),
      buildWingsSideCredentialsBlock({ locale, manifest, mediaIDs: placeholderMediaIDs }),
    ]
    return {
      afterChecksum: layoutChecksum(afterLayout),
      beforeChecksum: home.layoutChecksum,
      beforeLayout: cloneJSON(home.layout),
      homePageID: home.id,
      locale,
    }
  })

  return {
    aggregateChecksums: {
      after: credentialsChecksum(
        pageOperations.map(({ afterChecksum, locale }) => ({ afterChecksum, locale })),
      ),
      before: credentialsChecksum(
        pageOperations.map(({ beforeChecksum, locale }) => ({ beforeChecksum, locale })),
      ),
    },
    createdAt: new Date().toISOString(),
    expectedItemCount: wingsSideCredentialsProductionExpectedItemCount,
    expectedLocales: [...wingsSideCredentialsProductionLocales],
    mediaOperations,
    mode: 'plan',
    pageOperations,
    planVersion: wingsSideCredentialsProductionPlanSchemaVersion,
    runID,
    siteCode: wingsSideCredentialsProductionSiteCode,
    siteID,
    sourceIdentity,
  }
}

export const assertWingsSideCredentialsPlan = (plan: WingsSideCredentialsPlan) => {
  if (
    plan.planVersion !== wingsSideCredentialsProductionPlanSchemaVersion ||
    plan.mode !== 'plan' ||
    plan.siteCode !== wingsSideCredentialsProductionSiteCode ||
    plan.expectedItemCount !== wingsSideCredentialsProductionExpectedItemCount ||
    credentialsChecksum(plan.expectedLocales) !==
      credentialsChecksum(wingsSideCredentialsProductionLocales) ||
    plan.mediaOperations.length !== wingsSideCredentialsProductionExpectedItemCount ||
    plan.pageOperations.length !== wingsSideCredentialsProductionLocales.length
  ) {
    throw new Error('Credentials production plan contract mismatch')
  }
  if (new Set(plan.mediaOperations.map(({ file }) => file)).size !== plan.mediaOperations.length) {
    throw new Error('Credentials production plan contains duplicate media filenames')
  }
  if (
    new Set(plan.pageOperations.map(({ locale }) => locale)).size !== plan.pageOperations.length
  ) {
    throw new Error('Credentials production plan contains duplicate page locales')
  }
  if (
    credentialsChecksum(
      plan.pageOperations.map(({ beforeChecksum, locale }) => ({ beforeChecksum, locale })),
    ) !== plan.aggregateChecksums.before ||
    credentialsChecksum(
      plan.pageOperations.map(({ afterChecksum, locale }) => ({ afterChecksum, locale })),
    ) !== plan.aggregateChecksums.after
  ) {
    throw new Error('Credentials production plan aggregate checksum mismatch')
  }
}

export const assertSourceIdentityMatches = (
  expected: WingsSideCredentialsSourceIdentity,
  actual: WingsSideCredentialsSourceIdentity,
) => {
  if (credentialsChecksum(expected) !== credentialsChecksum(actual)) {
    throw new Error('Credentials source identity drifted from plan')
  }
}

export const assertCredentialsProductionEnvironment = ({
  databaseURL,
  nodeEnv,
  payloadDbPush,
  payloadPackageName,
}: {
  databaseURL: string
  nodeEnv: string | undefined
  payloadDbPush: string | undefined
  payloadPackageName: string
}) => {
  if (nodeEnv !== 'production') {
    throw new Error('Credentials production importer requires NODE_ENV=production')
  }
  if (payloadDbPush !== 'false') {
    throw new Error('Credentials production importer requires PAYLOAD_DB_PUSH=false')
  }
  if (!/^postgres(?:ql)?:\/\//u.test(databaseURL)) {
    throw new Error('Credentials production importer requires a PostgreSQL DATABASE_URL')
  }
  if (!payloadPackageName.includes('db-postgres')) {
    throw new Error(
      `Credentials production importer requires Payload PostgreSQL adapter; found ${payloadPackageName}`,
    )
  }
}
