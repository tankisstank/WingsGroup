import type {
  StatsBlock as StatsBlockProps,
  TestimonialBlock as TestimonialBlockProps,
} from '@/payload-types'

import { act, render, screen } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { StatsBlock } from '@/blocks/Stats/Component'
import { TestimonialBlock } from '@/blocks/Testimonial/Component'
import { Testimonial } from '@/blocks/Testimonial/config'

type ObserverRecord = {
  callback: IntersectionObserverCallback
  element?: Element
}

let observerRecords: ObserverRecord[] = []

class ControlledIntersectionObserver {
  private record: ObserverRecord

  constructor(callback: IntersectionObserverCallback) {
    this.record = { callback }
    observerRecords.push(this.record)
  }

  disconnect() {}

  observe(element: Element) {
    this.record.element = element
  }

  takeRecords() {
    return []
  }

  unobserve() {}
}

const triggerIntersection = (index: number) => {
  const record = observerRecords[index]
  if (!record?.element) throw new Error(`Observer ${index} was not registered`)

  act(() => {
    record.callback(
      [
        {
          isIntersecting: true,
          target: record.element,
        } as IntersectionObserverEntry,
      ],
      {} as IntersectionObserver,
    )
  })
}

describe('inbound Page Composer blocks', () => {
  beforeEach(() => {
    observerRecords = []
    vi.useRealTimers()

    Object.defineProperty(window, 'IntersectionObserver', {
      configurable: true,
      value: ControlledIntersectionObserver,
      writable: true,
    })

    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: (query: string) => ({
        addEventListener: () => undefined,
        dispatchEvent: () => false,
        matches: false,
        media: query,
        onchange: null,
        removeEventListener: () => undefined,
      }),
      writable: true,
    })
  })

  it('renders Stats with count-up enhancement and static initial values', () => {
    vi.useFakeTimers()
    vi.setSystemTime(0)

    render(
      <StatsBlock
        {...({
          blockType: 'stats',
          items: [
            {
              label: 'Journeys supported',
              value: '2,500+',
            },
          ],
          presentation: 'logo-proof',
          title: 'Trust proof',
        } as StatsBlockProps)}
      />,
    )

    const count = screen.getByText('2,500+')
    expect(count.getAttribute('data-count-up')).toBe('idle')
    expect(screen.getByText('Journeys supported')).toBeTruthy()

    triggerIntersection(0)
    expect(count.getAttribute('data-count-up')).toBe('active')

    act(() => vi.advanceTimersByTime(1400))
    expect(count.textContent).toBe('2,500+')
  })

  it('renders the testimonial carousel as an accessible snap carousel without fake ratings', () => {
    render(
      <TestimonialBlock
        {...({
          blockType: 'testimonial',
          items: [
            {
              country: 'United Kingdom',
              name: 'Family route brief',
              noteDate: '2026-07-02T00:00:00.000Z',
              quote: 'We want culture moments without too many hotel changes.',
              role: 'Sample planning note',
            },
            {
              name: 'Culture-led brief',
              quote: 'The route should explain why each city matters.',
              role: 'Sample planning note',
            },
          ],
          presentation: 'carousel',
          title: 'Traveler notes for planning',
        } as TestimonialBlockProps)}
      />,
    )

    expect(
      screen
        .getByRole('region', { name: 'Traveler notes for planning' })
        .getAttribute('aria-roledescription'),
    ).toBe('carousel')
    expect(screen.getByRole('group', { name: '1 of 2' })).toBeTruthy()
    expect(screen.getByText('United Kingdom')).toBeTruthy()
    expect(screen.getByText('02 Jul 2026')).toBeTruthy()
    expect(screen.queryByLabelText(/trên 5 sao/)).toBeNull()
  })

  it('advances testimonial carousels every three seconds when more than three notes exist', () => {
    vi.useFakeTimers()
    const items = Array.from({ length: 4 }, (_, index) => ({
      name: `Planning note ${index + 1}`,
      quote: `Route preference ${index + 1}`,
      role: 'Sample planning note',
    }))

    render(
      <TestimonialBlock
        {...({
          blockType: 'testimonial',
          items,
          presentation: 'carousel',
          title: 'Autoplay traveler notes',
        } as TestimonialBlockProps)}
      />,
    )

    const carousel = screen.getByRole('region', { name: 'Autoplay traveler notes' })
    const cards = carousel.querySelectorAll<HTMLElement>('.layout-testimonial')
    const scrollTo = vi.fn()
    Object.defineProperty(carousel, 'scrollTo', { configurable: true, value: scrollTo })
    Object.defineProperty(cards[1], 'offsetLeft', { configurable: true, value: 320 })

    act(() => vi.advanceTimersByTime(3000))

    expect(scrollTo).toHaveBeenCalledWith({ behavior: 'smooth', left: 320 })
    expect(screen.getByRole('button', { name: 'Pause traveler notes carousel' })).toBeTruthy()
  })

  it('keeps ratings opt-in in both the CMS schema and renderer', () => {
    const itemsField = Testimonial.fields.find((field) => 'name' in field && field.name === 'items')
    const ratingField =
      itemsField && 'fields' in itemsField
        ? itemsField.fields.find((field) => 'name' in field && field.name === 'rating')
        : undefined

    expect(ratingField).toBeDefined()
    expect(
      ratingField && 'defaultValue' in ratingField ? ratingField.defaultValue : undefined,
    ).toBeUndefined()

    render(
      <TestimonialBlock
        {...({
          blockType: 'testimonial',
          items: [{ name: 'Verified traveler', quote: 'A sourced review.', rating: 4 }],
          presentation: 'quote-grid',
          title: 'Verified reviews',
        } as TestimonialBlockProps)}
      />,
    )

    expect(screen.getByLabelText('4 trên 5 sao').textContent).toBe('★★★★')
  })
})
