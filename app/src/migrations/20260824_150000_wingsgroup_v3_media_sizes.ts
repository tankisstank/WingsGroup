import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

/**
 * Add the six Payload-managed WingsGroup v3 image sizes to PostgreSQL.
 *
 * This is intentionally forward-only: production runs with PAYLOAD_DB_PUSH=false,
 * so the media upload contract must be present before a governed import can run.
 * Existing media rows remain nullable and are not rewritten by this migration.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "media"
      ADD COLUMN IF NOT EXISTS "sizes_wingsgroup_v3_640_webp_url" varchar,
      ADD COLUMN IF NOT EXISTS "sizes_wingsgroup_v3_640_webp_width" numeric,
      ADD COLUMN IF NOT EXISTS "sizes_wingsgroup_v3_640_webp_height" numeric,
      ADD COLUMN IF NOT EXISTS "sizes_wingsgroup_v3_640_webp_mime_type" varchar,
      ADD COLUMN IF NOT EXISTS "sizes_wingsgroup_v3_640_webp_filesize" numeric,
      ADD COLUMN IF NOT EXISTS "sizes_wingsgroup_v3_640_webp_filename" varchar,
      ADD COLUMN IF NOT EXISTS "sizes_wingsgroup_v3_640_avif_url" varchar,
      ADD COLUMN IF NOT EXISTS "sizes_wingsgroup_v3_640_avif_width" numeric,
      ADD COLUMN IF NOT EXISTS "sizes_wingsgroup_v3_640_avif_height" numeric,
      ADD COLUMN IF NOT EXISTS "sizes_wingsgroup_v3_640_avif_mime_type" varchar,
      ADD COLUMN IF NOT EXISTS "sizes_wingsgroup_v3_640_avif_filesize" numeric,
      ADD COLUMN IF NOT EXISTS "sizes_wingsgroup_v3_640_avif_filename" varchar,
      ADD COLUMN IF NOT EXISTS "sizes_wingsgroup_v3_960_webp_url" varchar,
      ADD COLUMN IF NOT EXISTS "sizes_wingsgroup_v3_960_webp_width" numeric,
      ADD COLUMN IF NOT EXISTS "sizes_wingsgroup_v3_960_webp_height" numeric,
      ADD COLUMN IF NOT EXISTS "sizes_wingsgroup_v3_960_webp_mime_type" varchar,
      ADD COLUMN IF NOT EXISTS "sizes_wingsgroup_v3_960_webp_filesize" numeric,
      ADD COLUMN IF NOT EXISTS "sizes_wingsgroup_v3_960_webp_filename" varchar,
      ADD COLUMN IF NOT EXISTS "sizes_wingsgroup_v3_960_avif_url" varchar,
      ADD COLUMN IF NOT EXISTS "sizes_wingsgroup_v3_960_avif_width" numeric,
      ADD COLUMN IF NOT EXISTS "sizes_wingsgroup_v3_960_avif_height" numeric,
      ADD COLUMN IF NOT EXISTS "sizes_wingsgroup_v3_960_avif_mime_type" varchar,
      ADD COLUMN IF NOT EXISTS "sizes_wingsgroup_v3_960_avif_filesize" numeric,
      ADD COLUMN IF NOT EXISTS "sizes_wingsgroup_v3_960_avif_filename" varchar,
      ADD COLUMN IF NOT EXISTS "sizes_wingsgroup_v3_1440_webp_url" varchar,
      ADD COLUMN IF NOT EXISTS "sizes_wingsgroup_v3_1440_webp_width" numeric,
      ADD COLUMN IF NOT EXISTS "sizes_wingsgroup_v3_1440_webp_height" numeric,
      ADD COLUMN IF NOT EXISTS "sizes_wingsgroup_v3_1440_webp_mime_type" varchar,
      ADD COLUMN IF NOT EXISTS "sizes_wingsgroup_v3_1440_webp_filesize" numeric,
      ADD COLUMN IF NOT EXISTS "sizes_wingsgroup_v3_1440_webp_filename" varchar,
      ADD COLUMN IF NOT EXISTS "sizes_wingsgroup_v3_1440_avif_url" varchar,
      ADD COLUMN IF NOT EXISTS "sizes_wingsgroup_v3_1440_avif_width" numeric,
      ADD COLUMN IF NOT EXISTS "sizes_wingsgroup_v3_1440_avif_height" numeric,
      ADD COLUMN IF NOT EXISTS "sizes_wingsgroup_v3_1440_avif_mime_type" varchar,
      ADD COLUMN IF NOT EXISTS "sizes_wingsgroup_v3_1440_avif_filesize" numeric,
      ADD COLUMN IF NOT EXISTS "sizes_wingsgroup_v3_1440_avif_filename" varchar;

    CREATE INDEX IF NOT EXISTS "media_sizes_wingsgroup_v3_640_webp_filename_idx"
      ON "media" USING btree ("sizes_wingsgroup_v3_640_webp_filename");
    CREATE INDEX IF NOT EXISTS "media_sizes_wingsgroup_v3_640_avif_filename_idx"
      ON "media" USING btree ("sizes_wingsgroup_v3_640_avif_filename");
    CREATE INDEX IF NOT EXISTS "media_sizes_wingsgroup_v3_960_webp_filename_idx"
      ON "media" USING btree ("sizes_wingsgroup_v3_960_webp_filename");
    CREATE INDEX IF NOT EXISTS "media_sizes_wingsgroup_v3_960_avif_filename_idx"
      ON "media" USING btree ("sizes_wingsgroup_v3_960_avif_filename");
    CREATE INDEX IF NOT EXISTS "media_sizes_wingsgroup_v3_1440_webp_filename_idx"
      ON "media" USING btree ("sizes_wingsgroup_v3_1440_webp_filename");
    CREATE INDEX IF NOT EXISTS "media_sizes_wingsgroup_v3_1440_avif_filename_idx"
      ON "media" USING btree ("sizes_wingsgroup_v3_1440_avif_filename");
  `)
}

// Derivative columns are operational release state. Rollback uses a forward
// fix or database restore rather than dropping columns and losing evidence.
export async function down(_args: MigrateDownArgs): Promise<void> {}
