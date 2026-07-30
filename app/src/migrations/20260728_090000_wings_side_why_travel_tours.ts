import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

const enumTypes = [
  ['enum_home_why_tour_slots_key', "'local-design', 'flexible-planning', 'style-matching', 'collaborative-care'"],
  ['enum_home_why_tour_slots_selection_mode', "'manual', 'rule'"],
  ['enum_home_why_tour_slots_rule_destination_tag', "'hanoi', 'halong', 'hoian', 'hue', 'mekong', 'sapa'"],
  ['enum_home_why_tour_slots_rule_travel_style', "'luxury', 'family', 'culture', 'adventure', 'wellness', 'romance'"],
  ['enum_home_why_tour_slots_presentation_mode', "'inherit', 'override'"],
  ['enum__home_why_tour_slots_v_key', "'local-design', 'flexible-planning', 'style-matching', 'collaborative-care'"],
  ['enum__home_why_tour_slots_v_selection_mode', "'manual', 'rule'"],
  ['enum__home_why_tour_slots_v_rule_destination_tag', "'hanoi', 'halong', 'hoian', 'hue', 'mekong', 'sapa'"],
  ['enum__home_why_tour_slots_v_rule_travel_style', "'luxury', 'family', 'culture', 'adventure', 'wellness', 'romance'"],
  ['enum__home_why_tour_slots_v_presentation_mode', "'inherit', 'override'"],
] as const

const createEnum = async (
  db: MigrateUpArgs['db'],
  name: string,
  values: string,
): Promise<void> => {
  await db.execute(
    sql.raw(
      `DO $$ BEGIN CREATE TYPE "public"."${name}" AS ENUM(${values}); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
    ),
  )
}

/** Additive storage for the four governed, localized US-055 Why Travel slots. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  for (const [name, values] of enumTypes) await createEnum(db, name, values)

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "home_why_tour_slots" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "key" "enum_home_why_tour_slots_key" NOT NULL,
      "selection_mode" "enum_home_why_tour_slots_selection_mode" DEFAULT 'manual' NOT NULL,
      "tour_id" integer,
      "rule_destination_tag" "enum_home_why_tour_slots_rule_destination_tag",
      "rule_travel_style" "enum_home_why_tour_slots_rule_travel_style",
      "rule_min_duration_days" numeric,
      "rule_max_duration_days" numeric,
      "fallback_tour_id" integer,
      "presentation_mode" "enum_home_why_tour_slots_presentation_mode" DEFAULT 'inherit',
      "presentation_media_id" integer
    );
    CREATE TABLE IF NOT EXISTS "home_why_tour_slots_locales" (
      "presentation_badge" varchar,
      "presentation_body" varchar,
      "presentation_cta_label" varchar,
      "id" serial PRIMARY KEY NOT NULL,
      "_locale" "_locales" NOT NULL,
      "_parent_id" varchar NOT NULL
    );
    CREATE TABLE IF NOT EXISTS "_home_why_tour_slots_v" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" serial PRIMARY KEY NOT NULL,
      "_uuid" varchar,
      "key" "enum__home_why_tour_slots_v_key" NOT NULL,
      "selection_mode" "enum__home_why_tour_slots_v_selection_mode" DEFAULT 'manual' NOT NULL,
      "tour_id" integer,
      "rule_destination_tag" "enum__home_why_tour_slots_v_rule_destination_tag",
      "rule_travel_style" "enum__home_why_tour_slots_v_rule_travel_style",
      "rule_min_duration_days" numeric,
      "rule_max_duration_days" numeric,
      "fallback_tour_id" integer,
      "presentation_mode" "enum__home_why_tour_slots_v_presentation_mode" DEFAULT 'inherit',
      "presentation_media_id" integer
    );
    CREATE TABLE IF NOT EXISTS "_home_why_tour_slots_v_locales" (
      "presentation_badge" varchar,
      "presentation_body" varchar,
      "presentation_cta_label" varchar,
      "id" serial PRIMARY KEY NOT NULL,
      "_locale" "_locales" NOT NULL,
      "_parent_id" integer NOT NULL
    );
  `)

  await db.execute(sql`
    DO $$ BEGIN ALTER TABLE "home_why_tour_slots" ADD CONSTRAINT "home_why_tour_slots_parent_id_fk"
      FOREIGN KEY ("_parent_id") REFERENCES "pages"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;
    DO $$ BEGIN ALTER TABLE "home_why_tour_slots" ADD CONSTRAINT "home_why_tour_slots_tour_id_fk"
      FOREIGN KEY ("tour_id") REFERENCES "tour_products"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;
    DO $$ BEGIN ALTER TABLE "home_why_tour_slots" ADD CONSTRAINT "home_why_tour_slots_fallback_tour_id_fk"
      FOREIGN KEY ("fallback_tour_id") REFERENCES "tour_products"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;
    DO $$ BEGIN ALTER TABLE "home_why_tour_slots" ADD CONSTRAINT "home_why_tour_slots_presentation_media_id_fk"
      FOREIGN KEY ("presentation_media_id") REFERENCES "media"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;
    DO $$ BEGIN ALTER TABLE "home_why_tour_slots_locales" ADD CONSTRAINT "home_why_tour_slots_locales_parent_id_fk"
      FOREIGN KEY ("_parent_id") REFERENCES "home_why_tour_slots"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    DO $$ BEGIN ALTER TABLE "_home_why_tour_slots_v" ADD CONSTRAINT "_home_why_tour_slots_v_parent_id_fk"
      FOREIGN KEY ("_parent_id") REFERENCES "_pages_v"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;
    DO $$ BEGIN ALTER TABLE "_home_why_tour_slots_v" ADD CONSTRAINT "_home_why_tour_slots_v_tour_id_fk"
      FOREIGN KEY ("tour_id") REFERENCES "tour_products"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;
    DO $$ BEGIN ALTER TABLE "_home_why_tour_slots_v" ADD CONSTRAINT "_home_why_tour_slots_v_fallback_tour_id_fk"
      FOREIGN KEY ("fallback_tour_id") REFERENCES "tour_products"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;
    DO $$ BEGIN ALTER TABLE "_home_why_tour_slots_v" ADD CONSTRAINT "_home_why_tour_slots_v_presentation_media_id_fk"
      FOREIGN KEY ("presentation_media_id") REFERENCES "media"("id") ON DELETE set null ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;
    DO $$ BEGIN ALTER TABLE "_home_why_tour_slots_v_locales" ADD CONSTRAINT "_home_why_tour_slots_v_locales_parent_id_fk"
      FOREIGN KEY ("_parent_id") REFERENCES "_home_why_tour_slots_v"("id") ON DELETE cascade ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;

    CREATE INDEX IF NOT EXISTS "home_why_tour_slots_order_idx" ON "home_why_tour_slots" ("_order");
    CREATE INDEX IF NOT EXISTS "home_why_tour_slots_parent_id_idx" ON "home_why_tour_slots" ("_parent_id");
    CREATE INDEX IF NOT EXISTS "home_why_tour_slots_tour_idx" ON "home_why_tour_slots" ("tour_id");
    CREATE INDEX IF NOT EXISTS "home_why_tour_slots_fallback_tour_idx" ON "home_why_tour_slots" ("fallback_tour_id");
    CREATE INDEX IF NOT EXISTS "home_why_tour_slots_media_idx" ON "home_why_tour_slots" ("presentation_media_id");
    CREATE UNIQUE INDEX IF NOT EXISTS "home_why_tour_slots_locales_locale_parent_unq"
      ON "home_why_tour_slots_locales" ("_locale", "_parent_id");
    CREATE INDEX IF NOT EXISTS "_home_why_tour_slots_v_order_idx" ON "_home_why_tour_slots_v" ("_order");
    CREATE INDEX IF NOT EXISTS "_home_why_tour_slots_v_parent_id_idx" ON "_home_why_tour_slots_v" ("_parent_id");
    CREATE INDEX IF NOT EXISTS "_home_why_tour_slots_v_tour_idx" ON "_home_why_tour_slots_v" ("tour_id");
    CREATE UNIQUE INDEX IF NOT EXISTS "_home_why_tour_slots_v_locales_locale_parent_unq"
      ON "_home_why_tour_slots_v_locales" ("_locale", "_parent_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "_home_why_tour_slots_v_locales" CASCADE;
    DROP TABLE IF EXISTS "_home_why_tour_slots_v" CASCADE;
    DROP TABLE IF EXISTS "home_why_tour_slots_locales" CASCADE;
    DROP TABLE IF EXISTS "home_why_tour_slots" CASCADE;
  `)
  for (const [name] of [...enumTypes].reverse()) {
    await db.execute(sql.raw(`DROP TYPE IF EXISTS "public"."${name}"`))
  }
}
