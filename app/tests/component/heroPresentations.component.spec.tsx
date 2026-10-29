import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  CinematicCarouselHero,
  heroPresentationComponents,
  PlannerSplitHero,
  VideoBackgroundHero,
} from '@/heros/presentations'
import { HighImpactHero } from '@/heros/HighImpact'
import { heroPresentationDefinitions } from '@/heros/presentations/registry'
import { defaultHeroBehavior } from '@/heros/presentations/registry'

vi.mock('@/components/Media', () => ({
  Media: ({ onLoad, resource }: { onLoad?: () => void; resource?: { alt?: string; url?: string } }) => {
    React.useEffect(() => {
      onLoad?.()
    }, [onLoad])
    return (
      // eslint-disable-next-line @next/next/no-img-element -- test mock for Payload Media output
      <img alt={resource?.alt || 'hero visual'} onLoad={onLoad} src={resource?.url || '/media/test.jpg'} />
    )
  },
}))

vi.mock('@/components/RichText', () => ({
  default: () => <h1>Hero heading</h1>,
}))

vi.mock('@/components/Link', () => ({
  CMSLink: ({ label, url }: { label?: string; url?: string }) => <a href={url}>{label}</a>,
}))

const media = (id: number, alt: string) =>
  ({
    alt,
    id,
    updatedAt: '2026-06-23T00:00:00.000Z',
    url: `/media/${id}.jpg`,
  }) as never

describe('hero presentation components', () => {
  beforeEach(() => {
    vi.useRealTimers()
    window.IntersectionObserver = class {
      callback: IntersectionObserverCallback
      constructor(callback: IntersectionObserverCallback) {
        this.callback = callback
      }
      observe(target: Element) {
        this.callback([{ isIntersecting: true, target } as IntersectionObserverEntry], this as unknown as IntersectionObserver)
      }
      disconnect() {}
      unobserve() {}
      takeRecords() {
        return []
      }
    } as unknown as typeof IntersectionObserver
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('provides a render component for every registered template', () => {
    for (const definition of heroPresentationDefinitions) {
      expect(heroPresentationComponents[definition.value]).toBeTypeOf('function')
    }
  })

  it('renders planner content, visual and business panel', () => {
    render(
      <PlannerSplitHero
        badge="Plan Vietnam"
        behavior={defaultHeroBehavior}
        businessPanel={<aside>Planner panel</aside>}
        media={media(1, 'Vietnam')}
        postcards={['Ha Noi']}
      />,
    )

    expect(screen.getByText('Plan Vietnam')).toBeTruthy()
    expect(screen.getByAltText('Vietnam')).toBeTruthy()
    expect(screen.getByText('Planner panel')).toBeTruthy()
  })

  it('renders WingSide hi-fi editorial split layout for the inbound cinematic preset', () => {
    render(
      <CinematicCarouselHero
        badge="Journeys"
        behavior={defaultHeroBehavior}
        businessPanel={<aside>Planner panel</aside>}
        postcards={[]}
        preset={{ key: 'wingsside-inbound-cinematic-search' }}
        slides={[
          {
            description: 'Private routes with a local planning team.',
            id: 'one',
            media: media(1, 'First'),
            title: 'Tailor-made Vietnam journeys',
          },
        ]}
      />,
    )

    const root = document.querySelector('.hero-presentation--carousel-hifi-split')
    expect(root?.getAttribute('data-hifi-split')).toBe('true')
    const hifiTitle = document.querySelector('.hero-presentation__hifi-title')
    expect(hifiTitle?.textContent).toBe('Tailor-made Vietnam journeys')
    expect(hifiTitle?.tagName).toBe('H1')
    expect(hifiTitle?.classList.contains('sr-only')).toBe(false)
    expect(document.querySelector('.hero-presentation__hifi-lede')?.textContent).toBe(
      'Private routes with a local planning team.',
    )
    expect(screen.getByText('Planner panel')).toBeTruthy()
    expect(document.querySelector('.hero-presentation__hifi-copy')).toBeTruthy()
    expect(document.querySelector('.hero-presentation__carousel-overlay')).toBeNull()
  })

  it('supports carousel controls, autoplay and pause', () => {
    vi.useFakeTimers()
    render(
      <CinematicCarouselHero
        badge="Journeys"
        behavior={{ ...defaultHeroBehavior, intervalMs: 3000 }}
        postcards={[]}
        slides={[
          { id: 'one', media: media(1, 'First'), title: 'First journey' },
          { id: 'two', media: media(2, 'Second'), title: 'Second journey' },
        ]}
      />,
    )

    expect(screen.getByRole('heading', { level: 1, name: 'First journey' })).toBeTruthy()
    expect(
      screen.getAllByRole('heading', { level: 1 }).filter((node) => node.classList.contains('sr-only')),
    ).toHaveLength(1)
    expect(screen.getByLabelText('Slide 1 of 2').getAttribute('data-active')).toBe('true')
    fireEvent.click(screen.getByLabelText('Next slide'))
    expect(screen.getByLabelText('Slide 2 of 2').getAttribute('data-active')).toBe('true')

    // Manual navigation intentionally pauses autoplay so the selected content
    // is not replaced immediately after a user interaction.
    expect(screen.getByLabelText('Play carousel')).toBeTruthy()
    act(() => vi.advanceTimersByTime(6000))
    expect(screen.getByLabelText('Slide 2 of 2').getAttribute('data-active')).toBe('true')

    fireEvent.click(screen.getByLabelText('Play carousel'))
    act(() => vi.advanceTimersByTime(3000))
    expect(screen.getByLabelText('Slide 1 of 2').getAttribute('data-active')).toBe('true')

    fireEvent.click(screen.getByLabelText('Pause carousel'))
    act(() => vi.advanceTimersByTime(6000))
    expect(screen.getByLabelText('Slide 1 of 2').getAttribute('data-active')).toBe('true')
  })

  it('configures VideoBackgroundHero with pointer-events-none content shell and pointer-events-auto copy to preserve controls hit-testing', () => {
    render(
      <VideoBackgroundHero
        badge="Vietnam in motion"
        behavior={defaultHeroBehavior}
        links={[
          {
            link: {
              label: 'Explore Vietnam',
              type: 'custom',
              url: '/tours/vietnam',
            },
          },
        ]}
        postcards={[]}
        resolvedLocale="en"
        video={{
          desktopVideo: {
            id: 10,
            mimeType: 'video/mp4',
            url: '/media/hero.mp4',
          } as never,
          poster: media(11, 'Video poster'),
        }}
      />,
    )

    const contentShell = document.querySelector('.hero-presentation__video-content')
    expect(contentShell?.classList.contains('pointer-events-none')).toBe(true)

    const copyWrapper = contentShell?.firstElementChild
    expect(copyWrapper?.classList.contains('pointer-events-auto')).toBe(true)

    // CTA interaction preserved
    const ctaLink = screen.getByRole('link', { name: 'Explore Vietnam' })
    expect(ctaLink).toBeTruthy()
    expect(ctaLink.closest('.pointer-events-auto')).toBeTruthy()

    // Control button is accessible with resolvedLocale="en" label propagated from caller
    const controlButton = screen.getByRole('button', { name: /pause hero video|play hero video/i })
    expect(controlButton).toBeTruthy()
  })

  it('uses the poster as video fallback after a playback error', () => {
    render(
      <VideoBackgroundHero
        badge="Vietnam in motion"
        behavior={defaultHeroBehavior}
        postcards={[]}
        video={{
          desktopVideo: {
            id: 10,
            mimeType: 'video/mp4',
            updatedAt: '2026-06-23T00:00:00.000Z',
            url: '/media/hero.mp4',
          } as never,
          poster: media(11, 'Video poster'),
        }}
      />,
    )

    expect(screen.getByAltText('Video poster')).toBeTruthy()
    const video = document.querySelector('video')
    expect(video).toBeTruthy()
    fireEvent.error(video as HTMLVideoElement)
    expect(document.querySelector('video')).toBeNull()
    expect(screen.getByAltText('Video poster')).toBeTruthy()
  })

  it('renders HighImpactHero retail-departures with dynamic featured tours and promoLabel', () => {
    render(
      <HighImpactHero
        heroFeaturedTours={[
          {
            duration: { days: 5, nights: 4 },
            href: '/tour/seoul-nami',
            id: 1,
            image: null,
            market: 'korea',
            nextDeparture: {
              airline: 'VJ',
              date: '2026-11-15T00:00:00.000Z',
              departureCity: 'Hà Nội',
              promoLabel: 'Mùa lá đỏ',
            },
            price: { currency: 'VND', kind: 'verified', value: 14900000 },
            slug: 'seoul-nami',
            summary: 'Tour Seoul',
            title: 'Hà Nội - Seoul - Nami',
          },
          {
            duration: { days: 6, nights: 5 },
            href: '/tour/tokyo-fuji',
            id: 2,
            image: null,
            market: 'japan',
            nextDeparture: {
              airline: 'VN',
              date: '2026-11-20T00:00:00.000Z',
              departureCity: 'Hà Nội',
              promoLabel: null,
            },
            price: { currency: 'VND', kind: 'verified', value: 24900000 },
            slug: 'tokyo-fuji',
            summary: 'Tour Tokyo',
            title: 'Hà Nội - Tokyo - Núi Phú Sĩ',
          },
        ]}
        type="highImpact"
        variant="retail-departures"
      />,
    )

    expect(screen.getByText('Ưu đãi hot')).toBeTruthy()
    expect(screen.getByText('Tour đang được quan tâm')).toBeTruthy()
    expect(screen.getByText('Hà Nội - Seoul - Nami')).toBeTruthy()
    expect(screen.getByText('Mùa lá đỏ')).toBeTruthy()
    expect(screen.getByText('14.900.000 ₫')).toBeTruthy()
    expect(screen.getByText('Hà Nội - Tokyo - Núi Phú Sĩ')).toBeTruthy()
    // Tour 2 doesn't have promoLabel, so it should not render a fake Hot badge
    expect(screen.queryByText('Hot')).toBeNull()
    expect(screen.getByText('Xem tất cả các tour')).toBeTruthy()
  })

  it('renders friendly empty state when heroFeaturedTours is empty', () => {
    render(
      <HighImpactHero
        heroFeaturedTours={[]}
        type="highImpact"
        variant="retail-departures"
      />,
    )

    expect(screen.getByText('Ưu đãi hot')).toBeTruthy()
    expect(
      screen.getByText('Hiện chưa có tour nổi bật. Xem toàn bộ tour đang mở bán bên dưới.'),
    ).toBeTruthy()
    expect(screen.getByText('Xem tất cả các tour')).toBeTruthy()
  })
})
