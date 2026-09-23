#!/usr/bin/env node

import { spawnSync } from 'node:child_process'

import { postgresAdapter, sql } from '@payloadcms/db-postgres'

import * as initial from '../src/migrations/20260614_142513.ts'
import * as layoutPresets from '../src/migrations/20260615_170207_layout_preset_library.ts'
import * as heroPresentations from '../src/migrations/20260615_hero_presentations.ts'
import * as favicon from '../src/migrations/20260619_114500_site_settings_favicon_image.ts'
import * as heroPlatform from '../src/migrations/20260623_hero_presentation_platform.ts'

const container = `wings-upgrade-smoke-${Date.now()}`
const image = process.env.UPGRADE_SMOKE_POSTGRES_IMAGE || 'postgres:16-alpine'
const sentinelCode = 'upgrade-proof'
const oldHead = [
  ['20260614_142513', initial],
  ['20260615_170207_layout_preset_library', layoutPresets],
  ['20260615_hero_presentations', heroPresentations],
  ['20260619_114500_site_settings_favicon_image', favicon],
  ['20260620_090000_wings_group_root_site', null],
  ['20260623_hero_presentation_platform', heroPlatform],
]

const run = (command, args, options = {}) =>
  spawnSync(command, args, {
    encoding: 'utf8',
    stdio: options.stdio || 'pipe',
    env: options.env || process.env,
  })

const waitForPostgres = () => {
  const deadline = Date.now() + 60_000
  while (Date.now() < deadline) {
    if (
      run('docker', ['exec', container, 'pg_isready', '-U', 'upgrade', '-d', 'wingstravel_upgrade'])
        .status === 0
    ) {
      return true
    }
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1_000)
  }
  return false
}

const runPayloadMigrate = (databaseURL) => {
  const command = process.platform === 'win32' ? process.env.ComSpec || 'cmd.exe' : 'pnpm'
  const args =
    process.platform === 'win32'
      ? ['/d', '/s', '/c', 'pnpm exec payload migrate']
      : ['exec', 'payload', 'migrate']
  const result = spawnSync(command, args, {
    env: {
      ...process.env,
      DATABASE_URL: databaseURL,
      PAYLOAD_DB_PUSH: 'false',
      PAYLOAD_SECRET: 'upgrade-smoke-only',
    },
    stdio: 'inherit',
  })

  if (result.error) console.error('[upgrade-smoke] Could not start Payload migrate:', result.error)
  return result.status ?? 1
}

const createDatabase = async (databaseURL) => {
  const logger = {
    error: console.error,
    info: () => undefined,
    warn: console.warn,
  }

  for (let attempt = 1; attempt <= 10; attempt += 1) {
    const adapterFactory = postgresAdapter({
      pool: { connectionString: databaseURL },
      push: false,
    })
    const adapter = adapterFactory.init({ payload: { logger } })

    try {
      await adapter.connect()
      return adapter
    } catch (error) {
      if (attempt === 10) throw error
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1_000)
    }
  }

  throw new Error('Could not connect to PostgreSQL')
}

let adapter
let exitCode = 1

try {
  const started = run('docker', [
    'run',
    '--detach',
    '--name',
    container,
    '--env',
    'POSTGRES_USER=upgrade',
    '--env',
    'POSTGRES_PASSWORD=upgrade',
    '--env',
    'POSTGRES_DB=wingstravel_upgrade',
    '--publish',
    '127.0.0.1::5432',
    image,
  ])
  if (started.status !== 0) throw new Error(started.stderr || 'Could not start PostgreSQL')
  if (!waitForPostgres()) throw new Error('PostgreSQL did not become ready')

  const port = run('docker', ['port', container, '5432/tcp']).stdout.trim().match(/:(\d+)$/)?.[1]
  if (!port) throw new Error('Could not resolve PostgreSQL port')
  const databaseURL = `postgresql://upgrade:upgrade@127.0.0.1:${port}/wingstravel_upgrade`

  adapter = await createDatabase(databaseURL)
  console.log('[upgrade-smoke] Applying pre-head migration set')
  for (const [name, migration] of oldHead) {
    if (migration) {
      await migration.up({ db: adapter.drizzle })
    } else {
      // This historical migration splits an enum change across Payload-managed
      // transactions. The smoke database is empty, so only its schema effect is
      // required before recording the historical migration as applied.
      await adapter.drizzle.execute(sql`
        ALTER TYPE "public"."enum_site_settings_branding_theme_key"
        ADD VALUE IF NOT EXISTS 'wings-group'
      `)
    }
    await adapter.drizzle.execute(
      sql`INSERT INTO payload_migrations (name, batch) VALUES (${name}, 1)`,
    )
  }

  await adapter.drizzle.execute(sql`
    INSERT INTO sites (name, code, primary_domain, default_locale, is_active)
    VALUES ('Upgrade Proof', ${sentinelCode}, 'upgrade-proof.invalid', 'vi', true)
  `)
  const before = await adapter.drizzle.execute(
    sql`SELECT count(*)::int AS count FROM sites WHERE code = ${sentinelCode}`,
  )
  const beforeSiteRows = await adapter.drizzle.execute(sql`SELECT count(*)::int AS count FROM sites`)

  // Keep one synthetic legacy submission in the pre-head database so an
  // additive lead migration is proven against an existing row, not only an
  // empty table. This record exists only inside the disposable smoke DB.
  const form = await adapter.drizzle.execute(sql`
    INSERT INTO forms (site_id, title)
    VALUES ((SELECT id FROM sites WHERE code = ${sentinelCode}), 'Upgrade Proof Form')
    RETURNING id
  `)
  const formID = Number(form.rows?.[0]?.id)
  if (!Number.isInteger(formID)) throw new Error('Could not create pre-head form sentinel')

  const submission = await adapter.drizzle.execute(sql`
    INSERT INTO form_submissions (site_id, form_id)
    VALUES ((SELECT id FROM sites WHERE code = ${sentinelCode}), ${formID})
    RETURNING id
  `)
  const submissionID = Number(submission.rows?.[0]?.id)
  if (!Number.isInteger(submissionID)) throw new Error('Could not create pre-head submission sentinel')

  if ((before.rows?.[0]?.count ?? 0) !== 1) throw new Error('Could not create pre-head sentinel')
  const siteRowsBefore = Number(beforeSiteRows.rows?.[0]?.count ?? 0)
  console.log(
    `[upgrade-smoke] Baseline rows: sites=${siteRowsBefore}, sentinel=${before.rows?.[0]?.count ?? 0}`,
  )
  console.log('[upgrade-smoke] Applying current head over pre-head data')
  if (runPayloadMigrate(databaseURL) !== 0) throw new Error('Head migration failed')

  const after = await adapter.drizzle.execute(sql`
    SELECT count(*)::int AS count
    FROM sites
    WHERE code = ${sentinelCode}
      AND name = 'Upgrade Proof'
      AND primary_domain = 'upgrade-proof.invalid'
  `)
  const tourTables = await adapter.drizzle.execute(sql`
    SELECT count(*)::int AS count
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('tour_products', 'departure_variants', 'tour_departures', 'tour_campaigns')
  `)
  const afterSiteRows = await adapter.drizzle.execute(sql`SELECT count(*)::int AS count FROM sites`)
  const afterSubmission = await adapter.drizzle.execute(sql`
    SELECT count(*)::int AS count
    FROM form_submissions
    WHERE id = ${submissionID}
      AND site_id = (SELECT id FROM sites WHERE code = ${sentinelCode})
      AND form_id = ${formID}
      AND sales_status IS NULL
      AND assigned_to_id IS NULL
      AND sales_note IS NULL
      AND sales_triage_version = 0
  `)
  const siteRowsAfter = Number(afterSiteRows.rows?.[0]?.count ?? 0)

  if ((after.rows?.[0]?.count ?? 0) !== 1) throw new Error('Pre-head sentinel changed or disappeared')
  if (siteRowsAfter !== siteRowsBefore) {
    throw new Error(`Existing site row count changed: before=${siteRowsBefore}, after=${siteRowsAfter}`)
  }
  if ((tourTables.rows?.[0]?.count ?? 0) !== 4) throw new Error('Tour platform tables are incomplete')
  if ((afterSubmission.rows?.[0]?.count ?? 0) !== 1) {
    throw new Error('Existing form submission was changed or additive triage defaults are incorrect')
  }

  console.log(
    `[upgrade-smoke] PASS: sites before=${siteRowsBefore}, after=${siteRowsAfter}, sentinel=1; submission preserved with nullable triage defaults; 4/4 tour tables exist`,
  )
  exitCode = 0
} catch (error) {
  console.error(`[upgrade-smoke] FAIL: ${error instanceof Error ? error.stack : error}`)
} finally {
  run('docker', ['rm', '--force', container])
}

process.exit(exitCode)
