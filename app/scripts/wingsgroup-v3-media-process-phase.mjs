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

const { commitTransaction, createLocalReq, getPayload, initTransaction } = await import('payload')
const config = (await import('../src/payload.config.ts')).default
const media = await import('./import-wingsgroup-v3-media.ts')
const content = await import('./import-wingsgroup-v3-content.ts')
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

const addFixtureMediaAliases = (inventory, contract) => {
  const names = new Set()
  const visit = (value) => {
    if (Array.isArray(value)) {
      value.forEach(visit)
      return
    }
    if (typeof value === 'string' && value.endsWith('.png')) {
      names.add(value)
      return
    }
    if (!value || typeof value !== 'object') return
    Object.values(value).forEach(visit)
  }
  visit(contract)
  for (const name of names) {
    const stem = name.slice(0, -'.png'.length)
    const planned = plan.records.find((record) => record.sourceFile.startsWith(`${stem}-`))
    if (!planned) continue
    const mediaID = inventory.mediaIDs.get(planned.sourceFile)
    if (mediaID !== undefined) inventory.mediaIDs.set(name, mediaID)
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
    } else if (phase === 'content-rollback') {
      const contract = content.buildWingsGroupV3ContentContract()
      const inventory = await content.readWingsGroupV3ContentInventory({
        manifest,
        mediaDirectory,
        mediaPlan: plan,
        payload,
        publicOrigin: 'https://wingsgroup.test',
        req,
        siteID: site.id,
      })
      addFixtureMediaAliases(inventory, contract)
      const settingsBeforeResult = await payload.find({
        collection: 'site-settings',
        depth: 0,
        limit: 2,
        overrideAccess: true,
        pagination: false,
        req,
        where: { site: { equals: site.id } },
      })
      const settingsBefore = settingsBeforeResult.docs[0] || null
      const transactionID = await initTransaction(req)
      if (!transactionID || !req.transactionID)
        throw new Error('Content rollback smoke transaction could not be initialized.')
      let pageWrites = 0
      const failingPayload = {
        ...payload,
        create: async (args) => payload.create(args),
        update: async (args) => {
          const result = await payload.update(args)
          if (args.collection === 'pages') {
            pageWrites += 1
            if (pageWrites === 1) throw new Error('WP-REL-35 induced mid-content-write failure.')
          }
          return result
        },
      }
      let rollbackError = ''
      try {
        await content.applyWingsGroupV3Content({
          contract,
          inventory,
          payload: failingPayload,
          req,
        })
        await commitTransaction(req)
        throw new Error('WP-REL-35 induced failure did not occur.')
      } catch (error) {
        rollbackError = error instanceof Error ? error.message : String(error)
        if (req.transactionID && payload.db) await payload.db.rollbackTransaction(req.transactionID)
      }
      const forms = await payload.find({
        collection: 'forms',
        depth: 0,
        limit: 100,
        overrideAccess: true,
        pagination: false,
        req,
        where: { title: { equals: 'WingsGroup production contact intake' } },
      })
      const settingsResult = await payload.find({
        collection: 'site-settings',
        depth: 0,
        limit: 2,
        overrideAccess: true,
        pagination: false,
        req,
        where: { site: { equals: site.id } },
      })
      const pages = await payload.find({
        collection: 'pages',
        depth: 0,
        limit: 100,
        overrideAccess: true,
        pagination: false,
        req,
        where: { site: { equals: site.id } },
      })
      const settings = settingsResult.docs[0] || {}
      state.contentRollback = {
        error: rollbackError,
        formCount: forms.docs.length,
        pageWrites,
        pageCount: pages.docs.length,
        settingsUnchanged: JSON.stringify(settings) === JSON.stringify(settingsBefore),
        settingsHasWingsGroupV3: Boolean(settings.wingsGroupV3),
      }
      if (
        rollbackError !== 'WP-REL-35 induced mid-content-write failure.' ||
        forms.docs.length !== 0 ||
        pages.docs.length !== 0 ||
        !state.contentRollback.settingsUnchanged
      )
        throw new Error(`Content rollback proof failed: ${JSON.stringify(state.contentRollback)}`)
    } else if (phase === 'content') {
      const contract = content.buildWingsGroupV3ContentContract()
      const transactionID = await initTransaction(req)
      if (!transactionID || !req.transactionID)
        throw new Error('Content smoke transaction could not be initialized.')
      try {
        const firstInventory = await content.readWingsGroupV3ContentInventory({
          manifest,
          mediaDirectory,
          mediaPlan: plan,
          payload,
          publicOrigin: 'https://wingsgroup.test',
          req,
          siteID: site.id,
        })
        addFixtureMediaAliases(firstInventory, contract)
        const first = await content.applyWingsGroupV3Content({
          contract,
          inventory: firstInventory,
          payload,
          req,
        })
        const secondInventory = await content.readWingsGroupV3ContentInventory({
          manifest,
          mediaDirectory,
          mediaPlan: plan,
          payload,
          publicOrigin: 'https://wingsgroup.test',
          req,
          siteID: site.id,
        })
        addFixtureMediaAliases(secondInventory, contract)
        const second = await content.applyWingsGroupV3Content({
          contract,
          inventory: secondInventory,
          payload,
          req,
        })
        const verifiedInventory = await content.readWingsGroupV3ContentInventory({
          manifest,
          mediaDirectory,
          mediaPlan: plan,
          payload,
          publicOrigin: 'https://wingsgroup.test',
          req,
          siteID: site.id,
        })
        state.content = {
          ...content.verifyWingsGroupV3ContentInventory({
            contract,
            formID: verifiedInventory.form?.id || '',
            inventory: verifiedInventory,
          }),
          firstWrites: first.writes.length,
          secondWrites: second.writes.length,
          formPresent: Boolean(verifiedInventory.form),
        }
        await commitTransaction(req)
      } catch (error) {
        if (req.transactionID && payload.db) await payload.db.rollbackTransaction(req.transactionID)
        throw error
      }
    } else throw new Error(`Unknown WP-REL-27 phase: ${phase}`)
  }
  await writeFile(statePath, `${JSON.stringify(state)}\n`)
  console.log(JSON.stringify({ phase, status: 'pass' }))
  process.exit(0)
} finally {
  if (!destroyedByRecovery) await payload.destroy().catch(() => undefined)
}
