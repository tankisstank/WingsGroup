import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const router = { replace: vi.fn() }
let params = new URLSearchParams('destination=hanoi&style=culture&duration=8-14')

vi.mock('next/navigation', () => ({
  usePathname: () => '/journeys',
  useRouter: () => router,
  useSearchParams: () => params,
}))
vi.mock('@/components/SiteLink', () => ({
  SiteLink: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={String(href)} {...props}>
      {children}
    </a>
  ),
}))

import { WingSideJourneysClient } from '@/app/(frontend)/journeys/WingSideJourneysClient'
import type { DiscoveryContext } from '@/tours/discoveryCore'

const context = (overrides: Partial<DiscoveryContext> = {}): DiscoveryContext => ({
  query: { destination: 'hanoi', duration: '8-14', style: 'culture', unknownValueCount: 0 },
  result: {
    appliedQuery: { destination: 'hanoi', style: 'culture' },
    items: [
      {
        destinationTags: ['hanoi'],
        duration: { days: 6, nights: 5 },
        hero: { alt: 'Hanoi hero', url: '/media/hanoi.jpg' },
        href: '/tour/private-hanoi',
        id: 10,
        slug: 'private-hanoi',
        summary: 'A real published journey.',
        title: 'Private Hanoi',
        travelStyles: ['culture'],
      },
    ],
    relaxed: null,
    total: 1,
    unknownValueCount: 0,
  },
  seo: { canonicalPath: '/journeys', robots: 'noindex,follow' },
  ...overrides,
})

afterEach(cleanup)
beforeEach(() => {
  router.replace.mockReset()
  params = new URLSearchParams('destination=hanoi&style=culture&duration=8-14')
})

describe('WingSideJourneysClient', () => {
  it('renders typed cards with safe detail, plan and contact context links', () => {
    render(<WingSideJourneysClient context={context()} locale="en" />)

    const card = screen.getByRole('link', { name: /private hanoi/i })
    expect(card.getAttribute('href')).toBe(
      '/tour/private-hanoi?source=journeys&destination=hanoi&style=culture&duration=8-14',
    )
    expect(screen.getByRole('link', { name: 'Plan trip' }).getAttribute('href')).toBe(
      '/plan-your-trip?intent=inquiry&source=journeys&destination=hanoi&style=culture&duration=8-14',
    )
    expect(screen.getByRole('link', { name: 'Contact us' }).getAttribute('href')).toBe(
      '/contact-us?intent=contact&source=journeys&destination=hanoi&style=culture&duration=8-14',
    )
    expect(within(card).getByRole('img').getAttribute('src')).toBe('/media/hanoi.jpg')
    expect(within(card).getByText('6 days / 5 nights')).toBeTruthy()
  })

  it('announces invalid and relaxed states without raw values', () => {
    render(
      <WingSideJourneysClient
        context={context({
          query: { destination: 'hanoi', unknownValueCount: 2 },
          result: {
            ...context().result,
            relaxed: { removed: 'duration', query: { destination: 'hanoi', style: 'culture' } },
            unknownValueCount: 2,
          },
        })}
        locale="vi"
      />,
    )

    const notice = screen.getByTestId('journeys-notice').textContent || ''
    expect(notice).toContain('Một số giá trị lọc')
    expect(notice).toContain('thời lượng')
    expect(notice).not.toContain('raw-secret')
  })

  it('updates shareable URL state without requesting scroll reset', () => {
    render(<WingSideJourneysClient context={context()} locale="en" />)
    screen.getByLabelText('Duration').focus()
    fireEvent.change(screen.getByLabelText('Duration'), { target: { value: '1-7' } })

    expect(router.replace).toHaveBeenCalledWith(
      '/journeys?destination=hanoi&style=culture&duration=1-7',
      { scroll: false },
    )
    expect(document.activeElement).toBe(screen.getByLabelText('Duration'))
  })
})
