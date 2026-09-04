import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    UPDATE "site_settings"
    SET
      "site_name" = 'wingside.vn',
      "branding_logo_text" = 'wingside.vn',
      "branding_theme_key" = 'wings-side'
    WHERE "site_id" = (SELECT "id" FROM "sites" WHERE "code" = 'wing-side');

    UPDATE "site_settings_locales"
    SET "seo_default_title" = 'wingside.vn'
    WHERE "_parent_id" IN (
      SELECT ss."id"
      FROM "site_settings" AS ss
      INNER JOIN "sites" AS s ON s."id" = ss."site_id"
      WHERE s."code" = 'wing-side'
    );

    UPDATE "pages_locales" AS pl
    SET "meta_title" = regexp_replace(
      pl."meta_title",
      '^(WingSide|WingSide|Wingside|Wing Side)',
      'wingside.vn'
    )
    WHERE pl."meta_title" ~ '^(WingSide|WingSide|Wingside|Wing Side)'
      AND EXISTS (
        SELECT 1
        FROM "pages" AS p
        INNER JOIN "sites" AS s ON s."id" = p."site_id"
        WHERE p."id" = pl."_parent_id"
          AND s."code" = 'wing-side'
      );
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    UPDATE "pages_locales" AS pl
    SET "meta_title" = regexp_replace(pl."meta_title", '^wingside\.vn', 'WingSide')
    WHERE pl."meta_title" ~ '^wingside\.vn'
      AND EXISTS (
        SELECT 1
        FROM "pages" AS p
        INNER JOIN "sites" AS s ON s."id" = p."site_id"
        WHERE p."id" = pl."_parent_id"
          AND s."code" = 'wing-side'
      );

    UPDATE "site_settings"
    SET "branding_theme_key" = 'custom'
    WHERE "site_id" = (SELECT "id" FROM "sites" WHERE "code" = 'wing-side')
      AND "branding_theme_key" = 'wings-side';
  `)
}
