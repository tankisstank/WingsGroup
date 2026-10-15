CREATE TABLE IF NOT EXISTS "tour_curations" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" varchar NOT NULL,
  "is_default" boolean DEFAULT false,
  "description" varchar,
  "site_id" integer NOT NULL,
  "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "tour_curations_rels" (
  "id" serial PRIMARY KEY NOT NULL,
  "order" integer,
  "parent_id" integer NOT NULL,
  "path" varchar NOT NULL,
  "tour_products_id" integer
);

DO $$ BEGIN
  ALTER TABLE "tour_curations" ADD CONSTRAINT "tour_curations_site_id_sites_id_fk"
    FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "tour_curations_rels" ADD CONSTRAINT "tour_curations_rels_parent_fk"
    FOREIGN KEY ("parent_id") REFERENCES "tour_curations"("id") ON DELETE CASCADE ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "tour_curations_rels" ADD CONSTRAINT "tour_curations_rels_tour_products_fk"
    FOREIGN KEY ("tour_products_id") REFERENCES "tour_products"("id") ON DELETE CASCADE ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE "pages" ADD COLUMN IF NOT EXISTS "wings_go_tour_catalog_curation_id" integer;
ALTER TABLE "_pages_v" ADD COLUMN IF NOT EXISTS "version_wings_go_tour_catalog_curation_id" integer;

DO $$ BEGIN
  ALTER TABLE "pages" ADD CONSTRAINT "pages_wings_go_tour_catalog_curation_id_tour_curations_id_fk"
    FOREIGN KEY ("wings_go_tour_catalog_curation_id") REFERENCES "tour_curations"("id") ON DELETE SET NULL ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "_pages_v" ADD CONSTRAINT "_pages_v_version_wings_go_tour_catalog_curation_id_tour_curations_id_fk"
    FOREIGN KEY ("version_wings_go_tour_catalog_curation_id") REFERENCES "tour_curations"("id") ON DELETE SET NULL ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE "pages_rels" ADD COLUMN IF NOT EXISTS "tour_curations_id" integer;
ALTER TABLE "_pages_v_rels" ADD COLUMN IF NOT EXISTS "tour_curations_id" integer;
ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "tour_curations_id" integer;

DO $$ BEGIN
  ALTER TABLE "pages_rels" ADD CONSTRAINT "pages_rels_tour_curations_id_tour_curations_id_fk"
    FOREIGN KEY ("tour_curations_id") REFERENCES "tour_curations"("id") ON DELETE SET NULL ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "_pages_v_rels" ADD CONSTRAINT "_pages_v_rels_tour_curations_id_tour_curations_id_fk"
    FOREIGN KEY ("tour_curations_id") REFERENCES "tour_curations"("id") ON DELETE SET NULL ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_tour_curations_fk"
    FOREIGN KEY ("tour_curations_id") REFERENCES "tour_curations"("id") ON DELETE CASCADE ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE INDEX IF NOT EXISTS "tour_curations_site_id_idx" ON "tour_curations" ("site_id");
CREATE INDEX IF NOT EXISTS "tour_curations_is_default_idx" ON "tour_curations" ("is_default");
CREATE UNIQUE INDEX IF NOT EXISTS "tour_curations_site_is_default_unique_idx" ON "tour_curations" ("site_id") WHERE ("is_default" = true);
CREATE INDEX IF NOT EXISTS "tour_curations_rels_parent_idx" ON "tour_curations_rels" ("parent_id");
CREATE INDEX IF NOT EXISTS "tour_curations_rels_path_idx" ON "tour_curations_rels" ("path");
CREATE INDEX IF NOT EXISTS "tour_curations_rels_tour_products_id_idx" ON "tour_curations_rels" ("tour_products_id");
CREATE INDEX IF NOT EXISTS "pages_wings_go_tour_catalog_curation_idx" ON "pages" ("wings_go_tour_catalog_curation_id");
CREATE INDEX IF NOT EXISTS "_pages_v_version_wings_go_tour_catalog_curation_idx" ON "_pages_v" ("version_wings_go_tour_catalog_curation_id");
CREATE INDEX IF NOT EXISTS "pages_rels_tour_curations_id_idx" ON "pages_rels" ("tour_curations_id");
CREATE INDEX IF NOT EXISTS "_pages_v_rels_tour_curations_id_idx" ON "_pages_v_rels" ("tour_curations_id");
CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_tour_curations_id_idx" ON "payload_locked_documents_rels" ("tour_curations_id");

DO $$
DECLARE
  v_site_id integer;
  v_page_id integer;
  v_curation_id integer;
BEGIN
  SELECT "id" INTO v_site_id FROM "sites" WHERE "code" = 'wings-go' LIMIT 1;
  IF v_site_id IS NULL THEN
    RETURN;
  END IF;

  SELECT "id" INTO v_curation_id FROM "tour_curations" WHERE "site_id" = v_site_id AND "is_default" = true LIMIT 1;
  IF v_curation_id IS NULL THEN
    INSERT INTO "tour_curations" ("name", "is_default", "description", "site_id", "updated_at", "created_at")
    VALUES (
      'Tour nổi bật mặc định WingsGo',
      true,
      'Bộ sưu tập tour mặc định được chuyển đổi tự động từ trang /tour (US-078 Level 3+).',
      v_site_id,
      NOW(),
      NOW()
    )
    RETURNING "id" INTO v_curation_id;

    SELECT page."id" INTO v_page_id
    FROM "pages" AS page
    WHERE page."site_id" = v_site_id AND page."pathname" = '/tour'
    LIMIT 1;

    IF v_page_id IS NOT NULL THEN
      INSERT INTO "tour_curations_rels" ("order", "parent_id", "path", "tour_products_id")
      SELECT rel."order", v_curation_id, 'featuredTours', rel."tour_products_id"
      FROM "pages_rels" AS rel
      WHERE rel."parent_id" = v_page_id
        AND rel."path" = 'wingsGoTourCatalog.featuredTours'
        AND rel."tour_products_id" IS NOT NULL
      ORDER BY rel."order";

      UPDATE "pages"
      SET "wings_go_tour_catalog_curation_id" = v_curation_id
      WHERE "id" = v_page_id AND "wings_go_tour_catalog_curation_id" IS NULL;

      UPDATE "_pages_v"
      SET "version_wings_go_tour_catalog_curation_id" = v_curation_id
      WHERE "parent_id" = v_page_id AND "version_wings_go_tour_catalog_curation_id" IS NULL;
    END IF;
  END IF;
END $$;

INSERT INTO "payload_migrations" ("name", "batch", "updated_at", "created_at")
VALUES ('20261015_090000_wingsgo_tour_curations', 25, NOW(), NOW())
ON CONFLICT DO NOTHING;
