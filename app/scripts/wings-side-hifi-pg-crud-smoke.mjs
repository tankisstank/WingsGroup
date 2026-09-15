#!/usr/bin/env node
/**
 * Ephemeral PostgreSQL proof for wingsSideHiFi:
 * 1) empty → head migrations (includes 20260721_180000_wings_side_hifi_page_contract)
 * 2) Payload create/read/update of one page with nested localized arrays in EN + VI
 *
 * Usage (from app/):
 *   node scripts/wings-side-hifi-pg-crud-smoke.mjs
 */
import process from 'node:process'

import { runPostgresCrudSmoke } from './lib/postgresCrudSmokeLifecycle.mjs'

const PG_IMAGE = 'postgres:16-alpine'
const PG_CONTAINER = `wings-hifi-crud-${Date.now()}`
const PG_USER = 'smoke'
const PG_PASSWORD = 'smoke'
const PG_DB = 'wings_hifi_crud'

const log = (m) => console.log(`[hifi-pg-crud] ${m}`)

async function main() {
  await runPostgresCrudSmoke({
    container: PG_CONTAINER,
    database: PG_DB,
    environment: {
      PAYLOAD_DB_PUSH: 'false',
      PAYLOAD_SECRET: 'hifi-crud-smoke-secret',
      NODE_OPTIONS: '--no-deprecation',
      NEXT_PUBLIC_SERVER_URL: 'http://127.0.0.1:3000',
    },
    environmentExitCode: 2,
    environmentFailureMessage: 'Docker required',
    image: PG_IMAGE,
    log,
    migrationFailureMessage: 'migrate failed',
    onContainerStart: () => log(`starting ${PG_IMAGE}`),
    onMigrationStart: () => log('migrate empty -> head...'),
    onProofStart: () => log('Payload CRUD EN+VI nested arrays...'),
    outputMode: 'forward',
    password: PG_PASSWORD,
    proof: {
      args: ['exec', 'tsx', 'scripts/lib/wingsSideHiFiPgCrudProof.ts'],
      successMessage:
        'PASS: migrate empty→head + Payload create/read/update EN+VI on ephemeral PostgreSQL',
    },
    proofFailureMessage: 'CRUD proof failed',
    user: PG_USER,
    waitForReady: (result) => result.status === 0 && /accepting connections/.test(result.stdout),
  })
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(e.exitCode ?? 2)
  })
