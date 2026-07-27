import {
  commitTransaction,
  initTransaction,
  killTransaction,
  type Payload,
  type PayloadRequest,
} from 'payload'

import type { TourProduct } from '../../src/payload-types'
import { wingsSideLocalizationBackfillContext } from '../../src/utilities/wingsSideLocalizationBackfillContext'
import {
  assertWingsSideTourEditorialCatalog,
  wingsSideTourEditorialLocales,
  type WingsSideTourEditorialCatalog,
  type WingsSideTourEditorialLocale,
} from './wingsSideTourEditorialLocalization'
import {
  assertEditorialPlanShape,
  buildEditorialRestoreData,
  buildEditorialWriteData,
  buildWingsSideTourEditorialPlan,
  editorialChecksum,
  editorialRelationID,
  snapshotEditorialOwnedFields,
  wingsSideTourEditorialExpectedTourCount,
  type WingsSideTourEditorialPlan,
} from './wingsSideTourEditorialProduction'

const productionContext = {
  ...wingsSideLocalizationBackfillContext,
  releaseOperation: 'wingsside-tour-editorial-production-import',
}

type ProductionInventory = {
  beforeByKey: Map<string, TourProduct>
  siteID: number | string
  sourceTours: TourProduct[]
  wrapperPageIDs: Map<string, number | string>
}

const findSiteID = async (payload: Payload, req: PayloadRequest) => {
  const result = await payload.find({
    collection: 'sites',
    depth: 0,
    limit: 2,
    locale: 'en',
    overrideAccess: true,
    pagination: false,
    req,
    where: { code: { equals: 'wing-side' } },
  })
  if (result.docs.length !== 1) throw new Error('Expected exactly one WingSide site')
  return result.docs[0]!.id
}

const findTours = async ({
  locale,
  payload,
  req,
  siteID,
}: {
  locale: 'en' | WingsSideTourEditorialLocale
  payload: Payload
  req: PayloadRequest
  siteID: number | string
}): Promise<TourProduct[]> => {
  const result = await payload.find({
    collection: 'tour-products',
    depth: 0,
    draft: false,
    fallbackLocale: false,
    limit: 100,
    locale,
    overrideAccess: true,
    pagination: false,
    req,
    sort: 'slug',
    where: {
      and: [{ site: { equals: siteID } }, { _status: { equals: 'published' } }],
    },
  })
  return result.docs as TourProduct[]
}

const assertLocalizedWrapper = async ({
  locale,
  payload,
  req,
  wrapperPageID,
}: {
  locale: WingsSideTourEditorialLocale
  payload: Payload
  req: PayloadRequest
  wrapperPageID: number | string
}) => {
  const page = await payload.findByID({
    collection: 'pages',
    depth: 0,
    draft: false,
    fallbackLocale: false,
    id: wrapperPageID,
    locale,
    overrideAccess: true,
    req,
  })
  if (
    !page ||
    page._status !== 'published' ||
    typeof page.title !== 'string' ||
    !page.title.trim()
  ) {
    throw new Error(`Missing published ${locale} wrapper page ${wrapperPageID}`)
  }
}

export const loadWingsSideTourEditorialProductionInventory = async ({
  payload,
  req,
}: {
  payload: Payload
  req: PayloadRequest
}): Promise<ProductionInventory> => {
  const siteID = await findSiteID(payload, req)
  const sourceTours = await findTours({ locale: 'en', payload, req, siteID })
  if (sourceTours.length !== wingsSideTourEditorialExpectedTourCount) {
    throw new Error(`Expected exactly 22 published WingSide English tours, found ${sourceTours.length}`)
  }
  const sourceSlugs = sourceTours.map(({ slug }) => slug).sort()
  if (new Set(sourceSlugs).size !== sourceSlugs.length) {
    throw new Error('Published WingSide English tour slugs are not unique')
  }

  const wrapperPageIDs = new Map<string, number | string>()
  for (const source of sourceTours) {
    const wrapperPageID = editorialRelationID(source.wrapperPage)
    if (wrapperPageID === null) throw new Error(`English tour has no wrapper page: ${source.slug}`)
    wrapperPageIDs.set(source.slug, wrapperPageID)
  }

  const beforeByKey = new Map<string, TourProduct>()
  for (const locale of wingsSideTourEditorialLocales) {
    const localizedTours = await findTours({ locale, payload, req, siteID })
    const localizedBySlug = new Map(localizedTours.map((tour) => [tour.slug, tour]))
    if (
      localizedTours.length !== sourceTours.length ||
      localizedTours.some((tour) => !sourceSlugs.includes(tour.slug)) ||
      sourceTours.some((source) => !localizedBySlug.has(source.slug))
    ) {
      throw new Error(`Published ${locale} tour inventory does not match the 22 English source tours`)
    }
    for (const source of sourceTours) {
      const localized = localizedBySlug.get(source.slug)!
      if (
        String(localized.id) !== String(source.id) ||
        String(editorialRelationID(localized.site)) !== String(siteID)
      ) {
        throw new Error(`Localized tour identity drift for ${locale}:${source.slug}`)
      }
      const wrapperPageID = wrapperPageIDs.get(source.slug)!
      if (String(editorialRelationID(localized.wrapperPage)) !== String(wrapperPageID)) {
        throw new Error(`Localized wrapper relation drift for ${locale}:${source.slug}`)
      }
      await assertLocalizedWrapper({ locale, payload, req, wrapperPageID })
      beforeByKey.set(`${locale}:${source.slug}`, localized)
    }
  }
  return { beforeByKey, siteID, sourceTours, wrapperPageIDs }
}

export const createWingsSideTourEditorialProductionPlan = async ({
  catalog,
  createdAt = new Date().toISOString(),
  payload,
  releaseSourceCommit,
  req,
  runID,
}: {
  catalog: WingsSideTourEditorialCatalog
  createdAt?: string
  payload: Payload
  releaseSourceCommit: string
  req: PayloadRequest
  runID: string
}) => {
  const inventory = await loadWingsSideTourEditorialProductionInventory({ payload, req })
  assertWingsSideTourEditorialCatalog({
    catalog,
    sourceTours: inventory.sourceTours,
  })
  return buildWingsSideTourEditorialPlan({
    beforeByKey: inventory.beforeByKey,
    catalog,
    createdAt,
    releaseSourceCommit,
    runID,
    siteID: inventory.siteID,
    sourceTours: inventory.sourceTours,
    wrapperPageIDs: inventory.wrapperPageIDs,
  })
}

const assertPlanMatchesInventory = ({
  inventory,
  plan,
}: {
  inventory: ProductionInventory
  plan: WingsSideTourEditorialPlan
}) => {
  assertEditorialPlanShape(plan)
  if (String(inventory.siteID) !== String(plan.siteID)) {
    throw new Error('WingSide site ID drifted from the editorial plan')
  }
  for (const entry of plan.entries) {
    const source = inventory.sourceTours.find(({ slug }) => slug === entry.slug)
    if (
      !source ||
      String(source.id) !== String(entry.tourID) ||
      String(inventory.wrapperPageIDs.get(entry.slug)) !== String(entry.wrapperPageID)
    ) {
      throw new Error(`Production identity drift for ${entry.locale}:${entry.slug}`)
    }
  }
}

export const verifyWingsSideTourEditorialProductionPlan = async ({
  expectedState,
  payload,
  plan,
  req,
}: {
  expectedState: 'after' | 'before'
  payload: Payload
  plan: WingsSideTourEditorialPlan
  req: PayloadRequest
}) => {
  const inventory = await loadWingsSideTourEditorialProductionInventory({ payload, req })
  assertPlanMatchesInventory({ inventory, plan })
  const mismatches: string[] = []
  for (const entry of plan.entries) {
    const current = inventory.beforeByKey.get(`${entry.locale}:${entry.slug}`)!
    const actual = editorialChecksum(snapshotEditorialOwnedFields(current))
    const expected = expectedState === 'after' ? entry.afterChecksum : entry.beforeChecksum
    if (actual !== expected) mismatches.push(`${entry.locale}:${entry.slug}`)
  }
  if (mismatches.length) {
    throw new Error(
      `Editorial ${expectedState} verification failed for ${mismatches.length} entries: ${mismatches.join(', ')}`,
    )
  }
  return { checked: plan.entries.length, state: expectedState }
}

const mutatePlan = async ({
  catalog,
  direction,
  failAfterUpdates,
  payload,
  plan,
  req,
}: {
  catalog: WingsSideTourEditorialCatalog
  direction: 'apply' | 'rollback'
  failAfterUpdates?: number
  payload: Payload
  plan: WingsSideTourEditorialPlan
  req: PayloadRequest
}) => {
  const originalVersions = payload.collections['tour-products'].config.versions
  let transactionStarted = false
  let updated = 0
  let unchanged = 0
  try {
    payload.collections['tour-products'].config.versions = false as never
    transactionStarted = await initTransaction(req)
    if (!transactionStarted || !req.transactionID) {
      throw new Error('Database adapter did not start the required tour editorial transaction')
    }
    const inventory = await loadWingsSideTourEditorialProductionInventory({ payload, req })
    assertPlanMatchesInventory({ inventory, plan })
    assertWingsSideTourEditorialCatalog({ catalog, sourceTours: inventory.sourceTours })
    const catalogBySlug = new Map(catalog.tours.map((entry) => [entry.slug, entry]))

    for (const entry of plan.entries) {
      const current = inventory.beforeByKey.get(`${entry.locale}:${entry.slug}`)!
      const currentChecksum = editorialChecksum(snapshotEditorialOwnedFields(current))
      const fromChecksum = direction === 'apply' ? entry.beforeChecksum : entry.afterChecksum
      const toChecksum = direction === 'apply' ? entry.afterChecksum : entry.beforeChecksum
      if (currentChecksum === toChecksum) {
        unchanged += 1
        continue
      }
      if (currentChecksum !== fromChecksum) {
        throw new Error(`Editorial ${direction} refused drift for ${entry.locale}:${entry.slug}`)
      }
      const source = inventory.sourceTours.find(({ slug }) => slug === entry.slug)!
      const data =
        direction === 'apply'
          ? buildEditorialWriteData({
              content: catalogBySlug.get(entry.slug)!.locales[entry.locale],
              source,
            })
          : buildEditorialRestoreData({ before: entry.before, source })
      await payload.update({
        collection: 'tour-products',
        context: productionContext,
        data: data as never,
        id: entry.tourID,
        locale: entry.locale,
        overrideAccess: true,
        req,
      })
      updated += 1
      if (failAfterUpdates !== undefined && updated >= failAfterUpdates) {
        throw new Error(`Injected tour editorial failure after ${updated} update(s)`)
      }
    }

    await verifyWingsSideTourEditorialProductionPlan({
      expectedState: direction === 'apply' ? 'after' : 'before',
      payload,
      plan,
      req,
    })
    await commitTransaction(req)
    return { unchanged, updated }
  } catch (error) {
    if (transactionStarted && req.transactionID) await killTransaction(req)
    throw error
  } finally {
    payload.collections['tour-products'].config.versions = originalVersions
  }
}

export const applyWingsSideTourEditorialProductionPlan = (
  input: Omit<Parameters<typeof mutatePlan>[0], 'direction'>,
) => mutatePlan({ ...input, direction: 'apply' })

export const rollbackWingsSideTourEditorialProductionPlan = (
  input: Omit<Parameters<typeof mutatePlan>[0], 'direction'>,
) => mutatePlan({ ...input, direction: 'rollback' })
