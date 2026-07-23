import {
  commitTransaction,
  initTransaction,
  killTransaction,
  type Payload,
  type PayloadRequest,
} from 'payload'
import fs from 'node:fs/promises'
import path from 'node:path'

import {
  buildWingsSideCredentialsBlock,
  wingsSideCredentialAssetRoot,
  type WingsSideCredentialManifest,
} from './wingsSideCredentials'
import {
  afterBlockChecksum,
  classifyWingsSideCredentialsState,
  credentialFileSha256,
  credentialsChecksum,
  layoutChecksum,
  normalizeCredentialsBlock,
  type CredentialHomeSnapshot,
  type CredentialMediaSnapshot,
  type WingsSideCredentialsPlan,
} from './wingsSideCredentialsProduction'

const productionContext = {
  disableRevalidate: true,
  releaseOperation: 'wingsside-credentials-production-import',
}

const mediaStaticDir = path.resolve(import.meta.dirname, '../../public/media')

type UploadFileEffect = {
  files: string[]
  id: number | string
}

const createdMediaFiles = (media: Record<string, unknown>) => {
  const filenames = new Set<string>()
  if (typeof media.filename === 'string') filenames.add(media.filename)
  if (Array.isArray(media.sizes)) {
    for (const size of media.sizes) {
      if (
        size &&
        typeof size === 'object' &&
        typeof (size as Record<string, unknown>).filename === 'string'
      ) {
        filenames.add((size as Record<string, unknown>).filename as string)
      }
    }
  } else if (media.sizes && typeof media.sizes === 'object') {
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
  return [...filenames].map((filename) => path.join(mediaStaticDir, filename))
}

const cleanupCreatedMediaEffects = async (
  payload: Payload,
  req: PayloadRequest,
  effects: UploadFileEffect[],
) => {
  for (const effect of [...effects].reverse()) {
    try {
      await payload.delete({
        collection: 'media',
        context: productionContext,
        id: effect.id,
        overrideAccess: true,
        req,
      })
    } catch {
      // PostgreSQL rollback removes the row; this compensates only if a row leaked.
    }
    await Promise.all(effect.files.map((file: string) => fs.rm(file, { force: true })))
  }
}

const assertRequiredTransaction = async (req: PayloadRequest) => {
  const transactionStarted = await initTransaction(req)
  if (!transactionStarted || !req.transactionID) {
    throw new Error('Database adapter did not start the required credentials import transaction')
  }
  return transactionStarted
}

const verifyCurrentAfter = ({
  homes,
  manifest,
  media,
  plan,
}: {
  homes: CredentialHomeSnapshot[]
  manifest: WingsSideCredentialManifest
  media: CredentialMediaSnapshot[]
  plan: WingsSideCredentialsPlan
}) => {
  const snapshot = classifyWingsSideCredentialsState({
    homes,
    manifest,
    media,
    siteID: plan.siteID,
  })
  if (snapshot.state !== 'after') {
    throw new Error(`Credentials import verification failed before commit: ${snapshot.state}`)
  }
  return snapshot
}

export const applyWingsSideCredentialsProductionPlan = async ({
  failAfterCreates,
  failAfterPageUpdates,
  loadSnapshot,
  manifest,
  payload,
  plan,
  req,
}: {
  failAfterCreates?: number
  failAfterPageUpdates?: number
  loadSnapshot: () => Promise<{ homes: CredentialHomeSnapshot[]; media: CredentialMediaSnapshot[] }>
  manifest: WingsSideCredentialManifest
  payload: Payload
  plan: WingsSideCredentialsPlan
  req: PayloadRequest
}) => {
  const originalPageVersions = payload.collections.pages.config.versions
  const uploadEffects: UploadFileEffect[] = []
  let transactionStarted = false
  let creates = 0
  let pageUpdates = 0

  try {
    payload.collections.pages.config.versions = false as never
    transactionStarted = await assertRequiredTransaction(req)

    const initial = await loadSnapshot()
    const initialState = classifyWingsSideCredentialsState({
      homes: initial.homes,
      manifest,
      media: initial.media,
      siteID: plan.siteID,
    }).state
    if (initialState !== 'before') {
      throw new Error(`Credentials apply refused: expected before, observed ${initialState}`)
    }

    const mediaIDs = new Map<string, number | string>()
    for (const operation of plan.mediaOperations) {
      const item = manifest.items.find((candidate) => candidate.id === operation.itemID)
      if (!item) throw new Error(`Missing manifest item ${operation.itemID}`)
      const assetPath = path.join(wingsSideCredentialAssetRoot, item.file)
      const fingerprint = await credentialFileSha256(assetPath)
      if (fingerprint.sha256 !== operation.sha256) {
        throw new Error(`Credential asset checksum drifted before create: ${item.file}`)
      }
      const bytes = await fs.readFile(assetPath)
      const media = (await payload.create({
        collection: 'media',
        context: productionContext,
        data: { alt: item.alt, site: plan.siteID } as never,
        file: { data: bytes, mimetype: 'image/jpeg', name: item.file, size: bytes.byteLength },
        locale: 'vi',
        overrideAccess: true,
        req,
      })) as unknown as Record<string, unknown> & { id: number | string }
      mediaIDs.set(item.id, media.id)
      uploadEffects.push({ files: createdMediaFiles(media), id: media.id })
      creates += 1
      if (failAfterCreates !== undefined && creates >= failAfterCreates) {
        throw new Error(`Injected credentials import failure after ${creates} media create(s)`)
      }
    }

    for (const operation of plan.pageOperations) {
      const currentHome = initial.homes.find((home) => home.locale === operation.locale)
      if (!currentHome || currentHome.layoutChecksum !== operation.beforeChecksum) {
        throw new Error(`Credentials apply refused page drift for locale ${operation.locale}`)
      }
      const layout = [
        ...currentHome.layout.filter(
          (block) =>
            !(
              block &&
              typeof block === 'object' &&
              (block as Record<string, unknown>).blockType === 'credentialsCarousel'
            ),
        ),
        buildWingsSideCredentialsBlock({ locale: operation.locale, manifest, mediaIDs }),
      ]
      await payload.update({
        collection: 'pages',
        context: productionContext,
        data: { layout } as never,
        id: operation.homePageID,
        locale: operation.locale,
        overrideAccess: true,
        req,
      })
      pageUpdates += 1
      if (failAfterPageUpdates !== undefined && pageUpdates >= failAfterPageUpdates) {
        throw new Error(`Injected credentials import failure after ${pageUpdates} page update(s)`)
      }
    }

    const verified = await loadSnapshot()
    verifyCurrentAfter({ homes: verified.homes, manifest, media: verified.media, plan })

    await commitTransaction(req)
  } catch (error) {
    if (transactionStarted && req.transactionID) await killTransaction(req)
    await cleanupCreatedMediaEffects(payload, req, uploadEffects)
    throw error
  } finally {
    payload.collections.pages.config.versions = originalPageVersions
  }

  return { createdMedia: creates, updatedPages: pageUpdates }
}

export const rollbackWingsSideCredentialsProductionPlan = async ({
  loadSnapshot,
  manifest,
  payload,
  plan,
  req,
}: {
  loadSnapshot: () => Promise<{ homes: CredentialHomeSnapshot[]; media: CredentialMediaSnapshot[] }>
  manifest: WingsSideCredentialManifest
  payload: Payload
  plan: WingsSideCredentialsPlan
  req: PayloadRequest
}) => {
  const originalPageVersions = payload.collections.pages.config.versions
  let transactionStarted = false
  let deletedMedia = 0
  let restoredPages = 0

  try {
    payload.collections.pages.config.versions = false as never
    transactionStarted = await assertRequiredTransaction(req)

    const initial = await loadSnapshot()
    const initialSnapshot = verifyCurrentAfter({
      homes: initial.homes,
      manifest,
      media: initial.media,
      plan,
    })
    const mediaByFilename = new Map(
      initialSnapshot.media.map((media) => [String(media.filename), media]),
    )
    const createdMediaIDs = plan.mediaOperations.map((operation) => {
      const media = mediaByFilename.get(operation.file)
      if (!media)
        throw new Error(`Credentials rollback cannot resolve created media ${operation.file}`)
      return media.id
    })

    for (const operation of plan.pageOperations) {
      const currentHome = initial.homes.find((home) => home.locale === operation.locale)
      if (!currentHome) throw new Error(`Missing current Home page for ${operation.locale}`)
      const expectedAfter = afterBlockChecksum({
        locale: operation.locale,
        manifest,
        mediaIDs: new Map(
          manifest.items.map((item) => {
            const media = mediaByFilename.get(item.file)
            if (!media) throw new Error(`Missing Media for ${item.file}`)
            return [item.id, media.id]
          }),
        ),
      })
      const block = (currentHome.layout as unknown[]).find(
        (candidate) =>
          candidate &&
          typeof candidate === 'object' &&
          (candidate as Record<string, unknown>).blockType === 'credentialsCarousel',
      ) as Record<string, unknown> | undefined
      if (
        !block ||
        credentialsChecksum(normalizeCredentialsBlock(block)) !== expectedAfter ||
        layoutChecksum(operation.beforeLayout) !== operation.beforeChecksum
      ) {
        throw new Error(`Credentials rollback refused page drift for locale ${operation.locale}`)
      }
      await payload.update({
        collection: 'pages',
        context: productionContext,
        data: { layout: operation.beforeLayout } as never,
        id: operation.homePageID,
        locale: operation.locale,
        overrideAccess: true,
        req,
      })
      restoredPages += 1
    }

    for (const id of [...createdMediaIDs].reverse()) {
      await payload.delete({
        collection: 'media',
        context: productionContext,
        id,
        overrideAccess: true,
        req,
      })
      deletedMedia += 1
    }

    const verified = await loadSnapshot()
    const state = classifyWingsSideCredentialsState({
      homes: verified.homes,
      manifest,
      media: verified.media,
      siteID: plan.siteID,
    }).state
    if (state !== 'before') {
      throw new Error(`Credentials rollback verification failed before commit: ${state}`)
    }

    await commitTransaction(req)
  } catch (error) {
    if (transactionStarted && req.transactionID) await killTransaction(req)
    throw error
  } finally {
    payload.collections.pages.config.versions = originalPageVersions
  }

  return { deletedMedia, restoredPages }
}

export const verifyPlanBeforeChecksums = ({
  homes,
  plan,
}: {
  homes: CredentialHomeSnapshot[]
  plan: WingsSideCredentialsPlan
}) => {
  for (const operation of plan.pageOperations) {
    const home = homes.find((candidate) => candidate.locale === operation.locale)
    if (!home) throw new Error(`Missing Home page for ${operation.locale}`)
    if (String(home.id) !== String(operation.homePageID)) {
      throw new Error(`Home page ID drifted for ${operation.locale}`)
    }
    if (operation.beforeChecksum !== layoutChecksum(operation.beforeLayout)) {
      throw new Error(`Plan before layout checksum mismatch for ${operation.locale}`)
    }
  }
}
