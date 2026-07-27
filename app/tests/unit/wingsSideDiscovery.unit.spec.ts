import { describe, expect, it } from 'vitest'

import {
  buildDiscoveryHref,
  buildDiscoveryRelaxationPlan,
  buildDiscoveryWhere,
  getDiscoverySEOPolicy,
  isDurationMatch,
  normalizeDiscoveryQuery,
  projectDiscoveryTour,
  serializeDiscoveryQuery,
  stripDiscoveryQueryMeta,
} from '@/tours/discoveryCore'

const site = { code: 'wing-side', id: 3 }

const tour = (overrides: Record<string, unknown> = {}) => ({
  _status: 'published',
  currency: 'USD',
  destinationTags: ['hanoi'],
  durationDays: 7,
  durationNights: 6,
  heroMedia: { alt: 'Hanoi hero', site: 3, url: '/media/hanoi.jpg' },
  id: 12,
  priceFrom: 1290,
  site: 3,
  slug: 'hanoi-private-tour',
  summary: 'Private Hanoi discovery.',
  title: 'Hanoi Private Tour',
  travelStyles: ['culture'],
  wrapperPage: { _status: 'published', pathname: '/tour/hanoi-private-tour', site: 3 },
  ...overrides,
})

describe('WingSide discovery pure contract', () => {
  it('normalizes scalar params and counts dropped unknown values without retaining raw input', () => {
    const params = new URLSearchParams()
    params.append('destination', 'bogus-destination')
    params.append('destination', 'hanoi')
    params.append('style', 'culture')
    params.append('style', 'luxury')
    params.append('duration', '99')
    params.append('duration', '8-14')
    params.append('debug', 'raw-secret')

    expect(normalizeDiscoveryQuery(params)).toEqual({
      destination: 'hanoi',
      duration: '8-14',
      style: 'culture',
      unknownValueCount: 3,
    })
  })

  it('matches duration boundaries exactly', () => {
    expect(isDurationMatch(1, '1-7')).toBe(true)
    expect(isDurationMatch(7, '1-7')).toBe(true)
    expect(isDurationMatch(8, '1-7')).toBe(false)
    expect(isDurationMatch(8, '8-14')).toBe(true)
    expect(isDurationMatch(14, '8-14')).toBe(true)
    expect(isDurationMatch(15, '8-14')).toBe(false)
    expect(isDurationMatch(15, '15-plus')).toBe(true)
    expect(isDurationMatch('15', '15-plus')).toBe(false)
  })

  it('serializes known params in canonical order and builds journey hrefs', () => {
    const query = normalizeDiscoveryQuery({
      duration: '15-plus',
      style: 'culture',
      destination: 'hanoi',
    })
    const safeQuery = stripDiscoveryQueryMeta(query)

    expect(serializeDiscoveryQuery(safeQuery)).toBe(
      'destination=hanoi&style=culture&duration=15-plus',
    )
    expect(buildDiscoveryHref(safeQuery)).toBe(
      '/journeys?destination=hanoi&style=culture&duration=15-plus',
    )
    expect(buildDiscoveryHref({})).toBe('/journeys')
  })

  it('plans zero-result relaxation in frozen order', () => {
    expect(
      buildDiscoveryRelaxationPlan({
        destination: 'hanoi',
        duration: '8-14',
        style: 'culture',
        unknownValueCount: 0,
      }),
    ).toEqual([
      { removed: 'duration', query: { destination: 'hanoi', style: 'culture' } },
      { removed: 'style', query: { destination: 'hanoi' } },
      { removed: 'destination', query: {} },
    ])
  })

  it('sets canonical and robots policy for base and query URLs', () => {
    expect(getDiscoverySEOPolicy({})).toEqual({
      canonicalPath: '/journeys',
      robots: 'index,follow',
    })
    expect(getDiscoverySEOPolicy({ destination: 'hanoi' })).toEqual({
      canonicalPath: '/journeys',
      robots: 'noindex,follow',
    })
    expect(getDiscoverySEOPolicy({ unknownValueCount: 1 })).toEqual({
      canonicalPath: '/journeys',
      robots: 'noindex,follow',
    })
  })

  it('builds AND query conditions without weakening the taxonomy query API', () => {
    expect(
      buildDiscoveryWhere({ destination: 'hanoi', style: 'culture', duration: '8-14' }),
    ).toEqual({
      and: [
        { _status: { equals: 'published' } },
        { wrapperPage: { exists: true } },
        { destinationTags: { in: ['hanoi'] } },
        { travelStyles: { in: ['culture'] } },
        { durationDays: { greater_than_equal: 8 } },
        { durationDays: { less_than_equal: 14 } },
      ],
    })
    expect(buildDiscoveryWhere({}).and).toEqual([
      { _status: { equals: 'published' } },
      { wrapperPage: { exists: true } },
    ])
  })

  it('projects only safe public fields and fails closed for invalid records', () => {
    expect(projectDiscoveryTour({ locale: 'en', site, tour: tour() })).toEqual({
      currency: 'USD',
      destinationTags: ['hanoi'],
      duration: { days: 7, nights: 6 },
      hero: { alt: 'Hanoi hero', url: '/media/hanoi.jpg' },
      href: '/tour/hanoi-private-tour',
      id: 12,
      price: { currency: 'USD', kind: 'from', value: 1290 },
      priceFrom: 1290,
      slug: 'hanoi-private-tour',
      summary: 'Private Hanoi discovery.',
      title: 'Hanoi Private Tour',
      travelStyles: ['culture'],
    })

    expect(
      projectDiscoveryTour({
        locale: 'en',
        site,
        tour: tour({ currency: null, priceFrom: null }),
      }),
    ).toMatchObject({
      currency: null,
      price: { kind: 'on-request' },
      priceFrom: null,
    })

    expect(projectDiscoveryTour({ site, tour: tour({ _status: 'draft' }) })).toBeNull()
    expect(projectDiscoveryTour({ site, tour: tour({ site: 9 }) })).toBeNull()
    expect(projectDiscoveryTour({ site, tour: tour({ wrapperPage: 44 }) })).toBeNull()
    expect(
      projectDiscoveryTour({
        site,
        tour: tour({ wrapperPage: { _status: 'published', site: 9, pathname: '/x' } }),
      }),
    ).toBeNull()
    expect(
      projectDiscoveryTour({
        site,
        tour: tour({ wrapperPage: { _status: 'draft', site: 3, pathname: '/x' } }),
      }),
    ).toBeNull()
    expect(projectDiscoveryTour({ site, tour: tour({ title: '' }) })).toBeNull()
    expect(projectDiscoveryTour({ site, tour: tour({ summary: '' }) })).toBeNull()
    expect(projectDiscoveryTour({ site, tour: tour({ heroMedia: null }) })).toBeNull()
    expect(
      projectDiscoveryTour({
        site,
        tour: tour({ heroMedia: { alt: '', site: 3, url: '/x.jpg' } }),
      }),
    ).toBeNull()
    expect(
      projectDiscoveryTour({
        site,
        tour: tour({ heroMedia: { alt: 'x', site: 9, url: '/x.jpg' } }),
      }),
    ).toBeNull()
    expect(projectDiscoveryTour({ site, tour: tour({ destinationTags: [] }) })).toBeNull()
    expect(projectDiscoveryTour({ site, tour: tour({ travelStyles: [] }) })).toBeNull()
    expect(projectDiscoveryTour({ site, tour: tour({ durationDays: 0 }) })).toBeNull()
  })
})
