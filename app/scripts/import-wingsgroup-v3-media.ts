/**
 * Governed WingsGroup v3 media importer.
 *
 * Safe default:
 *   pnpm exec tsx scripts/import-wingsgroup-v3-media.ts --assets-dir=/path/to/assets
 *
 * Local disposable SQLite apply only:
 *   DATABASE_URL=file:./wingsgroup-v3-rehearsal.db pnpm exec tsx \
 *     scripts/import-wingsgroup-v3-media.ts --apply --site-code=wings-group \
 *     --confirm-plan=<sha256> --assets-dir=/path/to/assets
 *
 * Apply creates deterministic non-colliding original filenames and generated
 * WebP/AVIF files, but leaves every Media record in `ready/generated`, never
 * `published/verified`. Publication remains a separate human-governed gate.
 */
import 'dotenv/config'

import fs from 'node:fs'
import fsPromises from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import sharp from 'sharp'
import { createLocalReq, getPayload, type Payload, type PayloadRequest } from 'payload'

import configPromise from '@payload-config'
import { resolveLocalDatabaseURL } from '../src/utilities/localDatabase'
import {
  assertApplicableWingsGroupV3MediaPlan,
  buildWingsGroupV3MediaPlan,
  parseWingsGroupV3MediaManifest,
  resolveSiteSettingsUpsert,
  WINGSGROUP_V3_SITE_CODE,
  type WingsGroupV3MediaManifest,
  type WingsGroupV3MediaPlanItem,
} from './lib/wingsGroupV3MediaPlan'

const args = process.argv.slice(2)
const option = (name: string): string | undefined =>
  args.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3)
const apply = args.includes('--apply')
const manifestPath = path.resolve(
  option('manifest') || '../docs/product/wingsgroup-v3-media-manifest.json',
)
const assetsDirectory = path.resolve(option('assets-dir') || '')

const sha256 = (value: Buffer): string => createHash('sha256').update(value).digest('hex')

const assertLocalDisposableApply = (): string => {
  const databaseURL = resolveLocalDatabaseURL(process.env.DATABASE_URL)
  if (
    !databaseURL.startsWith('file:') ||
    process.env.NODE_ENV === 'production' ||
    process.env.VERCEL ||
    /prod|staging|remote/i.test(databaseURL)
  ) {
    throw new Error('Apply is restricted to an explicit local disposable SQLite DATABASE_URL.')
  }
  const databasePath = path.resolve(process.cwd(), databaseURL.replace(/^file:/, ''))
  if (!fs.existsSync(databasePath))
    throw new Error(`Disposable SQLite database not found: ${databasePath}`)
  const backupPath = `${databasePath}.bak-wingsgroup-v3-${new Date().toISOString().replace(/[:.]/g, '-')}`
  fs.copyFileSync(databasePath, backupPath)
  return backupPath
}

const findFoundation = async (payload: Payload, req: PayloadRequest) => {
  const [sites, settings] = await Promise.all([
    payload.find({
      collection: 'sites',
      depth: 0,
      limit: 2,
      overrideAccess: true,
      pagination: false,
      req,
      where: { code: { equals: WINGSGROUP_V3_SITE_CODE } },
    }),
    payload.find({
      collection: 'site-settings',
      depth: 0,
      limit: 10,
      overrideAccess: true,
      pagination: false,
      req,
    }),
  ])
  const foundation = resolveSiteSettingsUpsert({ settings: settings.docs, sites: sites.docs })
  if (typeof foundation.siteID !== 'number') throw new Error('WingsGroup site ID must be numeric.')
  return { ...foundation, siteID: foundation.siteID }
}

const generateDerivatives = async ({
  item,
  publicMediaRoot,
}: {
  item: WingsGroupV3MediaPlanItem
  publicMediaRoot: string
}) => {
  const sourcePath = path.join(assetsDirectory, item.sourceFile)
  const ledger = []
  for (const derivative of item.derivatives) {
    const outputPath = path.join(publicMediaRoot, derivative.file)
    await fsPromises.mkdir(path.dirname(outputPath), { recursive: true })
    const pipeline = sharp(sourcePath).resize({ withoutEnlargement: true, width: derivative.width })
    const bytes =
      derivative.format === 'webp'
        ? await pipeline.webp({ quality: 82 }).toBuffer()
        : await pipeline.avif({ quality: 62 }).toBuffer()
    await fsPromises.writeFile(outputPath, bytes)
    const metadata = await sharp(bytes).metadata()
    ledger.push({
      format: derivative.format,
      height: metadata.height,
      sha256: sha256(bytes),
      url: `/media/${derivative.file}`,
      width: metadata.width || derivative.width,
    })
  }
  return ledger
}

const upsertMedia = async ({
  item,
  manifest,
  payload,
  req,
  siteID,
}: {
  item: WingsGroupV3MediaPlanItem
  manifest: WingsGroupV3MediaManifest
  payload: Payload
  req: PayloadRequest
  siteID: number
}) => {
  const existing = await payload.find({
    collection: 'media',
    depth: 0,
    limit: 2,
    overrideAccess: true,
    pagination: false,
    req,
    where: { 'governance.sourceIdentity': { equals: item.sourceIdentity } },
  })
  if (existing.docs.length > 1) throw new Error(`Duplicate source identity ${item.sourceIdentity}`)
  if (existing.docs[0]) {
    const existingSite =
      typeof existing.docs[0].site === 'object' ? existing.docs[0].site?.id : existing.docs[0].site
    if (String(existingSite) !== String(siteID)) {
      throw new Error(`Source identity ${item.sourceIdentity} belongs to another tenant.`)
    }
    return { created: false, id: existing.docs[0].id }
  }

  const publicMediaRoot = path.resolve(process.cwd(), 'public/media')
  const responsiveDerivatives = await generateDerivatives({ item, publicMediaRoot })
  const bytes = await fsPromises.readFile(path.join(assetsDirectory, item.sourceFile))
  const governance = {
    derivativeState: 'generated' as const,
    managedBy: 'wingsgroup-v3' as const,
    provenanceReference: `attachment:${manifest.sourcePackage.attachmentId};manifest:${manifest.sourcePackage.manifest}`,
    publicationState: 'ready' as const,
    responsiveDerivatives,
    rightsEvidence: manifest.rights.evidence,
    rightsState: 'approved' as const,
    sourceArchiveSha256: manifest.sourcePackage.archiveSha256,
    sourceAttachmentId: manifest.sourcePackage.attachmentId,
    sourceFileSha256: item.sourceFileSha256,
    sourceFilename: item.sourceFile,
    sourceIdentity: item.sourceIdentity,
    usageScope: 'editorial-service' as const,
  }
  const media = await payload.create({
    collection: 'media',
    context: { disableRevalidate: true, seed: true },
    data: { alt: item.alt.vi, governance, site: siteID },
    file: { data: bytes, mimetype: 'image/png', name: item.importFilename, size: bytes.byteLength },
    locale: 'vi',
    overrideAccess: true,
    req,
  })
  await payload.update({
    collection: 'media',
    context: { disableRevalidate: true, seed: true },
    data: { alt: item.alt.en },
    id: media.id,
    locale: 'en',
    overrideAccess: true,
    req,
  })
  return { created: true, id: media.id }
}

const main = async () => {
  if (!option('assets-dir')) throw new Error('--assets-dir is required.')
  const manifest = parseWingsGroupV3MediaManifest(
    JSON.parse(await fsPromises.readFile(manifestPath, 'utf8')),
  )
  const plan = await buildWingsGroupV3MediaPlan({ assetsDirectory, manifest })
  assertApplicableWingsGroupV3MediaPlan(plan)

  if (!apply) {
    console.log(JSON.stringify({ dryRun: true, derivativeState: 'pending', ...plan }, null, 2))
    return
  }
  if (option('site-code') !== WINGSGROUP_V3_SITE_CODE) {
    throw new Error(`Apply requires --site-code=${WINGSGROUP_V3_SITE_CODE}.`)
  }
  if (option('confirm-plan') !== plan.planChecksum) {
    throw new Error(`Apply requires --confirm-plan=${plan.planChecksum}.`)
  }

  const backupPath = assertLocalDisposableApply()
  const payload = await getPayload({ config: configPromise })
  try {
    const req = await createLocalReq(
      {
        context: { disableRevalidate: true, seed: true },
        user: { id: 0, role: 'super-admin' } as never,
      },
      payload,
    )
    const foundation = await findFoundation(payload, req)
    await payload.update({
      collection: 'site-settings',
      context: { disableRevalidate: true, seed: true },
      data: {
        wingsGroupV3: {
          consultationChannels: [
            { key: 'zalo', state: 'unconfigured' },
            { key: 'whatsapp', state: 'unconfigured' },
            { key: 'messenger', state: 'unconfigured' },
          ],
          enabled: true,
          englishPublicationState: 'hidden',
          privacy: {
            consentRequired: true,
            consentVersion: 'wingsgroup-contact-v1',
            dataSubjectContact: 'info@doicanhviet.com',
            interBranchTransferAllowed: true,
            policyRouteEn: '/en/chinh-sach-bao-mat',
            policyRouteVi: '/chinh-sach-bao-mat',
            policyVersion: 'wingsgroup-privacy-v1',
            retentionMonths: 24,
          },
        },
      },
      id: foundation.settingsID,
      overrideAccess: true,
      req,
    })

    let created = 0
    for (const item of plan.records) {
      const result = await upsertMedia({
        item,
        manifest,
        payload,
        req,
        siteID: foundation.siteID,
      })
      if (result.created) created += 1
    }
    console.log(
      JSON.stringify(
        {
          backupPath,
          created,
          derivativeState: 'generated-not-verified',
          planChecksum: plan.planChecksum,
          planned: plan.planned,
          publicationState: 'ready-not-published',
          siteCode: plan.siteCode,
          unchanged: plan.planned - created,
        },
        null,
        2,
      ),
    )
  } finally {
    await payload.destroy()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
