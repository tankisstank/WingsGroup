import React from 'react'
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SiteSetting } from '@/payload-types'

const context = vi.hoisted(() => ({
  site: { code: 'wings-go' },
  settings: null as SiteSetting | null,
}))

vi.mock('@/utilities/getSiteSettings', () => ({
  getCurrentSiteSettings: async () => context.settings,
}))
vi.mock('@/utilities/siteContext', () => ({
  getCurrentSite: async () => context.site,
  getCurrentLocale: async () => 'vi',
  getCurrentPublicPathname: async () => '/',
}))
vi.mock('@/providers/Theme/ThemeSelector', () => ({ ThemeSelector: () => null }))
vi.mock('@/components/Logo/Logo', () => ({ Logo: () => <span>Logo</span> }))
vi.mock('@/components/SiteLink', () => ({
  SiteLink: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={String(href)} {...props}>{children}</a>
  ),
}))
vi.mock('@/components/Link', () => ({ CMSLink: () => null }))

import { Footer } from '@/Footer/Component'

afterEach(() => {
  cleanup()
  context.site = { code: 'wings-go' }
  context.settings = null
})

describe('Footer CMS hotlines', () => {
  it('lists all three WingsGo numbers and the shared Zalo OA', async () => {
    const { container } = render(await Footer())
    const numbers = Array.from(container.querySelectorAll('a[href^="tel:"]'), (link) => link.getAttribute('href'))
    expect(new Set(numbers)).toEqual(new Set(['tel:0912910101', 'tel:0915250101', 'tel:0915260101']))
    expect(container.querySelector('a[href="https://zalo.me/4142059657526524531"]')).toBeTruthy()
  })

  it('uses a custom main and keeps deleted supplementary numbers absent', async () => {
    context.settings = { supportPhone: '0919000000', additionalHotlines: [] } as unknown as SiteSetting
    const { container } = render(await Footer())
    expect(new Set(Array.from(container.querySelectorAll('a[href^="tel:"]'), (link) => link.getAttribute('href'))))
      .toEqual(new Set(['tel:0919000000']))
    expect(container.textContent).not.toContain('0915 250 101')
  })

  it.each(['wing-side', 'wings-group'])('does not inject WingsGo defaults into %s', async (siteCode) => {
    context.site = { code: siteCode }
    context.settings = { supportPhone: '+33 1 23 45 67 89' } as SiteSetting
    const { container } = render(await Footer())
    expect(new Set(Array.from(container.querySelectorAll('a[href^="tel:"]'), (link) => link.getAttribute('href'))))
      .toEqual(new Set(['tel:+33123456789']))
    expect(container.textContent).not.toContain('0915 250 101')
  })
})
