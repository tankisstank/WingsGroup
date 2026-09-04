import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { Logo } from '@/components/Logo/Logo'

afterEach(() => cleanup())

describe('child-site Logo', () => {
  it.each([
    ['wings-go', 'WingsGo logo', '/brand/wingsgo/wingsgo-logo-primary.png'],
    ['wing-side', 'WingSide logo', '/brand/wingsside/wingsside-logo-primary.png'],
  ])('renders %s with the approved primary asset and alt text', (siteCode, alt, src) => {
    const { container } = render(<Logo logoText="ignored display text" siteCode={siteCode} />)
    const image = container.querySelector('img')

    expect(image?.getAttribute('alt')).toBe(alt)
    expect(image?.getAttribute('src')).toContain(src)
    expect(image?.parentElement?.getAttribute('data-site-code')).toBe(siteCode)
  })

  it('selects the approved reverse asset for dark surfaces when requested', () => {
    const { container } = render(<Logo siteCode="wing-side" variant="reverse" />)
    const image = container.querySelector('img')

    expect(image?.getAttribute('src')).toContain('/brand/wingsside/wingsside-logo-reverse.png')
    expect(image?.parentElement?.getAttribute('data-logo-variant')).toBe('reverse')
    expect(image?.getAttribute('alt')).toBe('WingSide logo')
  })

  it.each([
    ['primary', 'logoImage', '/brand/wingsgo/wingsgo-logo-primary.png'],
    ['reverse', 'logoReverseImage', '/brand/wingsgo/wingsgo-logo-reverse.png'],
  ] as const)(
    'rejects cross-tenant CMS %s media and falls back to the static asset',
    (variant, prop, src) => {
      const crossTenantLogo = {
        id: 42,
        site: 999,
        updatedAt: '2026-08-29T00:00:00.000Z',
        createdAt: '2026-08-29T00:00:00.000Z',
        url: '/media/cross-tenant-logo.png',
        width: 448,
        height: 280,
      } as never
      const logoProps =
        prop === 'logoImage'
          ? { logoImage: crossTenantLogo }
          : { logoReverseImage: crossTenantLogo }
      const { container } = render(
        <Logo {...logoProps} siteCode="wings-go" siteID={10} variant={variant} />,
      )
      const image = container.querySelector('img')

      expect(image?.getAttribute('src')).toContain(src)
      expect(image?.getAttribute('src')).not.toContain('/media/cross-tenant-logo.png')
      expect(image?.parentElement?.getAttribute('data-logo-source')).toBe('brand-manifest')
    },
  )
})
