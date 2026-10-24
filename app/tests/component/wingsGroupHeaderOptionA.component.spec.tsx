import React from 'react'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams() }))
vi.mock('@/providers/SitePath', () => ({ useSitePublicPathname: () => '/' }))
vi.mock('@/utilities/useSitePath', () => ({
  useSitePath: () => (path: string) => path,
}))
vi.mock('@/components/SiteLink', () => ({
  SiteLink: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={String(href)} {...props}>{children}</a>
  ),
}))
vi.mock('@/components/Link', () => ({ CMSLink: () => null }))
vi.mock('@/blocks/Form/Component', () => ({ FormBlock: () => <div data-testid="mock-form" /> }))
vi.mock('@/components/ProtectedEmailLink', () => ({
  ProtectedEmailLink: ({ email }: { email: string }) => <a href={`mailto:${email}`}>{email}</a>,
}))

import { HeaderNav } from '@/Header/Nav'
import { WingsGroupContactSection } from '@/blocks/WingsGroupContact/Component'

afterEach(() => {
  cleanup()
  window.sessionStorage.clear()
})

const mockForm = {
  id: 1,
  title: 'Contact',
  fields: [],
  createdAt: '2026-10-23T00:00:00.000Z',
  updatedAt: '2026-10-23T00:00:00.000Z',
}

const defaultWingsGroupHotlines = [
  { href: 'tel:0948786775', normalized: '0948786775', raw: '0948786775' },
  { href: 'tel:0915250101', label: 'Tư vấn tour', normalized: '0915250101', raw: '0915250101' },
  { href: 'tel:0915260101', label: 'Hỗ trợ dịch vụ', normalized: '0915260101', raw: '0915260101' },
]

describe('US-085 WingsGroup Header Option A Implementation', () => {
  it('renders Option A split call button with main hotline 0948 786 775 on desktop (VI)', () => {
    render(
      <HeaderNav
        data={{ navItems: [] }}
        hotlines={defaultWingsGroupHotlines}
        publicPathname="/"
        resolvedLocale="vi"
        siteCode="wings-group"
        supportedLocales={['vi', 'en']}
        englishPublicationState="approved"
        wingsGroupV3Home
        wingsGroupV3Surface
      />,
    )

    const nav = screen.getByRole('navigation', { name: 'Primary navigation' })
    const mainCallLink = within(nav).getByRole('link', { name: /Gọi ngay 0948 786 775/i })
    expect(mainCallLink.getAttribute('href')).toBe('tel:0948786775')
    expect(mainCallLink.textContent).toContain('Gọi ngay')
    expect(mainCallLink.textContent).toContain('0948 786 775')

    // Disclosures and secondary channels
    const toggle = within(nav).getByRole('button', { name: 'Chọn kênh liên hệ' })
    expect(toggle.getAttribute('aria-expanded')).toBe('false')

    fireEvent.click(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')

    const popupID = toggle.getAttribute('aria-controls')!
    expect(popupID).toBe('wingsgroup-header-contact-dropdown')

    const popup = document.getElementById(popupID)!
    expect(popup).toBeTruthy()

    // Secondary hotlines
    expect(popup.querySelector('a[href="tel:0915250101"]')).toBeTruthy()
    expect(popup.querySelector('a[href="tel:0915260101"]')).toBeTruthy()

    // Zalo OA
    const zaloLink = popup.querySelector('a[href*="zalo.me"]')
    expect(zaloLink).toBeTruthy()
    expect(zaloLink?.textContent).toContain('Chat Zalo')

    // Send inquiry
    const inquiryLink = popup.querySelector('a[href*="/lien-he#contact-form"]')
    expect(inquiryLink).toBeTruthy()
    expect(inquiryLink?.textContent).toContain('Gửi nhu cầu')

    // Click inquiry sets sessionStorage focus context
    fireEvent.click(inquiryLink!)
    expect(window.sessionStorage.getItem('wingsgroup-contact-focus')).toBe('contact-form')
    expect(toggle.getAttribute('aria-expanded')).toBe('false')

    // Reopen and test Escape key closes dropdown
    fireEvent.click(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(toggle)
  })

  it('renders Option A in English with Call now and localized contact channels', () => {
    render(
      <HeaderNav
        data={{ navItems: [] }}
        hotlines={defaultWingsGroupHotlines}
        publicPathname="/en"
        resolvedLocale="en"
        siteCode="wings-group"
        supportedLocales={['vi', 'en']}
        englishPublicationState="approved"
        wingsGroupV3Home
        wingsGroupV3Surface
      />,
    )

    const nav = screen.getByRole('navigation', { name: 'Primary navigation' })
    const mainCallLink = within(nav).getByRole('link', { name: /Call now 0948 786 775/i })
    expect(mainCallLink.getAttribute('href')).toBe('tel:0948786775')
    expect(mainCallLink.textContent).toContain('Call now')

    const toggle = within(nav).getByRole('button', { name: 'Choose a contact channel' })
    fireEvent.click(toggle)

    const popup = document.getElementById('wingsgroup-header-contact-dropdown')!
    expect(popup.textContent).toContain('Tour consultation')
    expect(popup.textContent).toContain('Travel support')
    expect(popup.textContent).toContain('Chat on Zalo')
    expect(popup.textContent).toContain('Send an inquiry')
  })

  it('renders mobile tools with compact split call and full mobile drawer', () => {
    const { container } = render(
      <HeaderNav
        data={{ navItems: [] }}
        hotlines={defaultWingsGroupHotlines}
        publicPathname="/"
        resolvedLocale="vi"
        siteCode="wings-group"
        supportedLocales={['vi', 'en']}
        englishPublicationState="approved"
        wingsGroupV3Home
        wingsGroupV3Surface
      />,
    )

    // Mobile split call
    const mobileCall = container.querySelector('.wingsgroup-call-link--mobile')
    expect(mobileCall).toBeTruthy()
    expect(mobileCall?.getAttribute('href')).toBe('tel:0948786775')
    expect(mobileCall?.textContent).toContain('Gọi ngay')

    const mobileToggle = container.querySelector('.wingsgroup-split-toggle--mobile')
    expect(mobileToggle).toBeTruthy()

    // Open mobile drawer
    const menuBtn = screen.getByRole('button', { name: 'Mở điều hướng' })
    fireEvent.click(menuBtn)

    const drawer = document.getElementById('mobile-primary-navigation')!
    expect(drawer).toBeTruthy()
    expect(drawer.querySelector('a[href="tel:0948786775"]')).toBeTruthy()
    expect(drawer.querySelector('a[href="tel:0915250101"]')).toBeTruthy()
    expect(drawer.querySelector('a[href="tel:0915260101"]')).toBeTruthy()
    expect(drawer.querySelector('a[href*="zalo.me"]')).toBeTruthy()
    expect(drawer.querySelector('a[href*="/lien-he#contact-form"]')).toBeTruthy()
  })

  it('F3: localizes mobile dropdown channels in English (Tour consultation, Travel support)', () => {
    const { container } = render(
      <HeaderNav
        data={{ navItems: [] }}
        hotlines={defaultWingsGroupHotlines}
        publicPathname="/en"
        resolvedLocale="en"
        siteCode="wings-group"
        supportedLocales={['vi', 'en']}
        englishPublicationState="approved"
        wingsGroupV3Home
        wingsGroupV3Surface
      />,
    )

    const mobileToggle = container.querySelector('.wingsgroup-split-toggle--mobile') as HTMLButtonElement
    expect(mobileToggle).toBeTruthy()
    fireEvent.click(mobileToggle)

    const mobilePopup = document.getElementById('wingsgroup-mobile-contact-dropdown')!
    expect(mobilePopup).toBeTruthy()
    expect(mobilePopup.textContent).toContain('Tour consultation')
    expect(mobilePopup.textContent).toContain('Travel support')
    expect(mobilePopup.textContent).toContain('Chat on Zalo')
    expect(mobilePopup.textContent).toContain('Send an inquiry')
    expect(mobilePopup.textContent).not.toContain('Tư vấn tour')
  })

  it('F4: preserves locale-aware accessible labels for WingsGo mobile call button (VI and EN)', () => {
    // VI
    const { container: viContainer, unmount } = render(
      <HeaderNav
        data={{ navItems: [] }}
        hotlines={[{ href: 'tel:0912910101', normalized: '0912910101', raw: '0912910101' }]}
        publicPathname="/"
        resolvedLocale="vi"
        siteCode="wings-go"
        supportedLocales={['vi', 'en']}
      />,
    )
    const viMobileCall = viContainer.querySelector('.site-header__nav > div.flex a.site-icon-button')
    expect(viMobileCall?.getAttribute('aria-label')).toBe('Gọi hotline WingsGo 0912 910 101')
    unmount()

    // EN
    const { container: enContainer } = render(
      <HeaderNav
        data={{ navItems: [] }}
        hotlines={[{ href: 'tel:0912910101', normalized: '0912910101', raw: '0912910101' }]}
        publicPathname="/en"
        resolvedLocale="en"
        siteCode="wings-go"
        supportedLocales={['vi', 'en']}
      />,
    )
    const enMobileCall = enContainer.querySelector('.site-header__nav > div.flex a.site-icon-button')
    expect(enMobileCall?.getAttribute('aria-label')).toBe('Call WingsGo 0912 910 101')
  })

  it('F5: restores keyboard focus to hamburger button when closing drawer via Escape key', () => {
    render(
      <HeaderNav
        data={{ navItems: [] }}
        hotlines={defaultWingsGroupHotlines}
        publicPathname="/"
        resolvedLocale="vi"
        siteCode="wings-group"
        supportedLocales={['vi', 'en']}
        englishPublicationState="approved"
        wingsGroupV3Home
        wingsGroupV3Surface
      />,
    )

    const hamburger = screen.getByRole('button', { name: 'Mở điều hướng' })
    fireEvent.click(hamburger)

    const drawer = document.getElementById('mobile-primary-navigation')!
    expect(drawer).toBeTruthy()

    // Focus an inner link inside the drawer
    const firstDrawerLink = drawer.querySelector('a')!
    firstDrawerLink.focus()
    expect(document.activeElement).toBe(firstDrawerLink)

    // Press Escape
    fireEvent.keyDown(document, { key: 'Escape' })

    // Drawer is closed
    expect(document.getElementById('mobile-primary-navigation')).toBeNull()

    // Focus is restored to the hamburger button
    expect(document.activeElement).toBe(hamburger)
  })

  it.each([
    ['vi', 'Gọi ngay: 0948 786 775'],
    ['en', 'Call now: 0948 786 775'],
  ])('keeps only the main call alternative beside the %s contact form', (locale, callLabel) => {
    const { container } = render(
      <WingsGroupContactSection
        blockType="formBlock"
        form={mockForm}
        hotlines={defaultWingsGroupHotlines}
        locale={locale}
        siteCode="wings-group"
        wingsGroupV3
      />,
    )
    const directContacts = screen.getByTestId('wingsgroup-direct-contacts')
    const links = within(directContacts).getAllByRole('link')
    expect(links).toHaveLength(1)
    expect(links[0].textContent).toBe(callLabel)
    expect(links[0].getAttribute('href')).toBe('tel:0948786775')
    expect(container.querySelector('a[href^="mailto:"]')).toBeNull()
    expect(container.querySelector('a[href*="zalo.me"]')).toBeNull()
    expect(screen.getByTestId('mock-form')).toBeTruthy()
  })

  it('F1 (contact block): respects empty hotlines array and does not render hardcoded phone link', () => {
    // hotlines = [] (authoritative empty)
    const { container: emptyContainer } = render(
      <WingsGroupContactSection
        blockType="formBlock"
        enableIntro={false}
        form={mockForm}
        hotlines={[]}
        locale="vi"
        siteCode="wings-group"
        wingsGroupV3
      />,
    )
    expect(emptyContainer.querySelector('a[href^="tel:"]')).toBeNull()
    expect(emptyContainer.querySelector('[data-testid="wingsgroup-direct-contacts"]')).toBeNull()

    // hotlines = undefined (fallback to default)
    const { container: fallbackContainer } = render(
      <WingsGroupContactSection
        blockType="formBlock"
        enableIntro={false}
        form={mockForm}
        locale="vi"
        siteCode="wings-group"
        wingsGroupV3
      />,
    )
    const fallbackLink = fallbackContainer.querySelector('a[href="tel:0948786775"]')
    expect(fallbackLink).toBeTruthy()
    expect(fallbackLink?.textContent).toContain('0948 786 775')
  })

  it('uses a custom CMS main hotline beside the form', () => {
    render(
      <WingsGroupContactSection
        blockType="formBlock"
        form={mockForm}
        hotlines={[{ href: 'tel:0919000000', normalized: '0919000000', raw: '0919000000' }]}
        siteCode="wings-group"
        wingsGroupV3
      />,
    )
    const link = within(screen.getByTestId('wingsgroup-direct-contacts')).getByRole('link')
    expect(link.getAttribute('href')).toBe('tel:0919000000')
    expect(link.textContent).toBe('Gọi ngay: 0919 000 000')
  })

  it('provides accessible language switcher labels with VI and EN compact buttons', () => {
    render(
      <HeaderNav
        data={{ navItems: [] }}
        hotlines={defaultWingsGroupHotlines}
        publicPathname="/"
        resolvedLocale="vi"
        siteCode="wings-group"
        supportedLocales={['vi', 'en']}
        englishPublicationState="approved"
        wingsGroupV3Home
        wingsGroupV3Surface
      />,
    )

    const viLink = screen.getByRole('link', { name: 'Tiếng Việt (vi)' })
    const enLink = screen.getByRole('link', { name: 'ENGLISH (en)' })
    expect(viLink.textContent).toBe('VI')
    expect(enLink.textContent).toBe('EN')
    expect(viLink.getAttribute('aria-current')).toBe('page')
  })

  it('handles empty hotlines gracefully without crashing or emitting empty tel: links', () => {
    const { container } = render(
      <HeaderNav
        data={{ navItems: [] }}
        hotlines={[]}
        publicPathname="/"
        resolvedLocale="vi"
        siteCode="wings-group"
        supportedLocales={['vi', 'en']}
        englishPublicationState="approved"
        wingsGroupV3Home
        wingsGroupV3Surface
      />,
    )

    expect(container.querySelector('a[href="tel:"]')).toBeNull()
  })
})
