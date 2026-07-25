import 'dotenv/config'

import { createLocalReq, getPayload } from 'payload'

import config from '../src/payload.config'
import {
  hydrateWingsSideHomeCuration,
  projectWingsSideHomeCuration,
} from '../src/tours/homeCuration'
import {
  auditWingsSideHomeCuration,
  relationID,
  resolveWingsSideHomeCuration,
  wingsSideHomeCurationSourceIDs,
  wingsSideHomeCurationSiteCode,
} from './lib/wingsSideHomeCuration'
import {
  assertHomeCurationWriteGate,
  homeCurationDatabaseName,
  parseHomeCurationCLIArgs,
} from './lib/wingsSideHomeCurationWriteGate'

type Mode = 'apply' | 'audit' | 'dry-run'

const mode = (): Mode => {
  const selected = (['--apply', '--audit', '--dry-run'] as const).filter((flag) => process.argv.includes(flag))
  if (selected.length > 1) throw new Error('Choose at most one of --apply, --audit, or --dry-run.')
  return selected[0] === '--apply' ? 'apply' : selected[0] === '--audit' ? 'audit' : 'dry-run'
}

const main = async () => {
  const selectedMode = mode()
  const cliArgs = parseHomeCurationCLIArgs(process.argv.slice(2))
  const preflightGate = assertHomeCurationWriteGate({
    args: cliArgs,
    databaseName: homeCurationDatabaseName(process.env.DATABASE_URL),
    mode: selectedMode,
  })
  const payload = await getPayload({ config })
  try {
    const writeGate = assertHomeCurationWriteGate({
      args: cliArgs,
      databaseName: payload.db.name,
      mode: selectedMode,
    })
    if (
      preflightGate.environment !== writeGate.environment ||
      preflightGate.productionMutation !== writeGate.productionMutation
    ) {
      throw new Error('Write blocked: Home curation database changed after preflight.')
    }
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
    const operatorEmail =
      cliArgs.adminEmail ||
      process.env.IMPORT_ADMIN_EMAIL ||
      'local-admin@wingsgroup.test'
    const admin = writeGate.productionMutation
      ? (
          await payload.login({
            collection: 'users',
            data: {
              email: operatorEmail,
              password: process.env.ADMIN_PASSWORD || '',
            },
          })
        ).user
      : (
          await payload.find({
            collection: 'users',
            depth: 0,
            limit: 2,
            overrideAccess: true,
            pagination: false,
            where: { email: { equals: operatorEmail } },
          })
        ).docs[0]
    if (!admin) throw new Error('Curation operation requires an authenticated administrator.')
    if (writeGate.productionMutation && admin.role !== 'super-admin') {
      throw new Error('Production curation operator must authenticate as a super-admin.')
    }
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
    const toursResult = await payload.find({
      collection: 'tour-products',
      depth: 0,
      limit: wingsSideHomeCurationSourceIDs.length + 1,
      overrideAccess: true,
      pagination: false,
      req,
      locale: 'en',
      fallbackLocale: false,
      where: {
        and: [
          { site: { equals: site.id } },
          { 'sourceProvenance.sourceId': { in: wingsSideHomeCurationSourceIDs } },
        ],
      },
    })
    const sourceIDToTourID = new Map<string, number | string>()
    for (const tour of toursResult.docs) {
      const provenance = tour.sourceProvenance as { sourceId?: unknown } | null | undefined
      if (typeof provenance?.sourceId === 'string') sourceIDToTourID.set(provenance.sourceId, tour.id)
    }
    if (
      toursResult.docs.length !== wingsSideHomeCurationSourceIDs.length ||
      sourceIDToTourID.size !== wingsSideHomeCurationSourceIDs.length
    ) {
      throw new Error(
        `Expected exactly ${wingsSideHomeCurationSourceIDs.length} unique approved WingSide tour sources, found ${toursResult.docs.length}.`,
      )
    }
    const approvedCuration = resolveWingsSideHomeCuration(sourceIDToTourID)
    const tours = new Map(toursResult.docs.map((tour) => [String(tour.id), tour]))
    const wrapperIDs = toursResult.docs.map((tour) => relationID(tour.wrapperPage)).filter((id): id is number | string => id !== null)
    const heroIDs = toursResult.docs.map((tour) => relationID(tour.heroMedia)).filter((id): id is number | string => id !== null)
    const [wrappers, media] = await Promise.all([
      payload.find({ collection: 'pages', depth: 0, limit: wrapperIDs.length, overrideAccess: true, pagination: false, req, where: { id: { in: wrapperIDs } } }),
      payload.find({ collection: 'media', depth: 0, limit: heroIDs.length, overrideAccess: true, pagination: false, req, where: { id: { in: heroIDs } } }),
    ])
    let audit = auditWingsSideHomeCuration({
      actual: (homePage.wingsSideHiFi as { home?: unknown } | undefined)?.home as never,
      approved: approvedCuration,
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
            home: approvedCuration,
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
        approved: approvedCuration,
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
        : approvedCuration
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

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
