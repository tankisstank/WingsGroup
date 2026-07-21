/**
 * Idempotent WingSide hi-fi content seed for the 8 hub routes.
 *
 * Default is offline/pure (Copy.ts contract) — never boots Payload, never hangs on DB.
 *
 * Guarded apply (local SQLite only):
 *   pnpm run seed:wingsside:hifi-content -- --db --site-code=wings-side --apply
 *
 * Dry-run examples:
 *   pnpm run seed:wingsside:hifi-content
 *   pnpm run seed:wingsside:hifi-content -- --locale=en --json
 *   pnpm run seed:wingsside:hifi-content -- --offline --locale=en
 *   pnpm run seed:wingsside:hifi-content -- --db --site-code=wings-side
 */
import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'

import {
  applyWingsSideHiFiContentSeed,
  buildWingsSideHiFiContentSeedDryRun,
  formatWingsSideHiFiSeedReport,
  WINGSSIDE_HIFI_SEED_SITE_CODE,
  type WingsSideHiFiSeedLocale,
  type WingsSideHiFiSeedMode,
  type WingsSideHiFiSeedPayload,
} from './lib/wingssideHiFiContentSeed'

const parseArgs = (argv: string[]) => {
  const localeArg = argv.find((arg) => arg.startsWith('--locale='))?.split('=')[1]
  const siteCodeArg = argv.find((arg) => arg.startsWith('--site-code='))?.split('=')[1]
  const json = argv.includes('--json')
  const apply = argv.includes('--apply')
  const offline = argv.includes('--offline') || argv.includes('--pure')
  const db = argv.includes('--db')
  // Default offline. Explicit --db opts into Payload. --offline/--pure always wins over --db.
  const mode: WingsSideHiFiSeedMode = offline || !db ? 'offline' : 'db'
  return {
    apply,
    json,
    locale: (localeArg as WingsSideHiFiSeedLocale | 'all' | undefined) || 'all',
    mode,
    siteCode: siteCodeArg || undefined,
  }
}

const destroyPayload = async (payload: WingsSideHiFiSeedPayload | null) => {
  if (payload && typeof payload.destroy === 'function') {
    await payload.destroy()
  }
}

const printReport = (
  report: Awaited<ReturnType<typeof buildWingsSideHiFiContentSeedDryRun>>,
  json: boolean,
  applied = false,
) => {
  if (json) {
    console.log(JSON.stringify(report, null, 2))
  } else {
    console.log(formatWingsSideHiFiSeedReport(report, { applied }))
  }
}

/** Only back up local worktree SQLite. Never touch remote/production databases. */
const backupLocalSqliteIfNeeded = (): string | null => {
  const databaseUrl = process.env.DATABASE_URL || ''
  if (!databaseUrl.startsWith('file:')) {
    throw new Error(
      'Apply is only allowed against a local SQLite DATABASE_URL (file:...). Refusing production/remote DB.',
    )
  }

  // Block obvious production markers even if someone points file: at a non-worktree path.
  if (
    process.env.NODE_ENV === 'production' ||
    process.env.VERCEL ||
    process.env.RAILWAY_ENVIRONMENT ||
    /prod|staging|remote/i.test(databaseUrl)
  ) {
    throw new Error('Apply blocked: production/staging environment markers detected.')
  }

  const relative = databaseUrl.replace(/^file:/, '')
  const dbPath = path.isAbsolute(relative)
    ? relative
    : path.resolve(process.cwd(), relative)

  if (!fs.existsSync(dbPath)) {
    throw new Error(`SQLite database not found at ${dbPath}`)
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupPath = `${dbPath}.bak-hifi-${stamp}`
  fs.copyFileSync(dbPath, backupPath)
  console.log(`Backed up local SQLite → ${backupPath}`)
  return backupPath
}

const main = async () => {
  const args = parseArgs(process.argv.slice(2))

  if (args.apply) {
    if (args.mode !== 'db') {
      console.error('Apply requires --db (and an explicit --site-code). Offline mode never mutates.')
      process.exitCode = 2
      return
    }
    if (!args.siteCode) {
      console.error(
        `Apply requires explicit --site-code (expected ${WINGSSIDE_HIFI_SEED_SITE_CODE} for WingSide hi-fi).`,
      )
      process.exitCode = 2
      return
    }
    if (args.siteCode !== WINGSSIDE_HIFI_SEED_SITE_CODE) {
      console.error(
        `Apply refused: site-code "${args.siteCode}" is not ${WINGSSIDE_HIFI_SEED_SITE_CODE}. Other sites are out of scope.`,
      )
      process.exitCode = 2
      return
    }
  }

  if (args.mode === 'offline') {
    const report = await buildWingsSideHiFiContentSeedDryRun({
      locale: args.locale,
      mode: 'offline',
    })
    printReport(report, args.json)
    return
  }

  // DB mode: bootstrap Payload, always destroy in finally, fail cleanly on errors.
  let payload: WingsSideHiFiSeedPayload | null = null
  try {
    let backupPath: string | null = null
    if (args.apply) {
      backupPath = backupLocalSqliteIfNeeded()
    }

    const { createLocalReq, getPayload } = await import('payload')
    const config = (await import('@payload-config')).default
    payload = (await getPayload({ config })) as WingsSideHiFiSeedPayload

    if (args.apply) {
      const { ensureLocalAdminUser } = await import('../src/utilities/adminSeed')
      // Same SQLite-safe guards as locale backfill: version snapshots on pages
      // re-write huge localized block trees and frequently hit "database is locked".
      const pagesCollection = (payload as { collections?: Record<string, { config?: { versions?: unknown } }> })
        .collections?.pages
      if (pagesCollection?.config?.versions) {
        pagesCollection.config.versions = false as never
      }
      const rawUpdate = payload.update!.bind(payload)
      payload.update = ((args: Parameters<NonNullable<WingsSideHiFiSeedPayload['update']>>[0]) =>
        rawUpdate({ ...args, disableTransaction: true } as never)) as typeof payload.update

      const admin = await ensureLocalAdminUser(payload as never)
      const req = await createLocalReq({ user: admin as never }, payload as never)
      req.context = { ...req.context, disableRevalidate: true, seed: true }

      const applyReport = await applyWingsSideHiFiContentSeed({
        locale: args.locale,
        payload,
        req,
        siteCode: args.siteCode!,
      })
      if (args.json) {
        console.log(JSON.stringify({ ...applyReport, backupPath }, null, 2))
      } else {
        console.log(formatWingsSideHiFiSeedReport(applyReport, { applied: true }))
        console.log(`Mutated page/locale rows: ${applyReport.mutatedPages}`)
        if (applyReport.planForm.ok) {
          console.log(
            `Plan form resolved: id=${applyReport.planForm.formId} title="${applyReport.planForm.title}" site=${applyReport.planForm.siteId}`,
          )
        } else {
          console.error(
            `Plan form FAIL-CLOSED: ${applyReport.planForm.reason} — ${applyReport.planForm.detail}`,
          )
          process.exitCode = 1
        }
        if (backupPath) console.log(`Backup: ${backupPath}`)
      }
      return
    }

    const report = await buildWingsSideHiFiContentSeedDryRun({
      locale: args.locale,
      mode: 'db',
      payload,
      siteCode: args.siteCode || WINGSSIDE_HIFI_SEED_SITE_CODE,
    })
    printReport(report, args.json)
  } catch (error) {
    console.error('DB seed failed:', error instanceof Error ? error.message : error)
    process.exitCode = 1
  } finally {
    await destroyPayload(payload)
  }
}

// Force process exit after work — Payload SQLite can leave open handles that
// otherwise hang the CLI after the report is printed (same lifecycle fix as PG CRUD smoke).
main()
  .then(() => {
    process.exit(process.exitCode || 0)
  })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
