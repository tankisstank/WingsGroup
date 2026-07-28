import crypto from 'node:crypto'
import fs from 'node:fs'
import { DatabaseSync } from 'node:sqlite'

import {
  editorialServiceLabelChecksum,
  editorialSourceChecksum,
  type EditorialSourceDay,
} from './wingsSideTourEditorialLocalization'
import {
  catalogAuthoringChecksum,
  type CatalogAuthoringSourceManifest,
  type CatalogAuthoringSourceTour,
} from './wingsSideTourEditorialCatalogAuthoring'

const requiredTables = [
  'sites',
  'tour_products',
  'tour_products_locales',
  'tour_products_includes',
  'tour_products_includes_locales',
  'tour_products_excludes',
  'tour_products_excludes_locales',
  'tour_products_itinerary_days',
  'tour_products_itinerary_days_locales',
] as const

type DatabaseEvidence = {
  absolutePath: string
  mtimeMs: number
  rawSha256: string
  size: number
}

export type WingsSideCatalogSourceSnapshot = {
  database: DatabaseEvidence
  schemaFingerprint: string
  site: { code: 'wing-side'; id: number | string }
  snapshotChecksum: string
  sourceLocale: 'en'
  tours: CatalogAuthoringSourceTour[]
  version: 1
}

const fileSha256 = (filePath: string) =>
  crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex')

const databaseEvidence = (filePath: string): DatabaseEvidence => {
  const stat = fs.statSync(filePath)
  return {
    absolutePath: filePath,
    mtimeMs: stat.mtimeMs,
    rawSha256: fileSha256(filePath),
    size: stat.size,
  }
}

const sameEvidence = (left: DatabaseEvidence, right: DatabaseEvidence) =>
  left.absolutePath === right.absolutePath &&
  left.mtimeMs === right.mtimeMs &&
  left.rawSha256 === right.rawSha256 &&
  left.size === right.size

const normalize = (value: unknown, label: string) => {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} is required`)
  return value.normalize('NFKC').replace(/\s+/gu, ' ').trim()
}

const tableNames = (db: DatabaseSync) =>
  new Set(
    (
      db
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
        .all() as Array<{ name: string }>
    ).map(({ name }) => name),
  )

const schemaFingerprint = (db: DatabaseSync) => {
  const rows = requiredTables.map((table) => {
    const columns = db.prepare(`PRAGMA table_info("${table}")`).all()
    return { columns, table }
  })
  return catalogAuthoringChecksum(rows)
}

type ParentRow = {
  _order: number
  id: string
}

type LocaleServiceRow = {
  _order: number
  id: string
  label: string
}

const serviceRows = (
  db: DatabaseSync,
  table: 'tour_products_excludes' | 'tour_products_includes',
  tourID: number | string,
) =>
  db
    .prepare(
      `SELECT p._order, p.id, l.label
       FROM "${table}" p
       INNER JOIN "${table}_locales" l
         ON l._parent_id = p.id AND l._locale = 'en'
       WHERE p._parent_id = ?
       ORDER BY p._order, p.id`,
    )
    .all(tourID) as LocaleServiceRow[]

const itineraryDays = (db: DatabaseSync, tourID: number | string) =>
  (
    db
      .prepare(
        `SELECT p._order, p.day_number, p.id, l.accommodation, l.meals, l.route,
                l.summary, l.title, l.transport
         FROM tour_products_itinerary_days p
         INNER JOIN tour_products_itinerary_days_locales l
           ON l._parent_id = p.id AND l._locale = 'en'
         WHERE p._parent_id = ?
         ORDER BY p._order, p.id`,
      )
      .all(tourID) as Array<
      ParentRow & {
        accommodation: null | string
        day_number: number
        meals: null | string
        route: null | string
        summary: string
        title: string
        transport: null | string
      }
    >
  ).map(
    (row): EditorialSourceDay => ({
      accommodation: row.accommodation,
      dayNumber: row.day_number,
      meals: row.meals,
      route: row.route,
      summary: normalize(row.summary, `Itinerary summary ${row.id}`),
      title: normalize(row.title, `Itinerary title ${row.id}`),
      transport: row.transport,
    }),
  )

export const exportWingsSideCatalogSourceSnapshot = (
  databasePath: string,
): {
  manifest: CatalogAuthoringSourceManifest
  snapshot: WingsSideCatalogSourceSnapshot
} => {
  const absolutePath = fs.realpathSync(databasePath)
  const before = databaseEvidence(absolutePath)
  const db = new DatabaseSync(absolutePath, { readOnly: true })
  try {
    const present = tableNames(db)
    const missing = requiredTables.filter((table) => !present.has(table))
    if (missing.length > 0) {
      throw new Error(`Catalog source snapshot schema is incomplete: ${missing.join(', ')}`)
    }
    db.exec('BEGIN')
    const site = db
      .prepare("SELECT id, code FROM sites WHERE code = 'wing-side'")
      .all() as Array<{ code: string; id: number | string }>
    if (site.length !== 1) throw new Error(`Expected one wing-side site, found ${site.length}`)
    const rows = db
      .prepare(
        `SELECT t.id AS tourID, t.slug, l.summary, l.title
         FROM tour_products t
         INNER JOIN tour_products_locales l
           ON l._parent_id = t.id AND l._locale = 'en'
         WHERE t.site_id = ? AND t._status = 'published'
         ORDER BY t.slug, t.id`,
      )
      .all(site[0]!.id) as Array<{
      slug: string
      summary: string
      title: string
      tourID: number | string
    }>
    if (rows.length !== 22) {
      throw new Error(`Expected exactly 22 published WingSide English tours, found ${rows.length}`)
    }
    const tours = rows.map((row): CatalogAuthoringSourceTour => ({
      excludes: serviceRows(db, 'tour_products_excludes', row.tourID).map((service) => ({
        id: service.id,
        label: normalize(service.label, `Exclude ${row.slug}:${service.id}`),
      })),
      includes: serviceRows(db, 'tour_products_includes', row.tourID).map((service) => ({
        id: service.id,
        label: normalize(service.label, `Include ${row.slug}:${service.id}`),
      })),
      itineraryDays: itineraryDays(db, row.tourID),
      slug: normalize(row.slug, `Tour slug ${row.tourID}`),
      summary: normalize(row.summary, `Tour summary ${row.tourID}`),
      title: normalize(row.title, `Tour title ${row.tourID}`),
      tourID: row.tourID,
    }))
    const ids = tours.map(({ tourID }) => String(tourID))
    const slugs = tours.map(({ slug }) => slug)
    if (new Set(ids).size !== 22 || new Set(slugs).size !== 22) {
      throw new Error('Published WingSide source contains duplicate tour IDs or slugs')
    }
    const observedSchemaFingerprint = schemaFingerprint(db)
    db.exec('COMMIT')
    const governedPattern =
      /\b(?:peak|high) season\b|\bfuel surcharge\b|\bcompulsory dinner\b/iu
    const manifest: CatalogAuthoringSourceManifest = {
      expectedGovernedDisclosureCount: 38,
      expectedTourCount: 22,
      generatedFrom: 'wing-side-published-en-tour-products',
      siteCode: 'wing-side',
      sourceLocale: 'en',
      tours: tours.map((tour) => ({
        checksum: editorialSourceChecksum(tour),
        governedRows: [
          ...(tour.includes ?? []).map((row) => ({
            row,
            sourceBucket: 'includes' as const,
          })),
          ...(tour.excludes ?? []).map((row) => ({
            row,
            sourceBucket: 'excludes' as const,
          })),
        ]
          .filter(({ row }) => governedPattern.test(String(row.label ?? '')))
          .map(({ row, sourceBucket }) => ({
            sourceBucket,
            sourceLabelChecksum: editorialServiceLabelChecksum(row.label),
            sourceRowID: String(row.id),
          })),
        slug: tour.slug,
        tourID: tour.tourID,
      })),
      version: 2,
    }
    const governedCount = manifest.tours.flatMap(({ governedRows }) => governedRows).length
    if (governedCount !== 38) {
      throw new Error(`Expected exactly 38 governed pricing rows, found ${governedCount}`)
    }
    const after = databaseEvidence(absolutePath)
    if (!sameEvidence(before, after)) {
      throw new Error('Catalog source database changed during read-only export')
    }
    const snapshotWithoutChecksum = {
      database: before,
      schemaFingerprint: observedSchemaFingerprint,
      site: { code: 'wing-side' as const, id: site[0]!.id },
      sourceLocale: 'en' as const,
      tours,
      version: 1 as const,
    }
    return {
      manifest,
      snapshot: {
        ...snapshotWithoutChecksum,
        snapshotChecksum: catalogAuthoringChecksum(snapshotWithoutChecksum),
      },
    }
  } finally {
    db.close()
  }
}
