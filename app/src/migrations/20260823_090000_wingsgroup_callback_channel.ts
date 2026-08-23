import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

/** Adds the intake-only callback option without opening a public channel URL. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TYPE "public"."enum_form_submissions_wings_group_lead_preferred_channel"
      ADD VALUE IF NOT EXISTS 'callback';
  `)
}

/** PostgreSQL enum values are intentionally not removed during rollback. */
export async function down(_args: MigrateDownArgs): Promise<void> {}
