import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { publicLocales } from '@/i18n/publicCopy'
import { wingsSideBackfillPaths } from '../../scripts/lib/wingssideLocaleBackfill'
import { rejectedTranslatedLocaleTerms } from '../../scripts/lib/wingssideEditorialTerminology'

type InventoryEntry = {
  after: string
  before: null | string
  fieldPath: string
  locale: string
  notes: string
  reviewer: null | string
  route: string
  sourceFile: string
  status: string
}

const inventoryPath = fileURLToPath(
  new URL(
    '../../../artifacts/audits/wingsside-locale-2026-07-12/editorial-copy-inventory.json',
    import.meta.url,
  ),
)
const packetPath = (locale: string) =>
  fileURLToPath(
    new URL(
      `../../../artifacts/audits/wingsside-locale-2026-07-12/editorial-review-packets/${locale}.md`,
      import.meta.url,
    ),
  )

describe('WingsSide editorial inventory', () => {
  it('covers every localized backfill route plus shared site, chrome, and search copy', async () => {
    const inventory = JSON.parse(await readFile(inventoryPath, 'utf8')) as InventoryEntry[]

    expect(inventory.length).toBeGreaterThan(3000)

    for (const locale of publicLocales) {
      for (const route of wingsSideBackfillPaths) {
        expect(
          inventory.some(
            (entry) =>
              entry.locale === locale &&
              entry.route === route &&
              entry.sourceFile === 'app/scripts/lib/wingssideLocaleBackfill.ts',
          ),
          `${locale}:${route}`,
        ).toBe(true)
      }

      expect(
        inventory.some(
          (entry) =>
            entry.locale === locale &&
            entry.sourceFile === 'app/scripts/lib/wingssideSiteSettingsBackfill.ts',
        ),
      ).toBe(true)
      expect(
        inventory.some(
          (entry) => entry.locale === locale && entry.sourceFile === 'app/src/i18n/publicCopy.ts',
        ),
      ).toBe(true)
      expect(
        inventory.some(
          (entry) => entry.locale === locale && entry.sourceFile === 'app/src/i18n/searchCopy.ts',
        ),
      ).toBe(true)

      const packet = await readFile(packetPath(locale), 'utf8')
      expect(packet).toContain(`# WingsSide editorial review packet — ${locale}`)
      expect(packet).toContain('## Required route checklist')
      expect(packet).toContain('### /destinations/ha-noi')
      expect(packet).toContain('Decision: ☐ approved')
    }

    for (const entry of inventory) {
      expect(entry.after.trim()).not.toBe('')
      expect(entry.fieldPath.trim()).not.toBe('')
      expect(entry.notes.trim()).not.toBe('')
      expect(entry.route.trim()).not.toBe('')
      expect(entry.sourceFile.trim()).not.toBe('')
      expect(entry.status).toBe('pending-human-review')

      if (entry.locale !== 'en') {
        expect(entry.after, `${entry.locale}:${entry.fieldPath}:-led`).not.toMatch(/-led\b/i)
        for (const term of rejectedTranslatedLocaleTerms) {
          const pattern = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}s?\\b`, 'i')
          expect(pattern.test(entry.after), `${entry.locale}:${entry.fieldPath}:${term}`).toBe(
            false,
          )
        }
      }
    }
  })
})
