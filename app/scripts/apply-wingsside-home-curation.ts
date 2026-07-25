import 'dotenv/config'

import { createLocalReq, getPayload, type Payload } from 'payload'

import config from '../src/payload.config'
import {
  hydrateWingsSideHomeCuration,
  projectWingsSideHomeCuration,
} from '../src/tours/homeCuration'
import {
  auditWingsSideHomeCuration,
  relationID,
  wingsSideHomeCuration,
  wingsSideHomeCurationSiteCode,
} from './lib/wingsSideHomeCuration'

type Mode = 'apply' | 'audit' | 'dry-run'

const mode = (): Mode => {
  const selected = (['--apply', '--audit', '--dry-run'] as const).filter((flag) => process.argv.includes(flag))
  if (selected.length > 1) throw new Error('Choose at most one of --apply, --audit, or --dry-run.')
  return selected[0] === '--apply' ? 'apply' : selected[0] === '--audit' ? 'audit' : 'dry-run'
}

const assertLocalWriteGate = (payload: Payload, selectedMode: Mode) => {
  if (selectedMode !== 'apply') return
  if (process.argv.includes('--confirm') === false || !process.argv.includes('--environment=local')) {
    throw new Error('Apply requires --confirm and --environment=local.')
  }
  if (process.env.NODE_ENV === 'production' || payload.db.name !== 'sqlite') {
    throw new Error('WingSide Home curation apply is restricted to the local SQLite bootstrap only.')
  }
}

const main = async () => {
  const selectedMode = mode()
  const payload = await getPayload({ config })
  try {
    assertLocalWriteGate(payload, selectedMode)
    const siteResult = await payload.find({
      collection: 'sites',
      depth: 0,
      limit: 2,
      overrideAccess: true,
      pagination: false,
      where: { code: { equals: wingsSideHomeCurationSiteCode } },
    })
    if (siteResult.docs.length !== 1) throw new Error('Expected exactly one WingSide site.')
    const site = siteResult.docs[0]
    const adminResult = await payload.find({
      collection: 'users', depth: 0, limit: 2, overrideAccess: true, pagination: false,
      where: { email: { equals: process.env.IMPORT_ADMIN_EMAIL || 'local-admin@wingsgroup.test' } },
    })
    const admin = adminResult.docs[0]
    if (!admin) throw new Error('Local curation audit requires the local bootstrap administrator.')
    const req = await createLocalReq({ user: admin }, payload)
    const homePages = await payload.find({
      collection: 'pages',
      depth: 3,
      limit: 2,
      overrideAccess: true,
      pagination: false,
      req,
      where: {
        and: [
          { site: { equals: site.id } },
          { 'wingsSideHiFi.enabled': { equals: true } },
          { 'wingsSideHiFi.routeVariant': { equals: 'home' } },
        ],
      },
    })
    if (homePages.docs.length !== 1) {
      throw new Error(
        `Expected exactly one enabled WingSide Home page, found ${homePages.docs.length}.`,
      )
    }
    let homePage = homePages.docs[0]
    const selectedTourIDs = [...new Set([
      ...wingsSideHomeCuration.destinationTourSelections.map(({ tour }) => tour),
      ...wingsSideHomeCuration.styleTourSelections.map(({ tour }) => tour),
      ...wingsSideHomeCuration.featuredJourneySelections.map(({ tour }) => tour),
    ])]
    const toursResult = await payload.find({
      collection: 'tour-products', depth: 0, limit: selectedTourIDs.length, overrideAccess: true,
      pagination: false, req, locale: 'en', fallbackLocale: false,
      where: { id: { in: selectedTourIDs } },
    })
    const tours = new Map(toursResult.docs.map((tour) => [String(tour.id), tour]))
    const wrapperIDs = toursResult.docs.map((tour) => relationID(tour.wrapperPage)).filter((id): id is number | string => id !== null)
    const heroIDs = toursResult.docs.map((tour) => relationID(tour.heroMedia)).filter((id): id is number | string => id !== null)
    const [wrappers, media] = await Promise.all([
      payload.find({ collection: 'pages', depth: 0, limit: wrapperIDs.length, overrideAccess: true, pagination: false, req, where: { id: { in: wrapperIDs } } }),
      payload.find({ collection: 'media', depth: 0, limit: heroIDs.length, overrideAccess: true, pagination: false, req, where: { id: { in: heroIDs } } }),
    ])
    let audit = auditWingsSideHomeCuration({
      actual: (homePage.wingsSideHiFi as { home?: unknown } | undefined)?.home as never,
      homePage,
      mediaIDs: new Set(media.docs.map(({ id }) => String(id))),
      siteID: site.id,
      tours,
      wrapperSiteIDs: new Map(wrappers.docs.map((page) => [String(page.id), relationID(page.site)!])),
    })
    if (!audit.ok) throw new Error(`Curation eligibility failed: ${audit.findings.join(' ')}`)
    if (selectedMode === 'audit' && !audit.matchesApprovedSelections) {
      throw new Error('Curation audit failed: current selections differ from the approved selection set.')
    }

    const action = audit.matchesApprovedSelections ? 'unchanged' : selectedMode === 'apply' ? 'update' : 'would-update'
    if (selectedMode === 'apply' && !audit.matchesApprovedSelections) {
      await payload.update({
        collection: 'pages',
        context: { disableRevalidate: true },
        id: homePage.id,
        data: {
          wingsSideHiFi: {
            ...(homePage.wingsSideHiFi || {}),
            home: wingsSideHomeCuration,
          },
        },
        overrideAccess: true,
        req,
      })
      homePage = await payload.findByID({
        collection: 'pages',
        depth: 3,
        id: homePage.id,
        overrideAccess: true,
        req,
      })
      audit = auditWingsSideHomeCuration({
        actual: (homePage.wingsSideHiFi as { home?: unknown } | undefined)?.home as never,
        homePage,
        mediaIDs: new Set(media.docs.map(({ id }) => String(id))),
        siteID: site.id,
        tours,
        wrapperSiteIDs: new Map(wrappers.docs.map((page) => [String(page.id), relationID(page.site)!])),
      })
      if (!audit.ok || !audit.matchesApprovedSelections) {
        throw new Error(
          `Curation post-apply audit failed: ${[
            ...audit.findings,
            ...(audit.matchesApprovedSelections ? [] : ['Approved selections were not persisted.']),
          ].join(' ')}`,
        )
      }
    }
    const homeForProjection =
      audit.matchesApprovedSelections
        ? (homePage.wingsSideHiFi as { home?: unknown } | undefined)?.home
        : wingsSideHomeCuration
    const localeProjections = Object.fromEntries(
      await Promise.all(
        (['en', 'vi', 'it', 'es', 'pt'] as const).map(async (locale) => {
          const hydratedHome = await hydrateWingsSideHomeCuration({
            home: homeForProjection as never,
            locale,
            pageSite: site.id,
            payload,
          })
          return [
            locale,
            projectWingsSideHomeCuration({
              home: hydratedHome,
              locale,
              pageSite: site.id,
            }),
          ] as const
        }),
      ),
    )
    const failedLocales = Object.entries(localeProjections).filter(
      ([, localeProjection]) => localeProjection.state === 'invalid',
    )
    if (failedLocales.length) {
      throw new Error(
        `Curation runtime projection failed: ${failedLocales
          .map(([locale, localeProjection]) => `${locale}: ${localeProjection.issues.join(' ')}`)
          .join(' | ')}`,
      )
    }
    const projection = localeProjections.en
    console.log(
      JSON.stringify(
        { action, audit, localeProjections, mode: selectedMode, projection, siteID: site.id },
        null,
        2,
      ),
    )
  } finally {
    await payload.destroy()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
