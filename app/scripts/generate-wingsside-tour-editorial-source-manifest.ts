import fs from 'node:fs/promises'
import path from 'node:path'

import {
  editorialSourceChecksum,
  type EditorialSourceTour,
  type WingsSideTourEditorialSourceManifest,
} from './lib/wingsSideTourEditorialLocalization'

const sourcePath = process.argv[2]
const outputPath =
  process.argv[3] ||
  path.resolve(
    import.meta.dirname,
    'data',
    'wingsside-tour-editorial',
    'source-manifest.json',
  )

if (!sourcePath) {
  throw new Error(
    'Usage: tsx scripts/generate-wingsside-tour-editorial-source-manifest.ts <source.json> [output.json]',
  )
}

const sourceTours = JSON.parse(await fs.readFile(path.resolve(sourcePath), 'utf8')) as EditorialSourceTour[]
if (sourceTours.length !== 22 || new Set(sourceTours.map(({ slug }) => slug)).size !== 22) {
  throw new Error('WingSide editorial source must contain exactly 22 unique tours')
}

const manifest: WingsSideTourEditorialSourceManifest = {
  generatedFrom: 'wing-side-published-en-tour-products',
  sourceLocale: 'en',
  tours: sourceTours
    .map((tour) => ({
      checksum: editorialSourceChecksum(tour),
      slug: tour.slug,
    }))
    .sort((left, right) => left.slug.localeCompare(right.slug)),
  version: 1,
}

await fs.writeFile(path.resolve(outputPath), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
console.log(`Wrote ${manifest.tours.length} WingSide source checksums to ${outputPath}`)
