import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$
    DECLARE
      target_site_id integer;
      target_default_locale text;
      locale_count integer;
      distinct_locale_count integer;
      distinct_order_count integer;
      locale_signature text;
      site_count integer;
    BEGIN
      SELECT count(*)::integer
      INTO site_count
      FROM "sites"
      WHERE "code" = 'wing-side';

      IF site_count = 0 THEN
        RETURN;
      END IF;

      IF site_count <> 1 THEN
        RAISE EXCEPTION 'Cannot normalize wing-side supported locales: ambiguous canonical tenant';
      END IF;

      SELECT "id", "default_locale"::text
      INTO target_site_id, target_default_locale
      FROM "sites"
      WHERE "code" = 'wing-side';

      IF target_default_locale <> 'en' THEN
        RAISE EXCEPTION 'Cannot normalize wing-side supported locales: expected default_locale=en, found %', target_default_locale;
      END IF;

      SELECT
        count(*)::integer,
        count(DISTINCT "value"::text)::integer,
        count(DISTINCT "order")::integer,
        string_agg("value"::text || '@' || "order"::text, ',' ORDER BY "order", "value"::text)
      INTO locale_count, distinct_locale_count, distinct_order_count, locale_signature
      FROM "sites_supported_locales"
      WHERE "parent_id" = target_site_id;

      IF locale_count <> distinct_locale_count OR locale_count <> distinct_order_count THEN
        RAISE EXCEPTION 'Cannot normalize wing-side supported locales: duplicate locale or order rows';
      END IF;

      IF locale_signature = 'en@1,vi@2,it@3,es@4,pt@5' THEN
        RETURN;
      END IF;

      IF locale_signature <> 'en@1,vi@2' THEN
        RAISE EXCEPTION 'Cannot normalize wing-side supported locales: unexpected pre-state %', coalesce(locale_signature, '<empty>');
      END IF;

      INSERT INTO "sites_supported_locales" ("order", "parent_id", "value")
      VALUES
        (3, target_site_id, 'it'::"enum_sites_supported_locales"),
        (4, target_site_id, 'es'::"enum_sites_supported_locales"),
        (5, target_site_id, 'pt'::"enum_sites_supported_locales");
    END $$;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DO $$
    DECLARE
      target_site_id integer;
      target_default_locale text;
      locale_count integer;
      distinct_locale_count integer;
      distinct_order_count integer;
      locale_signature text;
      site_count integer;
    BEGIN
      SELECT count(*)::integer
      INTO site_count
      FROM "sites"
      WHERE "code" = 'wing-side';

      IF site_count = 0 THEN
        RETURN;
      END IF;

      IF site_count <> 1 THEN
        RAISE EXCEPTION 'Cannot restore wing-side supported locales: ambiguous canonical tenant';
      END IF;

      SELECT "id", "default_locale"::text
      INTO target_site_id, target_default_locale
      FROM "sites"
      WHERE "code" = 'wing-side';

      IF target_default_locale <> 'en' THEN
        RAISE EXCEPTION 'Cannot restore wing-side supported locales: expected default_locale=en, found %', target_default_locale;
      END IF;

      SELECT
        count(*)::integer,
        count(DISTINCT "value"::text)::integer,
        count(DISTINCT "order")::integer,
        string_agg("value"::text || '@' || "order"::text, ',' ORDER BY "order", "value"::text)
      INTO locale_count, distinct_locale_count, distinct_order_count, locale_signature
      FROM "sites_supported_locales"
      WHERE "parent_id" = target_site_id;

      IF locale_count <> distinct_locale_count OR locale_count <> distinct_order_count THEN
        RAISE EXCEPTION 'Cannot restore wing-side supported locales: duplicate locale or order rows';
      END IF;

      IF locale_signature = 'en@1,vi@2' THEN
        RETURN;
      END IF;

      IF locale_signature <> 'en@1,vi@2,it@3,es@4,pt@5' THEN
        RAISE EXCEPTION 'Cannot restore wing-side supported locales: unexpected state %', coalesce(locale_signature, '<empty>');
      END IF;

      DELETE FROM "sites_supported_locales"
      WHERE "parent_id" = target_site_id
        AND "value"::text IN ('it', 'es', 'pt');
    END $$;
  `)
}
