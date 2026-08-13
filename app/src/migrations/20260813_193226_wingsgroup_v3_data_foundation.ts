import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

/**
 * Additive E09 data foundation only. This migration is intentionally focused:
 * unrelated historical schema drift observed by `payload migrate:create` is
 * not absorbed into US-061.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TYPE "public"."enum_site_settings_wings_group_v3_consultation_channels_key"
      AS ENUM('zalo', 'whatsapp', 'messenger');
    CREATE TYPE "public"."enum_site_settings_wings_group_v3_consultation_channels_state"
      AS ENUM('unconfigured', 'pending', 'approved', 'disabled');
    CREATE TYPE "public"."enum_site_settings_wings_group_v3_english_publication_state"
      AS ENUM('hidden', 'route-ready', 'approved');
    CREATE TYPE "public"."wg_eco_brand"
      AS ENUM('wingsgo', 'wing-side', 'wingsplus', 'wingscare', 'wingspass');
    CREATE TYPE "public"."wg_eco_proof_state"
      AS ENUM('pending', 'approved', 'not-applicable');
    CREATE TYPE "public"."wg_eco_cta_state"
      AS ENUM('contact-fallback', 'approved-deep-link');
    CREATE TYPE "public"."wg_proof_kind"
      AS ENUM('licence', 'certificate', 'award', 'membership', 'standard', 'other');
    CREATE TYPE "public"."wg_proof_pub" AS ENUM('pending', 'approved', 'rejected');
    CREATE TYPE "public"."wg_proof_perm" AS ENUM('pending', 'approved', 'denied');
    CREATE TYPE "public"."enum_media_governance_responsive_derivatives_format"
      AS ENUM('webp', 'avif');
    CREATE TYPE "public"."enum_media_governance_managed_by" AS ENUM('wingsgroup-v3');
    CREATE TYPE "public"."enum_media_governance_rights_state"
      AS ENUM('pending', 'approved', 'rejected');
    CREATE TYPE "public"."enum_media_governance_usage_scope" AS ENUM('editorial-service');
    CREATE TYPE "public"."enum_media_governance_publication_state"
      AS ENUM('pending', 'ready', 'published', 'rejected');
    CREATE TYPE "public"."enum_media_governance_derivative_state"
      AS ENUM('pending', 'generated', 'verified');

    CREATE TABLE "site_settings_wings_group_v3_consultation_channels" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "key" "enum_site_settings_wings_group_v3_consultation_channels_key" NOT NULL,
      "state" "enum_site_settings_wings_group_v3_consultation_channels_state"
        DEFAULT 'unconfigured' NOT NULL,
      "url" varchar,
      "owner" varchar,
      "sla" varchar,
      "tracking_reference" varchar
    );

    CREATE TABLE "wg_ecosystem" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "_path" text NOT NULL,
      "_locale" "_locales" NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "eyebrow" varchar,
      "title" varchar,
      "description" varchar,
      "block_name" varchar
    );
    CREATE TABLE "wg_eco_profiles" (
      "_order" integer NOT NULL,
      "_parent_id" varchar NOT NULL,
      "_locale" "_locales" NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "brand_key" "wg_eco_brand",
      "brand_name" varchar,
      "description" varchar,
      "stage_media_id" integer,
      "proof_state" "wg_eco_proof_state" DEFAULT 'pending',
      "cta_label" varchar,
      "cta_state" "wg_eco_cta_state" DEFAULT 'contact-fallback',
      "cta_contact_path" varchar,
      "cta_url" varchar,
      "cta_owner" varchar,
      "cta_http_evidence" varchar,
      "cta_canonical_evidence" varchar,
      "cta_tracking_evidence" varchar,
      "cta_owner_approval_evidence" varchar
    );
    CREATE TABLE "wg_eco_services" (
      "_order" integer NOT NULL,
      "_parent_id" varchar NOT NULL,
      "_locale" "_locales" NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "label" varchar
    );
    CREATE TABLE "wg_eco_proof_refs" (
      "_order" integer NOT NULL,
      "_parent_id" varchar NOT NULL,
      "_locale" "_locales" NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "key" varchar
    );

    CREATE TABLE "wg_proof" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "_path" text NOT NULL,
      "_locale" "_locales" NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "eyebrow" varchar,
      "title" varchar,
      "description" varchar,
      "block_name" varchar
    );
    CREATE TABLE "wg_proof_records" (
      "_order" integer NOT NULL,
      "_parent_id" varchar NOT NULL,
      "_locale" "_locales" NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "key" varchar,
      "kind" "wg_proof_kind",
      "publication_state" "wg_proof_pub" DEFAULT 'pending',
      "title" varchar,
      "summary" varchar,
      "source_issuer" varchar,
      "context" varchar,
      "evidence_date" timestamp(3) with time zone,
      "permission_state" "wg_proof_perm" DEFAULT 'pending',
      "permission_evidence" varchar,
      "media_id" integer,
      "media_provenance_reference" varchar
    );

    CREATE TABLE "_wg_ecosystem_v" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "_path" text NOT NULL,
      "_locale" "_locales" NOT NULL,
      "id" serial PRIMARY KEY NOT NULL,
      "eyebrow" varchar,
      "title" varchar,
      "description" varchar,
      "_uuid" varchar,
      "block_name" varchar
    );
    CREATE TABLE "_wg_eco_profiles_v" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "_locale" "_locales" NOT NULL,
      "id" serial PRIMARY KEY NOT NULL,
      "brand_key" "wg_eco_brand",
      "brand_name" varchar,
      "description" varchar,
      "stage_media_id" integer,
      "proof_state" "wg_eco_proof_state" DEFAULT 'pending',
      "cta_label" varchar,
      "cta_state" "wg_eco_cta_state" DEFAULT 'contact-fallback',
      "cta_contact_path" varchar,
      "cta_url" varchar,
      "cta_owner" varchar,
      "cta_http_evidence" varchar,
      "cta_canonical_evidence" varchar,
      "cta_tracking_evidence" varchar,
      "cta_owner_approval_evidence" varchar,
      "_uuid" varchar
    );
    CREATE TABLE "_wg_eco_services_v" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "_locale" "_locales" NOT NULL,
      "id" serial PRIMARY KEY NOT NULL,
      "label" varchar,
      "_uuid" varchar
    );
    CREATE TABLE "_wg_eco_proof_refs_v" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "_locale" "_locales" NOT NULL,
      "id" serial PRIMARY KEY NOT NULL,
      "key" varchar,
      "_uuid" varchar
    );

    CREATE TABLE "_wg_proof_v" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "_path" text NOT NULL,
      "_locale" "_locales" NOT NULL,
      "id" serial PRIMARY KEY NOT NULL,
      "eyebrow" varchar,
      "title" varchar,
      "description" varchar,
      "_uuid" varchar,
      "block_name" varchar
    );
    CREATE TABLE "_wg_proof_records_v" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "_locale" "_locales" NOT NULL,
      "id" serial PRIMARY KEY NOT NULL,
      "key" varchar,
      "kind" "wg_proof_kind",
      "publication_state" "wg_proof_pub" DEFAULT 'pending',
      "title" varchar,
      "summary" varchar,
      "source_issuer" varchar,
      "context" varchar,
      "evidence_date" timestamp(3) with time zone,
      "permission_state" "wg_proof_perm" DEFAULT 'pending',
      "permission_evidence" varchar,
      "media_id" integer,
      "media_provenance_reference" varchar,
      "_uuid" varchar
    );

    CREATE TABLE "media_governance_responsive_derivatives" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "format" "enum_media_governance_responsive_derivatives_format" NOT NULL,
      "width" numeric NOT NULL,
      "height" numeric,
      "url" varchar NOT NULL,
      "sha256" varchar NOT NULL
    );

    ALTER TABLE "site_settings"
      ADD COLUMN "wings_group_v3_enabled" boolean DEFAULT false,
      ADD COLUMN "wings_group_v3_english_publication_state"
        "enum_site_settings_wings_group_v3_english_publication_state" DEFAULT 'hidden',
      ADD COLUMN "wings_group_v3_privacy_policy_version" varchar,
      ADD COLUMN "wings_group_v3_privacy_consent_version" varchar,
      ADD COLUMN "wings_group_v3_privacy_consent_required" boolean,
      ADD COLUMN "wings_group_v3_privacy_retention_months" numeric,
      ADD COLUMN "wings_group_v3_privacy_data_subject_contact" varchar,
      ADD COLUMN "wings_group_v3_privacy_inter_branch_transfer_allowed" boolean,
      ADD COLUMN "wings_group_v3_privacy_policy_route_vi" varchar,
      ADD COLUMN "wings_group_v3_privacy_policy_route_en" varchar;

    ALTER TABLE "media"
      ADD COLUMN "governance_managed_by" "enum_media_governance_managed_by",
      ADD COLUMN "governance_source_identity" varchar,
      ADD COLUMN "governance_source_attachment_id" varchar,
      ADD COLUMN "governance_source_archive_sha256" varchar,
      ADD COLUMN "governance_source_file_sha256" varchar,
      ADD COLUMN "governance_source_filename" varchar,
      ADD COLUMN "governance_provenance_reference" varchar,
      ADD COLUMN "governance_rights_state" "enum_media_governance_rights_state" DEFAULT 'pending',
      ADD COLUMN "governance_rights_evidence" varchar,
      ADD COLUMN "governance_usage_scope" "enum_media_governance_usage_scope",
      ADD COLUMN "governance_publication_state"
        "enum_media_governance_publication_state" DEFAULT 'pending',
      ADD COLUMN "governance_derivative_state"
        "enum_media_governance_derivative_state" DEFAULT 'pending';

    ALTER TABLE "site_settings_wings_group_v3_consultation_channels"
      ADD CONSTRAINT "site_settings_wings_group_v3_consultation_channels_parent_id_fk"
      FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id")
      ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "wg_ecosystem"
      ADD CONSTRAINT "wg_ecosystem_parent_id_fk"
      FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id")
      ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "wg_eco_profiles"
      ADD CONSTRAINT "wg_eco_profiles_parent_id_fk"
      FOREIGN KEY ("_parent_id") REFERENCES "public"."wg_ecosystem"("id")
      ON DELETE cascade ON UPDATE no action,
      ADD CONSTRAINT "wg_eco_profiles_stage_media_id_media_id_fk"
      FOREIGN KEY ("stage_media_id") REFERENCES "public"."media"("id")
      ON DELETE set null ON UPDATE no action;
    ALTER TABLE "wg_eco_services"
      ADD CONSTRAINT "wg_eco_services_parent_id_fk"
      FOREIGN KEY ("_parent_id") REFERENCES "public"."wg_eco_profiles"("id")
      ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "wg_eco_proof_refs"
      ADD CONSTRAINT "wg_eco_proof_refs_parent_id_fk"
      FOREIGN KEY ("_parent_id") REFERENCES "public"."wg_eco_profiles"("id")
      ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "wg_proof"
      ADD CONSTRAINT "wg_proof_parent_id_fk"
      FOREIGN KEY ("_parent_id") REFERENCES "public"."pages"("id")
      ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "wg_proof_records"
      ADD CONSTRAINT "wg_proof_records_parent_id_fk"
      FOREIGN KEY ("_parent_id") REFERENCES "public"."wg_proof"("id")
      ON DELETE cascade ON UPDATE no action,
      ADD CONSTRAINT "wg_proof_records_media_id_media_id_fk"
      FOREIGN KEY ("media_id") REFERENCES "public"."media"("id")
      ON DELETE set null ON UPDATE no action;

    ALTER TABLE "_wg_ecosystem_v"
      ADD CONSTRAINT "_wg_ecosystem_v_parent_id_fk"
      FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id")
      ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "_wg_eco_profiles_v"
      ADD CONSTRAINT "_wg_eco_profiles_v_parent_id_fk"
      FOREIGN KEY ("_parent_id") REFERENCES "public"."_wg_ecosystem_v"("id")
      ON DELETE cascade ON UPDATE no action,
      ADD CONSTRAINT "_wg_eco_profiles_v_stage_media_id_media_id_fk"
      FOREIGN KEY ("stage_media_id") REFERENCES "public"."media"("id")
      ON DELETE set null ON UPDATE no action;
    ALTER TABLE "_wg_eco_services_v"
      ADD CONSTRAINT "_wg_eco_services_v_parent_id_fk"
      FOREIGN KEY ("_parent_id") REFERENCES "public"."_wg_eco_profiles_v"("id")
      ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "_wg_eco_proof_refs_v"
      ADD CONSTRAINT "_wg_eco_proof_refs_v_parent_id_fk"
      FOREIGN KEY ("_parent_id") REFERENCES "public"."_wg_eco_profiles_v"("id")
      ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "_wg_proof_v"
      ADD CONSTRAINT "_wg_proof_v_parent_id_fk"
      FOREIGN KEY ("_parent_id") REFERENCES "public"."_pages_v"("id")
      ON DELETE cascade ON UPDATE no action;
    ALTER TABLE "_wg_proof_records_v"
      ADD CONSTRAINT "_wg_proof_records_v_parent_id_fk"
      FOREIGN KEY ("_parent_id") REFERENCES "public"."_wg_proof_v"("id")
      ON DELETE cascade ON UPDATE no action,
      ADD CONSTRAINT "_wg_proof_records_v_media_id_media_id_fk"
      FOREIGN KEY ("media_id") REFERENCES "public"."media"("id")
      ON DELETE set null ON UPDATE no action;
    ALTER TABLE "media_governance_responsive_derivatives"
      ADD CONSTRAINT "media_governance_responsive_derivatives_parent_id_fk"
      FOREIGN KEY ("_parent_id") REFERENCES "public"."media"("id")
      ON DELETE cascade ON UPDATE no action;

    CREATE INDEX "site_settings_wg_v3_channels_order_idx"
      ON "site_settings_wings_group_v3_consultation_channels" ("_order");
    CREATE INDEX "site_settings_wg_v3_channels_parent_idx"
      ON "site_settings_wings_group_v3_consultation_channels" ("_parent_id");
    CREATE INDEX "wg_ecosystem_order_idx" ON "wg_ecosystem" ("_order");
    CREATE INDEX "wg_ecosystem_parent_id_idx" ON "wg_ecosystem" ("_parent_id");
    CREATE INDEX "wg_ecosystem_path_idx" ON "wg_ecosystem" ("_path");
    CREATE INDEX "wg_ecosystem_locale_idx" ON "wg_ecosystem" ("_locale");
    CREATE INDEX "wg_eco_profiles_order_idx" ON "wg_eco_profiles" ("_order");
    CREATE INDEX "wg_eco_profiles_parent_id_idx" ON "wg_eco_profiles" ("_parent_id");
    CREATE INDEX "wg_eco_profiles_locale_idx" ON "wg_eco_profiles" ("_locale");
    CREATE INDEX "wg_eco_profiles_stage_media_idx" ON "wg_eco_profiles" ("stage_media_id");
    CREATE INDEX "wg_eco_services_order_idx" ON "wg_eco_services" ("_order");
    CREATE INDEX "wg_eco_services_parent_id_idx" ON "wg_eco_services" ("_parent_id");
    CREATE INDEX "wg_eco_services_locale_idx" ON "wg_eco_services" ("_locale");
    CREATE INDEX "wg_eco_proof_refs_order_idx" ON "wg_eco_proof_refs" ("_order");
    CREATE INDEX "wg_eco_proof_refs_parent_id_idx" ON "wg_eco_proof_refs" ("_parent_id");
    CREATE INDEX "wg_eco_proof_refs_locale_idx" ON "wg_eco_proof_refs" ("_locale");
    CREATE INDEX "wg_proof_order_idx" ON "wg_proof" ("_order");
    CREATE INDEX "wg_proof_parent_id_idx" ON "wg_proof" ("_parent_id");
    CREATE INDEX "wg_proof_path_idx" ON "wg_proof" ("_path");
    CREATE INDEX "wg_proof_locale_idx" ON "wg_proof" ("_locale");
    CREATE INDEX "wg_proof_records_order_idx" ON "wg_proof_records" ("_order");
    CREATE INDEX "wg_proof_records_parent_id_idx" ON "wg_proof_records" ("_parent_id");
    CREATE INDEX "wg_proof_records_locale_idx" ON "wg_proof_records" ("_locale");
    CREATE INDEX "wg_proof_records_media_idx" ON "wg_proof_records" ("media_id");

    CREATE INDEX "_wg_ecosystem_v_order_idx" ON "_wg_ecosystem_v" ("_order");
    CREATE INDEX "_wg_ecosystem_v_parent_id_idx" ON "_wg_ecosystem_v" ("_parent_id");
    CREATE INDEX "_wg_ecosystem_v_path_idx" ON "_wg_ecosystem_v" ("_path");
    CREATE INDEX "_wg_ecosystem_v_locale_idx" ON "_wg_ecosystem_v" ("_locale");
    CREATE INDEX "_wg_eco_profiles_v_order_idx" ON "_wg_eco_profiles_v" ("_order");
    CREATE INDEX "_wg_eco_profiles_v_parent_id_idx" ON "_wg_eco_profiles_v" ("_parent_id");
    CREATE INDEX "_wg_eco_profiles_v_locale_idx" ON "_wg_eco_profiles_v" ("_locale");
    CREATE INDEX "_wg_eco_profiles_v_stage_media_idx" ON "_wg_eco_profiles_v" ("stage_media_id");
    CREATE INDEX "_wg_eco_services_v_order_idx" ON "_wg_eco_services_v" ("_order");
    CREATE INDEX "_wg_eco_services_v_parent_id_idx" ON "_wg_eco_services_v" ("_parent_id");
    CREATE INDEX "_wg_eco_services_v_locale_idx" ON "_wg_eco_services_v" ("_locale");
    CREATE INDEX "_wg_eco_proof_refs_v_order_idx" ON "_wg_eco_proof_refs_v" ("_order");
    CREATE INDEX "_wg_eco_proof_refs_v_parent_id_idx" ON "_wg_eco_proof_refs_v" ("_parent_id");
    CREATE INDEX "_wg_eco_proof_refs_v_locale_idx" ON "_wg_eco_proof_refs_v" ("_locale");
    CREATE INDEX "_wg_proof_v_order_idx" ON "_wg_proof_v" ("_order");
    CREATE INDEX "_wg_proof_v_parent_id_idx" ON "_wg_proof_v" ("_parent_id");
    CREATE INDEX "_wg_proof_v_path_idx" ON "_wg_proof_v" ("_path");
    CREATE INDEX "_wg_proof_v_locale_idx" ON "_wg_proof_v" ("_locale");
    CREATE INDEX "_wg_proof_records_v_order_idx" ON "_wg_proof_records_v" ("_order");
    CREATE INDEX "_wg_proof_records_v_parent_id_idx" ON "_wg_proof_records_v" ("_parent_id");
    CREATE INDEX "_wg_proof_records_v_locale_idx" ON "_wg_proof_records_v" ("_locale");
    CREATE INDEX "_wg_proof_records_v_media_idx" ON "_wg_proof_records_v" ("media_id");
    CREATE INDEX "media_governance_derivatives_order_idx"
      ON "media_governance_responsive_derivatives" ("_order");
    CREATE INDEX "media_governance_derivatives_parent_idx"
      ON "media_governance_responsive_derivatives" ("_parent_id");
    CREATE UNIQUE INDEX "media_governance_source_identity_idx"
      ON "media" ("governance_source_identity");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "site_settings_wings_group_v3_consultation_channels" CASCADE;
    DROP TABLE IF EXISTS "_wg_eco_services_v" CASCADE;
    DROP TABLE IF EXISTS "_wg_eco_proof_refs_v" CASCADE;
    DROP TABLE IF EXISTS "_wg_eco_profiles_v" CASCADE;
    DROP TABLE IF EXISTS "_wg_ecosystem_v" CASCADE;
    DROP TABLE IF EXISTS "_wg_proof_records_v" CASCADE;
    DROP TABLE IF EXISTS "_wg_proof_v" CASCADE;
    DROP TABLE IF EXISTS "wg_eco_services" CASCADE;
    DROP TABLE IF EXISTS "wg_eco_proof_refs" CASCADE;
    DROP TABLE IF EXISTS "wg_eco_profiles" CASCADE;
    DROP TABLE IF EXISTS "wg_ecosystem" CASCADE;
    DROP TABLE IF EXISTS "wg_proof_records" CASCADE;
    DROP TABLE IF EXISTS "wg_proof" CASCADE;
    DROP TABLE IF EXISTS "media_governance_responsive_derivatives" CASCADE;

    DROP INDEX IF EXISTS "media_governance_source_identity_idx";
    ALTER TABLE "site_settings"
      DROP COLUMN IF EXISTS "wings_group_v3_enabled",
      DROP COLUMN IF EXISTS "wings_group_v3_english_publication_state",
      DROP COLUMN IF EXISTS "wings_group_v3_privacy_policy_version",
      DROP COLUMN IF EXISTS "wings_group_v3_privacy_consent_version",
      DROP COLUMN IF EXISTS "wings_group_v3_privacy_consent_required",
      DROP COLUMN IF EXISTS "wings_group_v3_privacy_retention_months",
      DROP COLUMN IF EXISTS "wings_group_v3_privacy_data_subject_contact",
      DROP COLUMN IF EXISTS "wings_group_v3_privacy_inter_branch_transfer_allowed",
      DROP COLUMN IF EXISTS "wings_group_v3_privacy_policy_route_vi",
      DROP COLUMN IF EXISTS "wings_group_v3_privacy_policy_route_en";
    ALTER TABLE "media"
      DROP COLUMN IF EXISTS "governance_managed_by",
      DROP COLUMN IF EXISTS "governance_source_identity",
      DROP COLUMN IF EXISTS "governance_source_attachment_id",
      DROP COLUMN IF EXISTS "governance_source_archive_sha256",
      DROP COLUMN IF EXISTS "governance_source_file_sha256",
      DROP COLUMN IF EXISTS "governance_source_filename",
      DROP COLUMN IF EXISTS "governance_provenance_reference",
      DROP COLUMN IF EXISTS "governance_rights_state",
      DROP COLUMN IF EXISTS "governance_rights_evidence",
      DROP COLUMN IF EXISTS "governance_usage_scope",
      DROP COLUMN IF EXISTS "governance_publication_state",
      DROP COLUMN IF EXISTS "governance_derivative_state";

    DROP TYPE IF EXISTS "public"."enum_site_settings_wings_group_v3_consultation_channels_key";
    DROP TYPE IF EXISTS "public"."enum_site_settings_wings_group_v3_consultation_channels_state";
    DROP TYPE IF EXISTS "public"."enum_site_settings_wings_group_v3_english_publication_state";
    DROP TYPE IF EXISTS "public"."wg_eco_brand";
    DROP TYPE IF EXISTS "public"."wg_eco_proof_state";
    DROP TYPE IF EXISTS "public"."wg_eco_cta_state";
    DROP TYPE IF EXISTS "public"."wg_proof_kind";
    DROP TYPE IF EXISTS "public"."wg_proof_pub";
    DROP TYPE IF EXISTS "public"."wg_proof_perm";
    DROP TYPE IF EXISTS "public"."enum_media_governance_responsive_derivatives_format";
    DROP TYPE IF EXISTS "public"."enum_media_governance_managed_by";
    DROP TYPE IF EXISTS "public"."enum_media_governance_rights_state";
    DROP TYPE IF EXISTS "public"."enum_media_governance_usage_scope";
    DROP TYPE IF EXISTS "public"."enum_media_governance_publication_state";
    DROP TYPE IF EXISTS "public"."enum_media_governance_derivative_state";
  `)
}
