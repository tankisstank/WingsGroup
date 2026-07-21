import { describe, expect, it } from 'vitest'

import { getWingsSideHiFiCopy } from '@/components/WingsSideHiFi/copy'
import {
  previewWingsSideHiFiSeedPayload,
  WINGSSIDE_HIFI_SEED_LOCALES,
} from '../../scripts/lib/wingssideHiFiContentSeed'

const INTERNAL_MARKERS = [
  /placeholder/i,
  /ẩn đến/i,
  /không bịa/i,
  /leave hidden/i,
  /hidden until/i,
  /never invent/i,
  /no invented/i,
  /slots? ready/i,
  /chỗ logo sẵn/i,
  /solo badge reali/i,
  /solo insignias reales/i,
  /só distintivos reais/i,
  /editor/i,
  /TODO/i,
  /FIXME/i,
]

const collectStrings = (value: unknown, out: string[] = []): string[] => {
  if (typeof value === 'string') {
    out.push(value)
    return out
  }
  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, out)
    return out
  }
  if (value && typeof value === 'object') {
    for (const nested of Object.values(value as Record<string, unknown>)) {
      collectStrings(nested, out)
    }
  }
  return out
}

describe('WingSide hi-fi public copy locale integrity', () => {
  it('localizes hero titles for all five public locales in seed payload', () => {
    const titles = Object.fromEntries(
      WINGSSIDE_HIFI_SEED_LOCALES.map((locale) => {
        const payload = previewWingsSideHiFiSeedPayload(locale, 'home') as {
          hero?: { title?: string }
        }
        return [locale, payload.hero?.title]
      }),
    )

    expect(titles.en).toBe('Tailor-made Vietnam journeys')
    expect(titles.vi).toBe('Hành trình Việt Nam may đo')
    expect(titles.it).toBe('Viaggi su misura in Vietnam')
    expect(titles.es).toBe('Viajes a medida por Vietnam')
    expect(titles.pt).toBe('Viagens sob medida no Vietname')

    // VI must not silently fall back to English public H1.
    expect(titles.vi).not.toBe(titles.en)
  })

  it('omits unverified credentials from public copy and seed payload', () => {
    for (const locale of WINGSSIDE_HIFI_SEED_LOCALES) {
      const copy = getWingsSideHiFiCopy(locale)
      expect(copy.creds.slides).toEqual([])
      const payload = previewWingsSideHiFiSeedPayload(locale, 'home') as {
        home?: { credentials?: unknown[] }
      }
      expect(payload.home?.credentials).toEqual([])
    }
  })

  it('has no editor/internal markers in public copy or seed payloads for all locales', () => {
    for (const locale of WINGSSIDE_HIFI_SEED_LOCALES) {
      const copy = getWingsSideHiFiCopy(locale)
      const strings = collectStrings(copy)
      for (const route of [
        'home',
        'plan',
        'destinations',
        'styles',
        'packages',
        'guide',
        'about',
        'contact',
      ] as const) {
        strings.push(...collectStrings(previewWingsSideHiFiSeedPayload(locale, route)))
      }

      for (const text of strings) {
        for (const marker of INTERNAL_MARKERS) {
          expect(text, `${locale}: "${text}"`).not.toMatch(marker)
        }
      }
    }
  })

  it('does not leak English-only hero titles into non-English seed home payloads', () => {
    for (const locale of ['vi', 'it', 'es', 'pt'] as const) {
      const payload = previewWingsSideHiFiSeedPayload(locale, 'home') as {
        hero?: { title?: string }
      }
      expect(payload.hero?.title).toBeTruthy()
      expect(payload.hero?.title).not.toMatch(/Tailor-made Vietnam journeys/i)
    }
  })
})
