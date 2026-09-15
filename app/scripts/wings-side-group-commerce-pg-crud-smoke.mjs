#!/usr/bin/env node
import process from 'node:process'

import { runPostgresCrudSmoke } from './lib/postgresCrudSmokeLifecycle.mjs'

const image = 'postgres:16-alpine'
const container = `wings-group-commerce-crud-${Date.now()}`
const user = 'smoke'
const password = 'smoke'
const database = 'wings_group_commerce_crud'
async function main() {
  await runPostgresCrudSmoke({
    container,
    database,
    environment: {
      NEXT_PUBLIC_SERVER_URL: 'http://127.0.0.1:3000',
      NODE_OPTIONS: '--no-deprecation',
      PAYLOAD_DB_PUSH: 'false',
      PAYLOAD_SECRET: 'group-commerce-crud-smoke-secret',
    },
    environmentFailureMessage: 'Docker is required for PostgreSQL group-commerce CRUD proof',
    image,
    migrationFailureMessage: 'Group-commerce PostgreSQL migration failed',
    proof: {
      args: ['exec', 'tsx', 'scripts/lib/wingsSideGroupCommercePgCrudProof.ts'],
      successMessage:
        '[group-commerce-pg-crud] PASS: exact 22-tour canary/full apply→verify→rollback',
    },
    proofFailureMessage: 'Group-commerce PostgreSQL CRUD proof failed',
    password,
    user,
  })
}

main().catch((error) => {
  console.error(error)
  process.exitCode = error.exitCode ?? 1
})
