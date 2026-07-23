import type { PublicLocaleCode } from '../../src/i18n/publicCopy'
import { publicLocales } from '../../src/i18n/publicCopy'
import { wingsSideBackfillPaths } from './wingssideLocaleBackfill'
import { rejectedTranslatedLocaleTerms } from './wingssideEditorialTerminology'

export type LocaleAuditSeverity = 'blocker' | 'warning'

export type LocaleAuditFinding = {
  fieldPath: string
  locale: PublicLocaleCode
  message: string
  pathname?: string
  severity: LocaleAuditSeverity
  value?: string
}

export type LocaleAuditPage = {
  hero?: unknown
  layout?: unknown
  meta?: unknown
  pathname?: null | string
  slug?: null | string
  title?: null | string
}

export type LocaleAuditSettings = {
  footerNavItems?: unknown
  footerNote?: null | string
  headerNavItems?: unknown
  seo?: unknown
  tagline?: null | string
}

export type LocaleAuditInput = {
  pagesByLocale: Partial<Record<PublicLocaleCode, LocaleAuditPage[]>>
  settingsByLocale?: Partial<Record<PublicLocaleCode, LocaleAuditSettings | null>>
}

export type LocaleAuditResult = {
  expectedPaths: string[]
  findings: LocaleAuditFinding[]
  ok: boolean
  summary: {
    blockerCount: number
    checkedLocales: PublicLocaleCode[]
    expectedRouteCount: number
    warningCount: number
  }
}

const translatedLocales = ['vi', 'it', 'es', 'pt'] as const satisfies readonly PublicLocaleCode[]
const requiredSettingFields = [
  'tagline',
  'headerNavItems',
  'footerNavItems',
  'footerNote',
  'seo.defaultDescription',
] as const

const forbiddenMarkersByLocale: Record<PublicLocaleCode, string[]> = {
  en: ['Hành trình Việt Nam may đo', 'Điểm đến', 'Phong cách du lịch', 'Lên kế hoạch'],
  es: [
    'Hành trình Việt Nam may đo',
    'Destination pages should mix overview',
    'Need a tailored route',
    'STYLE LOGIC',
    'Travel style pages should help users',
    'Need this sample itinerary adjusted',
  ],
  it: [
    'Hành trình Việt Nam may đo',
    'Destination pages should mix overview',
    'Need a tailored route',
    'STYLE LOGIC',
    'Travel style pages should help users',
    'Need this sample itinerary adjusted',
  ],
  pt: [
    'Hành trình Việt Nam may đo',
    'Destination pages should mix overview',
    'Need a tailored route',
    'STYLE LOGIC',
    'Travel style pages should help users',
    'Need this sample itinerary adjusted',
  ],
  vi: [
    'Destination pages should mix overview',
    'Need a tailored route',
    'Travel style pages should help users',
    'Need this sample itinerary adjusted',
  ],
}

const approvedTerms = new Set([
  // Brand and proper nouns intentionally remain stable across locales.
  'WingsSide',
  'Vietnam',
  'Vietname',
  'Hanoi',
  'Mekong',
])

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const normalize = (value: string) => value.replace(/\s+/g, ' ').trim()
const userFacingStringKeys = new Set([
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
  'richText',
  'sideBody',
  'sideTitle',
  'summary',
  'tagline',
  'text',
  'title',
  'titleSuffix',
  'value',
])

const pushFinding = (
  findings: LocaleAuditFinding[],
  finding: Omit<LocaleAuditFinding, 'severity'> & { severity?: LocaleAuditSeverity },
) => {
  findings.push({
    severity: 'blocker',
    ...finding,
  })
}

const getPathValue = (source: unknown, dottedPath: string): unknown =>
  dottedPath.split('.').reduce<unknown>((current, key) => {
    if (!isPlainObject(current)) return undefined

    return current[key]
  }, source)

const getAuditPagePathname = (page: LocaleAuditPage): null | string => {
  if (typeof page.pathname === 'string' && page.pathname) {
    return page.pathname
  }

  return page.slug === 'home' ? '/' : null
}

const collectStrings = (
  value: unknown,
  path: string,
  result: Array<{ path: string; value: string }>,
  key?: string,
) => {
  if (typeof value === 'string') {
    if (key && userFacingStringKeys.has(key)) {
      result.push({ path, value })
    }
    return
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => collectStrings(item, `${path}[${index}]`, result, key))
    return
  }

  if (isPlainObject(value)) {
    for (const [key, nested] of Object.entries(value)) {
      collectStrings(nested, `${path}.${key}`, result, key)
    }
  }
}

const inspectDocumentStrings = ({
  findings,
  locale,
  pathname,
  source,
}: {
  findings: LocaleAuditFinding[]
  locale: PublicLocaleCode
  pathname?: string
  source: unknown
}) => {
  const strings: Array<{ path: string; value: string }> = []
  collectStrings(source, pathname ? `pages[${pathname}]` : 'site-settings', strings)

  for (const item of strings) {
    const value = normalize(item.value)
    if (!value) {
      pushFinding(findings, {
        fieldPath: item.path,
        locale,
        message: 'Empty localized string.',
        pathname,
      })
      continue
    }

    if (value === 'Page' || value === 'Trang') {
      pushFinding(findings, {
        fieldPath: item.path,
        locale,
        message: 'Placeholder shell text is still rendered.',
        pathname,
        value,
      })
    }

    const forbiddenMarker = forbiddenMarkersByLocale[locale].find((marker) =>
      value.includes(marker),
    )
    if (forbiddenMarker && !approvedTerms.has(value)) {
      pushFinding(findings, {
        fieldPath: item.path,
        locale,
        message: `Forbidden wrong-locale marker found: ${forbiddenMarker}`,
        pathname,
        value,
      })
    }

    if (locale !== 'en') {
      const rejectedTerm = rejectedTranslatedLocaleTerms.find((term) =>
        new RegExp(`\\b${term.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}s?\\b`, 'i').test(value),
      )

      if (rejectedTerm) {
        pushFinding(findings, {
          fieldPath: item.path,
          locale,
          message: `Rejected glossary term found: ${rejectedTerm}`,
          pathname,
          value,
        })
      }
    }
  }
}

export const auditWingsSideLocaleContent = (input: LocaleAuditInput): LocaleAuditResult => {
  const expectedPaths = [...wingsSideBackfillPaths]
  const findings: LocaleAuditFinding[] = []

  for (const locale of publicLocales) {
    const pages = input.pagesByLocale[locale] || []
    const pagesByPath = new Map(
      pages
        .map((page) => [getAuditPagePathname(page), page] as const)
        .filter((entry): entry is readonly [string, LocaleAuditPage] => Boolean(entry[0])),
    )

    for (const pathname of expectedPaths) {
      const page = pagesByPath.get(pathname)

      if (!page) {
        pushFinding(findings, {
          fieldPath: 'pages.pathname',
          locale,
          message: `Missing required WingsSide page path ${pathname}.`,
          pathname,
        })
        continue
      }

      for (const fieldPath of ['title', 'hero', 'layout', 'meta.title', 'meta.description']) {
        const value = getPathValue(page, fieldPath)

        if (
          value == null ||
          (typeof value === 'string' && normalize(value) === '') ||
          (Array.isArray(value) && value.length === 0)
        ) {
          pushFinding(findings, {
            fieldPath: `pages[${pathname}].${fieldPath}`,
            locale,
            message: 'Required localized page field is missing or empty.',
            pathname,
          })
        }
      }

      inspectDocumentStrings({ findings, locale, pathname, source: page })
    }

    const settings = input.settingsByLocale?.[locale]

    if (!settings) {
      pushFinding(findings, {
        fieldPath: 'site-settings',
        locale,
        message: 'Missing WingsSide site settings for locale.',
      })
      continue
    }

    for (const fieldPath of requiredSettingFields) {
      const value = getPathValue(settings, fieldPath)

      if (
        value == null ||
        (typeof value === 'string' && normalize(value) === '') ||
        (Array.isArray(value) && value.length === 0)
      ) {
        pushFinding(findings, {
          fieldPath: `site-settings.${fieldPath}`,
          locale,
          message: 'Required localized site setting is missing or empty.',
        })
      }
    }

    inspectDocumentStrings({ findings, locale, source: settings })
  }

  for (const locale of translatedLocales) {
    const sourceEnglishPages = new Map(
      (input.pagesByLocale.en || [])
        .map((page) => [getAuditPagePathname(page), page] as const)
        .filter((entry): entry is readonly [string, LocaleAuditPage] => Boolean(entry[0])),
    )

    for (const page of input.pagesByLocale[locale] || []) {
      const pathname = getAuditPagePathname(page)
      if (!pathname) continue

      const englishPage = sourceEnglishPages.get(pathname)
      if (!englishPage) continue

      const localizedMeta = normalize(String(getPathValue(page, 'meta.description') || ''))
      const englishMeta = normalize(String(getPathValue(englishPage, 'meta.description') || ''))

      if (localizedMeta && englishMeta && localizedMeta === englishMeta) {
        pushFinding(findings, {
          fieldPath: `pages[${pathname}].meta.description`,
          locale,
          message: 'Localized meta description is identical to English.',
          pathname,
          value: localizedMeta,
        })
      }
    }
  }

  const blockerCount = findings.filter((finding) => finding.severity === 'blocker').length
  const warningCount = findings.filter((finding) => finding.severity === 'warning').length

  return {
    expectedPaths,
    findings,
    ok: blockerCount === 0,
    summary: {
      blockerCount,
      checkedLocales: [...publicLocales],
      expectedRouteCount: expectedPaths.length * publicLocales.length,
      warningCount,
    },
  }
}

export const renderLocaleAuditMarkdown = (result: LocaleAuditResult): string => {
  const lines = [
    '# WingsSide locale validation',
    '',
    `Status: ${result.ok ? 'PASS' : 'FAIL'}`,
    `Expected routes: ${result.summary.expectedRouteCount}`,
    `Blockers: ${result.summary.blockerCount}`,
    `Warnings: ${result.summary.warningCount}`,
    '',
  ]

  if (result.findings.length === 0) {
    lines.push('No findings.')
    return lines.join('\n')
  }

  lines.push('| Severity | Locale | Path | Field | Message |')
  lines.push('| --- | --- | --- | --- | --- |')

  for (const finding of result.findings) {
    lines.push(
      `| ${finding.severity} | ${finding.locale} | ${finding.pathname || '-'} | ${finding.fieldPath} | ${finding.message.replace(/\|/g, '\\|')} |`,
    )
  }

  return lines.join('\n')
}
