import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

/**
 * Additive commerce governance. Legacy departures remain valid content records
 * and tours remain contactable, but commercial claims stay hidden until
 * verified_at/expires_at form a current verification window.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TYPE "public"."enum_tour_products_tour_type" ADD VALUE IF NOT EXISTS 'hybrid';
    ALTER TYPE "public"."enum__tour_products_v_version_tour_type" ADD VALUE IF NOT EXISTS 'hybrid';

    ALTER TABLE "tour_departures" ADD COLUMN IF NOT EXISTS "verified_at" timestamp(3) with time zone;
    ALTER TABLE "tour_departures" ADD COLUMN IF NOT EXISTS "expires_at" timestamp(3) with time zone;
    ALTER TABLE "tour_departures" ADD COLUMN IF NOT EXISTS "inventory_identity" varchar;
    ALTER TABLE "_tour_departures_v" ADD COLUMN IF NOT EXISTS "version_verified_at" timestamp(3) with time zone;
    ALTER TABLE "_tour_departures_v" ADD COLUMN IF NOT EXISTS "version_expires_at" timestamp(3) with time zone;
    ALTER TABLE "_tour_departures_v" ADD COLUMN IF NOT EXISTS "version_inventory_identity" varchar;

    WITH identities AS (
      SELECT
        "id",
        concat(
          's:', "site_id",
          '|t:', "tour_product_id",
          '|d:', to_char("departure_date" AT TIME ZONE 'UTC', 'YYYY-MM-DD'),
          '|v:',
          CASE
            WHEN "variant_ref_id" IS NOT NULL THEN concat('ref:', "variant_ref_id")
            WHEN nullif(trim("variant_key"), '') IS NOT NULL
              THEN concat('key:', lower(regexp_replace(trim("variant_key"), '\\s+', '-', 'g')))
            ELSE 'base'
          END
        ) AS identity,
        row_number() OVER (
          PARTITION BY
            "site_id",
            "tour_product_id",
            ("departure_date" AT TIME ZONE 'UTC')::date,
            CASE
              WHEN "variant_ref_id" IS NOT NULL THEN concat('ref:', "variant_ref_id")
              WHEN nullif(trim("variant_key"), '') IS NOT NULL
                THEN concat('key:', lower(regexp_replace(trim("variant_key"), '\\s+', '-', 'g')))
              ELSE 'base'
            END
          ORDER BY "id"
        ) AS duplicate_rank
      FROM "tour_departures"
      WHERE "site_id" IS NOT NULL
        AND "tour_product_id" IS NOT NULL
        AND "departure_date" IS NOT NULL
    )
    UPDATE "tour_departures" AS departures
    SET "inventory_identity" = identities.identity
    FROM identities
    WHERE departures."id" = identities."id"
      AND identities.duplicate_rank = 1
      AND departures."inventory_identity" IS NULL;

    CREATE UNIQUE INDEX IF NOT EXISTS "tour_departures_inventory_identity_unique"
      ON "tour_departures" USING btree ("inventory_identity")
      WHERE "inventory_identity" IS NOT NULL;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "tour_departures_inventory_identity_unique";
    ALTER TABLE "tour_departures" DROP COLUMN IF EXISTS "verified_at";
    ALTER TABLE "tour_departures" DROP COLUMN IF EXISTS "expires_at";
    ALTER TABLE "tour_departures" DROP COLUMN IF EXISTS "inventory_identity";
    ALTER TABLE "_tour_departures_v" DROP COLUMN IF EXISTS "version_verified_at";
    ALTER TABLE "_tour_departures_v" DROP COLUMN IF EXISTS "version_expires_at";
    ALTER TABLE "_tour_departures_v" DROP COLUMN IF EXISTS "version_inventory_identity";
  `)
}
