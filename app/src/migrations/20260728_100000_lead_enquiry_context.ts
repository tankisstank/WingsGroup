import { sql } from '@payloadcms/db-postgres'
import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'

/**
 * Persist validated journey/discovery context separately from customer-authored
 * submissionData so notification retries and CRM reconciliation retain it.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "form_submissions"
      ADD COLUMN IF NOT EXISTS "enquiry_context_source" varchar,
      ADD COLUMN IF NOT EXISTS "enquiry_context_tour_id" varchar,
      ADD COLUMN IF NOT EXISTS "enquiry_context_tour_slug" varchar,
      ADD COLUMN IF NOT EXISTS "enquiry_context_discovery_destination" varchar,
      ADD COLUMN IF NOT EXISTS "enquiry_context_discovery_duration" varchar,
      ADD COLUMN IF NOT EXISTS "enquiry_context_discovery_style" varchar;

    CREATE INDEX IF NOT EXISTS "form_submissions_enquiry_context_tour_id_idx"
      ON "form_submissions" USING btree ("enquiry_context_tour_id");
    CREATE INDEX IF NOT EXISTS "form_submissions_enquiry_context_tour_slug_idx"
      ON "form_submissions" USING btree ("enquiry_context_tour_slug");
  `)
}

// Lead context is operational evidence. Rollbacks use a forward fix instead of
// dropping columns and losing attribution/reconciliation data.
export async function down(_args: MigrateDownArgs): Promise<void> {}
