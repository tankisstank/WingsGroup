import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

/** Durable, structured q/type handoff; never copied into visitor textareas. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "form_submissions" ADD COLUMN IF NOT EXISTS "enquiry_context_discovery_q" varchar;
    ALTER TABLE "form_submissions" ADD COLUMN IF NOT EXISTS "enquiry_context_discovery_type" varchar;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "form_submissions" DROP COLUMN IF EXISTS "enquiry_context_discovery_q";
    ALTER TABLE "form_submissions" DROP COLUMN IF EXISTS "enquiry_context_discovery_type";
  `)
}
