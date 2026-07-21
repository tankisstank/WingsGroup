#!/usr/bin/env node
/**
 * Isolated local SQLite bootstrap smoke for wingsSideHiFi tables.
 *
 * Supplemental only (decision 0007 local bootstrap via repairLocalSQLiteSchema).
 * Does NOT replace the production PostgreSQL migration proof:
 *   pnpm run db:migrate:smoke
 *
 * Usage (from app/):
 *   node --import tsx/esm scripts/sqlite-hifi-schema-smoke.mjs [baseline.db]
 */
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { DatabaseSync } from 'node:sqlite'

const appRoot = process.cwd()
const source =
  process.argv[2] ||
  (fs.existsSync(path.join(appRoot, 'payload-tourplatform.db'))
    ? path.join(appRoot, 'payload-tourplatform.db')
    : null)
const outDir = path.join(appRoot, 'artifacts', 'tmp')
fs.mkdirSync(outDir, { recursive: true })
const target = path.join(outDir, `hifi-sqlite-bootstrap-smoke-${Date.now()}.db`)

if (!source || !fs.existsSync(source)) {
  console.error('FAIL: need a baseline sqlite file (arg1 or payload-tourplatform.db)')
  process.exit(2)
}

fs.copyFileSync(source, target)

{
  const db = new DatabaseSync(target)
  const tables = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%wings_side_hi_fi%'",
    )
    .all()
  for (const row of tables) {
    db.exec(`DROP TABLE IF EXISTS "${row.name}"`)
  }
  db.close()
}

const { repairLocalSQLiteSchema } = await import(
  pathToFileURL(path.join(appRoot, 'src/utilities/repairLocalSQLiteSchema.ts')).href
)
await repairLocalSQLiteSchema(`file:${target.replace(/\\/g, '/')}`)

const db = new DatabaseSync(target)
const required = [
  'pages_wings_side_hi_fi_home_pillars',
  'pages_wings_side_hi_fi_home_pillars_locales',
  'pages_wings_side_hi_fi_packages_cards',
  '_pages_v_version_wings_side_hi_fi_home_pillars',
]
const missing = required.filter(
  (name) =>
    !db.prepare('SELECT name FROM sqlite_master WHERE type=? AND name=?').get('table', name)?.name,
)
const pageCols = new Set(db.prepare('PRAGMA table_info("pages")').all().map((c) => c.name))
const hasEnabled = pageCols.has('wings_side_hi_fi_enabled')
const count = db
  .prepare(
    "SELECT COUNT(*) AS c FROM sqlite_master WHERE type='table' AND name LIKE '%wings_side_hi_fi%'",
  )
  .get().c

const result = {
  role: 'local-sqlite-bootstrap-supplemental',
  productionMigration: '20260721_180000_wings_side_hifi_page_contract',
  productionProof: 'pnpm run db:migrate:smoke',
  target,
  missing,
  hasEnabled,
  hifiTableCount: count,
  ok: missing.length === 0 && hasEnabled && count >= 80,
}
console.log(JSON.stringify(result, null, 2))
process.exit(result.ok ? 0 : 1)
