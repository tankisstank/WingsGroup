import * as migration_20260614_142513 from './20260614_142513';
import * as migration_20260615_hero_presentations from './20260615_hero_presentations';
import * as migration_20260615_170207_layout_preset_library from './20260615_170207_layout_preset_library';
import * as migration_20260619_114500_site_settings_favicon_image from './20260619_114500_site_settings_favicon_image';
import * as migration_20260620_090000_wings_group_root_site from './20260620_090000_wings_group_root_site';
import * as migration_20260623_hero_presentation_platform from './20260623_hero_presentation_platform';

export const migrations = [
  {
    up: migration_20260614_142513.up,
    down: migration_20260614_142513.down,
    name: '20260614_142513',
  },
  {
    up: migration_20260615_hero_presentations.up,
    down: migration_20260615_hero_presentations.down,
    name: '20260615_hero_presentations'
  },
  {
    up: migration_20260615_170207_layout_preset_library.up,
    down: migration_20260615_170207_layout_preset_library.down,
    name: '20260615_170207_layout_preset_library',
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
];
