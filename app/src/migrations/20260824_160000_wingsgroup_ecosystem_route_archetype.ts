import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

/** Add the production route archetype used by the governed ecosystem page. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TYPE "public"."enum_pages_wings_group_route_archetype"
      ADD VALUE IF NOT EXISTS 'ecosystem';
    ALTER TYPE "public"."enum__pages_v_version_wings_group_route_archetype"
      ADD VALUE IF NOT EXISTS 'ecosystem';
  `)
}

/** PostgreSQL enum values are retained; any rollback is a forward correction. */
export async function down(_args: MigrateDownArgs): Promise<void> {}
