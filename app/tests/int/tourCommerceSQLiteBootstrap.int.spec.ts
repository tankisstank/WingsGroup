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
        'flight_number',
        'original_price',
        'loyalty_points',
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
        'version_flight_number',
        'version_original_price',
        'version_loyalty_points',
        'version_source_provenance_managed_by',
      ]),
    )
    expect(index).toMatchObject({ name: 'tour_departures_inventory_identity_unique' })
    repaired.close()
  })

  it('repairs the local SiteSettings WingsGroup v3 shape idempotently', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'wings-wingsgroup-sqlite-'))
    temporaryDirectories.push(directory)
    const databasePath = path.join(directory, 'local.db')
    const db = new DatabaseSync(databasePath)
    db.exec(`
      CREATE TABLE "site_settings" ("id" INTEGER PRIMARY KEY, "site_name" TEXT NOT NULL);
      CREATE TABLE "form_submissions" ("id" INTEGER PRIMARY KEY);
      CREATE TABLE "tour_products" ("id" INTEGER PRIMARY KEY);
      CREATE TABLE "_tour_products_v" ("id" INTEGER PRIMARY KEY);
    `)
    db.close()

    await repairLocalSQLiteSchema(`file:${databasePath}`)
    await repairLocalSQLiteSchema(`file:${databasePath}`)

    const repaired = new DatabaseSync(databasePath)
    const columns = repaired
      .prepare('PRAGMA table_info("site_settings")')
      .all()
      .map((row) => String(row.name))
    const leadContextColumns = repaired
      .prepare('PRAGMA table_info("form_submissions")')
      .all()
      .map((row) => String(row.name))
    const productColumns = repaired
      .prepare('PRAGMA table_info("tour_products")')
      .all()
      .map((row) => String(row.name))
    const versionProductColumns = repaired
      .prepare('PRAGMA table_info("_tour_products_v")')
      .all()
      .map((row) => String(row.name))
    const table = repaired
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'site_settings_wings_group_v3_consultation_channels'",
      )
      .get()
    const indexes = repaired
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'site_settings_wings_group_v3_consultation_channels' ORDER BY name",
      )
      .all()
      .map((row) => String(row.name))
    repaired.close()

    expect(columns).toEqual(
      expect.arrayContaining([
        'sales_email',
        'registered_office_address',
        'travel_office_address',
        'wings_group_v3_enabled',
        'wings_group_v3_legal_identity_registered_office',
      ]),
    )
    expect(leadContextColumns).toEqual(
      expect.arrayContaining([
        'enquiry_context_departure_id',
        'enquiry_context_departure_date',
        'enquiry_context_intent',
      ]),
    )
    expect(productColumns).toContain('itinerary_pdf_id')
    expect(versionProductColumns).toContain('version_itinerary_pdf_id')
    expect(table).toMatchObject({ name: 'site_settings_wings_group_v3_consultation_channels' })
    expect(indexes).toEqual(
      expect.arrayContaining([
        'site_settings_wings_group_v3_consultation_channels_order_idx',
        'site_settings_wings_group_v3_consultation_channels_parent_id_idx',
      ]),
    )
  })
})
