import { render, cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { Logo } from '@/components/Logo/Logo'

afterEach(() => cleanup())

describe('WingsGroup brand logo fallback', () => {
  it('renders the supplied primary lockup with its tight master dimensions', () => {
    const { container } = render(<Logo logoText="WingsGroup" siteCode="wings-group" />)
    const image = container.querySelector('img')

    expect(image?.getAttribute('src')).toContain('/brand/wingsgroup/wingsgroup-logo-primary.png')
    expect(image?.getAttribute('width')).toBe('373')
    expect(image?.getAttribute('height')).toBe('280')
    expect(image?.parentElement?.getAttribute('data-logo-source')).toBe('wingsgroup-brand-kit')
  })

  it('uses the other tenant brand manifest without leaking the WingsGroup asset', () => {
    const { container } = render(<Logo logoText="WingsGo" siteCode="wings-go" />)

    expect(container.querySelector('img')?.getAttribute('src')).toContain(
      '/brand/wingsgo/wingsgo-logo-primary.png',
    )
    expect(container.querySelector('[data-logo-source="brand-manifest"]')).toBeTruthy()
    expect(container.querySelector('img')?.getAttribute('alt')).toBe('WingsGo logo')
    expect(container.innerHTML).not.toContain('/brand/wingsgroup/')
  })
})
