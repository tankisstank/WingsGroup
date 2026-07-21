import { describe, expect, it } from 'vitest'

import { getWingsSideHiFiCopy } from '@/components/WingsSideHiFi/copy'

describe('WingSide HiFi inventory copy i18n', () => {
  it('localizes home and credentials for all five public ad locales', () => {
    const en = getWingsSideHiFiCopy('en')
    const vi = getWingsSideHiFiCopy('vi')
    const it = getWingsSideHiFiCopy('it')
    const es = getWingsSideHiFiCopy('es')
    const pt = getWingsSideHiFiCopy('pt')

    expect(en.home.closeCta).toBe('Plan trip')
    expect(vi.home.closeCta).toBe('Lên kế hoạch')
    expect(it.home.closeCta).toBe('Pianifica')
    expect(es.home.closeCta).toBe('Planifica')
    expect(pt.home.closeCta).toBe('Planear')

    expect(vi.creds.kicker).toMatch(/Chứng nhận/)
    expect(it.creds.title).not.toEqual(en.creds.title)
    expect(es.packages.cards).toHaveLength(3)
    expect(pt.styles.styles).toHaveLength(6)
  })

  it('keeps destination place cards aligned with media binding count', () => {
    for (const locale of ['en', 'vi', 'it', 'es', 'pt'] as const) {
      const places = getWingsSideHiFiCopy(locale).destinations.places
      expect(places).toHaveLength(6)
      expect(places.every((place) => Boolean(place.region))).toBe(true)
    }
  })

  it('localizes dual-CTA explore destinations fallback for all ad locales', () => {
    expect(getWingsSideHiFiCopy('en').home.exploreDestinations).toBe('Explore destinations')
    expect(getWingsSideHiFiCopy('vi').home.exploreDestinations).toBe('Khám phá điểm đến')
    expect(getWingsSideHiFiCopy('it').home.exploreDestinations).toBe('Esplora le destinazioni')
    expect(getWingsSideHiFiCopy('es').home.exploreDestinations).toBe('Explorar destinos')
    expect(getWingsSideHiFiCopy('pt').home.exploreDestinations).toBe('Explorar destinos')
  })

  it('ships traveler notes, trust strip, and indicative journey prices for all ad locales', () => {
    for (const locale of ['en', 'vi', 'it', 'es', 'pt'] as const) {
      const copy = getWingsSideHiFiCopy(locale)
      expect(copy.home.notes).toHaveLength(3)
      expect(copy.home.trust).toHaveLength(3)
      expect(copy.home.trust.some((item) => item.kind === 'sla')).toBe(true)
      expect(copy.packages.cards).toHaveLength(3)
      for (const card of copy.packages.cards) {
        expect(card.micro.length).toBeGreaterThan(0)
        expect(card.priceFrom.length).toBeGreaterThan(0)
        expect(card.note.length).toBeGreaterThan(0)
      }
      expect(copy.home.whyCards.every((card) => Boolean(card.href && card.cta))).toBe(true)
      expect(copy.home.destKicker.length).toBeGreaterThan(0)
      expect(copy.home.stylesKicker.length).toBeGreaterThan(0)
      expect(copy.home.closeCtaSecondary.length).toBeGreaterThan(0)
      expect(copy.home.planTripCta.length).toBeGreaterThan(0)
    }

    const en = getWingsSideHiFiCopy('en')
    expect(en.home.notesKicker).toBe('Traveler notes')
    expect(en.home.notesTitle).toMatch(/What guests ask/)
    expect(en.packages.cards[0]?.priceFrom).toContain('2,190')
    expect(en.packages.cards[0]?.note).toMatch(/Indicative/i)
  })
})
