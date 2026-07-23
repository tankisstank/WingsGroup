import { publicChromeCopy, publicLocales } from '../../src/i18n/publicCopy'
import { searchInputCopy, searchMetadataCopy, searchPageCopyByLocale } from '../../src/i18n/searchCopy'
import {
  buildWingsSideLocaleAuditPageData,
  wingsSideBackfillPaths,
} from './wingssideLocaleBackfill'
import { applyWingsSideEditorialTerminology } from './wingssideEditorialTerminology'
import { wingsSideSiteSettingsCopy } from './wingssideSiteSettingsBackfill'

export type WingsSideEditorialInventoryEntry = {
  after: string
  before: null
  fieldPath: string
  locale: string
  notes: string
  reviewer: null
  route: string
  sourceFile: string
  status: 'pending-human-review'
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

const collectVisibleStrings = (
  value: unknown,
  fieldPath: string,
  entries: Array<{ fieldPath: string; value: string }>,
  key?: string,
  includeAllStrings = false,
) => {
  if (typeof value === 'string') {
    if (key && (includeAllStrings || visibleStringKeys.has(key)) && value.trim()) {
      entries.push({ fieldPath, value: value.trim() })
    }
    return
  }

  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      collectVisibleStrings(entry, `${fieldPath}[${index}]`, entries, key, includeAllStrings),
    )
    return
  }

  if (!value || typeof value !== 'object') return

  for (const [entryKey, entryValue] of Object.entries(value)) {
    collectVisibleStrings(
      entryValue,
      `${fieldPath}.${entryKey}`,
      entries,
      entryKey,
      includeAllStrings,
    )
  }
}

export const buildWingsSideEditorialInventory = (): WingsSideEditorialInventoryEntry[] => {
  const inventory: WingsSideEditorialInventoryEntry[] = []

  for (const locale of publicLocales) {
    for (const route of wingsSideBackfillPaths) {
      const strings: Array<{ fieldPath: string; value: string }> = []
      collectVisibleStrings(
        buildWingsSideLocaleAuditPageData(locale, route),
        `pages[${route}]`,
        strings,
      )

      for (const entry of strings) {
        inventory.push({
          after: entry.value,
          before: null,
          fieldPath: entry.fieldPath,
          locale,
          notes:
            'Generated from the current deterministic backfill output; reviewer decision is required.',
          reviewer: null,
          route,
          sourceFile: 'app/scripts/lib/wingssideLocaleBackfill.ts',
          status: 'pending-human-review',
        })
      }
    }

    const settingsStrings: Array<{ fieldPath: string; value: string }> = []
    collectVisibleStrings(
      applyWingsSideEditorialTerminology(wingsSideSiteSettingsCopy[locale], locale),
      `wingsSideSiteSettingsCopy.${locale}`,
      settingsStrings,
    )
    for (const entry of settingsStrings) {
      inventory.push({
        after: entry.value,
        before: null,
        fieldPath: entry.fieldPath,
        locale,
        notes: 'Generated from current localized site settings; reviewer decision is required.',
        reviewer: null,
        route: '*',
        sourceFile: 'app/scripts/lib/wingssideSiteSettingsBackfill.ts',
        status: 'pending-human-review',
      })
    }

    const chromeStrings: Array<{ fieldPath: string; value: string }> = []
    collectVisibleStrings(
      publicChromeCopy[locale],
      `publicChromeCopy.${locale}`,
      chromeStrings,
      undefined,
      true,
    )
    for (const entry of chromeStrings) {
      inventory.push({
        after: entry.value,
        before: null,
        fieldPath: entry.fieldPath,
        locale,
        notes: 'Generated from runtime public chrome copy; reviewer decision is required.',
        reviewer: null,
        route: '*',
        sourceFile: 'app/src/i18n/publicCopy.ts',
        status: 'pending-human-review',
      })
    }

    for (const [copyName, copyValue] of Object.entries({
      searchInputCopy: searchInputCopy[locale],
      searchMetadataCopy: searchMetadataCopy[locale],
      searchPageCopyByLocale: searchPageCopyByLocale[locale],
    })) {
      const searchStrings: Array<{ fieldPath: string; value: string }> = []
      collectVisibleStrings(copyValue, `${copyName}.${locale}`, searchStrings, undefined, true)
      for (const entry of searchStrings) {
        inventory.push({
          after: entry.value,
          before: null,
          fieldPath: entry.fieldPath,
          locale,
          notes: 'Generated from runtime search copy; reviewer decision is required.',
          reviewer: null,
          route: '/search',
          sourceFile: 'app/src/i18n/searchCopy.ts',
          status: 'pending-human-review',
        })
      }
    }
  }

  return inventory.sort((left, right) =>
    [left.route, left.locale, left.sourceFile, left.fieldPath]
      .join('|')
      .localeCompare([right.route, right.locale, right.sourceFile, right.fieldPath].join('|')),
  )
}

const localeVariants: Record<string, string> = {
  en: 'international English',
  es: 'es-ES',
  it: 'it-IT',
  pt: 'pt-PT',
  vi: 'vi-VN',
}

const escapeMarkdown = (value: string) => value.replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim()

export const renderWingsSideEditorialReviewPacket = (
  inventory: WingsSideEditorialInventoryEntry[],
  locale: string,
) => {
  const localeEntries = inventory.filter((entry) => entry.locale === locale)
  const routeOrder = [...wingsSideBackfillPaths, '/search', '*']
  const lines = [
    `# WingsSide editorial review packet — ${locale}`,
    '',
    `Regional variant: ${localeVariants[locale]}`,
    '',
    'Reviewer: ____________________  ',
    'Fluency / role: ____________________  ',
    'Review date: ____________________  ',
    'Commit / release: ____________________  ',
    '',
    'Decision: ☐ approved  ☐ approved with caveats  ☐ rejected',
    '',
    'Review the rendered desktop and mobile page first. Use the inventory below to trace every visible phrase back to its deterministic source field.',
    '',
    '## Required route checklist',
    '',
    '- [ ] `/`',
    '- [ ] `/about-us`',
    '- [ ] `/destinations/ha-noi`',
    '- [ ] `/styles/luxury`',
    '- [ ] `/packages/vietnam-highlights`',
    '- [ ] `/plan-your-trip`',
    '- [ ] `/contact-us`',
    '- [ ] Header, mobile drawer, footer, search, validation and error copy',
    '',
    '## Review findings',
    '',
    'Terminology exceptions approved: ________________________________________________',
    '',
    'Phrases rejected or revised: _________________________________________________',
    '',
    'Layout / truncation issues: _________________________________________________',
    '',
    `## Complete phrase inventory (${localeEntries.length} entries)`,
    '',
  ]

  for (const route of routeOrder) {
    const routeEntries = localeEntries.filter((entry) => entry.route === route)
    if (routeEntries.length === 0) continue

    lines.push(`### ${route === '*' ? 'Shared chrome and site settings' : route}`)
    lines.push('')
    lines.push('| Source field | Current copy | Reviewer status / correction |')
    lines.push('| --- | --- | --- |')
    for (const entry of routeEntries) {
      lines.push(
        `| \`${escapeMarkdown(entry.fieldPath)}\` | ${escapeMarkdown(entry.after)} | ☐ approve ☐ revise: |`,
      )
    }
    lines.push('')
  }

  return `${lines.join('\n')}\n`
}
