import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { repairLocalSQLiteSchema } from '../../src/utilities/repairLocalSQLiteSchema'

async function rehearse() {
  const directory = mkdtempSync(path.join(tmpdir(), 'wings-us084-'))
  const databasePath = path.join(directory, 'test.db')
  const db = new DatabaseSync(databasePath)
  try {
    db.exec(`
      CREATE TABLE sites (id INTEGER PRIMARY KEY, code TEXT);
      CREATE TABLE tour_products (id INTEGER PRIMARY KEY, site_id INTEGER, title TEXT, slug TEXT);
      CREATE TABLE _tour_products_v (id INTEGER PRIMARY KEY, parent_id INTEGER, version_title TEXT);
      INSERT INTO sites VALUES (1, 'wings-go'), (2, 'wing-side');
      INSERT INTO tour_products VALUES (10, 1, 'Hàn Quốc Mùa Thu', 'han-quoc-mua-thu');
      INSERT INTO _tour_products_v VALUES (100, 10, 'Hàn Quốc Mùa Thu v1');
    `)

    // 1. Run local SQLite repair
    await repairLocalSQLiteSchema(pathToFileURL(databasePath).href)

    // Verify all 4 tables exist
    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND (name LIKE 'tour_products_editorial_badges%' OR name LIKE '_tour_products_v_version_editorial_badges%')",
    ).all().map((r: any) => r.name)

    assert(tables.includes('tour_products_editorial_badges'))
    assert(tables.includes('tour_products_editorial_badges_locales'))
    assert(tables.includes('_tour_products_v_version_editorial_badges'))
    assert(tables.includes('_tour_products_v_version_editorial_badges_locales'))

    // 2. Insert badges into tour_products_editorial_badges
    db.prepare(`
      INSERT INTO tour_products_editorial_badges (_order, _parent_id, id, kind)
      VALUES (1, 10, 'badge-1', 'hot'), (2, 10, 'badge-2', 'specialized')
    `).run()

    db.prepare(`
      INSERT INTO tour_products_editorial_badges_locales (id, _locale, _parent_id, label)
      VALUES (1, 'vi', 'badge-1', 'Tour hot'),
             (2, 'en', 'badge-1', 'Hot tour'),
             (3, 'vi', 'badge-2', 'Chuyên tuyến')
    `).run()

    // 3. Verify localized queries
    const viBadges = (db.prepare(`
      SELECT b.kind, l.label
      FROM tour_products_editorial_badges b
      JOIN tour_products_editorial_badges_locales l ON l._parent_id = b.id
      WHERE b._parent_id = 10 AND l._locale = 'vi'
      ORDER BY b._order
    `).all() as any[]).map((r) => ({ ...r }))
    assert.deepEqual(viBadges, [
      { kind: 'hot', label: 'Tour hot' },
      { kind: 'specialized', label: 'Chuyên tuyến' },
    ])

    const enBadges = (db.prepare(`
      SELECT b.kind, l.label
      FROM tour_products_editorial_badges b
      JOIN tour_products_editorial_badges_locales l ON l._parent_id = b.id
      WHERE b._parent_id = 10 AND l._locale = 'en'
      ORDER BY b._order
    `).all() as any[]).map((r) => ({ ...r }))
    assert.deepEqual(enBadges, [
      { kind: 'hot', label: 'Hot tour' },
    ])

    // 4. Test version tables
    db.prepare(`
      INSERT INTO _tour_products_v_version_editorial_badges (_order, _parent_id, id, _uuid, kind)
      VALUES (1, 100, 1, 'uuid-1', 'vip')
    `).run()
    db.prepare(`
      INSERT INTO _tour_products_v_version_editorial_badges_locales (id, _locale, _parent_id, label)
      VALUES (1, 'vi', 1, 'VIP')
    `).run()

    const vBadge = db.prepare(`
      SELECT b.kind, l.label
      FROM _tour_products_v_version_editorial_badges b
      JOIN _tour_products_v_version_editorial_badges_locales l ON l._parent_id = b.id
      WHERE b._parent_id = 100
    `).get() as any
    assert.deepEqual({ ...vBadge }, { kind: 'vip', label: 'VIP' })

    // 5. Test idempotent re-repair
    await repairLocalSQLiteSchema(pathToFileURL(databasePath).href)
    assert.equal(viBadges.length, 2)

    // 6. Test cascade delete on tour_products
    db.exec('PRAGMA foreign_keys = ON;')
    db.prepare('DELETE FROM tour_products WHERE id = 10;').run()
    const remainingBadges = db.prepare('SELECT count(*) as count FROM tour_products_editorial_badges WHERE _parent_id = 10;').get() as { count: number }
    assert.equal(remainingBadges.count, 0)

    console.log('[US084] PASS SQLite schema repair, localized badges, versions, idempotency, and cascade deletion')
  } finally {
    db.close()
    rmSync(directory, { recursive: true, force: true })
  }
}

await rehearse()
