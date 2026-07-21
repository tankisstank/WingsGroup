/**
 * Idempotent WingSide hi-fi content seed for the 8 hub routes.
 *
 * Tranche A: dry-run / report only. No data mutation.
 *
 * Default is offline/pure (Copy.ts contract) — never boots Payload, never hangs on DB.
 *
 * Usage:
 *   pnpm run seed:wingsside:hifi-content
 *   pnpm run seed:wingsside:hifi-content -- --locale=en --json
 *   pnpm run seed:wingsside:hifi-content -- --offline --locale=en
 *   pnpm run seed:wingsside:hifi-content -- --db --locale=en
 */
import 'dotenv/config'

import {
  buildWingsSideHiFiContentSeedDryRun,
  formatWingsSideHiFiSeedReport,
  type WingsSideHiFiSeedLocale,
  type WingsSideHiFiSeedMode,
  type WingsSideHiFiSeedPayload,
} from './lib/wingssideHiFiContentSeed'

const parseArgs = (argv: string[]) => {
  const localeArg = argv.find((arg) => arg.startsWith('--locale='))?.split('=')[1]
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
) => {
  if (json) {
    console.log(JSON.stringify(report, null, 2))
  } else {
    console.log(formatWingsSideHiFiSeedReport(report))
  }
}

const main = async () => {
  const args = parseArgs(process.argv.slice(2))

  if (args.apply) {
    console.error(
      'Apply/mutate mode is not enabled in tranche A. Re-run without --apply for dry-run report only.',
    )
    process.exitCode = 2
    return
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
    const { getPayload } = await import('payload')
    const config = (await import('@payload-config')).default
    payload = (await getPayload({ config })) as WingsSideHiFiSeedPayload

    const report = await buildWingsSideHiFiContentSeedDryRun({
      locale: args.locale,
      mode: 'db',
      payload,
    })
    printReport(report, args.json)
  } catch (error) {
    console.error('DB dry-run failed:', error instanceof Error ? error.message : error)
    process.exitCode = 1
  } finally {
    await destroyPayload(payload)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
