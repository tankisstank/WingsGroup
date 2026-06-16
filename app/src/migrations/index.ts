import * as migration_20260614_142513 from './20260614_142513';
import * as migration_20260615_hero_presentations from './20260615_hero_presentations';
import * as migration_20260615_170207_layout_preset_library from './20260615_170207_layout_preset_library';

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
];
