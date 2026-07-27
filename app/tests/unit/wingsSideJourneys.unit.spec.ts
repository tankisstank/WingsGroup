import { describe, expect, it } from 'vitest'

import {
  buildTourDetailDiscoveryHref,
  buildTourEnquiryHref,
  readSafeTourEnquiryContext,
} from '@/tours/enquiryContext'
import {
  getWingSideJourneysCopy,
  isWingSideJourneyLocale,
  wingSideJourneyLocales,
} from '@/tours/journeysCopy'

describe('WingSide journeys copy and context utilities', () => {
  it('has exact public journey locales without English fallback lookup', () => {
    expect(wingSideJourneyLocales).toEqual(['en', 'vi', 'it', 'es', 'pt'])
    expect(isWingSideJourneyLocale('fr')).toBe(false)
    expect(getWingSideJourneysCopy('vi').reset).toBe('Xóa bộ lọc')
    expect(getWingSideJourneysCopy('it').reset).toBe('Reimposta filtri')
    expect(getWingSideJourneysCopy('es').reset).toBe('Restablecer filtros')
    expect(getWingSideJourneysCopy('pt').reset).toBe('Repor filtros')
  })

  it('serializes only normalized discovery context and safe source values', () => {
    const context = readSafeTourEnquiryContext({
      destination: ['raw-secret', 'hanoi'],
      duration: '8-14',
      source: 'journeys',
      style: 'culture',
      tour: 'private-hanoi',
      tourId: '88',
    })

    expect(context).toMatchObject({
      discovery: { destination: 'hanoi', duration: '8-14', style: 'culture' },
      source: 'journeys',
      tourId: '88',
      tourSlug: 'private-hanoi',
    })
    expect(buildTourEnquiryHref({ basePath: '/contact-us', context, intent: 'contact' })).toBe(
      '/contact-us?intent=contact&source=journeys&tour=private-hanoi&tourId=88&destination=hanoi&style=culture&duration=8-14',
    )
    expect(
      buildTourEnquiryHref({
        basePath: '/contact-us',
        context: readSafeTourEnquiryContext({ destination: 'bad', source: '../raw' }),
        intent: 'contact',
      }),
    ).toBe('/contact-us?intent=contact')
  })

  it('drops unsafe tour context fields and bounds safe prefill text', () => {
    const oversizedTitle = `Safe title ${'x'.repeat(220)}`
    const context = readSafeTourEnquiryContext({
      source: 'journeys',
      tour: '../private-hanoi\u0000raw',
      tourId: '88\u0000<script>',
      tourTitle: `Private\u0000 Hanoi\n${oversizedTitle}`,
    })

    expect(context.tourSlug).toBeUndefined()
    expect(context.tourId).toBeUndefined()
    expect(context.tourTitle).toHaveLength(160)
    expect(context.tourTitle).toContain('Private Hanoi Safe title')
    expect(context.tourTitle).not.toContain('\u0000')
    expect(context.tourTitle).not.toContain(oversizedTitle)
    expect(
      buildTourEnquiryHref({ basePath: '/contact-us', context, intent: 'contact' }),
    ).not.toContain('..')
    expect(
      buildTourEnquiryHref({ basePath: '/contact-us', context, intent: 'contact' }),
    ).not.toContain('%00')
    expect(
      buildTourEnquiryHref({ basePath: '/contact-us', context, intent: 'contact' }),
    ).not.toContain('<script>')
  })
  it('adds source=journeys and normalized params to tour detail hrefs', () => {
    expect(
      buildTourDetailDiscoveryHref('/tour/private-hanoi', {
        destination: 'hanoi',
        duration: '1-7',
        style: 'culture',
      }),
    ).toBe('/tour/private-hanoi?source=journeys&destination=hanoi&style=culture&duration=1-7')
  })
})
