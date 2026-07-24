import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TYPE "public"."enum_tour_products_destination_tags"
      AS ENUM('hanoi', 'halong', 'ninh-binh', 'sapa', 'mai-chau', 'hue', 'da-nang', 'hoian', 'ho-chi-minh-city', 'mekong', 'phu-quoc', 'ninh-thuan', 'siem-reap');
    CREATE TYPE "public"."enum_tour_products_travel_styles"
      AS ENUM('luxury', 'family', 'culture', 'adventure', 'wellness', 'romance', 'business');
    CREATE TYPE "public"."enum__tour_products_v_version_destination_tags"
      AS ENUM('hanoi', 'halong', 'ninh-binh', 'sapa', 'mai-chau', 'hue', 'da-nang', 'hoian', 'ho-chi-minh-city', 'mekong', 'phu-quoc', 'ninh-thuan', 'siem-reap');
    CREATE TYPE "public"."enum__tour_products_v_version_travel_styles"
      AS ENUM('luxury', 'family', 'culture', 'adventure', 'wellness', 'romance', 'business');

    CREATE TABLE "tour_products_destination_tags" (
      "order" integer NOT NULL,
      "parent_id" integer NOT NULL,
      "value" "enum_tour_products_destination_tags",
      "id" serial PRIMARY KEY NOT NULL
    );
    CREATE TABLE "tour_products_travel_styles" (
      "order" integer NOT NULL,
      "parent_id" integer NOT NULL,
      "value" "enum_tour_products_travel_styles",
      "id" serial PRIMARY KEY NOT NULL
    );
    CREATE TABLE "_tour_products_v_version_destination_tags" (
      "order" integer NOT NULL,
      "parent_id" integer NOT NULL,
      "value" "enum__tour_products_v_version_destination_tags",
      "id" serial PRIMARY KEY NOT NULL
    );
    CREATE TABLE "_tour_products_v_version_travel_styles" (
      "order" integer NOT NULL,
      "parent_id" integer NOT NULL,
      "value" "enum__tour_products_v_version_travel_styles",
      "id" serial PRIMARY KEY NOT NULL
    );

    ALTER TABLE "tour_products" ADD COLUMN "taxonomy_provenance" jsonb;
    ALTER TABLE "_tour_products_v" ADD COLUMN "version_taxonomy_provenance" jsonb;

    ALTER TABLE "tour_products_destination_tags"
      ADD CONSTRAINT "tour_products_destination_tags_parent_fk"
      FOREIGN KEY ("parent_id") REFERENCES "public"."tour_products"("id")
      ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "tour_products_travel_styles"
      ADD CONSTRAINT "tour_products_travel_styles_parent_fk"
      FOREIGN KEY ("parent_id") REFERENCES "public"."tour_products"("id")
      ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "_tour_products_v_version_destination_tags"
      ADD CONSTRAINT "_tour_products_v_version_destination_tags_parent_fk"
      FOREIGN KEY ("parent_id") REFERENCES "public"."_tour_products_v"("id")
      ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "_tour_products_v_version_travel_styles"
      ADD CONSTRAINT "_tour_products_v_version_travel_styles_parent_fk"
      FOREIGN KEY ("parent_id") REFERENCES "public"."_tour_products_v"("id")
      ON DELETE cascade ON UPDATE no action;

    CREATE INDEX "tour_products_destination_tags_order_idx"
      ON "tour_products_destination_tags" USING btree ("order");
    CREATE INDEX "tour_products_destination_tags_parent_idx"
      ON "tour_products_destination_tags" USING btree ("parent_id");
    CREATE INDEX "tour_products_destination_tags_value_idx"
      ON "tour_products_destination_tags" USING btree ("value");
    CREATE INDEX "tour_products_travel_styles_order_idx"
      ON "tour_products_travel_styles" USING btree ("order");
    CREATE INDEX "tour_products_travel_styles_parent_idx"
      ON "tour_products_travel_styles" USING btree ("parent_id");
    CREATE INDEX "tour_products_travel_styles_value_idx"
      ON "tour_products_travel_styles" USING btree ("value");
    CREATE INDEX "_tour_products_v_version_destination_tags_order_idx"
      ON "_tour_products_v_version_destination_tags" USING btree ("order");
    CREATE INDEX "_tour_products_v_version_destination_tags_parent_idx"
      ON "_tour_products_v_version_destination_tags" USING btree ("parent_id");
    CREATE INDEX "_tour_products_v_version_destination_tags_value_idx"
      ON "_tour_products_v_version_destination_tags" USING btree ("value");
    CREATE INDEX "_tour_products_v_version_travel_styles_order_idx"
      ON "_tour_products_v_version_travel_styles" USING btree ("order");
    CREATE INDEX "_tour_products_v_version_travel_styles_parent_idx"
      ON "_tour_products_v_version_travel_styles" USING btree ("parent_id");
    CREATE INDEX "_tour_products_v_version_travel_styles_value_idx"
      ON "_tour_products_v_version_travel_styles" USING btree ("value");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "tour_products_destination_tags" CASCADE;
    DROP TABLE IF EXISTS "tour_products_travel_styles" CASCADE;
    DROP TABLE IF EXISTS "_tour_products_v_version_destination_tags" CASCADE;
    DROP TABLE IF EXISTS "_tour_products_v_version_travel_styles" CASCADE;

    ALTER TABLE "tour_products" DROP COLUMN IF EXISTS "taxonomy_provenance";
    ALTER TABLE "_tour_products_v" DROP COLUMN IF EXISTS "version_taxonomy_provenance";

    DROP TYPE IF EXISTS "public"."enum_tour_products_destination_tags";
    DROP TYPE IF EXISTS "public"."enum_tour_products_travel_styles";
    DROP TYPE IF EXISTS "public"."enum__tour_products_v_version_destination_tags";
    DROP TYPE IF EXISTS "public"."enum__tour_products_v_version_travel_styles";
  `)
}
