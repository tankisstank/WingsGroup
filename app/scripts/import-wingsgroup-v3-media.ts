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
import {
  commitTransaction,
  createLocalReq,
  getPayload,
  initTransaction,
  type Payload,
  type PayloadRequest,
  type Where,
} from 'payload'

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

const TRANSACTION_UNSUPPORTED_MESSAGE =
  'WingsGroup v3 media apply requires an isolated Payload database transaction; refusing mutation because this adapter or request cannot guarantee transaction isolation.'

type WingsGroupV3MediaDocument = Record<string, unknown>

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const returnedUploadFilenames = (document: WingsGroupV3MediaDocument): string[] => {
  const filenames = new Set<string>()
  if (typeof document.filename === 'string') filenames.add(document.filename)
  const sizes = isRecord(document.sizes) ? document.sizes : null
  for (const size of Object.values(sizes || {})) {
    if (isRecord(size) && typeof size.filename === 'string') filenames.add(size.filename)
  }
  return [...filenames]
}

const resolveRunOwnedUploadFile = (mediaDirectory: string, filename: string): string => {
  const mediaRoot = path.resolve(mediaDirectory)
  const filePath = path.resolve(mediaRoot, filename)
  if (filePath !== mediaRoot && !filePath.startsWith(`${mediaRoot}${path.sep}`)) {
    throw new Error(
      `Payload returned an upload filename outside the governed media directory: ${filename}`,
    )
  }
  return filePath
}

const trackCreatedMediaFiles = ({
  document,
  mediaDirectory,
  runOwnedUploadFiles,
}: {
  document: WingsGroupV3MediaDocument
  mediaDirectory: string
  runOwnedUploadFiles: Set<string>
}) => {
  for (const filename of returnedUploadFilenames(document)) {
    runOwnedUploadFiles.add(resolveRunOwnedUploadFile(mediaDirectory, filename))
  }
}

export type WingsGroupV3RunOwnedUploadCleanup = {
  attempted: boolean
  errors: string[]
  removedFiles: string[]
  success: boolean
}

export const cleanupWingsGroupV3RunOwnedUploadFiles = async (
  runOwnedUploadFiles: ReadonlySet<string>,
): Promise<WingsGroupV3RunOwnedUploadCleanup> => {
  const errors: string[] = []
  const removedFiles: string[] = []
  for (const uploadFile of runOwnedUploadFiles) {
    try {
      await fs.rm(uploadFile, { force: true })
      removedFiles.push(uploadFile)
    } catch (error) {
      errors.push(`Upload cleanup failed for ${uploadFile}: ${errorMessage(error)}`)
    }
  }
  return {
    attempted: true,
    errors,
    removedFiles,
    success: errors.length === 0,
  }
}

type WingsGroupV3TransactionStatus =
  | 'not-started'
  | 'unsupported'
  | 'active'
  | 'rolled-back'
  | 'rollback-failed'
  | 'committed'

export type WingsGroupV3TransactionRollback = {
  attempted: boolean
  error?: string
  status: WingsGroupV3TransactionStatus
  succeeded: boolean
}

export type WingsGroupV3MediaRecoveryReport = {
  backupPath: string
  databasePath: string
  errors: string[]
  manualRecoveryRequired: boolean
  payloadClosed: boolean
  runOwnedFileCleanup: WingsGroupV3RunOwnedUploadCleanup
  success: boolean
  transactionRollback: WingsGroupV3TransactionRollback
}

const rollbackWingsGroupV3Transaction = async ({
  payload,
  req,
}: {
  payload: Payload
  req?: PayloadRequest
}): Promise<WingsGroupV3TransactionRollback> => {
  const transactionID = await req?.transactionID
  if (!transactionID) {
    return {
      attempted: true,
      error: 'Transaction ID was unavailable while rollback was required.',
      status: 'rollback-failed',
      succeeded: false,
    }
  }
  try {
    await payload.db.rollbackTransaction(transactionID)
    if (req) delete req.transactionID
    return { attempted: true, status: 'rolled-back', succeeded: true }
  } catch (error) {
    if (req) delete req.transactionID
    return {
      attempted: true,
      error: errorMessage(error),
      status: 'rollback-failed',
      succeeded: false,
    }
  }
}

export const recoverWingsGroupV3MediaApply = async ({
  backupPath,
  databasePath,
  payload,
  req,
  runOwnedUploadFiles,
  transactionStatus,
  trackingErrors = [],
}: {
  backupPath: string
  databasePath: string
  payload?: Pick<Payload, 'destroy'> | null
  req?: PayloadRequest
  runOwnedUploadFiles: ReadonlySet<string>
  transactionStatus: WingsGroupV3TransactionStatus
  trackingErrors?: string[]
}): Promise<WingsGroupV3MediaRecoveryReport> => {
  const errors = [...trackingErrors]
  const transactionRollback =
    transactionStatus === 'active'
      ? await rollbackWingsGroupV3Transaction({ payload: payload as Payload, req })
      : {
          attempted: false,
          status: transactionStatus,
          succeeded: transactionStatus === 'unsupported' || transactionStatus === 'not-started',
        }
  if (transactionRollback.error) {
    errors.push(`Transaction rollback failed: ${transactionRollback.error}`)
  }

  const rollbackAllowsCleanup = transactionRollback.status === 'rolled-back'
  const runOwnedFileCleanup = rollbackAllowsCleanup
    ? await cleanupWingsGroupV3RunOwnedUploadFiles(runOwnedUploadFiles)
    : {
        attempted: false,
        errors: [
          'Run-owned upload cleanup was skipped because transaction rollback did not succeed.',
        ],
        removedFiles: [],
        success: false,
      }
  errors.push(...runOwnedFileCleanup.errors)

  let payloadClosed = true
  if (payload) {
    try {
      await payload.destroy()
    } catch (error) {
      payloadClosed = false
      errors.push(`Payload close failed: ${errorMessage(error)}`)
    }
  }

  const manualRecoveryRequired =
    transactionRollback.status === 'rollback-failed' ||
    transactionRollback.status === 'committed' ||
    (transactionRollback.status !== 'unsupported' &&
      transactionRollback.status !== 'not-started' &&
      !runOwnedFileCleanup.success) ||
    trackingErrors.length > 0 ||
    !payloadClosed
  return {
    backupPath,
    databasePath,
    errors,
    manualRecoveryRequired,
    payloadClosed,
    runOwnedFileCleanup,
    success:
      transactionRollback.status === 'rolled-back' &&
      transactionRollback.succeeded &&
      runOwnedFileCleanup.success &&
      payloadClosed &&
      errors.length === 0,
    transactionRollback,
  }
}

export class WingsGroupV3MediaApplyError extends Error {
  readonly originalError: unknown
  readonly recovery: WingsGroupV3MediaRecoveryReport

  constructor(originalError: unknown, recovery: WingsGroupV3MediaRecoveryReport) {
    super(
      `WingsGroup v3 media apply failed: ${errorMessage(originalError)} Transaction rollback ${
        recovery.transactionRollback.status
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
  onCreatedDocument,
  payload,
  plan,
  req,
  siteID,
}: {
  apply: boolean
  assetsDirectory: string
  manifest: WingsGroupV3MediaManifest
  onCreatedDocument?: (document: WingsGroupV3MediaDocument) => void
  payload: Payload
  plan: WingsGroupV3MediaPlan
  req: PayloadRequest
  siteID: number | string
}): Promise<WingsGroupV3MediaImportSummary> => {
  if (apply && !req.transactionID) throw new Error(TRANSACTION_UNSUPPORTED_MESSAGE)

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
        onCreatedDocument?.(document as unknown as WingsGroupV3MediaDocument)
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
  req: PayloadRequest
  siteID: number | string
}): Promise<WingsGroupV3MediaImportSummary> => {
  const runOwnedUploadFiles = new Set<string>()
  const trackingErrors: string[] = []
  let transactionStatus: WingsGroupV3TransactionStatus = 'not-started'
  try {
    const db = payload.db as typeof payload.db & {
      beginTransaction?: unknown
      commitTransaction?: unknown
      rollbackTransaction?: unknown
    }
    if (
      typeof db.beginTransaction !== 'function' ||
      typeof db.commitTransaction !== 'function' ||
      typeof db.rollbackTransaction !== 'function'
    ) {
      transactionStatus = 'unsupported'
      throw new Error(TRANSACTION_UNSUPPORTED_MESSAGE)
    }
    const transactionStarted = await initTransaction(req)
    if (!transactionStarted || !req.transactionID) {
      transactionStatus = 'unsupported'
      throw new Error(TRANSACTION_UNSUPPORTED_MESSAGE)
    }
    transactionStatus = 'active'
    const summary = await importWingsGroupV3Media({
      apply: true,
      assetsDirectory,
      manifest,
      onCreatedDocument: (document) => {
        try {
          trackCreatedMediaFiles({ document, mediaDirectory, runOwnedUploadFiles })
        } catch (error) {
          trackingErrors.push(errorMessage(error))
          throw error
        }
      },
      payload,
      plan,
      req,
      siteID,
    })
    await commitTransaction(req)
    transactionStatus = 'committed'
    await payload.destroy()
    return summary
  } catch (error) {
    const recovery = await recoverWingsGroupV3MediaApply({
      backupPath,
      databasePath,
      payload,
      req,
      runOwnedUploadFiles,
      trackingErrors,
      transactionStatus,
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
  let payload: Payload | undefined
  let req: PayloadRequest | undefined
  try {
    payload = await getPayload({ config: configPromise })
    req = await createLocalReq({ context, user: { id: 0, role: 'super-admin' } as never }, payload)
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
      payload,
      req,
      runOwnedUploadFiles: new Set(),
      transactionStatus: 'not-started',
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
