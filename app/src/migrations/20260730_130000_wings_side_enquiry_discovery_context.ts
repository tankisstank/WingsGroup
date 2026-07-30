import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

/** Durable, structured q/type handoff; never copied into visitor textareas. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "form_submissions" ADD COLUMN IF NOT EXISTS "enquiry_context_discovery_q" varchar;
    ALTER TABLE "form_submissions" ADD COLUMN IF NOT EXISTS "enquiry_context_discovery_type" varchar;
  `)
}

// Discovery context is durable operational evidence. As with the parent lead
// context migration, rollback uses a forward fix rather than deleting
// attribution already attached to submitted leads.
export async function down(_args: MigrateDownArgs): Promise<void> {}
