import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'

import {
  assertWingsSideTourMediaD4CManifestEqual,
  buildWingsSideTourMediaD4CManifest,
  wingsSideD4CSha256,
  type WingsSideD4CMediaRow,
  type WingsSideD4CRelationRow,
  type WingsSideD4CTourRow,
  type WingsSideTourMediaD4CManifest,
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
if (!(await stat(databasePath)).isFile()) throw new Error('D4-C database input must be a file')
if (!(await stat(mediaRoot)).isDirectory()) throw new Error('D4-C media root must be a directory')

const hashFile = async (file: string): Promise<string> => {
  const hash = await new Promise<string>((resolve, reject) => {
    const digest = createHash('sha256')
    createReadStream(file)
      .on('data', (chunk) => digest.update(chunk))
      .on('error', reject)
      .on('end', () => resolve(digest.digest('hex')))
  })
  return hash
}

const editorialBytes = await readFile(editorialManifestPath)
const editorial = JSON.parse(editorialBytes.toString('utf8')) as {
  tours?: Array<{ slug?: string }>
}
const slugs = editorial.tours?.map(({ slug }) => slug?.trim() ?? '') ?? []
if (slugs.length !== 22 || slugs.some((slug) => !slug) || new Set(slugs).size !== 22) {
  throw new Error('D4-C editorial source manifest must contain exact unique 22-tour slugs')
}

const database = new DatabaseSync(databasePath, { readOnly: true })
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
    const lexical = path.resolve(mediaRoot, row.filename)
    const prefix = mediaRoot.endsWith(path.sep) ? mediaRoot : `${mediaRoot}${path.sep}`
    if (
      process.platform === 'win32'
        ? !lexical.toLowerCase().startsWith(prefix.toLowerCase())
        : !lexical.startsWith(prefix)
    ) {
      throw new Error(`D4-C media ${row.mediaID} escapes media root`)
    }
    const bytes = await readFile(lexical)
    sourceBytes.set(row.filename, bytes)
  }

  const manifest = buildWingsSideTourMediaD4CManifest({
    databaseFilename: path.basename(databasePath),
    databaseSha256: await hashFile(databasePath),
    editorialSourceManifestSha256: wingsSideD4CSha256(editorialBytes),
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
    const sealed = JSON.parse(await readFile(inventoryPath, 'utf8')) as WingsSideTourMediaD4CManifest
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
  database.close()
}
