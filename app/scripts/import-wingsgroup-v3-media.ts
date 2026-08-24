/**
 * Import the governed WingsGroup v3 development media set.
 *
 * The default command is a checksum/dimension plan. Applying is deliberately
 * explicit and is restricted to the local SQLite bootstrap for the exact
 * wings-group tenant. Production publication remains a separate governance
 * transition and is never performed by this importer.
 */
import 'dotenv/config'

import { createHash } from 'node:crypto'
import configPromise from '@payload-config'
import fs from 'node:fs/promises'
import fsSync from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
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
import {
  createWingsGroupV3ProductionPublishContext,
  getWingsGroupV3DerivativeSizeName,
  WINGSGROUP_V3_DERIVATIVE_IMAGE_SIZES,
} from '../src/fields/wingsGroupV3'
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
export const WINGSGROUP_V3_PRODUCTION_CONFIRMATION_PREFIX =
  'CONFIRM_WINGSGROUP_V3_PRODUCTION_MEDIA_WRITE'
export const WINGSGROUP_V3_PRODUCTION_PUBLICATION_CONFIRMATION_PREFIX =
  'CONFIRM_WINGSGROUP_V3_PRODUCTION_MEDIA_PUBLICATION'
const WINGSGROUP_V3_EXPECTED_MEDIA_COUNT = 13
const WINGSGROUP_V3_EXPECTED_DERIVATIVE_COUNT = 78

type WingsGroupV3MediaPhase =
  | 'plan'
  | 'apply'
  | 'production-apply'
  | 'production-publish'
  | 'production-verify'

type WingsGroupV3ProductionEvidence = Record<string, unknown>

type WingsGroupV3ProductionGateIO = Pick<typeof fsSync, 'existsSync' | 'readFileSync'>

export type WingsGroupV3ProductionApplyArgs = {
  archiveSha256?: string
  backupEvidencePath?: string
  backupEvidenceSha256?: string
  confirm?: string
  operationID?: string
  planSha256?: string
  publishConfirm?: string
  releaseSha?: string
  restoreEvidencePath?: string
  restoreEvidenceSha256?: string
  siteCode?: string
}

type WingsGroupV3ProductionEnvironment = Partial<Record<string, string | undefined>>

const sha256 = (value: Buffer | string): string => createHash('sha256').update(value).digest('hex')

const trustedSha256 = (value: string | undefined, label: string): string => {
  if (!value || !/^[0-9a-f]{64}$/u.test(value)) {
    throw new Error(`Production media gate requires ${label} as a lowercase SHA-256`)
  }
  return value
}

const productionOperationID = (value: string | undefined): string => {
  if (!value || !/^[a-z0-9][a-z0-9._-]{15,127}$/u.test(value)) {
    throw new Error('Production media gate requires a fresh operation ID')
  }
  return value
}

const readProductionEvidence = (
  evidencePath: string | undefined,
  label: string,
  io: WingsGroupV3ProductionGateIO,
): WingsGroupV3ProductionEvidence => {
  if (!evidencePath || !io.existsSync(evidencePath)) {
    throw new Error(`Production media gate requires ${label}`)
  }
  try {
    const parsed = JSON.parse(io.readFileSync(evidencePath, 'utf8'))
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('object')
    return parsed as WingsGroupV3ProductionEvidence
  } catch {
    throw new Error(`Production media gate requires valid ${label}`)
  }
}

const assertEvidenceBinding = ({
  evidence,
  label,
  operationID,
  databaseHost,
  databaseName,
  releaseSha,
  archiveSha256,
  planSha256,
}: {
  evidence: WingsGroupV3ProductionEvidence
  label: string
  operationID: string
  databaseHost: string
  databaseName: string
  releaseSha: string
  archiveSha256: string
  planSha256: string
}) => {
  const binding = {
    operationID,
    databaseHost,
    databaseName,
    releaseSha,
    archiveSha256,
    planSha256,
  }
  for (const [key, expected] of Object.entries(binding)) {
    if (evidence[key] !== expected) {
      throw new Error(`Production media gate ${label} binding mismatch`)
    }
  }
}

const parseProductionDatabaseURL = (environment: WingsGroupV3ProductionEnvironment): URL => {
  if (!environment.DATABASE_URL) {
    throw new Error('Production media gate requires DATABASE_URL')
  }
  let databaseURL: URL
  try {
    databaseURL = new URL(environment.DATABASE_URL)
  } catch {
    throw new Error('Production media gate requires a valid DATABASE_URL')
  }
  if (!['postgres:', 'postgresql:'].includes(databaseURL.protocol)) {
    throw new Error('Production media gate requires PostgreSQL DATABASE_URL')
  }
  if (
    databaseURL.search ||
    databaseURL.hash ||
    !/^\/[A-Za-z0-9_][A-Za-z0-9_$.-]*$/u.test(databaseURL.pathname)
  ) {
    throw new Error('Production media gate requires an exact nonempty PostgreSQL database path')
  }
  return databaseURL
}

export const assertWingsGroupV3ProductionMediaGate = ({
  args,
  manifest,
  phase,
  plan,
  env = process.env,
  io = fsSync,
}: {
  args: WingsGroupV3ProductionApplyArgs
  manifest: WingsGroupV3MediaManifest
  phase: 'apply' | 'verify' | 'publish'
  plan: WingsGroupV3MediaPlan
  env?: WingsGroupV3ProductionEnvironment
  io?: WingsGroupV3ProductionGateIO
}) => {
  const derivativeCount = plan.records.reduce(
    (total, record) => total + record.derivatives.length,
    0,
  )
  if (
    plan.errors.length > 0 ||
    plan.planned !== WINGSGROUP_V3_EXPECTED_MEDIA_COUNT ||
    plan.records.length !== WINGSGROUP_V3_EXPECTED_MEDIA_COUNT ||
    derivativeCount !== WINGSGROUP_V3_EXPECTED_DERIVATIVE_COUNT
  ) {
    throw new Error('Production media gate requires the complete 13-source/78-derivative plan')
  }
  if (args.siteCode !== WINGSGROUP_V3_IMPORT_SITE_CODE) {
    throw new Error('Production media gate requires --site-code=wings-group')
  }
  if (env.WINGSGROUP_V3_PRODUCTION_SITE_CODE !== WINGSGROUP_V3_IMPORT_SITE_CODE) {
    throw new Error('Production media gate requires the trusted WingsGroup site scope')
  }
  if (env.NODE_ENV !== 'production') {
    throw new Error('Production media gate requires NODE_ENV=production')
  }
  if (env.PAYLOAD_DB_PUSH !== 'false') {
    throw new Error('Production media gate requires PAYLOAD_DB_PUSH=false')
  }
  if (env.WINGSGROUP_V3_PRODUCTION_ALLOW !== 'production') {
    throw new Error('Production media gate requires the trusted production target marker')
  }

  const databaseURL = parseProductionDatabaseURL(env)
  const databaseName = databaseURL.pathname.replace(/^\//u, '')
  if (!databaseName || !env.WINGSGROUP_V3_PRODUCTION_DATABASE_NAME) {
    throw new Error('Production media gate requires an exact nonempty database-name binding')
  }
  if (databaseURL.hostname !== 'postgres') {
    throw new Error('Production media gate requires the trusted postgres target')
  }
  if (env.WINGSGROUP_V3_PRODUCTION_DATABASE_HOST !== databaseURL.hostname) {
    throw new Error('Production media gate database target binding mismatch')
  }
  if (env.WINGSGROUP_V3_PRODUCTION_DATABASE_NAME !== databaseName) {
    throw new Error('Production media gate database target binding mismatch')
  }

  const archiveSha256 = trustedSha256(args.archiveSha256, '--archive-sha256')
  if (
    archiveSha256 !== manifest.sourcePackage.archiveSha256 ||
    env.WINGSGROUP_V3_MEDIA_ARCHIVE_SHA256 !== archiveSha256
  ) {
    throw new Error('Production media gate archive checksum binding mismatch')
  }
  const planSha256 = trustedSha256(args.planSha256, '--plan-sha256')
  if (planSha256 !== plan.planChecksum || env.WINGSGROUP_V3_MEDIA_PLAN_SHA256 !== planSha256) {
    throw new Error('Production media gate plan checksum binding mismatch')
  }

  if (!args.releaseSha || !/^[0-9a-f]{40}$/u.test(args.releaseSha)) {
    throw new Error('Production media gate requires a full lowercase --release-sha')
  }
  if (
    env.WINGSTRAVEL_RELEASE_SHA !== args.releaseSha ||
    env.WINGSGROUP_V3_PRODUCTION_RELEASE_SHA !== args.releaseSha
  ) {
    throw new Error('Production media gate release SHA binding mismatch')
  }
  const operationID = productionOperationID(args.operationID)
  if (env.WINGSGROUP_V3_PRODUCTION_OPERATION_ID !== operationID) {
    throw new Error('Production media gate operation binding mismatch')
  }

  if (phase === 'verify') {
    return {
      archiveSha256,
      databaseHost: databaseURL.hostname,
      databaseName,
      operationID,
      planSha256,
      releaseSha: args.releaseSha,
    }
  }

  const expectedConfirmation = `${WINGSGROUP_V3_PRODUCTION_CONFIRMATION_PREFIX}:${operationID}`
  if (
    args.confirm !== expectedConfirmation ||
    env.WINGSGROUP_V3_PRODUCTION_CONFIRMATION_TOKEN !== expectedConfirmation
  ) {
    throw new Error('Production media gate requires the operation-bound confirmation token')
  }

  if (phase === 'publish') {
    const expectedPublicationConfirmation = `${WINGSGROUP_V3_PRODUCTION_PUBLICATION_CONFIRMATION_PREFIX}:${operationID}`
    if (
      args.publishConfirm !== expectedPublicationConfirmation ||
      env.WINGSGROUP_V3_PRODUCTION_PUBLICATION_CONFIRMATION_TOKEN !==
        expectedPublicationConfirmation
    ) {
      throw new Error('Production media gate requires the operation-bound publication confirmation')
    }
  }

  const backupEvidenceSha256 = trustedSha256(args.backupEvidenceSha256, '--backup-evidence-sha256')
  if (env.WINGSGROUP_V3_PRODUCTION_BACKUP_EVIDENCE_SHA256 !== backupEvidenceSha256) {
    throw new Error('Production media gate backup evidence checksum binding mismatch')
  }
  if (!args.backupEvidencePath || !io.existsSync(args.backupEvidencePath)) {
    throw new Error('Production media gate requires encrypted backup evidence')
  }
  if (sha256(io.readFileSync(args.backupEvidencePath)) !== backupEvidenceSha256) {
    throw new Error('Production media gate backup evidence checksum mismatch')
  }
  const restoreEvidenceSha256 = trustedSha256(
    args.restoreEvidenceSha256,
    '--restore-evidence-sha256',
  )
  if (env.WINGSGROUP_V3_PRODUCTION_RESTORE_EVIDENCE_SHA256 !== restoreEvidenceSha256) {
    throw new Error('Production media gate restore evidence checksum binding mismatch')
  }
  if (!args.restoreEvidencePath || !io.existsSync(args.restoreEvidencePath)) {
    throw new Error('Production media gate requires disposable restore evidence')
  }
  if (sha256(io.readFileSync(args.restoreEvidencePath)) !== restoreEvidenceSha256) {
    throw new Error('Production media gate restore evidence checksum mismatch')
  }

  const backupEvidence = readProductionEvidence(
    args.backupEvidencePath,
    'encrypted backup evidence',
    io,
  )
  if (
    backupEvidence.status !== 'verified' ||
    backupEvidence.encrypted !== true ||
    backupEvidence.format !== 'postgres-custom'
  ) {
    throw new Error('Production media gate encrypted backup evidence is not verified')
  }
  assertEvidenceBinding({
    archiveSha256,
    databaseHost: databaseURL.hostname,
    databaseName,
    evidence: backupEvidence,
    label: 'encrypted backup evidence',
    operationID,
    planSha256,
    releaseSha: args.releaseSha,
  })
  const backupSha256 = trustedSha256(
    String(backupEvidence.backupSha256 || ''),
    'backup evidence backup SHA-256',
  )

  const restoreEvidence = readProductionEvidence(
    args.restoreEvidencePath,
    'disposable restore evidence',
    io,
  )
  if (restoreEvidence.status !== 'verified' || restoreEvidence.disposableRestore !== true) {
    throw new Error('Production media gate disposable restore evidence is not verified')
  }
  assertEvidenceBinding({
    archiveSha256,
    databaseHost: databaseURL.hostname,
    databaseName,
    evidence: restoreEvidence,
    label: 'disposable restore evidence',
    operationID,
    planSha256,
    releaseSha: args.releaseSha,
  })
  if (
    restoreEvidence.backupSha256 !== backupSha256 ||
    typeof restoreEvidence.targetDatabase !== 'string' ||
    restoreEvidence.targetDatabase === databaseName ||
    backupEvidence.restoreEvidenceSha256 !== restoreEvidenceSha256
  ) {
    throw new Error('Production media gate backup and restore evidence are not bound')
  }

  return {
    archiveSha256,
    backupEvidenceSha256,
    backupSha256,
    databaseHost: databaseURL.hostname,
    databaseName,
    operationID,
    planSha256,
    releaseSha: args.releaseSha,
    restoreEvidenceSha256,
  }
}

export const initializeWingsGroupV3ProductionWriter = async <T>({
  args,
  env = process.env,
  initialize,
  io = fsSync,
  manifest,
  plan,
}: {
  args: WingsGroupV3ProductionApplyArgs
  env?: WingsGroupV3ProductionEnvironment
  initialize: (binding: Record<string, string | undefined>) => Promise<T>
  io?: WingsGroupV3ProductionGateIO
  manifest: WingsGroupV3MediaManifest
  plan: WingsGroupV3MediaPlan
}) => {
  const binding = assertWingsGroupV3ProductionMediaGate({
    args,
    env,
    io,
    manifest,
    phase: 'apply',
    plan,
  })
  return initialize(binding)
}

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

const argumentValue = (argv: string[], name: string): string | undefined => {
  const inline = argv.find((argument) => argument.startsWith(`${name}=`))
  if (inline) return inline.slice(name.length + 1)
  const index = argv.indexOf(name)
  return index >= 0 ? argv[index + 1] : undefined
}

export const parseWingsGroupV3MediaCommand = (argv: string[]) => {
  const positionalValue = argv.find((argument) => !argument.startsWith('--')) || 'plan'
  if (
    !['plan', 'apply', 'production-apply', 'production-publish', 'production-verify'].includes(
      positionalValue,
    )
  ) {
    throw new Error(
      'WingsGroup v3 media supports only plan, local apply, production-apply, production-verify, and production-publish; rollback is backup/restore only.',
    )
  }
  if (argv.includes('--verify') || argv.includes('--rollback')) {
    throw new Error(
      'WingsGroup v3 media does not support generic verify/rollback; use production-verify and the governed backup/restore procedure.',
    )
  }
  const positional = positionalValue as WingsGroupV3MediaPhase
  const manifest = argumentValue(argv, '--manifest')
  const assetsDirectory = argumentValue(argv, '--assets-dir')
  if (!manifest) throw new Error('--manifest is required.')
  if (!assetsDirectory) throw new Error('--assets-dir is required.')
  const apply =
    positional === 'apply' ||
    positional === 'production-apply' ||
    positional === 'production-publish' ||
    argv.includes('--apply')
  const production =
    positional === 'production-apply' ||
    positional === 'production-publish' ||
    positional === 'production-verify'
  const siteCode = argumentValue(argv, '--site-code')
  if (apply && siteCode !== WINGSGROUP_V3_IMPORT_SITE_CODE) {
    throw new Error(`Apply requires --site-code=${WINGSGROUP_V3_IMPORT_SITE_CODE}`)
  }
  return {
    apply,
    assetsDirectory: path.resolve(assetsDirectory),
    archiveSha256: argumentValue(argv, '--archive-sha256'),
    backupEvidencePath: argumentValue(argv, '--backup-evidence'),
    backupEvidenceSha256: argumentValue(argv, '--backup-evidence-sha256'),
    confirm: argumentValue(argv, '--confirm'),
    manifestPath: path.resolve(manifest),
    operationID: argumentValue(argv, '--operation-id'),
    phase: positional,
    planSha256: argumentValue(argv, '--plan-sha256'),
    publishConfirm: argumentValue(argv, '--publish-confirm'),
    production,
    releaseSha: argumentValue(argv, '--release-sha'),
    restoreEvidencePath: argumentValue(argv, '--restore-evidence'),
    restoreEvidenceSha256: argumentValue(argv, '--restore-evidence-sha256'),
    siteCode,
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

const returnedUploadFilenames = (document: unknown): string[] => {
  const persisted = isRecord(document) ? document : {}
  const filenames = new Set<string>()
  if (typeof persisted.filename === 'string') filenames.add(persisted.filename)
  const sizes = isRecord(persisted.sizes) ? persisted.sizes : null
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

type WingsGroupV3DerivativeLedgerEntry = {
  format: 'avif' | 'webp'
  height: number
  sha256: string
  url: string
  width: number
}

const normalizeWingsGroupV3PublicOrigin = (value: string): string => {
  let origin: URL
  try {
    origin = new URL(value)
  } catch {
    throw new Error(`WingsGroup public origin is invalid: ${value}`)
  }
  if (origin.protocol !== 'https:' || origin.pathname !== '/' || origin.search || origin.hash) {
    throw new Error('WingsGroup derivative URLs require an HTTPS origin without a path')
  }
  return origin.origin
}

const resolveFlatGovernedDerivative = (mediaDirectory: string, filename: string): string => {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*\.(?:avif|webp)$/u.test(filename)) {
    throw new Error(
      `WingsGroup derivative filename is not a safe flat Payload filename: ${filename}`,
    )
  }
  return resolveRunOwnedUploadFile(mediaDirectory, filename)
}

export const validateWingsGroupV3DerivativeLedger = async ({
  document,
  mediaDirectory,
  publicOrigin,
  record,
}: {
  document: unknown
  mediaDirectory: string
  publicOrigin: string
  record: WingsGroupV3MediaPlanItem
}): Promise<WingsGroupV3DerivativeLedgerEntry[]> => {
  const persisted = isRecord(document) ? document : {}
  const sizes = isRecord(persisted.sizes) ? persisted.sizes : {}
  const origin = normalizeWingsGroupV3PublicOrigin(publicOrigin)
  if (record.derivatives.length !== WINGSGROUP_V3_DERIVATIVE_IMAGE_SIZES.length) {
    throw new Error(`Media ${record.sourceFile} does not have the complete six-derivative plan`)
  }

  const ledger = [] as WingsGroupV3DerivativeLedgerEntry[]
  for (const derivative of record.derivatives) {
    const sizeName = getWingsGroupV3DerivativeSizeName(derivative.format, derivative.width)
    const size = sizeName && isRecord(sizes[sizeName]) ? sizes[sizeName] : null
    if (!sizeName || !size) {
      throw new Error(
        `Media ${record.sourceFile} is missing Payload size ${derivative.format}/${derivative.width}`,
      )
    }
    if (size.filename !== derivative.file) {
      throw new Error(
        `Media ${record.sourceFile} Payload filename does not match the governed plan`,
      )
    }
    if (size.width !== derivative.width || typeof size.height !== 'number' || size.height < 1) {
      throw new Error(
        `Media ${record.sourceFile} Payload dimensions do not match the governed derivative`,
      )
    }
    if (size.mimeType !== `image/${derivative.format}`) {
      throw new Error(
        `Media ${record.sourceFile} Payload MIME type does not match the governed derivative`,
      )
    }

    const filePath = resolveFlatGovernedDerivative(mediaDirectory, derivative.file)
    const fileBytes = await fs.readFile(filePath)
    let metadata: sharp.Metadata
    try {
      metadata = await sharp(fileBytes).metadata()
    } catch (error) {
      throw new Error(
        `Media ${record.sourceFile} derivative ${derivative.file} cannot be decoded: ${errorMessage(error)}`,
      )
    }
    const detectedFormat =
      metadata.format === 'heif' && metadata.compression === 'av1' ? 'avif' : metadata.format
    if (
      detectedFormat !== derivative.format ||
      metadata.width !== derivative.width ||
      metadata.height !== size.height
    ) {
      throw new Error(
        `Media ${record.sourceFile} derivative ${derivative.file} decoded metadata does not match the governed derivative`,
      )
    }
    const fileSha256 = sha256(fileBytes)
    const url = `${origin}/media/${derivative.file}`
    ledger.push({
      format: derivative.format,
      height: size.height,
      sha256: fileSha256,
      url,
      width: derivative.width,
    })
  }

  const persistedGovernance = isRecord(persisted.governance) ? persisted.governance : {}
  const persistedLedger = Array.isArray(persistedGovernance.responsiveDerivatives)
    ? persistedGovernance.responsiveDerivatives
    : []
  const comparableLedger = (entries: unknown[]) =>
    entries.map((entry) => {
      const value = isRecord(entry) ? entry : {}
      return {
        format: value.format,
        height: value.height,
        sha256: value.sha256,
        url: value.url,
        width: value.width,
      }
    })
  if (
    persistedLedger.length > 0 &&
    JSON.stringify(comparableLedger(persistedLedger)) !== JSON.stringify(comparableLedger(ledger))
  ) {
    throw new Error(
      `Media ${record.sourceFile} persisted derivative ledger does not match the physical files`,
    )
  }
  return ledger
}

const trackCreatedMediaFiles = ({
  document,
  mediaDirectory,
  runOwnedUploadFiles,
}: {
  document: unknown
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
  locale,
  payload,
  req,
  siteID,
  sourceIdentity,
}: {
  locale?: 'en' | 'vi'
  payload: Payload
  req: PayloadRequest
  siteID: number | string
  sourceIdentity: string
}) => {
  const scoped = await payload.find({
    collection: 'media',
    depth: 0,
    limit: 2,
    ...(locale ? { locale, fallbackLocale: false } : {}),
    overrideAccess: true,
    pagination: false,
    req: { ...req, payloadDataLoader: undefined },
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
    ...(locale ? { locale, fallbackLocale: false } : {}),
    overrideAccess: true,
    pagination: false,
    req: { ...req, payloadDataLoader: undefined },
    where: { 'governance.sourceIdentity': { equals: sourceIdentity } },
  })
  for (const document of global.docs) {
    const documentSiteID = relationID(document.site)
    if (documentSiteID === undefined || String(documentSiteID) !== String(siteID)) {
      throw new Error(
        `Refusing to reuse WingsGroup media source identity across tenants: ${sourceIdentity}`,
      )
    }
  }
  return scoped.docs[0] || null
}

const validatePersistedMedia = ({
  document,
  expectedSourceArchiveSha256,
  expectedSourceAttachmentId,
  expectedGovernance,
  expectedAlt,
  record,
  siteID,
}: {
  document: unknown
  expectedGovernance: ReturnType<typeof buildWingsGroupV3MediaGovernance>
  expectedAlt?: string
  expectedSourceArchiveSha256: string
  expectedSourceAttachmentId: string
  record: WingsGroupV3MediaPlanItem
  siteID: number | string
}) => {
  const persisted = isRecord(document) ? document : {}
  if (String(relationID(persisted.site)) !== String(siteID)) {
    throw new Error(`Media ${record.sourceFile} is not scoped to ${WINGSGROUP_V3_IMPORT_SITE_CODE}`)
  }
  if (
    persisted.width !== record.sourceDimensions.width ||
    persisted.height !== record.sourceDimensions.height
  ) {
    throw new Error(
      `Media ${record.sourceFile} persisted dimensions ${persisted.width}x${persisted.height} do not match ${record.sourceDimensions.width}x${record.sourceDimensions.height}`,
    )
  }
  const governance = isRecord(persisted.governance) ? persisted.governance : {}
  if (expectedAlt !== undefined && persisted.alt !== expectedAlt) {
    throw new Error(
      `Media ${record.sourceFile} persisted localized alt does not match the handoff.`,
    )
  }
  const expectedGovernanceFields = Object.fromEntries(
    Object.entries({
      ...expectedGovernance,
      sourceArchiveSha256: expectedSourceArchiveSha256,
      sourceAttachmentId: expectedSourceAttachmentId,
    }).filter(
      ([field]) =>
        !['derivativeState', 'publicationState', 'responsiveDerivatives'].includes(field),
    ),
  )
  for (const [field, expected] of Object.entries(expectedGovernanceFields)) {
    if (JSON.stringify(governance[field]) !== JSON.stringify(expected)) {
      throw new Error(
        `Media ${record.sourceFile} persisted governance ${field} does not match the handoff.`,
      )
    }
  }
}

export const persistAndVerifyWingsGroupV3LocalizedAlts = async ({
  manifest,
  payload,
  record,
  req,
  siteID,
  mediaID,
}: {
  manifest: WingsGroupV3MediaManifest
  payload: Payload
  record: WingsGroupV3MediaPlanItem
  req: PayloadRequest
  siteID: number | string
  mediaID: number | string
}) => {
  const updatedDocuments = new Map<'en' | 'vi', unknown>()
  for (const locale of ['vi', 'en'] as const) {
    const updated = await payload.update({
      collection: 'media',
      context,
      data: { alt: record.alt[locale] } as never,
      id: mediaID,
      locale,
      overrideAccess: true,
      req,
    })
    updatedDocuments.set(locale, updated)
  }

  for (const locale of ['vi', 'en'] as const) {
    const found = await findMediaBySourceIdentity({
      locale,
      payload,
      req,
      siteID,
      sourceIdentity: record.sourceIdentity,
    })
    const localized = found || updatedDocuments.get(locale)
    if (!localized || String(relationID(localized.id)) !== String(mediaID)) {
      throw new Error(
        `Media ${record.sourceFile} is missing from the WingsGroup ${locale} locale scope`,
      )
    }
    const localizedAlt = isRecord(localized.alt) ? localized.alt[locale] : localized.alt
    validatePersistedMedia({
      document: { ...localized, alt: localizedAlt },
      expectedSourceArchiveSha256: manifest.sourcePackage.archiveSha256,
      expectedSourceAttachmentId: manifest.sourcePackage.attachmentId,
      expectedGovernance: buildWingsGroupV3MediaGovernance({ manifest, record }),
      expectedAlt: record.alt[locale],
      record,
      siteID,
    })
  }
}

export const importWingsGroupV3Media = async ({
  apply,
  assetsDirectory,
  manifest,
  onCreatedDocument,
  payload,
  plan,
  mediaDirectory,
  publicOrigin,
  requirePhysicalDerivatives = true,
  req,
  siteID,
}: {
  apply: boolean
  assetsDirectory: string
  manifest: WingsGroupV3MediaManifest
  onCreatedDocument?: (document: WingsGroupV3MediaDocument) => void
  payload: Payload
  plan: WingsGroupV3MediaPlan
  mediaDirectory?: string
  publicOrigin?: string
  requirePhysicalDerivatives?: boolean
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
    } else {
      validatePersistedMedia({
        document,
        expectedSourceArchiveSha256: manifest.sourcePackage.archiveSha256,
        expectedSourceAttachmentId: manifest.sourcePackage.attachmentId,
        expectedGovernance: buildWingsGroupV3MediaGovernance({ manifest, record }),
        record,
        siteID,
      })
      const persistedGovernance = isRecord(document.governance) ? document.governance : {}
      if (
        persistedGovernance.publicationState === 'published' ||
        !['pending', 'generated'].includes(String(persistedGovernance.derivativeState))
      ) {
        throw new Error(`Media ${record.sourceFile} has non-retryable governed publication state`)
      }
      if (apply) {
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
    }

    if (apply && document) {
      await persistAndVerifyWingsGroupV3LocalizedAlts({
        manifest,
        mediaID: document.id,
        payload,
        record,
        req,
        siteID,
      })
      if (requirePhysicalDerivatives) {
        if (!mediaDirectory || !publicOrigin) {
          throw new Error(
            'WingsGroup derivative validation requires media directory and public origin',
          )
        }
        const ledger = await validateWingsGroupV3DerivativeLedger({
          document,
          mediaDirectory,
          publicOrigin,
          record,
        })
        document = await payload.update({
          collection: 'media',
          context,
          data: {
            governance: {
              ...buildWingsGroupV3MediaGovernance({ manifest, record }),
              derivativeState: 'generated',
              responsiveDerivatives: ledger,
            },
          } as never,
          id: document.id,
          locale: 'vi',
          overrideAccess: true,
          req,
        })
      }
      validatePersistedMedia({
        document,
        expectedSourceArchiveSha256: manifest.sourcePackage.archiveSha256,
        expectedSourceAttachmentId: manifest.sourcePackage.attachmentId,
        expectedGovernance: buildWingsGroupV3MediaGovernance({ manifest, record }),
        record,
        siteID,
      })
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

export const verifyWingsGroupV3Media = async ({
  expectedPublicationState = 'pending',
  manifest,
  mediaDirectory,
  payload,
  plan,
  publicOrigin,
  requirePhysicalDerivatives = false,
  req,
  siteID,
}: {
  expectedPublicationState?: 'pending' | 'published'
  manifest: WingsGroupV3MediaManifest
  mediaDirectory?: string
  payload: Payload
  plan: WingsGroupV3MediaPlan
  publicOrigin?: string
  requirePhysicalDerivatives?: boolean
  req: PayloadRequest
  siteID: number | string
}) => {
  const records = [] as Array<{
    filename: string
    id: number | string
    sourceIdentity: string
    sourceDimensions: { height: number; width: number }
  }>
  let physicalDerivativesVerified = false
  for (const record of plan.records) {
    const expectedGovernance = buildWingsGroupV3MediaGovernance({ manifest, record })
    const localizedDocuments = await Promise.all(
      (['vi', 'en'] as const).map(async (locale) => {
        const document = await findMediaBySourceIdentity({
          locale,
          payload,
          req,
          siteID,
          sourceIdentity: record.sourceIdentity,
        })
        if (!document) {
          throw new Error(
            `Media ${record.sourceFile} is missing from the WingsGroup ${locale} locale scope`,
          )
        }
        validatePersistedMedia({
          document,
          expectedSourceArchiveSha256: manifest.sourcePackage.archiveSha256,
          expectedSourceAttachmentId: manifest.sourcePackage.attachmentId,
          expectedGovernance,
          expectedAlt: record.alt[locale],
          record,
          siteID,
        })
        const governance = isRecord(document.governance) ? document.governance : {}
        if (governance.publicationState !== expectedPublicationState) {
          throw new Error(
            `Media ${record.sourceFile} persisted governance publication state is not ${expectedPublicationState}`,
          )
        }
        if (
          !requirePhysicalDerivatives &&
          !['pending', 'generated'].includes(String(governance.derivativeState))
        ) {
          throw new Error(
            `Media ${record.sourceFile} persisted governance derivative state is invalid`,
          )
        }
        const expectedDerivativeState =
          expectedPublicationState === 'published' ? 'verified' : 'generated'
        if (requirePhysicalDerivatives && governance.derivativeState !== expectedDerivativeState) {
          throw new Error(
            `Media ${record.sourceFile} is not in ${expectedDerivativeState} derivative state`,
          )
        }
        if (
          !requirePhysicalDerivatives &&
          governance.derivativeState === 'pending' &&
          Array.isArray(governance.responsiveDerivatives) &&
          governance.responsiveDerivatives.length > 0
        ) {
          throw new Error(
            `Media ${record.sourceFile} persisted governance has an unexpected pending derivative ledger`,
          )
        }
        return document
      }),
    )
    const document = localizedDocuments[0]
    if (requirePhysicalDerivatives) {
      if (!mediaDirectory || !publicOrigin) {
        throw new Error(
          'WingsGroup derivative verification requires media directory and public origin',
        )
      }
      await validateWingsGroupV3DerivativeLedger({
        document,
        mediaDirectory,
        publicOrigin,
        record,
      })
      physicalDerivativesVerified = true
    }
    records.push({
      filename: typeof document.filename === 'string' ? document.filename : record.importFilename,
      id: relationID(document.id) || record.sourceIdentity,
      sourceDimensions: record.sourceDimensions,
      sourceIdentity: record.sourceIdentity,
    })
  }
  return {
    records,
    siteCode: WINGSGROUP_V3_IMPORT_SITE_CODE,
    siteID,
    localizedAltVerified: records.length * 2,
    responsiveDerivatives: {
      planned: plan.records.reduce((total, record) => total + record.derivatives.length, 0),
      persisted: physicalDerivativesVerified
        ? plan.records.reduce((total, record) => total + record.derivatives.length, 0)
        : 0,
      state: physicalDerivativesVerified
        ? expectedPublicationState === 'published'
          ? ('verified' as const)
          : ('generated' as const)
        : ('pending' as const),
      verified: physicalDerivativesVerified,
    },
    verified: records.length,
  }
}

export const publishWingsGroupV3MediaWithRecovery = async ({
  backupPath,
  databasePath,
  manifest,
  mediaDirectory,
  operationID,
  payload,
  plan,
  publicOrigin,
  req,
  siteID,
}: {
  backupPath: string
  databasePath: string
  manifest: WingsGroupV3MediaManifest
  mediaDirectory: string
  operationID: string
  payload: Payload
  plan: WingsGroupV3MediaPlan
  publicOrigin: string
  req: PayloadRequest
  siteID: number | string
}) => {
  const runOwnedUploadFiles = new Set<string>()
  let transactionStatus: WingsGroupV3TransactionStatus = 'not-started'
  try {
    await verifyWingsGroupV3Media({
      expectedPublicationState: 'pending',
      manifest,
      mediaDirectory,
      payload,
      plan,
      publicOrigin,
      requirePhysicalDerivatives: true,
      req,
      siteID,
    })

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
    const publishContext = {
      ...context,
      ...createWingsGroupV3ProductionPublishContext(operationID),
    }

    for (const record of plan.records) {
      const document = await findMediaBySourceIdentity({
        locale: 'vi',
        payload,
        req,
        siteID,
        sourceIdentity: record.sourceIdentity,
      })
      if (!document) throw new Error(`Media ${record.sourceFile} is missing before publication`)
      const governance = isRecord(document.governance) ? document.governance : {}
      await payload.update({
        collection: 'media',
        context: publishContext,
        data: {
          alt: record.alt.vi,
          governance: {
            ...governance,
            derivativeState: 'verified',
            publicationState: 'published',
          },
        } as never,
        id: document.id,
        locale: 'vi',
        overrideAccess: true,
        req,
      })
      await persistAndVerifyWingsGroupV3LocalizedAlts({
        manifest,
        mediaID: document.id,
        payload,
        record,
        req,
        siteID,
      })
    }

    const verification = await verifyWingsGroupV3Media({
      expectedPublicationState: 'published',
      manifest,
      mediaDirectory,
      payload,
      plan,
      publicOrigin,
      requirePhysicalDerivatives: true,
      req,
      siteID,
    })
    await commitTransaction(req)
    transactionStatus = 'committed'
    await payload.destroy()
    return verification
  } catch (error) {
    const recovery = await recoverWingsGroupV3MediaApply({
      backupPath,
      databasePath,
      payload,
      req,
      runOwnedUploadFiles,
      trackingErrors: [],
      transactionStatus,
    })
    throw new WingsGroupV3MediaApplyError(error, recovery)
  }
}

export const applyWingsGroupV3MediaWithRecovery = async ({
  assetsDirectory,
  backupPath,
  databasePath,
  manifest,
  mediaDirectory,
  payload,
  plan,
  publicOrigin,
  requirePhysicalDerivatives = true,
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
  publicOrigin?: string
  requirePhysicalDerivatives?: boolean
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
      mediaDirectory,
      publicOrigin,
      requirePhysicalDerivatives,
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

  if (
    command.phase === 'production-apply' ||
    command.phase === 'production-publish' ||
    command.phase === 'production-verify'
  ) {
    const binding = assertWingsGroupV3ProductionMediaGate({
      args: command,
      manifest,
      phase:
        command.phase === 'production-apply'
          ? 'apply'
          : command.phase === 'production-publish'
            ? 'publish'
            : 'verify',
      plan,
    })
    let payload: Payload | undefined
    let payloadOwnedByRecovery = false
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
      if (command.phase === 'production-verify') {
        const verification = await verifyWingsGroupV3Media({
          expectedPublicationState: 'pending',
          manifest,
          mediaDirectory: WINGSGROUP_V3_MEDIA_DIRECTORY,
          payload,
          plan,
          publicOrigin: `https://${site.primaryDomain}`,
          requirePhysicalDerivatives: true,
          req,
          siteID: site.id,
        })
        await payload.destroy()
        payload = undefined
        console.log(
          JSON.stringify(
            {
              archiveSha256: binding.archiveSha256,
              localizedAltVerified: verification.localizedAltVerified,
              operationID: binding.operationID,
              phase: command.phase,
              planSha256: binding.planSha256,
              responsiveDerivatives: verification.responsiveDerivatives,
              siteCode: verification.siteCode,
              verified: verification.verified,
            },
            null,
            2,
          ),
        )
        return
      }

      payloadOwnedByRecovery = true
      if (command.phase === 'production-publish') {
        const verification = await publishWingsGroupV3MediaWithRecovery({
          backupPath: 'verified encrypted backup evidence',
          databasePath: binding.databaseName,
          manifest,
          mediaDirectory: WINGSGROUP_V3_MEDIA_DIRECTORY,
          payload,
          plan,
          publicOrigin: `https://${site.primaryDomain}`,
          operationID: binding.operationID,
          req,
          siteID: site.id,
        })
        payload = undefined
        console.log(
          JSON.stringify(
            {
              archiveSha256: binding.archiveSha256,
              localizedAltVerified: verification.localizedAltVerified,
              operationID: binding.operationID,
              phase: command.phase,
              planSha256: binding.planSha256,
              publication: 'published',
              responsiveDerivatives: verification.responsiveDerivatives,
              siteCode: verification.siteCode,
              verified: verification.verified,
            },
            null,
            2,
          ),
        )
        return
      }

      const summary = await applyWingsGroupV3MediaWithRecovery({
        assetsDirectory: command.assetsDirectory,
        backupPath: 'verified encrypted backup evidence',
        databasePath: binding.databaseName,
        manifest,
        mediaDirectory: WINGSGROUP_V3_MEDIA_DIRECTORY,
        payload,
        plan,
        publicOrigin: `https://${site.primaryDomain}`,
        req,
        siteID: site.id,
      })
      payload = undefined
      console.log(
        JSON.stringify(
          {
            archiveSha256: binding.archiveSha256,
            created: summary.created,
            operationID: binding.operationID,
            phase: command.phase,
            planSha256: binding.planSha256,
            reused: summary.reused,
            siteCode: summary.siteCode,
            verified: summary.verified,
          },
          null,
          2,
        ),
      )
    } catch (error) {
      if (payload && !payloadOwnedByRecovery) await payload.destroy()
      payload = undefined
      throw error
    }
    return
  }

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
      requirePhysicalDerivatives: false,
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
