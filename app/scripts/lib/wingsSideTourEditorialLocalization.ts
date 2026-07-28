import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

export const wingsSideTourEditorialLocales = ['vi', 'it', 'es', 'pt'] as const
export type WingsSideTourEditorialLocale = (typeof wingsSideTourEditorialLocales)[number]

export type EditorialItineraryDay = {
  accommodation?: string
  dayNumber: number
  meals?: string
  route: string
  summary: string
  title: string
  transport?: string
}

export type EditorialTourContent = {
  excludes: string[]
  includes: string[]
  itineraryDays: EditorialItineraryDay[]
  meta: {
    breadcrumbLabel: string
    description: string
    title: string
  }
  primaryCTALabel: string
  routeSummary: string
  servicesSummary: {
    hotelSummary?: string
    mealsSummary?: string
    operatorNotes?: string
    transportSummary?: string
  }
  summary: string
  title: string
}

export type EditorialTourEntry = {
  locales: Record<WingsSideTourEditorialLocale, EditorialTourContent>
  slug: string
  sourceChecksum: string
}

export type WingsSideTourEditorialCatalog = {
  sourceLocale: 'en'
  targetLocales: WingsSideTourEditorialLocale[]
  tours: EditorialTourEntry[]
  version: 1
}

export type WingsSideTourEditorialLocaleFile = {
  locale: WingsSideTourEditorialLocale
  tours: Array<EditorialTourContent & { slug: string }>
  version: 1
  voice: 'calm-specific-consultative'
}

export type WingsSideTourEditorialSourceManifest = {
  generatedFrom: 'wing-side-published-en-tour-products'
  sourceLocale: 'en'
  tours: Array<{ checksum: string; slug: string }>
  version: 1
}

export type EditorialSourceDay = {
  accommodation?: null | string
  dayNumber: number
  meals?: null | string
  route?: null | string
  summary: string
  title: string
  transport?: null | string
}

export type EditorialSourceTour = {
  excludes?: Array<{ label?: null | string }> | null
  includes?: Array<{ label?: null | string }> | null
  itineraryDays?: EditorialSourceDay[] | null
  slug: string
  summary: string
  title: string
}

export type EditorialCatalogFinding = {
  locale?: WingsSideTourEditorialLocale
  message: string
  path: string
  slug?: string
}

const normalizeText = (value: unknown) =>
  String(value || '')
    .normalize('NFKC')
    .replace(/\s+/gu, ' ')
    .trim()

const comparableText = (value: unknown) =>
  normalizeText(value)
    .toLocaleLowerCase('en')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()

const sourceProjection = (tour: EditorialSourceTour) => ({
  excludes: (tour.excludes || []).map(({ label }) => normalizeText(label)),
  includes: (tour.includes || []).map(({ label }) => normalizeText(label)),
  itineraryDays: (tour.itineraryDays || []).map((day) => ({
    accommodation: normalizeText(day.accommodation),
    dayNumber: day.dayNumber,
    meals: normalizeText(day.meals),
    route: normalizeText(day.route),
    summary: normalizeText(day.summary),
    title: normalizeText(day.title),
    transport: normalizeText(day.transport),
  })),
  slug: normalizeText(tour.slug),
  summary: normalizeText(tour.summary),
  title: normalizeText(tour.title),
})

export const editorialSourceChecksum = (tour: EditorialSourceTour) =>
  crypto
    .createHash('sha256')
    .update(JSON.stringify(sourceProjection(tour)))
    .digest('hex')

const sourceBrandPattern = /\b(?:best\s*price(?:\s+travel)?|bestpricetravel)\b/iu
const rawMealPattern = /(?:^|[;,]\s*)(?:n\/?a|none)(?=\s*[;,]|$)/iu

const requiredText = ({
  findings,
  locale,
  path,
  slug,
  value,
}: {
  findings: EditorialCatalogFinding[]
  locale: WingsSideTourEditorialLocale
  path: string
  slug: string
  value: unknown
}) => {
  const text = normalizeText(value)
  if (!text) {
    findings.push({ locale, message: 'Localized text is required', path, slug })
    return
  }
  if (sourceBrandPattern.test(text)) {
    findings.push({ locale, message: 'Source-brand language is not allowed', path, slug })
  }
}

const rejectVerbatimFallback = ({
  findings,
  locale,
  localized,
  path,
  slug,
  source,
}: {
  findings: EditorialCatalogFinding[]
  locale: WingsSideTourEditorialLocale
  localized: unknown
  path: string
  slug: string
  source: unknown
}) => {
  const localizedComparable = comparableText(localized)
  const sourceComparable = comparableText(source)
  if (
    sourceComparable.length >= 20 &&
    localizedComparable.length >= 20 &&
    sourceComparable === localizedComparable
  ) {
    findings.push({ locale, message: 'Verbatim English fallback is not allowed', path, slug })
  }
}

export const validateWingsSideTourEditorialCatalog = ({
  catalog,
  sourceTours,
}: {
  catalog: WingsSideTourEditorialCatalog
  sourceTours: EditorialSourceTour[]
}): EditorialCatalogFinding[] => {
  const findings: EditorialCatalogFinding[] = []
  const sourceBySlug = new Map(sourceTours.map((tour) => [tour.slug, tour]))
  const catalogBySlug = new Map<string, EditorialTourEntry>()

  if (catalog.version !== 1 || catalog.sourceLocale !== 'en') {
    findings.push({
      message: 'Catalog version/source locale contract is invalid',
      path: '$',
    })
  }
  if (JSON.stringify(catalog.targetLocales) !== JSON.stringify(wingsSideTourEditorialLocales)) {
    findings.push({
      message: 'Catalog target locale order must be vi,it,es,pt',
      path: '$.targetLocales',
    })
  }

  for (const entry of catalog.tours) {
    if (catalogBySlug.has(entry.slug)) {
      findings.push({
        message: 'Duplicate tour slug in localization catalog',
        path: '$.tours',
        slug: entry.slug,
      })
      continue
    }
    catalogBySlug.set(entry.slug, entry)
  }

  for (const source of sourceTours) {
    const entry = catalogBySlug.get(source.slug)
    if (!entry) {
      findings.push({
        message: 'Source tour is missing from localization catalog',
        path: '$.tours',
        slug: source.slug,
      })
      continue
    }
    if (entry.sourceChecksum !== editorialSourceChecksum(source)) {
      findings.push({
        message: 'English source content changed after editorial localization',
        path: '$.sourceChecksum',
        slug: source.slug,
      })
    }

    let localizedServiceShape: null | string = null
    for (const locale of wingsSideTourEditorialLocales) {
      const content = entry.locales?.[locale]
      if (!content) {
        findings.push({
          locale,
          message: 'Target locale is missing',
          path: `$.locales.${locale}`,
          slug: source.slug,
        })
        continue
      }

      for (const [path, value] of [
        ['title', content.title],
        ['summary', content.summary],
        ['routeSummary', content.routeSummary],
        ['primaryCTALabel', content.primaryCTALabel],
        ['meta.title', content.meta?.title],
        ['meta.description', content.meta?.description],
        ['meta.breadcrumbLabel', content.meta?.breadcrumbLabel],
      ] as const) {
        requiredText({ findings, locale, path, slug: source.slug, value })
      }

      rejectVerbatimFallback({
        findings,
        locale,
        localized: content.title,
        path: 'title',
        slug: source.slug,
        source: source.title,
      })
      rejectVerbatimFallback({
        findings,
        locale,
        localized: content.summary,
        path: 'summary',
        slug: source.slug,
        source: source.summary,
      })

      const sourceDays = source.itineraryDays || []
      if (content.itineraryDays.length !== sourceDays.length) {
        findings.push({
          locale,
          message: `Itinerary day count changed (${content.itineraryDays.length} != ${sourceDays.length})`,
          path: 'itineraryDays',
          slug: source.slug,
        })
      }
      content.itineraryDays.forEach((day, index) => {
        const sourceDay = sourceDays[index]
        if (!sourceDay || day.dayNumber !== sourceDay.dayNumber) {
          findings.push({
            locale,
            message: 'Itinerary day number/order changed',
            path: `itineraryDays.${index}.dayNumber`,
            slug: source.slug,
          })
        }
        for (const [field, value] of [
          ['title', day.title],
          ['route', day.route],
          ['summary', day.summary],
        ] as const) {
          const path = `itineraryDays.${index}.${field}`
          requiredText({ findings, locale, path, slug: source.slug, value })
          rejectVerbatimFallback({
            findings,
            locale,
            localized: value,
            path,
            slug: source.slug,
            source: sourceDay?.[field],
          })
        }
        for (const field of ['meals', 'transport', 'accommodation'] as const) {
          const sourceValue = sourceDay?.[field]
          if (!normalizeText(sourceValue)) continue
          const path = `itineraryDays.${index}.${field}`
          requiredText({
            findings,
            locale,
            path,
            slug: source.slug,
            value: day[field],
          })
          rejectVerbatimFallback({
            findings,
            locale,
            localized: day[field],
            path,
            slug: source.slug,
            source: sourceValue,
          })
          if (field === 'meals' && rawMealPattern.test(normalizeText(day[field]))) {
            findings.push({
              locale,
              message: 'Meals must be authored per day without raw NA/None markers',
              path,
              slug: source.slug,
            })
          }
        }
      })

      const sourceIncludes = source.includes || []
      const sourceExcludes = source.excludes || []
      if (
        sourceIncludes.length + sourceExcludes.length > 0 &&
        content.includes.length + content.excludes.length === 0
      ) {
        findings.push({
          locale,
          message: 'Localized service inventory is empty',
          path: 'includes/excludes',
          slug: source.slug,
        })
      }
      const serviceShape = `${content.includes.length}/${content.excludes.length}`
      if (localizedServiceShape === null) {
        localizedServiceShape = serviceShape
      } else if (serviceShape !== localizedServiceShape) {
        findings.push({
          locale,
          message: 'Localized service classification cardinality differs between locales',
          path: 'includes/excludes',
          slug: source.slug,
        })
      }
      content.includes.forEach((value, index) =>
        requiredText({
          findings,
          locale,
          path: `includes.${index}`,
          slug: source.slug,
          value,
        }),
      )
      content.excludes.forEach((value, index) =>
        requiredText({
          findings,
          locale,
          path: `excludes.${index}`,
          slug: source.slug,
          value,
        }),
      )
      for (const field of [
        'hotelSummary',
        'mealsSummary',
        'transportSummary',
        'operatorNotes',
      ] as const) {
        requiredText({
          findings,
          locale,
          path: `servicesSummary.${field}`,
          slug: source.slug,
          value: content.servicesSummary?.[field],
        })
      }
    }
  }

  for (const entry of catalog.tours) {
    if (!sourceBySlug.has(entry.slug)) {
      findings.push({
        message: 'Catalog contains a tour outside the exact source inventory',
        path: '$.tours',
        slug: entry.slug,
      })
    }
  }

  return findings
}

const parseLocaleFile = (
  value: unknown,
  expectedLocale: WingsSideTourEditorialLocale,
): WingsSideTourEditorialLocaleFile => {
  const file = value as Partial<WingsSideTourEditorialLocaleFile>
  if (
    file.version !== 1 ||
    file.locale !== expectedLocale ||
    file.voice !== 'calm-specific-consultative' ||
    !Array.isArray(file.tours)
  ) {
    throw new Error(`Invalid WingSide editorial locale file: ${expectedLocale}`)
  }
  return file as WingsSideTourEditorialLocaleFile
}

export const buildWingsSideTourEditorialCatalog = ({
  localeFiles,
  manifest,
}: {
  localeFiles: WingsSideTourEditorialLocaleFile[]
  manifest: WingsSideTourEditorialSourceManifest
}): WingsSideTourEditorialCatalog => {
  if (
    manifest.version !== 1 ||
    manifest.sourceLocale !== 'en' ||
    manifest.generatedFrom !== 'wing-side-published-en-tour-products'
  ) {
    throw new Error('Invalid WingSide editorial source manifest')
  }

  const fileByLocale = new Map(localeFiles.map((file) => [file.locale, file]))
  if (
    fileByLocale.size !== wingsSideTourEditorialLocales.length ||
    wingsSideTourEditorialLocales.some((locale) => !fileByLocale.has(locale))
  ) {
    throw new Error('WingSide editorial catalog requires exactly vi,it,es,pt locale files')
  }

  const manifestSlugs = manifest.tours.map(({ slug }) => slug)
  if (new Set(manifestSlugs).size !== manifestSlugs.length) {
    throw new Error('WingSide editorial source manifest contains duplicate slugs')
  }

  const localeTourMaps = new Map(
    wingsSideTourEditorialLocales.map((locale) => {
      const file = fileByLocale.get(locale)!
      const tourMap = new Map(file.tours.map((tour) => [tour.slug, tour]))
      if (tourMap.size !== file.tours.length) {
        throw new Error(`WingSide editorial ${locale} file contains duplicate slugs`)
      }
      const fileSlugs = [...tourMap.keys()].sort()
      const expectedSlugs = [...manifestSlugs].sort()
      if (JSON.stringify(fileSlugs) !== JSON.stringify(expectedSlugs)) {
        throw new Error(`WingSide editorial ${locale} slug inventory does not match source`)
      }
      return [locale, tourMap] as const
    }),
  )

  return {
    sourceLocale: 'en',
    targetLocales: [...wingsSideTourEditorialLocales],
    tours: manifest.tours.map(({ checksum, slug }) => ({
      locales: Object.fromEntries(
        wingsSideTourEditorialLocales.map((locale) => {
          const { slug: _slug, ...content } = localeTourMaps.get(locale)!.get(slug)!
          return [locale, content]
        }),
      ) as Record<WingsSideTourEditorialLocale, EditorialTourContent>,
      slug,
      sourceChecksum: checksum,
    })),
    version: 1,
  }
}

export const loadWingsSideTourEditorialCatalog = async ({
  dataDirectory = path.resolve(import.meta.dirname, '..', 'data', 'wingsside-tour-editorial'),
}: {
  dataDirectory?: string
} = {}): Promise<WingsSideTourEditorialCatalog> => {
  const [manifestRaw, ...localeRaw] = await Promise.all([
    fs.readFile(path.join(dataDirectory, 'source-manifest.json'), 'utf8'),
    ...wingsSideTourEditorialLocales.map((locale) =>
      fs.readFile(path.join(dataDirectory, `${locale}.json`), 'utf8'),
    ),
  ])
  const manifest = JSON.parse(manifestRaw) as WingsSideTourEditorialSourceManifest
  const localeFiles = localeRaw.map((raw, index) =>
    parseLocaleFile(JSON.parse(raw), wingsSideTourEditorialLocales[index]!),
  )
  return buildWingsSideTourEditorialCatalog({ localeFiles, manifest })
}

export const assertWingsSideTourEditorialCatalog = (input: {
  catalog: WingsSideTourEditorialCatalog
  sourceTours: EditorialSourceTour[]
}) => {
  const findings = validateWingsSideTourEditorialCatalog(input)
  if (findings.length) {
    throw new Error(`WingSide tour editorial catalog failed: ${JSON.stringify(findings)}`)
  }
}
