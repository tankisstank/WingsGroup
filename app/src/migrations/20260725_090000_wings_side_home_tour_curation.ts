import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

const tables = [
  'home_dest_tours',
  'home_style_tours',
  'home_featured_tours',
] as const

/**
 * Additive, PostgreSQL-authoritative storage for the non-localized Home
 * curation arrays. Local SQLite receives the matching bootstrap in
 * repairLocalSQLiteSchema; it is not a production migration substitute.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_home_dest_tours_key"
        AS ENUM('hanoi', 'halong', 'hoian', 'hue', 'mekong', 'sapa');
    EXCEPTION WHEN duplicate_object THEN null; END $$;
    DO $$ BEGIN
      CREATE TYPE "public"."enum_home_style_tours_key"
        AS ENUM('luxury', 'family', 'culture', 'adventure', 'wellness', 'romance');
    EXCEPTION WHEN duplicate_object THEN null; END $$;
    DO $$ BEGIN
      CREATE TYPE "public"."enum__home_dest_tours_v_key"
        AS ENUM('hanoi', 'halong', 'hoian', 'hue', 'mekong', 'sapa');
    EXCEPTION WHEN duplicate_object THEN null; END $$;
    DO $$ BEGIN
      CREATE TYPE "public"."enum__home_style_tours_v_key"
        AS ENUM('luxury', 'family', 'culture', 'adventure', 'wellness', 'romance');
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    CREATE TABLE IF NOT EXISTS "home_dest_tours" (
      "_order" integer NOT NULL, "_parent_id" integer NOT NULL, "id" varchar PRIMARY KEY NOT NULL,
      "key" "enum_home_dest_tours_key", "tour_id" integer
    );
    CREATE TABLE IF NOT EXISTS "home_style_tours" (
      "_order" integer NOT NULL, "_parent_id" integer NOT NULL, "id" varchar PRIMARY KEY NOT NULL,
      "key" "enum_home_style_tours_key", "tour_id" integer
    );
    CREATE TABLE IF NOT EXISTS "home_featured_tours" (
      "_order" integer NOT NULL, "_parent_id" integer NOT NULL, "id" varchar PRIMARY KEY NOT NULL,
      "tour_id" integer
    );
    CREATE TABLE IF NOT EXISTS "_home_dest_tours_v" (
      "_order" integer NOT NULL, "_parent_id" integer NOT NULL, "id" serial PRIMARY KEY NOT NULL,
      "_uuid" varchar, "key" "enum__home_dest_tours_v_key", "tour_id" integer
    );
    CREATE TABLE IF NOT EXISTS "_home_style_tours_v" (
      "_order" integer NOT NULL, "_parent_id" integer NOT NULL, "id" serial PRIMARY KEY NOT NULL,
      "_uuid" varchar, "key" "enum__home_style_tours_v_key", "tour_id" integer
    );
    CREATE TABLE IF NOT EXISTS "_home_featured_tours_v" (
      "_order" integer NOT NULL, "_parent_id" integer NOT NULL, "id" serial PRIMARY KEY NOT NULL,
      "_uuid" varchar, "tour_id" integer
    );
  `)

  for (const table of tables) {
    const versionTable = `_${table}_v`
    await db.execute(sql.raw(`
      DO $$ BEGIN ALTER TABLE "${table}" ADD CONSTRAINT "${table}_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "pages"("id") ON DELETE cascade ON UPDATE no action;
      EXCEPTION WHEN duplicate_object THEN null; END $$;
      DO $$ BEGIN ALTER TABLE "${table}" ADD CONSTRAINT "${table}_tour_id_tour_products_id_fk"
        FOREIGN KEY ("tour_id") REFERENCES "tour_products"("id") ON DELETE set null ON UPDATE no action;
      EXCEPTION WHEN duplicate_object THEN null; END $$;
      DO $$ BEGIN ALTER TABLE "${versionTable}" ADD CONSTRAINT "${versionTable}_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "_pages_v"("id") ON DELETE cascade ON UPDATE no action;
      EXCEPTION WHEN duplicate_object THEN null; END $$;
      DO $$ BEGIN ALTER TABLE "${versionTable}" ADD CONSTRAINT "${versionTable}_tour_id_tour_products_id_fk"
        FOREIGN KEY ("tour_id") REFERENCES "tour_products"("id") ON DELETE set null ON UPDATE no action;
      EXCEPTION WHEN duplicate_object THEN null; END $$;
      CREATE INDEX IF NOT EXISTS "${table}_order_idx" ON "${table}" USING btree ("_order");
      CREATE INDEX IF NOT EXISTS "${table}_parent_id_idx" ON "${table}" USING btree ("_parent_id");
      CREATE INDEX IF NOT EXISTS "${table}_tour_idx" ON "${table}" USING btree ("tour_id");
      CREATE INDEX IF NOT EXISTS "${versionTable}_order_idx" ON "${versionTable}" USING btree ("_order");
      CREATE INDEX IF NOT EXISTS "${versionTable}_parent_id_idx" ON "${versionTable}" USING btree ("_parent_id");
      CREATE INDEX IF NOT EXISTS "${versionTable}_tour_idx" ON "${versionTable}" USING btree ("tour_id");
    `))
  }
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  for (const table of [...tables].reverse()) {
    const versionTable = `_${table}_v`
    await db.execute(sql.raw(`DROP TABLE IF EXISTS "${versionTable}" CASCADE`))
    await db.execute(sql.raw(`DROP TABLE IF EXISTS "${table}" CASCADE`))
  }

  await db.execute(sql`
    DROP TYPE IF EXISTS "public"."enum_home_dest_tours_key";
    DROP TYPE IF EXISTS "public"."enum_home_style_tours_key";
    DROP TYPE IF EXISTS "public"."enum__home_dest_tours_v_key";
    DROP TYPE IF EXISTS "public"."enum__home_style_tours_v_key";
  `)
}
