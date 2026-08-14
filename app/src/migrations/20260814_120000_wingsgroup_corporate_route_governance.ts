import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

/**
 * Additive US-065 governance metadata. No Page or policy content is promoted by
 * this migration; the explicit idempotent seed owns route data and starts legal
 * records in a pending/draft state.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TYPE "public"."enum_pages_wings_group_route_managed_by"
      AS ENUM('wingsgroup-v3');
    CREATE TYPE "public"."enum_pages_wings_group_route_archetype"
      AS ENUM('home', 'corporate', 'capability', 'trust', 'editorial', 'contact', 'policy');
    CREATE TYPE "public"."enum_pages_wings_group_route_publication_vi"
      AS ENUM('hidden', 'pending', 'approved');
    CREATE TYPE "public"."enum_pages_wings_group_route_publication_en"
      AS ENUM('hidden', 'pending', 'approved');
    CREATE TYPE "public"."enum_pages_wings_group_route_policy_approval_state"
      AS ENUM('pending', 'approved', 'rejected');

    CREATE TYPE "public"."enum__pages_v_version_wings_group_route_managed_by"
      AS ENUM('wingsgroup-v3');
    CREATE TYPE "public"."enum__pages_v_version_wings_group_route_archetype"
      AS ENUM('home', 'corporate', 'capability', 'trust', 'editorial', 'contact', 'policy');
    CREATE TYPE "public"."enum__pages_v_version_wings_group_route_publication_vi"
      AS ENUM('hidden', 'pending', 'approved');
    CREATE TYPE "public"."enum__pages_v_version_wings_group_route_publication_en"
      AS ENUM('hidden', 'pending', 'approved');
    CREATE TYPE "public"."enum__pages_v_version_wings_group_route_policy_approval_state"
      AS ENUM('pending', 'approved', 'rejected');

    ALTER TABLE "pages"
      ADD COLUMN "wings_group_route_managed_by"
        "enum_pages_wings_group_route_managed_by",
      ADD COLUMN "wings_group_route_archetype"
        "enum_pages_wings_group_route_archetype",
      ADD COLUMN "wings_group_route_publication_vi"
        "enum_pages_wings_group_route_publication_vi" DEFAULT 'hidden',
      ADD COLUMN "wings_group_route_publication_en"
        "enum_pages_wings_group_route_publication_en" DEFAULT 'hidden',
      ADD COLUMN "wings_group_route_policy_legal_owner" varchar,
      ADD COLUMN "wings_group_route_policy_legal_entity" varchar,
      ADD COLUMN "wings_group_route_policy_scope" varchar,
      ADD COLUMN "wings_group_route_policy_effective_date" timestamp(3) with time zone,
      ADD COLUMN "wings_group_route_policy_version" varchar,
      ADD COLUMN "wings_group_route_policy_approval_state"
        "enum_pages_wings_group_route_policy_approval_state" DEFAULT 'pending',
      ADD COLUMN "wings_group_route_policy_approval_reference" varchar;

    ALTER TABLE "_pages_v"
      ADD COLUMN "version_wings_group_route_managed_by"
        "enum__pages_v_version_wings_group_route_managed_by",
      ADD COLUMN "version_wings_group_route_archetype"
        "enum__pages_v_version_wings_group_route_archetype",
      ADD COLUMN "version_wings_group_route_publication_vi"
        "enum__pages_v_version_wings_group_route_publication_vi" DEFAULT 'hidden',
      ADD COLUMN "version_wings_group_route_publication_en"
        "enum__pages_v_version_wings_group_route_publication_en" DEFAULT 'hidden',
      ADD COLUMN "version_wings_group_route_policy_legal_owner" varchar,
      ADD COLUMN "version_wings_group_route_policy_legal_entity" varchar,
      ADD COLUMN "version_wings_group_route_policy_scope" varchar,
      ADD COLUMN "version_wings_group_route_policy_effective_date" timestamp(3) with time zone,
      ADD COLUMN "version_wings_group_route_policy_version" varchar,
      ADD COLUMN "version_wings_group_route_policy_approval_state"
        "enum__pages_v_version_wings_group_route_policy_approval_state" DEFAULT 'pending',
      ADD COLUMN "version_wings_group_route_policy_approval_reference" varchar;

    ALTER TABLE "site_settings"
      ADD COLUMN "wings_group_v3_legal_identity_legal_entity_name" varchar,
      ADD COLUMN "wings_group_v3_legal_identity_international_name" varchar,
      ADD COLUMN "wings_group_v3_legal_identity_registered_office" varchar,
      ADD COLUMN "wings_group_v3_legal_identity_travel_office" varchar,
      ADD COLUMN "wings_group_v3_legal_identity_registration_number" varchar,
      ADD COLUMN "wings_group_v3_legal_identity_licence_number" varchar,
      ADD COLUMN "wings_group_v3_legal_identity_legal_representative" varchar,
      ADD COLUMN "wings_group_v3_legal_identity_relationship_statement" varchar;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "site_settings"
      DROP COLUMN IF EXISTS "wings_group_v3_legal_identity_legal_entity_name",
      DROP COLUMN IF EXISTS "wings_group_v3_legal_identity_international_name",
      DROP COLUMN IF EXISTS "wings_group_v3_legal_identity_registered_office",
      DROP COLUMN IF EXISTS "wings_group_v3_legal_identity_travel_office",
      DROP COLUMN IF EXISTS "wings_group_v3_legal_identity_registration_number",
      DROP COLUMN IF EXISTS "wings_group_v3_legal_identity_licence_number",
      DROP COLUMN IF EXISTS "wings_group_v3_legal_identity_legal_representative",
      DROP COLUMN IF EXISTS "wings_group_v3_legal_identity_relationship_statement";

    ALTER TABLE "_pages_v"
      DROP COLUMN IF EXISTS "version_wings_group_route_managed_by",
      DROP COLUMN IF EXISTS "version_wings_group_route_archetype",
      DROP COLUMN IF EXISTS "version_wings_group_route_publication_vi",
      DROP COLUMN IF EXISTS "version_wings_group_route_publication_en",
      DROP COLUMN IF EXISTS "version_wings_group_route_policy_legal_owner",
      DROP COLUMN IF EXISTS "version_wings_group_route_policy_legal_entity",
      DROP COLUMN IF EXISTS "version_wings_group_route_policy_scope",
      DROP COLUMN IF EXISTS "version_wings_group_route_policy_effective_date",
      DROP COLUMN IF EXISTS "version_wings_group_route_policy_version",
      DROP COLUMN IF EXISTS "version_wings_group_route_policy_approval_state",
      DROP COLUMN IF EXISTS "version_wings_group_route_policy_approval_reference";

    ALTER TABLE "pages"
      DROP COLUMN IF EXISTS "wings_group_route_managed_by",
      DROP COLUMN IF EXISTS "wings_group_route_archetype",
      DROP COLUMN IF EXISTS "wings_group_route_publication_vi",
      DROP COLUMN IF EXISTS "wings_group_route_publication_en",
      DROP COLUMN IF EXISTS "wings_group_route_policy_legal_owner",
      DROP COLUMN IF EXISTS "wings_group_route_policy_legal_entity",
      DROP COLUMN IF EXISTS "wings_group_route_policy_scope",
      DROP COLUMN IF EXISTS "wings_group_route_policy_effective_date",
      DROP COLUMN IF EXISTS "wings_group_route_policy_version",
      DROP COLUMN IF EXISTS "wings_group_route_policy_approval_state",
      DROP COLUMN IF EXISTS "wings_group_route_policy_approval_reference";

    DROP TYPE IF EXISTS "public"."enum__pages_v_version_wings_group_route_policy_approval_state";
    DROP TYPE IF EXISTS "public"."enum__pages_v_version_wings_group_route_publication_en";
    DROP TYPE IF EXISTS "public"."enum__pages_v_version_wings_group_route_publication_vi";
    DROP TYPE IF EXISTS "public"."enum__pages_v_version_wings_group_route_archetype";
    DROP TYPE IF EXISTS "public"."enum__pages_v_version_wings_group_route_managed_by";
    DROP TYPE IF EXISTS "public"."enum_pages_wings_group_route_policy_approval_state";
    DROP TYPE IF EXISTS "public"."enum_pages_wings_group_route_publication_en";
    DROP TYPE IF EXISTS "public"."enum_pages_wings_group_route_publication_vi";
    DROP TYPE IF EXISTS "public"."enum_pages_wings_group_route_archetype";
    DROP TYPE IF EXISTS "public"."enum_pages_wings_group_route_managed_by";
  `)
}
