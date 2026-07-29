import {
  commitTransaction,
  initTransaction,
  killTransaction,
  type Payload,
  type PayloadRequest,
} from 'payload'
import { sql } from '@payloadcms/db-postgres'

import type { Page, TourProduct } from '../../src/payload-types'
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
  buildEditorialWrapperRestoreData,
  buildEditorialWrapperWriteData,
  buildWingsSideTourEditorialPlan,
  editorialChecksum,
  editorialRelationID,
  normalizeWingsSideEnglishCommercialArrays,
  snapshotEditorialOwnedFields,
  snapshotEditorialSharedServices,
  snapshotEditorialWrapperFields,
  wingsSideTourEditorialExpectedTourCount,
  type WingsSideTourEditorialPlan,
} from './wingsSideTourEditorialProduction'

const productionContext = {
  ...wingsSideLocalizationBackfillContext,
  releaseOperation: 'wingsside-tour-editorial-production-import',
}

const commercialCardinalitiesFromCatalog = (catalog: WingsSideTourEditorialCatalog) =>
  new Map(
    catalog.tours.map((tour) => {
      const approved = tour.locales.vi
      for (const locale of wingsSideTourEditorialLocales) {
        const candidate = tour.locales[locale]
        if (
          candidate.includes.length !== approved.includes.length ||
          candidate.excludes.length !== approved.excludes.length
        ) {
          throw new Error(`Approved commercial cardinality conflict for ${tour.slug}`)
        }
      }
      return [tour.slug, { excludes: approved.excludes.length, includes: approved.includes.length }]
    }),
  )

type ProductionInventory = {
  beforeByKey: Map<string, TourProduct>
  siteID: number | string
  sourceTours: TourProduct[]
  sourceWrappers: Map<string, Page>
  wrapperBeforeByKey: Map<string, Page>
  wrapperPageIDs: Map<string, number | string>
}

type MutableField = {
  fields?: MutableField[]
  localized?: boolean
  name?: string
  required?: boolean
  tabs?: Array<{ fields?: MutableField[] }>
}

const relaxLocalizedWrapperRequirements = (payload: Payload) => {
  const restored: Array<() => void> = []
  const visit = (fields: MutableField[]) => {
    for (const field of fields) {
      if (
        field.localized &&
        (field.name === 'title' || field.name === 'layout') &&
        field.required
      ) {
        const required = field.required
        field.required = false
        restored.push(() => {
          field.required = required
        })
      }
      if (field.fields) visit(field.fields)
      for (const tab of field.tabs || []) {
        if (tab.fields) visit(tab.fields)
      }
    }
  }
  visit(payload.collections.pages.config.fields as MutableField[])
  return () => {
    for (const restore of restored.reverse()) restore()
  }
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

const findWrapper = async ({
  locale,
  payload,
  req,
  wrapperPageID,
}: {
  locale: WingsSideTourEditorialLocale
  payload: Payload
  req: PayloadRequest
  wrapperPageID: number | string
}): Promise<Page> => {
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
  if (!page || String(page.id) !== String(wrapperPageID)) {
    throw new Error(`Missing ${locale} wrapper page ${wrapperPageID}`)
  }
  return page
}

export const loadWingsSideTourEditorialProductionInventory = async ({
  commercialCardinalities,
  payload,
  req,
}: {
  commercialCardinalities: Map<string, { excludes: number; includes: number }>
  payload: Payload
  req: PayloadRequest
}): Promise<ProductionInventory> => {
  const siteID = await findSiteID(payload, req)
  const sourceTours = normalizeWingsSideEnglishCommercialArrays({
    cardinalities: commercialCardinalities,
    sourceTours: await findTours({ locale: 'en', payload, req, siteID }),
  })
  if (sourceTours.length !== wingsSideTourEditorialExpectedTourCount) {
    throw new Error(
      `Expected exactly 22 published WingSide English tours, found ${sourceTours.length}`,
    )
  }
  const sourceSlugs = sourceTours.map(({ slug }) => slug).sort()
  if (new Set(sourceSlugs).size !== sourceSlugs.length) {
    throw new Error('Published WingSide English tour slugs are not unique')
  }

  const wrapperPageIDs = new Map<string, number | string>()
  const sourceWrappers = new Map<string, Page>()
  for (const source of sourceTours) {
    const wrapperPageID = editorialRelationID(source.wrapperPage)
    if (wrapperPageID === null) throw new Error(`English tour has no wrapper page: ${source.slug}`)
    wrapperPageIDs.set(source.slug, wrapperPageID)
    const wrapper = await findWrapper({
      locale: 'en' as WingsSideTourEditorialLocale,
      payload,
      req,
      wrapperPageID,
    })
    if (
      wrapper._status !== 'published' ||
      typeof wrapper.title !== 'string' ||
      !wrapper.title.trim() ||
      !Array.isArray(wrapper.layout)
    ) {
      throw new Error(`Invalid published English wrapper page ${wrapperPageID}`)
    }
    sourceWrappers.set(source.slug, wrapper)
  }

  const beforeByKey = new Map<string, TourProduct>()
  const wrapperBeforeByKey = new Map<string, Page>()
  for (const locale of wingsSideTourEditorialLocales) {
    const localizedTours = await findTours({ locale, payload, req, siteID })
    const localizedBySlug = new Map(localizedTours.map((tour) => [tour.slug, tour]))
    if (
      localizedTours.length !== sourceTours.length ||
      localizedTours.some((tour) => !sourceSlugs.includes(tour.slug)) ||
      sourceTours.some((source) => !localizedBySlug.has(source.slug))
    ) {
      throw new Error(
        `Published ${locale} tour inventory does not match the 22 English source tours`,
      )
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
      const wrapper = await findWrapper({ locale, payload, req, wrapperPageID })
      beforeByKey.set(`${locale}:${source.slug}`, localized)
      wrapperBeforeByKey.set(`${locale}:${source.slug}`, wrapper)
    }
  }
  return {
    beforeByKey,
    siteID,
    sourceTours,
    sourceWrappers,
    wrapperBeforeByKey,
    wrapperPageIDs,
  }
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
  const inventory = await loadWingsSideTourEditorialProductionInventory({
    commercialCardinalities: commercialCardinalitiesFromCatalog(catalog),
    payload,
    req,
  })
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
    sourceWrappers: inventory.sourceWrappers,
    wrapperBeforeByKey: inventory.wrapperBeforeByKey,
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
  for (const entry of plan.sharedServiceEntries) {
    const source = inventory.sourceTours.find(({ slug }) => slug === entry.slug)
    if (!source || String(source.id) !== String(entry.tourID)) {
      throw new Error(`Production shared service identity drift for ${entry.slug}`)
    }
  }
}

export const verifyWingsSideTourEditorialProductionPlan = async ({
  catalog,
  expectedState,
  payload,
  plan,
  req,
}: {
  catalog: WingsSideTourEditorialCatalog
  expectedState: 'after' | 'before'
  payload: Payload
  plan: WingsSideTourEditorialPlan
  req: PayloadRequest
}) => {
  const inventory = await loadWingsSideTourEditorialProductionInventory({
    commercialCardinalities: commercialCardinalitiesFromCatalog(catalog),
    payload,
    req,
  })
  assertPlanMatchesInventory({ inventory, plan })
  const mismatches: string[] = []
  for (const entry of plan.sharedServiceEntries) {
    const current = inventory.sourceTours.find(({ slug }) => slug === entry.slug)!
    const actual = editorialChecksum(snapshotEditorialSharedServices(current))
    const expected = expectedState === 'after' ? entry.afterChecksum : entry.beforeChecksum
    if (actual !== expected) mismatches.push(`en:${entry.slug}:shared-services`)
  }
  for (const entry of plan.entries) {
    const current = inventory.beforeByKey.get(`${entry.locale}:${entry.slug}`)!
    const currentWrapper = inventory.wrapperBeforeByKey.get(`${entry.locale}:${entry.slug}`)!
    const actual = editorialChecksum({
      tour: snapshotEditorialOwnedFields(current),
      wrapper: snapshotEditorialWrapperFields(currentWrapper),
    })
    const expected = expectedState === 'after' ? entry.afterChecksum : entry.beforeChecksum
    if (actual !== expected) mismatches.push(`${entry.locale}:${entry.slug}`)
  }
  if (mismatches.length) {
    throw new Error(
      `Editorial ${expectedState} verification failed for ${mismatches.length} entries: ${mismatches.join(', ')}`,
    )
  }
  return {
    checked: plan.entries.length + plan.sharedServiceEntries.length,
    state: expectedState,
  }
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
  const originalPageVersions = payload.collections.pages.config.versions
  let restoreWrapperRequirements = () => {}
  let transactionStarted = false
  let sharedUnchanged = 0
  let sharedUpdated = 0
  let updated = 0
  let unchanged = 0
  try {
    payload.collections['tour-products'].config.versions = false as never
    payload.collections.pages.config.versions = false as never
    if (direction === 'rollback') {
      restoreWrapperRequirements = relaxLocalizedWrapperRequirements(payload)
    }
    transactionStarted = await initTransaction(req)
    if (!transactionStarted || !req.transactionID) {
      throw new Error('Database adapter did not start the required tour editorial transaction')
    }
    const inventory = await loadWingsSideTourEditorialProductionInventory({
      commercialCardinalities: commercialCardinalitiesFromCatalog(catalog),
      payload,
      req,
    })
    assertPlanMatchesInventory({ inventory, plan })
    const sharedStates = new Set(
      plan.sharedServiceEntries.map((entry) => {
        const current = inventory.sourceTours.find(({ slug }) => slug === entry.slug)!
        const checksum = editorialChecksum(snapshotEditorialSharedServices(current))
        if (checksum === entry.beforeChecksum) return 'before'
        if (checksum === entry.afterChecksum) return 'after'
        throw new Error(`Editorial ${direction} refused shared service drift for ${entry.slug}`)
      }),
    )
    if (sharedStates.size !== 1) {
      throw new Error(`Editorial ${direction} refused mixed shared service state`)
    }
    if (direction === 'apply' && sharedStates.has('before')) {
      assertWingsSideTourEditorialCatalog({ catalog, sourceTours: inventory.sourceTours })
    }
    const catalogBySlug = new Map(catalog.tours.map((entry) => [entry.slug, entry]))

    const mutateSharedServices = async () => {
      const latestInventory = await loadWingsSideTourEditorialProductionInventory({
        commercialCardinalities: commercialCardinalitiesFromCatalog(catalog),
        payload,
        req,
      })
      for (const entry of plan.sharedServiceEntries) {
        const current = latestInventory.sourceTours.find(({ slug }) => slug === entry.slug)!
        const currentChecksum = editorialChecksum(snapshotEditorialSharedServices(current))
        const toChecksum = direction === 'apply' ? entry.afterChecksum : entry.beforeChecksum
        if (currentChecksum === toChecksum) {
          sharedUnchanged += 1
          continue
        }
        const target = direction === 'apply' ? entry.after : entry.before
        const db = (payload as unknown as { db?: typeof payload.db }).db as
          | (typeof payload.db & {
              sessions?: Record<string, { db: { execute: (query: unknown) => Promise<unknown> } }>
            })
          | undefined
        const transactionID = await req.transactionID
        const transaction = transactionID && db?.sessions?.[String(transactionID)]?.db
        if (transaction) {
          const includes = Array.isArray(target.includes)
            ? (target.includes as Array<{ id?: number | string; label?: unknown }>)
            : []
          const excludes = Array.isArray(target.excludes)
            ? (target.excludes as Array<{ id?: number | string; label?: unknown }>)
            : []
          for (const item of includes) {
            if (item.id === undefined || typeof item.label !== 'string') continue
            await transaction.execute(
              sql`UPDATE "tour_products_includes_locales" SET "label" = ${item.label} WHERE "_locale" = 'en' AND "_parent_id" = ${item.id}`,
          )
          await transaction.execute(
            sql`INSERT INTO "tour_products_includes_locales" ("label", "_locale", "_parent_id") SELECT ${item.label}, 'en', ${item.id} WHERE NOT EXISTS (SELECT 1 FROM "tour_products_includes_locales" WHERE "_locale" = 'en' AND "_parent_id" = ${item.id})`,
            )
          }
          for (const item of excludes) {
            if (item.id === undefined || typeof item.label !== 'string') continue
            await transaction.execute(
              sql`UPDATE "tour_products_excludes_locales" SET "label" = ${item.label} WHERE "_locale" = 'en' AND "_parent_id" = ${item.id}`,
          )
          await transaction.execute(
            sql`INSERT INTO "tour_products_excludes_locales" ("label", "_locale", "_parent_id") SELECT ${item.label}, 'en', ${item.id} WHERE NOT EXISTS (SELECT 1 FROM "tour_products_excludes_locales" WHERE "_locale" = 'en' AND "_parent_id" = ${item.id})`,
            )
          }
        } else {
          await payload.update({
            collection: 'tour-products',
            context: productionContext,
            data: {
              excludes: target.excludes,
              includes: target.includes,
            } as never,
            id: entry.tourID,
            locale: 'en',
            fallbackLocale: false,
            overrideAccess: true,
            req,
          })
        }
        sharedUpdated += 1
      }
    }

    const mutateLocalizedEntries = async () => {
      for (const entry of plan.entries) {
        const current = inventory.beforeByKey.get(`${entry.locale}:${entry.slug}`)!
        const currentWrapper = inventory.wrapperBeforeByKey.get(`${entry.locale}:${entry.slug}`)!
        const currentChecksum = editorialChecksum({
          tour: snapshotEditorialOwnedFields(current),
          wrapper: snapshotEditorialWrapperFields(currentWrapper),
        })
        const fromChecksum = direction === 'apply' ? entry.beforeChecksum : entry.afterChecksum
        const toChecksum = direction === 'apply' ? entry.afterChecksum : entry.beforeChecksum
        if (currentChecksum === toChecksum) {
          unchanged += 1
          continue
        }
        if (currentChecksum !== fromChecksum) {
          throw new Error(`Editorial ${direction} refused drift for ${entry.locale}:${entry.slug}`)
        }
        const sourceWrapper = inventory.sourceWrappers.get(entry.slug)!
        const content = catalogBySlug.get(entry.slug)!.locales[entry.locale]
        const target = direction === 'apply' ? entry.after : entry.before
        const data = buildEditorialRestoreData({ before: target, source: current })
        const wrapperData =
          direction === 'apply'
            ? buildEditorialWrapperWriteData({ content, source: sourceWrapper })
            : buildEditorialWrapperRestoreData({
                before: entry.wrapperBefore,
                source: sourceWrapper,
              })
        await payload.update({
          collection: 'pages',
          context: productionContext,
          data: wrapperData as never,
          id: entry.wrapperPageID,
          locale: entry.locale,
          fallbackLocale: false,
          overrideAccess: true,
          req,
        })
        await payload.update({
          collection: 'tour-products',
          context: productionContext,
          data: data as never,
          id: entry.tourID,
          locale: entry.locale,
          fallbackLocale: false,
          overrideAccess: true,
          req,
        })
        updated += 1
        if (failAfterUpdates !== undefined && updated >= failAfterUpdates) {
          throw new Error(`Injected tour editorial failure after ${updated} update(s)`)
        }
      }
    }

    await mutateLocalizedEntries()
    await mutateSharedServices()

    await verifyWingsSideTourEditorialProductionPlan({
      catalog,
      expectedState: direction === 'apply' ? 'after' : 'before',
      payload,
      plan,
      req,
    })
    await commitTransaction(req)
    return { sharedUnchanged, sharedUpdated, unchanged, updated }
  } catch (error) {
    if (transactionStarted && req.transactionID) await killTransaction(req)
    throw error
  } finally {
    payload.collections['tour-products'].config.versions = originalVersions
    payload.collections.pages.config.versions = originalPageVersions
    restoreWrapperRequirements()
  }
}

export const applyWingsSideTourEditorialProductionPlan = (
  input: Omit<Parameters<typeof mutatePlan>[0], 'direction'>,
) => mutatePlan({ ...input, direction: 'apply' })

export const rollbackWingsSideTourEditorialProductionPlan = (
  input: Omit<Parameters<typeof mutatePlan>[0], 'direction'>,
) => mutatePlan({ ...input, direction: 'rollback' })
