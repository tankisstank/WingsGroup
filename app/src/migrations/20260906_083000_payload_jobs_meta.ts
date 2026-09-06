import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

/**
 * Payload 3.84 writes scheduler metadata when job statistics are enabled.
 * Older production schemas predate this optional JSON field.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "public"."payload_jobs"
      ADD COLUMN IF NOT EXISTS "meta" jsonb;
  `)
}

export async function down(_args: MigrateDownArgs): Promise<void> {}
