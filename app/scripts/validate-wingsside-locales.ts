import 'dotenv/config'

import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

import config from '../src/payload.config'
import { createLocalReq, getPayload } from 'payload'
import type { Page } from '../src/payload-types'

import { publicLocales, type PublicLocaleCode } from '../src/i18n/publicCopy'
import {
  auditWingsSideLocaleContent,
  renderLocaleAuditMarkdown,
  type LocaleAuditInput,
} from './lib/localeContentAudit'
import { projectDiscoveryTour, type DiscoveryTourDoc } from '../src/tours/discoveryCore'
import { loadWingsSideTourEditorialCatalog } from './lib/wingsSideTourEditorialLocalization'
import {
  validateWingsSideTourPublicInventory,
  wingsSideTourPublicLocales,
  type WingsSideTourPublicLocale,
} from './lib/wingsSideTourEditorialProduction'

const relationID = (value: unknown): null | number | string => {
  if (typeof value === 'number' || typeof value === 'string') return value
  if (value && typeof value === 'object' && 'id' in value) {
    const id = (value as { id?: unknown }).id
    return typeof id === 'number' || typeof id === 'string' ? id : null
  }
  return null
}

const getArgumentValue = (name: string): string | undefined => {
  const inlineArgument = process.argv.find((argument) => argument.startsWith(`${name}=`))
  if (inlineArgument) return inlineArgument.split('=')[1]

  const index = process.argv.indexOf(name)
  if (index >= 0) return process.argv[index + 1]

  return undefined
}

const outputDirectory = getArgumentValue('--output-dir')

const payload = await getPayload({ config })
// Read-only audit: every query uses overrideAccess, so no admin user is seeded.
const req = await createLocalReq({}, payload)

const siteResult = await payload.find({
  collection: 'sites',
  depth: 0,
  limit: 1,
  locale: 'en',
  pagination: false,
  overrideAccess: true,
  req,
  where: {
    code: {
      equals: 'wing-side',
    },
  },
})

const site = siteResult.docs[0]

if (!site) {
  throw new Error('Could not find WingSide site record for locale validation.')
}

const input: LocaleAuditInput = {
  pagesByLocale: {},
  settingsByLocale: {},
}

for (const locale of publicLocales) {
  const pages = await payload.find({
    collection: 'pages',
    // Validate only fields owned by the localized page. Expanded relations can contain
    // captions and metadata from shared documents that this backfill does not own.
    depth: 0,
    fallbackLocale: false,
    limit: 1000,
    locale,
    pagination: false,
    overrideAccess: true,
    req,
    where: {
      site: {
        equals: site.id,
      },
    },
  })

  const settings = await payload.find({
    collection: 'site-settings',
    depth: 0,
    fallbackLocale: false,
    limit: 1,
    locale,
    pagination: false,
    overrideAccess: true,
    req,
    where: {
      site: {
        equals: site.id,
      },
    },
  })

  input.pagesByLocale[locale as PublicLocaleCode] = pages.docs
  input.settingsByLocale![locale as PublicLocaleCode] = settings.docs[0] || null
}

const result = auditWingsSideLocaleContent(input)
const editorialCatalog = await loadWingsSideTourEditorialCatalog()
const expectedTourSlugs = editorialCatalog.tours.map(({ slug }) => slug)
const listingSlugsByLocale = {} as Record<WingsSideTourPublicLocale, string[]>
const detailSlugsByLocale = {} as Record<WingsSideTourPublicLocale, string[]>

for (const locale of wingsSideTourPublicLocales) {
  const tours = await payload.find({
    collection: 'tour-products',
    depth: 2,
    draft: false,
    fallbackLocale: false,
    limit: 100,
    locale,
    pagination: false,
    overrideAccess: true,
    req,
    where: {
      and: [{ site: { equals: site.id } }, { _status: { equals: 'published' } }],
    },
  })
  const candidates = tours.docs as DiscoveryTourDoc[]
  const wrapperIDs = [
    ...new Set(
      candidates
        .map((tour) => relationID(tour.wrapperPage))
        .filter((id): id is number | string => id !== null),
    ),
  ]
  const wrappers =
    wrapperIDs.length > 0
      ? await payload.find({
          collection: 'pages',
          depth: 0,
          draft: false,
          fallbackLocale: false,
          limit: wrapperIDs.length,
          locale,
          pagination: false,
          overrideAccess: true,
          req,
          where: {
            and: [
              { id: { in: wrapperIDs } },
              { site: { equals: site.id } },
              { _status: { equals: 'published' } },
            ],
          },
        })
      : { docs: [] }
  const wrappersByID = new Map(
    (wrappers.docs as Page[]).map((wrapper) => [String(wrapper.id), wrapper]),
  )
  listingSlugsByLocale[locale] = candidates.flatMap((tour) => {
    const wrapperID = relationID(tour.wrapperPage)
    const card = projectDiscoveryTour({
      locale,
      site,
      tour: {
        ...tour,
        wrapperPage: wrapperID === null ? null : wrappersByID.get(String(wrapperID)) || null,
      },
    })
    return card ? [card.slug] : []
  })
  detailSlugsByLocale[locale] = candidates.flatMap((tour) => {
    const wrapperID = relationID(tour.wrapperPage)
    const wrapper = wrapperID === null ? null : wrappersByID.get(String(wrapperID))
    return tour.slug &&
      tour.title?.trim() &&
      tour.summary?.trim() &&
      wrapper?._status === 'published' &&
      typeof wrapper.title === 'string' &&
      wrapper.title.trim() &&
      Array.isArray(wrapper.layout)
      ? [tour.slug]
      : []
  })
}

const tourCatalogFindings = validateWingsSideTourPublicInventory({
  detailSlugsByLocale,
  expectedSlugs: expectedTourSlugs,
  listingSlugsByLocale,
})
const tourCatalog = {
  expectedTourCount: expectedTourSlugs.length,
  findings: tourCatalogFindings,
  listingCounts: Object.fromEntries(
    wingsSideTourPublicLocales.map((locale) => [locale, listingSlugsByLocale[locale].length]),
  ),
  ok: tourCatalogFindings.length === 0,
}
const combinedResult = { ...result, tourCatalog }
const json = JSON.stringify(combinedResult, null, 2)
const markdown = `${renderLocaleAuditMarkdown(result)}

## WingSide public tour catalog

| Locale | Listing count | Expected |
| --- | ---: | ---: |
${wingsSideTourPublicLocales
  .map(
    (locale) =>
      `| ${locale.toUpperCase()} | ${listingSlugsByLocale[locale].length} | ${expectedTourSlugs.length} |`,
  )
  .join('\n')}

${
  tourCatalog.ok
    ? 'PASS: all public locales expose the same 22 tours without fallback.'
    : `BLOCKED: ${tourCatalogFindings
        .map((finding) => `${finding.locale}: ${finding.message} (${finding.slugs.join(', ')})`)
        .join('; ')}`
}
`

if (outputDirectory) {
  const targetDirectory = resolve(outputDirectory)
  await mkdir(targetDirectory, { recursive: true })

  const jsonPath = resolve(targetDirectory, 'wingsside-locale-validation.json')
  const markdownPath = resolve(targetDirectory, 'wingsside-locale-validation.md')

  if (dirname(jsonPath) !== targetDirectory || dirname(markdownPath) !== targetDirectory) {
    throw new Error('Invalid output path.')
  }

  await writeFile(jsonPath, json)
  await writeFile(markdownPath, markdown)
}

console.log(markdown)

process.exit(result.ok && tourCatalog.ok ? 0 : 1)
