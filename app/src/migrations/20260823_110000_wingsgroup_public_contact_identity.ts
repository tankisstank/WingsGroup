import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

/** Adds the sales address and applies the stakeholder-approved WingsGroup public contacts. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "site_settings"
      ADD COLUMN IF NOT EXISTS "sales_email" varchar;

    UPDATE "site_settings"
    SET
      "support_email" = 'info@wingsgroup.vn',
      "support_phone" = '0912910101',
      "sales_email" = 'sales@wingsgroup.vn'
    WHERE "site_id" = (SELECT "id" FROM "sites" WHERE "code" = 'wings-group');
  `)
}

/** The contact correction is retained; rollback removes only the added optional column. */
export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "site_settings"
      DROP COLUMN IF EXISTS "sales_email";
  `)
}
