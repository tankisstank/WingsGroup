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

describe('WingsGroup gallery local SQLite bootstrap', () => {
  it('adds live and version tables idempotently to an existing local database', async () => {
    tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'wings-task22-'))
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
    const tables = verified
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE '%wings_group_gallery%' ORDER BY name",
      )
      .all() as Array<{ name: string }>
    const columns = verified
      .prepare('PRAGMA table_info("pages_blocks_wings_group_gallery_items")')
      .all() as Array<{ name: string }>
    verified.close()

    expect(tables.map(({ name }) => name)).toEqual([
      '_pages_v_blocks_wings_group_gallery',
      '_pages_v_blocks_wings_group_gallery_items',
      'pages_blocks_wings_group_gallery',
      'pages_blocks_wings_group_gallery_items',
    ])
    expect(columns.map(({ name }) => name)).toContain('media_type')
    expect(columns.map(({ name }) => name)).toContain('illustrative')
  })
})

describe('US-057 local SQLite repair parity', () => {
  it('adds tour type and departure price-basis columns to live and version tables idempotently', async () => {
    tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'wings-us057-'))
    const databasePath = path.join(tempDirectory, 'payload.db')
    const initial = new DatabaseSync(databasePath)
    initial.exec(
      `CREATE TABLE tour_products (id INTEGER PRIMARY KEY); CREATE TABLE _tour_products_v (id INTEGER PRIMARY KEY); CREATE TABLE tour_departures (id INTEGER PRIMARY KEY); CREATE TABLE _tour_departures_v (id INTEGER PRIMARY KEY);`,
    )
    initial.close()
    await repairLocalSQLiteSchema(`file:${databasePath}`)
    await repairLocalSQLiteSchema(`file:${databasePath}`)
    const verified = new DatabaseSync(databasePath)
    const columns = (table: string) =>
      (verified.prepare(`PRAGMA table_info("${table}")`).all() as Array<{ name: string }>).map(
        ({ name }) => name,
      )
    expect(columns('tour_products')).toContain('tour_type')
    expect(columns('_tour_products_v')).toContain('version_tour_type')
    expect(columns('tour_departures')).toContain('price_basis')
    expect(columns('_tour_departures_v')).toContain('version_price_basis')
    verified.close()
  })
})
