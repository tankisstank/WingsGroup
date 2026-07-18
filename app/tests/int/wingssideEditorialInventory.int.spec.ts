import { describe, expect, it } from 'vitest'

import { publicLocales } from '@/i18n/publicCopy'
import {
  buildWingsSideEditorialInventory,
  renderWingsSideEditorialReviewPacket,
} from '../../scripts/lib/wingssideEditorialInventory'
import { wingsSideBackfillPaths } from '../../scripts/lib/wingssideLocaleBackfill'
import { rejectedTranslatedLocaleTerms } from '../../scripts/lib/wingssideEditorialTerminology'

describe('WingsSide editorial inventory', () => {
  it('covers every localized backfill route plus shared site, chrome, and search copy', async () => {
    const inventory = buildWingsSideEditorialInventory()

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

      const packet = renderWingsSideEditorialReviewPacket(inventory, locale)
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
