import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const migrationSource = readFileSync(
  join(process.cwd(), 'src/migrations/20260909_090000_wingsgo_tour_catalog.ts'),
  'utf8',
)

describe('WingsGo tour catalog migration contract', () => {
  it('uses Payload pages_rels order column rather than the nested-table _order convention', () => {
    expect(migrationSource).toContain(
      'INSERT INTO "pages_rels" ("order", "parent_id", "path", "locale", "tour_products_id")',
    )
    expect(migrationSource).not.toContain(
      'INSERT INTO "pages_rels" ("_order", "parent_id", "path", "locale", "tour_products_id")',
    )
  })
})
