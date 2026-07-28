import 'dotenv/config'

import config from '../src/payload.config'
import { createLocalReq, getPayload } from 'payload'

import {
  assertWingsSideTourEditorialCatalog,
  loadWingsSideTourEditorialCatalog,
  wingsSideTourEditorialLocales,
  type EditorialSourceTour,
} from './lib/wingsSideTourEditorialLocalization'
import {
  assertDisposablePostgresTarget,
  loadFrozenSourceSnapshot,
} from './lib/wingsSideUs055Rehearsal.mjs'

const requiredConfirmation = 'disposable-postgres'
const adminEmail = 'wingsside-tour-editorial-rehearsal@internal.invalid'
const context = { disableRevalidate: true, rehearsal: true }
const wrapperLayout = [{ blockType: 'content' as const, columns: [] }]

const argumentValue = (name: string): string | undefined => {
  const inline = process.argv.find((argument) => argument.startsWith(`${name}=`))
  if (inline) return inline.slice(name.length + 1)
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : undefined
}

const assertDisposableDatabase = () => {
  if (process.env.WINGSSIDE_TOUR_EDITORIAL_REHEARSAL_ALLOW !== requiredConfirmation) {
    throw new Error(
      `Rehearsal seed requires WINGSSIDE_TOUR_EDITORIAL_REHEARSAL_ALLOW=${requiredConfirmation}`,
    )
  }
  if (process.env.PAYLOAD_DB_PUSH !== 'false') {
    throw new Error('Rehearsal seed requires PAYLOAD_DB_PUSH=false')
  }
  assertDisposablePostgresTarget(String(process.env.DATABASE_URL || ''))
}

const localizedBeforeData = (source: Record<string, unknown>, locale: string) => ({
  excludes: Array.isArray(source.excludes)
    ? source.excludes.map((item) => ({
        ...(item as Record<string, unknown>),
        label: `[BEFORE ${locale}] ${String((item as Record<string, unknown>).label || '')}`,
      }))
    : [],
  factSummary: {
    ...((source.factSummary as Record<string, unknown> | undefined) || {}),
    routeSummary: `[BEFORE ${locale}] route`,
  },
  includes: Array.isArray(source.includes)
    ? source.includes.map((item) => ({
        ...(item as Record<string, unknown>),
        label: `[BEFORE ${locale}] ${String((item as Record<string, unknown>).label || '')}`,
      }))
    : [],
  itineraryDays: Array.isArray(source.itineraryDays)
    ? source.itineraryDays.map((item) => {
        const day = item as Record<string, unknown>
        return {
          ...day,
          route: `[BEFORE ${locale}] ${String(day.route || '')}`,
          summary: `[BEFORE ${locale}] ${String(day.summary || '')}`,
          title: `[BEFORE ${locale}] ${String(day.title || '')}`,
        }
      })
    : [],
  meta: {
    breadcrumbLabel: `[BEFORE ${locale}] ${String(source.title || '')}`,
    description: `[BEFORE ${locale}] ${String(source.summary || '')}`,
    title: `[BEFORE ${locale}] ${String(source.title || '')}`,
  },
  primaryCTA: {
    ...((source.primaryCTA as Record<string, unknown> | undefined) || {}),
    label: `[BEFORE ${locale}] Plan`,
  },
  servicesSummary: {
    hotelSummary: `[BEFORE ${locale}] Hotels`,
    mealsSummary: `[BEFORE ${locale}] Meals`,
    operatorNotes: `[BEFORE ${locale}] Notes`,
    transportSummary: `[BEFORE ${locale}] Transport`,
  },
  summary: `[BEFORE ${locale}] ${String(source.summary || '')}`,
  title: `[BEFORE ${locale}] ${String(source.title || '')}`,
})

const main = async () => {
  assertDisposableDatabase()
  const sourceSnapshotPath = argumentValue('--source-snapshot')
  if (!sourceSnapshotPath) {
    throw new Error('Rehearsal seed requires --source-snapshot <frozen-source-snapshot-json>')
  }
  const frozenSource = await loadFrozenSourceSnapshot(sourceSnapshotPath)
  const sourceTours = frozenSource.snapshot.tours as Array<
    EditorialSourceTour & Record<string, unknown>
  >
  const catalogPath = argumentValue('--catalog')
  if (catalogPath) {
    const catalog = await loadWingsSideTourEditorialCatalog({ catalogPath, sourceTours })
    assertWingsSideTourEditorialCatalog({ catalog, sourceTours })
  }

  const payload = await getPayload({ config })
  try {
    if (!payload.db.packageName.includes('db-postgres')) {
      throw new Error(`Rehearsal requires PostgreSQL, observed ${payload.db.packageName}`)
    }
    const existingSite = await payload.find({
      collection: 'sites',
      depth: 0,
      limit: 2,
      overrideAccess: true,
      pagination: false,
      where: { code: { equals: 'wing-side' } },
    })
    if (existingSite.docs.length) throw new Error('Disposable rehearsal database is not empty')

    const user = await payload.create({
      collection: 'users',
      context,
      data: {
        email: adminEmail,
        name: 'WingSide Tour Editorial Rehearsal',
        password: 'rehearsal-only-password',
        role: 'super-admin',
      },
      overrideAccess: true,
    })
    const req = await createLocalReq({ user: { ...user, collection: 'users' } as never }, payload)
    const site = await payload.create({
      collection: 'sites',
      context,
      data: {
        code: 'wing-side',
        defaultLocale: 'vi',
        isActive: true,
        name: 'WingSide Rehearsal',
        primaryDomain: 'wingside.vn',
        supportedLocales: ['vi', 'en', 'it', 'es', 'pt'],
      },
      overrideAccess: true,
      req,
    })

    for (const source of sourceTours) {
      const slug = String(source.slug)
      const page = await payload.create({
        collection: 'pages',
        context,
        data: {
          _status: 'published',
          hero: { type: 'none' },
          layout: wrapperLayout,
          meta: {
            breadcrumbLabel: source.title,
            description: source.summary,
            title: source.title,
          },
          pathname: `/tour/${slug}`,
          site: site.id,
          slug: `wing-side-${slug}`,
          title: source.title,
        },
        locale: 'en',
        overrideAccess: true,
        req,
      })
      const product = await payload.create({
        collection: 'tour-products',
        context,
        data: {
          _status: 'published',
          bcfg: source.bcfg || { template: 'dense-retail-default' },
          durationDays: Number(source.itineraryDays?.length || 1),
          durationNights: Math.max(0, Number(source.itineraryDays?.length || 1) - 1),
          excludes: (source.excludes || []).map((item) => ({ id: item.id, label: item.label })),
          factSummary: {
            routeSummary: String(
              (source.factSummary as Record<string, unknown> | undefined)?.routeSummary || '',
            ),
          },
          includes: (source.includes || []).map((item) => ({ id: item.id, label: item.label })),
          itineraryDays: (
            source.itineraryDays?.length
              ? source.itineraryDays
              : [
                  {
                    dayNumber: 1,
                    route: String(source.routeSummary || 'Rehearsal route'),
                    summary: '[BEFORE en] Sealed source inventory rehearsal placeholder',
                    title: '[BEFORE en] Source itinerary',
                  },
                ]
          ).map((day) => ({
            accommodation: day.accommodation,
            dayNumber: day.dayNumber,
            meals: day.meals,
            route: day.route,
            summary: day.summary,
            title: day.title,
            transport: day.transport,
          })),
          market: source.market || 'vietnam',
          meta: {
            breadcrumbLabel: source.title,
            description: source.summary,
            title: source.title,
          },
          primaryCTA: { label: 'Plan my trip', mode: 'inquiry' },
          servicesSummary: {},
          site: site.id,
          slug,
          summary: source.summary,
          title: source.title,
          wrapperPage: page.id,
        } as never,
        locale: 'en',
        overrideAccess: true,
        req,
      })
      const persistedSource = (await payload.findByID({
        collection: 'tour-products',
        depth: 0,
        fallbackLocale: false,
        id: product.id,
        locale: 'en',
        overrideAccess: true,
        req,
      })) as unknown as Record<string, unknown>
      for (const locale of wingsSideTourEditorialLocales) {
        await payload.update({
          collection: 'tour-products',
          context,
          data: localizedBeforeData(persistedSource, locale) as never,
          id: product.id,
          locale,
          overrideAccess: true,
          req,
        })
      }
    }
    console.log(
      JSON.stringify({
        adminEmail,
        adapter: payload.db.packageName,
        locales: 5,
        siteID: site.id,
        tours: sourceTours.length,
        wrapperPages: sourceTours.length,
      }),
    )
  } finally {
    await payload.destroy()
  }
}

void main().then(
  () => process.exit(0),
  (error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  },
)
