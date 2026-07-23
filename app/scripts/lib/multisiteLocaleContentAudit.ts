import type { SupportedLocaleCode } from '../../src/utilities/locales'

export type LocaleContentAuditStatus =
  | 'translated'
  | 'fallback-approved'
  | 'missing'
  | 'placeholder'
  | 'mixed-language'
  | 'needs-editorial-review'

export type LocaleContentAuditRow = {
  evidence?: Array<{
    marker: string
    value: string
  }>
  locale: SupportedLocaleCode
  notes: string[]
  path: string
  site: string
  source: 'page' | 'site-settings'
  status: LocaleContentAuditStatus
}

export type LocaleContentAuditSummary = {
  bySite: Record<
    string,
    {
      byLocale: Record<
        string,
        {
          fallbackApproved: number
          missing: number
          mixedLanguage: number
          needsEditorialReview: number
          placeholder: number
          translated: number
        }
      >
    }
  >
  totals: {
    fallbackApproved: number
    missing: number
    mixedLanguage: number
    needsEditorialReview: number
    placeholder: number
    translated: number
  }
}

type AuditDoc = {
  layout?: unknown
  meta?: unknown
  pathname?: null | string
  slug?: null | string
  title?: null | string
}

const visibleStringKeys = new Set([
  'breadcrumbLabel',
  'defaultDescription',
  'defaultTitle',
  'description',
  'eyebrow',
  'footerNote',
  'heading',
  'label',
  'meta',
  'paragraph',
  'quote',
  'role',
  'sideBody',
  'sideTitle',
  'summary',
  'tagline',
  'text',
  'title',
  'titleSuffix',
  'value',
])

const placeholderMarkers = [
  /^page$/i,
  /^trang$/i,
  /\bplaceholder\b/i,
  /\bTODO\b/,
  /Need a tailored route/i,
  /Destination pages should/i,
  /Travel style pages should/i,
]

const mixedLanguageMarkers = [
  /\binbound\b/i,
  /\btrust-first\b/i,
  /\bsample itinerary\b/i,
  /\bplanning brief\b/i,
  /\btravel style\b/i,
]

const normalize = (value: string) => value.replace(/\s+/g, ' ').trim()

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const collectVisibleStrings = (
  value: unknown,
  result: string[],
  key?: string,
) => {
  if (typeof value === 'string') {
    if (key && visibleStringKeys.has(key)) {
      const normalized = normalize(value)
      if (normalized) result.push(normalized)
    }
    return
  }

  if (Array.isArray(value)) {
    value.forEach((entry) => collectVisibleStrings(entry, result, key))
    return
  }

  if (!isPlainObject(value)) return

  for (const [entryKey, entryValue] of Object.entries(value)) {
    collectVisibleStrings(entryValue, result, entryKey)
  }
}

const getDocPath = (page: AuditDoc): string => {
  if (typeof page.pathname === 'string' && page.pathname) return page.pathname
  if (page.slug === 'home') return '/'
  if (page.slug) return `/${page.slug}`
  return '/'
}

const getDocStrings = (doc: unknown): string[] => {
  const strings: string[] = []
  collectVisibleStrings(doc, strings)
  return strings
}

const getMarkerMatches = (strings: string[], patterns: RegExp[]) =>
  strings.flatMap((value) =>
    patterns.flatMap((pattern) =>
      pattern.test(value)
        ? [
            {
              marker: String(pattern),
              value,
            },
          ]
        : [],
    ),
  )

const containsMarker = (strings: string[], patterns: RegExp[]) =>
  strings.some((value) => patterns.some((pattern) => pattern.test(value)))

const buildSignature = (doc: unknown) =>
  getDocStrings(doc)
    .slice(0, 20)
    .join(' | ')

export const classifyLocaleDocument = ({
  defaultDoc,
  doc,
  defaultLocale,
  locale,
}: {
  defaultDoc?: null | unknown
  defaultLocale?: null | SupportedLocaleCode
  doc?: null | unknown
  locale: SupportedLocaleCode
}): {
  evidence?: Array<{
    marker: string
    value: string
  }>
  notes: string[]
  status: LocaleContentAuditStatus
} => {
  const notes: string[] = []

  if (!doc) {
    if (defaultDoc) {
      return {
        notes: ['Localized document missing; default-locale fallback is currently expected.'],
        status: 'fallback-approved',
      }
    }

    return {
      notes: ['Document missing in both requested locale and default locale.'],
      status: 'missing',
    }
  }

  const strings = getDocStrings(doc)
  const placeholderMatches = getMarkerMatches(strings, placeholderMarkers)

  if (placeholderMatches.length > 0) {
    return {
      evidence: placeholderMatches.slice(0, 5),
      notes: ['Placeholder or implementation marker detected in visible copy.'],
      status: 'placeholder',
    }
  }

  const mixedLanguageMatches =
    locale !== 'en' ? getMarkerMatches(strings, mixedLanguageMarkers) : []

  if (mixedLanguageMatches.length > 0) {
    notes.push('Generic English travel/editorial markers still visible in non-English locale.')
  }

  if (defaultDoc && defaultLocale && locale !== defaultLocale) {
    const localizedSignature = buildSignature(doc)
    const defaultSignature = buildSignature(defaultDoc)
    if (localizedSignature && defaultSignature && localizedSignature === defaultSignature) {
      return {
        notes: ['Visible copy is identical to the default locale and needs editorial review.'],
        status: 'needs-editorial-review',
      }
    }
  }

  if (notes.length > 0) {
    return {
      evidence: mixedLanguageMatches.slice(0, 5),
      notes,
      status: 'mixed-language',
    }
  }

  return {
    notes: ['Localized document present without placeholder markers.'],
    status: 'translated',
  }
}

export const summarizeLocaleAuditRows = (rows: LocaleContentAuditRow[]): LocaleContentAuditSummary => {
  const totals = {
    fallbackApproved: 0,
    missing: 0,
    mixedLanguage: 0,
    needsEditorialReview: 0,
    placeholder: 0,
    translated: 0,
  }

  const bySite: LocaleContentAuditSummary['bySite'] = {}

  for (const row of rows) {
    const siteSummary =
      bySite[row.site] ||
      (bySite[row.site] = {
        byLocale: {},
      })
    const localeSummary =
      siteSummary.byLocale[row.locale] ||
      (siteSummary.byLocale[row.locale] = {
        fallbackApproved: 0,
        missing: 0,
        mixedLanguage: 0,
        needsEditorialReview: 0,
        placeholder: 0,
        translated: 0,
      })

    switch (row.status) {
      case 'fallback-approved':
        localeSummary.fallbackApproved += 1
        totals.fallbackApproved += 1
        break
      case 'missing':
        localeSummary.missing += 1
        totals.missing += 1
        break
      case 'mixed-language':
        localeSummary.mixedLanguage += 1
        totals.mixedLanguage += 1
        break
      case 'needs-editorial-review':
        localeSummary.needsEditorialReview += 1
        totals.needsEditorialReview += 1
        break
      case 'placeholder':
        localeSummary.placeholder += 1
        totals.placeholder += 1
        break
      case 'translated':
        localeSummary.translated += 1
        totals.translated += 1
        break
    }
  }

  return { bySite, totals }
}

export const toPagePathMap = <T extends AuditDoc>(docs: T[]) =>
  new Map(docs.map((doc) => [getDocPath(doc), doc] as const))
