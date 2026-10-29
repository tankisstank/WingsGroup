import { cleanup, render } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/components/SiteLink', () => ({
  SiteLink: ({ children, className, href }: { children: React.ReactNode; className?: string; href?: string }) => (
    <a className={className} href={href}>{children}</a>
  ),
}))

vi.mock('@/providers/HeaderTheme', () => ({
  useHeaderTheme: () => ({ setHeaderTheme: vi.fn() }),
}))

vi.mock('@/utilities/useSitePath', () => ({
  useSitePath: () => (path: string) => path,
}))

vi.mock('@/components/Media', () => ({
  Media: ({ resource }: { resource?: { alt?: string; url?: string } }) => (
    // eslint-disable-next-line @next/next/no-img-element -- mock for component tests
    <img alt={resource?.alt || 'hero media'} src={resource?.url || '/media/test.jpg'} />
  ),
}))

vi.mock('@/components/RichText', () => ({
  default: () => <h1>Hero heading</h1>,
}))

vi.mock('@/components/Link', () => ({
  CMSLink: ({ label, url, className }: { label?: string; url?: string; className?: string }) => (
    <a className={className} href={url}>{label}</a>
  ),
}))

import { HighImpactHero } from '@/heros/HighImpact'
import type { WingsGoCatalogCard } from '@/tours/wingsGoCatalog'

afterEach(() => {
  cleanup()
})

const fixture: WingsGoCatalogCard[] = [
  {
    duration: { days: 5, nights: 4 },
    href: '/tour/seoul-nami',
    id: 1,
    image: { alt: 'Seoul Nami', url: '/media/seoul.jpg' },
    market: 'korea',
    nextDeparture: {
      airline: 'VJ',
      date: '2026-11-15T00:00:00.000Z',
      departureCity: 'Hà Nội',
      promoLabel: 'Giảm 2 triệu',
    },
    price: { currency: 'VND', kind: 'verified', originalPrice: 16900000, value: 14900000 },
    slug: 'seoul-nami',
    summary: 'Tour Seoul Nami 5N4D',
    title: 'Hà Nội - Seoul - Nami',
  },
  {
    duration: { days: 10, nights: 9 },
    href: '/tour/chau-au-5-nuoc',
    id: 2,
    image: null,
    market: 'europe',
    nextDeparture: {
      airline: null,
      date: '2026-12-01T00:00:00.000Z',
      departureCity: 'TP.HCM',
      promoLabel: null,
    },
    price: { kind: 'contact', label: 'Liên hệ' },
    slug: 'chau-au-5-nuoc',
    summary: 'Tour Châu Âu 5 Nước',
    title: 'Tour Châu Âu 5 Nước',
  },
  {
    duration: { days: 6, nights: 5 },
    href: '/tour/tokyo-phu-si',
    id: 3,
    image: { alt: 'Tokyo Fuji', url: '/media/tokyo.jpg' },
    market: 'japan',
    nextDeparture: {
      airline: 'VN',
      date: '2026-12-10T00:00:00.000Z',
      departureCity: 'Hà Nội',
      promoLabel: 'Hot deal',
    },
    price: { currency: 'VND', kind: 'verified', originalPrice: null, value: 9900000 },
    slug: 'tokyo-phu-si',
    summary: 'Tour Tokyo Phú Sĩ',
    title: 'Hà Nội - Tokyo - Núi Phú Sĩ',
  },
  {
    duration: { days: 4, nights: 3 },
    href: '/tour/dai-loan',
    id: 4,
    image: null,
    market: 'taiwan',
    nextDeparture: {
      airline: 'CI',
      date: '2026-12-25T00:00:00.000Z',
      departureCity: 'Hà Nội',
      promoLabel: null,
    },
    price: { currency: 'VND', kind: 'verified', value: 8900000 },
    slug: 'dai-loan',
    summary: 'Tour Đài Loan',
    title: 'Tour Đài Loan 4N3D',
  },
]

describe('HighImpactHero retail-departures commerce panel regression snapshot', () => {
  it('renders VI retail-departures commerce panel and matches snapshot', () => {
    const { container } = render(
      <HighImpactHero
        heroFeaturedTours={fixture}
        resolvedLocale="vi"
        type="highImpact"
        variant="retail-departures"
      />,
    )
    const panel = container.querySelector('.site-hero__commerce-panel')
    expect(panel).not.toBeNull()
    expect(panel?.outerHTML).toMatchSnapshot()
  })

  it('renders EN retail-departures commerce panel and matches snapshot', () => {
    const { container } = render(
      <HighImpactHero
        heroFeaturedTours={fixture}
        resolvedLocale="en"
        type="highImpact"
        variant="retail-departures"
      />,
    )
    const panel = container.querySelector('.site-hero__commerce-panel')
    expect(panel).not.toBeNull()
    expect(panel?.outerHTML).toMatchSnapshot()
  })
})
