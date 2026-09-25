import React from 'react'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  usePathname: () => '/wing-side/packages',
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock('@/providers/SitePath', () => ({
  useSitePublicPathname: () => '/packages',
}))

vi.mock('@/components/SiteLink', () => ({
  SiteLink: ({
    children,
    href,
    ...rest
  }: React.PropsWithChildren<{ href: string } & Record<string, unknown>>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

vi.mock('@/components/Link', () => ({
  CMSLink: ({
    children,
    label,
    url,
  }: React.PropsWithChildren<{ label?: string; url?: string }>) => (
    <a href={url || '#cms'}>{children || label}</a>
  ),
}))

import { HeaderNav } from '@/Header/Nav'

describe('WingSide hi-fi header chrome (site isolation)', () => {
  it('renders full 7-route nav + Plan trip CTA for the wing-side tenant only', () => {
    render(
      <HeaderNav
        data={{ navItems: [] }}
        publicPathname="/packages"
        resolvedLocale="en"
        siteCode="wing-side"
      />,
    )

    expect(screen.getByRole('navigation', { name: 'Primary navigation' })).toBeTruthy()
    for (const label of [
      'Home',
      'Destinations',
      'Styles',
      'Packages',
      'Guide',
      'About',
      'Contact',
    ]) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0)
    }
    expect(screen.getAllByText('Plan trip').length).toBeGreaterThan(0)
    expect(screen.queryByRole('link', { name: /search/i })).toBeNull()

    const packages = screen.getAllByRole('link', { name: 'Packages' })[0]
    expect(packages.getAttribute('aria-current')).toBe('page')
    expect(packages.getAttribute('data-active')).toBe('true')
  })

  it('does not force WingSide nav on WingsGo', () => {
    const { container, unmount } = render(
      <HeaderNav
        data={{
          navItems: [
            {
              link: {
                label: 'WingsGo Home',
                type: 'custom',
                url: '/',
              },
            },
          ],
        }}
        primaryAction={{ label: 'Book now', url: '/contact' }}
        publicPathname="/"
        resolvedLocale="en"
        siteCode="wings-go"
        themeKey="wings-go"
      />,
    )

    const root = container.querySelector('[data-hifi-nav]')
    expect(root?.getAttribute('data-hifi-nav')).toBe('false')
    expect(container.querySelector('a[href="/destinations"]')).toBeNull()
    expect(container.querySelector('a[href="/travel-guide"]')).toBeNull()
    expect(container.querySelector('a[href="/search"]')).toBeNull()
    expect(container.textContent).toContain('Home')
    expect(container.textContent).toContain('Departure schedule')
    expect(container.textContent).toContain('0912 910 101')
    unmount()
  })

  it('keeps desktop primary nav gated behind xl; mobile control present at 390px contract', () => {
    const { container } = render(
      <HeaderNav
        data={{ navItems: [] }}
        publicPathname="/packages"
        resolvedLocale="en"
        siteCode="wing-side"
      />,
    )

    const desktopNav = container.querySelector('nav[aria-label="Primary navigation"]')
    expect(desktopNav).toBeTruthy()
    // Tailwind: hidden by default, xl:flex at ≥1280px — must not be plain "flex" only.
    expect(desktopNav?.className).toMatch(/\bhidden\b/)
    expect(desktopNav?.className).toMatch(/\bxl:flex\b/)
    expect(desktopNav?.className.split(/\s+/)).not.toContain('flex')

    const mobileToggle = container.querySelector(
      'button[aria-controls="mobile-primary-navigation"]',
    )
    expect(mobileToggle).toBeTruthy()
    expect(mobileToggle?.getAttribute('aria-expanded')).toBe('false')

    // Style contract: display:flex override lives only inside min-width:1280px.
    const cssPath = path.resolve(process.cwd(), 'src/app/(frontend)/globals.css')
    const css = readFileSync(cssPath, 'utf8')
    const mediaBlock = css.match(
      /@media\s*\(\s*min-width:\s*1280px\s*\)\s*\{[\s\S]*?data-hifi-nav='true'[\s\S]*?Primary navigation'\][\s\S]*?display:\s*flex;/,
    )
    expect(mediaBlock).toBeTruthy()

    // Unscoped (viewport-wide) display:flex on hifi primary nav must not exist.
    const unscoped = css.match(
      /body\[data-site-code='wing-side'\]\s+\.site-header__nav\[data-hifi-nav='true'\]\s*>\s*nav\[aria-label='Primary navigation'\]\s*\{\s*display:\s*flex;/,
    )
    // If a match exists, it must be nested under the min-width media query captured above —
    // reject any earlier unscoped occurrence outside that media query.
    if (unscoped) {
      const unscopedIndex = css.indexOf(unscoped[0])
      const mediaIndex = css.indexOf('@media (min-width: 1280px)')
      expect(unscopedIndex).toBeGreaterThan(mediaIndex)
    }
  })
})
