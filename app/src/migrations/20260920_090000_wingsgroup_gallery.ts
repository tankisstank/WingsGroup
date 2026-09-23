import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TYPE "public"."enum_pages_blocks_wings_group_gallery_items_category"
      AS ENUM('activity', 'achievement', 'partner', 'airline', 'hotel');
    CREATE TYPE "public"."enum_pages_blocks_wings_group_gallery_items_media_type"
      AS ENUM('photo', 'logo');
    CREATE TYPE "public"."enum__pages_v_blocks_wings_group_gallery_items_category"
      AS ENUM('activity', 'achievement', 'partner', 'airline', 'hotel');
    CREATE TYPE "public"."enum__pages_v_blocks_wings_group_gallery_items_media_type"
      AS ENUM('photo', 'logo');

    CREATE TABLE "pages_blocks_wings_group_gallery" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "_path" text NOT NULL,
      "_locale" "_locales" NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "eyebrow" varchar,
      "title" varchar,
      "description" varchar,
      "block_name" varchar
    );

    CREATE TABLE "pages_blocks_wings_group_gallery_items" (
      "_order" integer NOT NULL,
      "_parent_id" varchar NOT NULL,
      "_locale" "_locales" NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "category" "enum_pages_blocks_wings_group_gallery_items_category" DEFAULT 'activity',
      "media_id" integer,
      "media_type" "enum_pages_blocks_wings_group_gallery_items_media_type" DEFAULT 'photo',
      "title" varchar,
      "alt" varchar,
      "caption" varchar,
      "illustrative" boolean DEFAULT false,
      "visible" boolean DEFAULT true
    );

    CREATE TABLE "_pages_v_blocks_wings_group_gallery" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "_path" text NOT NULL,
      "_locale" "_locales" NOT NULL,
      "id" serial PRIMARY KEY NOT NULL,
      "eyebrow" varchar,
      "title" varchar,
      "description" varchar,
      "_uuid" varchar,
      "block_name" varchar
    );

    CREATE TABLE "_pages_v_blocks_wings_group_gallery_items" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "_locale" "_locales" NOT NULL,
      "id" serial PRIMARY KEY NOT NULL,
      "category" "enum__pages_v_blocks_wings_group_gallery_items_category" DEFAULT 'activity',
      "media_id" integer,
      "media_type" "enum__pages_v_blocks_wings_group_gallery_items_media_type" DEFAULT 'photo',
      "title" varchar,
      "alt" varchar,
      "caption" varchar,
      "illustrative" boolean DEFAULT false,
      "visible" boolean DEFAULT true,
      "_uuid" varchar
    );

    ALTER TABLE "pages_blocks_wings_group_gallery"
      ADD CONSTRAINT "pages_blocks_wings_group_gallery_parent_id_fk"
      FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id") ON DELETE cascade;
    ALTER TABLE "pages_blocks_wings_group_gallery_items"
      ADD CONSTRAINT "pages_blocks_wings_group_gallery_items_parent_id_fk"
      FOREIGN KEY ("_parent_id") REFERENCES "pages_blocks_wings_group_gallery"("id") ON DELETE cascade;
    ALTER TABLE "pages_blocks_wings_group_gallery_items"
      ADD CONSTRAINT "pages_blocks_wings_group_gallery_items_media_id_media_id_fk"
      FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null;
    ALTER TABLE "_pages_v_blocks_wings_group_gallery"
      ADD CONSTRAINT "_pages_v_blocks_wings_group_gallery_parent_id_fk"
      FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id") ON DELETE cascade;
    ALTER TABLE "_pages_v_blocks_wings_group_gallery_items"
      ADD CONSTRAINT "_pages_v_blocks_wings_group_gallery_items_parent_id_fk"
      FOREIGN KEY ("_parent_id") REFERENCES "_pages_v_blocks_wings_group_gallery"("id") ON DELETE cascade;
    ALTER TABLE "_pages_v_blocks_wings_group_gallery_items"
      ADD CONSTRAINT "_pages_v_blocks_wings_group_gallery_items_media_id_media_id_fk"
      FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null;

    CREATE INDEX "pages_blocks_wings_group_gallery_order_idx"
      ON "pages_blocks_wings_group_gallery" ("_order");
    CREATE INDEX "pages_blocks_wings_group_gallery_parent_id_idx"
      ON "pages_blocks_wings_group_gallery" ("_parent_id");
    CREATE INDEX "pages_blocks_wings_group_gallery_path_idx"
      ON "pages_blocks_wings_group_gallery" ("_path");
    CREATE INDEX "pages_blocks_wings_group_gallery_locale_idx"
      ON "pages_blocks_wings_group_gallery" ("_locale");
    CREATE INDEX "pages_blocks_wings_group_gallery_items_order_idx"
      ON "pages_blocks_wings_group_gallery_items" ("_order");
    CREATE INDEX "pages_blocks_wings_group_gallery_items_parent_id_idx"
      ON "pages_blocks_wings_group_gallery_items" ("_parent_id");
    CREATE INDEX "pages_blocks_wings_group_gallery_items_locale_idx"
      ON "pages_blocks_wings_group_gallery_items" ("_locale");
    CREATE INDEX "pages_blocks_wings_group_gallery_items_media_idx"
      ON "pages_blocks_wings_group_gallery_items" ("media_id");
    CREATE INDEX "_pages_v_blocks_wings_group_gallery_order_idx"
      ON "_pages_v_blocks_wings_group_gallery" ("_order");
    CREATE INDEX "_pages_v_blocks_wings_group_gallery_parent_id_idx"
      ON "_pages_v_blocks_wings_group_gallery" ("_parent_id");
    CREATE INDEX "_pages_v_blocks_wings_group_gallery_path_idx"
      ON "_pages_v_blocks_wings_group_gallery" ("_path");
    CREATE INDEX "_pages_v_blocks_wings_group_gallery_locale_idx"
      ON "_pages_v_blocks_wings_group_gallery" ("_locale");
    CREATE INDEX "_pages_v_blocks_wings_group_gallery_items_order_idx"
      ON "_pages_v_blocks_wings_group_gallery_items" ("_order");
    CREATE INDEX "_pages_v_blocks_wings_group_gallery_items_parent_id_idx"
      ON "_pages_v_blocks_wings_group_gallery_items" ("_parent_id");
    CREATE INDEX "_pages_v_blocks_wings_group_gallery_items_locale_idx"
      ON "_pages_v_blocks_wings_group_gallery_items" ("_locale");
    CREATE INDEX "_pages_v_blocks_wings_group_gallery_items_media_idx"
      ON "_pages_v_blocks_wings_group_gallery_items" ("media_id");
  `)
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  // Keep the additive tables on rollback so a code rollback cannot erase CMS-authored content.
}
