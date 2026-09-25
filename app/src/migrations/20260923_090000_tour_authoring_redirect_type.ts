import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

/** Adds explicit redirect types without changing legacy redirects' behavior. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_type WHERE typnamespace = 'public'::regnamespace AND typname = 'enum_redirects_type'
      ) THEN
        CREATE TYPE "public"."enum_redirects_type" AS ENUM('301', '307');
      END IF;
    END $$;
    ALTER TYPE "public"."enum_redirects_type" ADD VALUE IF NOT EXISTS '307';

    ALTER TABLE "redirects"
      ADD COLUMN IF NOT EXISTS "type" "public"."enum_redirects_type" DEFAULT '307';
    UPDATE "redirects" SET "type" = '307' WHERE "type" IS NULL;
    ALTER TABLE "redirects" ALTER COLUMN "type" SET NOT NULL;
  `)
}

// Keep redirect history on rollback; removing the type would make old URL
// recovery unsafe during a code rollback.
export async function down(_args: MigrateDownArgs): Promise<void> {}
