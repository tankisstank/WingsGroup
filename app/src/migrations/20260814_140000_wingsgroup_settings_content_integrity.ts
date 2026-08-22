import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

/**
 * Enforce one settings record per site and add per-locale server approval
 * markers. The unique index intentionally fails closed if pre-existing
 * duplicates require operator review; this migration never deletes or merges.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "site_settings_site_id_unique"
      ON "site_settings" USING btree ("site_id")
      WHERE "site_id" IS NOT NULL;

    ALTER TABLE "pages"
      ADD COLUMN IF NOT EXISTS "wings_group_route_content_approval_vi" varchar,
      ADD COLUMN IF NOT EXISTS "wings_group_route_content_approval_en" varchar;

    ALTER TABLE "_pages_v"
      ADD COLUMN IF NOT EXISTS "version_wings_group_route_content_approval_vi" varchar,
      ADD COLUMN IF NOT EXISTS "version_wings_group_route_content_approval_en" varchar;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "_pages_v"
      DROP COLUMN IF EXISTS "version_wings_group_route_content_approval_vi",
      DROP COLUMN IF EXISTS "version_wings_group_route_content_approval_en";

    ALTER TABLE "pages"
      DROP COLUMN IF EXISTS "wings_group_route_content_approval_vi",
      DROP COLUMN IF EXISTS "wings_group_route_content_approval_en";

    DROP INDEX IF EXISTS "site_settings_site_id_unique";
  `)
}
