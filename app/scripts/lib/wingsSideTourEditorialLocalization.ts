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

export type EditorialServiceBucket = 'excludes' | 'includes'

export type LocalizedServiceRow = {
  label: string
  sourceRowID: string
  targetBucket: EditorialServiceBucket
}

export type PricingDisposition = {
  approvalArtifactID: string
  approvedAt: string
  approvedBy: string
  approvedTargetBucket: EditorialServiceBucket
  rationale: string
  slug: string
  sourceBucket: EditorialServiceBucket
  sourceLabel: string
  sourceLabelChecksum: string
  sourceRowID: string
}

export type PricingApprovalManifest = {
  approvalArtifactID: string
  approvedAt: string
  approvedBy: string
  checksum: string
  expectedPricingDisclosureCount: number
  trustedApprovers: string[]
  version: 1
}

export type GovernedPricingLocaleLabels = {
  labels: Record<WingsSideTourEditorialLocale, string>
  slug: string
  sourceRowID: string
}

export type PricingApprovalSnapshot = {
  governedLocaleLabels: GovernedPricingLocaleLabels[]
  manifest: Omit<PricingApprovalManifest, 'checksum'>
  pricingDispositions: PricingDisposition[]
}

export type EditorialTourContent = {
  excludes: LocalizedServiceRow[]
  includes: LocalizedServiceRow[]
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
  approvalManifest: PricingApprovalManifest
  pricingDispositions: PricingDisposition[]
  sourceLocale: 'en'
  targetLocales: WingsSideTourEditorialLocale[]
  tours: EditorialTourEntry[]
  version: 2
}

export const wingsSideCanonicalPricingDisclosureCount = 38

type LegacyEditorialTourContent = Omit<EditorialTourContent, 'excludes' | 'includes'> & {
  excludes: string[]
  includes: string[]
}

export type WingsSideTourEditorialLocaleFile = {
  locale: WingsSideTourEditorialLocale
  tours: Array<LegacyEditorialTourContent & { slug: string }>
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
  excludes?: Array<{ id?: null | number | string; label?: null | string }> | null
  includes?: Array<{ id?: null | number | string; label?: null | string }> | null
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

const stableJSONStringify = (value: unknown): string => {
  if (value === undefined) return '"__undefined__"'
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stableJSONStringify).join(',')}]`
  const object = value as Record<string, unknown>
  return `{${Object.keys(object)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableJSONStringify(object[key])}`)
    .join(',')}}`
}

const sha256 = (value: unknown) =>
  crypto.createHash('sha256').update(stableJSONStringify(value)).digest('hex')

const validISOTimestamp = (value: unknown) => {
  const normalized = normalizeText(value)
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(normalized)) return false
  const date = new Date(normalized)
  return !Number.isNaN(date.valueOf()) && date.toISOString() === normalized
}

const comparableText = (value: unknown) =>
  normalizeText(value)
    .toLocaleLowerCase('en')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()

const sourceProjection = (tour: EditorialSourceTour) => ({
  excludes: (tour.excludes || []).map(({ id, label }) => ({
    id: normalizeText(id),
    label: normalizeText(label),
  })),
  includes: (tour.includes || []).map(({ id, label }) => ({
    id: normalizeText(id),
    label: normalizeText(label),
  })),
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

export const editorialServiceLabelChecksum = (label: unknown) =>
  crypto.createHash('sha256').update(normalizeText(label)).digest('hex')

const governedLocaleLabels = (
  catalog: Pick<WingsSideTourEditorialCatalog, 'pricingDispositions' | 'tours'>,
): GovernedPricingLocaleLabels[] =>
  [...catalog.pricingDispositions]
    .sort((left, right) =>
      `${left.slug}:${left.sourceRowID}`.localeCompare(`${right.slug}:${right.sourceRowID}`),
    )
    .map(({ slug, sourceRowID }) => {
      const tour = catalog.tours.find((entry) => entry.slug === slug)
      return {
        labels: Object.fromEntries(
          wingsSideTourEditorialLocales.map((locale) => {
            const content = tour?.locales?.[locale]
            const row = [...(content?.includes || []), ...(content?.excludes || [])].find(
              (candidate) => candidate.sourceRowID === sourceRowID,
            )
            return [locale, normalizeText(row?.label)]
          }),
        ) as Record<WingsSideTourEditorialLocale, string>,
        slug,
        sourceRowID,
      }
    })

export const buildEditorialPricingApprovalSnapshot = (
  catalog: Pick<WingsSideTourEditorialCatalog, 'approvalManifest' | 'pricingDispositions' | 'tours'>,
): PricingApprovalSnapshot => ({
    manifest: {
      approvalArtifactID: catalog.approvalManifest.approvalArtifactID,
      approvedAt: catalog.approvalManifest.approvedAt,
      approvedBy: catalog.approvalManifest.approvedBy,
      expectedPricingDisclosureCount:
        catalog.approvalManifest.expectedPricingDisclosureCount,
      trustedApprovers: [...catalog.approvalManifest.trustedApprovers].sort(),
      version: catalog.approvalManifest.version,
    },
    pricingDispositions: [...catalog.pricingDispositions].sort((left, right) =>
      `${left.slug}:${left.sourceRowID}`.localeCompare(`${right.slug}:${right.sourceRowID}`),
    ),
    governedLocaleLabels: governedLocaleLabels(catalog),
  })

export const editorialPricingApprovalSnapshotChecksum = (snapshot: PricingApprovalSnapshot) =>
  sha256(snapshot)

export const editorialPricingApprovalChecksum = (
  catalog: Pick<WingsSideTourEditorialCatalog, 'approvalManifest' | 'pricingDispositions' | 'tours'>,
) => editorialPricingApprovalSnapshotChecksum(buildEditorialPricingApprovalSnapshot(catalog))

const sourceBrandPattern = /\b(?:best\s*price(?:\s+travel)?|bestpricetravel)\b/iu
const rawMealPattern = /(?:^|[;,]\s*)(?:n\/?a|none)(?=\s*[;,]|$)/iu
const peakServicePattern = /\b(?:peak|high) season\b|\bfuel surcharge\b|\bcompulsory dinner\b/iu

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
  const approvalManifest = catalog.approvalManifest as Partial<PricingApprovalManifest> | undefined
  const trustedApprovers = new Set(
    Array.isArray(approvalManifest?.trustedApprovers)
      ? approvalManifest.trustedApprovers.map(normalizeText).filter(Boolean)
      : [],
  )

  if (catalog.version !== 2 || catalog.sourceLocale !== 'en') {
    findings.push({
      message: 'Catalog version/source locale contract is invalid',
      path: '$',
    })
  }
  if (
    approvalManifest?.version !== 1 ||
    !normalizeText(approvalManifest.approvalArtifactID) ||
    !normalizeText(approvalManifest.approvedBy) ||
    !validISOTimestamp(approvalManifest.approvedAt) ||
    trustedApprovers.size === 0 ||
    !trustedApprovers.has(normalizeText(approvalManifest.approvedBy))
  ) {
    findings.push({
      message: 'Pricing approval manifest identity, timestamp, or trusted approver is invalid',
      path: '$.approvalManifest',
    })
  }
  if (
    !Number.isSafeInteger(approvalManifest?.expectedPricingDisclosureCount) ||
    approvalManifest!.expectedPricingDisclosureCount! < 0 ||
    approvalManifest?.expectedPricingDisclosureCount !== catalog.pricingDispositions?.length
  ) {
    findings.push({
      message: 'Pricing disclosure count does not match the approval manifest',
      path: '$.approvalManifest.expectedPricingDisclosureCount',
    })
  }
  const dispositionByKey = new Map<string, PricingDisposition>()
  for (const disposition of catalog.pricingDispositions || []) {
    const key = `${disposition.slug}:${disposition.sourceRowID}`
    if (dispositionByKey.has(key)) {
      findings.push({
        message: 'Duplicate pricing disposition',
        path: '$.pricingDispositions',
        slug: disposition.slug,
      })
      continue
    }
    dispositionByKey.set(key, disposition)
    if (
      !normalizeText(disposition.approvalArtifactID) ||
      disposition.approvalArtifactID !== approvalManifest?.approvalArtifactID ||
      !validISOTimestamp(disposition.approvedAt) ||
      !trustedApprovers.has(normalizeText(disposition.approvedBy))
    ) {
      findings.push({
        message: 'Pricing disposition approval evidence is invalid or untrusted',
        path: '$.pricingDispositions',
        slug: disposition.slug,
      })
    }
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
    const sourceRows = [
      ...(source.includes || []).map((row) => ({
        bucket: 'includes' as const,
        id: normalizeText(row.id),
        label: normalizeText(row.label),
      })),
      ...(source.excludes || []).map((row) => ({
        bucket: 'excludes' as const,
        id: normalizeText(row.id),
        label: normalizeText(row.label),
      })),
    ]
    const sourceIDs = sourceRows.map(({ id }) => id)
    if (sourceIDs.some((id) => !id)) {
      findings.push({
        message: 'Source service row is missing a stable ID',
        path: 'includes/excludes',
        slug: source.slug,
      })
    }
    if (new Set(sourceIDs).size !== sourceIDs.length) {
      findings.push({
        message: 'Source service row IDs must be unique',
        path: 'includes/excludes',
        slug: source.slug,
      })
    }

    let localizedServiceDisposition: null | string = null
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

      const localizedRows = [
        ...(content.includes || []).map((row) => ({
          ...row,
          actualBucket: 'includes' as const,
        })),
        ...(content.excludes || []).map((row) => ({
          ...row,
          actualBucket: 'excludes' as const,
        })),
      ]
      const localizedIDs = localizedRows.map(({ sourceRowID }) => normalizeText(sourceRowID))
      if (
        localizedIDs.length !== sourceIDs.length ||
        new Set(localizedIDs).size !== localizedIDs.length ||
        sourceIDs.some((id) => !localizedIDs.includes(id)) ||
        localizedIDs.some((id) => !sourceIDs.includes(id))
      ) {
        findings.push({
          locale,
          message: 'Localized service rows must contain every unique source row ID exactly once',
          path: 'includes/excludes',
          slug: source.slug,
        })
      }
      for (const [index, row] of localizedRows.entries()) {
        requiredText({
          findings,
          locale,
          path: `${row.actualBucket}.${index}.label`,
          slug: source.slug,
          value: row.label,
        })
        if (row.targetBucket !== row.actualBucket) {
          findings.push({
            locale,
            message: 'Localized service targetBucket must match its containing bucket',
            path: `${row.actualBucket}.${index}.targetBucket`,
            slug: source.slug,
          })
        }
        const sourceRow = sourceRows.find(({ id }) => id === normalizeText(row.sourceRowID))
        if (!sourceRow) continue
        const disposition = dispositionByKey.get(`${source.slug}:${sourceRow.id}`)
        const requiresDisposition =
          sourceRow.bucket !== row.targetBucket || peakServicePattern.test(sourceRow.label)
        if (!requiresDisposition) continue
        if (
          !disposition ||
          disposition.sourceBucket !== sourceRow.bucket ||
          normalizeText(disposition.sourceLabel) !== sourceRow.label ||
          disposition.sourceLabelChecksum !== editorialServiceLabelChecksum(sourceRow.label) ||
          disposition.approvedTargetBucket !== row.targetBucket ||
          !normalizeText(disposition.rationale) ||
          !normalizeText(disposition.approvedBy) ||
          !normalizeText(disposition.approvedAt)
        ) {
          findings.push({
            locale,
            message: 'Service row requires a complete approved pricing disposition',
            path: `${row.actualBucket}.${index}`,
            slug: source.slug,
          })
        }
      }
      const serviceDisposition = editorialSourceChecksum({
        itineraryDays: [],
        slug: source.slug,
        summary: '',
        title: '',
        includes: localizedRows
          .filter(({ targetBucket }) => targetBucket === 'includes')
          .map(({ sourceRowID }) => ({ id: sourceRowID, label: '' })),
        excludes: localizedRows
          .filter(({ targetBucket }) => targetBucket === 'excludes')
          .map(({ sourceRowID }) => ({ id: sourceRowID, label: '' })),
      })
      if (localizedServiceDisposition === null) {
        localizedServiceDisposition = serviceDisposition
      } else if (serviceDisposition !== localizedServiceDisposition) {
        findings.push({
          locale,
          message: 'Localized service classification differs between locales',
          path: 'includes/excludes',
          slug: source.slug,
        })
      }
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

  for (const disposition of catalog.pricingDispositions || []) {
    const source = sourceBySlug.get(disposition.slug)
    const sourceRows = source
      ? [
          ...(source.includes || []).map((row) => ({ bucket: 'includes' as const, row })),
          ...(source.excludes || []).map((row) => ({ bucket: 'excludes' as const, row })),
        ]
      : []
    const match = sourceRows.find(({ row }) => normalizeText(row.id) === disposition.sourceRowID)
    if (!match) {
      findings.push({
        message: 'Pricing disposition references an unknown source row ID',
        path: '$.pricingDispositions',
        slug: disposition.slug,
      })
    } else {
      const sourceLabel = normalizeText(match.row.label)
      if (
        match.bucket !== disposition.sourceBucket ||
        sourceLabel !== normalizeText(disposition.sourceLabel) ||
        editorialServiceLabelChecksum(sourceLabel) !== disposition.sourceLabelChecksum
      ) {
        findings.push({
          message: 'Pricing disposition source label or checksum drifted',
          path: '$.pricingDispositions',
          slug: disposition.slug,
        })
      }
    }
    const tour = catalogBySlug.get(disposition.slug)
    const missingLocale = wingsSideTourEditorialLocales.find((locale) => {
      const content = tour?.locales?.[locale]
      const rows = [...(content?.includes || []), ...(content?.excludes || [])]
      const localized = rows.find(({ sourceRowID }) => sourceRowID === disposition.sourceRowID)
      return !localized || !normalizeText(localized.label)
    })
    if (missingLocale) {
      findings.push({
        locale: missingLocale,
        message: 'Governed pricing row requires an approved label in every target locale',
        path: '$.pricingDispositions',
        slug: disposition.slug,
      })
    }
  }

  if (
    approvalManifest &&
    approvalManifest.checksum !== editorialPricingApprovalChecksum(catalog)
  ) {
    findings.push({
      message: 'Pricing approval manifest checksum mismatch',
      path: '$.approvalManifest.checksum',
    })
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

export const parseWingsSideTourEditorialCatalogV2 = (
  value: unknown,
  {
    expectedPricingDisclosureCount,
  }: {
    expectedPricingDisclosureCount?: number
  } = {},
): WingsSideTourEditorialCatalog => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Invalid WingSide editorial catalog v2')
  }
  const catalog = value as WingsSideTourEditorialCatalog
  if (
    catalog.version !== 2 ||
    catalog.sourceLocale !== 'en' ||
    !Array.isArray(catalog.targetLocales) ||
    JSON.stringify(catalog.targetLocales) !== JSON.stringify(wingsSideTourEditorialLocales) ||
    !Array.isArray(catalog.tours) ||
    !Array.isArray(catalog.pricingDispositions) ||
    !catalog.approvalManifest ||
    catalog.approvalManifest.version !== 1 ||
    !Array.isArray(catalog.approvalManifest.trustedApprovers)
  ) {
    throw new Error('Invalid WingSide editorial catalog v2')
  }
  const requiredCount =
    expectedPricingDisclosureCount ?? catalog.approvalManifest.expectedPricingDisclosureCount
  if (
    !Number.isSafeInteger(requiredCount) ||
    requiredCount < 0 ||
    catalog.approvalManifest.expectedPricingDisclosureCount !== requiredCount ||
    catalog.pricingDispositions.length !== requiredCount
  ) {
    throw new Error(`WingSide editorial catalog v2 requires exactly ${requiredCount} approvals`)
  }
  const trustedApprovers = new Set(
    catalog.approvalManifest.trustedApprovers.map(normalizeText).filter(Boolean),
  )
  if (
    !normalizeText(catalog.approvalManifest.approvalArtifactID) ||
    !validISOTimestamp(catalog.approvalManifest.approvedAt) ||
    !trustedApprovers.has(normalizeText(catalog.approvalManifest.approvedBy)) ||
    catalog.pricingDispositions.some(
      (disposition) =>
        !normalizeText(disposition.approvalArtifactID) ||
        disposition.approvalArtifactID !== catalog.approvalManifest.approvalArtifactID ||
        !validISOTimestamp(disposition.approvedAt) ||
        !trustedApprovers.has(normalizeText(disposition.approvedBy)),
    )
  ) {
    throw new Error('WingSide editorial catalog v2 contains invalid approval evidence')
  }
  const incompleteGovernedRow = governedLocaleLabels(catalog).find(({ labels }) =>
    wingsSideTourEditorialLocales.some((locale) => !normalizeText(labels[locale])),
  )
  if (incompleteGovernedRow) {
    throw new Error(
      `WingSide editorial catalog v2 governed row lacks four locale labels: ${incompleteGovernedRow.slug}:${incompleteGovernedRow.sourceRowID}`,
    )
  }
  if (catalog.approvalManifest.checksum !== editorialPricingApprovalChecksum(catalog)) {
    throw new Error('WingSide editorial catalog v2 approval checksum mismatch')
  }
  return catalog
}

export const buildWingsSideTourEditorialCatalogV2 =
  parseWingsSideTourEditorialCatalogV2

export const buildWingsSideTourEditorialCatalog = ({
  localeFiles,
  manifest,
}: {
  localeFiles: WingsSideTourEditorialLocaleFile[]
  manifest: WingsSideTourEditorialSourceManifest
}): never => {
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

  for (const locale of wingsSideTourEditorialLocales) {
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
  }

  throw new Error(
    'Unsafe v1 positional locale files cannot build catalog v2; migrate rows to stable sourceRowID and approved dispositions',
  )
}

export const loadWingsSideTourEditorialCatalog = async ({
  catalogPath,
  dataDirectory = path.resolve(import.meta.dirname, '..', 'data', 'wingsside-tour-editorial'),
  expectedPricingDisclosureCount = wingsSideCanonicalPricingDisclosureCount,
  sourceTours,
}: {
  catalogPath?: string
  dataDirectory?: string
  expectedPricingDisclosureCount?: number
  sourceTours?: EditorialSourceTour[]
} = {}): Promise<WingsSideTourEditorialCatalog> => {
  if (catalogPath) {
    const catalog = parseWingsSideTourEditorialCatalogV2(
      JSON.parse(await fs.readFile(path.resolve(catalogPath), 'utf8')),
      { expectedPricingDisclosureCount },
    )
    if (sourceTours) assertWingsSideTourEditorialCatalog({ catalog, sourceTours })
    return catalog
  }
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
