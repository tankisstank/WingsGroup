import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'

import {
  assertWingsSideTourMediaD4CManifestEqual,
  buildWingsSideTourMediaD4CManifest,
  parseWingsSideD4CEditorialManifest,
  parseWingsSideTourMediaD4CManifest,
  readWingsSideD4CVerifiedFile,
  resolveWingsSideD4CApprovedRoot,
  wingsSideD4CSha256,
  type WingsSideD4CMediaRow,
  type WingsSideD4CRelationRow,
  type WingsSideD4CTourRow,
} from './lib/wingsSideTourMediaD4C'

const args = process.argv.slice(2)
const value = (name: string): string => {
  const index = args.indexOf(name)
  const result = index >= 0 ? args[index + 1]?.trim() : ''
  if (!result || result.startsWith('--')) throw new Error(`Missing ${name}`)
  return result
}
const mode = args[0]
if (mode !== 'generate' && mode !== 'verify') {
  throw new Error(
    'Usage: tsx scripts/audit-wingsside-tour-media-d4c.ts <generate|verify> --database <sqlite> --media-root <dir> --editorial-manifest <json> --inventory <json>',
  )
}

const databasePath = path.resolve(value('--database'))
const mediaRoot = path.resolve(value('--media-root'))
const editorialManifestPath = path.resolve(value('--editorial-manifest'))
const inventoryPath = path.resolve(value('--inventory'))

const mediaRootRealPath = await resolveWingsSideD4CApprovedRoot(mediaRoot)
const databaseRootRealPath = await resolveWingsSideD4CApprovedRoot(path.dirname(databasePath))
const databaseInput = await readWingsSideD4CVerifiedFile({
  approvedRootRealPath: databaseRootRealPath,
  relativePath: path.basename(databasePath),
})
const editorialRootRealPath = await resolveWingsSideD4CApprovedRoot(
  path.dirname(editorialManifestPath),
)
const editorialInput = await readWingsSideD4CVerifiedFile({
  approvedRootRealPath: editorialRootRealPath,
  relativePath: path.basename(editorialManifestPath),
})
const editorial = parseWingsSideD4CEditorialManifest(
  JSON.parse(editorialInput.bytes.toString('utf8')) as unknown,
)
const slugs = editorial.tours.map(({ slug }) => slug)

const database = new DatabaseSync(databaseInput.realPath, { readOnly: true })
let databaseClosed = false
try {
  const placeholders = slugs.map(() => '?').join(',')
  const tourRows = database
    .prepare(
      `select id as tourID, slug as tourSlug, hero_media_id as heroMediaID,
       market_card_thumbnail_override_id as marketCardMediaID,
       route_viz_map_image_id as routeMapMediaID
       from tour_products where slug in (${placeholders}) order by slug`,
    )
    .all(...slugs) as unknown as WingsSideD4CTourRow[]
  const tourIDs = tourRows.map(({ tourID }) => tourID)
  const relationRows = database
    .prepare(
      `select parent_id as tourID, media_id as mediaID, path, "order"
       from tour_products_rels
       where parent_id in (${tourIDs.map(() => '?').join(',')}) and media_id is not null
       order by parent_id, path, "order"`,
    )
    .all(...tourIDs) as unknown as WingsSideD4CRelationRow[]
  const mediaIDs = [
    ...new Set([
      ...tourRows.flatMap(({ heroMediaID, marketCardMediaID, routeMapMediaID }) =>
        [heroMediaID, marketCardMediaID, routeMapMediaID].filter(
          (entry): entry is number => entry !== null,
        ),
      ),
      ...relationRows.map(({ mediaID }) => mediaID),
    ]),
  ].sort((left, right) => left - right)
  const mediaRows = database
    .prepare(
      `select id as mediaID, filename, mime_type as mimeType, filesize as recordedByteLength,
       width, height from media where id in (${mediaIDs.map(() => '?').join(',')})`,
    )
    .all(...mediaIDs) as unknown as WingsSideD4CMediaRow[]

  const sourceBytes = new Map<string, Buffer>()
  for (const row of mediaRows) {
    const source = await readWingsSideD4CVerifiedFile({
      approvedRootRealPath: mediaRootRealPath,
      relativePath: row.filename,
    })
    sourceBytes.set(row.filename, source.bytes)
  }

  database.close()
  databaseClosed = true
  const databaseAfter = await readWingsSideD4CVerifiedFile({
    approvedRootRealPath: databaseRootRealPath,
    relativePath: path.basename(databasePath),
  })
  if (
    databaseAfter.realPath !== databaseInput.realPath ||
    databaseAfter.sha256 !== databaseInput.sha256 ||
    databaseAfter.bytes.byteLength !== databaseInput.bytes.byteLength
  ) {
    throw new Error('D4-C database snapshot changed while inventory was collected')
  }
  const manifest = buildWingsSideTourMediaD4CManifest({
    databaseFilename: path.basename(databasePath),
    databaseSha256: databaseInput.sha256,
    editorialSourceManifestSha256: wingsSideD4CSha256(editorialInput.bytes),
    loadAsset: (filename) => {
      const bytes = sourceBytes.get(filename)
      if (!bytes) throw new Error(`D4-C source bytes missing for ${filename}`)
      return { byteLength: bytes.byteLength, sha256: wingsSideD4CSha256(bytes) }
    },
    mediaRootReference: 'Payload public/media snapshot',
    mediaRows,
    relationRows,
    tourRows,
  })

  if (mode === 'generate') {
    await writeFile(inventoryPath, `${JSON.stringify(manifest, null, 2)}\n`, {
      encoding: 'utf8',
      flag: 'wx',
    })
  } else {
    const sealed = parseWingsSideTourMediaD4CManifest(
      JSON.parse(await readFile(inventoryPath, 'utf8')) as unknown,
    )
    assertWingsSideTourMediaD4CManifestEqual(sealed, manifest)
  }
  process.stdout.write(
    `${JSON.stringify({
      coverage: manifest.coverage,
      mode,
      sourceSnapshotSha256: manifest.sourceSnapshotSha256,
    })}\n`,
  )
} finally {
  if (!databaseClosed) database.close()
}
