import { describe, expect, it } from 'vitest'

import { buildStructuredTourBreadcrumbItems } from '@/tours/structuredTourBreadcrumbs'

const baseItems = [
  { label: 'WingSide', path: '/' },
  { label: 'Packages', path: '/packages' },
  { label: 'Wrapper title', path: '/tour/example' },
]

describe('buildStructuredTourBreadcrumbItems', () => {
  it('uses Journeys as the parent when a tour detail is opened from guided discovery', () => {
    expect(
      buildStructuredTourBreadcrumbItems({
        baseItems,
        canonicalPath: '/tour/ninh-binh',
        locale: 'en',
        pageTitle: 'Ninh Binh - Tam Coc & Mua Cave Private Tour from Hanoi 1 days',
        searchParams: {
          destination: 'hanoi',
          duration: '8-14',
          source: 'journeys',
          style: 'romance',
        },
        siteCode: 'wing-side',
      }),
    ).toEqual([
      { label: 'WingSide', path: '/' },
      { label: 'Journeys', path: '/journeys?destination=hanoi&style=romance&duration=8-14' },
      { label: 'Ninh Binh - Tam Coc & Mua Cave Private Tour from Hanoi', path: '/tour/ninh-binh' },
    ])
  })

  it('drops invalid discovery query values from the Journeys breadcrumb href', () => {
    expect(
      buildStructuredTourBreadcrumbItems({
        baseItems,
        canonicalPath: '/tour/ninh-binh',
        locale: 'en',
        pageTitle: 'Ninh Binh',
        searchParams: {
          destination: '<script>',
          duration: '999',
          source: 'journeys',
          style: 'unknown',
        },
        siteCode: 'wing-side',
      })[1],
    ).toEqual({ label: 'Journeys', path: '/journeys' })
  })

  it('keeps Packages as the parent for direct structured tour detail visits', () => {
    expect(
      buildStructuredTourBreadcrumbItems({
        baseItems,
        canonicalPath: '/tour/ninh-binh',
        locale: 'en',
        pageTitle: 'Ninh Binh',
        searchParams: {},
        siteCode: 'wing-side',
      })[1],
    ).toEqual({ label: 'Packages', path: '/packages' })
  })
})
