import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

/**
 * Payload's scheduled-task runner persists last-run timestamps in this hidden
 * global. The legacy schema existed before Payload introduced job statistics.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "public"."payload_jobs_stats" (
      "id" serial PRIMARY KEY NOT NULL,
      "stats" jsonb,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `)
}

export async function down(_args: MigrateDownArgs): Promise<void> {}
