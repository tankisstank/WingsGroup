import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'

import { afterEach, describe, expect, it } from 'vitest'

import { repairLocalSQLiteSchema } from '@/utilities/repairLocalSQLiteSchema'

const temporaryDirectories: string[] = []

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { force: true, recursive: true }),
    ),
  )
})

describe('local SQLite tour-commerce bootstrap', () => {
  it('adds freshness and provenance columns idempotently', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'wings-us057-sqlite-'))
    temporaryDirectories.push(directory)
    const databasePath = path.join(directory, 'local.db')
    const db = new DatabaseSync(databasePath)
    db.exec(`
      CREATE TABLE "tour_departures" ("id" INTEGER PRIMARY KEY);
      CREATE TABLE "_tour_departures_v" ("id" INTEGER PRIMARY KEY);
    `)
    db.close()

    await repairLocalSQLiteSchema(`file:${databasePath}`)
    await repairLocalSQLiteSchema(`file:${databasePath}`)

    const repaired = new DatabaseSync(databasePath)
    const columns = repaired
      .prepare('PRAGMA table_info("tour_departures")')
      .all()
      .map((row) => String(row.name))
    const versionColumns = repaired
      .prepare('PRAGMA table_info("_tour_departures_v")')
      .all()
      .map((row) => String(row.name))
    const index = repaired
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'tour_departures_inventory_identity_unique'",
      )
      .get()

    expect(columns).toEqual(
      expect.arrayContaining([
        'verified_at',
        'expires_at',
        'inventory_identity',
        'source_provenance_source_system',
        'source_provenance_source_row_sha256',
        'source_provenance_managed_by',
      ]),
    )
    expect(versionColumns).toEqual(
      expect.arrayContaining([
        'version_verified_at',
        'version_expires_at',
        'version_inventory_identity',
        'version_source_provenance_managed_by',
      ]),
    )
    expect(index).toMatchObject({ name: 'tour_departures_inventory_identity_unique' })
    repaired.close()
  })
})
