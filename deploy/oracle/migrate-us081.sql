-- Migration for US-081: Multi-Hotlines WingsGo
-- Safe additive schema modification on PostgreSQL with initial backfill for WingsGo

DO $$ BEGIN
  IF to_regclass('public.site_settings_additional_hotlines') IS NULL THEN
    CREATE TABLE "site_settings_additional_hotlines" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "phone_number" varchar NOT NULL,
      "label" varchar
    );

    INSERT INTO "site_settings_additional_hotlines" ("_order", "_parent_id", "id", "phone_number", "label")
    SELECT
      item.ord,
      ss.id,
      'wingsgo-' || ss.id || '-' || item.id_suffix,
      item.phone,
      item.label
    FROM "site_settings" ss
    JOIN "sites" s ON ss.site_id = s.id
    CROSS JOIN (
      VALUES
        (1, 'hotline-2', '0915250101', 'Tư vấn tour'),
        (2, 'hotline-3', '0915260101', 'Hỗ trợ dịch vụ')
    ) AS item(ord, id_suffix, phone, label)
    WHERE s.code = 'wings-go';
  END IF;
END $$;

DO $$ BEGIN
  ALTER TABLE "site_settings_additional_hotlines"
    ADD CONSTRAINT "site_settings_additional_hotlines_parent_id_fk"
    FOREIGN KEY ("_parent_id") REFERENCES "public"."site_settings"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "site_settings_additional_hotlines_order_idx"
  ON "site_settings_additional_hotlines" USING btree ("_order");
CREATE INDEX IF NOT EXISTS "site_settings_additional_hotlines_parent_id_idx"
  ON "site_settings_additional_hotlines" USING btree ("_parent_id");

INSERT INTO payload_migrations (name, batch, created_at, updated_at)
VALUES ('20261019_100000_site_settings_hotlines', (SELECT COALESCE(MAX(batch), 0) + 1 FROM payload_migrations), NOW(), NOW())
ON CONFLICT DO NOTHING;
