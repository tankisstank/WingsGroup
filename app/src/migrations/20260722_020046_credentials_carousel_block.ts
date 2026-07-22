import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TYPE "public"."enum_pages_blocks_credentials_carousel_items_kind"
      AS ENUM('cert', 'award', 'member', 'iso');
    CREATE TYPE "public"."enum__pages_v_blocks_credentials_carousel_items_kind"
      AS ENUM('cert', 'award', 'member', 'iso');

    CREATE TABLE "pages_blocks_credentials_carousel" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "_path" text NOT NULL,
      "_locale" "_locales" NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "full_bleed" boolean DEFAULT true,
      "eyebrow" varchar,
      "title" varchar,
      "description" varchar,
      "aria_label" varchar,
      "autoplay" boolean DEFAULT true,
      "interval_ms" numeric DEFAULT 5500,
      "block_name" varchar
    );

    CREATE TABLE "pages_blocks_credentials_carousel_items" (
      "_order" integer NOT NULL,
      "_parent_id" varchar NOT NULL,
      "_locale" "_locales" NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "kind" "enum_pages_blocks_credentials_carousel_items_kind" DEFAULT 'cert',
      "image_id" integer,
      "mark" varchar,
      "label" varchar,
      "title" varchar,
      "description" varchar
    );

    CREATE TABLE "_pages_v_blocks_credentials_carousel" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "_path" text NOT NULL,
      "_locale" "_locales" NOT NULL,
      "id" serial PRIMARY KEY NOT NULL,
      "full_bleed" boolean DEFAULT true,
      "eyebrow" varchar,
      "title" varchar,
      "description" varchar,
      "aria_label" varchar,
      "autoplay" boolean DEFAULT true,
      "interval_ms" numeric DEFAULT 5500,
      "_uuid" varchar,
      "block_name" varchar
    );

    CREATE TABLE "_pages_v_blocks_credentials_carousel_items" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "_locale" "_locales" NOT NULL,
      "id" serial PRIMARY KEY NOT NULL,
      "kind" "enum__pages_v_blocks_credentials_carousel_items_kind" DEFAULT 'cert',
      "image_id" integer,
      "mark" varchar,
      "label" varchar,
      "title" varchar,
      "description" varchar,
      "_uuid" varchar
    );

    ALTER TABLE "pages_blocks_credentials_carousel"
      ADD CONSTRAINT "pages_blocks_credentials_carousel_parent_id_fk"
      FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade;
    ALTER TABLE "pages_blocks_credentials_carousel_items"
      ADD CONSTRAINT "pages_blocks_credentials_carousel_items_parent_id_fk"
      FOREIGN KEY ("_parent_id") REFERENCES "public"."pages_blocks_credentials_carousel"("id") ON DELETE cascade;
    ALTER TABLE "pages_blocks_credentials_carousel_items"
      ADD CONSTRAINT "pages_blocks_credentials_carousel_items_image_id_media_id_fk"
      FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null;
    ALTER TABLE "_pages_v_blocks_credentials_carousel"
      ADD CONSTRAINT "_pages_v_blocks_credentials_carousel_parent_id_fk"
      FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade;
    ALTER TABLE "_pages_v_blocks_credentials_carousel_items"
      ADD CONSTRAINT "_pages_v_blocks_credentials_carousel_items_parent_id_fk"
      FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v_blocks_credentials_carousel"("id") ON DELETE cascade;
    ALTER TABLE "_pages_v_blocks_credentials_carousel_items"
      ADD CONSTRAINT "_pages_v_blocks_credentials_carousel_items_image_id_media_id_fk"
      FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null;

    CREATE INDEX "pages_blocks_credentials_carousel_order_idx"
      ON "pages_blocks_credentials_carousel" ("_order");
    CREATE INDEX "pages_blocks_credentials_carousel_parent_id_idx"
      ON "pages_blocks_credentials_carousel" ("_parent_id");
    CREATE INDEX "pages_blocks_credentials_carousel_path_idx"
      ON "pages_blocks_credentials_carousel" ("_path");
    CREATE INDEX "pages_blocks_credentials_carousel_locale_idx"
      ON "pages_blocks_credentials_carousel" ("_locale");
    CREATE INDEX "pages_blocks_credentials_carousel_items_order_idx"
      ON "pages_blocks_credentials_carousel_items" ("_order");
    CREATE INDEX "pages_blocks_credentials_carousel_items_parent_id_idx"
      ON "pages_blocks_credentials_carousel_items" ("_parent_id");
    CREATE INDEX "pages_blocks_credentials_carousel_items_locale_idx"
      ON "pages_blocks_credentials_carousel_items" ("_locale");
    CREATE INDEX "pages_blocks_credentials_carousel_items_image_idx"
      ON "pages_blocks_credentials_carousel_items" ("image_id");
    CREATE INDEX "_pages_v_blocks_credentials_carousel_order_idx"
      ON "_pages_v_blocks_credentials_carousel" ("_order");
    CREATE INDEX "_pages_v_blocks_credentials_carousel_parent_id_idx"
      ON "_pages_v_blocks_credentials_carousel" ("_parent_id");
    CREATE INDEX "_pages_v_blocks_credentials_carousel_path_idx"
      ON "_pages_v_blocks_credentials_carousel" ("_path");
    CREATE INDEX "_pages_v_blocks_credentials_carousel_locale_idx"
      ON "_pages_v_blocks_credentials_carousel" ("_locale");
    CREATE INDEX "_pages_v_blocks_credentials_carousel_items_order_idx"
      ON "_pages_v_blocks_credentials_carousel_items" ("_order");
    CREATE INDEX "_pages_v_blocks_credentials_carousel_items_parent_id_idx"
      ON "_pages_v_blocks_credentials_carousel_items" ("_parent_id");
    CREATE INDEX "_pages_v_blocks_credentials_carousel_items_locale_idx"
      ON "_pages_v_blocks_credentials_carousel_items" ("_locale");
    CREATE INDEX "_pages_v_blocks_credentials_carousel_items_image_idx"
      ON "_pages_v_blocks_credentials_carousel_items" ("image_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "_pages_v_blocks_credentials_carousel_items" CASCADE;
    DROP TABLE IF EXISTS "_pages_v_blocks_credentials_carousel" CASCADE;
    DROP TABLE IF EXISTS "pages_blocks_credentials_carousel_items" CASCADE;
    DROP TABLE IF EXISTS "pages_blocks_credentials_carousel" CASCADE;
    DROP TYPE IF EXISTS "public"."enum__pages_v_blocks_credentials_carousel_items_kind";
    DROP TYPE IF EXISTS "public"."enum_pages_blocks_credentials_carousel_items_kind";
  `)
}
