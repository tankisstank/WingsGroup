import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TYPE "public"."enum_site_settings_branding_theme_key" ADD VALUE IF NOT EXISTS 'wings-group';

    UPDATE "sites"
    SET
      "code" = 'wings-group',
      "name" = 'WingsGroup',
      "primary_domain" = CASE
        WHEN "primary_domain" = 'wingstravel.local' THEN 'wingsgroup.local'
        WHEN "primary_domain" = 'wingstravel.vn' THEN 'wingsgroup.vn'
        ELSE "primary_domain"
      END
    WHERE "code" = 'wings-travel';

    UPDATE "site_settings"
    SET
      "site_name" = CASE WHEN "site_name" = 'WingsTravel' THEN 'WingsGroup' ELSE "site_name" END,
      "branding_logo_text" = CASE WHEN "branding_logo_text" = 'WingsTravel' THEN 'WingsGroup' ELSE "branding_logo_text" END,
      "branding_theme_key" = 'wings-group',
      "seo_canonical_domain" = CASE
        WHEN "seo_canonical_domain" = 'https://wingstravel.vn' THEN 'https://wingsgroup.vn'
        WHEN "seo_canonical_domain" = 'https://wingstravel.local' THEN 'https://wingsgroup.local'
        ELSE "seo_canonical_domain"
      END
    WHERE "branding_theme_key" = 'wings-travel'
       OR "site_name" = 'WingsTravel'
       OR "branding_logo_text" = 'WingsTravel';
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    UPDATE "sites"
    SET
      "code" = 'wings-travel',
      "name" = 'WingsTravel',
      "primary_domain" = CASE
        WHEN "primary_domain" = 'wingsgroup.local' THEN 'wingstravel.local'
        WHEN "primary_domain" = 'wingsgroup.vn' THEN 'wingstravel.vn'
        ELSE "primary_domain"
      END
    WHERE "code" = 'wings-group';

    UPDATE "site_settings"
    SET
      "site_name" = CASE WHEN "site_name" = 'WingsGroup' THEN 'WingsTravel' ELSE "site_name" END,
      "branding_logo_text" = CASE WHEN "branding_logo_text" = 'WingsGroup' THEN 'WingsTravel' ELSE "branding_logo_text" END,
      "branding_theme_key" = 'wings-travel',
      "seo_canonical_domain" = CASE
        WHEN "seo_canonical_domain" = 'https://wingsgroup.vn' THEN 'https://wingstravel.vn'
        WHEN "seo_canonical_domain" = 'https://wingsgroup.local' THEN 'https://wingstravel.local'
        ELSE "seo_canonical_domain"
      END
    WHERE "branding_theme_key" = 'wings-group'
       OR "site_name" = 'WingsGroup'
       OR "branding_logo_text" = 'WingsGroup';
  `)
}
