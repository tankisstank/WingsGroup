import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'

const localSQLiteRelationColumns = [
  'tour_products_id',
  'tour_departures_id',
  'tour_campaigns_id',
  'departure_variants_id',
] as const

const localSQLiteTableRenames = [
  {
    from: 'tour_products_services_summary_important_notes',
    to: 'tour_products_services_summary_notes',
  },
  {
    from: 'tour_products_services_summary_important_notes_locales',
    to: 'tour_products_services_summary_notes_locales',
  },
  {
    from: '_tour_products_v_version_services_summary_important_notes',
    to: '_tour_products_v_version_services_summary_notes',
  },
  {
    from: '_tour_products_v_version_services_summary_important_notes_locales',
    to: '_tour_products_v_version_services_summary_notes_locales',
  },
] as const

const localSQLiteColumnRepairs = [
  {
    table: 'pages_blocks_testimonial_items',
    columns: [
      ['country', 'TEXT'],
      ['note_date', 'TEXT'],
    ],
  },
  {
    table: '_pages_v_blocks_testimonial_items',
    columns: [
      ['country', 'TEXT'],
      ['note_date', 'TEXT'],
    ],
  },
  {
    table: 'form_submissions',
    columns: [
      ['delivery_status', "TEXT NOT NULL DEFAULT 'pending'"],
      ['delivery_updated_at', 'TEXT'],
      ['delivery_error_code', 'TEXT'],
    ],
  },
  {
    table: 'tour_products',
    columns: [
      ['source_provenance', 'TEXT'],
      ['price_from', 'NUMERIC'],
      ['currency', "TEXT DEFAULT 'USD'"],
    ],
  },
  {
    table: '_tour_products_v',
    columns: [
      ['version_source_provenance', 'TEXT'],
      ['version_price_from', 'NUMERIC'],
      ['version_currency', "TEXT DEFAULT 'USD'"],
    ],
  },
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
    for (const { from, to } of localSQLiteTableRenames) {
      const fromTable = db
        .prepare('SELECT name FROM sqlite_master WHERE type = ? AND name = ?')
        .get('table', from) as { name?: string } | undefined
      const toTable = db
        .prepare('SELECT name FROM sqlite_master WHERE type = ? AND name = ?')
        .get('table', to) as { name?: string } | undefined

      if (fromTable?.name && !toTable?.name) {
        db.exec(`ALTER TABLE "${from}" RENAME TO "${to}";`)
      }
    }

    for (const { table, columns } of localSQLiteColumnRepairs) {
      const tableRow = db
        .prepare('SELECT name FROM sqlite_master WHERE type = ? AND name = ?')
        .get('table', table) as { name?: string } | undefined

      if (!tableRow?.name) continue

      const tableInfo = db.prepare(`PRAGMA table_info("${table}")`).all() as Array<{
        name?: string
      }>
      const existingColumns = new Set(tableInfo.map((column) => column.name).filter(Boolean))

      for (const [column, type] of columns) {
        if (!existingColumns.has(column)) {
          db.exec(`ALTER TABLE "${table}" ADD COLUMN "${column}" ${type};`)
        }
      }
    }

    const tableRow = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'payload_locked_documents_rels'",
      )
      .get() as { name?: string } | undefined

    if (!tableRow?.name) {
      return
    }

    const tableInfo = db
      .prepare("PRAGMA table_info('payload_locked_documents_rels')")
      .all() as Array<{
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
