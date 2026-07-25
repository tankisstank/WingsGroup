import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { DatabaseSync } from 'node:sqlite'

import { describe, expect, it } from 'vitest'

const tsxEntrypoint = path.join(process.cwd(), 'node_modules', 'tsx', 'dist', 'cli.mjs')
const proofScript = path.join(process.cwd(), 'scripts', 'lib', 'wingsSideHomeCurationSQLiteProof.ts')

const runProof = (databaseURL: string) =>
  execFileSync(process.execPath, [tsxEntrypoint, proofScript], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      DATABASE_URL: databaseURL,
      PAYLOAD_DB_PUSH: 'false',
      PAYLOAD_SECRET: 'us050-sqlite-smoke-secret',
    },
    stdio: 'pipe',
  })

const runIsolatedProof = () => {
  const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'wings-us050-sqlite-'))
  const databasePath = path.join(tempDirectory, 'curation.sqlite')
  try {
    const db = new DatabaseSync(databasePath)
    db.exec('CREATE TABLE pages (id INTEGER PRIMARY KEY);')
    db.exec('CREATE TABLE _pages_v (id INTEGER PRIMARY KEY);')
    db.close()
    runProof(pathToFileURL(databasePath).href)
  } finally {
    fs.rmSync(tempDirectory, { force: true, recursive: true })
  }
}

describe('WingSide Home curation local SQLite bootstrap', () => {
  it('repairs a hermetic isolated SQLite fixture and supports a real Pages SQL query', () => {
    expect(runIsolatedProof).not.toThrow()
  }, 30_000)
})
