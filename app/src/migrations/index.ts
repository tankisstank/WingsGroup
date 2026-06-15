import * as migration_20260615_hero_presentations from './20260615_hero_presentations'

export const migrations = [
  {
    up: migration_20260615_hero_presentations.up,
    down: migration_20260615_hero_presentations.down,
    name: '20260615_hero_presentations',
  },
]
