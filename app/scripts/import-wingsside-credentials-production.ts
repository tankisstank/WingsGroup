import 'dotenv/config'

import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { createLocalReq, getPayload, type Payload, type PayloadRequest } from 'payload'

import {
  loadWingsSideCredentialManifest,
  type WingsSideCredentialManifest,
} from './lib/wingsSideCredentials'
import {
  aggregateReviewStatusTotals,
  assertCredentialsProductionEnvironment,
  assertCredentialsSiteConfig,
  assertReleaseSourceCommit,
  assertSourceIdentityMatches,
  assertWingsSideCredentialsPlan,
  assertWingsSideCredentialsPlanMatchesSource,
  buildWingsSideCredentialsPlan,
  buildWingsSideCredentialsSourceIdentity,
  classifyWingsSideCredentialsState,
  credentialsChecksum,
  credentialRelationID,
  layoutChecksum,
  wingsSideCredentialsProductionExpectedItemCount,
  wingsSideCredentialsProductionLocales,
  wingsSideCredentialsProductionSiteCode,
  type CredentialHomeSnapshot,
  type CredentialMediaSnapshot,
  type WingsSideCredentialsPlan,
  type WingsSideCredentialsProductionLocale,
} from './lib/wingsSideCredentialsProduction'
import {
  applyWingsSideCredentialsProductionPlan,
  rollbackWingsSideCredentialsProductionPlan,
  verifyPlanBeforeChecksums,
} from './lib/wingsSideCredentialsProductionRuntime'

type Phase = 'apply' | 'plan' | 'rollback' | 'verify'

const requiredApplyConfirmation = 'CONFIRM_WINGSSIDE_CREDENTIALS_PRODUCTION_WRITE'
const requiredRollbackConfirmation = 'CONFIRM_WINGSSIDE_CREDENTIALS_PRODUCTION_ROLLBACK'

const argumentValue = (name: string): string | undefined => {
  const inline = process.argv.find((argument) => argument.startsWith(`${name}=`))
  if (inline) return inline.slice(name.length + 1)
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : undefined
}

const selectedPhase = (): Phase => {
  const phase =
    argumentValue('--phase') || process.argv.slice(2).find((arg) => !arg.startsWith('--'))
  if (!phase || !(['plan', 'apply', 'verify', 'rollback'] as const).includes(phase as Phase)) {
    throw new Error('Choose one phase: plan, apply, verify, or rollback')
  }
  return phase as Phase
}

const resolveAdmin = async (payload: Payload, phase: Phase) => {
  const syntheticAdmin = {
    collection: 'users',
    createdAt: new Date(0).toISOString(),
    email: 'wingsside-credentials-plan@internal.invalid',
    id: 0,
    role: 'super-admin',
    sites: [],
    updatedAt: new Date(0).toISOString(),
  }
  if (phase === 'plan' || phase === 'verify') return syntheticAdmin

  const email = String(
    argumentValue('--admin-email') || process.env.IMPORT_ADMIN_EMAIL || '',
  ).trim()
  if (!email) throw new Error(`${phase} requires --admin-email or IMPORT_ADMIN_EMAIL`)
  const result = await payload.find({
    collection: 'users',
    depth: 0,
    limit: 2,
    overrideAccess: true,
    pagination: false,
    where: { email: { equals: email } },
  })
  if (result.docs.length !== 1 || result.docs[0].role !== 'super-admin') {
    throw new Error('Credentials production operator must resolve to exactly one super-admin')
  }
  return result.docs[0]
}

const assertConfirmation = (phase: Phase) => {
  if (phase === 'apply' && argumentValue('--confirm') !== requiredApplyConfirmation) {
    throw new Error(`Apply requires --confirm=${requiredApplyConfirmation}`)
  }
  if (phase === 'rollback' && argumentValue('--confirm') !== requiredRollbackConfirmation) {
    throw new Error(`Rollback requires --confirm=${requiredRollbackConfirmation}`)
  }
}

const planHash = (plan: WingsSideCredentialsPlan) => credentialsChecksum(plan)

const releaseSourceCommit = () => assertReleaseSourceCommit(process.env.WINGSTRAVEL_RELEASE_SHA)

const readPlan = async (filePath: string): Promise<WingsSideCredentialsPlan> => {
  const plan = JSON.parse(
    await readFile(path.resolve(filePath), 'utf8'),
  ) as WingsSideCredentialsPlan
  assertWingsSideCredentialsPlan(plan)
  return plan
}

const requirePlan = async () => {
  const planPath = argumentValue('--plan')
  if (!planPath) throw new Error('This phase requires --plan <path>')
  const plan = await readPlan(planPath)
  const suppliedHash = argumentValue('--plan-sha256')
  if (!suppliedHash) throw new Error('Apply and rollback require --plan-sha256 <sha256>')
  const actualHash = planHash(plan)
  if (actualHash !== suppliedHash) {
    throw new Error('Supplied plan SHA-256 does not match canonical plan')
  }
  return { plan, planPath: path.resolve(planPath), planSha256: actualHash }
}

const atomicWriteJSON = async (filePath: string, value: unknown) => {
  const resolved = path.resolve(filePath)
  const temporary = `${resolved}.${process.pid}.${Date.now()}.tmp`
  await mkdir(path.dirname(resolved), { recursive: true })
  try {
    await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
    await rename(temporary, resolved)
  } catch (error) {
    await rm(temporary, { force: true })
    throw error
  }
  return resolved
}

const defaultOutputPath = (phase: Phase) =>
  path.resolve('artifacts', 'release', 'wingsside-credentials', `${phase}-${Date.now()}.json`)

const resolveSite = async (payload: Payload, req: PayloadRequest) => {
  const result = await payload.find({
    collection: 'sites',
    depth: 0,
    limit: 2,
    overrideAccess: true,
    pagination: false,
    req,
    where: { code: { equals: wingsSideCredentialsProductionSiteCode } },
  })
  if (result.docs.length !== 1) {
    throw new Error(
      `Expected exactly one site ${wingsSideCredentialsProductionSiteCode}; found ${result.docs.length}`,
    )
  }
  const site = result.docs[0]
  const supportedLocales = Array.isArray(site.supportedLocales) ? site.supportedLocales : []
  assertCredentialsSiteConfig({ defaultLocale: site.defaultLocale, supportedLocales })
  return site
}

const findHomeForLocale = async (
  payload: Payload,
  req: PayloadRequest,
  siteID: number | string,
  locale: WingsSideCredentialsProductionLocale,
): Promise<CredentialHomeSnapshot> => {
  const result = await payload.find({
    collection: 'pages',
    depth: 0,
    fallbackLocale: false,
    limit: 2,
    locale,
    overrideAccess: true,
    pagination: false,
    req,
    where: {
      and: [
        { site: { equals: siteID } },
        { _status: { equals: 'published' } },
        {
          or: [
            { pathname: { equals: '' } },
            { pathname: { equals: '/' } },
            { slug: { equals: 'home' } },
          ],
        },
      ],
    },
  })
  if (result.docs.length !== 1) {
    throw new Error(
      `Expected exactly one published Home page for ${locale}; found ${result.docs.length}`,
    )
  }
  const page = result.docs[0]
  const layout = Array.isArray(page.layout) ? (page.layout as unknown[]) : []
  return {
    id: page.id,
    layout,
    layoutChecksum: layoutChecksum(layout),
    locale,
    status: page._status ?? null,
  }
}

const mediaUploadFiles = (media: Record<string, unknown>) => {
  const filenames = new Set<string>()
  if (typeof media.filename === 'string') filenames.add(media.filename)
  if (media.sizes && typeof media.sizes === 'object') {
    for (const size of Object.values(media.sizes as Record<string, unknown>)) {
      if (
        size &&
        typeof size === 'object' &&
        typeof (size as Record<string, unknown>).filename === 'string'
      ) {
        filenames.add((size as Record<string, unknown>).filename as string)
      }
    }
  }
  return [...filenames].map((filename) => path.resolve('public', 'media', filename))
}

const loadSnapshot = async ({
  manifest,
  payload,
  req,
  siteID,
}: {
  manifest: WingsSideCredentialManifest
  payload: Payload
  req: PayloadRequest
  siteID: number | string
}) => {
  const homes = await Promise.all(
    wingsSideCredentialsProductionLocales.map((locale) =>
      findHomeForLocale(payload, req, siteID, locale),
    ),
  )
  const mediaResult = await payload.find({
    collection: 'media',
    depth: 0,
    limit: 100,
    overrideAccess: true,
    pagination: false,
    req,
    where: {
      and: [
        { site: { equals: siteID } },
        { filename: { in: manifest.items.map((item) => item.file) } },
      ],
    },
  })
  const media: CredentialMediaSnapshot[] = mediaResult.docs.map((item) => ({
    alt: item.alt ?? null,
    filename: item.filename ?? null,
    id: item.id,
    siteID: credentialRelationID(item.site as never),
    uploadFiles: mediaUploadFiles(item as unknown as Record<string, unknown>),
  }))
  return { homes, media }
}

const logJSON = (value: Record<string, unknown>) => {
  console.log(JSON.stringify(value))
}

const main = async () => {
  const phase = selectedPhase()
  assertConfirmation(phase)
  assertCredentialsProductionEnvironment({
    databaseURL: String(process.env.DATABASE_URL || ''),
    nodeEnv: process.env.NODE_ENV,
    payloadDbPush: process.env.PAYLOAD_DB_PUSH,
    payloadPackageName: '@payloadcms/db-postgres',
  })
  const releaseCommit = releaseSourceCommit()

  logJSON({ phase, step: 'payload:init:start' })
  const { default: config } = await import('../src/payload.config')
  const payload = await getPayload({ config })
  try {
    assertCredentialsProductionEnvironment({
      databaseURL: String(process.env.DATABASE_URL || ''),
      nodeEnv: process.env.NODE_ENV,
      payloadDbPush: process.env.PAYLOAD_DB_PUSH,
      payloadPackageName: payload.db.packageName,
    })
    logJSON({ adapter: payload.db.packageName, phase, step: 'payload:init:done' })

    const admin = await resolveAdmin(payload, phase)
    const req = await createLocalReq({ user: admin as never }, payload)
    const manifest = await loadWingsSideCredentialManifest()
    const sourceIdentity = await buildWingsSideCredentialsSourceIdentity(manifest, releaseCommit)
    const site = await resolveSite(payload, req)
    const current = await loadSnapshot({ manifest, payload, req, siteID: site.id })
    const snapshot = classifyWingsSideCredentialsState({
      homes: current.homes,
      manifest,
      media: current.media,
      siteID: site.id,
    })

    if (phase === 'plan') {
      if (snapshot.state !== 'before') {
        throw new Error(
          `Credentials plan refused: expected exact before, observed ${snapshot.state}`,
        )
      }
      const plan = await buildWingsSideCredentialsPlan({
        homes: current.homes,
        manifest,
        runID: randomUUID(),
        siteID: site.id,
        sourceIdentity,
      })
      assertWingsSideCredentialsPlan(plan)
      assertWingsSideCredentialsPlanMatchesSource({ manifest, plan, sourceIdentity })
      const outputPath = await atomicWriteJSON(
        argumentValue('--output') || defaultOutputPath(phase),
        plan,
      )
      logJSON({
        after: {
          media: wingsSideCredentialsProductionExpectedItemCount,
          placements: manifest.items.length * wingsSideCredentialsProductionLocales.length,
          reviewStatusTotals: aggregateReviewStatusTotals(manifest.items),
        },
        outputPath,
        phase,
        planSha256: planHash(plan),
        state: snapshot.state,
      })
      return
    }

    const { plan, planPath, planSha256 } = await requirePlan()
    if (String(plan.siteID) !== String(site.id))
      throw new Error('Resolved site ID drifted from plan')
    assertSourceIdentityMatches(plan.sourceIdentity, sourceIdentity)
    assertWingsSideCredentialsPlanMatchesSource({ manifest, plan, sourceIdentity })
    verifyPlanBeforeChecksums({
      homes: plan.pageOperations.map((operation) => ({
        id: operation.homePageID,
        layout: operation.beforeLayout,
        layoutChecksum: operation.beforeChecksum,
        locale: operation.locale,
        status: 'published',
      })),
      plan,
    })

    if (phase === 'verify') {
      if (snapshot.state !== 'after') {
        throw new Error(
          `Credentials verify refused: expected exact after, observed ${snapshot.state}`,
        )
      }
      logJSON({
        media: snapshot.media.length,
        phase,
        planPath,
        planSha256,
        placements: snapshot.blocks.reduce((sum, block) => sum + block.itemCount, 0),
        reviewStatusTotals: snapshot.blocks.reduce(
          (sum, block) => ({
            needsReview: sum.needsReview + block.reviewStatusTotals.needsReview,
            verified: sum.verified + block.reviewStatusTotals.verified,
          }),
          { needsReview: 0, verified: 0 },
        ),
        state: snapshot.state,
      })
      return
    }

    if (phase === 'apply') {
      if (snapshot.state === 'after') {
        logJSON({ phase, planPath, planSha256, resumed: true, state: snapshot.state, writes: 0 })
        return
      }
      if (snapshot.state !== 'before') {
        throw new Error(
          `Credentials apply refused: expected before or after, observed ${snapshot.state}`,
        )
      }
      const result = await applyWingsSideCredentialsProductionPlan({
        failDuringCreateItemID: argumentValue('--fail-during-create-item-id'),
        failAfterCreates: argumentValue('--fail-after-creates')
          ? Number(argumentValue('--fail-after-creates'))
          : undefined,
        failAfterPageUpdates: argumentValue('--fail-after-page-updates')
          ? Number(argumentValue('--fail-after-page-updates'))
          : undefined,
        loadSnapshot: () => loadSnapshot({ manifest, payload, req, siteID: site.id }),
        manifest,
        payload,
        plan,
        req,
      })
      logJSON({ ...result, phase, planPath, planSha256, state: 'after', writes: 'committed' })
      return
    }

    if (snapshot.state !== 'after') {
      throw new Error(
        `Credentials rollback refused: expected exact after, observed ${snapshot.state}`,
      )
    }
    const result = await rollbackWingsSideCredentialsProductionPlan({
      failAfterDeletes: argumentValue('--fail-after-deletes')
        ? Number(argumentValue('--fail-after-deletes'))
        : undefined,
      loadSnapshot: () => loadSnapshot({ manifest, payload, req, siteID: site.id }),
      manifest,
      payload,
      plan,
      req,
    })
    logJSON({ ...result, phase, planPath, planSha256, state: 'before', writes: 'committed' })
  } finally {
    logJSON({ phase, step: 'payload:destroy:start' })
    await payload.destroy()
    logJSON({ phase, step: 'payload:destroy:done' })
  }
}

void main().then(
  () => process.exit(0),
  (error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  },
)
