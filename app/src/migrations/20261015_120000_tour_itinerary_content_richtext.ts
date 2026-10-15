import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

/**
 * US-080: Rich Text Itinerary & Editorial Formatting
 *
 * Adds nullable jsonb `content` column to:
 * - `tour_products_itinerary_days_locales` (published / draft active locale rows)
 * - `_tour_products_v_version_itinerary_days_locales` (version history locale rows)
 *
 * Additive schema change (P2):
 * Preserves 100% backward compatibility for existing 73 tour products.
 * Does NOT drop or alter existing `summary` column.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "tour_products_itinerary_days_locales" ADD COLUMN IF NOT EXISTS "content" jsonb;
    ALTER TABLE "_tour_products_v_version_itinerary_days_locales" ADD COLUMN IF NOT EXISTS "content" jsonb;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "tour_products_itinerary_days_locales" DROP COLUMN IF EXISTS "content";
    ALTER TABLE "_tour_products_v_version_itinerary_days_locales" DROP COLUMN IF EXISTS "content";
  `)
}
