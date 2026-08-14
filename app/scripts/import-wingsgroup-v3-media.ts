/**
 * Import the governed WingsGroup v3 development media set.
 *
 * The default command is a checksum/dimension plan. Applying is deliberately
 * explicit and is restricted to the local SQLite bootstrap for the exact
 * wings-group tenant. Production publication remains a separate governance
 * transition and is never performed by this importer.
 */
import 'dotenv/config'

import configPromise from '@payload-config'
import fs from 'node:fs/promises'
import fsSync from 'node:fs'
import path from 'node:path'
import { createLocalReq, getPayload, type Payload, type PayloadRequest, type Where } from 'payload'

import {
  assertApplicableWingsGroupV3MediaPlan,
  buildWingsGroupV3MediaPlan,
  parseWingsGroupV3MediaManifest,
  type WingsGroupV3MediaManifest,
  type WingsGroupV3MediaPlan,
  type WingsGroupV3MediaPlanItem,
} from './lib/wingsGroupV3MediaPlan'
import { resolveLocalDatabaseURL } from '../src/utilities/localDatabase'

const context = { disableRevalidate: true, seed: true }
const whereAnd = (...clauses: Where[]): Where => ({ and: clauses })
const relationID = (value: unknown): number | string | undefined => {
  if (typeof value === 'number' || typeof value === 'string') return value
  if (value && typeof value === 'object' && 'id' in value) {
    const id = (value as { id?: unknown }).id
    return typeof id === 'number' || typeof id === 'string' ? id : undefined
  }
  return undefined
}

export const WINGSGROUP_V3_IMPORT_SITE_CODE = 'wings-group'
export const WINGSGROUP_V3_MEDIA_DIRECTORY = path.resolve(import.meta.dirname, '../public/media')

export type WingsGroupV3MediaImportSummary = {
  created: number
  records: Array<{
    action: 'created' | 'reused'
    filename: string
    id: number | string
    sourceDimensions: { height: number; width: number }
    sourceIdentity: string
  }>
  reused: number
  siteCode: typeof WINGSGROUP_V3_IMPORT_SITE_CODE
  siteID: number | string
  verified: number
}

export const parseWingsGroupV3MediaCommand = (argv: string[]) => {
  const positional = argv.find((argument) => !argument.startsWith('--')) || 'plan'
  if (
    !['plan', 'apply'].includes(positional) ||
    argv.includes('--verify') ||
    argv.includes('--rollback')
  ) {
    throw new Error(
      'WingsGroup v3 media supports only plan and explicit local apply; verify/rollback are not part of this governed seed.',
    )
  }
  const option = (name: string): string | undefined =>
    argv.find((argument) => argument.startsWith(`--${name}=`))?.slice(name.length + 3)
  const manifest = option('manifest')
  const assetsDirectory = option('assets-dir')
  if (!manifest) throw new Error('--manifest is required.')
  if (!assetsDirectory) throw new Error('--assets-dir is required.')
  const apply = positional === 'apply' || argv.includes('--apply')
  if (apply && option('site-code') !== WINGSGROUP_V3_IMPORT_SITE_CODE) {
    throw new Error(`Apply requires --site-code=${WINGSGROUP_V3_IMPORT_SITE_CODE}`)
  }
  return {
    apply,
    assetsDirectory: path.resolve(assetsDirectory),
    manifestPath: path.resolve(manifest),
    siteCode: option('site-code'),
  }
}

export type WingsGroupV3LocalDatabaseBackup = {
  backupPath: string
  databasePath: string
}

export const backupLocalDatabase = (): WingsGroupV3LocalDatabaseBackup => {
  const databaseURL = resolveLocalDatabaseURL(process.env.DATABASE_URL)
  if (
    !databaseURL.startsWith('file:') ||
    process.env.NODE_ENV === 'production' ||
    process.env.VERCEL ||
    /prod|staging|remote/i.test(databaseURL)
  ) {
    throw new Error(
      'WingsGroup v3 media apply is restricted to an explicit local SQLite DATABASE_URL.',
    )
  }
  const databasePath = path.resolve(process.cwd(), databaseURL.replace(/^file:/, ''))
  if (!fsSync.existsSync(databasePath))
    throw new Error(`SQLite database not found: ${databasePath}`)
  const backupPath = `${databasePath}.bak-wingsgroup-v3-${new Date().toISOString().replace(/[:.]/g, '-')}`
  fsSync.copyFileSync(databasePath, backupPath)
  return { backupPath, databasePath }
}

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

const collectUploadFiles = async (directory: string): Promise<Set<string>> => {
  const files = new Set<string>()
  const visit = async (currentDirectory: string): Promise<void> => {
    let entries
    try {
      entries = await fs.readdir(currentDirectory, { withFileTypes: true })
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return
      throw error
    }
    for (const entry of entries) {
      const entryPath = path.resolve(currentDirectory, entry.name)
      if (entry.isDirectory()) await visit(entryPath)
      else if (entry.isFile()) files.add(entryPath)
    }
  }
  await visit(path.resolve(directory))
  return files
}

export const inventoryWingsGroupV3UploadFiles = collectUploadFiles

export type WingsGroupV3DatabaseRestoreResult = {
  error?: string
  restored: boolean
}

export const restoreWingsGroupV3SQLiteAtomically = async ({
  backupPath,
  databasePath,
}: {
  backupPath: string
  databasePath: string
}): Promise<WingsGroupV3DatabaseRestoreResult> => {
  const temporaryRestorePath = `${databasePath}.restore-wingsgroup-v3-${process.pid}-${Date.now()}`
  try {
    await fs.copyFile(backupPath, temporaryRestorePath)
    await fs.rename(temporaryRestorePath, databasePath)
    return { restored: true }
  } catch (error) {
    await fs.rm(temporaryRestorePath, { force: true }).catch(() => undefined)
    return { error: errorMessage(error), restored: false }
  }
}

export type WingsGroupV3MediaRecoveryReport = {
  backupPath: string
  databasePath: string
  databaseRestored: boolean
  errors: string[]
  manualRecoveryRequired: boolean
  payloadClosed: boolean
  preservedUploadFiles: number
  removedUploadFiles: string[]
  success: boolean
}

export const recoverWingsGroupV3MediaApply = async ({
  backupPath,
  databasePath,
  mediaDirectory,
  payload,
  preExistingUploadFiles,
}: {
  backupPath: string
  databasePath: string
  mediaDirectory: string
  payload?: Pick<Payload, 'destroy'> | null
  preExistingUploadFiles: ReadonlySet<string>
}): Promise<WingsGroupV3MediaRecoveryReport> => {
  const errors: string[] = []
  let payloadClosed = true
  if (payload) {
    try {
      await payload.destroy()
    } catch (error) {
      payloadClosed = false
      errors.push(`Payload close failed: ${errorMessage(error)}`)
    }
  }

  const databaseRestore = await restoreWingsGroupV3SQLiteAtomically({
    backupPath,
    databasePath,
  })
  if (databaseRestore.error) errors.push(`SQLite restore failed: ${databaseRestore.error}`)

  const removedUploadFiles: string[] = []
  try {
    const currentUploadFiles = await collectUploadFiles(mediaDirectory)
    for (const uploadFile of currentUploadFiles) {
      if (preExistingUploadFiles.has(uploadFile)) continue
      try {
        await fs.rm(uploadFile, { force: true })
        removedUploadFiles.push(uploadFile)
      } catch (error) {
        errors.push(`Upload cleanup failed for ${uploadFile}: ${errorMessage(error)}`)
      }
    }
  } catch (error) {
    errors.push(`Upload inventory failed during recovery: ${errorMessage(error)}`)
  }

  let preservedUploadFiles = 0
  try {
    const remainingUploadFiles = await collectUploadFiles(mediaDirectory)
    preservedUploadFiles = [...preExistingUploadFiles].filter((file) =>
      remainingUploadFiles.has(file),
    ).length
  } catch (error) {
    errors.push(`Upload verification failed during recovery: ${errorMessage(error)}`)
  }

  return {
    backupPath,
    databasePath,
    databaseRestored: databaseRestore.restored,
    errors,
    manualRecoveryRequired: errors.length > 0 || !databaseRestore.restored || !payloadClosed,
    payloadClosed,
    preservedUploadFiles,
    removedUploadFiles,
    success: errors.length === 0 && databaseRestore.restored && payloadClosed,
  }
}

export class WingsGroupV3MediaApplyError extends Error {
  readonly originalError: unknown
  readonly recovery: WingsGroupV3MediaRecoveryReport

  constructor(originalError: unknown, recovery: WingsGroupV3MediaRecoveryReport) {
    super(
      `WingsGroup v3 media apply failed: ${errorMessage(originalError)} Recovery ${
        recovery.success ? 'succeeded' : 'failed'
      }; backup: ${recovery.backupPath}`,
    )
    this.name = 'WingsGroupV3MediaApplyError'
    this.originalError = originalError
    this.recovery = recovery
  }
}

const findExactSite = async (payload: Payload, req: PayloadRequest) => {
  const result = await payload.find({
    collection: 'sites',
    depth: 0,
    limit: 2,
    overrideAccess: true,
    pagination: false,
    req,
    where: { code: { equals: WINGSGROUP_V3_IMPORT_SITE_CODE } },
  })
  if (result.docs.length !== 1) {
    throw new Error(
      `Expected exactly one ${WINGSGROUP_V3_IMPORT_SITE_CODE} site; found ${result.docs.length}`,
    )
  }
  return result.docs[0]
}

export const buildWingsGroupV3MediaGovernance = ({
  manifest,
  record,
}: {
  manifest: WingsGroupV3MediaManifest
  record: WingsGroupV3MediaPlanItem
}) => ({
  derivativeState: 'pending' as const,
  managedBy: 'wingsgroup-v3' as const,
  provenanceReference: `docs/product/wingsgroup-v3-media-manifest.json#media-${record.sourceFile}`,
  publicationState: 'pending' as const,
  responsiveDerivatives: [],
  rightsEvidence: `${manifest.rights.evidence} Scope: ${manifest.licenseScope || manifest.rights.restriction}`,
  rightsState: 'approved' as const,
  sourceArchiveSha256: manifest.sourcePackage.archiveSha256,
  sourceAttachmentId: manifest.sourcePackage.attachmentId,
  sourceFileSha256: record.sourceFileSha256,
  sourceFilename: record.sourceFile,
  sourceIdentity: record.sourceIdentity,
  usageScope: record.usageScope,
})

export const buildWingsGroupV3MediaSeedData = ({
  manifest,
  record,
  siteID,
}: {
  manifest: WingsGroupV3MediaManifest
  record: WingsGroupV3MediaPlanItem
  siteID: number | string
}) => ({
  alt: record.alt.vi,
  focalX: record.focal.x,
  focalY: record.focal.y,
  governance: buildWingsGroupV3MediaGovernance({ manifest, record }),
  site: siteID,
})

const findMediaBySourceIdentity = async ({
  payload,
  req,
  siteID,
  sourceIdentity,
}: {
  payload: Payload
  req: PayloadRequest
  siteID: number | string
  sourceIdentity: string
}) => {
  const scoped = await payload.find({
    collection: 'media',
    depth: 0,
    limit: 2,
    overrideAccess: true,
    pagination: false,
    req,
    where: whereAnd(
      { site: { equals: siteID } },
      { 'governance.sourceIdentity': { equals: sourceIdentity } },
    ),
  })
  if (scoped.docs.length > 1) {
    throw new Error(`Duplicate WingsGroup media source identity ${sourceIdentity}`)
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
        `Refusing to reuse WingsGroup media source identity across tenants: ${sourceIdentity}`,
      )
    }
  }
  return scoped.docs[0] || null
}

const validatePersistedMedia = ({
  document,
  record,
  siteID,
}: {
  document: Record<string, any>
  record: WingsGroupV3MediaPlanItem
  siteID: number | string
}) => {
  if (String(relationID(document.site)) !== String(siteID)) {
    throw new Error(`Media ${record.sourceFile} is not scoped to ${WINGSGROUP_V3_IMPORT_SITE_CODE}`)
  }
  if (
    document.width !== record.sourceDimensions.width ||
    document.height !== record.sourceDimensions.height
  ) {
    throw new Error(
      `Media ${record.sourceFile} persisted dimensions ${document.width}x${document.height} do not match ${record.sourceDimensions.width}x${record.sourceDimensions.height}`,
    )
  }
  if (document.governance?.sourceFileSha256 !== record.sourceFileSha256) {
    throw new Error(`Media ${record.sourceFile} persisted checksum does not match the handoff.`)
  }
}

export const importWingsGroupV3Media = async ({
  apply,
  assetsDirectory,
  manifest,
  payload,
  plan,
  req,
  siteID,
}: {
  apply: boolean
  assetsDirectory: string
  manifest: WingsGroupV3MediaManifest
  payload: Payload
  plan: WingsGroupV3MediaPlan
  req: PayloadRequest
  siteID: number | string
}): Promise<WingsGroupV3MediaImportSummary> => {
  const summary: WingsGroupV3MediaImportSummary = {
    created: 0,
    records: [],
    reused: 0,
    siteCode: WINGSGROUP_V3_IMPORT_SITE_CODE,
    siteID,
    verified: 0,
  }

  for (const record of plan.records) {
    const existing = await findMediaBySourceIdentity({
      payload,
      req,
      siteID,
      sourceIdentity: record.sourceIdentity,
    })
    let document = existing
    let action: 'created' | 'reused' = 'reused'

    if (!document) {
      action = 'created'
      if (apply) {
        const bytes = await fs.readFile(path.join(assetsDirectory, record.sourceFile))
        document = await payload.create({
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
        })
      }
    } else if (apply) {
      document = await payload.update({
        collection: 'media',
        context,
        data: buildWingsGroupV3MediaSeedData({ manifest, record, siteID }) as never,
        id: document.id,
        locale: 'vi',
        overrideAccess: true,
        req,
      })
    }

    if (apply && document) {
      await payload.update({
        collection: 'media',
        context,
        data: { alt: record.alt.en } as never,
        id: document.id,
        locale: 'en',
        overrideAccess: true,
        req,
      })
      validatePersistedMedia({ document, record, siteID })
    }

    if (action === 'created') summary.created += 1
    else summary.reused += 1
    summary.verified += 1
    summary.records.push({
      action,
      filename: document?.filename || record.importFilename,
      id: document?.id || record.sourceIdentity,
      sourceDimensions: record.sourceDimensions,
      sourceIdentity: record.sourceIdentity,
    })
  }

  return summary
}

export const applyWingsGroupV3MediaWithRecovery = async ({
  assetsDirectory,
  backupPath,
  databasePath,
  manifest,
  mediaDirectory,
  payload,
  plan,
  preExistingUploadFiles,
  req,
  siteID,
}: {
  assetsDirectory: string
  backupPath: string
  databasePath: string
  manifest: WingsGroupV3MediaManifest
  mediaDirectory: string
  payload: Payload
  plan: WingsGroupV3MediaPlan
  preExistingUploadFiles?: ReadonlySet<string>
  req: PayloadRequest
  siteID: number | string
}): Promise<WingsGroupV3MediaImportSummary> => {
  const inventory =
    preExistingUploadFiles || (await inventoryWingsGroupV3UploadFiles(mediaDirectory))
  let payloadClosed = false
  try {
    const summary = await importWingsGroupV3Media({
      apply: true,
      assetsDirectory,
      manifest,
      payload,
      plan,
      req,
      siteID,
    })
    await payload.destroy()
    payloadClosed = true
    return summary
  } catch (error) {
    const recovery = await recoverWingsGroupV3MediaApply({
      backupPath,
      databasePath,
      mediaDirectory,
      payload: payloadClosed ? null : payload,
      preExistingUploadFiles: inventory,
    })
    throw new WingsGroupV3MediaApplyError(error, recovery)
  }
}

const main = async () => {
  const command = parseWingsGroupV3MediaCommand(process.argv.slice(2))
  const manifest = parseWingsGroupV3MediaManifest(
    JSON.parse(await fs.readFile(command.manifestPath, 'utf8')),
  )
  const plan = await buildWingsGroupV3MediaPlan({
    assetsDirectory: command.assetsDirectory,
    manifest,
  })
  assertApplicableWingsGroupV3MediaPlan(plan)

  if (!command.apply) {
    console.log(
      JSON.stringify(
        {
          dryRun: true,
          lifecycle: { apply: 'available-local-only', plan: 'verified', publication: 'pending' },
          ...plan,
        },
        null,
        2,
      ),
    )
    return
  }

  const { backupPath, databasePath } = backupLocalDatabase()
  const mediaDirectory = WINGSGROUP_V3_MEDIA_DIRECTORY
  const preExistingUploadFiles = await inventoryWingsGroupV3UploadFiles(mediaDirectory)
  let payload: Payload | undefined
  try {
    payload = await getPayload({ config: configPromise })
    const req = await createLocalReq(
      { context, user: { id: 0, role: 'super-admin' } as never },
      payload,
    )
    const site = await findExactSite(payload, req)
    if (site.code !== WINGSGROUP_V3_IMPORT_SITE_CODE) {
      throw new Error(`Resolved site is not ${WINGSGROUP_V3_IMPORT_SITE_CODE}`)
    }
    const summary = await applyWingsGroupV3MediaWithRecovery({
      assetsDirectory: command.assetsDirectory,
      backupPath,
      databasePath,
      manifest,
      mediaDirectory,
      payload,
      plan,
      preExistingUploadFiles,
      req,
      siteID: site.id,
    })
    console.log(JSON.stringify({ backupPath, dryRun: false, ...summary }, null, 2))
  } catch (error) {
    if (error instanceof WingsGroupV3MediaApplyError) {
      console.error(
        JSON.stringify(
          {
            backupPath,
            dryRun: false,
            error: errorMessage(error.originalError),
            failed: true,
            recovery: error.recovery,
          },
          null,
          2,
        ),
      )
      process.exitCode = 1
      return
    }

    const recovery = await recoverWingsGroupV3MediaApply({
      backupPath,
      databasePath,
      mediaDirectory,
      payload,
      preExistingUploadFiles,
    })
    console.error(
      JSON.stringify(
        {
          backupPath,
          dryRun: false,
          error: errorMessage(error),
          failed: true,
          recovery,
        },
        null,
        2,
      ),
    )
    process.exitCode = 1
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
