import fs from 'node:fs/promises'
import path from 'node:path'

import type { Payload, PayloadRequest } from 'payload'

import type { WingsGroupV3MediaManifest, WingsGroupV3MediaPlan } from './wingsGroupV3MediaPlan'
import { isWingsGroupLocalPreviewStoreConfigured } from '../../src/utilities/localPreviewStore'

const context = { disableRevalidate: true, e09PreviewMediaSeed: true, seed: true }

type RelationID = number | string
type WingsGroupV3MediaDocument = Record<string, unknown>

export type WingsGroupV3PreviewMediaSeedSummary = {
  created: number
  records: Array<{
    action: 'created' | 'reused'
    filename: string
    id: RelationID
    sourceDimensions: { height: number; width: number }
    sourceIdentity: string
  }>
  reused: number
  siteID: RelationID
  verified: number
}

const relationID = (value: unknown): RelationID | undefined => {
  if (typeof value === 'number' || typeof value === 'string') return value
  if (value && typeof value === 'object' && 'id' in value) {
    const id = (value as { id?: unknown }).id
    return typeof id === 'number' || typeof id === 'string' ? id : undefined
  }
  return undefined
}

const returnedUploadFilenames = (document: WingsGroupV3MediaDocument): string[] => {
  const filenames = new Set<string>()
  if (typeof document.filename === 'string') filenames.add(document.filename)
  if (document.sizes && typeof document.sizes === 'object') {
    for (const size of Object.values(document.sizes)) {
      if (size && typeof size === 'object' && 'filename' in size) {
        const filename = (size as { filename?: unknown }).filename
        if (typeof filename === 'string') filenames.add(filename)
      }
    }
  }
  return [...filenames]
}

const resolveRunOwnedUploadFile = (mediaDirectory: string, filename: string): string => {
  const root = path.resolve(mediaDirectory)
  const resolved = path.resolve(root, filename)
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error(
      `Payload returned a preview upload filename outside its run directory: ${filename}`,
    )
  }
  return resolved
}

const findPreviewMediaBySourceIdentity = async ({
  payload,
  req,
  siteID,
  sourceIdentity,
}: {
  payload: Payload
  req: PayloadRequest
  siteID: RelationID
  sourceIdentity: string
}) => {
  const scoped = await payload.find({
    collection: 'media',
    depth: 0,
    limit: 2,
    overrideAccess: true,
    pagination: false,
    req,
    where: {
      and: [
        { site: { equals: siteID } },
        { 'governance.sourceIdentity': { equals: sourceIdentity } },
      ],
    },
  })
  if (scoped.docs.length > 1) {
    throw new Error(`Duplicate WingsGroup preview media source identity ${sourceIdentity}`)
  }

  const global = await payload.find({
    collection: 'media',
    depth: 0,
    limit: 2,
    overrideAccess: true,
    pagination: false,
    req,
    where: { 'governance.sourceIdentity': { equals: sourceIdentity } },
  })
  for (const document of global.docs) {
    const documentSiteID = relationID(document.site)
    if (documentSiteID !== undefined && String(documentSiteID) !== String(siteID)) {
      throw new Error(
        `Refusing to reuse WingsGroup preview media across tenants: ${sourceIdentity}`,
      )
    }
  }

  return scoped.docs[0] || null
}

const validatePreviewMedia = ({
  document,
  record,
  siteID,
}: {
  document: WingsGroupV3MediaDocument
  record: WingsGroupV3MediaPlan['records'][number]
  siteID: RelationID
}) => {
  if (String(relationID(document.site)) !== String(siteID)) {
    throw new Error(`Preview media ${record.sourceFile} is not scoped to wings-group.`)
  }
  if (
    document.width !== record.sourceDimensions.width ||
    document.height !== record.sourceDimensions.height
  ) {
    throw new Error(
      `Preview media ${record.sourceFile} dimensions ${document.width}x${document.height} do not match ${record.sourceDimensions.width}x${record.sourceDimensions.height}.`,
    )
  }
  const governance = document.governance as Record<string, unknown> | undefined
  if (
    governance?.managedBy !== 'wingsgroup-v3' ||
    governance.publicationState !== 'pending' ||
    governance.sourceFileSha256 !== record.sourceFileSha256 ||
    governance.sourceIdentity !== record.sourceIdentity
  ) {
    throw new Error(`Preview media ${record.sourceFile} governance is not pending and governed.`)
  }
}

export const seedWingsGroupV3PreviewMedia = async ({
  assetsDirectory,
  manifest,
  mediaDirectory,
  payload,
  plan,
  req,
  siteID,
}: {
  assetsDirectory: string
  manifest: WingsGroupV3MediaManifest
  mediaDirectory: string
  payload: Payload
  plan: WingsGroupV3MediaPlan
  req: PayloadRequest
  siteID: RelationID
}): Promise<WingsGroupV3PreviewMediaSeedSummary> => {
  if (process.env.NODE_ENV === 'production' || process.env.E09_PREVIEW_MEDIA_SEED !== 'true') {
    throw new Error(
      'WingsGroup v3 preview media seeding requires the explicit non-production local preview media seed.',
    )
  }

  const memoryStore = isWingsGroupLocalPreviewStoreConfigured()
  if (!memoryStore) await fs.mkdir(mediaDirectory, { recursive: true })
  const createdIDs: RelationID[] = []
  const runOwnedUploadFiles = new Set<string>()
  const summary: WingsGroupV3PreviewMediaSeedSummary = {
    created: 0,
    records: [],
    reused: 0,
    siteID,
    verified: 0,
  }
  const { buildWingsGroupV3MediaSeedData } = await import('../import-wingsgroup-v3-media')

  try {
    for (const record of plan.records) {
      const existing = await findPreviewMediaBySourceIdentity({
        payload,
        req,
        siteID,
        sourceIdentity: record.sourceIdentity,
      })
      const action: 'created' | 'reused' = existing ? 'reused' : 'created'
      let document: WingsGroupV3MediaDocument

      if (existing) {
        validatePreviewMedia({
          document: existing as unknown as WingsGroupV3MediaDocument,
          record,
          siteID,
        })
        document = (await payload.update({
          collection: 'media',
          context,
          data: buildWingsGroupV3MediaSeedData({ manifest, record, siteID }) as never,
          id: existing.id,
          locale: 'vi',
          overrideAccess: true,
          req,
        })) as unknown as WingsGroupV3MediaDocument
      } else {
        const bytes = await fs.readFile(path.join(assetsDirectory, record.sourceFile))
        document = (await payload.create({
          collection: 'media',
          context,
          data: buildWingsGroupV3MediaSeedData({ manifest, record, siteID }) as never,
          file: {
            data: bytes,
            mimetype: 'image/png',
            name: record.importFilename,
            size: bytes.byteLength,
          },
          locale: 'vi',
          overrideAccess: true,
          req,
        })) as unknown as WingsGroupV3MediaDocument
        const id = relationID(document.id)
        if (id === undefined) throw new Error(`Preview media ${record.sourceFile} has no id.`)
        createdIDs.push(id)
        if (!memoryStore) {
          for (const filename of returnedUploadFilenames(document)) {
            runOwnedUploadFiles.add(resolveRunOwnedUploadFile(mediaDirectory, filename))
          }
        }
      }

      const documentID = relationID(document.id)
      if (documentID === undefined) throw new Error(`Preview media ${record.sourceFile} has no id.`)

      await payload.update({
        collection: 'media',
        context,
        data: { alt: record.alt.en } as never,
        id: documentID,
        locale: 'en',
        overrideAccess: true,
        req,
      })
      validatePreviewMedia({ document, record, siteID })

      if (action === 'created') summary.created += 1
      else summary.reused += 1
      summary.verified += 1
      summary.records.push({
        action,
        filename: typeof document.filename === 'string' ? document.filename : record.importFilename,
        id: documentID,
        sourceDimensions: record.sourceDimensions,
        sourceIdentity: record.sourceIdentity,
      })
    }
  } catch (error) {
    const cleanupErrors: string[] = []
    for (const id of createdIDs.reverse()) {
      try {
        await payload.delete({ collection: 'media', context, id, overrideAccess: true, req })
      } catch (cleanupError) {
        cleanupErrors.push(
          `Preview media record cleanup failed for ${id}: ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`,
        )
      }
    }
    if (!memoryStore) {
      for (const file of runOwnedUploadFiles) {
        try {
          await fs.rm(file, { force: true })
        } catch (cleanupError) {
          cleanupErrors.push(
            `Preview media file cleanup failed for ${file}: ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`,
          )
        }
      }
    }
    if (cleanupErrors.length > 0) {
      throw new Error(
        `WingsGroup v3 preview media seed failed: ${error instanceof Error ? error.message : String(error)} Cleanup: ${cleanupErrors.join(' ')}`,
      )
    }
    throw error
  }

  return summary
}
