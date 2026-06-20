import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "site_settings"
      ADD COLUMN "branding_favicon_image_id" integer;

    UPDATE "site_settings"
    SET "branding_favicon_image_id" = COALESCE("branding_logo_image_id", "seo_default_image_id")
    WHERE "branding_favicon_image_id" IS NULL;

    ALTER TABLE "site_settings"
      ADD CONSTRAINT "site_settings_branding_favicon_image_id_media_id_fk"
      FOREIGN KEY ("branding_favicon_image_id")
      REFERENCES "public"."media"("id")
      ON DELETE set null
      ON UPDATE no action;

    CREATE INDEX "site_settings_branding_favicon_image_idx"
      ON "site_settings" USING btree ("branding_favicon_image_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX "site_settings_branding_favicon_image_idx";

    ALTER TABLE "site_settings"
      DROP CONSTRAINT "site_settings_branding_favicon_image_id_media_id_fk";

    ALTER TABLE "site_settings"
      DROP COLUMN "branding_favicon_image_id";
  `)
}
