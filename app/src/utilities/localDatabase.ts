import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'

export const DEFAULT_LOCAL_DATABASE_URL = 'file:./payload-tourplatform.db'
export const LEGACY_LOCAL_DATABASE_URL = 'file:./payload.db'

const LOCAL_TOUR_TABLES = ['tour_products', 'tour_departures', 'tour_campaigns'] as const

const toSQLitePath = (databaseURL: string) => {
  if (!databaseURL.startsWith('file:')) {
    return null
  }

  const rawPath = databaseURL.replace(/^file:/, '')

  return path.isAbsolute(rawPath) ? rawPath : path.resolve(process.cwd(), rawPath)
}

const hasTourPlatformSchema = (sqlitePath: string) => {
  if (!fs.existsSync(sqlitePath)) {
    return false
  }

  const db = new DatabaseSync(sqlitePath, { open: true })

  try {
    const tableRows = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all() as Array<{ name?: string }>
    const names = new Set(tableRows.map((row) => row.name).filter(Boolean))

    return LOCAL_TOUR_TABLES.every((table) => names.has(table))
  } catch {
    return false
  } finally {
    db.close()
  }
}

export const resolveLocalDatabaseURL = (databaseURL?: string | null) => {
  const candidate = databaseURL || DEFAULT_LOCAL_DATABASE_URL

  if (!candidate.startsWith('file:')) {
    return candidate
  }

  const preferredPath = toSQLitePath(DEFAULT_LOCAL_DATABASE_URL)
  const legacyPath = toSQLitePath(LEGACY_LOCAL_DATABASE_URL)
  const candidatePath = toSQLitePath(candidate)

  if (!candidatePath) {
    return candidate
  }

  if (hasTourPlatformSchema(candidatePath)) {
    return candidate
  }

  const isLegacyCandidate =
    candidate === LEGACY_LOCAL_DATABASE_URL ||
    (legacyPath && preferredPath && path.resolve(candidatePath) === path.resolve(legacyPath))

  if (isLegacyCandidate && preferredPath && hasTourPlatformSchema(preferredPath)) {
    console.warn(
      `[local-db] Legacy SQLite "${path.basename(candidatePath)}" does not match the current tour platform schema. Falling back to "${path.basename(preferredPath)}".`,
    )

    return DEFAULT_LOCAL_DATABASE_URL
  }

  return candidate
}

