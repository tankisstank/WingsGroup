import { cleanup, render, screen, within } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/components/SiteLink', () => ({
  SiteLink: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={String(href)} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('@/blocks/RenderBlocks', () => ({ RenderBlocks: () => null }))
vi.mock('@/components/WingsSideHiFi/HomeHeroCarousel', () => ({ HomeHeroCarousel: () => null }))
vi.mock('@/components/WingsSideHiFi/HomePlanner', () => ({ HomePlanner: () => null }))
vi.mock('@/components/WingsSideHiFi/HomeProcessSteps', () => ({ HomeProcessSteps: () => null }))
vi.mock('@/components/WingsSideHiFi/CredentialsCarousel', () => ({
  WingsSideCredentialsCarousel: () => null,
}))

import { HomeHiFiPage } from '@/components/WingsSideHiFi/HomeHiFiPage'
import type { WingsSideHiFiPageModel } from '@/utilities/wingsSideHiFiPageModel'

const baseModel = (): WingsSideHiFiPageModel => ({
  enabled: true,
  hero: {},
  isValid: true,
  issues: [],
  locale: 'en',
  routeContent: null,
  routePath: '/',
  routeVariant: 'home',
  sections: [],
})

const card = (id: number, title: string) => ({
  duration: { days: 6, nights: 5 },
  hero: { alt: `${title} image`, url: `/media/${id}.jpg` },
  href: `/tours/${id}`,
  id,
  price: { currency: 'USD', kind: 'from' as const, value: 2450 },
  summary: `${title} summary`,
  title,
})

afterEach(cleanup)

describe('HomeHiFiPage curated tours', () => {
  it('uses ready cards and their explicit taxonomy keys for hub CTA routes', () => {
    const model = baseModel()
    model.homeCuration = {
      destinationTours: [
        { ...card(1, 'Sapa curated tour'), key: 'sapa' },
        { ...card(2, 'Hanoi curated tour'), key: 'hanoi' },
      ],
      featuredJourneys: [
        card(3, 'Featured priced journey'),
        {
          ...card(4, 'Featured on request'),
          price: { kind: 'on-request', label: 'On request' },
        },
      ],
      issues: [],
      state: 'ready',
      styleTours: [{ ...card(5, 'Romance curated tour'), key: 'romance' }],
    }

    render(<HomeHiFiPage model={model} />)

    const destinations = screen.getByTestId('home-dest-grid')
    expect(
      within(destinations)
        .getByRole('link', { name: /sapa curated tour/i })
        .getAttribute('href'),
    ).toBe('/journeys?destination=sapa')
    expect(within(destinations).getByText('Sapa curated tour summary')).toBeTruthy()

    const styles = screen.getByTestId('home-styles-grid')
    expect(
      within(styles)
        .getByRole('link', { name: /romance curated tour/i })
        .getAttribute('href'),
    ).toBe('/journeys?style=romance')

    expect(screen.getByText('Featured on request')).toBeTruthy()
    expect(screen.getByText('On request')).toBeTruthy()
    expect(screen.getByText(/2,450/)).toBeTruthy()
    expect(screen.queryByText('Can one trip cover the icons — without the rush?')).toBeNull()
  })

  it('fails closed without legacy promotional cards when curation is invalid', () => {
    const model = baseModel()
    model.homeCuration = {
      destinationTours: [],
      featuredJourneys: [],
      issues: ['A selected tour is unpublished.'],
      state: 'invalid',
      styleTours: [],
    }

    render(<HomeHiFiPage model={model} />)

    expect(screen.getAllByText('Curated journeys are not currently available.')).toHaveLength(3)
    expect(screen.queryByText('Can one trip cover the icons — without the rush?')).toBeNull()
    expect(screen.queryByText('Hanoi')).toBeNull()
  })

  it('fails closed instead of rendering legacy product facts while curation is unconfigured', () => {
    render(<HomeHiFiPage model={baseModel()} />)

    expect(screen.getAllByText('Curated journeys are not currently available.')).toHaveLength(3)
    expect(screen.queryByText('Can one trip cover the icons — without the rush?')).toBeNull()
  })
})
