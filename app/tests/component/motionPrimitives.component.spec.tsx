import { act, render, screen } from '@testing-library/react'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { CountUp } from '@/components/CountUp'
import { RevealOnScroll } from '@/components/RevealOnScroll'
import { useScrollDirection } from '@/hooks/useScrollDirection'

type ObserverRecord = {
  callback: IntersectionObserverCallback
  disconnect: ReturnType<typeof vi.fn<() => void>>
  element?: Element
  options?: IntersectionObserverInit
}

let observerRecords: ObserverRecord[] = []
let reducedMotion = false

class ControlledIntersectionObserver {
  private record: ObserverRecord

  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.record = {
      callback,
      disconnect: vi.fn<() => void>(),
      options,
    }
    observerRecords.push(this.record)
  }

  disconnect() {
    this.record.disconnect()
  }

  observe(element: Element) {
    this.record.element = element
  }

  takeRecords() {
    return []
  }

  unobserve() {}
}

const triggerIntersection = (index: number, isIntersecting: boolean) => {
  const record = observerRecords[index]
  if (!record || !record.element) throw new Error(`Observer ${index} was not registered`)

  act(() => {
    record.callback(
      [
        {
          isIntersecting,
          target: record.element,
        } as IntersectionObserverEntry,
      ],
      {} as IntersectionObserver,
    )
  })
}

const DirectionProbe = ({ threshold = 8 }: { threshold?: number }) => {
  const direction = useScrollDirection({ threshold })
  return <output>{direction}</output>
}

describe('motion primitives', () => {
  beforeEach(() => {
    observerRecords = []
    reducedMotion = false
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
        matches: query === '(prefers-reduced-motion: reduce)' ? reducedMotion : false,
        media: query,
        onchange: null,
        removeEventListener: () => undefined,
      }),
      writable: true,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('reveals content once it intersects and disconnects by default', () => {
    render(<RevealOnScroll>Hidden journey card</RevealOnScroll>)

    const element = screen.getByText('Hidden journey card')
    expect(element.className).toContain('motion-reveal')
    expect(element.className).not.toContain('is-in-view')
    expect(observerRecords[0]?.options?.threshold).toBe(0.15)

    triggerIntersection(0, true)

    expect(element.className).toContain('is-in-view')
    expect(element.getAttribute('data-in-view')).toBe('true')
    expect(observerRecords[0]?.disconnect).toHaveBeenCalledTimes(1)
  })

  it('renders RevealOnScroll in-view immediately for reduced motion users', () => {
    reducedMotion = true

    render(<RevealOnScroll>Static journey card</RevealOnScroll>)

    const element = screen.getByText('Static journey card')
    expect(element.className).toContain('is-in-view')
    expect(observerRecords).toHaveLength(0)
  })

  it('falls back to plain text when CountUp receives non-numeric content', () => {
    render(<CountUp suffix="+" value="24/7" />)

    expect(screen.getByText('24/7+').getAttribute('data-count-up')).toBe('fallback')
    expect(observerRecords).toHaveLength(0)
  })

  it('animates CountUp only after entering the viewport', () => {
    vi.useFakeTimers()
    vi.setSystemTime(0)

    render(<CountUp durationMs={1000} locale="en-US" suffix="+" value={1000} />)

    const element = screen.getByText('1,000+')
    expect(element.getAttribute('data-count-up')).toBe('idle')

    triggerIntersection(0, true)
    expect(element.getAttribute('data-count-up')).toBe('active')

    act(() => vi.advanceTimersByTime(500))
    expect(Number(element.textContent?.replace(/\D/g, ''))).toBeGreaterThan(0)

    act(() => vi.advanceTimersByTime(700))
    expect(element.textContent).toBe('1,000+')
  })

  it('renders CountUp final value immediately for reduced motion users', () => {
    reducedMotion = true

    render(<CountUp locale="en-US" suffix="%" value={88} />)

    expect(screen.getByText('88%').getAttribute('data-count-up')).toBe('active')
    expect(observerRecords).toHaveLength(0)
  })

  it('throttles scroll direction updates through requestAnimationFrame', () => {
    vi.useFakeTimers()
    render(<DirectionProbe threshold={10} />)

    expect(screen.getByText('idle')).toBeTruthy()

    Object.defineProperty(window, 'scrollY', { configurable: true, value: 24 })
    act(() => {
      window.dispatchEvent(new Event('scroll'))
      window.dispatchEvent(new Event('scroll'))
    })

    expect(screen.getByText('idle')).toBeTruthy()

    act(() => vi.advanceTimersByTime(20))
    expect(screen.getByText('down')).toBeTruthy()

    Object.defineProperty(window, 'scrollY', { configurable: true, value: 2 })
    act(() => {
      window.dispatchEvent(new Event('scroll'))
      vi.advanceTimersByTime(20)
    })

    expect(screen.getByText('up')).toBeTruthy()
  })
})
