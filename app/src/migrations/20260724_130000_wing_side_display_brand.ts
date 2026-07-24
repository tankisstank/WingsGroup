import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    UPDATE "sites"
    SET "name" = 'WingSide'
    WHERE "code" = 'wing-side';

    UPDATE "site_settings"
    SET
      "site_name" = 'WingSide',
      "branding_logo_text" = 'WingSide'
    WHERE "site_id" = (SELECT "id" FROM "sites" WHERE "code" = 'wing-side');

    UPDATE "site_settings_locales"
    SET "seo_default_title" = 'WingSide'
    WHERE "_parent_id" IN (
      SELECT ss."id"
      FROM "site_settings" AS ss
      INNER JOIN "sites" AS s ON s."id" = ss."site_id"
      WHERE s."code" = 'wing-side'
    );

    UPDATE "pages_locales" AS pl
    SET "meta_title" = regexp_replace(
      pl."meta_title",
      '^(WingsSide|Wingside|Wing Side|wingside\.vn)',
      'WingSide'
    )
    WHERE pl."meta_title" ~ '^(WingsSide|Wingside|Wing Side|wingside\.vn)'
      AND EXISTS (
        SELECT 1
        FROM "pages" AS p
        INNER JOIN "sites" AS s ON s."id" = p."site_id"
        WHERE p."id" = pl."_parent_id"
          AND s."code" = 'wing-side'
      );

    UPDATE "forms"
    SET "title" = 'WingSide Trip Planner'
    WHERE "title" IN ('WingsSide Trip Planner', 'Wingside Trip Planner')
      AND "site_id" = (SELECT "id" FROM "sites" WHERE "code" = 'wing-side');
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    UPDATE "forms"
    SET "title" = 'WingsSide Trip Planner'
    WHERE "title" = 'WingSide Trip Planner'
      AND "site_id" = (SELECT "id" FROM "sites" WHERE "code" = 'wing-side');

    UPDATE "pages_locales" AS pl
    SET "meta_title" = regexp_replace(pl."meta_title", '^WingSide', 'wingside.vn')
    WHERE pl."meta_title" ~ '^WingSide'
      AND EXISTS (
        SELECT 1
        FROM "pages" AS p
        INNER JOIN "sites" AS s ON s."id" = p."site_id"
        WHERE p."id" = pl."_parent_id"
          AND s."code" = 'wing-side'
      );

    UPDATE "site_settings"
    SET
      "site_name" = 'wingside.vn',
      "branding_logo_text" = 'wingside.vn'
    WHERE "site_id" = (SELECT "id" FROM "sites" WHERE "code" = 'wing-side');

    UPDATE "site_settings_locales"
    SET "seo_default_title" = 'wingside.vn'
    WHERE "_parent_id" IN (
      SELECT ss."id"
      FROM "site_settings" AS ss
      INNER JOIN "sites" AS s ON s."id" = ss."site_id"
      WHERE s."code" = 'wing-side'
    );

    UPDATE "sites"
    SET "name" = 'wingside.vn'
    WHERE "code" = 'wing-side';
  `)
}
