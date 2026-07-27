import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const router = { refresh: vi.fn(), replace: vi.fn() }
let params = new URLSearchParams('destination=hanoi&style=culture&duration=8-14&utm_source=pm')

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

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

beforeEach(() => {
  router.replace.mockReset()
  router.refresh.mockReset()
  params = new URLSearchParams('destination=hanoi&style=culture&duration=8-14&utm_source=pm')
  window.history.replaceState(null, '', '/wingsside/journeys?destination=hanoi&style=culture&duration=8-14&utm_source=pm')
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

  it('updates shareable public URL state without scroll or history spam', () => {
    render(<WingSideJourneysClient context={context()} locale="en" />)
    const replaceState = vi.spyOn(window.history, 'replaceState')
    screen.getByLabelText('Duration').focus()

    fireEvent.change(screen.getByLabelText('Duration'), { target: { value: '1-7' } })

    const href = '/wingsside/journeys?destination=hanoi&style=culture&duration=1-7'
    expect(replaceState).toHaveBeenCalledWith(window.history.state, '', href)
    expect(`${window.location.pathname}${window.location.search}`).toBe(href)
    expect(router.refresh).toHaveBeenCalledTimes(1)
    expect(router.replace).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(screen.getByLabelText('Duration'))
  })

  it('updates locale-aware public URL state from the rewritten internal pathname', () => {
    window.history.replaceState(null, '', '/wingsside/vi/journeys?destination=hanoi&style=culture&duration=8-14')
    params = new URLSearchParams('destination=hanoi&style=culture&duration=8-14')

    render(<WingSideJourneysClient context={context()} locale="vi" />)
    const replaceState = vi.spyOn(window.history, 'replaceState')
    screen.getByLabelText('Điểm đến').focus()

    fireEvent.change(screen.getByLabelText('Điểm đến'), { target: { value: 'hue' } })

    const href = '/wingsside/vi/journeys?destination=hue&style=culture&duration=8-14'
    expect(replaceState).toHaveBeenCalledWith(window.history.state, '', href)
    expect(`${window.location.pathname}${window.location.search}`).toBe(href)
    expect(router.refresh).toHaveBeenCalledTimes(1)
    expect(router.replace).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(screen.getByLabelText('Điểm đến'))
  })

  it('keeps prior filters when destination, style and duration change sequentially', () => {
    window.history.replaceState(null, '', '/wingsside/journeys?utm_source=pm')
    params = new URLSearchParams('utm_source=pm')

    render(
      <WingSideJourneysClient
        context={context({
          query: { unknownValueCount: 1 },
          result: {
            ...context().result,
            appliedQuery: {},
            unknownValueCount: 1,
          },
        })}
        locale="en"
      />,
    )

    fireEvent.change(screen.getByLabelText('Destination'), { target: { value: 'hanoi' } })
    fireEvent.change(screen.getByLabelText('Style'), { target: { value: 'family' } })
    fireEvent.change(screen.getByLabelText('Duration'), { target: { value: '15-plus' } })

    expect(`${window.location.pathname}${window.location.search}`).toBe(
      '/wingsside/journeys?destination=hanoi&style=family&duration=15-plus',
    )
    expect(router.refresh).toHaveBeenCalledTimes(3)
    expect(router.replace).not.toHaveBeenCalled()
  })
})
