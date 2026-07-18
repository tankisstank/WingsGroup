import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE IF EXISTS "pages_blocks_testimonial_items"
      ADD COLUMN IF NOT EXISTS "country" varchar,
      ADD COLUMN IF NOT EXISTS "note_date" timestamp(3) with time zone;
    ALTER TABLE IF EXISTS "_pages_v_blocks_testimonial_items"
      ADD COLUMN IF NOT EXISTS "country" varchar,
      ADD COLUMN IF NOT EXISTS "note_date" timestamp(3) with time zone;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE IF EXISTS "pages_blocks_testimonial_items"
      DROP COLUMN IF EXISTS "country",
      DROP COLUMN IF EXISTS "note_date";
    ALTER TABLE IF EXISTS "_pages_v_blocks_testimonial_items"
      DROP COLUMN IF EXISTS "country",
      DROP COLUMN IF EXISTS "note_date";
  `)
}
