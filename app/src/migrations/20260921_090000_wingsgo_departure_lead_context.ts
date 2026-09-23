import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

/** Optional departure sales data, PDF itinerary relation, and verified lead context. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "form_submissions"
      ADD COLUMN IF NOT EXISTS "enquiry_context_departure_id" varchar,
      ADD COLUMN IF NOT EXISTS "enquiry_context_departure_date" varchar,
      ADD COLUMN IF NOT EXISTS "enquiry_context_intent" varchar;

    ALTER TABLE "tour_departures"
      ADD COLUMN IF NOT EXISTS "flight_number" varchar,
      ADD COLUMN IF NOT EXISTS "original_price" numeric,
      ADD COLUMN IF NOT EXISTS "loyalty_points" numeric;
    ALTER TABLE "_tour_departures_v"
      ADD COLUMN IF NOT EXISTS "version_flight_number" varchar,
      ADD COLUMN IF NOT EXISTS "version_original_price" numeric,
      ADD COLUMN IF NOT EXISTS "version_loyalty_points" numeric;

    ALTER TABLE "tour_products"
      ADD COLUMN IF NOT EXISTS "itinerary_pdf_id" integer;
    ALTER TABLE "_tour_products_v"
      ADD COLUMN IF NOT EXISTS "version_itinerary_pdf_id" integer;
    ALTER TABLE "site_settings"
      ADD COLUMN IF NOT EXISTS "registered_office_address" varchar,
      ADD COLUMN IF NOT EXISTS "travel_office_address" varchar;

    CREATE INDEX IF NOT EXISTS "form_submissions_enquiry_context_departure_id_idx"
      ON "form_submissions" USING btree ("enquiry_context_departure_id");
    CREATE INDEX IF NOT EXISTS "tour_products_itinerary_pdf_idx"
      ON "tour_products" USING btree ("itinerary_pdf_id");
    CREATE INDEX IF NOT EXISTS "_tour_products_v_version_itinerary_pdf_idx"
      ON "_tour_products_v" USING btree ("version_itinerary_pdf_id");

    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'tour_products_itinerary_pdf_id_media_id_fk'
      ) THEN
        ALTER TABLE "tour_products"
          ADD CONSTRAINT "tour_products_itinerary_pdf_id_media_id_fk"
          FOREIGN KEY ("itinerary_pdf_id") REFERENCES "public"."media"("id")
          ON DELETE set null ON UPDATE no action;
      END IF;
    END $$;
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = '_tour_products_v_version_itinerary_pdf_id_media_id_fk'
      ) THEN
        ALTER TABLE "_tour_products_v"
          ADD CONSTRAINT "_tour_products_v_version_itinerary_pdf_id_media_id_fk"
          FOREIGN KEY ("version_itinerary_pdf_id") REFERENCES "public"."media"("id")
          ON DELETE set null ON UPDATE no action;
      END IF;
    END $$;
  `)
}

// Lead context and optional assets are retained; rollbacks use a forward fix.
export async function down(_args: MigrateDownArgs): Promise<void> {}
