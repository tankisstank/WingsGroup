import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

/**
 * Payload stores registered job task slugs in PostgreSQL enums. The durable
 * lead-delivery tasks were added after the baseline job schema, so production
 * must accept them before queueing or running notifications.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TYPE "public"."enum_payload_jobs_task_slug"
      ADD VALUE IF NOT EXISTS 'sendLeadNotification';
    ALTER TYPE "public"."enum_payload_jobs_task_slug"
      ADD VALUE IF NOT EXISTS 'reconcileLeadNotificationQueueFailures';
    ALTER TYPE "public"."enum_payload_jobs_task_slug"
      ADD VALUE IF NOT EXISTS 'purgeExpiredWingsGroupLeads';

    ALTER TYPE "public"."enum_payload_jobs_log_task_slug"
      ADD VALUE IF NOT EXISTS 'sendLeadNotification';
    ALTER TYPE "public"."enum_payload_jobs_log_task_slug"
      ADD VALUE IF NOT EXISTS 'reconcileLeadNotificationQueueFailures';
    ALTER TYPE "public"."enum_payload_jobs_log_task_slug"
      ADD VALUE IF NOT EXISTS 'purgeExpiredWingsGroupLeads';
  `)
}

/** PostgreSQL enum values are intentionally retained during rollback. */
export async function down(_args: MigrateDownArgs): Promise<void> {}
