import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

/**
 * Additive policy-release evidence only. Existing policies remain pending: no
 * rights text, evidence, approval state, or Page publication is backfilled.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_site_settings_wings_group_v3_privacy_approval_state"
        AS ENUM('pending', 'approved', 'rejected');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

    ALTER TABLE "site_settings"
      ADD COLUMN IF NOT EXISTS "wings_group_v3_privacy_data_subject_rights_statement" varchar,
      ADD COLUMN IF NOT EXISTS "wings_group_v3_privacy_data_subject_rights_evidence" varchar,
      ADD COLUMN IF NOT EXISTS "wings_group_v3_privacy_consent_evidence_reference" varchar,
      ADD COLUMN IF NOT EXISTS "wings_group_v3_privacy_approval_state"
        "enum_site_settings_wings_group_v3_privacy_approval_state" DEFAULT 'pending',
      ADD COLUMN IF NOT EXISTS "wings_group_v3_privacy_approval_reference" varchar;

    ALTER TABLE "pages"
      ADD COLUMN IF NOT EXISTS "wings_group_route_policy_retention_months" numeric,
      ADD COLUMN IF NOT EXISTS "wings_group_route_policy_data_subject_contact" varchar,
      ADD COLUMN IF NOT EXISTS "wings_group_route_policy_data_subject_rights_statement" varchar,
      ADD COLUMN IF NOT EXISTS "wings_group_route_policy_data_subject_rights_evidence" varchar,
      ADD COLUMN IF NOT EXISTS "wings_group_route_policy_policy_version" varchar,
      ADD COLUMN IF NOT EXISTS "wings_group_route_policy_consent_version" varchar,
      ADD COLUMN IF NOT EXISTS "wings_group_route_policy_consent_evidence_reference" varchar,
      ADD COLUMN IF NOT EXISTS "wings_group_route_policy_privacy_approval_reference" varchar,
      ADD COLUMN IF NOT EXISTS "wings_group_route_policy_validation_marker" varchar;

    ALTER TABLE "_pages_v"
      ADD COLUMN IF NOT EXISTS "version_wings_group_route_policy_retention_months" numeric,
      ADD COLUMN IF NOT EXISTS "version_wings_group_route_policy_data_subject_contact" varchar,
      ADD COLUMN IF NOT EXISTS "version_wings_group_route_policy_data_subject_rights_statement" varchar,
      ADD COLUMN IF NOT EXISTS "version_wings_group_route_policy_data_subject_rights_evidence" varchar,
      ADD COLUMN IF NOT EXISTS "version_wings_group_route_policy_policy_version" varchar,
      ADD COLUMN IF NOT EXISTS "version_wings_group_route_policy_consent_version" varchar,
      ADD COLUMN IF NOT EXISTS "version_wings_group_route_policy_consent_evidence_reference" varchar,
      ADD COLUMN IF NOT EXISTS "version_wings_group_route_policy_privacy_approval_reference" varchar,
      ADD COLUMN IF NOT EXISTS "version_wings_group_route_policy_validation_marker" varchar;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "_pages_v"
      DROP COLUMN IF EXISTS "version_wings_group_route_policy_retention_months",
      DROP COLUMN IF EXISTS "version_wings_group_route_policy_data_subject_contact",
      DROP COLUMN IF EXISTS "version_wings_group_route_policy_data_subject_rights_statement",
      DROP COLUMN IF EXISTS "version_wings_group_route_policy_data_subject_rights_evidence",
      DROP COLUMN IF EXISTS "version_wings_group_route_policy_policy_version",
      DROP COLUMN IF EXISTS "version_wings_group_route_policy_consent_version",
      DROP COLUMN IF EXISTS "version_wings_group_route_policy_consent_evidence_reference",
      DROP COLUMN IF EXISTS "version_wings_group_route_policy_privacy_approval_reference",
      DROP COLUMN IF EXISTS "version_wings_group_route_policy_validation_marker";

    ALTER TABLE "pages"
      DROP COLUMN IF EXISTS "wings_group_route_policy_retention_months",
      DROP COLUMN IF EXISTS "wings_group_route_policy_data_subject_contact",
      DROP COLUMN IF EXISTS "wings_group_route_policy_data_subject_rights_statement",
      DROP COLUMN IF EXISTS "wings_group_route_policy_data_subject_rights_evidence",
      DROP COLUMN IF EXISTS "wings_group_route_policy_policy_version",
      DROP COLUMN IF EXISTS "wings_group_route_policy_consent_version",
      DROP COLUMN IF EXISTS "wings_group_route_policy_consent_evidence_reference",
      DROP COLUMN IF EXISTS "wings_group_route_policy_privacy_approval_reference",
      DROP COLUMN IF EXISTS "wings_group_route_policy_validation_marker";

    ALTER TABLE "site_settings"
      DROP COLUMN IF EXISTS "wings_group_v3_privacy_data_subject_rights_statement",
      DROP COLUMN IF EXISTS "wings_group_v3_privacy_data_subject_rights_evidence",
      DROP COLUMN IF EXISTS "wings_group_v3_privacy_consent_evidence_reference",
      DROP COLUMN IF EXISTS "wings_group_v3_privacy_approval_state",
      DROP COLUMN IF EXISTS "wings_group_v3_privacy_approval_reference";

    DROP TYPE IF EXISTS "public"."enum_site_settings_wings_group_v3_privacy_approval_state";
  `)
}
