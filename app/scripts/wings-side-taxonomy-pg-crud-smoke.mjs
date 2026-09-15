#!/usr/bin/env node
import process from 'node:process'

import { runPostgresCrudSmoke } from './lib/postgresCrudSmokeLifecycle.mjs'

const image = 'postgres:16-alpine'
const container = `wings-taxonomy-crud-${Date.now()}`
const user = 'smoke'
const password = 'smoke'
const database = 'wings_taxonomy_crud'
async function main() {
  await runPostgresCrudSmoke({
    container,
    database,
    environment: {
      NEXT_PUBLIC_SERVER_URL: 'http://127.0.0.1:3000',
      NODE_OPTIONS: '--no-deprecation',
      PAYLOAD_DB_PUSH: 'false',
      PAYLOAD_SECRET: 'taxonomy-crud-smoke-secret',
    },
    environmentFailureMessage: 'Docker is required for PostgreSQL taxonomy CRUD proof',
    image,
    migrationFailureMessage: 'Taxonomy PostgreSQL migration failed',
    proof: {
      args: ['exec', 'tsx', 'scripts/lib/wingsSideTaxonomyPgCrudProof.ts'],
      successMessage: '[taxonomy-pg-crud] PASS: empty→head migration and scoped has-many CRUD',
    },
    proofFailureMessage: 'Taxonomy PostgreSQL CRUD proof failed',
    password,
    user,
  })
}

main().catch((error) => {
  console.error(error)
  process.exitCode = error.exitCode ?? 1
})
