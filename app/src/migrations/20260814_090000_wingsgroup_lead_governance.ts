import { sql } from '@payloadcms/db-postgres'
import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'

/**
 * Additive, optional governance metadata for WingsGroup v3 form submissions.
 * Existing tenants and historic rows remain valid with all columns NULL.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_form_submissions_wings_group_lead_locale"
        AS ENUM('vi', 'en');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE "public"."enum_form_submissions_wings_group_lead_preferred_channel"
        AS ENUM('zalo', 'whatsapp', 'messenger');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    ALTER TABLE "form_submissions"
      ADD COLUMN IF NOT EXISTS "wings_group_lead_locale"
        "enum_form_submissions_wings_group_lead_locale",
      ADD COLUMN IF NOT EXISTS "wings_group_lead_source_path" varchar,
      ADD COLUMN IF NOT EXISTS "wings_group_lead_consent_version" varchar,
      ADD COLUMN IF NOT EXISTS "wings_group_lead_consented_at" timestamp(3) with time zone,
      ADD COLUMN IF NOT EXISTS "wings_group_lead_retention_until" timestamp(3) with time zone,
      ADD COLUMN IF NOT EXISTS "wings_group_lead_preferred_channel"
        "enum_form_submissions_wings_group_lead_preferred_channel";

    CREATE INDEX IF NOT EXISTS "form_submissions_wings_group_lead_retention_until_idx"
      ON "form_submissions" USING btree ("wings_group_lead_retention_until");
    CREATE INDEX IF NOT EXISTS "form_submissions_wings_group_lead_site_retention_idx"
      ON "form_submissions" USING btree ("site_id", "wings_group_lead_retention_until")
      WHERE "wings_group_lead_retention_until" IS NOT NULL;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP INDEX IF EXISTS "form_submissions_wings_group_lead_site_retention_idx";
    DROP INDEX IF EXISTS "form_submissions_wings_group_lead_retention_until_idx";

    ALTER TABLE "form_submissions"
      DROP COLUMN IF EXISTS "wings_group_lead_preferred_channel",
      DROP COLUMN IF EXISTS "wings_group_lead_retention_until",
      DROP COLUMN IF EXISTS "wings_group_lead_consented_at",
      DROP COLUMN IF EXISTS "wings_group_lead_consent_version",
      DROP COLUMN IF EXISTS "wings_group_lead_source_path",
      DROP COLUMN IF EXISTS "wings_group_lead_locale";

    DROP TYPE IF EXISTS "public"."enum_form_submissions_wings_group_lead_preferred_channel";
    DROP TYPE IF EXISTS "public"."enum_form_submissions_wings_group_lead_locale";
  `)
}
