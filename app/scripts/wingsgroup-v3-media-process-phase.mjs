#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const phase = process.argv[2]
const root = process.env.WP_REL_27_ROOT
const manifestPath = process.env.WP_REL_27_MANIFEST
const statePath = process.env.WP_REL_27_STATE
const mediaDirectory = process.env.WP_REL_27_MEDIA_DIRECTORY
const operationID = process.env.WP_REL_27_OPERATION_ID
if (!root || !manifestPath || !statePath || !mediaDirectory || !operationID)
  throw new Error('WP-REL-27 phase requires local fixture paths and operation ID.')

const { createLocalReq, getPayload } = await import('payload')
const config = (await import('../src/payload.config.ts')).default
const media = await import('./import-wingsgroup-v3-media.ts')
const planHelpers = await import('./lib/wingsGroupV3MediaPlan.ts')
const payload = await getPayload({ config })
let destroyedByRecovery = false
const context = { disableRevalidate: true, seed: true }
const manifest = planHelpers.parseWingsGroupV3MediaManifest(
  JSON.parse(await readFile(manifestPath, 'utf8')),
)
const plan = await planHelpers.buildWingsGroupV3MediaPlan({ assetsDirectory: root, manifest })
const req = await createLocalReq({ context, user: { id: 0, role: 'super-admin' } }, payload)

const findSite = async () => {
  const result = await payload.find({
    collection: 'sites',
    depth: 0,
    limit: 2,
    overrideAccess: true,
    pagination: false,
    req,
    where: { code: { equals: 'wings-group' } },
  })
  if (result.docs.length !== 1)
    throw new Error(`Expected one fixture site, found ${result.docs.length}`)
  return result.docs[0]
}
const readState = async () => {
  try {
    return JSON.parse(await readFile(statePath, 'utf8'))
  } catch {
    return { generatedMedia: [] }
  }
}

try {
  const state = await readState()
  if (phase === 'bootstrap') {
    const existing = await payload.find({
      collection: 'sites',
      depth: 0,
      limit: 2,
      overrideAccess: true,
      pagination: false,
      req,
      where: { code: { equals: 'wings-group' } },
    })
    if (existing.docs.length === 0) {
      const site = await payload.create({
        collection: 'sites',
        data: {
          code: 'wings-group',
          defaultLocale: 'vi',
          isActive: true,
          name: 'WingsGroup',
          primaryDomain: 'wingsgroup.test',
          supportedLocales: ['vi', 'en'],
        },
        overrideAccess: true,
        req,
      })
      await payload.create({
        collection: 'site-settings',
        data: {
          branding: { logoText: 'WingsGroup', themeKey: 'wings-group' },
          site: site.id,
          siteName: 'WingsGroup',
        },
        overrideAccess: true,
        req,
      })
    }
    state.bootstrap = { siteID: (await findSite()).id }
  } else {
    const site = await findSite()
    if (phase === 'apply') {
      state.apply = await media.applyWingsGroupV3MediaWithRecovery({
        assetsDirectory: root,
        backupPath: path.join(root, 'disposable-backup-marker'),
        databasePath: 'wings_content_smoke',
        manifest,
        mediaDirectory,
        onCreatedDocument: (document) => {
          for (const filename of [
            document.filename,
            ...Object.values(document.sizes || {}).map((size) => size?.filename),
          ].filter(Boolean)) {
            state.generatedMedia.push(path.resolve(mediaDirectory, filename))
          }
        },
        payload,
        plan,
        publicOrigin: 'https://wingsgroup.test',
        req,
        siteID: site.id,
      })
      destroyedByRecovery = true
    } else if (phase === 'publish') {
      const result = await media.publishWingsGroupV3MediaWithRecovery({
        backupPath: path.join(root, 'disposable-backup-marker'),
        databasePath: 'wings_content_smoke',
        manifest,
        mediaDirectory,
        operationID,
        payload,
        plan,
        publicOrigin: 'https://wingsgroup.test',
        req,
        siteID: site.id,
      })
      state.publish = { ...result, publication: 'published' }
      destroyedByRecovery = true
    } else if (phase === 'verify') {
      state.verify = await media.verifyWingsGroupV3Media({
        expectedPublicationState: 'published',
        manifest,
        mediaDirectory,
        payload,
        plan,
        publicOrigin: 'https://wingsgroup.test',
        requirePhysicalDerivatives: true,
        req,
        siteID: site.id,
      })
    } else throw new Error(`Unknown WP-REL-27 phase: ${phase}`)
  }
  await writeFile(statePath, `${JSON.stringify(state)}\n`)
  console.log(JSON.stringify({ phase, status: 'pass' }))
  process.exit(0)
} finally {
  if (!destroyedByRecovery) await payload.destroy().catch(() => undefined)
}
