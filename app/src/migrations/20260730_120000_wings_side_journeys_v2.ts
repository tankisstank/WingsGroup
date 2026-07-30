import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

/** Additive only: existing catalog records remain private/on-request until verified. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_tour_products_tour_type" AS ENUM ('group', 'private');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      CREATE TYPE "public"."enum__tour_products_v_version_tour_type" AS ENUM ('group', 'private');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      CREATE TYPE "public"."enum_tour_departures_price_basis" AS ENUM ('per-person', 'per-booking');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    DO $$ BEGIN
      CREATE TYPE "public"."enum__tour_departures_v_version_price_basis" AS ENUM ('per-person', 'per-booking');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    ALTER TABLE "tour_products" ADD COLUMN IF NOT EXISTS "tour_type" "enum_tour_products_tour_type";
    ALTER TABLE "_tour_products_v" ADD COLUMN IF NOT EXISTS "version_tour_type" "enum__tour_products_v_version_tour_type";
    ALTER TABLE "tour_departures" ADD COLUMN IF NOT EXISTS "price_basis" "enum_tour_departures_price_basis";
    ALTER TABLE "_tour_departures_v" ADD COLUMN IF NOT EXISTS "version_price_basis" "enum__tour_departures_v_version_price_basis";
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "tour_products" DROP COLUMN IF EXISTS "tour_type";
    ALTER TABLE "_tour_products_v" DROP COLUMN IF EXISTS "version_tour_type";
    ALTER TABLE "tour_departures" DROP COLUMN IF EXISTS "price_basis";
    ALTER TABLE "_tour_departures_v" DROP COLUMN IF EXISTS "version_price_basis";
    DROP TYPE IF EXISTS "public"."enum_tour_products_tour_type";
    DROP TYPE IF EXISTS "public"."enum__tour_products_v_version_tour_type";
    DROP TYPE IF EXISTS "public"."enum_tour_departures_price_basis";
    DROP TYPE IF EXISTS "public"."enum__tour_departures_v_version_price_basis";
  `)
}
