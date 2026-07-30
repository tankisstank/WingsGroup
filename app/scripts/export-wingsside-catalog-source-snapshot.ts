import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { exportWingsSideCatalogSourceSnapshot } from './lib/wingsSideCatalogSourceSnapshot'

const argument = (name: string) => {
  const inline = process.argv.find((value) => value.startsWith(`${name}=`))
  if (inline) return inline.slice(name.length + 1)
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] : undefined
}

const requiredPath = (name: string) => {
  const value = argument(name)
  if (!value) throw new Error(`Missing required ${name}`)
  return path.resolve(value)
}

export const runWingsSideCatalogSourceExport = async () => {
  const databasePath = requiredPath('--database')
  const snapshotPath = requiredPath('--snapshot')
  const manifestPath = requiredPath('--manifest')
  const { manifest, snapshot } = exportWingsSideCatalogSourceSnapshot(databasePath)
  await fs.writeFile(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`, {
    encoding: 'utf8',
    flag: 'wx',
  })
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, {
    encoding: 'utf8',
    flag: 'wx',
  })
  return {
    databaseSha256: snapshot.database.rawSha256,
    manifestPath,
    snapshotChecksum: snapshot.snapshotChecksum,
    snapshotPath,
    tourCount: snapshot.tours.length,
  }
}

const direct =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))

if (direct) {
  void runWingsSideCatalogSourceExport().then(
    (result) => console.log(JSON.stringify(result)),
    (error) => {
      console.error(error instanceof Error ? error.message : error)
      process.exitCode = 1
    },
  )
}
