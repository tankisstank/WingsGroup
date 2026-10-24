import React from 'react'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams() }))
vi.mock('@/providers/SitePath', () => ({ useSitePublicPathname: () => '/' }))
vi.mock('@/components/SiteLink', () => ({
  SiteLink: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={String(href)} {...props}>{children}</a>
  ),
}))
vi.mock('@/components/Link', () => ({ CMSLink: () => null }))

import { HeaderNav } from '@/Header/Nav'

afterEach(cleanup)

describe('WingsGo hotline navigation', () => {
  it('keeps the main number callable and opens supplementary numbers with keyboard dismissal', () => {
    const { container } = render(
      <HeaderNav data={{ navItems: [] }} publicPathname="/" resolvedLocale="vi" siteCode="wings-go" />,
    )
    const nav = screen.getByRole('navigation', { name: 'Primary navigation' })
    expect(nav.querySelector('a[href="tel:0948786775"]')).toBeTruthy()
    const toggle = within(nav).getByRole('button', { name: /hotline/i })
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    const popupID = toggle.getAttribute('aria-controls')!
    const popup = document.getElementById(popupID)!
    expect(popup).toBeTruthy()
    expect(Array.from(popup.querySelectorAll('a[href^="tel:"]'), (link) => link.getAttribute('href')))
      .toEqual(['tel:0915250101', 'tel:0915260101'])
    popup.querySelector<HTMLAnchorElement>('a')!.focus()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(toggle)
    fireEvent.click(toggle)
    fireEvent.mouseDown(document.body)
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    const ids = Array.from(container.querySelectorAll('[id]'), (element) => element.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('lists three numbers in the mobile navigation and respects an empty CMS list', () => {
    const { container, rerender } = render(
      <HeaderNav data={{ navItems: [] }} publicPathname="/" resolvedLocale="vi" siteCode="wings-go" />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Mở điều hướng' }))
    for (const phone of ['0948786775', '0915250101', '0915260101']) {
      expect(container.querySelector(`a[href="tel:${phone}"]`)).toBeTruthy()
    }
    rerender(
      <HeaderNav data={{ navItems: [] }} hotlines={[]} publicPathname="/" resolvedLocale="vi" siteCode="wings-go" />,
    )
    expect(container.querySelector('a[href^="tel:"]')).toBeNull()
  })
})
