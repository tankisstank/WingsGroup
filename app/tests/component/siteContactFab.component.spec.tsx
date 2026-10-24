import React from 'react'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { SiteContactFab } from '@/components/SiteContactFab'
import { resolveSiteHotlines } from '@/utilities/siteHotlines'
import type { SiteSetting } from '@/payload-types'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('SiteContactFab hotlines', () => {
  it('offers three callable numbers and one shared OA, then restores focus on Escape', () => {
    render(<SiteContactFab locale="vi" siteCode="wings-go" />)
    const trigger = screen.getByRole('button', { name: 'Liên hệ' })
    fireEvent.click(trigger)
    const dialog = screen.getByRole('dialog')
    expect(Array.from(dialog.querySelectorAll('a[href^="tel:"]'), (link) => link.getAttribute('href')))
      .toEqual(['tel:0948786775', 'tel:0915250101', 'tel:0915260101'])
    expect(dialog.querySelectorAll('a[href="https://zalo.me/4142059657526524531"]')).toHaveLength(1)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })

  it('uses CMS values and respects an explicitly empty prop', () => {
    const hotlines = resolveSiteHotlines({
      supportPhone: '0919000000',
      additionalHotlines: [],
    } as unknown as SiteSetting, 'wings-go')
    const { rerender } = render(<SiteContactFab hotlines={hotlines} locale="en" siteCode="wings-go" />)
    fireEvent.click(screen.getByRole('button', { name: 'Contact us' }))
    expect(screen.getByRole('dialog').querySelector('a[href^="tel:"]')?.getAttribute('href'))
      .toBe('tel:0919000000')
    rerender(<SiteContactFab hotlines={[]} locale="en" siteCode="wings-go" />)
    expect(screen.getByRole('dialog').querySelector('a[href^="tel:"]')).toBeNull()
  })

  it('keeps WingSide contact behavior and does not render for WingsGroup', () => {
    const observer = vi.fn()
    vi.stubGlobal('IntersectionObserver', observer)
    const { rerender } = render(<SiteContactFab locale="en" siteCode="wing-side" />)
    fireEvent.click(screen.getByRole('button', { name: 'Contact us' }))
    const dialog = screen.getByRole('dialog')
    expect(dialog.querySelectorAll('a[href^="tel:"]')).toHaveLength(1)
    expect(dialog.querySelector('a[href^="tel:"]')?.getAttribute('href')).toBe('tel:0912910101')
    expect(within(dialog).getByRole('link', { name: 'Open contact page' }).getAttribute('href'))
      .toBe('/contact-us')
    expect(dialog.querySelector('a[href^="https://zalo.me/"]')).toBeNull()
    rerender(<SiteContactFab locale="en" siteCode="wings-group" />)
    expect(screen.queryByRole('button', { name: 'Contact us' })).toBeNull()
    expect(observer).not.toHaveBeenCalled()
  })

  it('hides the WingsGo trigger at the footer, preserves an open dialog and restores footer focus', () => {
    let reportIntersection: (visible: boolean) => void
    const disconnect = vi.fn()
    vi.stubGlobal('IntersectionObserver', class {
      constructor(callback: IntersectionObserverCallback) {
        reportIntersection = (visible) => callback(
          [{ isIntersecting: visible } as IntersectionObserverEntry],
          {} as IntersectionObserver,
        )
      }
      observe() {}
      disconnect = disconnect
    })
    const { unmount } = render(
      <>
        <footer className="site-footer">
          <a className="wingsgo-footer__phone" href="tel:0948786775">Call now</a>
        </footer>
        <SiteContactFab locale="en" siteCode="wings-go" />
      </>,
    )
    const trigger = screen.getByRole('button', { name: 'Contact us' })
    act(() => reportIntersection(true))
    expect(screen.queryByRole('button', { name: 'Contact us' })).toBeNull()
    expect(trigger.hidden).toBe(true)
    act(() => reportIntersection(false))
    expect(screen.getByRole('button', { name: 'Contact us' })).toBe(trigger)
    fireEvent.click(trigger)
    act(() => reportIntersection(true))
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(trigger.hidden).toBe(false)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(screen.getByRole('link', { name: 'Call now' }))
    expect(trigger.hidden).toBe(true)
    unmount()
    expect(disconnect).toHaveBeenCalledTimes(1)
  })
})
