import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const migrationFiles = [
  '20260813_193226_wingsgroup_v3_data_foundation.ts',
  '20260814_090000_wingsgroup_lead_governance.ts',
  '20260814_120000_wingsgroup_corporate_route_governance.ts',
  '20260814_130000_wingsgroup_policy_release_governance.ts',
  '20260814_140000_wingsgroup_settings_content_integrity.ts',
]

const readMigration = (filename: string): string =>
  fs.readFileSync(path.resolve(process.cwd(), 'src/migrations', filename), 'utf8')

describe('E09 PostgreSQL migration safety contract', () => {
  it('registers the E09 migrations in chronological order', () => {
    const registry = fs.readFileSync(path.resolve(process.cwd(), 'src/migrations/index.ts'), 'utf8')
    const positions = migrationFiles.map((filename) =>
      registry.indexOf(filename.replace('.ts', '')),
    )

    expect(positions.every((position) => position >= 0)).toBe(true)
    expect(positions).toEqual([...positions].sort((left, right) => left - right))
  })

  it('guards every additive E09 PostgreSQL statement that can be replayed', () => {
    for (const filename of migrationFiles) {
      const migration = readMigration(filename)

      expect(migration).not.toMatch(/CREATE TABLE\s+"/u)
      expect(migration).not.toMatch(/CREATE\s+UNIQUE\s+INDEX\s+"/u)
      expect(migration).not.toMatch(/CREATE\s+INDEX\s+"/u)
      expect(migration).not.toMatch(/ADD COLUMN\s+"/u)

      const enumCreates = migration.match(/CREATE TYPE\s+/gu) || []
      const enumGuards = migration.match(/duplicate_object/gu) || []
      expect(enumCreates.length).toBe(enumGuards.length)
    }
  })

  it('guards foundation foreign keys by constraint name and keeps rollback additive-safe', () => {
    const foundation = readMigration(migrationFiles[0])

    expect(foundation).toContain('IF NOT EXISTS (SELECT 1 FROM pg_constraint')
    expect(foundation).toMatch(/DROP TABLE IF EXISTS[\s\S]+DROP TYPE IF EXISTS/u)
  })
})
