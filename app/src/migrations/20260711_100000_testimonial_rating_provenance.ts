import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE IF EXISTS "pages_blocks_testimonial_items"
      ALTER COLUMN "rating" DROP DEFAULT;
    ALTER TABLE IF EXISTS "_pages_v_blocks_testimonial_items"
      ALTER COLUMN "rating" DROP DEFAULT;
  `)
}

// Restoring the unsafe implicit five-star claim is intentionally unsupported.
// Existing ratings are preserved in both directions; provenance must be
// reviewed before any historical value is changed.
export async function down(_args: MigrateDownArgs): Promise<void> {}
