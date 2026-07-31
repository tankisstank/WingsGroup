import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { fileURLToPath } from 'node:url'

import {
  getWingsSideHiFiSQLiteCreateTableStatements,
  getWingsSideHiFiSQLiteIndexStatements,
  WINGSSIDE_HIFI_PAGES_COLUMNS,
  WINGSSIDE_HIFI_PAGES_LOCALE_COLUMNS,
} from '@/migrations/data/wingsSideHiFiSchema'

/**
 * Local SQLite bootstrap only (decision 0007).
 * Production/staging schema changes go through PostgreSQL migrations in
 * `src/migrations` and must pass `pnpm run db:migrate:smoke`.
 * This utility must never replace or register as a production migration.
 */

const localSQLiteRelationColumns = [
  'tour_products_id',
  'tour_departures_id',
  'tour_campaigns_id',
  'departure_variants_id',
] as const

const wingsSideHomeCurationSQLiteStatements = [
  `CREATE TABLE IF NOT EXISTS "home_dest_tours" (
    "_order" INTEGER NOT NULL, "_parent_id" INTEGER NOT NULL, "id" TEXT PRIMARY KEY NOT NULL,
    "key" TEXT, "tour_id" INTEGER,
    FOREIGN KEY ("_parent_id") REFERENCES "pages"("id") ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY ("tour_id") REFERENCES "tour_products"("id") ON UPDATE no action ON DELETE set null
  )`,
  `CREATE TABLE IF NOT EXISTS "home_style_tours" (
    "_order" INTEGER NOT NULL, "_parent_id" INTEGER NOT NULL, "id" TEXT PRIMARY KEY NOT NULL,
    "key" TEXT, "tour_id" INTEGER,
    FOREIGN KEY ("_parent_id") REFERENCES "pages"("id") ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY ("tour_id") REFERENCES "tour_products"("id") ON UPDATE no action ON DELETE set null
  )`,
  `CREATE TABLE IF NOT EXISTS "home_featured_tours" (
    "_order" INTEGER NOT NULL, "_parent_id" INTEGER NOT NULL, "id" TEXT PRIMARY KEY NOT NULL,
    "tour_id" INTEGER,
    FOREIGN KEY ("_parent_id") REFERENCES "pages"("id") ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY ("tour_id") REFERENCES "tour_products"("id") ON UPDATE no action ON DELETE set null
  )`,
  `CREATE TABLE IF NOT EXISTS "home_why_tour_slots" (
    "_order" INTEGER NOT NULL, "_parent_id" INTEGER NOT NULL, "id" TEXT PRIMARY KEY NOT NULL,
    "key" TEXT, "selection_mode" TEXT, "tour_id" INTEGER,
    "rule_destination_tag" TEXT, "rule_travel_style" TEXT,
    "rule_min_duration_days" NUMERIC, "rule_max_duration_days" NUMERIC,
    "fallback_tour_id" INTEGER, "presentation_mode" TEXT, "presentation_media_id" INTEGER,
    FOREIGN KEY ("_parent_id") REFERENCES "pages"("id") ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY ("tour_id") REFERENCES "tour_products"("id") ON UPDATE no action ON DELETE set null,
    FOREIGN KEY ("fallback_tour_id") REFERENCES "tour_products"("id") ON UPDATE no action ON DELETE set null,
    FOREIGN KEY ("presentation_media_id") REFERENCES "media"("id") ON UPDATE no action ON DELETE set null
  )`,
  `CREATE TABLE IF NOT EXISTS "home_why_tour_slots_locales" (
    "presentation_badge" TEXT, "presentation_body" TEXT, "presentation_cta_label" TEXT,
    "id" INTEGER PRIMARY KEY NOT NULL, "_locale" TEXT NOT NULL, "_parent_id" TEXT NOT NULL,
    FOREIGN KEY ("_parent_id") REFERENCES "home_why_tour_slots"("id") ON UPDATE no action ON DELETE cascade
  )`,
  `CREATE TABLE IF NOT EXISTS "_home_dest_tours_v" (
    "_order" INTEGER NOT NULL, "_parent_id" INTEGER NOT NULL, "id" INTEGER PRIMARY KEY NOT NULL,
    "_uuid" TEXT, "key" TEXT, "tour_id" INTEGER,
    FOREIGN KEY ("_parent_id") REFERENCES "_pages_v"("id") ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY ("tour_id") REFERENCES "tour_products"("id") ON UPDATE no action ON DELETE set null
  )`,
  `CREATE TABLE IF NOT EXISTS "_home_style_tours_v" (
    "_order" INTEGER NOT NULL, "_parent_id" INTEGER NOT NULL, "id" INTEGER PRIMARY KEY NOT NULL,
    "_uuid" TEXT, "key" TEXT, "tour_id" INTEGER,
    FOREIGN KEY ("_parent_id") REFERENCES "_pages_v"("id") ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY ("tour_id") REFERENCES "tour_products"("id") ON UPDATE no action ON DELETE set null
  )`,
  `CREATE TABLE IF NOT EXISTS "_home_featured_tours_v" (
    "_order" INTEGER NOT NULL, "_parent_id" INTEGER NOT NULL, "id" INTEGER PRIMARY KEY NOT NULL,
    "_uuid" TEXT, "tour_id" INTEGER,
    FOREIGN KEY ("_parent_id") REFERENCES "_pages_v"("id") ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY ("tour_id") REFERENCES "tour_products"("id") ON UPDATE no action ON DELETE set null
  )`,
  `CREATE TABLE IF NOT EXISTS "_home_why_tour_slots_v" (
    "_order" INTEGER NOT NULL, "_parent_id" INTEGER NOT NULL, "id" INTEGER PRIMARY KEY NOT NULL,
    "_uuid" TEXT, "key" TEXT, "selection_mode" TEXT, "tour_id" INTEGER,
    "rule_destination_tag" TEXT, "rule_travel_style" TEXT,
    "rule_min_duration_days" NUMERIC, "rule_max_duration_days" NUMERIC,
    "fallback_tour_id" INTEGER, "presentation_mode" TEXT, "presentation_media_id" INTEGER,
    FOREIGN KEY ("_parent_id") REFERENCES "_pages_v"("id") ON UPDATE no action ON DELETE cascade
  )`,
  `CREATE TABLE IF NOT EXISTS "_home_why_tour_slots_v_locales" (
    "presentation_badge" TEXT, "presentation_body" TEXT, "presentation_cta_label" TEXT,
    "id" INTEGER PRIMARY KEY NOT NULL, "_locale" TEXT NOT NULL, "_parent_id" INTEGER NOT NULL,
    FOREIGN KEY ("_parent_id") REFERENCES "_home_why_tour_slots_v"("id") ON UPDATE no action ON DELETE cascade
  )`,
  ...[
    'home_dest_tours',
    'home_style_tours',
    'home_featured_tours',
    'home_why_tour_slots',
    '_home_dest_tours_v',
    '_home_style_tours_v',
    '_home_featured_tours_v',
    '_home_why_tour_slots_v',
  ].flatMap((table) => [
    `CREATE INDEX IF NOT EXISTS "${table}_order_idx" ON "${table}" ("_order")`,
    `CREATE INDEX IF NOT EXISTS "${table}_parent_id_idx" ON "${table}" ("_parent_id")`,
    `CREATE INDEX IF NOT EXISTS "${table}_tour_idx" ON "${table}" ("tour_id")`,
  ]),
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
      ['enquiry_context_source', 'TEXT'],
      ['enquiry_context_tour_id', 'TEXT'],
      ['enquiry_context_tour_slug', 'TEXT'],
      ['enquiry_context_discovery_destination', 'TEXT'],
      ['enquiry_context_discovery_duration', 'TEXT'],
      ['enquiry_context_discovery_q', 'TEXT'],
      ['enquiry_context_discovery_style', 'TEXT'],
      ['enquiry_context_discovery_type', 'TEXT'],
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
      ['taxonomy_provenance', 'TEXT'],
      ['tour_type', 'TEXT'],
    ],
  },
  {
    table: '_tour_products_v',
    columns: [
      ['version_source_provenance', 'TEXT'],
      ['version_price_from', 'NUMERIC'],
      ['version_currency', "TEXT DEFAULT 'USD'"],
      ['version_taxonomy_provenance', 'TEXT'],
      ['version_tour_type', 'TEXT'],
    ],
  },
  {
    table: 'tour_departures',
    columns: [
      ['price_basis', 'TEXT'],
      ['verified_at', 'TEXT'],
      ['expires_at', 'TEXT'],
      ['inventory_identity', 'TEXT'],
      ['source_provenance_source_system', 'TEXT'],
      ['source_provenance_source_url', 'TEXT'],
      ['source_provenance_source_page_sha256', 'TEXT'],
      ['source_provenance_source_row_sha256', 'TEXT'],
      ['source_provenance_checked_at', 'TEXT'],
      ['source_provenance_managed_by', 'TEXT'],
    ],
  },
  {
    table: '_tour_departures_v',
    columns: [
      ['version_price_basis', 'TEXT'],
      ['version_verified_at', 'TEXT'],
      ['version_expires_at', 'TEXT'],
      ['version_inventory_identity', 'TEXT'],
      ['version_source_provenance_source_system', 'TEXT'],
      ['version_source_provenance_source_url', 'TEXT'],
      ['version_source_provenance_source_page_sha256', 'TEXT'],
      ['version_source_provenance_source_row_sha256', 'TEXT'],
      ['version_source_provenance_checked_at', 'TEXT'],
      ['version_source_provenance_managed_by', 'TEXT'],
    ],
  },
  {
    table: 'pages_blocks_credentials_carousel_items',
    columns: [
      ['review_status', "TEXT DEFAULT 'verified'"],
      ['issuer', 'TEXT'],
      ['recipient', 'TEXT'],
      ['recognition_year', 'NUMERIC'],
      ['issued_on', 'TEXT'],
      ['reference_code', 'TEXT'],
      ['source_filename', 'TEXT'],
    ],
  },
  {
    table: '_pages_v_blocks_credentials_carousel_items',
    columns: [
      ['review_status', "TEXT DEFAULT 'verified'"],
      ['issuer', 'TEXT'],
      ['recipient', 'TEXT'],
      ['recognition_year', 'NUMERIC'],
      ['issued_on', 'TEXT'],
      ['reference_code', 'TEXT'],
      ['source_filename', 'TEXT'],
    ],
  },
] as const

const tourTaxonomySQLiteStatements = [
  `CREATE TABLE IF NOT EXISTS "tour_products_destination_tags" (
    "order" INTEGER NOT NULL, "parent_id" INTEGER NOT NULL, "value" TEXT,
    "id" INTEGER PRIMARY KEY NOT NULL,
    FOREIGN KEY ("parent_id") REFERENCES "tour_products"("id") ON UPDATE no action ON DELETE cascade
  )`,
  `CREATE TABLE IF NOT EXISTS "tour_products_travel_styles" (
    "order" INTEGER NOT NULL, "parent_id" INTEGER NOT NULL, "value" TEXT,
    "id" INTEGER PRIMARY KEY NOT NULL,
    FOREIGN KEY ("parent_id") REFERENCES "tour_products"("id") ON UPDATE no action ON DELETE cascade
  )`,
  `CREATE TABLE IF NOT EXISTS "_tour_products_v_version_destination_tags" (
    "order" INTEGER NOT NULL, "parent_id" INTEGER NOT NULL, "value" TEXT,
    "id" INTEGER PRIMARY KEY NOT NULL,
    FOREIGN KEY ("parent_id") REFERENCES "_tour_products_v"("id") ON UPDATE no action ON DELETE cascade
  )`,
  `CREATE TABLE IF NOT EXISTS "_tour_products_v_version_travel_styles" (
    "order" INTEGER NOT NULL, "parent_id" INTEGER NOT NULL, "value" TEXT,
    "id" INTEGER PRIMARY KEY NOT NULL,
    FOREIGN KEY ("parent_id") REFERENCES "_tour_products_v"("id") ON UPDATE no action ON DELETE cascade
  )`,
  ...[
    'tour_products_destination_tags_order_idx ON tour_products_destination_tags ("order")',
    'tour_products_destination_tags_parent_idx ON tour_products_destination_tags ("parent_id")',
    'tour_products_destination_tags_value_idx ON tour_products_destination_tags ("value")',
    'tour_products_travel_styles_order_idx ON tour_products_travel_styles ("order")',
    'tour_products_travel_styles_parent_idx ON tour_products_travel_styles ("parent_id")',
    'tour_products_travel_styles_value_idx ON tour_products_travel_styles ("value")',
    '_tour_products_v_version_destination_tags_order_idx ON _tour_products_v_version_destination_tags ("order")',
    '_tour_products_v_version_destination_tags_parent_idx ON _tour_products_v_version_destination_tags ("parent_id")',
    '_tour_products_v_version_destination_tags_value_idx ON _tour_products_v_version_destination_tags ("value")',
    '_tour_products_v_version_travel_styles_order_idx ON _tour_products_v_version_travel_styles ("order")',
    '_tour_products_v_version_travel_styles_parent_idx ON _tour_products_v_version_travel_styles ("parent_id")',
    '_tour_products_v_version_travel_styles_value_idx ON _tour_products_v_version_travel_styles ("value")',
  ].map((definition) => `CREATE INDEX IF NOT EXISTS ${definition}`),
] as const

const credentialsCarouselSQLiteStatements = [
  `CREATE TABLE IF NOT EXISTS "pages_blocks_credentials_carousel" (
    "_order" INTEGER NOT NULL, "_parent_id" INTEGER NOT NULL, "_path" TEXT NOT NULL,
    "_locale" TEXT NOT NULL, "id" TEXT PRIMARY KEY NOT NULL, "full_bleed" INTEGER DEFAULT 1,
    "eyebrow" TEXT, "title" TEXT, "description" TEXT, "aria_label" TEXT,
    "autoplay" INTEGER DEFAULT 1, "interval_ms" NUMERIC DEFAULT 5500, "block_name" TEXT,
    FOREIGN KEY ("_parent_id") REFERENCES "pages"("id") ON UPDATE no action ON DELETE cascade
  )`,
  `CREATE TABLE IF NOT EXISTS "pages_blocks_credentials_carousel_items" (
    "_order" INTEGER NOT NULL, "_parent_id" TEXT NOT NULL, "_locale" TEXT NOT NULL,
    "id" TEXT PRIMARY KEY NOT NULL, "review_status" TEXT DEFAULT 'verified',
    "kind" TEXT DEFAULT 'cert', "image_id" INTEGER, "issuer" TEXT, "recipient" TEXT,
    "recognition_year" NUMERIC, "issued_on" TEXT, "reference_code" TEXT,
    "source_filename" TEXT, "mark" TEXT, "label" TEXT, "title" TEXT, "description" TEXT,
    FOREIGN KEY ("image_id") REFERENCES "media"("id") ON UPDATE no action ON DELETE set null,
    FOREIGN KEY ("_parent_id") REFERENCES "pages_blocks_credentials_carousel"("id") ON UPDATE no action ON DELETE cascade
  )`,
  `CREATE TABLE IF NOT EXISTS "_pages_v_blocks_credentials_carousel" (
    "_order" INTEGER NOT NULL, "_parent_id" INTEGER NOT NULL, "_path" TEXT NOT NULL,
    "_locale" TEXT NOT NULL, "id" INTEGER PRIMARY KEY NOT NULL, "full_bleed" INTEGER DEFAULT 1,
    "eyebrow" TEXT, "title" TEXT, "description" TEXT, "aria_label" TEXT,
    "autoplay" INTEGER DEFAULT 1, "interval_ms" NUMERIC DEFAULT 5500, "_uuid" TEXT,
    "block_name" TEXT,
    FOREIGN KEY ("_parent_id") REFERENCES "_pages_v"("id") ON UPDATE no action ON DELETE cascade
  )`,
  `CREATE TABLE IF NOT EXISTS "_pages_v_blocks_credentials_carousel_items" (
    "_order" INTEGER NOT NULL, "_parent_id" INTEGER NOT NULL, "_locale" TEXT NOT NULL,
    "id" INTEGER PRIMARY KEY NOT NULL, "review_status" TEXT DEFAULT 'verified',
    "kind" TEXT DEFAULT 'cert', "image_id" INTEGER, "issuer" TEXT, "recipient" TEXT,
    "recognition_year" NUMERIC, "issued_on" TEXT, "reference_code" TEXT,
    "source_filename" TEXT, "mark" TEXT, "label" TEXT, "title" TEXT, "description" TEXT, "_uuid" TEXT,
    FOREIGN KEY ("image_id") REFERENCES "media"("id") ON UPDATE no action ON DELETE set null,
    FOREIGN KEY ("_parent_id") REFERENCES "_pages_v_blocks_credentials_carousel"("id") ON UPDATE no action ON DELETE cascade
  )`,
  ...[
    'pages_blocks_credentials_carousel_order_idx ON pages_blocks_credentials_carousel (_order)',
    'pages_blocks_credentials_carousel_parent_id_idx ON pages_blocks_credentials_carousel (_parent_id)',
    'pages_blocks_credentials_carousel_path_idx ON pages_blocks_credentials_carousel (_path)',
    'pages_blocks_credentials_carousel_locale_idx ON pages_blocks_credentials_carousel (_locale)',
    'pages_blocks_credentials_carousel_items_order_idx ON pages_blocks_credentials_carousel_items (_order)',
    'pages_blocks_credentials_carousel_items_parent_id_idx ON pages_blocks_credentials_carousel_items (_parent_id)',
    'pages_blocks_credentials_carousel_items_locale_idx ON pages_blocks_credentials_carousel_items (_locale)',
    'pages_blocks_credentials_carousel_items_image_idx ON pages_blocks_credentials_carousel_items (image_id)',
    '_pages_v_blocks_credentials_carousel_order_idx ON _pages_v_blocks_credentials_carousel (_order)',
    '_pages_v_blocks_credentials_carousel_parent_id_idx ON _pages_v_blocks_credentials_carousel (_parent_id)',
    '_pages_v_blocks_credentials_carousel_path_idx ON _pages_v_blocks_credentials_carousel (_path)',
    '_pages_v_blocks_credentials_carousel_locale_idx ON _pages_v_blocks_credentials_carousel (_locale)',
    '_pages_v_blocks_credentials_carousel_items_order_idx ON _pages_v_blocks_credentials_carousel_items (_order)',
    '_pages_v_blocks_credentials_carousel_items_parent_id_idx ON _pages_v_blocks_credentials_carousel_items (_parent_id)',
    '_pages_v_blocks_credentials_carousel_items_locale_idx ON _pages_v_blocks_credentials_carousel_items (_locale)',
    '_pages_v_blocks_credentials_carousel_items_image_idx ON _pages_v_blocks_credentials_carousel_items (image_id)',
  ].map((definition) => `CREATE INDEX IF NOT EXISTS ${definition}`),
] as const

const toSQLitePath = (databaseURL: string) => {
  if (!databaseURL.startsWith('file:')) {
    return null
  }

  if (databaseURL.startsWith('file://')) {
    return fileURLToPath(databaseURL)
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
    // Next.js production builds initialize Payload concurrently in multiple
    // workers. Let idempotent bootstrap statements wait for the current schema
    // writer instead of failing immediately with SQLITE_BUSY.
    db.exec('PRAGMA busy_timeout = 30000;')

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

    // Supplemental local SQLite bootstrap for Pages.wingsSideHiFi (US-046A).
    // Production applies the same shape via migration
    // 20260721_180000_wings_side_hifi_page_contract on PostgreSQL.
    const ensureColumns = (table: string, columns: ReadonlyArray<readonly [string, string]>) => {
      const present = db
        .prepare('SELECT name FROM sqlite_master WHERE type = ? AND name = ?')
        .get('table', table) as { name?: string } | undefined
      if (!present?.name) return

      const tableInfo = db.prepare(`PRAGMA table_info("${table}")`).all() as Array<{
        name?: string
      }>
      const existing = new Set(tableInfo.map((column) => column.name).filter(Boolean))
      for (const [column, type] of columns) {
        if (!existing.has(column)) {
          db.exec(`ALTER TABLE "${table}" ADD COLUMN "${column}" ${type.toUpperCase()};`)
        }
      }
    }

    ensureColumns('pages', WINGSSIDE_HIFI_PAGES_COLUMNS)
    ensureColumns('pages_locales', WINGSSIDE_HIFI_PAGES_LOCALE_COLUMNS)
    ensureColumns(
      '_pages_v',
      WINGSSIDE_HIFI_PAGES_COLUMNS.map(([name, type]) => [`version_${name}`, type] as const),
    )
    ensureColumns(
      '_pages_v_locales',
      WINGSSIDE_HIFI_PAGES_LOCALE_COLUMNS.map(([name, type]) => [`version_${name}`, type] as const),
    )

    for (const statement of getWingsSideHiFiSQLiteCreateTableStatements()) {
      db.exec(`${statement};`)
    }
    for (const statement of getWingsSideHiFiSQLiteIndexStatements()) {
      db.exec(`${statement};`)
    }
    for (const statement of credentialsCarouselSQLiteStatements) {
      db.exec(`${statement};`)
    }
    for (const statement of tourTaxonomySQLiteStatements) {
      db.exec(`${statement};`)
    }
    for (const statement of wingsSideHomeCurationSQLiteStatements) {
      db.exec(`${statement};`)
    }
    const tourDeparturesTable = db
      .prepare('SELECT name FROM sqlite_master WHERE type = ? AND name = ?')
      .get('table', 'tour_departures') as { name?: string } | undefined
    if (tourDeparturesTable?.name) {
      db.exec(`
        CREATE UNIQUE INDEX IF NOT EXISTS "tour_departures_inventory_identity_unique"
        ON "tour_departures" ("inventory_identity")
        WHERE "inventory_identity" IS NOT NULL;
      `)
    }
    // Earlier US-050 bootstrap drafts created the short dbName tables with a
    // `tag` column. CREATE TABLE IF NOT EXISTS cannot repair that shape, so
    // upgrade those local-only tables in place and preserve any draft values.
    for (const table of [
      'home_dest_tours',
      'home_style_tours',
      '_home_dest_tours_v',
      '_home_style_tours_v',
    ]) {
      ensureColumns(table, [['key', 'TEXT']])
      const columns = db.prepare(`PRAGMA table_info("${table}")`).all() as Array<{
        name?: string
      }>
      if (columns.some(({ name }) => name === 'tag')) {
        db.exec(`UPDATE "${table}" SET "key" = "tag" WHERE "key" IS NULL;`)
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
