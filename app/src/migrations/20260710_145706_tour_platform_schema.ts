import { MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Forward-only schema migration for the tour platform and expanded CMS locales.
 *
 * Curated from Payload's generated schema diff. Existing handwritten migrations
 * already own hero-presentation and favicon schema, so those statements are
 * deliberately excluded. The up migration does not drop or rewrite existing data.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  // The first production database was bootstrapped with Payload's dev push.
  // It already owns the tour tables and enums, but pre-dates the locale
  // expansion and a small set of generated constraints. Replaying the full
  // generated migration would fail on the first duplicate type, so reconcile
  // only the known, additive drift before marking this migration as applied.
  const existingTourSchema = await db.execute<{ exists: boolean }>(sql`
    SELECT to_regclass('public.tour_products') IS NOT NULL AS "exists"
  `)

  if (existingTourSchema.rows[0]?.exists) {
    await db.execute(sql`
      ALTER TYPE "public"."_locales" ADD VALUE IF NOT EXISTS 'it';
      ALTER TYPE "public"."_locales" ADD VALUE IF NOT EXISTS 'es';
      ALTER TYPE "public"."_locales" ADD VALUE IF NOT EXISTS 'pt';
      ALTER TYPE "public"."_locales" ADD VALUE IF NOT EXISTS 'ja';
      ALTER TYPE "public"."_locales" ADD VALUE IF NOT EXISTS 'ko';
      ALTER TYPE "public"."_locales" ADD VALUE IF NOT EXISTS 'fr';
      ALTER TYPE "public"."_locales" ADD VALUE IF NOT EXISTS 'de';
      ALTER TYPE "public"."enum_sites_supported_locales" ADD VALUE IF NOT EXISTS 'it';
      ALTER TYPE "public"."enum_sites_supported_locales" ADD VALUE IF NOT EXISTS 'es';
      ALTER TYPE "public"."enum_sites_supported_locales" ADD VALUE IF NOT EXISTS 'pt';
      ALTER TYPE "public"."enum_sites_supported_locales" ADD VALUE IF NOT EXISTS 'ja';
      ALTER TYPE "public"."enum_sites_supported_locales" ADD VALUE IF NOT EXISTS 'ko';
      ALTER TYPE "public"."enum_sites_supported_locales" ADD VALUE IF NOT EXISTS 'fr';
      ALTER TYPE "public"."enum_sites_supported_locales" ADD VALUE IF NOT EXISTS 'de';
      ALTER TYPE "public"."enum_sites_default_locale" ADD VALUE IF NOT EXISTS 'it';
      ALTER TYPE "public"."enum_sites_default_locale" ADD VALUE IF NOT EXISTS 'es';
      ALTER TYPE "public"."enum_sites_default_locale" ADD VALUE IF NOT EXISTS 'pt';
      ALTER TYPE "public"."enum_sites_default_locale" ADD VALUE IF NOT EXISTS 'ja';
      ALTER TYPE "public"."enum_sites_default_locale" ADD VALUE IF NOT EXISTS 'ko';
      ALTER TYPE "public"."enum_sites_default_locale" ADD VALUE IF NOT EXISTS 'fr';
      ALTER TYPE "public"."enum_sites_default_locale" ADD VALUE IF NOT EXISTS 'de';
      ALTER TYPE "public"."enum__pages_v_published_locale" ADD VALUE IF NOT EXISTS 'it';
      ALTER TYPE "public"."enum__pages_v_published_locale" ADD VALUE IF NOT EXISTS 'es';
      ALTER TYPE "public"."enum__pages_v_published_locale" ADD VALUE IF NOT EXISTS 'pt';
      ALTER TYPE "public"."enum__pages_v_published_locale" ADD VALUE IF NOT EXISTS 'ja';
      ALTER TYPE "public"."enum__pages_v_published_locale" ADD VALUE IF NOT EXISTS 'ko';
      ALTER TYPE "public"."enum__pages_v_published_locale" ADD VALUE IF NOT EXISTS 'fr';
      ALTER TYPE "public"."enum__pages_v_published_locale" ADD VALUE IF NOT EXISTS 'de';
      ALTER TYPE "public"."enum__posts_v_published_locale" ADD VALUE IF NOT EXISTS 'it';
      ALTER TYPE "public"."enum__posts_v_published_locale" ADD VALUE IF NOT EXISTS 'es';
      ALTER TYPE "public"."enum__posts_v_published_locale" ADD VALUE IF NOT EXISTS 'pt';
      ALTER TYPE "public"."enum__posts_v_published_locale" ADD VALUE IF NOT EXISTS 'ja';
      ALTER TYPE "public"."enum__posts_v_published_locale" ADD VALUE IF NOT EXISTS 'ko';
      ALTER TYPE "public"."enum__posts_v_published_locale" ADD VALUE IF NOT EXISTS 'fr';
      ALTER TYPE "public"."enum__posts_v_published_locale" ADD VALUE IF NOT EXISTS 'de';
      ALTER TYPE "public"."enum_exports_locale" ADD VALUE IF NOT EXISTS 'it';
      ALTER TYPE "public"."enum_exports_locale" ADD VALUE IF NOT EXISTS 'es';
      ALTER TYPE "public"."enum_exports_locale" ADD VALUE IF NOT EXISTS 'pt';
      ALTER TYPE "public"."enum_exports_locale" ADD VALUE IF NOT EXISTS 'ja';
      ALTER TYPE "public"."enum_exports_locale" ADD VALUE IF NOT EXISTS 'ko';
      ALTER TYPE "public"."enum_exports_locale" ADD VALUE IF NOT EXISTS 'fr';
      ALTER TYPE "public"."enum_exports_locale" ADD VALUE IF NOT EXISTS 'de';
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '_tour_products_v_version_review_snapshot_proof_quotes_parent_id_fk') THEN
          ALTER TABLE "_tour_products_v_version_review_snapshot_proof_quotes" ADD CONSTRAINT "_tour_products_v_version_review_snapshot_proof_quotes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_tour_products_v"("id") ON DELETE cascade ON UPDATE no action;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '_tour_products_v_version_market_card_thumbnail_override_id_media_id_fk') THEN
          ALTER TABLE "_tour_products_v" ADD CONSTRAINT "_tour_products_v_version_market_card_thumbnail_override_id_media_id_fk" FOREIGN KEY ("version_market_card_thumbnail_override_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '_tour_departures_v_version_variant_ref_id_departure_variants_id_fk') THEN
          ALTER TABLE "_tour_departures_v" ADD CONSTRAINT "_tour_departures_v_version_variant_ref_id_departure_variants_id_fk" FOREIGN KEY ("version_variant_ref_id") REFERENCES "public"."departure_variants"("id") ON DELETE set null ON UPDATE no action;
        END IF;
      END $$;
      CREATE INDEX IF NOT EXISTS "_tour_products_v_version_review_snapshot_proof_quotes_parent_id_idx" ON "_tour_products_v_version_review_snapshot_proof_quotes" USING btree ("_parent_id");
    `)
    return
  }

  await db.execute(sql`
  CREATE TYPE "public"."enum_tour_products_route_viz_stops_type" AS ENUM('origin', 'arrival', 'sightseeing', 'overnight', 'return');
  CREATE TYPE "public"."enum_tour_products_section_visibility" AS ENUM('hero', 'facts', 'why-choose', 'route', 'itinerary', 'services', 'departures', 'faq', 'related', 'reviews', 'sticky-cta');
  CREATE TYPE "public"."enum_tour_products_section_order" AS ENUM('hero', 'facts', 'reviews', 'why-choose', 'route', 'itinerary', 'services', 'departures', 'faq', 'related', 'sticky-cta');
  CREATE TYPE "public"."enum_tour_products_market" AS ENUM('korea', 'japan', 'china');
  CREATE TYPE "public"."enum_tour_products_primary_c_t_a_mode" AS ENUM('inquiry', 'hold-seat', 'request-quote', 'contact');
  CREATE TYPE "public"."enum_tour_products_bcfg_template" AS ENUM('dense-retail-default', 'dense-retail-variant');
  CREATE TYPE "public"."enum_tour_products_bcfg_cta_style" AS ENUM('hold-seat', 'inquiry', 'request-quote');
  CREATE TYPE "public"."enum_tour_products_bcfg_route_mode" AS ENUM('route-map', 'stop-timeline');
  CREATE TYPE "public"."enum_tour_products_bcfg_itin_mode" AS ENUM('timeline-cards', 'accordion');
  CREATE TYPE "public"."enum_tour_products_bcfg_dep_mode" AS ENUM('matrix', 'cards');
  CREATE TYPE "public"."enum_tour_products_variant_strategy" AS ENUM('product-first', 'variant-first');
  CREATE TYPE "public"."enum_tour_products_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__tour_products_v_version_route_viz_stops_type" AS ENUM('origin', 'arrival', 'sightseeing', 'overnight', 'return');
  CREATE TYPE "public"."enum__tour_products_v_version_section_visibility" AS ENUM('hero', 'facts', 'why-choose', 'route', 'itinerary', 'services', 'departures', 'faq', 'related', 'reviews', 'sticky-cta');
  CREATE TYPE "public"."enum__tour_products_v_version_section_order" AS ENUM('hero', 'facts', 'reviews', 'why-choose', 'route', 'itinerary', 'services', 'departures', 'faq', 'related', 'sticky-cta');
  CREATE TYPE "public"."enum__tour_products_v_version_market" AS ENUM('korea', 'japan', 'china');
  CREATE TYPE "public"."enum__tour_products_v_version_primary_c_t_a_mode" AS ENUM('inquiry', 'hold-seat', 'request-quote', 'contact');
  CREATE TYPE "public"."enum__tour_products_v_version_bcfg_template" AS ENUM('dense-retail-default', 'dense-retail-variant');
  CREATE TYPE "public"."enum__tour_products_v_version_bcfg_cta_style" AS ENUM('hold-seat', 'inquiry', 'request-quote');
  CREATE TYPE "public"."enum__tour_products_v_version_bcfg_route_mode" AS ENUM('route-map', 'stop-timeline');
  CREATE TYPE "public"."enum__tour_products_v_version_bcfg_itin_mode" AS ENUM('timeline-cards', 'accordion');
  CREATE TYPE "public"."enum__tour_products_v_version_bcfg_dep_mode" AS ENUM('matrix', 'cards');
  CREATE TYPE "public"."enum__tour_products_v_version_variant_strategy" AS ENUM('product-first', 'variant-first');
  CREATE TYPE "public"."enum__tour_products_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__tour_products_v_published_locale" AS ENUM('vi', 'en', 'it', 'es', 'pt', 'ja', 'ko', 'fr', 'de');
  CREATE TYPE "public"."enum_departure_variants_rvo_st_tp" AS ENUM('origin', 'arrival', 'sightseeing', 'overnight', 'return');
  CREATE TYPE "public"."enum_departure_variants_status" AS ENUM('active', 'inactive', 'archived');
  CREATE TYPE "public"."enum_tour_departures_currency" AS ENUM('VND');
  CREATE TYPE "public"."enum_tour_departures_availability_status" AS ENUM('open', 'limited', 'sold-out');
  CREATE TYPE "public"."enum_tour_departures_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__tour_departures_v_version_currency" AS ENUM('VND');
  CREATE TYPE "public"."enum__tour_departures_v_version_availability_status" AS ENUM('open', 'limited', 'sold-out');
  CREATE TYPE "public"."enum__tour_departures_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__tour_departures_v_published_locale" AS ENUM('vi', 'en', 'it', 'es', 'pt', 'ja', 'ko', 'fr', 'de');
  CREATE TYPE "public"."enum_tour_campaigns_season_key" AS ENUM('summer-2026', 'always-on');
  CREATE TYPE "public"."enum_tour_campaigns_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__tour_campaigns_v_version_season_key" AS ENUM('summer-2026', 'always-on');
  CREATE TYPE "public"."enum__tour_campaigns_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__tour_campaigns_v_published_locale" AS ENUM('vi', 'en', 'it', 'es', 'pt', 'ja', 'ko', 'fr', 'de');
  ALTER TYPE "public"."_locales" ADD VALUE IF NOT EXISTS 'it';
  ALTER TYPE "public"."_locales" ADD VALUE IF NOT EXISTS 'es';
  ALTER TYPE "public"."_locales" ADD VALUE IF NOT EXISTS 'pt';
  ALTER TYPE "public"."_locales" ADD VALUE IF NOT EXISTS 'ja';
  ALTER TYPE "public"."_locales" ADD VALUE IF NOT EXISTS 'ko';
  ALTER TYPE "public"."_locales" ADD VALUE IF NOT EXISTS 'fr';
  ALTER TYPE "public"."_locales" ADD VALUE IF NOT EXISTS 'de';
  ALTER TYPE "public"."enum_sites_supported_locales" ADD VALUE IF NOT EXISTS 'it';
  ALTER TYPE "public"."enum_sites_supported_locales" ADD VALUE IF NOT EXISTS 'es';
  ALTER TYPE "public"."enum_sites_supported_locales" ADD VALUE IF NOT EXISTS 'pt';
  ALTER TYPE "public"."enum_sites_supported_locales" ADD VALUE IF NOT EXISTS 'ja';
  ALTER TYPE "public"."enum_sites_supported_locales" ADD VALUE IF NOT EXISTS 'ko';
  ALTER TYPE "public"."enum_sites_supported_locales" ADD VALUE IF NOT EXISTS 'fr';
  ALTER TYPE "public"."enum_sites_supported_locales" ADD VALUE IF NOT EXISTS 'de';
  ALTER TYPE "public"."enum_sites_default_locale" ADD VALUE IF NOT EXISTS 'it';
  ALTER TYPE "public"."enum_sites_default_locale" ADD VALUE IF NOT EXISTS 'es';
  ALTER TYPE "public"."enum_sites_default_locale" ADD VALUE IF NOT EXISTS 'pt';
  ALTER TYPE "public"."enum_sites_default_locale" ADD VALUE IF NOT EXISTS 'ja';
  ALTER TYPE "public"."enum_sites_default_locale" ADD VALUE IF NOT EXISTS 'ko';
  ALTER TYPE "public"."enum_sites_default_locale" ADD VALUE IF NOT EXISTS 'fr';
  ALTER TYPE "public"."enum_sites_default_locale" ADD VALUE IF NOT EXISTS 'de';
  ALTER TYPE "public"."enum__pages_v_published_locale" ADD VALUE IF NOT EXISTS 'it';
  ALTER TYPE "public"."enum__pages_v_published_locale" ADD VALUE IF NOT EXISTS 'es';
  ALTER TYPE "public"."enum__pages_v_published_locale" ADD VALUE IF NOT EXISTS 'pt';
  ALTER TYPE "public"."enum__pages_v_published_locale" ADD VALUE IF NOT EXISTS 'ja';
  ALTER TYPE "public"."enum__pages_v_published_locale" ADD VALUE IF NOT EXISTS 'ko';
  ALTER TYPE "public"."enum__pages_v_published_locale" ADD VALUE IF NOT EXISTS 'fr';
  ALTER TYPE "public"."enum__pages_v_published_locale" ADD VALUE IF NOT EXISTS 'de';
  ALTER TYPE "public"."enum__posts_v_published_locale" ADD VALUE IF NOT EXISTS 'it';
  ALTER TYPE "public"."enum__posts_v_published_locale" ADD VALUE IF NOT EXISTS 'es';
  ALTER TYPE "public"."enum__posts_v_published_locale" ADD VALUE IF NOT EXISTS 'pt';
  ALTER TYPE "public"."enum__posts_v_published_locale" ADD VALUE IF NOT EXISTS 'ja';
  ALTER TYPE "public"."enum__posts_v_published_locale" ADD VALUE IF NOT EXISTS 'ko';
  ALTER TYPE "public"."enum__posts_v_published_locale" ADD VALUE IF NOT EXISTS 'fr';
  ALTER TYPE "public"."enum__posts_v_published_locale" ADD VALUE IF NOT EXISTS 'de';
  ALTER TYPE "public"."enum_exports_locale" ADD VALUE IF NOT EXISTS 'it';
  ALTER TYPE "public"."enum_exports_locale" ADD VALUE IF NOT EXISTS 'es';
  ALTER TYPE "public"."enum_exports_locale" ADD VALUE IF NOT EXISTS 'pt';
  ALTER TYPE "public"."enum_exports_locale" ADD VALUE IF NOT EXISTS 'ja';
  ALTER TYPE "public"."enum_exports_locale" ADD VALUE IF NOT EXISTS 'ko';
  ALTER TYPE "public"."enum_exports_locale" ADD VALUE IF NOT EXISTS 'fr';
  ALTER TYPE "public"."enum_exports_locale" ADD VALUE IF NOT EXISTS 'de';
  CREATE TABLE "tour_products_highlights" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "tour_products_highlights_locales" (
  	"title" varchar,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "tour_products_review_snapshot_proof_quotes" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "tour_products_review_snapshot_proof_quotes_locales" (
  	"quote" varchar,
  	"author" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "tour_products_route_viz_stops" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"order" numeric,
  	"type" "enum_tour_products_route_viz_stops_type" DEFAULT 'sightseeing'
  );
  
  CREATE TABLE "tour_products_route_viz_stops_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "tour_products_route_viz_travel_legs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "tour_products_route_viz_travel_legs_locales" (
  	"from" varchar,
  	"to" varchar,
  	"mode" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "tour_products_badges" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "tour_products_badges_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "tour_products_market_card_badges" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "tour_products_market_card_badges_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "tour_products_itinerary_days" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"day_number" numeric,
  	"media_id" integer
  );
  
  CREATE TABLE "tour_products_itinerary_days_locales" (
  	"title" varchar,
  	"route" varchar,
  	"summary" varchar,
  	"meals" varchar,
  	"transport" varchar,
  	"accommodation" varchar,
  	"notes" varchar,
  	"day_theme" varchar,
  	"day_highlight" varchar,
  	"sleeping_standard" varchar,
  	"equipment_note" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "tour_products_includes" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "tour_products_includes_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "tour_products_excludes" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "tour_products_excludes_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "tour_products_services_summary_notes" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "tour_products_services_summary_notes_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "tour_products_faq_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "tour_products_faq_items_locales" (
  	"question" varchar,
  	"answer" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "tour_products_section_visibility" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_tour_products_section_visibility",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "tour_products_section_order" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_tour_products_section_order",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "tour_products" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"site_id" integer,
  	"market" "enum_tour_products_market",
  	"tour_code" varchar,
  	"duration_days" numeric,
  	"duration_nights" numeric,
  	"wrapper_page_id" integer,
  	"hero_media_id" integer,
  	"review_snapshot_score" numeric,
  	"review_snapshot_review_count" numeric,
  	"review_snapshot_traveler_count" numeric,
  	"route_viz_map_image_id" integer,
  	"market_card_thumbnail_override_id" integer,
  	"primary_c_t_a_mode" "enum_tour_products_primary_c_t_a_mode" DEFAULT 'inquiry',
  	"primary_c_t_a_href" varchar,
  	"primary_c_t_a_lead_form_variant" varchar,
  	"primary_c_t_a_booking_intent_mode" varchar,
  	"bcfg_template" "enum_tour_products_bcfg_template" DEFAULT 'dense-retail-default',
  	"bcfg_sticky_c_t_a_enabled" boolean DEFAULT true,
  	"bcfg_cta_style" "enum_tour_products_bcfg_cta_style" DEFAULT 'hold-seat',
  	"bcfg_route_mode" "enum_tour_products_bcfg_route_mode" DEFAULT 'route-map',
  	"bcfg_itin_mode" "enum_tour_products_bcfg_itin_mode" DEFAULT 'timeline-cards',
  	"bcfg_dep_mode" "enum_tour_products_bcfg_dep_mode" DEFAULT 'matrix',
  	"variant_strategy" "enum_tour_products_variant_strategy" DEFAULT 'product-first',
  	"generate_slug" boolean DEFAULT true,
  	"slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_tour_products_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "tour_products_locales" (
  	"title" varchar,
  	"summary" varchar,
  	"fact_summary_route_summary" varchar,
  	"fact_summary_meals_summary" varchar,
  	"fact_summary_group_size_summary" varchar,
  	"fact_summary_operator_note" varchar,
  	"fact_summary_hold_note" varchar,
  	"fact_summary_hotel_summary" varchar,
  	"review_snapshot_source_label" varchar,
  	"review_snapshot_why_guests_choose" varchar,
  	"route_viz_route_caption" varchar,
  	"market_card_selling_line" varchar,
  	"market_card_priority_label" varchar,
  	"market_card_featured_reason" varchar,
  	"primary_c_t_a_label" varchar,
  	"services_summary_hotel_summary" varchar,
  	"services_summary_meals_summary" varchar,
  	"services_summary_transport_summary" varchar,
  	"services_summary_operator_notes" varchar,
  	"meta_title" varchar,
  	"meta_image_id" integer,
  	"meta_description" varchar,
  	"meta_breadcrumb_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "tour_products_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer,
  	"tour_products_id" integer
  );
  
  CREATE TABLE "_tour_products_v_version_highlights" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_tour_products_v_version_highlights_locales" (
  	"title" varchar,
  	"description" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_tour_products_v_version_review_snapshot_proof_quotes" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_tour_products_v_version_review_snapshot_proof_quotes_locales" (
  	"quote" varchar,
  	"author" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_tour_products_v_version_route_viz_stops" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" numeric,
  	"type" "enum__tour_products_v_version_route_viz_stops_type" DEFAULT 'sightseeing',
  	"_uuid" varchar
  );
  
  CREATE TABLE "_tour_products_v_version_route_viz_stops_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_tour_products_v_version_route_viz_travel_legs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_tour_products_v_version_route_viz_travel_legs_locales" (
  	"from" varchar,
  	"to" varchar,
  	"mode" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_tour_products_v_version_badges" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_tour_products_v_version_badges_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_tour_products_v_version_market_card_badges" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_tour_products_v_version_market_card_badges_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_tour_products_v_version_itinerary_days" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"day_number" numeric,
  	"media_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_tour_products_v_version_itinerary_days_locales" (
  	"title" varchar,
  	"route" varchar,
  	"summary" varchar,
  	"meals" varchar,
  	"transport" varchar,
  	"accommodation" varchar,
  	"notes" varchar,
  	"day_theme" varchar,
  	"day_highlight" varchar,
  	"sleeping_standard" varchar,
  	"equipment_note" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_tour_products_v_version_includes" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_tour_products_v_version_includes_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_tour_products_v_version_excludes" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_tour_products_v_version_excludes_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_tour_products_v_version_services_summary_notes" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_tour_products_v_version_services_summary_notes_locales" (
  	"label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_tour_products_v_version_faq_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_tour_products_v_version_faq_items_locales" (
  	"question" varchar,
  	"answer" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_tour_products_v_version_section_visibility" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum__tour_products_v_version_section_visibility",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "_tour_products_v_version_section_order" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum__tour_products_v_version_section_order",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "_tour_products_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_site_id" integer,
  	"version_market" "enum__tour_products_v_version_market",
  	"version_tour_code" varchar,
  	"version_duration_days" numeric,
  	"version_duration_nights" numeric,
  	"version_wrapper_page_id" integer,
  	"version_hero_media_id" integer,
  	"version_review_snapshot_score" numeric,
  	"version_review_snapshot_review_count" numeric,
  	"version_review_snapshot_traveler_count" numeric,
  	"version_route_viz_map_image_id" integer,
  	"version_market_card_thumbnail_override_id" integer,
  	"version_primary_c_t_a_mode" "enum__tour_products_v_version_primary_c_t_a_mode" DEFAULT 'inquiry',
  	"version_primary_c_t_a_href" varchar,
  	"version_primary_c_t_a_lead_form_variant" varchar,
  	"version_primary_c_t_a_booking_intent_mode" varchar,
  	"version_bcfg_template" "enum__tour_products_v_version_bcfg_template" DEFAULT 'dense-retail-default',
  	"version_bcfg_sticky_c_t_a_enabled" boolean DEFAULT true,
  	"version_bcfg_cta_style" "enum__tour_products_v_version_bcfg_cta_style" DEFAULT 'hold-seat',
  	"version_bcfg_route_mode" "enum__tour_products_v_version_bcfg_route_mode" DEFAULT 'route-map',
  	"version_bcfg_itin_mode" "enum__tour_products_v_version_bcfg_itin_mode" DEFAULT 'timeline-cards',
  	"version_bcfg_dep_mode" "enum__tour_products_v_version_bcfg_dep_mode" DEFAULT 'matrix',
  	"version_variant_strategy" "enum__tour_products_v_version_variant_strategy" DEFAULT 'product-first',
  	"version_generate_slug" boolean DEFAULT true,
  	"version_slug" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__tour_products_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__tour_products_v_published_locale",
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "_tour_products_v_locales" (
  	"version_title" varchar,
  	"version_summary" varchar,
  	"version_fact_summary_route_summary" varchar,
  	"version_fact_summary_meals_summary" varchar,
  	"version_fact_summary_group_size_summary" varchar,
  	"version_fact_summary_operator_note" varchar,
  	"version_fact_summary_hold_note" varchar,
  	"version_fact_summary_hotel_summary" varchar,
  	"version_review_snapshot_source_label" varchar,
  	"version_review_snapshot_why_guests_choose" varchar,
  	"version_route_viz_route_caption" varchar,
  	"version_market_card_selling_line" varchar,
  	"version_market_card_priority_label" varchar,
  	"version_market_card_featured_reason" varchar,
  	"version_primary_c_t_a_label" varchar,
  	"version_services_summary_hotel_summary" varchar,
  	"version_services_summary_meals_summary" varchar,
  	"version_services_summary_transport_summary" varchar,
  	"version_services_summary_operator_notes" varchar,
  	"version_meta_title" varchar,
  	"version_meta_image_id" integer,
  	"version_meta_description" varchar,
  	"version_meta_breadcrumb_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_tour_products_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer,
  	"tour_products_id" integer
  );
  
  CREATE TABLE "departure_variants_rvo_st" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"order" numeric NOT NULL,
  	"tp" "enum_departure_variants_rvo_st_tp" DEFAULT 'sightseeing'
  );
  
  CREATE TABLE "departure_variants_rvo_st_locales" (
  	"label" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "departure_variants_itinerary_day_overrides" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"day_number" numeric NOT NULL
  );
  
  CREATE TABLE "departure_variants_itinerary_day_overrides_locales" (
  	"title" varchar,
  	"route" varchar,
  	"summary" varchar,
  	"meals" varchar,
  	"transport" varchar,
  	"accommodation" varchar,
  	"day_theme" varchar,
  	"day_highlight" varchar,
  	"sleeping_standard" varchar,
  	"equipment_note" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "departure_variants" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"site_id" integer NOT NULL,
  	"tour_product_id" integer NOT NULL,
  	"variant_key" varchar NOT NULL,
  	"status" "enum_departure_variants_status" DEFAULT 'active' NOT NULL,
  	"display_priority" numeric DEFAULT 0,
  	"hero_media_override_id" integer,
  	"rvo_map_image_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "departure_variants_locales" (
  	"label" varchar NOT NULL,
  	"departure_city" varchar,
  	"airline" varchar,
  	"summary_override" varchar,
  	"rvo_route_caption" varchar,
  	"services_override_hotel_summary" varchar,
  	"services_override_transport_summary" varchar,
  	"services_override_important_notes" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "departure_variants_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer,
  	"tour_departures_id" integer
  );
  
  CREATE TABLE "tour_departures" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"site_id" integer,
  	"tour_product_id" integer,
  	"variant_ref_id" integer,
  	"variant_key" varchar,
  	"departure_date" timestamp(3) with time zone,
  	"return_date" timestamp(3) with time zone,
  	"price_from" numeric,
  	"currency" "enum_tour_departures_currency" DEFAULT 'VND',
  	"availability_status" "enum_tour_departures_availability_status" DEFAULT 'open',
  	"is_featured" boolean DEFAULT false,
  	"intent_config_lead_form_variant" varchar,
  	"intent_config_booking_intent_mode" varchar,
  	"intent_config_sales_routing_hint" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_tour_departures_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "tour_departures_locales" (
  	"departure_city" varchar,
  	"airline" varchar,
  	"promo_label" varchar,
  	"urgency_label" varchar,
  	"availability_badge" varchar,
  	"note" varchar,
  	"deposit_note" varchar,
  	"hold_note" varchar,
  	"change_policy_note" varchar,
  	"cta_label_override" varchar,
  	"intent_config_booking_note" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_tour_departures_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_site_id" integer,
  	"version_tour_product_id" integer,
  	"version_variant_ref_id" integer,
  	"version_variant_key" varchar,
  	"version_departure_date" timestamp(3) with time zone,
  	"version_return_date" timestamp(3) with time zone,
  	"version_price_from" numeric,
  	"version_currency" "enum__tour_departures_v_version_currency" DEFAULT 'VND',
  	"version_availability_status" "enum__tour_departures_v_version_availability_status" DEFAULT 'open',
  	"version_is_featured" boolean DEFAULT false,
  	"version_intent_config_lead_form_variant" varchar,
  	"version_intent_config_booking_intent_mode" varchar,
  	"version_intent_config_sales_routing_hint" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__tour_departures_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__tour_departures_v_published_locale",
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "_tour_departures_v_locales" (
  	"version_departure_city" varchar,
  	"version_airline" varchar,
  	"version_promo_label" varchar,
  	"version_urgency_label" varchar,
  	"version_availability_badge" varchar,
  	"version_note" varchar,
  	"version_deposit_note" varchar,
  	"version_hold_note" varchar,
  	"version_change_policy_note" varchar,
  	"version_cta_label_override" varchar,
  	"version_intent_config_booking_note" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "tour_campaigns" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"site_id" integer,
  	"campaign_code" varchar,
  	"season_key" "enum_tour_campaigns_season_key" DEFAULT 'summer-2026',
  	"wrapper_page_id" integer,
  	"hero_media_id" integer,
  	"generate_slug" boolean DEFAULT true,
  	"slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_tour_campaigns_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "tour_campaigns_locales" (
  	"title" varchar,
  	"summary" varchar,
  	"meta_title" varchar,
  	"meta_image_id" integer,
  	"meta_description" varchar,
  	"meta_breadcrumb_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "tour_campaigns_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"tour_products_id" integer,
  	"tour_departures_id" integer
  );
  
  CREATE TABLE "_tour_campaigns_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_site_id" integer,
  	"version_campaign_code" varchar,
  	"version_season_key" "enum__tour_campaigns_v_version_season_key" DEFAULT 'summer-2026',
  	"version_wrapper_page_id" integer,
  	"version_hero_media_id" integer,
  	"version_generate_slug" boolean DEFAULT true,
  	"version_slug" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__tour_campaigns_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"snapshot" boolean,
  	"published_locale" "enum__tour_campaigns_v_published_locale",
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "_tour_campaigns_v_locales" (
  	"version_title" varchar,
  	"version_summary" varchar,
  	"version_meta_title" varchar,
  	"version_meta_image_id" integer,
  	"version_meta_description" varchar,
  	"version_meta_breadcrumb_label" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_tour_campaigns_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"tour_products_id" integer,
  	"tour_departures_id" integer
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "tour_products_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "departure_variants_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "tour_departures_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "tour_campaigns_id" integer;
  ALTER TABLE "tour_products_highlights" ADD CONSTRAINT "tour_products_highlights_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."tour_products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tour_products_highlights_locales" ADD CONSTRAINT "tour_products_highlights_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."tour_products_highlights"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tour_products_review_snapshot_proof_quotes" ADD CONSTRAINT "tour_products_review_snapshot_proof_quotes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."tour_products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tour_products_review_snapshot_proof_quotes_locales" ADD CONSTRAINT "tour_products_review_snapshot_proof_quotes_locales_parent_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."tour_products_review_snapshot_proof_quotes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tour_products_route_viz_stops" ADD CONSTRAINT "tour_products_route_viz_stops_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."tour_products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tour_products_route_viz_stops_locales" ADD CONSTRAINT "tour_products_route_viz_stops_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."tour_products_route_viz_stops"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tour_products_route_viz_travel_legs" ADD CONSTRAINT "tour_products_route_viz_travel_legs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."tour_products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tour_products_route_viz_travel_legs_locales" ADD CONSTRAINT "tour_products_route_viz_travel_legs_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."tour_products_route_viz_travel_legs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tour_products_badges" ADD CONSTRAINT "tour_products_badges_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."tour_products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tour_products_badges_locales" ADD CONSTRAINT "tour_products_badges_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."tour_products_badges"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tour_products_market_card_badges" ADD CONSTRAINT "tour_products_market_card_badges_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."tour_products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tour_products_market_card_badges_locales" ADD CONSTRAINT "tour_products_market_card_badges_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."tour_products_market_card_badges"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tour_products_itinerary_days" ADD CONSTRAINT "tour_products_itinerary_days_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "tour_products_itinerary_days" ADD CONSTRAINT "tour_products_itinerary_days_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."tour_products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tour_products_itinerary_days_locales" ADD CONSTRAINT "tour_products_itinerary_days_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."tour_products_itinerary_days"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tour_products_includes" ADD CONSTRAINT "tour_products_includes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."tour_products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tour_products_includes_locales" ADD CONSTRAINT "tour_products_includes_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."tour_products_includes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tour_products_excludes" ADD CONSTRAINT "tour_products_excludes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."tour_products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tour_products_excludes_locales" ADD CONSTRAINT "tour_products_excludes_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."tour_products_excludes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tour_products_services_summary_notes" ADD CONSTRAINT "tour_products_services_summary_notes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."tour_products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tour_products_services_summary_notes_locales" ADD CONSTRAINT "tour_products_services_summary_notes_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."tour_products_services_summary_notes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tour_products_faq_items" ADD CONSTRAINT "tour_products_faq_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."tour_products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tour_products_faq_items_locales" ADD CONSTRAINT "tour_products_faq_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."tour_products_faq_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tour_products_section_visibility" ADD CONSTRAINT "tour_products_section_visibility_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."tour_products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tour_products_section_order" ADD CONSTRAINT "tour_products_section_order_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."tour_products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tour_products" ADD CONSTRAINT "tour_products_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "tour_products" ADD CONSTRAINT "tour_products_wrapper_page_id_pages_id_fk" FOREIGN KEY ("wrapper_page_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "tour_products" ADD CONSTRAINT "tour_products_hero_media_id_media_id_fk" FOREIGN KEY ("hero_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "tour_products" ADD CONSTRAINT "tour_products_route_viz_map_image_id_media_id_fk" FOREIGN KEY ("route_viz_map_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "tour_products" ADD CONSTRAINT "tour_products_market_card_thumbnail_override_id_media_id_fk" FOREIGN KEY ("market_card_thumbnail_override_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "tour_products_locales" ADD CONSTRAINT "tour_products_locales_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "tour_products_locales" ADD CONSTRAINT "tour_products_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."tour_products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tour_products_rels" ADD CONSTRAINT "tour_products_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."tour_products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tour_products_rels" ADD CONSTRAINT "tour_products_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tour_products_rels" ADD CONSTRAINT "tour_products_rels_tour_products_fk" FOREIGN KEY ("tour_products_id") REFERENCES "public"."tour_products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_tour_products_v_version_highlights" ADD CONSTRAINT "_tour_products_v_version_highlights_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_tour_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_tour_products_v_version_highlights_locales" ADD CONSTRAINT "_tour_products_v_version_highlights_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_tour_products_v_version_highlights"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_tour_products_v_version_review_snapshot_proof_quotes" ADD CONSTRAINT "_tour_products_v_version_review_snapshot_proof_quotes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_tour_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_tour_products_v_version_review_snapshot_proof_quotes_locales" ADD CONSTRAINT "_tour_products_v_version_review_snapshot_proof_quotes_loc_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_tour_products_v_version_review_snapshot_proof_quotes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_tour_products_v_version_route_viz_stops" ADD CONSTRAINT "_tour_products_v_version_route_viz_stops_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_tour_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_tour_products_v_version_route_viz_stops_locales" ADD CONSTRAINT "_tour_products_v_version_route_viz_stops_locales_parent_i_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_tour_products_v_version_route_viz_stops"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_tour_products_v_version_route_viz_travel_legs" ADD CONSTRAINT "_tour_products_v_version_route_viz_travel_legs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_tour_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_tour_products_v_version_route_viz_travel_legs_locales" ADD CONSTRAINT "_tour_products_v_version_route_viz_travel_legs_locales_pa_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_tour_products_v_version_route_viz_travel_legs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_tour_products_v_version_badges" ADD CONSTRAINT "_tour_products_v_version_badges_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_tour_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_tour_products_v_version_badges_locales" ADD CONSTRAINT "_tour_products_v_version_badges_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_tour_products_v_version_badges"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_tour_products_v_version_market_card_badges" ADD CONSTRAINT "_tour_products_v_version_market_card_badges_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_tour_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_tour_products_v_version_market_card_badges_locales" ADD CONSTRAINT "_tour_products_v_version_market_card_badges_locales_paren_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_tour_products_v_version_market_card_badges"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_tour_products_v_version_itinerary_days" ADD CONSTRAINT "_tour_products_v_version_itinerary_days_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_tour_products_v_version_itinerary_days" ADD CONSTRAINT "_tour_products_v_version_itinerary_days_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_tour_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_tour_products_v_version_itinerary_days_locales" ADD CONSTRAINT "_tour_products_v_version_itinerary_days_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_tour_products_v_version_itinerary_days"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_tour_products_v_version_includes" ADD CONSTRAINT "_tour_products_v_version_includes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_tour_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_tour_products_v_version_includes_locales" ADD CONSTRAINT "_tour_products_v_version_includes_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_tour_products_v_version_includes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_tour_products_v_version_excludes" ADD CONSTRAINT "_tour_products_v_version_excludes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_tour_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_tour_products_v_version_excludes_locales" ADD CONSTRAINT "_tour_products_v_version_excludes_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_tour_products_v_version_excludes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_tour_products_v_version_services_summary_notes" ADD CONSTRAINT "_tour_products_v_version_services_summary_notes_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_tour_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_tour_products_v_version_services_summary_notes_locales" ADD CONSTRAINT "_tour_products_v_version_services_summary_notes_locales_p_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_tour_products_v_version_services_summary_notes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_tour_products_v_version_faq_items" ADD CONSTRAINT "_tour_products_v_version_faq_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_tour_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_tour_products_v_version_faq_items_locales" ADD CONSTRAINT "_tour_products_v_version_faq_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_tour_products_v_version_faq_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_tour_products_v_version_section_visibility" ADD CONSTRAINT "_tour_products_v_version_section_visibility_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_tour_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_tour_products_v_version_section_order" ADD CONSTRAINT "_tour_products_v_version_section_order_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_tour_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_tour_products_v" ADD CONSTRAINT "_tour_products_v_parent_id_tour_products_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."tour_products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_tour_products_v" ADD CONSTRAINT "_tour_products_v_version_site_id_sites_id_fk" FOREIGN KEY ("version_site_id") REFERENCES "public"."sites"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_tour_products_v" ADD CONSTRAINT "_tour_products_v_version_wrapper_page_id_pages_id_fk" FOREIGN KEY ("version_wrapper_page_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_tour_products_v" ADD CONSTRAINT "_tour_products_v_version_hero_media_id_media_id_fk" FOREIGN KEY ("version_hero_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_tour_products_v" ADD CONSTRAINT "_tour_products_v_version_route_viz_map_image_id_media_id_fk" FOREIGN KEY ("version_route_viz_map_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_tour_products_v" ADD CONSTRAINT "_tour_products_v_version_market_card_thumbnail_override_id_media_id_fk" FOREIGN KEY ("version_market_card_thumbnail_override_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_tour_products_v_locales" ADD CONSTRAINT "_tour_products_v_locales_version_meta_image_id_media_id_fk" FOREIGN KEY ("version_meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_tour_products_v_locales" ADD CONSTRAINT "_tour_products_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_tour_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_tour_products_v_rels" ADD CONSTRAINT "_tour_products_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_tour_products_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_tour_products_v_rels" ADD CONSTRAINT "_tour_products_v_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_tour_products_v_rels" ADD CONSTRAINT "_tour_products_v_rels_tour_products_fk" FOREIGN KEY ("tour_products_id") REFERENCES "public"."tour_products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "departure_variants_rvo_st" ADD CONSTRAINT "departure_variants_rvo_st_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."departure_variants"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "departure_variants_rvo_st_locales" ADD CONSTRAINT "departure_variants_rvo_st_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."departure_variants_rvo_st"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "departure_variants_itinerary_day_overrides" ADD CONSTRAINT "departure_variants_itinerary_day_overrides_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."departure_variants"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "departure_variants_itinerary_day_overrides_locales" ADD CONSTRAINT "departure_variants_itinerary_day_overrides_locales_parent_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."departure_variants_itinerary_day_overrides"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "departure_variants" ADD CONSTRAINT "departure_variants_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "departure_variants" ADD CONSTRAINT "departure_variants_tour_product_id_tour_products_id_fk" FOREIGN KEY ("tour_product_id") REFERENCES "public"."tour_products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "departure_variants" ADD CONSTRAINT "departure_variants_hero_media_override_id_media_id_fk" FOREIGN KEY ("hero_media_override_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "departure_variants" ADD CONSTRAINT "departure_variants_rvo_map_image_id_media_id_fk" FOREIGN KEY ("rvo_map_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "departure_variants_locales" ADD CONSTRAINT "departure_variants_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."departure_variants"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "departure_variants_rels" ADD CONSTRAINT "departure_variants_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."departure_variants"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "departure_variants_rels" ADD CONSTRAINT "departure_variants_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "departure_variants_rels" ADD CONSTRAINT "departure_variants_rels_tour_departures_fk" FOREIGN KEY ("tour_departures_id") REFERENCES "public"."tour_departures"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tour_departures" ADD CONSTRAINT "tour_departures_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "tour_departures" ADD CONSTRAINT "tour_departures_tour_product_id_tour_products_id_fk" FOREIGN KEY ("tour_product_id") REFERENCES "public"."tour_products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "tour_departures" ADD CONSTRAINT "tour_departures_variant_ref_id_departure_variants_id_fk" FOREIGN KEY ("variant_ref_id") REFERENCES "public"."departure_variants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "tour_departures_locales" ADD CONSTRAINT "tour_departures_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."tour_departures"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_tour_departures_v" ADD CONSTRAINT "_tour_departures_v_parent_id_tour_departures_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."tour_departures"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_tour_departures_v" ADD CONSTRAINT "_tour_departures_v_version_site_id_sites_id_fk" FOREIGN KEY ("version_site_id") REFERENCES "public"."sites"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_tour_departures_v" ADD CONSTRAINT "_tour_departures_v_version_tour_product_id_tour_products_id_fk" FOREIGN KEY ("version_tour_product_id") REFERENCES "public"."tour_products"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_tour_departures_v" ADD CONSTRAINT "_tour_departures_v_version_variant_ref_id_departure_variants_id_fk" FOREIGN KEY ("version_variant_ref_id") REFERENCES "public"."departure_variants"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_tour_departures_v_locales" ADD CONSTRAINT "_tour_departures_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_tour_departures_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tour_campaigns" ADD CONSTRAINT "tour_campaigns_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "tour_campaigns" ADD CONSTRAINT "tour_campaigns_wrapper_page_id_pages_id_fk" FOREIGN KEY ("wrapper_page_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "tour_campaigns" ADD CONSTRAINT "tour_campaigns_hero_media_id_media_id_fk" FOREIGN KEY ("hero_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "tour_campaigns_locales" ADD CONSTRAINT "tour_campaigns_locales_meta_image_id_media_id_fk" FOREIGN KEY ("meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "tour_campaigns_locales" ADD CONSTRAINT "tour_campaigns_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."tour_campaigns"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tour_campaigns_rels" ADD CONSTRAINT "tour_campaigns_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."tour_campaigns"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tour_campaigns_rels" ADD CONSTRAINT "tour_campaigns_rels_tour_products_fk" FOREIGN KEY ("tour_products_id") REFERENCES "public"."tour_products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "tour_campaigns_rels" ADD CONSTRAINT "tour_campaigns_rels_tour_departures_fk" FOREIGN KEY ("tour_departures_id") REFERENCES "public"."tour_departures"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_tour_campaigns_v" ADD CONSTRAINT "_tour_campaigns_v_parent_id_tour_campaigns_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."tour_campaigns"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_tour_campaigns_v" ADD CONSTRAINT "_tour_campaigns_v_version_site_id_sites_id_fk" FOREIGN KEY ("version_site_id") REFERENCES "public"."sites"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_tour_campaigns_v" ADD CONSTRAINT "_tour_campaigns_v_version_wrapper_page_id_pages_id_fk" FOREIGN KEY ("version_wrapper_page_id") REFERENCES "public"."pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_tour_campaigns_v" ADD CONSTRAINT "_tour_campaigns_v_version_hero_media_id_media_id_fk" FOREIGN KEY ("version_hero_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_tour_campaigns_v_locales" ADD CONSTRAINT "_tour_campaigns_v_locales_version_meta_image_id_media_id_fk" FOREIGN KEY ("version_meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_tour_campaigns_v_locales" ADD CONSTRAINT "_tour_campaigns_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_tour_campaigns_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_tour_campaigns_v_rels" ADD CONSTRAINT "_tour_campaigns_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_tour_campaigns_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_tour_campaigns_v_rels" ADD CONSTRAINT "_tour_campaigns_v_rels_tour_products_fk" FOREIGN KEY ("tour_products_id") REFERENCES "public"."tour_products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_tour_campaigns_v_rels" ADD CONSTRAINT "_tour_campaigns_v_rels_tour_departures_fk" FOREIGN KEY ("tour_departures_id") REFERENCES "public"."tour_departures"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_tour_products_fk" FOREIGN KEY ("tour_products_id") REFERENCES "public"."tour_products"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_departure_variants_fk" FOREIGN KEY ("departure_variants_id") REFERENCES "public"."departure_variants"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_tour_departures_fk" FOREIGN KEY ("tour_departures_id") REFERENCES "public"."tour_departures"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_tour_campaigns_fk" FOREIGN KEY ("tour_campaigns_id") REFERENCES "public"."tour_campaigns"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "tour_products_highlights_order_idx" ON "tour_products_highlights" USING btree ("_order");
  CREATE INDEX "tour_products_highlights_parent_id_idx" ON "tour_products_highlights" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "tour_products_highlights_locales_locale_parent_id_unique" ON "tour_products_highlights_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "tour_products_review_snapshot_proof_quotes_order_idx" ON "tour_products_review_snapshot_proof_quotes" USING btree ("_order");
  CREATE INDEX "tour_products_review_snapshot_proof_quotes_parent_id_idx" ON "tour_products_review_snapshot_proof_quotes" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "tour_products_review_snapshot_proof_quotes_locales_locale_pa" ON "tour_products_review_snapshot_proof_quotes_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "tour_products_route_viz_stops_order_idx" ON "tour_products_route_viz_stops" USING btree ("_order");
  CREATE INDEX "tour_products_route_viz_stops_parent_id_idx" ON "tour_products_route_viz_stops" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "tour_products_route_viz_stops_locales_locale_parent_id_uniqu" ON "tour_products_route_viz_stops_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "tour_products_route_viz_travel_legs_order_idx" ON "tour_products_route_viz_travel_legs" USING btree ("_order");
  CREATE INDEX "tour_products_route_viz_travel_legs_parent_id_idx" ON "tour_products_route_viz_travel_legs" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "tour_products_route_viz_travel_legs_locales_locale_parent_id" ON "tour_products_route_viz_travel_legs_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "tour_products_badges_order_idx" ON "tour_products_badges" USING btree ("_order");
  CREATE INDEX "tour_products_badges_parent_id_idx" ON "tour_products_badges" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "tour_products_badges_locales_locale_parent_id_unique" ON "tour_products_badges_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "tour_products_market_card_badges_order_idx" ON "tour_products_market_card_badges" USING btree ("_order");
  CREATE INDEX "tour_products_market_card_badges_parent_id_idx" ON "tour_products_market_card_badges" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "tour_products_market_card_badges_locales_locale_parent_id_un" ON "tour_products_market_card_badges_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "tour_products_itinerary_days_order_idx" ON "tour_products_itinerary_days" USING btree ("_order");
  CREATE INDEX "tour_products_itinerary_days_parent_id_idx" ON "tour_products_itinerary_days" USING btree ("_parent_id");
  CREATE INDEX "tour_products_itinerary_days_media_idx" ON "tour_products_itinerary_days" USING btree ("media_id");
  CREATE UNIQUE INDEX "tour_products_itinerary_days_locales_locale_parent_id_unique" ON "tour_products_itinerary_days_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "tour_products_includes_order_idx" ON "tour_products_includes" USING btree ("_order");
  CREATE INDEX "tour_products_includes_parent_id_idx" ON "tour_products_includes" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "tour_products_includes_locales_locale_parent_id_unique" ON "tour_products_includes_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "tour_products_excludes_order_idx" ON "tour_products_excludes" USING btree ("_order");
  CREATE INDEX "tour_products_excludes_parent_id_idx" ON "tour_products_excludes" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "tour_products_excludes_locales_locale_parent_id_unique" ON "tour_products_excludes_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "tour_products_services_summary_notes_order_idx" ON "tour_products_services_summary_notes" USING btree ("_order");
  CREATE INDEX "tour_products_services_summary_notes_parent_id_idx" ON "tour_products_services_summary_notes" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "tour_products_services_summary_notes_locales_locale_parent_i" ON "tour_products_services_summary_notes_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "tour_products_faq_items_order_idx" ON "tour_products_faq_items" USING btree ("_order");
  CREATE INDEX "tour_products_faq_items_parent_id_idx" ON "tour_products_faq_items" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "tour_products_faq_items_locales_locale_parent_id_unique" ON "tour_products_faq_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "tour_products_section_visibility_order_idx" ON "tour_products_section_visibility" USING btree ("order");
  CREATE INDEX "tour_products_section_visibility_parent_idx" ON "tour_products_section_visibility" USING btree ("parent_id");
  CREATE INDEX "tour_products_section_order_order_idx" ON "tour_products_section_order" USING btree ("order");
  CREATE INDEX "tour_products_section_order_parent_idx" ON "tour_products_section_order" USING btree ("parent_id");
  CREATE INDEX "tour_products_site_idx" ON "tour_products" USING btree ("site_id");
  CREATE INDEX "tour_products_wrapper_page_idx" ON "tour_products" USING btree ("wrapper_page_id");
  CREATE INDEX "tour_products_hero_media_idx" ON "tour_products" USING btree ("hero_media_id");
  CREATE INDEX "tour_products_route_viz_route_viz_map_image_idx" ON "tour_products" USING btree ("route_viz_map_image_id");
  CREATE INDEX "tour_products_market_card_market_card_thumbnail_override_idx" ON "tour_products" USING btree ("market_card_thumbnail_override_id");
  CREATE UNIQUE INDEX "tour_products_slug_idx" ON "tour_products" USING btree ("slug");
  CREATE INDEX "tour_products_updated_at_idx" ON "tour_products" USING btree ("updated_at");
  CREATE INDEX "tour_products_created_at_idx" ON "tour_products" USING btree ("created_at");
  CREATE INDEX "tour_products__status_idx" ON "tour_products" USING btree ("_status");
  CREATE INDEX "tour_products_meta_meta_image_idx" ON "tour_products_locales" USING btree ("meta_image_id");
  CREATE UNIQUE INDEX "tour_products_locales_locale_parent_id_unique" ON "tour_products_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "tour_products_rels_order_idx" ON "tour_products_rels" USING btree ("order");
  CREATE INDEX "tour_products_rels_parent_idx" ON "tour_products_rels" USING btree ("parent_id");
  CREATE INDEX "tour_products_rels_path_idx" ON "tour_products_rels" USING btree ("path");
  CREATE INDEX "tour_products_rels_media_id_idx" ON "tour_products_rels" USING btree ("media_id");
  CREATE INDEX "tour_products_rels_tour_products_id_idx" ON "tour_products_rels" USING btree ("tour_products_id");
  CREATE INDEX "_tour_products_v_version_highlights_order_idx" ON "_tour_products_v_version_highlights" USING btree ("_order");
  CREATE INDEX "_tour_products_v_version_highlights_parent_id_idx" ON "_tour_products_v_version_highlights" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_tour_products_v_version_highlights_locales_locale_parent_id" ON "_tour_products_v_version_highlights_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_tour_products_v_version_review_snapshot_proof_quotes_order_idx" ON "_tour_products_v_version_review_snapshot_proof_quotes" USING btree ("_order");
  CREATE INDEX "_tour_products_v_version_review_snapshot_proof_quotes_parent_id_idx" ON "_tour_products_v_version_review_snapshot_proof_quotes" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_tour_products_v_version_review_snapshot_proof_quotes_locale" ON "_tour_products_v_version_review_snapshot_proof_quotes_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_tour_products_v_version_route_viz_stops_order_idx" ON "_tour_products_v_version_route_viz_stops" USING btree ("_order");
  CREATE INDEX "_tour_products_v_version_route_viz_stops_parent_id_idx" ON "_tour_products_v_version_route_viz_stops" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_tour_products_v_version_route_viz_stops_locales_locale_pare" ON "_tour_products_v_version_route_viz_stops_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_tour_products_v_version_route_viz_travel_legs_order_idx" ON "_tour_products_v_version_route_viz_travel_legs" USING btree ("_order");
  CREATE INDEX "_tour_products_v_version_route_viz_travel_legs_parent_id_idx" ON "_tour_products_v_version_route_viz_travel_legs" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_tour_products_v_version_route_viz_travel_legs_locales_local" ON "_tour_products_v_version_route_viz_travel_legs_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_tour_products_v_version_badges_order_idx" ON "_tour_products_v_version_badges" USING btree ("_order");
  CREATE INDEX "_tour_products_v_version_badges_parent_id_idx" ON "_tour_products_v_version_badges" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_tour_products_v_version_badges_locales_locale_parent_id_uni" ON "_tour_products_v_version_badges_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_tour_products_v_version_market_card_badges_order_idx" ON "_tour_products_v_version_market_card_badges" USING btree ("_order");
  CREATE INDEX "_tour_products_v_version_market_card_badges_parent_id_idx" ON "_tour_products_v_version_market_card_badges" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_tour_products_v_version_market_card_badges_locales_locale_p" ON "_tour_products_v_version_market_card_badges_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_tour_products_v_version_itinerary_days_order_idx" ON "_tour_products_v_version_itinerary_days" USING btree ("_order");
  CREATE INDEX "_tour_products_v_version_itinerary_days_parent_id_idx" ON "_tour_products_v_version_itinerary_days" USING btree ("_parent_id");
  CREATE INDEX "_tour_products_v_version_itinerary_days_media_idx" ON "_tour_products_v_version_itinerary_days" USING btree ("media_id");
  CREATE UNIQUE INDEX "_tour_products_v_version_itinerary_days_locales_locale_paren" ON "_tour_products_v_version_itinerary_days_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_tour_products_v_version_includes_order_idx" ON "_tour_products_v_version_includes" USING btree ("_order");
  CREATE INDEX "_tour_products_v_version_includes_parent_id_idx" ON "_tour_products_v_version_includes" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_tour_products_v_version_includes_locales_locale_parent_id_u" ON "_tour_products_v_version_includes_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_tour_products_v_version_excludes_order_idx" ON "_tour_products_v_version_excludes" USING btree ("_order");
  CREATE INDEX "_tour_products_v_version_excludes_parent_id_idx" ON "_tour_products_v_version_excludes" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_tour_products_v_version_excludes_locales_locale_parent_id_u" ON "_tour_products_v_version_excludes_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_tour_products_v_version_services_summary_notes_order_idx" ON "_tour_products_v_version_services_summary_notes" USING btree ("_order");
  CREATE INDEX "_tour_products_v_version_services_summary_notes_parent_id_idx" ON "_tour_products_v_version_services_summary_notes" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_tour_products_v_version_services_summary_notes_locales_loca" ON "_tour_products_v_version_services_summary_notes_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_tour_products_v_version_faq_items_order_idx" ON "_tour_products_v_version_faq_items" USING btree ("_order");
  CREATE INDEX "_tour_products_v_version_faq_items_parent_id_idx" ON "_tour_products_v_version_faq_items" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "_tour_products_v_version_faq_items_locales_locale_parent_id_" ON "_tour_products_v_version_faq_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_tour_products_v_version_section_visibility_order_idx" ON "_tour_products_v_version_section_visibility" USING btree ("order");
  CREATE INDEX "_tour_products_v_version_section_visibility_parent_idx" ON "_tour_products_v_version_section_visibility" USING btree ("parent_id");
  CREATE INDEX "_tour_products_v_version_section_order_order_idx" ON "_tour_products_v_version_section_order" USING btree ("order");
  CREATE INDEX "_tour_products_v_version_section_order_parent_idx" ON "_tour_products_v_version_section_order" USING btree ("parent_id");
  CREATE INDEX "_tour_products_v_parent_idx" ON "_tour_products_v" USING btree ("parent_id");
  CREATE INDEX "_tour_products_v_version_version_site_idx" ON "_tour_products_v" USING btree ("version_site_id");
  CREATE INDEX "_tour_products_v_version_version_wrapper_page_idx" ON "_tour_products_v" USING btree ("version_wrapper_page_id");
  CREATE INDEX "_tour_products_v_version_version_hero_media_idx" ON "_tour_products_v" USING btree ("version_hero_media_id");
  CREATE INDEX "_tour_products_v_version_route_viz_version_route_viz_map_idx" ON "_tour_products_v" USING btree ("version_route_viz_map_image_id");
  CREATE INDEX "_tour_products_v_version_market_card_version_market_card_idx" ON "_tour_products_v" USING btree ("version_market_card_thumbnail_override_id");
  CREATE INDEX "_tour_products_v_version_version_slug_idx" ON "_tour_products_v" USING btree ("version_slug");
  CREATE INDEX "_tour_products_v_version_version_updated_at_idx" ON "_tour_products_v" USING btree ("version_updated_at");
  CREATE INDEX "_tour_products_v_version_version_created_at_idx" ON "_tour_products_v" USING btree ("version_created_at");
  CREATE INDEX "_tour_products_v_version_version__status_idx" ON "_tour_products_v" USING btree ("version__status");
  CREATE INDEX "_tour_products_v_created_at_idx" ON "_tour_products_v" USING btree ("created_at");
  CREATE INDEX "_tour_products_v_updated_at_idx" ON "_tour_products_v" USING btree ("updated_at");
  CREATE INDEX "_tour_products_v_snapshot_idx" ON "_tour_products_v" USING btree ("snapshot");
  CREATE INDEX "_tour_products_v_published_locale_idx" ON "_tour_products_v" USING btree ("published_locale");
  CREATE INDEX "_tour_products_v_latest_idx" ON "_tour_products_v" USING btree ("latest");
  CREATE INDEX "_tour_products_v_autosave_idx" ON "_tour_products_v" USING btree ("autosave");
  CREATE INDEX "_tour_products_v_version_meta_version_meta_image_idx" ON "_tour_products_v_locales" USING btree ("version_meta_image_id");
  CREATE UNIQUE INDEX "_tour_products_v_locales_locale_parent_id_unique" ON "_tour_products_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_tour_products_v_rels_order_idx" ON "_tour_products_v_rels" USING btree ("order");
  CREATE INDEX "_tour_products_v_rels_parent_idx" ON "_tour_products_v_rels" USING btree ("parent_id");
  CREATE INDEX "_tour_products_v_rels_path_idx" ON "_tour_products_v_rels" USING btree ("path");
  CREATE INDEX "_tour_products_v_rels_media_id_idx" ON "_tour_products_v_rels" USING btree ("media_id");
  CREATE INDEX "_tour_products_v_rels_tour_products_id_idx" ON "_tour_products_v_rels" USING btree ("tour_products_id");
  CREATE INDEX "departure_variants_rvo_st_order_idx" ON "departure_variants_rvo_st" USING btree ("_order");
  CREATE INDEX "departure_variants_rvo_st_parent_id_idx" ON "departure_variants_rvo_st" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "departure_variants_rvo_st_locales_locale_parent_id_unique" ON "departure_variants_rvo_st_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "departure_variants_itinerary_day_overrides_order_idx" ON "departure_variants_itinerary_day_overrides" USING btree ("_order");
  CREATE INDEX "departure_variants_itinerary_day_overrides_parent_id_idx" ON "departure_variants_itinerary_day_overrides" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "departure_variants_itinerary_day_overrides_locales_locale_pa" ON "departure_variants_itinerary_day_overrides_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "departure_variants_site_idx" ON "departure_variants" USING btree ("site_id");
  CREATE INDEX "departure_variants_tour_product_idx" ON "departure_variants" USING btree ("tour_product_id");
  CREATE INDEX "departure_variants_hero_media_override_idx" ON "departure_variants" USING btree ("hero_media_override_id");
  CREATE INDEX "departure_variants_rvo_rvo_map_image_idx" ON "departure_variants" USING btree ("rvo_map_image_id");
  CREATE INDEX "departure_variants_updated_at_idx" ON "departure_variants" USING btree ("updated_at");
  CREATE INDEX "departure_variants_created_at_idx" ON "departure_variants" USING btree ("created_at");
  CREATE UNIQUE INDEX "departure_variants_locales_locale_parent_id_unique" ON "departure_variants_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "departure_variants_rels_order_idx" ON "departure_variants_rels" USING btree ("order");
  CREATE INDEX "departure_variants_rels_parent_idx" ON "departure_variants_rels" USING btree ("parent_id");
  CREATE INDEX "departure_variants_rels_path_idx" ON "departure_variants_rels" USING btree ("path");
  CREATE INDEX "departure_variants_rels_media_id_idx" ON "departure_variants_rels" USING btree ("media_id");
  CREATE INDEX "departure_variants_rels_tour_departures_id_idx" ON "departure_variants_rels" USING btree ("tour_departures_id");
  CREATE INDEX "tour_departures_site_idx" ON "tour_departures" USING btree ("site_id");
  CREATE INDEX "tour_departures_tour_product_idx" ON "tour_departures" USING btree ("tour_product_id");
  CREATE INDEX "tour_departures_variant_ref_idx" ON "tour_departures" USING btree ("variant_ref_id");
  CREATE INDEX "tour_departures_updated_at_idx" ON "tour_departures" USING btree ("updated_at");
  CREATE INDEX "tour_departures_created_at_idx" ON "tour_departures" USING btree ("created_at");
  CREATE INDEX "tour_departures__status_idx" ON "tour_departures" USING btree ("_status");
  CREATE UNIQUE INDEX "tour_departures_locales_locale_parent_id_unique" ON "tour_departures_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_tour_departures_v_parent_idx" ON "_tour_departures_v" USING btree ("parent_id");
  CREATE INDEX "_tour_departures_v_version_version_site_idx" ON "_tour_departures_v" USING btree ("version_site_id");
  CREATE INDEX "_tour_departures_v_version_version_tour_product_idx" ON "_tour_departures_v" USING btree ("version_tour_product_id");
  CREATE INDEX "_tour_departures_v_version_version_variant_ref_idx" ON "_tour_departures_v" USING btree ("version_variant_ref_id");
  CREATE INDEX "_tour_departures_v_version_version_updated_at_idx" ON "_tour_departures_v" USING btree ("version_updated_at");
  CREATE INDEX "_tour_departures_v_version_version_created_at_idx" ON "_tour_departures_v" USING btree ("version_created_at");
  CREATE INDEX "_tour_departures_v_version_version__status_idx" ON "_tour_departures_v" USING btree ("version__status");
  CREATE INDEX "_tour_departures_v_created_at_idx" ON "_tour_departures_v" USING btree ("created_at");
  CREATE INDEX "_tour_departures_v_updated_at_idx" ON "_tour_departures_v" USING btree ("updated_at");
  CREATE INDEX "_tour_departures_v_snapshot_idx" ON "_tour_departures_v" USING btree ("snapshot");
  CREATE INDEX "_tour_departures_v_published_locale_idx" ON "_tour_departures_v" USING btree ("published_locale");
  CREATE INDEX "_tour_departures_v_latest_idx" ON "_tour_departures_v" USING btree ("latest");
  CREATE INDEX "_tour_departures_v_autosave_idx" ON "_tour_departures_v" USING btree ("autosave");
  CREATE UNIQUE INDEX "_tour_departures_v_locales_locale_parent_id_unique" ON "_tour_departures_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "tour_campaigns_site_idx" ON "tour_campaigns" USING btree ("site_id");
  CREATE INDEX "tour_campaigns_wrapper_page_idx" ON "tour_campaigns" USING btree ("wrapper_page_id");
  CREATE INDEX "tour_campaigns_hero_media_idx" ON "tour_campaigns" USING btree ("hero_media_id");
  CREATE UNIQUE INDEX "tour_campaigns_slug_idx" ON "tour_campaigns" USING btree ("slug");
  CREATE INDEX "tour_campaigns_updated_at_idx" ON "tour_campaigns" USING btree ("updated_at");
  CREATE INDEX "tour_campaigns_created_at_idx" ON "tour_campaigns" USING btree ("created_at");
  CREATE INDEX "tour_campaigns__status_idx" ON "tour_campaigns" USING btree ("_status");
  CREATE INDEX "tour_campaigns_meta_meta_image_idx" ON "tour_campaigns_locales" USING btree ("meta_image_id");
  CREATE UNIQUE INDEX "tour_campaigns_locales_locale_parent_id_unique" ON "tour_campaigns_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "tour_campaigns_rels_order_idx" ON "tour_campaigns_rels" USING btree ("order");
  CREATE INDEX "tour_campaigns_rels_parent_idx" ON "tour_campaigns_rels" USING btree ("parent_id");
  CREATE INDEX "tour_campaigns_rels_path_idx" ON "tour_campaigns_rels" USING btree ("path");
  CREATE INDEX "tour_campaigns_rels_tour_products_id_idx" ON "tour_campaigns_rels" USING btree ("tour_products_id");
  CREATE INDEX "tour_campaigns_rels_tour_departures_id_idx" ON "tour_campaigns_rels" USING btree ("tour_departures_id");
  CREATE INDEX "_tour_campaigns_v_parent_idx" ON "_tour_campaigns_v" USING btree ("parent_id");
  CREATE INDEX "_tour_campaigns_v_version_version_site_idx" ON "_tour_campaigns_v" USING btree ("version_site_id");
  CREATE INDEX "_tour_campaigns_v_version_version_wrapper_page_idx" ON "_tour_campaigns_v" USING btree ("version_wrapper_page_id");
  CREATE INDEX "_tour_campaigns_v_version_version_hero_media_idx" ON "_tour_campaigns_v" USING btree ("version_hero_media_id");
  CREATE INDEX "_tour_campaigns_v_version_version_slug_idx" ON "_tour_campaigns_v" USING btree ("version_slug");
  CREATE INDEX "_tour_campaigns_v_version_version_updated_at_idx" ON "_tour_campaigns_v" USING btree ("version_updated_at");
  CREATE INDEX "_tour_campaigns_v_version_version_created_at_idx" ON "_tour_campaigns_v" USING btree ("version_created_at");
  CREATE INDEX "_tour_campaigns_v_version_version__status_idx" ON "_tour_campaigns_v" USING btree ("version__status");
  CREATE INDEX "_tour_campaigns_v_created_at_idx" ON "_tour_campaigns_v" USING btree ("created_at");
  CREATE INDEX "_tour_campaigns_v_updated_at_idx" ON "_tour_campaigns_v" USING btree ("updated_at");
  CREATE INDEX "_tour_campaigns_v_snapshot_idx" ON "_tour_campaigns_v" USING btree ("snapshot");
  CREATE INDEX "_tour_campaigns_v_published_locale_idx" ON "_tour_campaigns_v" USING btree ("published_locale");
  CREATE INDEX "_tour_campaigns_v_latest_idx" ON "_tour_campaigns_v" USING btree ("latest");
  CREATE INDEX "_tour_campaigns_v_autosave_idx" ON "_tour_campaigns_v" USING btree ("autosave");
  CREATE INDEX "_tour_campaigns_v_version_meta_version_meta_image_idx" ON "_tour_campaigns_v_locales" USING btree ("version_meta_image_id");
  CREATE UNIQUE INDEX "_tour_campaigns_v_locales_locale_parent_id_unique" ON "_tour_campaigns_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_tour_campaigns_v_rels_order_idx" ON "_tour_campaigns_v_rels" USING btree ("order");
  CREATE INDEX "_tour_campaigns_v_rels_parent_idx" ON "_tour_campaigns_v_rels" USING btree ("parent_id");
  CREATE INDEX "_tour_campaigns_v_rels_path_idx" ON "_tour_campaigns_v_rels" USING btree ("path");
  CREATE INDEX "_tour_campaigns_v_rels_tour_products_id_idx" ON "_tour_campaigns_v_rels" USING btree ("tour_products_id");
  CREATE INDEX "_tour_campaigns_v_rels_tour_departures_id_idx" ON "_tour_campaigns_v_rels" USING btree ("tour_departures_id");
  CREATE INDEX "payload_locked_documents_rels_tour_products_id_idx" ON "payload_locked_documents_rels" USING btree ("tour_products_id");
  CREATE INDEX "payload_locked_documents_rels_departure_variants_id_idx" ON "payload_locked_documents_rels" USING btree ("departure_variants_id");
  CREATE INDEX "payload_locked_documents_rels_tour_departures_id_idx" ON "payload_locked_documents_rels" USING btree ("tour_departures_id");
  CREATE INDEX "payload_locked_documents_rels_tour_campaigns_id_idx" ON "payload_locked_documents_rels" USING btree ("tour_campaigns_id");
  `)
}

/**
 * Production rollback is a forward fix. Dropping these tables would destroy tour
 * content, so this migration deliberately has no destructive down operation.
 */
export async function down(): Promise<void> {}
