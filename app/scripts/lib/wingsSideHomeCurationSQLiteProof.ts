import { DatabaseSync } from 'node:sqlite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { repairLocalSQLiteSchema } from '@/utilities/repairLocalSQLiteSchema'

const databaseURL = process.env.DATABASE_URL

if (!databaseURL?.startsWith('file:')) {
  throw new Error('Usage: DATABASE_URL=file:///... tsx wingsSideHomeCurationSQLiteProof.ts')
}

await repairLocalSQLiteSchema(databaseURL)

const databasePath = databaseURL.startsWith('file://')
  ? fileURLToPath(databaseURL)
  : path.resolve(process.cwd(), databaseURL.replace(/^file:/, ''))
const db = new DatabaseSync(databasePath)
try {
  // Exercise a real query on the repaired parent table as well as the new
  // relationship tables. Payload/Drizzle full-schema push is covered
  // separately and is intentionally not part of this focused repair proof.
  db.prepare('SELECT id FROM pages LIMIT 1').all()
  const rows = db
    .prepare(
      `SELECT name FROM sqlite_master
         WHERE type = 'table' AND name IN ('home_dest_tours', 'home_style_tours', 'home_featured_tours', '_home_dest_tours_v', '_home_style_tours_v', '_home_featured_tours_v')
         ORDER BY name`,
    )
    .all() as Array<{ name: string }>
  const expected = [
    '_home_dest_tours_v',
    '_home_featured_tours_v',
    '_home_style_tours_v',
    'home_dest_tours',
    'home_featured_tours',
    'home_style_tours',
  ]
  if (JSON.stringify(rows.map(({ name }) => name)) !== JSON.stringify(expected)) {
    throw new Error(`Unexpected SQLite curation tables: ${JSON.stringify(rows)}`)
  }
} finally {
  db.close()
}
