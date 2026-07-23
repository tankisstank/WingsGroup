import { sql } from '@payloadcms/db-postgres'
import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_form_submissions_delivery_status" AS ENUM(
        'pending',
        'queued',
        'delivered',
        'queue_failed',
        'delivery_failed'
      );
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;

    ALTER TABLE "form_submissions"
      ADD COLUMN IF NOT EXISTS "delivery_status" "enum_form_submissions_delivery_status" DEFAULT 'pending' NOT NULL,
      ADD COLUMN IF NOT EXISTS "delivery_updated_at" timestamp(3) with time zone,
      ADD COLUMN IF NOT EXISTS "delivery_error_code" varchar;

    CREATE INDEX IF NOT EXISTS "form_submissions_delivery_status_idx"
      ON "form_submissions" USING btree ("delivery_status");
    CREATE INDEX IF NOT EXISTS "form_submissions_delivery_updated_at_idx"
      ON "form_submissions" USING btree ("delivery_updated_at");
  `)
}

// Lead-delivery state is operational evidence. Production rollback uses a
// forward fix instead of dropping these columns and losing reconciliation data.
export async function down(_args: MigrateDownArgs): Promise<void> {}

