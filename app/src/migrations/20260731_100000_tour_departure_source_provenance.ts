import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

/** Additive provenance for source-managed departures. Existing/manual rows remain unmanaged. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "tour_departures" ADD COLUMN IF NOT EXISTS "source_provenance_source_system" varchar;
    ALTER TABLE "tour_departures" ADD COLUMN IF NOT EXISTS "source_provenance_source_url" varchar;
    ALTER TABLE "tour_departures" ADD COLUMN IF NOT EXISTS "source_provenance_source_page_sha256" varchar;
    ALTER TABLE "tour_departures" ADD COLUMN IF NOT EXISTS "source_provenance_source_row_sha256" varchar;
    ALTER TABLE "tour_departures" ADD COLUMN IF NOT EXISTS "source_provenance_checked_at" timestamp(3) with time zone;
    ALTER TABLE "tour_departures" ADD COLUMN IF NOT EXISTS "source_provenance_managed_by" varchar;
    ALTER TABLE "_tour_departures_v" ADD COLUMN IF NOT EXISTS "version_source_provenance_source_system" varchar;
    ALTER TABLE "_tour_departures_v" ADD COLUMN IF NOT EXISTS "version_source_provenance_source_url" varchar;
    ALTER TABLE "_tour_departures_v" ADD COLUMN IF NOT EXISTS "version_source_provenance_source_page_sha256" varchar;
    ALTER TABLE "_tour_departures_v" ADD COLUMN IF NOT EXISTS "version_source_provenance_source_row_sha256" varchar;
    ALTER TABLE "_tour_departures_v" ADD COLUMN IF NOT EXISTS "version_source_provenance_checked_at" timestamp(3) with time zone;
    ALTER TABLE "_tour_departures_v" ADD COLUMN IF NOT EXISTS "version_source_provenance_managed_by" varchar;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "tour_departures" DROP COLUMN IF EXISTS "source_provenance_source_system";
    ALTER TABLE "tour_departures" DROP COLUMN IF EXISTS "source_provenance_source_url";
    ALTER TABLE "tour_departures" DROP COLUMN IF EXISTS "source_provenance_source_page_sha256";
    ALTER TABLE "tour_departures" DROP COLUMN IF EXISTS "source_provenance_source_row_sha256";
    ALTER TABLE "tour_departures" DROP COLUMN IF EXISTS "source_provenance_checked_at";
    ALTER TABLE "tour_departures" DROP COLUMN IF EXISTS "source_provenance_managed_by";
    ALTER TABLE "_tour_departures_v" DROP COLUMN IF EXISTS "version_source_provenance_source_system";
    ALTER TABLE "_tour_departures_v" DROP COLUMN IF EXISTS "version_source_provenance_source_url";
    ALTER TABLE "_tour_departures_v" DROP COLUMN IF EXISTS "version_source_provenance_source_page_sha256";
    ALTER TABLE "_tour_departures_v" DROP COLUMN IF EXISTS "version_source_provenance_source_row_sha256";
    ALTER TABLE "_tour_departures_v" DROP COLUMN IF EXISTS "version_source_provenance_checked_at";
    ALTER TABLE "_tour_departures_v" DROP COLUMN IF EXISTS "version_source_provenance_managed_by";
  `)
}
