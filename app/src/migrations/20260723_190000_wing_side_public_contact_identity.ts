import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    UPDATE "site_settings"
    SET "support_email" = 'hello@wingside.vn'
    WHERE "site_id" = (SELECT "id" FROM "sites" WHERE "code" = 'wing-side')
      AND "support_email" = 'hello@wingsside.vn';

    UPDATE "pages_blocks_feature_grid_items"
    SET "link_url" = 'https://wingside.vn'
    WHERE "title" = 'WingSide'
      AND "link_url" = 'https://wingsside.vn';

    UPDATE "_pages_v_blocks_feature_grid_items"
    SET "link_url" = 'https://wingside.vn'
    WHERE "title" = 'WingSide'
      AND "link_url" = 'https://wingsside.vn';
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    UPDATE "_pages_v_blocks_feature_grid_items"
    SET "link_url" = 'https://wingsside.vn'
    WHERE "title" = 'WingSide'
      AND "link_url" = 'https://wingside.vn';

    UPDATE "pages_blocks_feature_grid_items"
    SET "link_url" = 'https://wingsside.vn'
    WHERE "title" = 'WingSide'
      AND "link_url" = 'https://wingside.vn';

    UPDATE "site_settings"
    SET "support_email" = 'hello@wingsside.vn'
    WHERE "site_id" = (SELECT "id" FROM "sites" WHERE "code" = 'wing-side')
      AND "support_email" = 'hello@wingside.vn';
  `)
}
