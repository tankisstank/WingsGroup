import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

import {
  getWingsSideHiFiPostgresStatements,
  WINGSSIDE_HIFI_ARRAY_TABLES,
  WINGSSIDE_HIFI_PAGES_COLUMNS,
  WINGSSIDE_HIFI_PAGES_LOCALE_COLUMNS,
} from './data/wingsSideHiFiSchema'

/**
 * US-046A / tranche A: Pages.wingsSideHiFi typed content contract tables.
 *
 * **Production path (authoritative):** PostgreSQL migration registered in
 * `src/migrations/index.ts`, applied via `payload migrate` and proven by
 * `pnpm run db:migrate:smoke` on ephemeral PostgreSQL 16.
 *
 * **Local SQLite path (supplemental only):** the same field shape is bootstrapped
 * for local `file:` DBs by extending `repairLocalSQLiteSchema` — never a
 * substitute for this migration on staging/production, and never registered as
 * a Payload migration entry.
 *
 * Exact PostgreSQL DDL (enums, boolean, varchar, serial locale PKs, FK layout)
 * matching Payload 3.84 field-level localization for nested arrays — not a
 * string-converted SQLite dialect dump. Does not rely on PAYLOAD_DB_PUSH.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  const statements = getWingsSideHiFiPostgresStatements()
  for (const statement of statements) {
    await db.execute(sql.raw(statement))
  }
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  for (const spec of [...WINGSSIDE_HIFI_ARRAY_TABLES].reverse()) {
    await db.execute(
      sql.raw(
        `DROP TABLE IF EXISTS "_pages_v_version_wings_side_hi_fi_${spec.name}_locales" CASCADE`,
      ),
    )
    await db.execute(
      sql.raw(`DROP TABLE IF EXISTS "_pages_v_version_wings_side_hi_fi_${spec.name}" CASCADE`),
    )
    await db.execute(
      sql.raw(`DROP TABLE IF EXISTS "pages_wings_side_hi_fi_${spec.name}_locales" CASCADE`),
    )
    await db.execute(sql.raw(`DROP TABLE IF EXISTS "pages_wings_side_hi_fi_${spec.name}" CASCADE`))
  }

  for (const [col] of WINGSSIDE_HIFI_PAGES_COLUMNS) {
    await db.execute(sql.raw(`ALTER TABLE IF EXISTS "pages" DROP COLUMN IF EXISTS "${col}"`))
    await db.execute(
      sql.raw(`ALTER TABLE IF EXISTS "_pages_v" DROP COLUMN IF EXISTS "version_${col}"`),
    )
  }
  for (const [col] of WINGSSIDE_HIFI_PAGES_LOCALE_COLUMNS) {
    await db.execute(
      sql.raw(`ALTER TABLE IF EXISTS "pages_locales" DROP COLUMN IF EXISTS "${col}"`),
    )
    await db.execute(
      sql.raw(`ALTER TABLE IF EXISTS "_pages_v_locales" DROP COLUMN IF EXISTS "version_${col}"`),
    )
  }

  await db.execute(sql.raw(`DROP TYPE IF EXISTS "public"."enum_pages_wings_side_hi_fi_route_variant"`))
  await db.execute(
    sql.raw(`DROP TYPE IF EXISTS "public"."enum__pages_v_version_wings_side_hi_fi_route_variant"`),
  )
  await db.execute(sql.raw(`DROP TYPE IF EXISTS "public"."enum_pages_wings_side_hi_fi_home_trust_kind"`))
  await db.execute(
    sql.raw(`DROP TYPE IF EXISTS "public"."enum__pages_v_version_wings_side_hi_fi_home_trust_kind"`),
  )
  await db.execute(
    sql.raw(`DROP TYPE IF EXISTS "public"."enum_pages_wings_side_hi_fi_home_credentials_kind"`),
  )
  await db.execute(
    sql.raw(
      `DROP TYPE IF EXISTS "public"."enum__pages_v_version_wings_side_hi_fi_home_credentials_kind"`,
    ),
  )
}
