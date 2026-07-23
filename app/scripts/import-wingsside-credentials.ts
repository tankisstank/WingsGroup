/**
 * Import the photographed WingSide credential catalog.
 *
 * Safe default (manifest validation only):
 *   pnpm run import:wingsside:credentials
 *
 * Local SQLite apply:
 *   pnpm run import:wingsside:credentials -- --apply --site-code=wing-side
 */
import 'dotenv/config'

import configPromise from '@payload-config'
import fs from 'node:fs'
import fsPromises from 'node:fs/promises'
import path from 'node:path'
import { createLocalReq, getPayload, type Payload, type PayloadRequest, type Where } from 'payload'

import {
  buildWingsSideCredentialsBlock,
  loadWingsSideCredentialManifest,
  summarizeWingsSideCredentials,
  WINGSSIDE_CREDENTIAL_LOCALES,
  WINGSSIDE_CREDENTIAL_SITE_CODE,
  wingsSideCredentialAssetRoot,
  type WingsSideCredentialItem,
  type WingsSideCredentialLocale,
} from './lib/wingsSideCredentials'
import { resolveLocalDatabaseURL } from '../src/utilities/localDatabase'

const context = { disableRevalidate: true, seed: true }
const whereAnd = (...clauses: Where[]): Where => ({ and: clauses })

const parseArgs = () => {
  const args = process.argv.slice(2)
  const siteCode = args.find((arg) => arg.startsWith('--site-code='))?.split('=')[1]
  return { apply: args.includes('--apply'), siteCode }
}

const backupLocalDatabase = () => {
  const databaseURL = resolveLocalDatabaseURL(process.env.DATABASE_URL)
  if (
    !databaseURL.startsWith('file:') ||
    process.env.NODE_ENV === 'production' ||
    process.env.VERCEL ||
    /prod|staging|remote/i.test(databaseURL)
  ) {
    throw new Error('Apply is restricted to an explicit local SQLite DATABASE_URL.')
  }
  const databasePath = path.resolve(process.cwd(), databaseURL.replace(/^file:/, ''))
  if (!fs.existsSync(databasePath)) throw new Error(`SQLite database not found: ${databasePath}`)
  const backupPath = `${databasePath}.bak-us047-${new Date().toISOString().replace(/[:.]/g, '-')}`
  fs.copyFileSync(databasePath, backupPath)
  return backupPath
}

const findExactSite = async (payload: Payload, req: PayloadRequest) => {
  const result = await payload.find({
    collection: 'sites',
    depth: 0,
    limit: 2,
    overrideAccess: true,
    pagination: false,
    req,
    where: { code: { equals: WINGSSIDE_CREDENTIAL_SITE_CODE } },
  })
  if (result.docs.length !== 1) {
    throw new Error(
      `Expected one ${WINGSSIDE_CREDENTIAL_SITE_CODE} site; found ${result.docs.length}`,
    )
  }
  return result.docs[0]
}

const findHome = async (
  payload: Payload,
  req: PayloadRequest,
  siteID: number,
  locale: WingsSideCredentialLocale,
) => {
  const result = await payload.find({
    collection: 'pages',
    depth: 0,
    fallbackLocale: false,
    limit: 2,
    locale,
    overrideAccess: true,
    pagination: false,
    req,
    where: whereAnd(
      { site: { equals: siteID } },
      {
        or: [
          { pathname: { equals: '' } },
          { pathname: { equals: '/' } },
          { slug: { equals: 'home' } },
        ],
      },
    ),
  })
  if (result.docs.length !== 1) {
    throw new Error(`Expected one ${locale} WingSide home page; found ${result.docs.length}`)
  }
  return result.docs[0]
}

const resolveMedia = async ({
  item,
  payload,
  req,
  siteID,
}: {
  item: WingsSideCredentialItem
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
    where: whereAnd({ site: { equals: siteID } }, { filename: { equals: item.file } }),
  })
  if (existing.docs.length > 1) throw new Error(`Duplicate Media filename ${item.file}`)
  if (existing.docs[0]) return { created: false, id: existing.docs[0].id }

  const bytes = await fsPromises.readFile(path.join(wingsSideCredentialAssetRoot, item.file))
  const media = await payload.create({
    collection: 'media',
    context,
    data: { alt: item.alt, site: siteID },
    file: { data: bytes, mimetype: 'image/jpeg', name: item.file, size: bytes.byteLength },
    locale: 'en',
    overrideAccess: true,
    req,
  })
  return { created: true, id: media.id }
}

const main = async () => {
  const args = parseArgs()
  const manifest = await loadWingsSideCredentialManifest()
  const summary = summarizeWingsSideCredentials(manifest)

  if (!args.apply) {
    console.log(JSON.stringify({ dryRun: true, ...summary, siteCode: manifest.siteCode }, null, 2))
    return
  }
  if (args.siteCode !== WINGSSIDE_CREDENTIAL_SITE_CODE) {
    throw new Error(`Apply requires --site-code=${WINGSSIDE_CREDENTIAL_SITE_CODE}`)
  }

  const backupPath = backupLocalDatabase()
  const payload = await getPayload({ config: configPromise })
  try {
    const pagesCollection = payload.collections.pages
    if (pagesCollection?.config?.versions) pagesCollection.config.versions = false as never
    const req = await createLocalReq(
      { context, user: { id: 0, role: 'super-admin' } as never },
      payload,
    )
    const site = await findExactSite(payload, req)
    const mediaIDs = new Map<string, number | string>()
    let createdMedia = 0
    for (const item of manifest.items) {
      const resolved = await resolveMedia({ item, payload, req, siteID: site.id })
      mediaIDs.set(item.id, resolved.id)
      if (resolved.created) createdMedia += 1
    }

    let updatedLocales = 0
    for (const locale of WINGSSIDE_CREDENTIAL_LOCALES) {
      const home = await findHome(payload, req, site.id, locale)
      const currentLayout = Array.isArray(home.layout) ? home.layout : []
      const layout = [
        ...currentLayout.filter((block) => block.blockType !== 'credentialsCarousel'),
        buildWingsSideCredentialsBlock({ locale, manifest, mediaIDs }),
      ]
      await payload.update({
        collection: 'pages',
        context,
        data: { layout } as never,
        disableTransaction: true,
        id: home.id,
        locale,
        overrideAccess: true,
        req,
      })
      updatedLocales += 1
    }

    console.log(
      JSON.stringify(
        {
          backupPath,
          createdMedia,
          ...summary,
          siteCode: site.code,
          updatedLocales,
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
