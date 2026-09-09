import { render, cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { Logo } from '@/components/Logo/Logo'

afterEach(() => cleanup())

describe('WingsGroup brand logo fallback', () => {
  it('renders the supplied primary lockup at the 180 by 60 contract size', () => {
    const { container } = render(<Logo logoText="WingsGroup" siteCode="wings-group" />)
    const image = container.querySelector('img')

    expect(image?.getAttribute('src')).toContain('/brand/wingsgroup/wingsgroup-logo-primary.png')
    expect(image?.getAttribute('width')).toBe('180')
    expect(image?.getAttribute('height')).toBe('60')
    expect(image?.parentElement?.getAttribute('data-logo-source')).toBe('wingsgroup-brand-kit')
  })

  it('does not leak the WingsGroup fallback into another tenant', () => {
    const { container, getByText } = render(<Logo logoText="Other" siteCode="other-tenant" />)

    expect(container.querySelector('img')).toBeNull()
    expect(getByText('O')).toBeTruthy()
    expect(container.innerHTML).not.toContain('/brand/wingsgroup/')
  })
})
