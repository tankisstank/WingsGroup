import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM "sites" WHERE "code" = 'wings-side')
         AND EXISTS (SELECT 1 FROM "sites" WHERE "code" = 'wing-side') THEN
        RAISE EXCEPTION 'Cannot normalize Wingside tenant: both wings-side and wing-side exist';
      END IF;
    END $$;

    UPDATE "site_settings"
    SET
      "site_name" = CASE
        WHEN "site_name" IN ('WingSide', 'WingSide', 'Wingside', 'Wing Side') THEN 'wingside.vn'
        ELSE "site_name"
      END,
      "branding_logo_text" = CASE
        WHEN "branding_logo_text" IN ('WingSide', 'WingSide', 'Wingside', 'Wing Side') THEN 'wingside.vn'
        ELSE "branding_logo_text"
      END
    WHERE "site_id" IN (
      SELECT "id" FROM "sites" WHERE "code" IN ('wings-side', 'wing-side')
    );

    UPDATE "site_settings_locales"
    SET "seo_default_title" = 'wingside.vn'
    WHERE "seo_default_title" IN ('WingSide', 'WingSide', 'Wingside', 'Wing Side')
      AND "_parent_id" IN (
        SELECT "id" FROM "site_settings"
        WHERE "site_id" IN (
          SELECT "id" FROM "sites" WHERE "code" IN ('wings-side', 'wing-side')
        )
      );

    UPDATE "sites"
    SET
      "code" = 'wing-side',
      "name" = CASE
        WHEN "name" IN ('WingSide', 'WingSide', 'Wingside', 'Wing Side') THEN 'wingside.vn'
        ELSE "name"
      END
    WHERE "code" = 'wings-side';

    UPDATE "sites"
    SET "name" = 'wingside.vn'
    WHERE "code" = 'wing-side'
      AND "name" IN ('WingSide', 'WingSide', 'Wingside', 'Wing Side');

    -- pages_locales normalization (tenant-scoped via pages.site_id)
    -- title: normalize exact legacy brand strings to 'wingside.vn'
    UPDATE "pages_locales" AS pl
    SET "title" = 'wingside.vn'
    WHERE pl."title" IN ('WingSide', 'WingSide', 'Wingside', 'Wing Side')
      AND EXISTS (
        SELECT 1 FROM "pages" AS p
        WHERE p."id" = pl."_parent_id"
          AND p."site_id" IN (
            SELECT "id" FROM "sites" WHERE "code" IN ('wings-side', 'wing-side')
          )
      );

    -- meta_title: regexp_replace leading legacy brand token with 'wingside.vn'
    UPDATE "pages_locales" AS pl
    SET "meta_title" = regexp_replace(
      pl."meta_title",
      '^(WingSide|WingSide|Wingside|Wing Side)',
      'wingside.vn'
    )
    WHERE pl."meta_title" ~ '^(WingSide|WingSide|Wingside|Wing Side)'
      AND EXISTS (
        SELECT 1 FROM "pages" AS p
        WHERE p."id" = pl."_parent_id"
          AND p."site_id" IN (
            SELECT "id" FROM "sites" WHERE "code" IN ('wings-side', 'wing-side')
          )
      );
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM "sites" WHERE "code" = 'wing-side')
         AND EXISTS (SELECT 1 FROM "sites" WHERE "code" = 'wings-side') THEN
        RAISE EXCEPTION 'Cannot restore Wingside tenant: both wing-side and wings-side exist';
      END IF;
    END $$;

    -- Reverse pages_locales before site code changes back
    UPDATE "pages_locales" AS pl
    SET "title" = 'WingSide'
    WHERE pl."title" = 'wingside.vn'
      AND EXISTS (
        SELECT 1 FROM "pages" AS p
        WHERE p."id" = pl."_parent_id"
          AND p."site_id" IN (SELECT "id" FROM "sites" WHERE "code" = 'wing-side')
      );

    UPDATE "pages_locales" AS pl
    SET "meta_title" = regexp_replace(pl."meta_title", '^wingside\.vn', 'WingSide')
    WHERE pl."meta_title" ~ '^wingside\.vn'
      AND EXISTS (
        SELECT 1 FROM "pages" AS p
        WHERE p."id" = pl."_parent_id"
          AND p."site_id" IN (SELECT "id" FROM "sites" WHERE "code" = 'wing-side')
      );

    UPDATE "site_settings"
    SET
      "site_name" = CASE WHEN "site_name" = 'wingside.vn' THEN 'WingSide' ELSE "site_name" END,
      "branding_logo_text" = CASE
        WHEN "branding_logo_text" = 'wingside.vn' THEN 'WingSide'
        ELSE "branding_logo_text"
      END
    WHERE "site_id" IN (SELECT "id" FROM "sites" WHERE "code" = 'wing-side');

    UPDATE "site_settings_locales"
    SET "seo_default_title" = 'WingSide'
    WHERE "seo_default_title" = 'wingside.vn'
      AND "_parent_id" IN (
        SELECT "id" FROM "site_settings"
        WHERE "site_id" IN (SELECT "id" FROM "sites" WHERE "code" = 'wing-side')
      );

    UPDATE "sites"
    SET "code" = 'wings-side', "name" = CASE WHEN "name" = 'wingside.vn' THEN 'WingSide' ELSE "name" END
    WHERE "code" = 'wing-side';
  `)
}
