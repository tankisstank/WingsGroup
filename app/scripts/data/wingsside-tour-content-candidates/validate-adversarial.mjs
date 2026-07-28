import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const directory = path.dirname(fileURLToPath(import.meta.url))
const validatorPath = path.join(directory, 'validate.mjs')
const sourceManifestPath = path.join(
  directory,
  '..',
  'wingsside-tour-editorial',
  'source-manifest.json',
)
const read = (name) => JSON.parse(fs.readFileSync(path.join(directory, name), 'utf8'))
const baseline = {
  disclosures: read('pricing-disclosures.json'),
  english: read('en.json'),
  governed: read('governed-source-rows.json'),
}
const clone = (value) => JSON.parse(JSON.stringify(value))
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex')

const runProbe = (name, mutate) => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), `wp1-${name}-`))
  try {
    const value = clone(baseline)
    mutate(value)
    fs.writeFileSync(path.join(workspace, 'en.json'), JSON.stringify(value.english))
    fs.writeFileSync(
      path.join(workspace, 'pricing-disclosures.json'),
      JSON.stringify(value.disclosures),
    )
    fs.writeFileSync(
      path.join(workspace, 'governed-source-rows.json'),
      JSON.stringify(value.governed),
    )
    const result = spawnSync(process.execPath, [validatorPath, workspace, sourceManifestPath], {
      encoding: 'utf8',
    })
    if (result.status === 0) {
      throw new Error(`Adversarial validator probe false-passed: ${name}`)
    }
    return { name, status: 'rejected' }
  } finally {
    fs.rmSync(workspace, { force: true, recursive: true })
  }
}

const probes = [
  runProbe('unknown-id', ({ disclosures }) => {
    disclosures.rows[0].sourceRowID = 'arbitrary-row-id'
  }),
  runProbe('swapped-slug-id', ({ disclosures }) => {
    const first = disclosures.rows[0]
    const second = disclosures.rows[2]
    ;[first.sourceRowID, second.sourceRowID] = [second.sourceRowID, first.sourceRowID]
  }),
  runProbe('self-rehashed-label', ({ disclosures }) => {
    const row = disclosures.rows[0]
    row.sourceLabel = 'Changed source label with a self-consistent hash'
    row.sourceLabelChecksum = sha256(row.sourceLabel)
  }),
  runProbe('missing-row', ({ disclosures }) => {
    disclosures.rows.pop()
  }),
  runProbe('extra-row', ({ disclosures }) => {
    disclosures.rows.push({
      ...disclosures.rows[0],
      sourceRowID: 'extra-row-id',
    })
  }),
  runProbe('tampered-governed-snapshot', ({ governed }) => {
    governed.rows[0][1] = 'tampered-governed-id'
  }),
  runProbe('unsupported-private-claim', ({ english }) => {
    english.tours[0].summary = `A private ${english.tours[0].summary}`
  }),
  runProbe('softened-unconditional-dinner', ({ disclosures }) => {
    disclosures.rows[0].labels.en =
      'The peak-season surcharge and any compulsory dinner, if applicable, are not included.'
  }),
]

console.log(JSON.stringify({ probes, status: 'pass' }))
