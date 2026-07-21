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
]
