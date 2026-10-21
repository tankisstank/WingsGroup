import * as migration_20260614_142513 from './20260614_142513'
import * as migration_20260615_170207_layout_preset_library from './20260615_170207_layout_preset_library'
import * as migration_20260615_hero_presentations from './20260615_hero_presentations'
import * as migration_20260619_114500_site_settings_favicon_image from './20260619_114500_site_settings_favicon_image'
import * as migration_20260620_090000_wings_group_root_site from './20260620_090000_wings_group_root_site'
import * as migration_20260623_hero_presentation_platform from './20260623_hero_presentation_platform'
import * as migration_20260710_145706_tour_platform_schema from './20260710_145706_tour_platform_schema'
import * as migration_20260711_090000_lead_delivery_status from './20260711_090000_lead_delivery_status'
import * as migration_20260711_100000_testimonial_rating_provenance from './20260711_100000_testimonial_rating_provenance'
import * as migration_20260714_120000_testimonial_note_metadata from './20260714_120000_testimonial_note_metadata'
import * as migration_20260717_150000_tour_import_provenance from './20260717_150000_tour_import_provenance'
import * as migration_20260721_180000_wings_side_hifi_page_contract from './20260721_180000_wings_side_hifi_page_contract'
import * as migration_20260722_010000_wings_side_plan_content_completion from './20260722_010000_wings_side_plan_content_completion'
import * as migration_20260722_020046_credentials_carousel_block from './20260722_020046_credentials_carousel_block'
import * as migration_20260722_230000_wing_side_tenant_identity from './20260722_230000_wing_side_tenant_identity'
import * as migration_20260723_170000_wing_side_release_identity from './20260723_170000_wing_side_release_identity'
import * as migration_20260723_183000_wing_side_style_seo_copy from './20260723_183000_wing_side_style_seo_copy'
import * as migration_20260723_190000_wing_side_public_contact_identity from './20260723_190000_wing_side_public_contact_identity'
import * as migration_20260724_090000_credentials_catalog_metadata from './20260724_090000_credentials_catalog_metadata'
import * as migration_20260724_110000_wing_side_supported_locales from './20260724_110000_wing_side_supported_locales'
import * as migration_20260724_120000_tour_product_taxonomy from './20260724_120000_tour_product_taxonomy'
import * as migration_20260724_130000_wing_side_display_brand from './20260724_130000_wing_side_display_brand'
import * as migration_20260725_090000_wings_side_home_tour_curation from './20260725_090000_wings_side_home_tour_curation'
import * as migration_20260728_090000_wings_side_why_travel_tours from './20260728_090000_wings_side_why_travel_tours'
import * as migration_20260728_100000_lead_enquiry_context from './20260728_100000_lead_enquiry_context'
import * as migration_20260729_150000_wings_side_home_why_tour_slots from './20260729_150000_wings_side_home_why_tour_slots'
import * as migration_20260730_120000_wings_side_journeys_v2 from './20260730_120000_wings_side_journeys_v2'
import * as migration_20260730_130000_wings_side_enquiry_discovery_context from './20260730_130000_wings_side_enquiry_discovery_context'
import * as migration_20260731_090000_tour_commerce_freshness_identity from './20260731_090000_tour_commerce_freshness_identity'
import * as migration_20260731_100000_tour_departure_source_provenance from './20260731_100000_tour_departure_source_provenance'
import * as migration_20260806_090000_backfill_wingsgo_legacy_tour_sites from './20260806_090000_backfill_wingsgo_legacy_tour_sites'
import * as migration_20260813_193226_wingsgroup_v3_data_foundation from './20260813_193226_wingsgroup_v3_data_foundation'
import * as migration_20260814_090000_wingsgroup_lead_governance from './20260814_090000_wingsgroup_lead_governance'
import * as migration_20260814_120000_wingsgroup_corporate_route_governance from './20260814_120000_wingsgroup_corporate_route_governance'
import * as migration_20260814_130000_wingsgroup_policy_release_governance from './20260814_130000_wingsgroup_policy_release_governance'
import * as migration_20260814_140000_wingsgroup_settings_content_integrity from './20260814_140000_wingsgroup_settings_content_integrity'
import * as migration_20260823_090000_wingsgroup_callback_channel from './20260823_090000_wingsgroup_callback_channel'
import * as migration_20260823_110000_wingsgroup_public_contact_identity from './20260823_110000_wingsgroup_public_contact_identity'
import * as migration_20260824_150000_wingsgroup_v3_media_sizes from './20260824_150000_wingsgroup_v3_media_sizes'
import * as migration_20260824_160000_wingsgroup_ecosystem_route_archetype from './20260824_160000_wingsgroup_ecosystem_route_archetype'
import * as migration_20260906_081500_lead_notification_job_tasks from './20260906_081500_lead_notification_job_tasks'
import * as migration_20260906_083000_payload_jobs_meta from './20260906_083000_payload_jobs_meta'
import * as migration_20260906_084000_payload_jobs_stats from './20260906_084000_payload_jobs_stats'
import * as migration_20260909_090000_wingsgo_tour_catalog from './20260909_090000_wingsgo_tour_catalog'
import * as migration_20260914_090000_cms_admin_lead_triage from './20260914_090000_cms_admin_lead_triage'
import * as migration_20260920_090000_wingsgroup_gallery from './20260920_090000_wingsgroup_gallery'
import * as migration_20260921_090000_wingsgo_departure_lead_context from './20260921_090000_wingsgo_departure_lead_context'
import * as migration_20260923_090000_tour_authoring_redirect_type from './20260923_090000_tour_authoring_redirect_type'
import * as migration_20261015_090000_wingsgo_tour_curations from './20261015_090000_wingsgo_tour_curations'
import * as migration_20261015_120000_tour_itinerary_content_richtext from './20261015_120000_tour_itinerary_content_richtext'
import * as migration_20261019_100000_site_settings_hotlines from './20261019_100000_site_settings_hotlines'
import * as migration_20261021_120000_tour_editorial_badges from './20261021_120000_tour_editorial_badges'

export const migrations = [
  {
    up: migration_20260614_142513.up,
    down: migration_20260614_142513.down,
    name: '20260614_142513',
  },
  {
    up: migration_20260615_170207_layout_preset_library.up,
    down: migration_20260615_170207_layout_preset_library.down,
    name: '20260615_170207_layout_preset_library',
  },
  {
    up: migration_20260615_hero_presentations.up,
    down: migration_20260615_hero_presentations.down,
    name: '20260615_hero_presentations',
  },
  {
    up: migration_20260619_114500_site_settings_favicon_image.up,
    down: migration_20260619_114500_site_settings_favicon_image.down,
    name: '20260619_114500_site_settings_favicon_image',
  },
  {
    up: migration_20260620_090000_wings_group_root_site.up,
    down: migration_20260620_090000_wings_group_root_site.down,
    name: '20260620_090000_wings_group_root_site',
  },
  {
    up: migration_20260623_hero_presentation_platform.up,
    down: migration_20260623_hero_presentation_platform.down,
    name: '20260623_hero_presentation_platform',
  },
  {
    up: migration_20260710_145706_tour_platform_schema.up,
    down: migration_20260710_145706_tour_platform_schema.down,
    name: '20260710_145706_tour_platform_schema',
  },
  {
    up: migration_20260711_090000_lead_delivery_status.up,
    down: migration_20260711_090000_lead_delivery_status.down,
    name: '20260711_090000_lead_delivery_status',
  },
  {
    up: migration_20260711_100000_testimonial_rating_provenance.up,
    down: migration_20260711_100000_testimonial_rating_provenance.down,
    name: '20260711_100000_testimonial_rating_provenance',
  },
  {
    up: migration_20260714_120000_testimonial_note_metadata.up,
    down: migration_20260714_120000_testimonial_note_metadata.down,
    name: '20260714_120000_testimonial_note_metadata',
  },
  {
    up: migration_20260717_150000_tour_import_provenance.up,
    down: migration_20260717_150000_tour_import_provenance.down,
    name: '20260717_150000_tour_import_provenance',
  },
  {
    up: migration_20260721_180000_wings_side_hifi_page_contract.up,
    down: migration_20260721_180000_wings_side_hifi_page_contract.down,
    name: '20260721_180000_wings_side_hifi_page_contract',
  },
  {
    up: migration_20260722_010000_wings_side_plan_content_completion.up,
    down: migration_20260722_010000_wings_side_plan_content_completion.down,
    name: '20260722_010000_wings_side_plan_content_completion',
  },
  {
    up: migration_20260722_020046_credentials_carousel_block.up,
    down: migration_20260722_020046_credentials_carousel_block.down,
    name: '20260722_020046_credentials_carousel_block',
  },
  {
    up: migration_20260722_230000_wing_side_tenant_identity.up,
    down: migration_20260722_230000_wing_side_tenant_identity.down,
    name: '20260722_230000_wing_side_tenant_identity',
  },
  {
    up: migration_20260723_170000_wing_side_release_identity.up,
    down: migration_20260723_170000_wing_side_release_identity.down,
    name: '20260723_170000_wing_side_release_identity',
  },
  {
    up: migration_20260723_183000_wing_side_style_seo_copy.up,
    down: migration_20260723_183000_wing_side_style_seo_copy.down,
    name: '20260723_183000_wing_side_style_seo_copy',
  },
  {
    up: migration_20260723_190000_wing_side_public_contact_identity.up,
    down: migration_20260723_190000_wing_side_public_contact_identity.down,
    name: '20260723_190000_wing_side_public_contact_identity',
  },
  {
    up: migration_20260724_090000_credentials_catalog_metadata.up,
    down: migration_20260724_090000_credentials_catalog_metadata.down,
    name: '20260724_090000_credentials_catalog_metadata',
  },
  {
    up: migration_20260724_110000_wing_side_supported_locales.up,
    down: migration_20260724_110000_wing_side_supported_locales.down,
    name: '20260724_110000_wing_side_supported_locales',
  },
  {
    up: migration_20260724_120000_tour_product_taxonomy.up,
    down: migration_20260724_120000_tour_product_taxonomy.down,
    name: '20260724_120000_tour_product_taxonomy',
  },
  {
    up: migration_20260724_130000_wing_side_display_brand.up,
    down: migration_20260724_130000_wing_side_display_brand.down,
    name: '20260724_130000_wing_side_display_brand',
  },
  {
    up: migration_20260725_090000_wings_side_home_tour_curation.up,
    down: migration_20260725_090000_wings_side_home_tour_curation.down,
    name: '20260725_090000_wings_side_home_tour_curation',
  },
  {
    up: migration_20260728_090000_wings_side_why_travel_tours.up,
    down: migration_20260728_090000_wings_side_why_travel_tours.down,
    name: '20260728_090000_wings_side_why_travel_tours',
  },
  {
    up: migration_20260728_100000_lead_enquiry_context.up,
    down: migration_20260728_100000_lead_enquiry_context.down,
    name: '20260728_100000_lead_enquiry_context',
  },
  {
    up: migration_20260729_150000_wings_side_home_why_tour_slots.up,
    down: migration_20260729_150000_wings_side_home_why_tour_slots.down,
    name: '20260729_150000_wings_side_home_why_tour_slots',
  },
  {
    up: migration_20260730_120000_wings_side_journeys_v2.up,
    down: migration_20260730_120000_wings_side_journeys_v2.down,
    name: '20260730_120000_wings_side_journeys_v2',
  },
  {
    up: migration_20260730_130000_wings_side_enquiry_discovery_context.up,
    down: migration_20260730_130000_wings_side_enquiry_discovery_context.down,
    name: '20260730_130000_wings_side_enquiry_discovery_context',
  },
  {
    up: migration_20260731_090000_tour_commerce_freshness_identity.up,
    down: migration_20260731_090000_tour_commerce_freshness_identity.down,
    name: '20260731_090000_tour_commerce_freshness_identity',
  },
  {
    up: migration_20260731_100000_tour_departure_source_provenance.up,
    down: migration_20260731_100000_tour_departure_source_provenance.down,
    name: '20260731_100000_tour_departure_source_provenance',
  },
  {
    up: migration_20260806_090000_backfill_wingsgo_legacy_tour_sites.up,
    down: migration_20260806_090000_backfill_wingsgo_legacy_tour_sites.down,
    name: '20260806_090000_backfill_wingsgo_legacy_tour_sites',
  },
  {
    up: migration_20260813_193226_wingsgroup_v3_data_foundation.up,
    down: migration_20260813_193226_wingsgroup_v3_data_foundation.down,
    name: '20260813_193226_wingsgroup_v3_data_foundation',
  },
  {
    up: migration_20260814_090000_wingsgroup_lead_governance.up,
    down: migration_20260814_090000_wingsgroup_lead_governance.down,
    name: '20260814_090000_wingsgroup_lead_governance',
  },
  {
    up: migration_20260814_120000_wingsgroup_corporate_route_governance.up,
    down: migration_20260814_120000_wingsgroup_corporate_route_governance.down,
    name: '20260814_120000_wingsgroup_corporate_route_governance',
  },
  {
    up: migration_20260814_130000_wingsgroup_policy_release_governance.up,
    down: migration_20260814_130000_wingsgroup_policy_release_governance.down,
    name: '20260814_130000_wingsgroup_policy_release_governance',
  },
  {
    up: migration_20260814_140000_wingsgroup_settings_content_integrity.up,
    down: migration_20260814_140000_wingsgroup_settings_content_integrity.down,
    name: '20260814_140000_wingsgroup_settings_content_integrity',
  },
  {
    up: migration_20260823_090000_wingsgroup_callback_channel.up,
    down: migration_20260823_090000_wingsgroup_callback_channel.down,
    name: '20260823_090000_wingsgroup_callback_channel',
  },
  {
    up: migration_20260823_110000_wingsgroup_public_contact_identity.up,
    down: migration_20260823_110000_wingsgroup_public_contact_identity.down,
    name: '20260823_110000_wingsgroup_public_contact_identity',
  },
  {
    up: migration_20260824_150000_wingsgroup_v3_media_sizes.up,
    down: migration_20260824_150000_wingsgroup_v3_media_sizes.down,
    name: '20260824_150000_wingsgroup_v3_media_sizes',
  },
  {
    up: migration_20260824_160000_wingsgroup_ecosystem_route_archetype.up,
    down: migration_20260824_160000_wingsgroup_ecosystem_route_archetype.down,
    name: '20260824_160000_wingsgroup_ecosystem_route_archetype',
  },
  {
    up: migration_20260906_081500_lead_notification_job_tasks.up,
    down: migration_20260906_081500_lead_notification_job_tasks.down,
    name: '20260906_081500_lead_notification_job_tasks',
  },
  {
    up: migration_20260906_083000_payload_jobs_meta.up,
    down: migration_20260906_083000_payload_jobs_meta.down,
    name: '20260906_083000_payload_jobs_meta',
  },
  {
    up: migration_20260906_084000_payload_jobs_stats.up,
    down: migration_20260906_084000_payload_jobs_stats.down,
    name: '20260906_084000_payload_jobs_stats',
  },
  {
    up: migration_20260909_090000_wingsgo_tour_catalog.up,
    down: migration_20260909_090000_wingsgo_tour_catalog.down,
    name: '20260909_090000_wingsgo_tour_catalog',
  },
  {
    up: migration_20260914_090000_cms_admin_lead_triage.up,
    down: migration_20260914_090000_cms_admin_lead_triage.down,
    name: '20260914_090000_cms_admin_lead_triage',
  },
  {
    up: migration_20260920_090000_wingsgroup_gallery.up,
    down: migration_20260920_090000_wingsgroup_gallery.down,
    name: '20260920_090000_wingsgroup_gallery',
  },
  {
    up: migration_20260921_090000_wingsgo_departure_lead_context.up,
    down: migration_20260921_090000_wingsgo_departure_lead_context.down,
    name: '20260921_090000_wingsgo_departure_lead_context',
  },
  {
    up: migration_20260923_090000_tour_authoring_redirect_type.up,
    down: migration_20260923_090000_tour_authoring_redirect_type.down,
    name: '20260923_090000_tour_authoring_redirect_type',
  },
  {
    up: migration_20261015_090000_wingsgo_tour_curations.up,
    down: migration_20261015_090000_wingsgo_tour_curations.down,
    name: '20261015_090000_wingsgo_tour_curations',
  },
  {
    up: migration_20261015_120000_tour_itinerary_content_richtext.up,
    down: migration_20261015_120000_tour_itinerary_content_richtext.down,
    name: '20261015_120000_tour_itinerary_content_richtext',
  },
  {
    up: migration_20261019_100000_site_settings_hotlines.up,
    down: migration_20261019_100000_site_settings_hotlines.down,
    name: '20261019_100000_site_settings_hotlines',
  },
  {
    up: migration_20261021_120000_tour_editorial_badges.up,
    down: migration_20261021_120000_tour_editorial_badges.down,
    name: '20261021_120000_tour_editorial_badges',
  },
]
