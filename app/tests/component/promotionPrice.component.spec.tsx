import { cleanup, render, screen } from '@testing-library/react'
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
    <img alt={resource?.alt || 'hero media'} src={resource?.url || '/media/test.jpg'} />
  ),
}))

vi.mock('@/components/RichText', () => ({
  default: () => <h1>Hero heading</h1>,
}))

vi.mock('@/components/Link', () => ({
  CMSLink: ({ label, url }: { label?: string; url?: string }) => <a href={url}>{label}</a>,
}))

import {
  isDisplayablePromoLabel,
  PromotionBadge,
  PromotionPrice,
} from '@/tours/PromotionPrice'
import { WingsGoTourCard } from '@/tours/WingsGoTourCard'
import { HighImpactHero } from '@/heros/HighImpact'
import type { WingsGoCatalogCard } from '@/tours/wingsGoCatalog'

afterEach(() => {
  cleanup()
})

const makeCard = (overrides?: Partial<WingsGoCatalogCard>): WingsGoCatalogCard => ({
  duration: { days: 5, nights: 4 },
  href: '/tour/seoul-nami',
  id: 'tour-1',
  image: { alt: 'Seoul', url: '/media/seoul.jpg' },
  market: 'korea',
  nextDeparture: {
    airline: 'Vietnam Airlines',
    date: '2026-11-15T00:00:00.000Z',
    departureCity: 'Hà Nội',
    promoLabel: 'Mùa lá đỏ',
  },
  price: {
    currency: 'VND',
    kind: 'verified',
    originalPrice: 15900000,
    value: 12900000,
  },
  slug: 'seoul-nami',
  summary: 'Khám phá Seoul và đảo Nami mùa thu.',
  title: 'Hà Nội - Seoul - Nami',
  ...overrides,
})

describe('PromotionPrice & PromotionBadge Component Tests', () => {
  describe('PromotionPrice', () => {
    it('renders original price in <del> before sale price with red styling when discount is valid', () => {
      const { container } = render(
        <PromotionPrice currency="VND" originalPrice={15000000} price={12000000} />,
      )

      const delEl = container.querySelector('del')
      expect(delEl).not.toBeNull()
      expect(delEl?.textContent).toContain('15.000.000')

      const saleSpan = container.querySelector('span.font-extrabold.text-red-600')
      expect(saleSpan).not.toBeNull()
      expect(saleSpan?.textContent).toContain('12.000.000')

      // Ensure <del> appears before the sale price in DOM tree
      const parent = container.firstElementChild
      const children = Array.from(parent?.children || [])
      const delIndex = children.indexOf(delEl as Element)
      const saleIndex = children.indexOf(saleSpan as Element)
      expect(delIndex).toBeGreaterThanOrEqual(0)
      expect(saleIndex).toBeGreaterThan(delIndex)
    })

    it('does not render <del> or red styling when originalPrice <= price', () => {
      // originalPrice equals price
      const { container: equalView } = render(
        <PromotionPrice currency="VND" originalPrice={12000000} price={12000000} />,
      )
      expect(equalView.querySelector('del')).toBeNull()
      expect(equalView.querySelector('.text-red-600')).toBeNull()
      expect(equalView.textContent).toContain('12.000.000')

      // originalPrice lower than price
      cleanup()
      const { container: lowerView } = render(
        <PromotionPrice currency="VND" originalPrice={10000000} price={12000000} />,
      )
      expect(lowerView.querySelector('del')).toBeNull()
      expect(lowerView.querySelector('.text-red-600')).toBeNull()
      expect(lowerView.textContent).toContain('12.000.000')
    })

    it('does not render <del> when originalPrice is zero, negative, NaN, null, or undefined', () => {
      for (const invalidOriginal of [0, -5000000, Number.NaN, Number.POSITIVE_INFINITY, null, undefined]) {
        cleanup()
        const { container } = render(
          <PromotionPrice currency="VND" originalPrice={invalidOriginal} price={12000000} />,
        )
        expect(container.querySelector('del')).toBeNull()
        expect(container.querySelector('.text-red-600')).toBeNull()
        expect(container.textContent).toContain('12.000.000')
      }
    })

    it('does not render <del> when sale price is zero, negative, or non-finite, falling back to contactLabel', () => {
      for (const invalidPrice of [0, -1000, Number.NaN, null, undefined]) {
        cleanup()
        const { container } = render(
          <PromotionPrice contactLabel="Liên hệ" currency="VND" originalPrice={15000000} price={invalidPrice} />,
        )
        expect(container.querySelector('del')).toBeNull()
        expect(container.querySelector('.text-red-600')).toBeNull()
        expect(container.textContent).toContain('Liên hệ')
      }
    })
  })

  describe('isDisplayablePromoLabel & PromotionBadge', () => {
    it('isDisplayablePromoLabel rejects numeric-only strings and empty/non-string values', () => {
      expect(isDisplayablePromoLabel('12000000')).toBe(false)
      expect(isDisplayablePromoLabel('12.000.000')).toBe(false)
      expect(isDisplayablePromoLabel(' 12,000,000 ')).toBe(false)
      expect(isDisplayablePromoLabel('12-000-000')).toBe(false)
      expect(isDisplayablePromoLabel('12 000 000')).toBe(false)
      expect(isDisplayablePromoLabel('')).toBe(false)
      expect(isDisplayablePromoLabel('   ')).toBe(false)
      expect(isDisplayablePromoLabel(null)).toBe(false)
      expect(isDisplayablePromoLabel(undefined)).toBe(false)
      expect(isDisplayablePromoLabel(123)).toBe(false)
    })

    it('isDisplayablePromoLabel accepts marketing text labels', () => {
      expect(isDisplayablePromoLabel('Mùa lá đỏ')).toBe(true)
      expect(isDisplayablePromoLabel('Flash Sale 20%')).toBe(true)
      expect(isDisplayablePromoLabel('Ưu đãi hè')).toBe(true)
      expect(isDisplayablePromoLabel('Hot Deal - Giảm 500k')).toBe(true)
    })

    it('PromotionBadge renders badge markup for valid text and returns null for numeric-only or empty', () => {
      const { container: validView } = render(<PromotionBadge label="Ưu đãi mùa thu" />)
      expect(validView.textContent).toContain('Ưu đãi mùa thu')
      expect(validView.querySelector('.bg-gradient-to-r')).not.toBeNull()

      cleanup()
      const { container: numericView } = render(<PromotionBadge label="15000000" />)
      expect(numericView.firstElementChild).toBeNull()

      cleanup()
      const { container: emptyView } = render(<PromotionBadge label="   " />)
      expect(emptyView.firstElementChild).toBeNull()

      cleanup()
      const { container: nullView } = render(<PromotionBadge label={null} />)
      expect(nullView.firstElementChild).toBeNull()
    })
  })

  describe('WingsGoTourCard & HighImpactHero DTO Integration', () => {
    it('renders WingsGoTourCard with promo badge, original price in <del>, and red sale price', () => {
      const card = makeCard()
      const { container } = render(<WingsGoTourCard card={card} locale="vi" />)

      // Promo badge
      expect(screen.getByText('Mùa lá đỏ')).toBeTruthy()

      // Original price del before red sale price
      const delEl = container.querySelector('del')
      expect(delEl).not.toBeNull()
      expect(delEl?.textContent).toContain('15.900.000')

      const saleEl = container.querySelector('.text-red-600')
      expect(saleEl).not.toBeNull()
      expect(saleEl?.textContent).toContain('12.900.000')
    })

    it('omits <del> and promo badge on WingsGoTourCard when originalPrice <= value or promoLabel is numeric-only', () => {
      const card = makeCard({
        nextDeparture: {
          airline: null,
          date: '2026-11-15T00:00:00.000Z',
          departureCity: null,
          promoLabel: '12900000', // numeric-only should be suppressed
        },
        price: {
          currency: 'VND',
          kind: 'verified',
          originalPrice: 12900000, // equal to value: discount suppressed
          value: 12900000,
        },
      })
      const { container } = render(<WingsGoTourCard card={card} locale="vi" />)

      expect(container.querySelector('del')).toBeNull()
      expect(container.querySelector('.text-red-600')).toBeNull()
      expect(screen.queryByText('12900000')).toBeNull()
      expect(container.textContent).toContain('12.900.000')
    })

    it('renders HighImpactHero hot offers row with PromotionBadge on image and PromotionPrice DTO', () => {
      const card = makeCard()
      const { container } = render(
        <HighImpactHero
          heroFeaturedTours={[card]}
          type="highImpact"
          variant="retail-departures"
        />,
      )

      expect(screen.getByText('Ưu đãi hot')).toBeTruthy()
      expect(screen.getByText('Hà Nội - Seoul - Nami')).toBeTruthy()

      // Promo badge overlay
      expect(screen.getByText('Mùa lá đỏ')).toBeTruthy()

      // PromotionPrice DTO in hot offer row
      const delEl = container.querySelector('del')
      expect(delEl).not.toBeNull()
      expect(delEl?.textContent).toContain('15.900.000')

      const saleEl = container.querySelector('.text-red-600')
      expect(saleEl).not.toBeNull()
      expect(saleEl?.textContent).toContain('12.900.000')
    })

    it('omits <del> and badge in HighImpactHero when originalPrice is missing and promoLabel is numeric-only', () => {
      const card = makeCard({
        nextDeparture: {
          airline: null,
          date: '2026-11-15T00:00:00.000Z',
          departureCity: null,
          promoLabel: '15900000',
        },
        price: {
          currency: 'VND',
          kind: 'verified',
          originalPrice: null,
          value: 12900000,
        },
      })
      const { container } = render(
        <HighImpactHero
          heroFeaturedTours={[card]}
          type="highImpact"
          variant="retail-departures"
        />,
      )

      expect(container.querySelector('del')).toBeNull()
      expect(container.querySelector('.text-red-600')).toBeNull()
      expect(screen.queryByText('15900000')).toBeNull()
      expect(container.textContent).toContain('12.900.000')
    })
  })
})
