import { act, fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  CinematicCarouselHero,
  heroPresentationComponents,
  PlannerSplitHero,
  VideoBackgroundHero,
} from '@/heros/presentations'
import { heroPresentationDefinitions } from '@/heros/presentations/registry'
import { defaultHeroBehavior } from '@/heros/presentations/registry'

vi.mock('@/components/Media', () => ({
  Media: ({ resource }: { resource?: { alt?: string; url?: string } }) => (
    // eslint-disable-next-line @next/next/no-img-element -- test mock for Payload Media output
    <img alt={resource?.alt || 'hero visual'} src={resource?.url || '/media/test.jpg'} />
  ),
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

    expect(screen.getByLabelText('Slide 1 of 2').getAttribute('data-active')).toBe('true')
    fireEvent.click(screen.getByLabelText('Next slide'))
    expect(screen.getByLabelText('Slide 2 of 2').getAttribute('data-active')).toBe('true')

    fireEvent.click(screen.getByLabelText('Pause carousel'))
    act(() => vi.advanceTimersByTime(6000))
    expect(screen.getByLabelText('Slide 2 of 2').getAttribute('data-active')).toBe('true')

    fireEvent.click(screen.getByLabelText('Play carousel'))
    act(() => vi.advanceTimersByTime(3000))
    expect(screen.getByLabelText('Slide 1 of 2').getAttribute('data-active')).toBe('true')
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
})
