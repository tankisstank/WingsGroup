import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const directory = path.dirname(fileURLToPath(import.meta.url))
const readJSON = (name) => JSON.parse(fs.readFileSync(path.join(directory, name), 'utf8'))
const sourceManifest = readJSON('../wingsside-tour-editorial/source-manifest.json')
const english = readJSON('en.json')
const disclosures = readJSON('pricing-disclosures.json')
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex')
const stableStringify = (value) => {
  if (value === undefined) return '"__undefined__"'
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
    .join(',')}}`
}
const contentChecksum = (value) => sha256(stableStringify(value))
const fail = (message) => {
  throw new Error(message)
}
const exactKeys = (value, keys) =>
  Object.keys(value).sort().join('\0') === [...keys].sort().join('\0')
const textLeaves = (value) => {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap(textLeaves)
  if (value && typeof value === 'object') return Object.values(value).flatMap(textLeaves)
  return []
}

if (
  sourceManifest.version !== 1 ||
  sourceManifest.tours.length !== 22 ||
  new Set(sourceManifest.tours.map(({ slug }) => slug)).size !== 22
) {
  fail('Source manifest must contain exactly 22 unique tours')
}
if (
  english.version !== 1 ||
  english.locale !== 'en' ||
  english.voice !== 'calm-specific-consultative' ||
  english.tours.length !== 22 ||
  new Set(english.tours.map(({ slug }) => slug)).size !== 22
) {
  fail('English candidate must contain exactly 22 unique tours')
}
const sourceBySlug = new Map(sourceManifest.tours.map((tour) => [tour.slug, tour]))
for (const [index, tour] of english.tours.entries()) {
  const source = sourceBySlug.get(tour.slug)
  if (!source || source.checksum !== tour.sourceChecksum) {
    fail(`English candidate source binding mismatch at ${index}:${tour.slug}`)
  }
  for (const field of ['title', 'summary', 'routeSummary', 'primaryCTALabel']) {
    if (typeof tour[field] !== 'string' || !tour[field].trim()) {
      fail(`English candidate is missing ${tour.slug}:${field}`)
    }
  }
  if (
    !tour.meta ||
    ['title', 'description', 'breadcrumbLabel'].some(
      (field) => typeof tour.meta[field] !== 'string' || !tour.meta[field].trim(),
    )
  ) {
    fail(`English candidate has incomplete metadata: ${tour.slug}`)
  }
}
const forbidden =
  /\b(?:BestPrice(?:\s+Travel)?|book\s+your\s+tour\s+NOW|let\s+your\s+hair\s+down|rat\s+race|young\s+people|machine\s+translation|translated\s+by)\b/iu
for (const text of textLeaves(english.tours)) {
  if (forbidden.test(text))
    fail(`Forbidden English editorial marker: ${text.match(forbidden)?.[0]}`)
}
const shouting = /\b[A-Z]{4,}\b/u
for (const text of textLeaves(english.tours)) {
  const match = text.match(shouting)?.[0]
  if (match && !['UNESCO', 'IATA'].includes(match)) {
    fail(`Unapproved all-caps token in English candidate: ${match}`)
  }
}

if (
  disclosures.version !== 1 ||
  disclosures.expectedRowCount !== 38 ||
  disclosures.rows.length !== 38
) {
  fail('Pricing disclosure artifact must contain exactly 38 rows')
}
const rowKeys = disclosures.rows.map(({ slug, sourceRowID }) => `${slug}\0${sourceRowID}`)
if (new Set(rowKeys).size !== 38) fail('Pricing disclosure artifact has duplicate row identities')
for (const [index, row] of disclosures.rows.entries()) {
  if (!sourceBySlug.has(row.slug)) fail(`Unknown pricing disclosure slug at ${index}`)
  if (
    !row.sourceRowID ||
    row.sourceBucket !== 'includes' ||
    row.targetBucket !== 'excludes' ||
    sha256(row.sourceLabel.normalize('NFKC').replace(/\s+/gu, ' ').trim()) !==
      row.sourceLabelChecksum
  ) {
    fail(`Invalid source binding or disposition at ${row.slug}:${row.sourceRowID}`)
  }
  if (!exactKeys(row.labels, ['en', 'vi', 'it', 'es', 'pt'])) {
    fail(`Incomplete locale labels at ${row.slug}:${row.sourceRowID}`)
  }
  for (const [locale, label] of Object.entries(row.labels)) {
    if (typeof label !== 'string' || label.trim().length < 40) {
      fail(`Incomplete ${locale} wording at ${row.slug}:${row.sourceRowID}`)
    }
  }
}
for (const text of textLeaves(disclosures.rows.map(({ labels }) => labels))) {
  if (/\b(?:machine translation|translated by)\b/iu.test(text)) {
    fail('Pricing disclosure contains a machine-translation marker')
  }
}

console.log(
  JSON.stringify({
    disclosureArtifactSha256: sha256(
      fs.readFileSync(path.join(directory, 'pricing-disclosures.json')),
    ),
    disclosureContentChecksum: contentChecksum(disclosures),
    disclosureRows: disclosures.rows.length,
    englishArtifactSha256: sha256(fs.readFileSync(path.join(directory, 'en.json'))),
    englishContentChecksum: contentChecksum(english),
    englishTours: english.tours.length,
    localesPerDisclosure: 5,
    status: 'pass',
  }),
)
