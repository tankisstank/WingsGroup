import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'

const localSQLiteRelationColumns = [
  'tour_products_id',
  'tour_departures_id',
  'tour_campaigns_id',
  'departure_variants_id',
] as const

const toSQLitePath = (databaseURL: string) => {
  if (!databaseURL.startsWith('file:')) {
    return null
  }

  const rawPath = databaseURL.replace(/^file:/, '')

  return path.resolve(process.cwd(), rawPath)
}

export const repairLocalSQLiteSchema = async (databaseURL: string) => {
  const sqlitePath = toSQLitePath(databaseURL)

  if (!sqlitePath || !fs.existsSync(sqlitePath)) {
    return
  }

  const db = new DatabaseSync(sqlitePath)

  try {
    const tableRow = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'payload_locked_documents_rels'",
      )
      .get() as { name?: string } | undefined

    if (!tableRow?.name) {
      return
    }

    const tableInfo = db.prepare("PRAGMA table_info('payload_locked_documents_rels')").all() as Array<{
      name?: string
    }>
    const existingColumns = new Set(tableInfo.map((column) => column.name).filter(Boolean))

    for (const column of localSQLiteRelationColumns) {
      if (!existingColumns.has(column)) {
        db.exec(`ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "${column}" INTEGER;`)
      }

      db.exec(
        `CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_${column}_idx" ON "payload_locked_documents_rels" ("${column}");`,
      )
    }
  } finally {
    db.close()
  }
}
