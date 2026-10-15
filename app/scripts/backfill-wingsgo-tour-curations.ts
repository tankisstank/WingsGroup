import 'dotenv/config'
import configPromise from '@payload-config'
import { createLocalReq, getPayload } from 'payload'

type Relation = number | string | { id?: number | string | null } | null | undefined

const relationID = (value: Relation): number | string | undefined => {
  if (typeof value === 'number' || typeof value === 'string') return value
  if (value && typeof value === 'object' && 'id' in value && value.id != null) return value.id
  return undefined
}

const relationIDs = (value: unknown): Array<number | string> =>
  (Array.isArray(value) ? value : [])
    .map((item) => relationID(item as Relation))
    .filter((id): id is number | string => id !== undefined)

async function run() {
  console.log('[Backfill] Initializing Payload CMS...')
  const payload = await getPayload({ config: configPromise })

  const admins = await payload.find({
    collection: 'users',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    where: {
      role: { equals: 'super-admin' },
    },
  })
  const adminUser = admins.docs[0] || { id: 1, role: 'super-admin' }
  const req = await createLocalReq({ context: { seed: true }, user: adminUser as never }, payload)

  const sitesResult = await payload.find({
    collection: 'sites',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    req,
    where: {
      code: { equals: 'wings-go' },
    },
  })

  const wingsGoSite = sitesResult.docs[0]
  if (!wingsGoSite) {
    console.error('[Backfill] WingsGo site not found!')
    process.exit(1)
  }

  console.log(`[Backfill] Found WingsGo site (ID: ${wingsGoSite.id})`)

  // Check if default curation already exists
  const existingCurations = await payload.find({
    collection: 'tour-curations',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    where: {
      and: [
        { site: { equals: wingsGoSite.id } },
        { isDefault: { equals: true } },
      ],
    },
  })

  if (existingCurations.docs.length > 0) {
    const existing = existingCurations.docs[0] as any
    console.log(`[Backfill] Default TourCurations record exists: "${existing.name}" (ID: ${existing.id}).`)

    const existingTourIDs = relationIDs(existing.featuredTours)
    if (existingTourIDs.length === 0) {
      console.log(`[Backfill] Existing default curation has 0 tours. Reconciling from /tour page legacy or active products...`)
      const legacyPages = await payload.find({
        collection: 'pages',
        depth: 1,
        limit: 1,
        overrideAccess: true,
        where: {
          and: [
            { site: { equals: wingsGoSite.id } },
            { pathname: { equals: '/tour' } },
          ],
        },
      })
      let legacyTours = relationIDs((legacyPages.docs[0] as any)?.wingsGoTourCatalog?.featuredTours)
      if (legacyTours.length === 0) {
        const productsResult = await payload.find({
          collection: 'tour-products',
          depth: 0,
          limit: 6,
          overrideAccess: true,
          where: {
            and: [
              { site: { equals: wingsGoSite.id } },
              { _status: { equals: 'published' } },
            ],
          },
        })
        legacyTours = productsResult.docs.map((p) => p.id)
      }
      if (legacyTours.length > 0) {
        await payload.update({
          collection: 'tour-curations',
          id: existing.id,
          context: { seed: true },
          data: {
            featuredTours: legacyTours,
          } as any,
          overrideAccess: true,
          req,
        })
        console.log(`[Backfill] Reconciled ${legacyTours.length} tours into default curation ${existing.id}.`)
      }
    }

    // Ensure page /tour is enabled and linked to this curation
    const pagesResult = await payload.find({
      collection: 'pages',
      depth: 0,
      limit: 1,
      overrideAccess: true,
      req,
      where: {
        and: [
          { site: { equals: wingsGoSite.id } },
          { pathname: { equals: '/tour' } },
        ],
      },
    })
    const catalogPage = pagesResult.docs[0]
    if (catalogPage && (catalogPage as any).wingsGoTourCatalog?.curation !== existing.id) {
      await payload.update({
        collection: 'pages',
        id: catalogPage.id,
        context: { seed: true, disableRevalidate: true },
        data: {
          wingsGoTourCatalog: {
            ...((catalogPage as any).wingsGoTourCatalog || {}),
            enabled: true,
            curation: existing.id,
          },
        } as any,
        overrideAccess: true,
        req,
      })
      console.log(`[Backfill] Successfully linked curation ${existing.id} and enabled catalog on page /tour.`)
    }

    process.exit(0)
  }

  // Find page /tour
  const pagesResult = await payload.find({
    collection: 'pages',
    depth: 1,
    limit: 1,
    overrideAccess: true,
    where: {
      and: [
        { site: { equals: wingsGoSite.id } },
        { pathname: { equals: '/tour' } },
      ],
    },
  })

  const catalogPage = pagesResult.docs[0]
  if (!catalogPage) {
    console.warn('[Backfill] /tour page not found. Creating empty default curation.')
  }

  let legacyTours = relationIDs((catalogPage as any)?.wingsGoTourCatalog?.featuredTours)
  if (legacyTours.length === 0) {
    const productsResult = await payload.find({
      collection: 'tour-products',
      depth: 0,
      limit: 6,
      overrideAccess: true,
      where: {
        and: [
          { site: { equals: wingsGoSite.id } },
          { _status: { equals: 'published' } },
        ],
      },
    })
    legacyTours = productsResult.docs.map((p) => p.id)
  }
  console.log(`[Backfill] Selected ${legacyTours.length} featured tours for WingsGo:`, legacyTours)

  // Create default TourCurations record
  const newCuration = (await payload.create({
    collection: 'tour-curations',
    context: { seed: true },
    data: {
      name: 'Tour nổi bật mặc định WingsGo',
      isDefault: true,
      site: wingsGoSite.id,
      featuredTours: legacyTours,
      description: 'Bộ sưu tập tour mặc định được chuyển đổi tự động từ trang /tour (US-078 Level 3+).',
    } as any,
    overrideAccess: true,
    req,
  })) as any

  console.log(`[Backfill] Created default TourCurations record with ID: ${newCuration.id}`)

  // Bind to page /tour
  if (catalogPage) {
    await payload.update({
      collection: 'pages',
      id: catalogPage.id,
      context: { seed: true },
      data: {
        wingsGoTourCatalog: {
          ...((catalogPage as any).wingsGoTourCatalog || {}),
          curation: newCuration.id,
        },
      } as any,
      overrideAccess: true,
      req,
    })
    console.log(`[Backfill] Successfully linked curation ${newCuration.id} to page /tour (ID: ${catalogPage.id})`)
  }

  console.log('[Backfill] Tour curation backfill completed successfully!')
  process.exit(0)
}

run().catch((err) => {
  console.error('[Backfill] Fatal error:', err)
  process.exit(1)
})
