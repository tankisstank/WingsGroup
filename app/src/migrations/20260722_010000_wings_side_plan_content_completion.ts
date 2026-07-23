import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

import { getWingsSideHiFiPostgresStatements } from './data/wingsSideHiFiSchema'

/** Completes the Plan route fields omitted from the initial US-046A contract migration. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  // The contract helper is intentionally idempotent. Replaying it creates only
  // the missing plan_faq child tables and plan hero-lede locale columns.
  for (const statement of getWingsSideHiFiPostgresStatements()) {
    await db.execute(sql.raw(statement))
  }
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql.raw(`DROP TABLE IF EXISTS "_pages_v_version_wings_side_hi_fi_plan_faq_locales" CASCADE`))
  await db.execute(sql.raw(`DROP TABLE IF EXISTS "_pages_v_version_wings_side_hi_fi_plan_faq" CASCADE`))
  await db.execute(sql.raw(`DROP TABLE IF EXISTS "pages_wings_side_hi_fi_plan_faq_locales" CASCADE`))
  await db.execute(sql.raw(`DROP TABLE IF EXISTS "pages_wings_side_hi_fi_plan_faq" CASCADE`))
  await db.execute(sql.raw(`ALTER TABLE IF EXISTS "pages_locales" DROP COLUMN IF EXISTS "wings_side_hi_fi_plan_hero_lede"`))
  await db.execute(sql.raw(`ALTER TABLE IF EXISTS "_pages_v_locales" DROP COLUMN IF EXISTS "version_wings_side_hi_fi_plan_hero_lede"`))
}
