import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$
    BEGIN
      IF to_regtype('public.enum_tour_products_editorial_badges_kind') IS NULL THEN
        CREATE TYPE "public"."enum_tour_products_editorial_badges_kind" AS ENUM('hot', 'specialized', 'vip');
      END IF;
      IF to_regtype('public.enum__tour_products_v_version_editorial_badges_kind') IS NULL THEN
        CREATE TYPE "public"."enum__tour_products_v_version_editorial_badges_kind" AS ENUM('hot', 'specialized', 'vip');
      END IF;
    END $$;

    CREATE TABLE IF NOT EXISTS "tour_products_editorial_badges" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "kind" "enum_tour_products_editorial_badges_kind" NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "tour_products_editorial_badges_locales" (
      "label" varchar,
      "id" serial PRIMARY KEY NOT NULL,
      "_locale" "_locales" NOT NULL,
      "_parent_id" varchar NOT NULL
    );

    CREATE TABLE IF NOT EXISTS "_tour_products_v_version_editorial_badges" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" serial PRIMARY KEY NOT NULL,
      "_uuid" varchar,
      "kind" "enum__tour_products_v_version_editorial_badges_kind"
    );

    CREATE TABLE IF NOT EXISTS "_tour_products_v_version_editorial_badges_locales" (
      "label" varchar,
      "id" serial PRIMARY KEY NOT NULL,
      "_locale" "_locales" NOT NULL,
      "_parent_id" integer NOT NULL
    );

    DO $$ BEGIN
      ALTER TABLE "tour_products_editorial_badges"
        ADD CONSTRAINT "tour_products_editorial_badges_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "public"."tour_products"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      ALTER TABLE "tour_products_editorial_badges_locales"
        ADD CONSTRAINT "tour_products_editorial_badges_locales_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "public"."tour_products_editorial_badges"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      ALTER TABLE "_tour_products_v_version_editorial_badges"
        ADD CONSTRAINT "_tour_products_v_version_editorial_badges_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "public"."_tour_products_v"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      ALTER TABLE "_tour_products_v_version_editorial_badges_locales"
        ADD CONSTRAINT "_tour_products_v_version_editorial_badges_locales_parent_id_fk"
        FOREIGN KEY ("_parent_id") REFERENCES "public"."_tour_products_v_version_editorial_badges"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    CREATE INDEX IF NOT EXISTS "tour_products_editorial_badges_order_idx" ON "tour_products_editorial_badges" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "tour_products_editorial_badges_parent_id_idx" ON "tour_products_editorial_badges" USING btree ("_parent_id");
    CREATE UNIQUE INDEX IF NOT EXISTS "tour_products_editorial_badges_locales_locale_parent_id_unique" ON "tour_products_editorial_badges_locales" USING btree ("_locale", "_parent_id");

    CREATE INDEX IF NOT EXISTS "_tour_products_v_version_editorial_badges_order_idx" ON "_tour_products_v_version_editorial_badges" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "_tour_products_v_version_editorial_badges_parent_id_idx" ON "_tour_products_v_version_editorial_badges" USING btree ("_parent_id");
    CREATE UNIQUE INDEX IF NOT EXISTS "_tour_products_v_version_editorial_badges_locales_locale_p" ON "_tour_products_v_version_editorial_badges_locales" USING btree ("_locale", "_parent_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "tour_products_editorial_badges_locales" CASCADE;
    DROP TABLE IF EXISTS "tour_products_editorial_badges" CASCADE;
    DROP TABLE IF EXISTS "_tour_products_v_version_editorial_badges_locales" CASCADE;
    DROP TABLE IF EXISTS "_tour_products_v_version_editorial_badges" CASCADE;
    DROP TYPE IF EXISTS "public"."enum_tour_products_editorial_badges_kind";
    DROP TYPE IF EXISTS "public"."enum__tour_products_v_version_editorial_badges_kind";
  `)
}
