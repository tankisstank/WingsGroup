import 'dotenv/config'

import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import config from '../src/payload.config'
import type { Page, Site, SiteSetting } from '../src/payload-types'
import { getPayload } from 'payload'

import { isPublicLocale, type SupportedLocaleCode } from '../src/utilities/locales'
import {
  classifyLocaleDocument,
  getLocaleContentBlockerCount,
  summarizeLocaleAuditRows,
  toPagePathMap,
  type LocaleContentAuditRow,
} from './lib/multisiteLocaleContentAudit'

const timestamp = new Date().toISOString()
const dateStamp = timestamp.slice(0, 10)

const getArgumentValue = (name: string): string | undefined => {
  const inlineArgument = process.argv.find((argument) => argument.startsWith(`${name}=`))
  if (inlineArgument) return inlineArgument.split('=').slice(1).join('=')

  const index = process.argv.indexOf(name)
  if (index >= 0) return process.argv[index + 1]

  return undefined
}

const hasArgument = (name: string): boolean =>
  process.argv.includes(name) || process.argv.some((argument) => argument.startsWith(`${name}=`))

const outputDir = resolve(
  process.cwd(),
  getArgumentValue('--output-dir') || `../artifacts/audits/multisite-remediation-${dateStamp}`,
)
const strict = getArgumentValue('--strict') !== 'false' && !hasArgument('--allow-findings')

const normalizePathname = (value?: null | string) => {
  if (!value || value === '/') return '/'
  return value.startsWith('/') ? value : `/${value}`
}

const getPublicLocales = (site: Pick<Site, 'defaultLocale' | 'supportedLocales'>): SupportedLocaleCode[] => {
  const locales = new Set<SupportedLocaleCode>()
  for (const locale of site.supportedLocales as SupportedLocaleCode[]) {
    if (isPublicLocale(locale)) locales.add(locale)
  }
  if (isPublicLocale(site.defaultLocale)) locales.add(site.defaultLocale)
  return [...locales]
}

const findPagesForSiteLocale = async (
  payload: Awaited<ReturnType<typeof getPayload>>,
  siteId: number,
  locale: SupportedLocaleCode,
): Promise<Page[]> => {
  const result = await payload.find({
    collection: 'pages',
    depth: 0,
    fallbackLocale: false,
    limit: 1000,
    locale,
    overrideAccess: true,
    pagination: false,
    where: {
      and: [
        { site: { equals: siteId } },
        { _status: { equals: 'published' } },
      ],
    },
  })

  return result.docs
}

const findSettingsForSiteLocale = async (
  payload: Awaited<ReturnType<typeof getPayload>>,
  siteId: number,
  locale: SupportedLocaleCode,
): Promise<null | SiteSetting> => {
  const result = await payload.find({
    collection: 'site-settings',
    depth: 0,
    fallbackLocale: false,
    limit: 1,
    locale,
    overrideAccess: true,
    pagination: false,
    where: {
      site: { equals: siteId },
    },
  })

  return (result.docs[0] as SiteSetting | undefined) || null
}

const main = async () => {
  const payload = await getPayload({ config })
  const sitesResult = await payload.find({
    collection: 'sites',
    depth: 0,
    limit: 100,
    locale: 'en',
    overrideAccess: true,
    pagination: false,
    where: {
      isActive: { equals: true },
    },
  })

  const rows: LocaleContentAuditRow[] = []

  for (const site of sitesResult.docs.sort((left, right) => left.code.localeCompare(right.code))) {
    const publicLocales = getPublicLocales(site)
    const defaultLocale = site.defaultLocale as SupportedLocaleCode
    const pagesByLocale = new Map<SupportedLocaleCode, Page[]>()
    const settingsByLocale = new Map<SupportedLocaleCode, null | SiteSetting>()

    for (const locale of publicLocales) {
      pagesByLocale.set(locale, await findPagesForSiteLocale(payload, site.id, locale))
      settingsByLocale.set(locale, await findSettingsForSiteLocale(payload, site.id, locale))
    }

    const defaultPages = pagesByLocale.get(defaultLocale) || []
    const defaultPageMap = toPagePathMap(defaultPages)
    const routeUniverse = new Set<string>(defaultPages.map((page) => normalizePathname(page.pathname || page.slug)))

    for (const locale of publicLocales) {
      for (const page of pagesByLocale.get(locale) || []) {
        routeUniverse.add(normalizePathname(page.pathname || page.slug))
      }
    }

    for (const locale of publicLocales) {
      const localizedPages = pagesByLocale.get(locale) || []
      const localizedMap = toPagePathMap(localizedPages)

      for (const route of [...routeUniverse].sort()) {
        const defaultDoc = defaultPageMap.get(route)
        const localizedDoc = localizedMap.get(route)
        const classification = classifyLocaleDocument({
          defaultDoc,
          defaultLocale,
          doc: localizedDoc,
          locale,
        })

        rows.push({
          evidence: classification.evidence,
          locale,
          notes: classification.notes,
          path: route,
          site: site.code,
          source: 'page',
          status: classification.status,
        })
      }

      const settingsClassification = classifyLocaleDocument({
        defaultDoc: settingsByLocale.get(defaultLocale) || null,
        defaultLocale,
        doc: settingsByLocale.get(locale) || null,
        locale,
      })

      rows.push({
        evidence: settingsClassification.evidence,
        locale,
        notes: settingsClassification.notes,
        path: '*site-settings*',
        site: site.code,
        source: 'site-settings',
        status: settingsClassification.status,
      })
    }
  }

  const summary = summarizeLocaleAuditRows(rows)
  const blockerCount = getLocaleContentBlockerCount(summary)
  const markdownLines = [
    '# Multisite locale content audit',
    '',
    `- Generated at: \`${timestamp}\``,
    `- Sites covered: \`${Object.keys(summary.bySite).length}\``,
    `- Rows audited: \`${rows.length}\``,
    '',
    '## Totals',
    '',
    `- translated: \`${summary.totals.translated}\``,
    `- fallback-approved: \`${summary.totals.fallbackApproved}\``,
    `- missing: \`${summary.totals.missing}\``,
    `- placeholder: \`${summary.totals.placeholder}\``,
    `- mixed-language: \`${summary.totals.mixedLanguage}\``,
    `- needs-editorial-review: \`${summary.totals.needsEditorialReview}\``,
    '',
    '## Per-site summary',
    '',
  ]

  for (const [siteCode, siteSummary] of Object.entries(summary.bySite).sort((left, right) =>
    left[0].localeCompare(right[0]),
  )) {
    markdownLines.push(`### ${siteCode}`, '')
    markdownLines.push('| Locale | translated | fallback-approved | missing | placeholder | mixed-language | needs-editorial-review |')
    markdownLines.push('| --- | ---: | ---: | ---: | ---: | ---: | ---: |')
    for (const [locale, counts] of Object.entries(siteSummary.byLocale).sort((left, right) =>
      left[0].localeCompare(right[0]),
    )) {
      markdownLines.push(
        `| ${locale} | ${counts.translated} | ${counts.fallbackApproved} | ${counts.missing} | ${counts.placeholder} | ${counts.mixedLanguage} | ${counts.needsEditorialReview} |`,
      )
    }
    markdownLines.push('')
  }

  const flaggedRows = rows.filter((row) => row.status !== 'translated')
  markdownLines.push('## Flagged rows', '')
  if (flaggedRows.length === 0) {
    markdownLines.push('No flagged rows.')
  } else {
    for (const row of flaggedRows.slice(0, 400)) {
      markdownLines.push(
        `- \`${row.site}\` \`${row.locale}\` \`${row.path}\` \`${row.source}\` → \`${row.status}\`${
          row.notes.length ? ` — ${row.notes.join(' ')}` : ''
        }${
          row.evidence?.length
            ? ` Example: ${row.evidence
                .map((entry) => `[${entry.marker}] ${entry.value}`)
                .join(' | ')}`
            : ''
        }`,
      )
    }
  }

  await mkdir(outputDir, { recursive: true })
  await writeFile(
    resolve(outputDir, 'locale-content-audit.json'),
    `${JSON.stringify({ generatedAt: timestamp, rows, summary }, null, 2)}\n`,
  )
  await writeFile(resolve(outputDir, 'locale-content-audit.md'), `${markdownLines.join('\n')}\n`)

  console.log(
    JSON.stringify(
      {
        blockerCount,
        outputDir,
        rows: rows.length,
        sites: Object.keys(summary.bySite).length,
        strict,
        totals: summary.totals,
      },
      null,
      2,
    ),
  )

  if (strict && blockerCount > 0) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
