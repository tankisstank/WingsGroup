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
]
