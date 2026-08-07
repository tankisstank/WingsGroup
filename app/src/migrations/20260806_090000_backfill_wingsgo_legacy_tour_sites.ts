import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

/**
 * Controlled, forward-only remediation for three confirmed WingsGo imports.
 * All other orphaned Tour Products remain untouched for manual triage.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DO $$
    DECLARE
      wings_go_id integer;
      candidate_count integer;
      changed_count integer;
    BEGIN
      SELECT COUNT(*) INTO candidate_count
      FROM "tour_products"
      WHERE "site_id" IS NULL
        AND "slug" IN (
          'shizuoka-nui-phu-si-tokyo-5n4d',
          'seoul-jeju-nami-camellia-hill-6n5d',
          'seoul-nami-everland-5n4d'
        );

      IF candidate_count = 0 THEN
        RAISE NOTICE 'HIGH-003 Tour Product site backfill: không có record orphan cần xử lý.';
        RETURN;
      END IF;

      SELECT "id" INTO wings_go_id
      FROM "sites"
      WHERE "code" = 'wings-go'
      ORDER BY "id"
      LIMIT 1;

      IF wings_go_id IS NULL THEN
        RAISE EXCEPTION 'Không thể backfill Tour Product: site wings-go không tồn tại.';
      END IF;

      UPDATE "tour_products"
      SET "site_id" = wings_go_id
      WHERE "site_id" IS NULL
        AND "slug" IN (
          'shizuoka-nui-phu-si-tokyo-5n4d',
          'seoul-jeju-nami-camellia-hill-6n5d',
          'seoul-nami-everland-5n4d'
        );

      GET DIAGNOSTICS changed_count = ROW_COUNT;
      RAISE NOTICE 'HIGH-003 Tour Product site backfill: % bản ghi được gán vào wings-go.', changed_count;
    END $$;
  `)
}

/**
 * Do not remove a remediation assignment automatically. Restore from backup
 * or issue an explicit forward correction if a rollback is ever required.
 */
export async function down(_args: MigrateDownArgs): Promise<void> {
  // Intentionally empty: data rollback is forward remediation/backup restore.
}
