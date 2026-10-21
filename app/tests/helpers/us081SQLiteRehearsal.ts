import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { repairLocalSQLiteSchema } from '../../src/utilities/repairLocalSQLiteSchema'

async function rehearse() {
  const directory = mkdtempSync(path.join(tmpdir(), 'wings-us081-'))
  const databasePath = path.join(directory, 'test.db')
  const db = new DatabaseSync(databasePath)
  try {
    db.exec(`
      CREATE TABLE sites (id INTEGER PRIMARY KEY, code TEXT);
      CREATE TABLE site_settings (id INTEGER PRIMARY KEY, site_id INTEGER, support_phone TEXT);
      INSERT INTO sites VALUES (1, 'wings-go'), (2, 'wing-side');
      INSERT INTO site_settings VALUES (11, 1, '0919000000'), (22, 2, '+33123456789');
    `)
    await repairLocalSQLiteSchema(pathToFileURL(databasePath).href)
    const read = () => db.prepare(
      'SELECT _parent_id, phone_number FROM site_settings_additional_hotlines ORDER BY _order',
    ).all()
    assert.deepEqual(read().map((row) => ({ ...row })), [
      { _parent_id: 11, phone_number: '0915250101' },
      { _parent_id: 11, phone_number: '0915260101' },
    ])
    db.exec('DELETE FROM site_settings_additional_hotlines')
    await repairLocalSQLiteSchema(pathToFileURL(databasePath).href)
    assert.deepEqual(read(), [])
    assert.equal(db.prepare('SELECT support_phone FROM site_settings WHERE id = 11').get()?.support_phone,
      '0919000000')
    assert.equal(db.prepare('SELECT support_phone FROM site_settings WHERE id = 22').get()?.support_phone,
      '+33123456789')
    console.log('[US081] PASS SQLite legacy backfill, repeat repair, deleted numbers and tenant isolation')
  } finally {
    db.close()
    rmSync(directory, { recursive: true, force: true })
  }
}

await rehearse()

const emptyDirectory = mkdtempSync(path.join(tmpdir(), 'wings-us081-empty-'))
const emptyPath = path.join(emptyDirectory, 'test.db')
new DatabaseSync(emptyPath).close()
try {
  await repairLocalSQLiteSchema(pathToFileURL(emptyPath).href)
  console.log('[US081] PASS empty local bootstrap storage')
} finally {
  rmSync(emptyDirectory, { recursive: true, force: true })
}
