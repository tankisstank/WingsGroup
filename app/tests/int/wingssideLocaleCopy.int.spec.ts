import { describe, expect, it } from 'vitest'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

import {
  assertPublicLocaleSourceMatches,
  getRequiredLocaleCopy,
  publicChromeCopy,
  publicLocales,
  type LocalizedCopy,
  type PublicChromeCopy,
} from '@/i18n/publicCopy'
import { wingsSideSiteSettingsCopy } from '../../scripts/lib/wingssideSiteSettingsBackfill'

const repoFile = (relativePath: string) =>
  fileURLToPath(new URL(`../../${relativePath}`, import.meta.url))

const walkStrings = (value: unknown, path = 'copy'): Array<{ path: string; value: string }> => {
  if (typeof value === 'string') {
    return [{ path, value }]
  }

  if (!value || typeof value !== 'object') {
    return []
  }

  return Object.entries(value).flatMap(([key, nested]) => walkStrings(nested, `${path}.${key}`))
}

describe('WingsSide locale copy contract', () => {
  it('matches the configured public locale source', () => {
    expect(() => assertPublicLocaleSourceMatches()).not.toThrow()
  })

  it('contains exactly the public locale keys', () => {
    expect(Object.keys(publicChromeCopy).sort()).toEqual([...publicLocales].sort())
  })

  it('has no empty runtime chrome copy values', () => {
    for (const locale of publicLocales) {
      const strings = walkStrings(getRequiredLocaleCopy(publicChromeCopy, locale))

      expect(strings.length).toBeGreaterThan(0)

      for (const { path, value } of strings) {
        expect(value.trim(), `${locale}:${path}`).not.toBe('')
      }
    }
  })

  it('throws instead of silently falling back for required copy', () => {
    const incomplete = {
      en: publicChromeCopy.en,
    } as unknown as LocalizedCopy<PublicChromeCopy>

    expect(() => getRequiredLocaleCopy(incomplete, 'it')).toThrow(/Missing required public locale copy/)
  })

  it('contains complete localized WingsSide site-settings copy', () => {
    expect(Object.keys(wingsSideSiteSettingsCopy).sort()).toEqual([...publicLocales].sort())

    for (const locale of publicLocales) {
      const strings = walkStrings(getRequiredLocaleCopy(wingsSideSiteSettingsCopy, locale))

      expect(strings.length).toBeGreaterThan(0)

      for (const { path, value } of strings) {
        expect(value.trim(), `${locale}:${path}`).not.toBe('')
      }
    }
  })

  it('keeps WingsSide page backfill user copy off vi-versus-English branching', async () => {
    const source = await readFile(repoFile('scripts/lib/wingssideLocaleBackfill.ts'), 'utf8')

    expect(source).not.toContain("locale === 'vi'")
    expect(source).not.toContain('Destination pages should mix overview')
    expect(source).not.toContain('Need a tailored route')
    expect(source).not.toContain('Travel style pages should help users')
    expect(source).not.toContain('Need this sample itinerary adjusted')
  })
})
