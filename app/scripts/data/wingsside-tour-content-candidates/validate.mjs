import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url))
const directory = process.argv[2] ? path.resolve(process.argv[2]) : moduleDirectory
const sourceManifestPath = process.argv[3]
  ? path.resolve(process.argv[3])
  : path.join(moduleDirectory, '..', 'wingsside-tour-editorial', 'source-manifest.json')
const readJSON = (name) => JSON.parse(fs.readFileSync(path.join(directory, name), 'utf8'))
const sourceManifest = JSON.parse(fs.readFileSync(sourceManifestPath, 'utf8'))
const english = readJSON('en.json')
const disclosures = readJSON('pricing-disclosures.json')
const governedSourceRows = readJSON('governed-source-rows.json')
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
const governedRowsChecksum = 'b3680c1371189235668e70b927386fe7ba3493b87c4b876e7c4621851e714ea4'
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
const unsupportedServiceClaim =
  /\b(?:private|custom(?:ize|ized|ization)?|tailor(?:ed|ing)?|adapt(?:ed|able)?|adjust(?:ed|able)?)\b/iu
for (const tour of english.tours) {
  const claim = textLeaves(tour).join(' ').match(unsupportedServiceClaim)?.[0]
  if (claim && !tour.slug.includes('private-tour')) {
    fail(`Unsupported service/customization claim at ${tour.slug}:${claim}`)
  }
}
const governedScheduleSentences = new Map([
  [
    'hoi-an-surrounding-and-beach-break-7-days',
    'Activities are arranged on days 1-4 and day 7, leaving days 5 and 6 free.',
  ],
  ['romantic-getaway-in-phu-quoc-5-days-of-love-paradise', 'Day 4 is intentionally free.'],
  ['southern-beauty-beach-relaxation-8-days', 'Days 5-7 are left free.'],
])
const compressedSchedulePattern =
  /\b(?:day|days)\s+\d+(?:\s*[-–]\s*\d+)?|\b\d+\s+consecutive days are left free\b/iu
for (const tour of english.tours) {
  const governedSentence = governedScheduleSentences.get(tour.slug)
  if (governedSentence) {
    if (!tour.summary.includes(governedSentence)) {
      fail(`Governed free-day schedule drift at ${tour.slug}`)
    }
  } else if (compressedSchedulePattern.test(tour.summary)) {
    fail(`Unbound compressed day-range claim at ${tour.slug}`)
  }
}

if (
  disclosures.version !== 1 ||
  disclosures.expectedRowCount !== 38 ||
  disclosures.rows.length !== 38
) {
  fail('Pricing disclosure artifact must contain exactly 38 rows')
}
if (
  governedSourceRows.version !== 1 ||
  governedSourceRows.expectedRowCount !== 38 ||
  !Array.isArray(governedSourceRows.rows) ||
  governedSourceRows.rows.length !== 38 ||
  governedSourceRows.rowsChecksum !== governedRowsChecksum ||
  contentChecksum(governedSourceRows.rows) !== governedRowsChecksum
) {
  fail('Governed source-row snapshot is missing, stale, or tampered')
}
const governedByKey = new Map(
  governedSourceRows.rows.map((row) => {
    if (
      !Array.isArray(row) ||
      row.length !== 5 ||
      row[2] !== 'includes' ||
      !/^[a-f0-9]{64}$/u.test(row[3]) ||
      row[4] !== 'pricing-disclosure'
    ) {
      fail('Governed source-row snapshot contains an invalid tuple')
    }
    return [`${row[0]}\0${row[1]}`, row]
  }),
)
if (governedByKey.size !== 38) fail('Governed source-row snapshot has duplicate identities')
const expectedLabelsBySourceLabel = new Map([
  [
    'Peak season surcharge & compulsory dinner in the accommodation.',
    {
      en: 'The peak-season surcharge and compulsory dinner at the accommodation are not included.',
      vi: 'Chưa bao gồm phụ thu mùa cao điểm và bữa tối bắt buộc tại nơi lưu trú.',
      it: 'Il supplemento di alta stagione e la cena obbligatoria in struttura non sono inclusi.',
      es: 'El suplemento de temporada alta y la cena obligatoria en el alojamiento no están incluidos.',
      pt: 'O suplemento de época alta e o jantar obrigatório no alojamento não estão incluídos.',
    },
  ],
  [
    'Peak season surcharge & compulsory dinner at the hotel (if any)',
    {
      en: 'The peak-season surcharge and any compulsory hotel dinner, if applicable, are not included.',
      vi: 'Chưa bao gồm phụ thu mùa cao điểm và bữa tối bắt buộc tại khách sạn, nếu áp dụng.',
      it: "Il supplemento di alta stagione e l'eventuale cena obbligatoria in hotel non sono inclusi.",
      es: 'El suplemento de temporada alta y, si corresponde, la cena obligatoria en el hotel no están incluidos.',
      pt: 'O suplemento de época alta e, quando aplicável, o jantar obrigatório no hotel não estão incluídos.',
    },
  ],
  [
    'Peak season surcharge & compulsory dinner at the accommodation (if any)',
    {
      en: 'The peak-season surcharge and any compulsory dinner at the accommodation, if applicable, are not included.',
      vi: 'Chưa bao gồm phụ thu mùa cao điểm và bữa tối bắt buộc tại nơi lưu trú, nếu áp dụng.',
      it: "Il supplemento di alta stagione e l'eventuale cena obbligatoria in struttura non sono inclusi.",
      es: 'El suplemento de temporada alta y, si corresponde, la cena obligatoria en el alojamiento no están incluidos.',
      pt: 'O suplemento de época alta e, quando aplicável, o jantar obrigatório no alojamento não estão incluídos.',
    },
  ],
  [
    'A fuel surcharge will be applied if fuel prices rise above 15%',
    {
      en: 'A fuel surcharge is not included and will apply if the fuel price rises by more than 15%.',
      vi: 'Chưa bao gồm phụ thu nhiên liệu; khoản này sẽ áp dụng nếu giá nhiên liệu tăng trên 15%.',
      it: 'Il supplemento carburante non è incluso e sarà applicato se il prezzo del carburante aumenta di oltre il 15%.',
      es: 'El suplemento de combustible no está incluido y se aplicará si el precio del combustible aumenta más de un 15 %.',
      pt: 'O suplemento de combustível não está incluído e será aplicado se o preço do combustível aumentar mais de 15%.',
    },
  ],
])
const rowKeys = disclosures.rows.map(({ slug, sourceRowID }) => `${slug}\0${sourceRowID}`)
if (new Set(rowKeys).size !== 38) fail('Pricing disclosure artifact has duplicate row identities')
for (const [index, row] of disclosures.rows.entries()) {
  const governed = governedByKey.get(`${row.slug}\0${row.sourceRowID}`)
  if (!sourceBySlug.has(row.slug)) fail(`Unknown pricing disclosure slug at ${index}`)
  const expectedLabels = expectedLabelsBySourceLabel.get(row.sourceLabel)
  if (
    !governed ||
    !expectedLabels ||
    !row.sourceRowID ||
    row.sourceBucket !== governed[2] ||
    row.targetBucket !== 'excludes' ||
    row.sourceLabelChecksum !== governed[3] ||
    sha256(row.sourceLabel.normalize('NFKC').replace(/\s+/gu, ' ').trim()) !== governed[3]
  ) {
    fail(`Invalid source binding or disposition at ${row.slug}:${row.sourceRowID}`)
  }
  if (!exactKeys(row.labels, ['en', 'vi', 'it', 'es', 'pt'])) {
    fail(`Incomplete locale labels at ${row.slug}:${row.sourceRowID}`)
  }
  if (stableStringify(row.labels) !== stableStringify(expectedLabels)) {
    fail(`Pricing disclosure meaning or modality drift at ${row.slug}:${row.sourceRowID}`)
  }
  for (const [locale, label] of Object.entries(row.labels)) {
    if (typeof label !== 'string' || label.trim().length < 40) {
      fail(`Incomplete ${locale} wording at ${row.slug}:${row.sourceRowID}`)
    }
  }
}
if (rowKeys.some((key) => !governedByKey.has(key))) {
  fail('Pricing disclosure artifact contains a non-governed source-row identity')
}
if ([...governedByKey.keys()].some((key) => !rowKeys.includes(key))) {
  fail('Pricing disclosure artifact is missing a governed source-row identity')
}
const unconditionalDinnerIDs = new Set([
  '6a5a42d0e9a62d80e46ba98f',
  '6a5a42e4e9a62d80e46baae1',
  '6a5a42e6e9a62d80e46bab10',
  '6a5a42e8e9a62d80e46bab28',
])
for (const row of disclosures.rows.filter(({ sourceRowID }) =>
  unconditionalDinnerIDs.has(sourceRowID),
)) {
  if (
    Object.values(row.labels).some((label) =>
      /\b(?:any|if applicable|eventuale|si corresponde|quando aplicável|nếu áp dụng)\b/iu.test(
        label,
      ),
    ) ||
    Object.values(row.labels).some((label) =>
      /\b(?:supplements|supplementi|suplementos)\b/iu.test(label),
    )
  ) {
    fail(`Unconditional compulsory-dinner meaning was softened: ${row.sourceRowID}`)
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
