import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-postgres'
import { sql } from '@payloadcms/db-postgres'

const legacyTourSlugs = [
  'seoul-nami-everland-5n4d',
  'seoul-jeju-nami-camellia-hill-6n5d',
  'shizuoka-nui-phu-si-tokyo-5n4d',
  'osaka-kobe-kyoto-nagoya-fuji-tokyo-6n5d',
  'bac-kinh-van-ly-truong-thanh-5n4d',
  'thuong-hai-o-tran-hang-chau-5n4d',
] as const

/**
 * Additive WingsGo /tour catalog storage and a guarded legacy seed transition.
 * The transition only enables the new page field and copies legacy choices when
 * no curation relation exists yet. It never changes product or page publish state.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "pages" ADD COLUMN IF NOT EXISTS "wings_go_tour_catalog_enabled" boolean DEFAULT false;
    ALTER TABLE "_pages_v" ADD COLUMN IF NOT EXISTS "version_wings_go_tour_catalog_enabled" boolean DEFAULT false;
    ALTER TABLE "pages_rels" ADD COLUMN IF NOT EXISTS "tour_products_id" integer;
    ALTER TABLE "_pages_v_rels" ADD COLUMN IF NOT EXISTS "tour_products_id" integer;
    DO $$ BEGIN
      ALTER TABLE "pages_rels" ADD CONSTRAINT "pages_rels_tour_products_id_tour_products_id_fk"
        FOREIGN KEY ("tour_products_id") REFERENCES "tour_products"("id") ON DELETE SET NULL ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;
    DO $$ BEGIN
      ALTER TABLE "_pages_v_rels" ADD CONSTRAINT "_pages_v_rels_tour_products_id_tour_products_id_fk"
        FOREIGN KEY ("tour_products_id") REFERENCES "tour_products"("id") ON DELETE SET NULL ON UPDATE no action;
    EXCEPTION WHEN duplicate_object THEN null; END $$;
    CREATE INDEX IF NOT EXISTS "pages_rels_tour_products_id_idx" ON "pages_rels" USING btree ("tour_products_id");
    CREATE INDEX IF NOT EXISTS "_pages_v_rels_tour_products_id_idx" ON "_pages_v_rels" USING btree ("tour_products_id");
  `)

  const legacyValues = legacyTourSlugs
    .map((slug, index) => `(${index}, '${slug.replaceAll("'", "''")}')`)
    .join(', ')
  await db.execute(
    sql.raw(`
    UPDATE "pages" AS page
    SET "wings_go_tour_catalog_enabled" = true
    FROM "sites" AS site
    WHERE page."site_id" = site."id"
      AND site."code" = 'wings-go'
      AND page."pathname" = '/tour';

    WITH target AS (
      SELECT page."id" AS page_id
      FROM "pages" AS page
      JOIN "sites" AS site ON site."id" = page."site_id"
      WHERE site."code" = 'wings-go' AND page."pathname" = '/tour'
    ), legacy AS (
      SELECT values.item_order, values.slug
      FROM (VALUES ${legacyValues}) AS values(item_order, slug)
    )
    INSERT INTO "pages_rels" ("_order", "parent_id", "path", "locale", "tour_products_id")
    SELECT legacy.item_order, target.page_id, 'wingsGoTourCatalog.featuredTours', NULL, product."id"
    FROM target
    CROSS JOIN legacy
    JOIN "tour_products" AS product ON product."slug" = legacy.slug
    JOIN "pages" AS wrapper ON wrapper."id" = product."wrapper_page_id"
    WHERE product."_status" = 'published'
      AND product."site_id" = (SELECT "id" FROM "sites" WHERE "code" = 'wings-go' LIMIT 1)
      AND wrapper."_status" = 'published'
      AND wrapper."site_id" = product."site_id"
      AND wrapper."pathname" = '/tour/' || product."slug"
      AND EXISTS (
        SELECT 1 FROM "tour_departures" AS departure
        WHERE departure."tour_product_id" = product."id"
          AND departure."site_id" = product."site_id"
          AND departure."_status" = 'published'
          AND departure."departure_date" > NOW()
      )
      AND NOT EXISTS (
        SELECT 1 FROM "pages_rels" AS existing
        WHERE existing."parent_id" = target.page_id
          AND existing."path" = 'wingsGoTourCatalog.featuredTours'
          AND existing."tour_products_id" IS NOT NULL
      );
  `),
  )
}

/** Forward-only data transition: rollback must not erase editor curation. */
export async function down(_args: MigrateDownArgs): Promise<void> {
  return undefined
}
