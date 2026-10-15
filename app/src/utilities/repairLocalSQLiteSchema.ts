import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { fileURLToPath } from 'node:url'

import {
  getWingsSideHiFiSQLiteCreateTableStatements,
  getWingsSideHiFiSQLiteIndexStatements,
  WINGSSIDE_HIFI_PAGES_COLUMNS,
  WINGSSIDE_HIFI_PAGES_LOCALE_COLUMNS,
} from '@/migrations/data/wingsSideHiFiSchema'

/**
 * Local SQLite bootstrap only (decision 0007).
 * Production/staging schema changes go through PostgreSQL migrations in
 * `src/migrations` and must pass `pnpm run db:migrate:smoke`.
 * This utility must never replace or register as a production migration.
 */

const localSQLiteRelationColumns = [
  'tour_products_id',
  'tour_departures_id',
  'tour_campaigns_id',
  'departure_variants_id',
  'tour_curations_id',
] as const

const tourCurationsSQLiteStatements = [
  `CREATE TABLE IF NOT EXISTS "tour_curations" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    "name" TEXT NOT NULL,
    "is_default" INTEGER DEFAULT 0,
    "description" TEXT,
    "site_id" INTEGER,
    "updated_at" TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
    "created_at" TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
    FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON UPDATE no action ON DELETE set null
  )`,
  `CREATE TABLE IF NOT EXISTS "tour_curations_rels" (
    "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    "order" INTEGER,
    "parent_id" INTEGER NOT NULL,
    "path" TEXT NOT NULL,
    "tour_products_id" INTEGER,
    FOREIGN KEY ("parent_id") REFERENCES "tour_curations"("id") ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY ("tour_products_id") REFERENCES "tour_products"("id") ON UPDATE no action ON DELETE set null
  )`,
  `CREATE INDEX IF NOT EXISTS "tour_curations_site_idx" ON "tour_curations" ("site_id")`,
  `CREATE INDEX IF NOT EXISTS "tour_curations_is_default_idx" ON "tour_curations" ("is_default")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "tour_curations_site_is_default_unique_idx" ON "tour_curations" ("site_id") WHERE ("is_default" = 1)`,
  `CREATE INDEX IF NOT EXISTS "tour_curations_rels_order_idx" ON "tour_curations_rels" ("order")`,
  `CREATE INDEX IF NOT EXISTS "tour_curations_rels_parent_idx" ON "tour_curations_rels" ("parent_id")`,
  `CREATE INDEX IF NOT EXISTS "tour_curations_rels_path_idx" ON "tour_curations_rels" ("path")`,
  `CREATE INDEX IF NOT EXISTS "tour_curations_rels_tour_products_id_idx" ON "tour_curations_rels" ("tour_products_id")`,
] as const

const wingsSideHomeCurationSQLiteStatements = [
  `CREATE TABLE IF NOT EXISTS "home_dest_tours" (
    "_order" INTEGER NOT NULL, "_parent_id" INTEGER NOT NULL, "id" TEXT PRIMARY KEY NOT NULL,
    "key" TEXT, "tour_id" INTEGER,
    FOREIGN KEY ("_parent_id") REFERENCES "pages"("id") ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY ("tour_id") REFERENCES "tour_products"("id") ON UPDATE no action ON DELETE set null
  )`,
  `CREATE TABLE IF NOT EXISTS "home_style_tours" (
    "_order" INTEGER NOT NULL, "_parent_id" INTEGER NOT NULL, "id" TEXT PRIMARY KEY NOT NULL,
    "key" TEXT, "tour_id" INTEGER,
    FOREIGN KEY ("_parent_id") REFERENCES "pages"("id") ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY ("tour_id") REFERENCES "tour_products"("id") ON UPDATE no action ON DELETE set null
  )`,
  `CREATE TABLE IF NOT EXISTS "home_featured_tours" (
    "_order" INTEGER NOT NULL, "_parent_id" INTEGER NOT NULL, "id" TEXT PRIMARY KEY NOT NULL,
    "tour_id" INTEGER,
    FOREIGN KEY ("_parent_id") REFERENCES "pages"("id") ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY ("tour_id") REFERENCES "tour_products"("id") ON UPDATE no action ON DELETE set null
  )`,
  `CREATE TABLE IF NOT EXISTS "home_why_tour_slots" (
    "_order" INTEGER NOT NULL, "_parent_id" INTEGER NOT NULL, "id" TEXT PRIMARY KEY NOT NULL,
    "key" TEXT, "selection_mode" TEXT, "tour_id" INTEGER,
    "rule_destination_tag" TEXT, "rule_travel_style" TEXT,
    "rule_min_duration_days" NUMERIC, "rule_max_duration_days" NUMERIC,
    "fallback_tour_id" INTEGER, "presentation_mode" TEXT, "presentation_media_id" INTEGER,
    FOREIGN KEY ("_parent_id") REFERENCES "pages"("id") ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY ("tour_id") REFERENCES "tour_products"("id") ON UPDATE no action ON DELETE set null,
    FOREIGN KEY ("fallback_tour_id") REFERENCES "tour_products"("id") ON UPDATE no action ON DELETE set null,
    FOREIGN KEY ("presentation_media_id") REFERENCES "media"("id") ON UPDATE no action ON DELETE set null
  )`,
  `CREATE TABLE IF NOT EXISTS "home_why_tour_slots_locales" (
    "presentation_badge" TEXT, "presentation_body" TEXT, "presentation_cta_label" TEXT,
    "id" INTEGER PRIMARY KEY NOT NULL, "_locale" TEXT NOT NULL, "_parent_id" TEXT NOT NULL,
    FOREIGN KEY ("_parent_id") REFERENCES "home_why_tour_slots"("id") ON UPDATE no action ON DELETE cascade
  )`,
  `CREATE TABLE IF NOT EXISTS "_home_dest_tours_v" (
    "_order" INTEGER NOT NULL, "_parent_id" INTEGER NOT NULL, "id" INTEGER PRIMARY KEY NOT NULL,
    "_uuid" TEXT, "key" TEXT, "tour_id" INTEGER,
    FOREIGN KEY ("_parent_id") REFERENCES "_pages_v"("id") ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY ("tour_id") REFERENCES "tour_products"("id") ON UPDATE no action ON DELETE set null
  )`,
  `CREATE TABLE IF NOT EXISTS "_home_style_tours_v" (
    "_order" INTEGER NOT NULL, "_parent_id" INTEGER NOT NULL, "id" INTEGER PRIMARY KEY NOT NULL,
    "_uuid" TEXT, "key" TEXT, "tour_id" INTEGER,
    FOREIGN KEY ("_parent_id") REFERENCES "_pages_v"("id") ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY ("tour_id") REFERENCES "tour_products"("id") ON UPDATE no action ON DELETE set null
  )`,
  `CREATE TABLE IF NOT EXISTS "_home_featured_tours_v" (
    "_order" INTEGER NOT NULL, "_parent_id" INTEGER NOT NULL, "id" INTEGER PRIMARY KEY NOT NULL,
    "_uuid" TEXT, "tour_id" INTEGER,
    FOREIGN KEY ("_parent_id") REFERENCES "_pages_v"("id") ON UPDATE no action ON DELETE cascade,
    FOREIGN KEY ("tour_id") REFERENCES "tour_products"("id") ON UPDATE no action ON DELETE set null
  )`,
  `CREATE TABLE IF NOT EXISTS "_home_why_tour_slots_v" (
    "_order" INTEGER NOT NULL, "_parent_id" INTEGER NOT NULL, "id" INTEGER PRIMARY KEY NOT NULL,
    "_uuid" TEXT, "key" TEXT, "selection_mode" TEXT, "tour_id" INTEGER,
    "rule_destination_tag" TEXT, "rule_travel_style" TEXT,
    "rule_min_duration_days" NUMERIC, "rule_max_duration_days" NUMERIC,
    "fallback_tour_id" INTEGER, "presentation_mode" TEXT, "presentation_media_id" INTEGER,
    FOREIGN KEY ("_parent_id") REFERENCES "_pages_v"("id") ON UPDATE no action ON DELETE cascade
  )`,
  `CREATE TABLE IF NOT EXISTS "_home_why_tour_slots_v_locales" (
    "presentation_badge" TEXT, "presentation_body" TEXT, "presentation_cta_label" TEXT,
    "id" INTEGER PRIMARY KEY NOT NULL, "_locale" TEXT NOT NULL, "_parent_id" INTEGER NOT NULL,
    FOREIGN KEY ("_parent_id") REFERENCES "_home_why_tour_slots_v"("id") ON UPDATE no action ON DELETE cascade
  )`,
  ...[
    'home_dest_tours',
    'home_style_tours',
    'home_featured_tours',
    'home_why_tour_slots',
    '_home_dest_tours_v',
    '_home_style_tours_v',
    '_home_featured_tours_v',
    '_home_why_tour_slots_v',
  ].flatMap((table) => [
    `CREATE INDEX IF NOT EXISTS "${table}_order_idx" ON "${table}" ("_order")`,
    `CREATE INDEX IF NOT EXISTS "${table}_parent_id_idx" ON "${table}" ("_parent_id")`,
    `CREATE INDEX IF NOT EXISTS "${table}_tour_idx" ON "${table}" ("tour_id")`,
  ]),
] as const

const localSQLiteTableRenames = [
  {
    from: 'tour_products_services_summary_important_notes',
    to: 'tour_products_services_summary_notes',
  },
  {
    from: 'tour_products_services_summary_important_notes_locales',
    to: 'tour_products_services_summary_notes_locales',
  },
  {
    from: '_tour_products_v_version_services_summary_important_notes',
    to: '_tour_products_v_version_services_summary_notes',
  },
  {
    from: '_tour_products_v_version_services_summary_important_notes_locales',
    to: '_tour_products_v_version_services_summary_notes_locales',
  },
] as const

const wingsGroupRouteColumns = [
  ['wings_group_route_managed_by', 'TEXT'],
  ['wings_group_route_archetype', 'TEXT'],
  ['wings_group_route_publication_vi', "TEXT DEFAULT 'hidden'"],
  ['wings_group_route_publication_en', "TEXT DEFAULT 'hidden'"],
  ['wings_group_route_content_approval_vi', 'TEXT'],
  ['wings_group_route_content_approval_en', 'TEXT'],
  ['wings_group_route_policy_legal_owner', 'TEXT'],
  ['wings_group_route_policy_legal_entity', 'TEXT'],
  ['wings_group_route_policy_scope', 'TEXT'],
  ['wings_group_route_policy_effective_date', 'TEXT'],
  ['wings_group_route_policy_version', 'TEXT'],
  ['wings_group_route_policy_retention_months', 'NUMERIC'],
  ['wings_group_route_policy_data_subject_contact', 'TEXT'],
  ['wings_group_route_policy_data_subject_rights_statement', 'TEXT'],
  ['wings_group_route_policy_data_subject_rights_evidence', 'TEXT'],
  ['wings_group_route_policy_policy_version', 'TEXT'],
  ['wings_group_route_policy_consent_version', 'TEXT'],
  ['wings_group_route_policy_consent_evidence_reference', 'TEXT'],
  ['wings_group_route_policy_privacy_approval_reference', 'TEXT'],
  ['wings_group_route_policy_validation_marker', 'TEXT'],
  ['wings_group_route_policy_approval_state', "TEXT DEFAULT 'pending'"],
  ['wings_group_route_policy_approval_reference', 'TEXT'],
] as const

const wingsGroupV3MediaColumns: ReadonlyArray<readonly [string, string]> = [
  ['governance_managed_by', 'TEXT'],
  ['governance_source_identity', 'TEXT'],
  ['governance_source_attachment_id', 'TEXT'],
  ['governance_source_archive_sha256', 'TEXT'],
  ['governance_source_file_sha256', 'TEXT'],
  ['governance_source_filename', 'TEXT'],
  ['governance_provenance_reference', 'TEXT'],
  ['governance_rights_state', "TEXT DEFAULT 'pending'"],
  ['governance_rights_evidence', 'TEXT'],
  ['governance_usage_scope', 'TEXT'],
  ['governance_publication_state', "TEXT DEFAULT 'pending'"],
  ['governance_derivative_state', "TEXT DEFAULT 'pending'"],
  ...([640, 960, 1440] as const).flatMap((width) =>
    (['webp', 'avif'] as const).flatMap((format) => [
      [`sizes_wingsgroup_v3_${width}_${format}_url`, 'TEXT'] as const,
      [`sizes_wingsgroup_v3_${width}_${format}_width`, 'NUMERIC'] as const,
      [`sizes_wingsgroup_v3_${width}_${format}_height`, 'NUMERIC'] as const,
      [`sizes_wingsgroup_v3_${width}_${format}_mime_type`, 'TEXT'] as const,
      [`sizes_wingsgroup_v3_${width}_${format}_filesize`, 'NUMERIC'] as const,
      [`sizes_wingsgroup_v3_${width}_${format}_filename`, 'TEXT'] as const,
    ]),
  ),
]

const localSQLiteColumnRepairs = [
  {
    table: 'redirects',
    columns: [['type', "TEXT NOT NULL DEFAULT '307'"]],
  },
  {
    table: 'pages',
    columns: [
      ['wings_go_tour_catalog_enabled', 'INTEGER DEFAULT 0'],
      ['wings_go_tour_catalog_curation_id', 'INTEGER'],
    ],
  },
  {
    table: '_pages_v',
    columns: [
      ['version_wings_go_tour_catalog_enabled', 'INTEGER DEFAULT 0'],
      ['version_wings_go_tour_catalog_curation_id', 'INTEGER'],
    ],
  },
  {
    table: 'pages_rels',
    columns: [['tour_curations_id', 'INTEGER']],
  },
  {
    table: '_pages_v_rels',
    columns: [['tour_curations_id', 'INTEGER']],
  },
  {
    table: 'pages_blocks_testimonial_items',
    columns: [
      ['country', 'TEXT'],
      ['note_date', 'TEXT'],
    ],
  },
  {
    table: '_pages_v_blocks_testimonial_items',
    columns: [
      ['country', 'TEXT'],
      ['note_date', 'TEXT'],
    ],
  },
  {
    table: 'form_submissions',
    columns: [
      ['enquiry_context_source', 'TEXT'],
      ['enquiry_context_tour_id', 'TEXT'],
      ['enquiry_context_tour_slug', 'TEXT'],
      ['enquiry_context_departure_id', 'TEXT'],
      ['enquiry_context_departure_date', 'TEXT'],
      ['enquiry_context_intent', 'TEXT'],
      ['enquiry_context_discovery_destination', 'TEXT'],
      ['enquiry_context_discovery_duration', 'TEXT'],
      ['enquiry_context_discovery_q', 'TEXT'],
      ['enquiry_context_discovery_style', 'TEXT'],
      ['enquiry_context_discovery_type', 'TEXT'],
      ['delivery_status', "TEXT NOT NULL DEFAULT 'pending'"],
      ['delivery_updated_at', 'TEXT'],
      ['delivery_error_code', 'TEXT'],
      ['wings_group_lead_locale', 'TEXT'],
      ['wings_group_lead_source_path', 'TEXT'],
      ['wings_group_lead_consent_version', 'TEXT'],
      ['wings_group_lead_consented_at', 'TEXT'],
      ['wings_group_lead_retention_until', 'TEXT'],
      ['wings_group_lead_preferred_channel', 'TEXT'],
      ['sales_status', "TEXT DEFAULT 'new'"],
      ['assigned_to_id', 'INTEGER'],
      ['sales_note', 'TEXT'],
      ['sales_status_from', 'TEXT'],
      ['sales_status_to', 'TEXT'],
      ['sales_updated_at', 'TEXT'],
      ['sales_updated_by_id', 'INTEGER'],
      ['sales_triage_version', 'NUMERIC DEFAULT 0'],
    ],
  },
  {
    table: 'pages',
    columns: wingsGroupRouteColumns,
  },
  {
    table: '_pages_v',
    columns: wingsGroupRouteColumns.map(([name, type]) => [`version_${name}`, type] as const),
  },
  {
    table: 'media',
    columns: wingsGroupV3MediaColumns,
  },
  {
    table: 'tour_products',
    columns: [
      ['source_provenance', 'TEXT'],
      ['price_from', 'NUMERIC'],
      ['currency', "TEXT DEFAULT 'USD'"],
      ['taxonomy_provenance', 'TEXT'],
      ['tour_type', 'TEXT'],
      ['itinerary_pdf_id', 'INTEGER'],
    ],
  },
  {
    table: '_tour_products_v',
    columns: [
      ['version_source_provenance', 'TEXT'],
      ['version_price_from', 'NUMERIC'],
      ['version_currency', "TEXT DEFAULT 'USD'"],
      ['version_taxonomy_provenance', 'TEXT'],
      ['version_tour_type', 'TEXT'],
      ['version_itinerary_pdf_id', 'INTEGER'],
    ],
  },
  {
    table: 'tour_products_itinerary_days_locales',
    columns: [['content', 'TEXT']],
  },
  {
    table: '_tour_products_v_version_itinerary_days_locales',
    columns: [['content', 'TEXT']],
  },
  {
    table: 'tour_departures',
    columns: [
      ['price_basis', 'TEXT'],
      ['verified_at', 'TEXT'],
      ['expires_at', 'TEXT'],
      ['inventory_identity', 'TEXT'],
      ['flight_number', 'TEXT'],
      ['original_price', 'NUMERIC'],
      ['loyalty_points', 'NUMERIC'],
      ['source_provenance_source_system', 'TEXT'],
      ['source_provenance_source_url', 'TEXT'],
      ['source_provenance_source_page_sha256', 'TEXT'],
      ['source_provenance_source_row_sha256', 'TEXT'],
      ['source_provenance_checked_at', 'TEXT'],
      ['source_provenance_managed_by', 'TEXT'],
    ],
  },
  {
    table: '_tour_departures_v',
    columns: [
      ['version_price_basis', 'TEXT'],
      ['version_verified_at', 'TEXT'],
      ['version_expires_at', 'TEXT'],
      ['version_inventory_identity', 'TEXT'],
      ['version_flight_number', 'TEXT'],
      ['version_original_price', 'NUMERIC'],
      ['version_loyalty_points', 'NUMERIC'],
      ['version_source_provenance_source_system', 'TEXT'],
      ['version_source_provenance_source_url', 'TEXT'],
      ['version_source_provenance_source_page_sha256', 'TEXT'],
      ['version_source_provenance_source_row_sha256', 'TEXT'],
      ['version_source_provenance_checked_at', 'TEXT'],
      ['version_source_provenance_managed_by', 'TEXT'],
    ],
  },
  {
    table: 'pages_blocks_credentials_carousel_items',
    columns: [
      ['review_status', "TEXT DEFAULT 'verified'"],
      ['issuer', 'TEXT'],
      ['recipient', 'TEXT'],
      ['recognition_year', 'NUMERIC'],
      ['issued_on', 'TEXT'],
      ['reference_code', 'TEXT'],
      ['source_filename', 'TEXT'],
    ],
  },
  {
    table: '_pages_v_blocks_credentials_carousel_items',
    columns: [
      ['review_status', "TEXT DEFAULT 'verified'"],
      ['issuer', 'TEXT'],
      ['recipient', 'TEXT'],
      ['recognition_year', 'NUMERIC'],
      ['issued_on', 'TEXT'],
      ['reference_code', 'TEXT'],
      ['source_filename', 'TEXT'],
    ],
  },
  {
    table: 'site_settings',
    columns: [
      ['sales_email', 'TEXT'],
      ['registered_office_address', 'TEXT'],
      ['travel_office_address', 'TEXT'],
      ['wings_group_v3_enabled', 'INTEGER DEFAULT 0'],
      ['wings_group_v3_english_publication_state', "TEXT DEFAULT 'hidden'"],
      ['wings_group_v3_privacy_policy_version', 'TEXT'],
      ['wings_group_v3_privacy_consent_version', 'TEXT'],
      ['wings_group_v3_privacy_consent_required', 'INTEGER'],
      ['wings_group_v3_privacy_retention_months', 'NUMERIC'],
      ['wings_group_v3_privacy_data_subject_contact', 'TEXT'],
      ['wings_group_v3_privacy_data_subject_rights_statement', 'TEXT'],
      ['wings_group_v3_privacy_data_subject_rights_evidence', 'TEXT'],
      ['wings_group_v3_privacy_consent_evidence_reference', 'TEXT'],
      ['wings_group_v3_privacy_approval_state', "TEXT DEFAULT 'pending'"],
      ['wings_group_v3_privacy_approval_reference', 'TEXT'],
      ['wings_group_v3_privacy_inter_branch_transfer_allowed', 'INTEGER'],
      ['wings_group_v3_privacy_policy_route_vi', 'TEXT'],
      ['wings_group_v3_privacy_policy_route_en', 'TEXT'],
      ['wings_group_v3_legal_identity_legal_entity_name', 'TEXT'],
      ['wings_group_v3_legal_identity_international_name', 'TEXT'],
      ['wings_group_v3_legal_identity_registered_office', 'TEXT'],
      ['wings_group_v3_legal_identity_travel_office', 'TEXT'],
      ['wings_group_v3_legal_identity_registration_number', 'TEXT'],
      ['wings_group_v3_legal_identity_licence_number', 'TEXT'],
      ['wings_group_v3_legal_identity_legal_representative', 'TEXT'],
      ['wings_group_v3_legal_identity_relationship_statement', 'TEXT'],
    ],
  },
] as const

const tourTaxonomySQLiteStatements = [
  `CREATE TABLE IF NOT EXISTS "tour_products_destination_tags" (
    "order" INTEGER NOT NULL, "parent_id" INTEGER NOT NULL, "value" TEXT,
    "id" INTEGER PRIMARY KEY NOT NULL,
    FOREIGN KEY ("parent_id") REFERENCES "tour_products"("id") ON UPDATE no action ON DELETE cascade
  )`,
  `CREATE TABLE IF NOT EXISTS "tour_products_travel_styles" (
    "order" INTEGER NOT NULL, "parent_id" INTEGER NOT NULL, "value" TEXT,
    "id" INTEGER PRIMARY KEY NOT NULL,
    FOREIGN KEY ("parent_id") REFERENCES "tour_products"("id") ON UPDATE no action ON DELETE cascade
  )`,
  `CREATE TABLE IF NOT EXISTS "_tour_products_v_version_destination_tags" (
    "order" INTEGER NOT NULL, "parent_id" INTEGER NOT NULL, "value" TEXT,
    "id" INTEGER PRIMARY KEY NOT NULL,
    FOREIGN KEY ("parent_id") REFERENCES "_tour_products_v"("id") ON UPDATE no action ON DELETE cascade
  )`,
  `CREATE TABLE IF NOT EXISTS "_tour_products_v_version_travel_styles" (
    "order" INTEGER NOT NULL, "parent_id" INTEGER NOT NULL, "value" TEXT,
    "id" INTEGER PRIMARY KEY NOT NULL,
    FOREIGN KEY ("parent_id") REFERENCES "_tour_products_v"("id") ON UPDATE no action ON DELETE cascade
  )`,
  ...[
    'tour_products_destination_tags_order_idx ON tour_products_destination_tags ("order")',
    'tour_products_destination_tags_parent_idx ON tour_products_destination_tags ("parent_id")',
    'tour_products_destination_tags_value_idx ON tour_products_destination_tags ("value")',
    'tour_products_travel_styles_order_idx ON tour_products_travel_styles ("order")',
    'tour_products_travel_styles_parent_idx ON tour_products_travel_styles ("parent_id")',
    'tour_products_travel_styles_value_idx ON tour_products_travel_styles ("value")',
    '_tour_products_v_version_destination_tags_order_idx ON _tour_products_v_version_destination_tags ("order")',
    '_tour_products_v_version_destination_tags_parent_idx ON _tour_products_v_version_destination_tags ("parent_id")',
    '_tour_products_v_version_destination_tags_value_idx ON _tour_products_v_version_destination_tags ("value")',
    '_tour_products_v_version_travel_styles_order_idx ON _tour_products_v_version_travel_styles ("order")',
    '_tour_products_v_version_travel_styles_parent_idx ON _tour_products_v_version_travel_styles ("parent_id")',
    '_tour_products_v_version_travel_styles_value_idx ON _tour_products_v_version_travel_styles ("value")',
  ].map((definition) => `CREATE INDEX IF NOT EXISTS ${definition}`),
] as const

const credentialsCarouselSQLiteStatements = [
  `CREATE TABLE IF NOT EXISTS "pages_blocks_credentials_carousel" (
    "_order" INTEGER NOT NULL, "_parent_id" INTEGER NOT NULL, "_path" TEXT NOT NULL,
    "_locale" TEXT NOT NULL, "id" TEXT PRIMARY KEY NOT NULL, "full_bleed" INTEGER DEFAULT 1,
    "eyebrow" TEXT, "title" TEXT, "description" TEXT, "aria_label" TEXT,
    "autoplay" INTEGER DEFAULT 1, "interval_ms" NUMERIC DEFAULT 5500, "block_name" TEXT,
    FOREIGN KEY ("_parent_id") REFERENCES "pages"("id") ON UPDATE no action ON DELETE cascade
  )`,
  `CREATE TABLE IF NOT EXISTS "pages_blocks_credentials_carousel_items" (
    "_order" INTEGER NOT NULL, "_parent_id" TEXT NOT NULL, "_locale" TEXT NOT NULL,
    "id" TEXT PRIMARY KEY NOT NULL, "review_status" TEXT DEFAULT 'verified',
    "kind" TEXT DEFAULT 'cert', "image_id" INTEGER, "issuer" TEXT, "recipient" TEXT,
    "recognition_year" NUMERIC, "issued_on" TEXT, "reference_code" TEXT,
    "source_filename" TEXT, "mark" TEXT, "label" TEXT, "title" TEXT, "description" TEXT,
    FOREIGN KEY ("image_id") REFERENCES "media"("id") ON UPDATE no action ON DELETE set null,
    FOREIGN KEY ("_parent_id") REFERENCES "pages_blocks_credentials_carousel"("id") ON UPDATE no action ON DELETE cascade
  )`,
  `CREATE TABLE IF NOT EXISTS "_pages_v_blocks_credentials_carousel" (
    "_order" INTEGER NOT NULL, "_parent_id" INTEGER NOT NULL, "_path" TEXT NOT NULL,
    "_locale" TEXT NOT NULL, "id" INTEGER PRIMARY KEY NOT NULL, "full_bleed" INTEGER DEFAULT 1,
    "eyebrow" TEXT, "title" TEXT, "description" TEXT, "aria_label" TEXT,
    "autoplay" INTEGER DEFAULT 1, "interval_ms" NUMERIC DEFAULT 5500, "_uuid" TEXT,
    "block_name" TEXT,
    FOREIGN KEY ("_parent_id") REFERENCES "_pages_v"("id") ON UPDATE no action ON DELETE cascade
  )`,
  `CREATE TABLE IF NOT EXISTS "_pages_v_blocks_credentials_carousel_items" (
    "_order" INTEGER NOT NULL, "_parent_id" INTEGER NOT NULL, "_locale" TEXT NOT NULL,
    "id" INTEGER PRIMARY KEY NOT NULL, "review_status" TEXT DEFAULT 'verified',
    "kind" TEXT DEFAULT 'cert', "image_id" INTEGER, "issuer" TEXT, "recipient" TEXT,
    "recognition_year" NUMERIC, "issued_on" TEXT, "reference_code" TEXT,
    "source_filename" TEXT, "mark" TEXT, "label" TEXT, "title" TEXT, "description" TEXT, "_uuid" TEXT,
    FOREIGN KEY ("image_id") REFERENCES "media"("id") ON UPDATE no action ON DELETE set null,
    FOREIGN KEY ("_parent_id") REFERENCES "_pages_v_blocks_credentials_carousel"("id") ON UPDATE no action ON DELETE cascade
  )`,
  ...[
    'pages_blocks_credentials_carousel_order_idx ON pages_blocks_credentials_carousel (_order)',
    'pages_blocks_credentials_carousel_parent_id_idx ON pages_blocks_credentials_carousel (_parent_id)',
    'pages_blocks_credentials_carousel_path_idx ON pages_blocks_credentials_carousel (_path)',
    'pages_blocks_credentials_carousel_locale_idx ON pages_blocks_credentials_carousel (_locale)',
    'pages_blocks_credentials_carousel_items_order_idx ON pages_blocks_credentials_carousel_items (_order)',
    'pages_blocks_credentials_carousel_items_parent_id_idx ON pages_blocks_credentials_carousel_items (_parent_id)',
    'pages_blocks_credentials_carousel_items_locale_idx ON pages_blocks_credentials_carousel_items (_locale)',
    'pages_blocks_credentials_carousel_items_image_idx ON pages_blocks_credentials_carousel_items (image_id)',
    '_pages_v_blocks_credentials_carousel_order_idx ON _pages_v_blocks_credentials_carousel (_order)',
    '_pages_v_blocks_credentials_carousel_parent_id_idx ON _pages_v_blocks_credentials_carousel (_parent_id)',
    '_pages_v_blocks_credentials_carousel_path_idx ON _pages_v_blocks_credentials_carousel (_path)',
    '_pages_v_blocks_credentials_carousel_locale_idx ON _pages_v_blocks_credentials_carousel (_locale)',
    '_pages_v_blocks_credentials_carousel_items_order_idx ON _pages_v_blocks_credentials_carousel_items (_order)',
    '_pages_v_blocks_credentials_carousel_items_parent_id_idx ON _pages_v_blocks_credentials_carousel_items (_parent_id)',
    '_pages_v_blocks_credentials_carousel_items_locale_idx ON _pages_v_blocks_credentials_carousel_items (_locale)',
    '_pages_v_blocks_credentials_carousel_items_image_idx ON _pages_v_blocks_credentials_carousel_items (image_id)',
  ].map((definition) => `CREATE INDEX IF NOT EXISTS ${definition}`),
] as const

const wingsGroupGallerySQLiteStatements = [
  `CREATE TABLE IF NOT EXISTS "pages_blocks_wings_group_gallery" (
    "_order" INTEGER NOT NULL, "_parent_id" INTEGER NOT NULL, "_path" TEXT NOT NULL,
    "_locale" TEXT NOT NULL, "id" TEXT PRIMARY KEY NOT NULL,
    "eyebrow" TEXT, "title" TEXT, "description" TEXT, "block_name" TEXT,
    FOREIGN KEY ("_parent_id") REFERENCES "pages"("id") ON UPDATE no action ON DELETE cascade
  )`,
  `CREATE TABLE IF NOT EXISTS "pages_blocks_wings_group_gallery_items" (
    "_order" INTEGER NOT NULL, "_parent_id" TEXT NOT NULL, "_locale" TEXT NOT NULL,
    "id" TEXT PRIMARY KEY NOT NULL, "category" TEXT DEFAULT 'activity',
    "media_id" INTEGER, "media_type" TEXT DEFAULT 'photo', "title" TEXT, "alt" TEXT,
    "caption" TEXT, "illustrative" INTEGER DEFAULT 0, "visible" INTEGER DEFAULT 1,
    FOREIGN KEY ("media_id") REFERENCES "media"("id") ON UPDATE no action ON DELETE set null,
    FOREIGN KEY ("_parent_id") REFERENCES "pages_blocks_wings_group_gallery"("id") ON UPDATE no action ON DELETE cascade
  )`,
  `CREATE TABLE IF NOT EXISTS "_pages_v_blocks_wings_group_gallery" (
    "_order" INTEGER NOT NULL, "_parent_id" INTEGER NOT NULL, "_path" TEXT NOT NULL,
    "_locale" TEXT NOT NULL, "id" INTEGER PRIMARY KEY NOT NULL,
    "eyebrow" TEXT, "title" TEXT, "description" TEXT, "_uuid" TEXT, "block_name" TEXT,
    FOREIGN KEY ("_parent_id") REFERENCES "_pages_v"("id") ON UPDATE no action ON DELETE cascade
  )`,
  `CREATE TABLE IF NOT EXISTS "_pages_v_blocks_wings_group_gallery_items" (
    "_order" INTEGER NOT NULL, "_parent_id" INTEGER NOT NULL, "_locale" TEXT NOT NULL,
    "id" INTEGER PRIMARY KEY NOT NULL, "category" TEXT DEFAULT 'activity',
    "media_id" INTEGER, "media_type" TEXT DEFAULT 'photo', "title" TEXT, "alt" TEXT,
    "caption" TEXT, "illustrative" INTEGER DEFAULT 0, "visible" INTEGER DEFAULT 1,
    "_uuid" TEXT,
    FOREIGN KEY ("media_id") REFERENCES "media"("id") ON UPDATE no action ON DELETE set null,
    FOREIGN KEY ("_parent_id") REFERENCES "_pages_v_blocks_wings_group_gallery"("id") ON UPDATE no action ON DELETE cascade
  )`,
  ...[
    'pages_blocks_wings_group_gallery_order_idx ON pages_blocks_wings_group_gallery (_order)',
    'pages_blocks_wings_group_gallery_parent_id_idx ON pages_blocks_wings_group_gallery (_parent_id)',
    'pages_blocks_wings_group_gallery_path_idx ON pages_blocks_wings_group_gallery (_path)',
    'pages_blocks_wings_group_gallery_locale_idx ON pages_blocks_wings_group_gallery (_locale)',
    'pages_blocks_wings_group_gallery_items_order_idx ON pages_blocks_wings_group_gallery_items (_order)',
    'pages_blocks_wings_group_gallery_items_parent_id_idx ON pages_blocks_wings_group_gallery_items (_parent_id)',
    'pages_blocks_wings_group_gallery_items_locale_idx ON pages_blocks_wings_group_gallery_items (_locale)',
    'pages_blocks_wings_group_gallery_items_media_idx ON pages_blocks_wings_group_gallery_items (media_id)',
    '_pages_v_blocks_wings_group_gallery_order_idx ON _pages_v_blocks_wings_group_gallery (_order)',
    '_pages_v_blocks_wings_group_gallery_parent_id_idx ON _pages_v_blocks_wings_group_gallery (_parent_id)',
    '_pages_v_blocks_wings_group_gallery_path_idx ON _pages_v_blocks_wings_group_gallery (_path)',
    '_pages_v_blocks_wings_group_gallery_locale_idx ON _pages_v_blocks_wings_group_gallery (_locale)',
    '_pages_v_blocks_wings_group_gallery_items_order_idx ON _pages_v_blocks_wings_group_gallery_items (_order)',
    '_pages_v_blocks_wings_group_gallery_items_parent_id_idx ON _pages_v_blocks_wings_group_gallery_items (_parent_id)',
    '_pages_v_blocks_wings_group_gallery_items_locale_idx ON _pages_v_blocks_wings_group_gallery_items (_locale)',
    '_pages_v_blocks_wings_group_gallery_items_media_idx ON _pages_v_blocks_wings_group_gallery_items (media_id)',
  ].map((definition) => `CREATE INDEX IF NOT EXISTS ${definition}`),
] as const

const wingsGroupV3SQLiteStatements = [
  `CREATE TABLE IF NOT EXISTS "wg_ecosystem" (
    "_order" INTEGER NOT NULL, "_parent_id" INTEGER NOT NULL, "_path" TEXT NOT NULL,
    "_locale" TEXT NOT NULL, "id" TEXT PRIMARY KEY NOT NULL,
    "eyebrow" TEXT, "title" TEXT, "description" TEXT, "block_name" TEXT,
    FOREIGN KEY ("_parent_id") REFERENCES "pages"("id") ON UPDATE no action ON DELETE cascade
  )`,
  `CREATE TABLE IF NOT EXISTS "wg_eco_profiles" (
    "_order" INTEGER NOT NULL, "_parent_id" TEXT NOT NULL, "_locale" TEXT NOT NULL,
    "id" TEXT PRIMARY KEY NOT NULL, "brand_key" TEXT, "brand_name" TEXT,
    "description" TEXT, "stage_media_id" INTEGER, "proof_state" TEXT DEFAULT 'pending',
    "cta_label" TEXT, "cta_state" TEXT DEFAULT 'contact-fallback', "cta_contact_path" TEXT,
    "cta_url" TEXT, "cta_owner" TEXT, "cta_http_evidence" TEXT,
    "cta_canonical_evidence" TEXT, "cta_tracking_evidence" TEXT,
    "cta_owner_approval_evidence" TEXT,
    FOREIGN KEY ("stage_media_id") REFERENCES "media"("id") ON UPDATE no action ON DELETE set null,
    FOREIGN KEY ("_parent_id") REFERENCES "wg_ecosystem"("id") ON UPDATE no action ON DELETE cascade
  )`,
  `CREATE TABLE IF NOT EXISTS "wg_eco_proof_refs" (
    "_order" INTEGER NOT NULL, "_parent_id" TEXT NOT NULL, "_locale" TEXT NOT NULL,
    "id" TEXT PRIMARY KEY NOT NULL, "key" TEXT,
    FOREIGN KEY ("_parent_id") REFERENCES "wg_eco_profiles"("id") ON UPDATE no action ON DELETE cascade
  )`,
  `CREATE TABLE IF NOT EXISTS "wg_eco_services" (
    "_order" INTEGER NOT NULL, "_parent_id" TEXT NOT NULL, "_locale" TEXT NOT NULL,
    "id" TEXT PRIMARY KEY NOT NULL, "label" TEXT,
    FOREIGN KEY ("_parent_id") REFERENCES "wg_eco_profiles"("id") ON UPDATE no action ON DELETE cascade
  )`,
  `CREATE TABLE IF NOT EXISTS "wg_proof" (
    "_order" INTEGER NOT NULL, "_parent_id" INTEGER NOT NULL, "_path" TEXT NOT NULL,
    "_locale" TEXT NOT NULL, "id" TEXT PRIMARY KEY NOT NULL,
    "eyebrow" TEXT, "title" TEXT, "description" TEXT, "block_name" TEXT,
    FOREIGN KEY ("_parent_id") REFERENCES "pages"("id") ON UPDATE no action ON DELETE cascade
  )`,
  `CREATE TABLE IF NOT EXISTS "wg_proof_records" (
    "_order" INTEGER NOT NULL, "_parent_id" TEXT NOT NULL, "_locale" TEXT NOT NULL,
    "id" TEXT PRIMARY KEY NOT NULL, "key" TEXT, "kind" TEXT,
    "publication_state" TEXT DEFAULT 'pending', "title" TEXT, "summary" TEXT,
    "source_issuer" TEXT, "context" TEXT, "evidence_date" TEXT,
    "permission_state" TEXT DEFAULT 'pending', "permission_evidence" TEXT,
    "media_id" INTEGER, "media_provenance_reference" TEXT,
    FOREIGN KEY ("media_id") REFERENCES "media"("id") ON UPDATE no action ON DELETE set null,
    FOREIGN KEY ("_parent_id") REFERENCES "wg_proof"("id") ON UPDATE no action ON DELETE cascade
  )`,
  `CREATE TABLE IF NOT EXISTS "_wg_ecosystem_v" (
    "_order" INTEGER NOT NULL, "_parent_id" INTEGER NOT NULL, "_path" TEXT NOT NULL,
    "_locale" TEXT NOT NULL, "id" INTEGER PRIMARY KEY NOT NULL, "eyebrow" TEXT,
    "title" TEXT, "description" TEXT, "_uuid" TEXT, "block_name" TEXT,
    FOREIGN KEY ("_parent_id") REFERENCES "_pages_v"("id") ON UPDATE no action ON DELETE cascade
  )`,
  `CREATE TABLE IF NOT EXISTS "_wg_eco_profiles_v" (
    "_order" INTEGER NOT NULL, "_parent_id" INTEGER NOT NULL, "_locale" TEXT NOT NULL,
    "id" INTEGER PRIMARY KEY NOT NULL, "brand_key" TEXT, "brand_name" TEXT,
    "description" TEXT, "stage_media_id" INTEGER, "proof_state" TEXT DEFAULT 'pending',
    "cta_label" TEXT, "cta_state" TEXT DEFAULT 'contact-fallback', "cta_contact_path" TEXT,
    "cta_url" TEXT, "cta_owner" TEXT, "cta_http_evidence" TEXT,
    "cta_canonical_evidence" TEXT, "cta_tracking_evidence" TEXT,
    "cta_owner_approval_evidence" TEXT, "_uuid" TEXT,
    FOREIGN KEY ("stage_media_id") REFERENCES "media"("id") ON UPDATE no action ON DELETE set null,
    FOREIGN KEY ("_parent_id") REFERENCES "_wg_ecosystem_v"("id") ON UPDATE no action ON DELETE cascade
  )`,
  `CREATE TABLE IF NOT EXISTS "_wg_eco_proof_refs_v" (
    "_order" INTEGER NOT NULL, "_parent_id" INTEGER NOT NULL, "_locale" TEXT NOT NULL,
    "id" INTEGER PRIMARY KEY NOT NULL, "key" TEXT, "_uuid" TEXT,
    FOREIGN KEY ("_parent_id") REFERENCES "_wg_eco_profiles_v"("id") ON UPDATE no action ON DELETE cascade
  )`,
  `CREATE TABLE IF NOT EXISTS "_wg_eco_services_v" (
    "_order" INTEGER NOT NULL, "_parent_id" INTEGER NOT NULL, "_locale" TEXT NOT NULL,
    "id" INTEGER PRIMARY KEY NOT NULL, "label" TEXT, "_uuid" TEXT,
    FOREIGN KEY ("_parent_id") REFERENCES "_wg_eco_profiles_v"("id") ON UPDATE no action ON DELETE cascade
  )`,
  `CREATE TABLE IF NOT EXISTS "_wg_proof_v" (
    "_order" INTEGER NOT NULL, "_parent_id" INTEGER NOT NULL, "_path" TEXT NOT NULL,
    "_locale" TEXT NOT NULL, "id" INTEGER PRIMARY KEY NOT NULL, "eyebrow" TEXT,
    "title" TEXT, "description" TEXT, "_uuid" TEXT, "block_name" TEXT,
    FOREIGN KEY ("_parent_id") REFERENCES "_pages_v"("id") ON UPDATE no action ON DELETE cascade
  )`,
  `CREATE TABLE IF NOT EXISTS "_wg_proof_records_v" (
    "_order" INTEGER NOT NULL, "_parent_id" INTEGER NOT NULL, "_locale" TEXT NOT NULL,
    "id" INTEGER PRIMARY KEY NOT NULL, "key" TEXT, "kind" TEXT,
    "publication_state" TEXT DEFAULT 'pending', "title" TEXT, "summary" TEXT,
    "source_issuer" TEXT, "context" TEXT, "evidence_date" TEXT,
    "permission_state" TEXT DEFAULT 'pending', "permission_evidence" TEXT,
    "media_id" INTEGER, "media_provenance_reference" TEXT, "_uuid" TEXT,
    FOREIGN KEY ("media_id") REFERENCES "media"("id") ON UPDATE no action ON DELETE set null,
    FOREIGN KEY ("_parent_id") REFERENCES "_wg_proof_v"("id") ON UPDATE no action ON DELETE cascade
  )`,
  `CREATE TABLE IF NOT EXISTS "media_governance_responsive_derivatives" (
    "_order" INTEGER NOT NULL, "_parent_id" INTEGER NOT NULL, "id" TEXT PRIMARY KEY NOT NULL,
    "format" TEXT NOT NULL, "width" NUMERIC NOT NULL, "height" NUMERIC,
    "url" TEXT NOT NULL, "sha256" TEXT NOT NULL,
    FOREIGN KEY ("_parent_id") REFERENCES "media"("id") ON UPDATE no action ON DELETE cascade
  )`,
  `CREATE TABLE IF NOT EXISTS "site_settings_wings_group_v3_consultation_channels" (
    "_order" INTEGER NOT NULL, "_parent_id" INTEGER NOT NULL, "id" TEXT PRIMARY KEY NOT NULL,
    "key" TEXT NOT NULL, "state" TEXT DEFAULT 'unconfigured' NOT NULL,
    "url" TEXT, "owner" TEXT, "sla" TEXT, "tracking_reference" TEXT,
    FOREIGN KEY ("_parent_id") REFERENCES "site_settings"("id") ON UPDATE no action ON DELETE cascade
  )`,
  ...[
    'wg_ecosystem_locale_idx ON wg_ecosystem ("_locale")',
    'wg_ecosystem_order_idx ON wg_ecosystem ("_order")',
    'wg_ecosystem_parent_id_idx ON wg_ecosystem ("_parent_id")',
    'wg_ecosystem_path_idx ON wg_ecosystem ("_path")',
    'wg_eco_profiles_locale_idx ON wg_eco_profiles ("_locale")',
    'wg_eco_profiles_order_idx ON wg_eco_profiles ("_order")',
    'wg_eco_profiles_parent_id_idx ON wg_eco_profiles ("_parent_id")',
    'wg_eco_profiles_stage_media_idx ON wg_eco_profiles ("stage_media_id")',
    'wg_eco_proof_refs_locale_idx ON wg_eco_proof_refs ("_locale")',
    'wg_eco_proof_refs_order_idx ON wg_eco_proof_refs ("_order")',
    'wg_eco_proof_refs_parent_id_idx ON wg_eco_proof_refs ("_parent_id")',
    'wg_eco_services_locale_idx ON wg_eco_services ("_locale")',
    'wg_eco_services_order_idx ON wg_eco_services ("_order")',
    'wg_eco_services_parent_id_idx ON wg_eco_services ("_parent_id")',
    'wg_proof_locale_idx ON wg_proof ("_locale")',
    'wg_proof_order_idx ON wg_proof ("_order")',
    'wg_proof_parent_id_idx ON wg_proof ("_parent_id")',
    'wg_proof_path_idx ON wg_proof ("_path")',
    'wg_proof_records_locale_idx ON wg_proof_records ("_locale")',
    'wg_proof_records_media_idx ON wg_proof_records ("media_id")',
    'wg_proof_records_order_idx ON wg_proof_records ("_order")',
    'wg_proof_records_parent_id_idx ON wg_proof_records ("_parent_id")',
    '_wg_ecosystem_v_locale_idx ON _wg_ecosystem_v ("_locale")',
    '_wg_ecosystem_v_order_idx ON _wg_ecosystem_v ("_order")',
    '_wg_ecosystem_v_parent_id_idx ON _wg_ecosystem_v ("_parent_id")',
    '_wg_ecosystem_v_path_idx ON _wg_ecosystem_v ("_path")',
    '_wg_eco_profiles_v_locale_idx ON _wg_eco_profiles_v ("_locale")',
    '_wg_eco_profiles_v_order_idx ON _wg_eco_profiles_v ("_order")',
    '_wg_eco_profiles_v_parent_id_idx ON _wg_eco_profiles_v ("_parent_id")',
    '_wg_eco_profiles_v_stage_media_idx ON _wg_eco_profiles_v ("stage_media_id")',
    '_wg_eco_proof_refs_v_locale_idx ON _wg_eco_proof_refs_v ("_locale")',
    '_wg_eco_proof_refs_v_order_idx ON _wg_eco_proof_refs_v ("_order")',
    '_wg_eco_proof_refs_v_parent_id_idx ON _wg_eco_proof_refs_v ("_parent_id")',
    '_wg_eco_services_v_locale_idx ON _wg_eco_services_v ("_locale")',
    '_wg_eco_services_v_order_idx ON _wg_eco_services_v ("_order")',
    '_wg_eco_services_v_parent_id_idx ON _wg_eco_services_v ("_parent_id")',
    '_wg_proof_v_locale_idx ON _wg_proof_v ("_locale")',
    '_wg_proof_v_order_idx ON _wg_proof_v ("_order")',
    '_wg_proof_v_parent_id_idx ON _wg_proof_v ("_parent_id")',
    '_wg_proof_v_path_idx ON _wg_proof_v ("_path")',
    '_wg_proof_records_v_locale_idx ON _wg_proof_records_v ("_locale")',
    '_wg_proof_records_v_media_idx ON _wg_proof_records_v ("media_id")',
    '_wg_proof_records_v_order_idx ON _wg_proof_records_v ("_order")',
    '_wg_proof_records_v_parent_id_idx ON _wg_proof_records_v ("_parent_id")',
    'media_governance_responsive_derivatives_order_idx ON media_governance_responsive_derivatives ("_order")',
    'media_governance_responsive_derivatives_parent_id_idx ON media_governance_responsive_derivatives ("_parent_id")',
    'site_settings_wings_group_v3_consultation_channels_order_idx ON site_settings_wings_group_v3_consultation_channels ("_order")',
    'site_settings_wings_group_v3_consultation_channels_parent_id_idx ON site_settings_wings_group_v3_consultation_channels ("_parent_id")',
  ].map((definition) => `CREATE INDEX IF NOT EXISTS ${definition}`),
] as const

const toSQLitePath = (databaseURL: string) => {
  if (!databaseURL.startsWith('file:')) {
    return null
  }

  if (databaseURL.startsWith('file://')) {
    return fileURLToPath(databaseURL)
  }

  const rawPath = databaseURL.replace(/^file:/, '')

  return path.resolve(process.cwd(), rawPath)
}

export const repairLocalSQLiteSchema = async (databaseURL: string) => {
  const sqlitePath = toSQLitePath(databaseURL)

  if (!sqlitePath || !fs.existsSync(sqlitePath)) {
    return
  }

  const db = new DatabaseSync(sqlitePath)

  try {
    // Next.js production builds initialize Payload concurrently in multiple
    // workers. Let idempotent bootstrap statements wait for the current schema
    // writer instead of failing immediately with SQLITE_BUSY.
    db.exec('PRAGMA busy_timeout = 30000;')

    for (const { from, to } of localSQLiteTableRenames) {
      const fromTable = db
        .prepare('SELECT name FROM sqlite_master WHERE type = ? AND name = ?')
        .get('table', from) as { name?: string } | undefined
      const toTable = db
        .prepare('SELECT name FROM sqlite_master WHERE type = ? AND name = ?')
        .get('table', to) as { name?: string } | undefined

      if (fromTable?.name && !toTable?.name) {
        db.exec(`ALTER TABLE "${from}" RENAME TO "${to}";`)
      }
    }

    for (const { table, columns } of localSQLiteColumnRepairs) {
      const tableRow = db
        .prepare('SELECT name FROM sqlite_master WHERE type = ? AND name = ?')
        .get('table', table) as { name?: string } | undefined

      if (!tableRow?.name) continue

      const tableInfo = db.prepare(`PRAGMA table_info("${table}")`).all() as Array<{
        name?: string
      }>
      const existingColumns = new Set(tableInfo.map((column) => column.name).filter(Boolean))

      for (const [column, type] of columns) {
        if (!existingColumns.has(column)) {
          try {
            db.exec(`ALTER TABLE "${table}" ADD COLUMN "${column}" ${type};`)
          } catch (e: unknown) {
            if (!String(e).includes('duplicate column name')) {
              throw e
            }
          }
        }
      }
    }

    // Supplemental local SQLite bootstrap for Pages.wingsSideHiFi (US-046A).
    // Production applies the same shape via migration
    // 20260721_180000_wings_side_hifi_page_contract on PostgreSQL.
    const ensureColumns = (table: string, columns: ReadonlyArray<readonly [string, string]>) => {
      const present = db
        .prepare('SELECT name FROM sqlite_master WHERE type = ? AND name = ?')
        .get('table', table) as { name?: string } | undefined
      if (!present?.name) return

      const tableInfo = db.prepare(`PRAGMA table_info("${table}")`).all() as Array<{
        name?: string
      }>
      const existing = new Set(tableInfo.map((column) => column.name).filter(Boolean))
      for (const [column, type] of columns) {
        if (!existing.has(column)) {
          try {
            db.exec(`ALTER TABLE "${table}" ADD COLUMN "${column}" ${type.toUpperCase()};`)
          } catch (e: unknown) {
            if (!String(e).includes('duplicate column name')) {
              throw e
            }
          }
        }
      }
    }

    ensureColumns('pages', WINGSSIDE_HIFI_PAGES_COLUMNS)
    ensureColumns('pages_locales', WINGSSIDE_HIFI_PAGES_LOCALE_COLUMNS)
    ensureColumns(
      '_pages_v',
      WINGSSIDE_HIFI_PAGES_COLUMNS.map(([name, type]) => [`version_${name}`, type] as const),
    )
    ensureColumns(
      '_pages_v_locales',
      WINGSSIDE_HIFI_PAGES_LOCALE_COLUMNS.map(([name, type]) => [`version_${name}`, type] as const),
    )

    for (const statement of getWingsSideHiFiSQLiteCreateTableStatements()) {
      db.exec(`${statement};`)
    }
    for (const statement of getWingsSideHiFiSQLiteIndexStatements()) {
      db.exec(`${statement};`)
    }
    for (const statement of credentialsCarouselSQLiteStatements) {
      db.exec(`${statement};`)
    }
    for (const statement of wingsGroupGallerySQLiteStatements) {
      db.exec(`${statement};`)
    }
    for (const statement of wingsGroupV3SQLiteStatements) {
      db.exec(`${statement};`)
    }
    const mediaTable = db
      .prepare('SELECT name FROM sqlite_master WHERE type = ? AND name = ?')
      .get('table', 'media') as { name?: string } | undefined
    if (mediaTable?.name) {
      db.exec(
        'CREATE UNIQUE INDEX IF NOT EXISTS media_governance_source_identity_idx ON media ("governance_source_identity")',
      )
    }
    for (const statement of tourTaxonomySQLiteStatements) {
      db.exec(`${statement};`)
    }
    for (const statement of wingsSideHomeCurationSQLiteStatements) {
      db.exec(`${statement};`)
    }
    for (const statement of tourCurationsSQLiteStatements) {
      db.exec(`${statement};`)
    }
    const tourDeparturesTable = db
      .prepare('SELECT name FROM sqlite_master WHERE type = ? AND name = ?')
      .get('table', 'tour_departures') as { name?: string } | undefined
    if (tourDeparturesTable?.name) {
      db.exec(`
        CREATE UNIQUE INDEX IF NOT EXISTS "tour_departures_inventory_identity_unique"
        ON "tour_departures" ("inventory_identity")
        WHERE "inventory_identity" IS NOT NULL;
      `)
    }
    // Earlier US-050 bootstrap drafts created the short dbName tables with a
    // `tag` column. CREATE TABLE IF NOT EXISTS cannot repair that shape, so
    // upgrade those local-only tables in place and preserve any draft values.
    for (const table of [
      'home_dest_tours',
      'home_style_tours',
      '_home_dest_tours_v',
      '_home_style_tours_v',
    ]) {
      ensureColumns(table, [['key', 'TEXT']])
      const columns = db.prepare(`PRAGMA table_info("${table}")`).all() as Array<{
        name?: string
      }>
      if (columns.some(({ name }) => name === 'tag')) {
        db.exec(`UPDATE "${table}" SET "key" = "tag" WHERE "key" IS NULL;`)
      }
    }

    ensureColumns('pages_rels', [['tour_products_id', 'INTEGER']])
    ensureColumns('_pages_v_rels', [['tour_products_id', 'INTEGER']])
    for (const table of ['pages_rels', '_pages_v_rels']) {
      const tableRow = db
        .prepare('SELECT name FROM sqlite_master WHERE type = ? AND name = ?')
        .get('table', table) as { name?: string } | undefined
      if (tableRow?.name) {
        db.exec(
          `CREATE INDEX IF NOT EXISTS "${table}_tour_products_id_idx" ON "${table}" ("tour_products_id");`,
        )
      }
    }

    const tableRow = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'payload_locked_documents_rels'",
      )
      .get() as { name?: string } | undefined

    if (!tableRow?.name) {
      return
    }

    const tableInfo = db
      .prepare("PRAGMA table_info('payload_locked_documents_rels')")
      .all() as Array<{
      name?: string
    }>
    const existingColumns = new Set(tableInfo.map((column) => column.name).filter(Boolean))

    for (const column of localSQLiteRelationColumns) {
      if (!existingColumns.has(column)) {
        db.exec(`ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "${column}" INTEGER;`)
      }

      db.exec(
        `CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_${column}_idx" ON "payload_locked_documents_rels" ("${column}");`,
      )
    }
  } finally {
    db.close()
  }
}
