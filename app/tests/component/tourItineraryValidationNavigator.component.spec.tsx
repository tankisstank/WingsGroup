import { cleanup, render, waitFor } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const formMocks = vi.hoisted(() => ({ fields: {} as Record<string, { errorMessage?: string; valid?: boolean }>, submitted: false }))

vi.mock('@payloadcms/ui', () => ({
  useAllFormFields: () => [formMocks.fields, vi.fn()],
  useFormSubmitted: () => formMocks.submitted,
}))

import TourItineraryValidationNavigator from '@/components/TourItineraryValidationNavigator'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  formMocks.fields = {}
  formMocks.submitted = false
})

describe('Tour itinerary validation navigation', () => {
  it('opens the itinerary tab and focuses the first invalid field after submit', async () => {
    formMocks.fields = { 'itineraryDays.0.title': { errorMessage: 'Required', valid: false } }
    formMocks.submitted = true
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0)
      return 1
    })
    const scrollIntoView = vi.fn()
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: scrollIntoView })
    const tabClick = vi.fn()

    const { container } = render(
      <>
        <button className="tabs-field__tab-button" onClick={tabClick} type="button">Lịch trình</button>
        <div className="tour-itinerary-days"><input id="field-itineraryDays__0__title" /></div>
        <TourItineraryValidationNavigator />
      </>,
    )

    const input = container.querySelector<HTMLInputElement>('#field-itineraryDays__0__title')!
    await waitFor(() => expect(tabClick).toHaveBeenCalledOnce())
    expect(document.activeElement).toBe(input)
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' })
  })

  it('scrolls to the itinerary array when the required row itself is missing', async () => {
    formMocks.fields = { itineraryDays: { errorMessage: 'Required', valid: false } }
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0)
      return 1
    })
    const scrollIntoView = vi.fn()
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: scrollIntoView })

    const { container } = render(
      <>
        <button className="tabs-field__tab-button" type="button">Lịch trình</button>
        <div className="tour-itinerary-days" />
        <TourItineraryValidationNavigator />
      </>,
    )

    const arrayField = container.querySelector<HTMLElement>('.tour-itinerary-days')!
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledOnce())
    expect(arrayField.tabIndex).toBe(-1)
    expect(document.activeElement).toBe(arrayField)
  })
})
