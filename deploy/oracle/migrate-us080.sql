-- Migration for US-080: Rich Text Itinerary & Editorial Formatting
-- Safe additive schema modification on PostgreSQL

ALTER TABLE "tour_products_itinerary_days_locales" ADD COLUMN IF NOT EXISTS "content" jsonb;
ALTER TABLE "_tour_products_v_version_itinerary_days_locales" ADD COLUMN IF NOT EXISTS "content" jsonb;

INSERT INTO payload_migrations (name, batch, created_at, updated_at)
VALUES ('20261015_120000_tour_itinerary_content_richtext', 26, NOW(), NOW())
ON CONFLICT DO NOTHING;
