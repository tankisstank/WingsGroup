import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'

import { afterEach, describe, expect, it } from 'vitest'

import { repairLocalSQLiteSchema } from '@/utilities/repairLocalSQLiteSchema'

let tempDirectory: string | undefined

afterEach(() => {
  if (tempDirectory) fs.rmSync(tempDirectory, { force: true, recursive: true })
  tempDirectory = undefined
})

describe('credentials carousel local SQLite bootstrap', () => {
  it('adds live and version tables idempotently to an existing local database', async () => {
    tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'wings-us047-'))
    const databasePath = path.join(tempDirectory, 'payload.db')
    const initial = new DatabaseSync(databasePath)
    initial.exec(`
      CREATE TABLE pages (id INTEGER PRIMARY KEY);
      CREATE TABLE media (id INTEGER PRIMARY KEY);
      CREATE TABLE _pages_v (id INTEGER PRIMARY KEY);
    `)
    initial.close()

    await repairLocalSQLiteSchema(`file:${databasePath}`)
    await repairLocalSQLiteSchema(`file:${databasePath}`)

    const verified = new DatabaseSync(databasePath)
    const rows = verified
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE '%credentials_carousel%' ORDER BY name",
      )
      .all() as Array<{ name: string }>
    verified.close()

    expect(rows.map(({ name }) => name)).toEqual([
      '_pages_v_blocks_credentials_carousel',
      '_pages_v_blocks_credentials_carousel_items',
      'pages_blocks_credentials_carousel',
      'pages_blocks_credentials_carousel_items',
    ])
  })
})
