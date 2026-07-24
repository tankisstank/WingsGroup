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
  it('keeps the prototype Wingside spelling in uppercase kickers', () => {
    const copy = getWingsSideHiFiCopy('en')

    expect(copy.home.pillarsKicker.toUpperCase()).toBe('HOW WINGSIDE WORKS')
    expect(copy.plan.stepsKicker.toUpperCase()).toBe('HOW WINGSIDE WORKS')
  })

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

  it('keeps credentials copy limited to localized labels, not records', () => {
    for (const locale of WINGSSIDE_HIFI_SEED_LOCALES) {
      const copy = getWingsSideHiFiCopy(locale)
      expect(copy.creds.title.length).toBeGreaterThan(0)
      expect(copy.creds.filterAll.length).toBeGreaterThan(0)
      expect(copy.creds.filterAppointments.length).toBeGreaterThan(0)
      expect(copy.creds.filterAwards.length).toBeGreaterThan(0)
      expect(copy.creds.missingField.length).toBeGreaterThan(0)
      expect(copy.creds.ctaPlanPrivateJourney.length).toBeGreaterThan(0)
      const payload = previewWingsSideHiFiSeedPayload(locale, 'home') as {
        home?: { credentials?: unknown }
      }
      expect(payload.home?.credentials).toBeUndefined()
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
