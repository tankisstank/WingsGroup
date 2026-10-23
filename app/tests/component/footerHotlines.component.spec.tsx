import React from 'react'
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SiteSetting } from '@/payload-types'

const context = vi.hoisted(() => ({
  site: { code: 'wings-go' },
  settings: null as Partial<SiteSetting> | null,
  locale: 'vi',
  publicPathname: '/',
}))

vi.mock('@/utilities/getSiteSettings', () => ({
  getCurrentSiteSettings: async () => context.settings as SiteSetting | null,
}))
vi.mock('@/utilities/siteContext', () => ({
  getCurrentSite: async () => context.site,
  getCurrentLocale: async () => context.locale,
  getCurrentPublicPathname: async () => context.publicPathname,
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
  context.locale = 'vi'
  context.publicPathname = '/'
})

describe('Footer CMS hotlines', () => {
  it('lists all three WingsGo numbers and the shared Zalo OA', async () => {
    const { container } = render(await Footer())
    const numbers = Array.from(container.querySelectorAll('a[href^="tel:"]'), (link) => link.getAttribute('href'))
    expect(new Set(numbers)).toEqual(new Set(['tel:0912910101', 'tel:0915250101', 'tel:0915260101']))
    expect(container.querySelector('a[href="https://zalo.me/4142059657526524531"]')).toBeTruthy()
  })

  it('uses a custom main and keeps deleted supplementary numbers absent', async () => {
    context.settings = { supportPhone: '0919000000', additionalHotlines: [] }
    const { container } = render(await Footer())
    expect(new Set(Array.from(container.querySelectorAll('a[href^="tel:"]'), (link) => link.getAttribute('href'))))
      .toEqual(new Set(['tel:0919000000']))
    expect(container.textContent).not.toContain('0915 250 101')
  })

  it.each(['wing-side', 'wings-group'])('does not inject WingsGo defaults into %s', async (siteCode) => {
    context.site = { code: siteCode }
    context.settings = { supportPhone: '+33 1 23 45 67 89' }
    const { container } = render(await Footer())
    expect(new Set(Array.from(container.querySelectorAll('a[href^="tel:"]'), (link) => link.getAttribute('href'))))
      .toEqual(new Set(['tel:+33123456789']))
    expect(container.textContent).not.toContain('0915 250 101')
  })

  describe('WingsGroup V3 Surface footer consolidation', () => {
    it('renders exactly 1 primary hotline and 1 supportEmail on V3 surface (VI), omitting secondary hotlines, Zalo OA, and 24/7 consultation CTA', async () => {
      context.site = { code: 'wings-group' }
      context.locale = 'vi'
      context.publicPathname = '/'
      context.settings = {
        wingsGroupV3: { enabled: true },
        supportPhone: '0948786775',
        additionalHotlines: [
          { phoneNumber: '0915250101', label: 'Tư vấn tour', id: 'hotline-1' },
          { phoneNumber: '0915260101', label: 'Hỗ trợ dịch vụ', id: 'hotline-2' },
        ],
        supportEmail: 'contact@wingsgroup.vn',
        salesEmail: 'sales@wingsgroup.vn',
      }

      const { container } = render(await Footer())

      // 1. Exactly 1 primary hotline
      const telLinks = Array.from(container.querySelectorAll('a[href^="tel:"]'), (l) => l.getAttribute('href'))
      expect(telLinks).toEqual(['tel:0948786775'])
      expect(container.textContent).toContain('0948 786 775')
      expect(container.textContent).not.toContain('0915 250 101')
      expect(container.textContent).not.toContain('0915 260 101')

      // 2. Exactly 1 email (supportEmail prioritized)
      const mailLinks = Array.from(container.querySelectorAll('a[href^="mailto:"]'), (l) => l.getAttribute('href'))
      expect(mailLinks).toEqual(['mailto:contact@wingsgroup.vn'])
      expect(container.querySelector('a[href="mailto:sales@wingsgroup.vn"]')).toBeNull()

      // 3. No Zalo OA link in footer
      expect(container.querySelector('a[href*="zalo.me"]')).toBeNull()

      // 4. No 24/7 consultation CTA
      expect(container.querySelector('[data-wingsgroup-consultation-trigger]')).toBeNull()
      expect(container.textContent).not.toContain('LIÊN HỆ TƯ VẤN 24/7')

      // 5. Preserves legal identity & privacy policy
      expect(container.querySelector('a[href="/chinh-sach-bao-mat"]')).toBeTruthy()
      expect(container.textContent).toContain('Trụ sở chính')
    })

    it('renders exactly 1 primary hotline and 1 supportEmail on V3 surface (EN), omitting secondary hotlines, Zalo OA, and 24/7 consultation CTA', async () => {
      context.site = { code: 'wings-group' }
      context.locale = 'en'
      context.publicPathname = '/ve-wingsgroup'
      context.settings = {
        wingsGroupV3: { enabled: true },
        supportPhone: '0948786775',
        additionalHotlines: [
          { phoneNumber: '0915250101', label: 'Tour consultation', id: 'hotline-1' },
          { phoneNumber: '0915260101', label: 'Travel support', id: 'hotline-2' },
        ],
        supportEmail: 'contact@wingsgroup.vn',
      }

      const { container } = render(await Footer())

      // 1. Exactly 1 primary hotline
      const telLinks = Array.from(container.querySelectorAll('a[href^="tel:"]'), (l) => l.getAttribute('href'))
      expect(telLinks).toEqual(['tel:0948786775'])
      expect(container.textContent).not.toContain('0915 250 101')

      // 2. Exactly 1 email
      const mailLinks = Array.from(container.querySelectorAll('a[href^="mailto:"]'), (l) => l.getAttribute('href'))
      expect(mailLinks).toEqual(['mailto:contact@wingsgroup.vn'])

      // 3. No Zalo & No CTA
      expect(container.querySelector('a[href*="zalo.me"]')).toBeNull()
      expect(container.querySelector('[data-wingsgroup-consultation-trigger]')).toBeNull()
      expect(container.textContent).not.toContain('24/7 CONSULTATION')

      // 4. Preserves English privacy policy & legal address
      expect(container.textContent).toContain('Customer Privacy Policy')
      expect(container.textContent).toContain('Head Office')
    })

    it('falls back to salesEmail on V3 when supportEmail is empty', async () => {
      context.site = { code: 'wings-group' }
      context.publicPathname = '/'
      context.settings = {
        wingsGroupV3: { enabled: true },
        supportPhone: '0948786775',
        salesEmail: 'sales@wingsgroup.vn',
      }

      const { container } = render(await Footer())

      const mailLinks = Array.from(container.querySelectorAll('a[href^="mailto:"]'), (l) => l.getAttribute('href'))
      expect(mailLinks).toEqual(['mailto:sales@wingsgroup.vn'])
    })

    it('does not insert hardcoded fallbacks when CMS hotlines or emails are empty on V3', async () => {
      context.site = { code: 'wings-group' }
      context.publicPathname = '/'
      context.settings = {
        wingsGroupV3: { enabled: true },
        supportPhone: '',
        additionalHotlines: [],
      }

      const { container } = render(await Footer())

      // No phone link
      expect(container.querySelector('a[href^="tel:"]')).toBeNull()
      // No email link
      expect(container.querySelector('a[href^="mailto:"]')).toBeNull()
      // No empty contacts container
      expect(container.querySelector('.site-footer__contacts')).toBeNull()
      // No hardcoded numbers
      expect(container.textContent).not.toContain('0912')
      expect(container.textContent).not.toContain('0948')
    })

    it('omits tel link when supportPhone is invalid on V3, rendering only valid email without raw fallback', async () => {
      context.site = { code: 'wings-group' }
      context.publicPathname = '/'
      context.settings = {
        wingsGroupV3: { enabled: true },
        supportPhone: 'invalid-phone-abc',
        additionalHotlines: [],
        supportEmail: 'contact@wingsgroup.vn',
      }

      const { container } = render(await Footer())

      // Exactly 0 tel links (no invalid raw phone link generated)
      expect(container.querySelector('a[href^="tel:"]')).toBeNull()
      expect(container.textContent).not.toContain('invalid-phone')

      // Exactly 1 email link
      const mailLinks = Array.from(container.querySelectorAll('a[href^="mailto:"]'), (l) => l.getAttribute('href'))
      expect(mailLinks).toEqual(['mailto:contact@wingsgroup.vn'])
    })

    it('preserves multi-hotline and Zalo behavior for WingsGroup when V3 is disabled', async () => {
      context.site = { code: 'wings-group' }
      context.publicPathname = '/'
      context.settings = {
        wingsGroupV3: { enabled: false },
        supportPhone: '0948786775',
        additionalHotlines: [
          { phoneNumber: '0915250101', label: 'Tư vấn tour', id: 'hotline-1' },
        ],
        supportEmail: 'contact@wingsgroup.vn',
        salesEmail: 'sales@wingsgroup.vn',
      }

      const { container } = render(await Footer())

      // Renders both hotlines
      const telLinks = Array.from(container.querySelectorAll('a[href^="tel:"]'), (l) => l.getAttribute('href'))
      expect(new Set(telLinks)).toEqual(new Set(['tel:0948786775', 'tel:0915250101']))

      // Renders both emails
      expect(container.querySelector('a[href="mailto:contact@wingsgroup.vn"]')).toBeTruthy()
      expect(container.querySelector('a[href="mailto:sales@wingsgroup.vn"]')).toBeTruthy()

      // Renders Zalo
      expect(container.querySelector('a[href*="zalo.me"]')).toBeTruthy()
    })

    it('preserves footer behavior for WingSide tenant', async () => {
      context.site = { code: 'wing-side' }
      context.settings = {
        supportPhone: '+84912345678',
        supportEmail: 'support@wingside.com',
      }

      const { container } = render(await Footer())

      expect(container.querySelector('[data-testid="wingsside-hifi-footer"]')).toBeTruthy()
      expect(container.querySelector('a[href="tel:+84912345678"]')).toBeTruthy()
      expect(container.querySelector('a[href="mailto:support@wingside.com"]')).toBeTruthy()
    })
  })
})
