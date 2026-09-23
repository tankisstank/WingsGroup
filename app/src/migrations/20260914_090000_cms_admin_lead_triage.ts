import { sql } from '@payloadcms/db-postgres'
import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'

/**
 * Additive metadata for the admin lead triage command. Customer-authored
 * submission data and notification delivery state remain separate and
 * historical leads stay unclassified until an operator chooses a status.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_form_submissions_sales_status" AS ENUM(
        'new',
        'contacting',
        'won',
        'no_answer',
        'lost'
      );
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    ALTER TABLE "form_submissions"
      ADD COLUMN IF NOT EXISTS "sales_status"
        "public"."enum_form_submissions_sales_status",
      ADD COLUMN IF NOT EXISTS "assigned_to_id" integer,
      ADD COLUMN IF NOT EXISTS "sales_note" varchar,
      ADD COLUMN IF NOT EXISTS "sales_status_from"
        "public"."enum_form_submissions_sales_status",
      ADD COLUMN IF NOT EXISTS "sales_status_to"
        "public"."enum_form_submissions_sales_status",
      ADD COLUMN IF NOT EXISTS "sales_updated_at" timestamp(3) with time zone,
      ADD COLUMN IF NOT EXISTS "sales_updated_by_id" integer,
      ADD COLUMN IF NOT EXISTS "sales_triage_version" integer DEFAULT 0;

    DO $$ BEGIN
      ALTER TABLE "form_submissions"
        ADD CONSTRAINT "form_submissions_assigned_to_id_users_id_fk"
        FOREIGN KEY ("assigned_to_id") REFERENCES "public"."users"("id")
        ON DELETE set null ON UPDATE no action;
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      ALTER TABLE "form_submissions"
        ADD CONSTRAINT "form_submissions_sales_updated_by_id_users_id_fk"
        FOREIGN KEY ("sales_updated_by_id") REFERENCES "public"."users"("id")
        ON DELETE set null ON UPDATE no action;
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    CREATE INDEX IF NOT EXISTS "form_submissions_sales_status_idx"
      ON "form_submissions" USING btree ("sales_status");
    CREATE INDEX IF NOT EXISTS "form_submissions_assigned_to_id_idx"
      ON "form_submissions" USING btree ("assigned_to_id");
    CREATE INDEX IF NOT EXISTS "form_submissions_sales_updated_at_idx"
      ON "form_submissions" USING btree ("sales_updated_at");
    CREATE INDEX IF NOT EXISTS "form_submissions_site_sales_status_idx"
      ON "form_submissions" USING btree ("site_id", "sales_status");
  `)
}

// Triage metadata is operational evidence. Rollback uses a forward fix so an
// app rollback cannot silently discard status, assignment, or audit metadata.
export async function down(_args: MigrateDownArgs): Promise<void> {}
