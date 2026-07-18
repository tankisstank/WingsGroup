import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { publicLocales } from '../src/i18n/publicCopy'
import {
  buildWingsSideEditorialInventory,
  renderWingsSideEditorialReviewPacket,
} from './lib/wingssideEditorialInventory'

const outputDirectory = path.resolve(
  process.cwd(),
  '../artifacts/audits/wingsside-locale-2026-07-12',
)
const packetDirectory = path.join(outputDirectory, 'editorial-review-packets')
const inventory = buildWingsSideEditorialInventory()

await mkdir(packetDirectory, { recursive: true })
await writeFile(
  path.join(outputDirectory, 'editorial-copy-inventory.json'),
  `${JSON.stringify(inventory, null, 2)}\n`,
  'utf8',
)

for (const locale of publicLocales) {
  await writeFile(
    path.join(packetDirectory, `${locale}.md`),
    renderWingsSideEditorialReviewPacket(inventory, locale),
    'utf8',
  )
}
