import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TYPE "enum_tour_products_market" ADD VALUE IF NOT EXISTS 'vietnam';
    ALTER TYPE "enum_tour_products_market" ADD VALUE IF NOT EXISTS 'thailand';
    ALTER TYPE "enum_tour_products_market" ADD VALUE IF NOT EXISTS 'cambodia';
    ALTER TYPE "enum_tour_products_market" ADD VALUE IF NOT EXISTS 'laos';
    ALTER TYPE "enum_tour_products_market" ADD VALUE IF NOT EXISTS 'myanmar';
    ALTER TYPE "enum_tour_products_market" ADD VALUE IF NOT EXISTS 'indochina';
    ALTER TYPE "enum_tour_products_market" ADD VALUE IF NOT EXISTS 'other';
    ALTER TYPE "enum__tour_products_v_version_market" ADD VALUE IF NOT EXISTS 'vietnam';
    ALTER TYPE "enum__tour_products_v_version_market" ADD VALUE IF NOT EXISTS 'thailand';
    ALTER TYPE "enum__tour_products_v_version_market" ADD VALUE IF NOT EXISTS 'cambodia';
    ALTER TYPE "enum__tour_products_v_version_market" ADD VALUE IF NOT EXISTS 'laos';
    ALTER TYPE "enum__tour_products_v_version_market" ADD VALUE IF NOT EXISTS 'myanmar';
    ALTER TYPE "enum__tour_products_v_version_market" ADD VALUE IF NOT EXISTS 'indochina';
    ALTER TYPE "enum__tour_products_v_version_market" ADD VALUE IF NOT EXISTS 'other';
    ALTER TYPE "enum_tour_departures_currency" ADD VALUE IF NOT EXISTS 'USD';
    ALTER TYPE "enum__tour_departures_v_version_currency" ADD VALUE IF NOT EXISTS 'USD';
    ALTER TABLE IF EXISTS "tour_products"
      ADD COLUMN IF NOT EXISTS "source_provenance" jsonb,
      ADD COLUMN IF NOT EXISTS "price_from" numeric,
      ADD COLUMN IF NOT EXISTS "currency" varchar DEFAULT 'USD';
    ALTER TABLE IF EXISTS "_tour_products_v"
      ADD COLUMN IF NOT EXISTS "version_source_provenance" jsonb,
      ADD COLUMN IF NOT EXISTS "version_price_from" numeric,
      ADD COLUMN IF NOT EXISTS "version_currency" varchar DEFAULT 'USD';
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE IF EXISTS "tour_products"
      DROP COLUMN IF EXISTS "source_provenance",
      DROP COLUMN IF EXISTS "price_from",
      DROP COLUMN IF EXISTS "currency";
    ALTER TABLE IF EXISTS "_tour_products_v"
      DROP COLUMN IF EXISTS "version_source_provenance",
      DROP COLUMN IF EXISTS "version_price_from",
      DROP COLUMN IF EXISTS "version_currency";
  `)
}
