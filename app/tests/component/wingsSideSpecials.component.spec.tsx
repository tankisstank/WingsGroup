import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import React, { act } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { WingsSideSpecialsPromo } from '@/components/WingsSideSpecialsPromo'
import { WINGSSIDE_SPECIALS_DISMISSED_KEY } from '@/utilities/wingsSideSpecials'

let mockPathname = '/'

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}))

vi.mock('@/components/SiteLink', () => ({
  SiteLink: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={String(href)} {...props}>
      {children}
    </a>
  ),
}))

describe('WingsSideSpecialsPromo', () => {
  beforeEach(() => {
    mockPathname = '/'
    window.sessionStorage.clear()
  })
  afterEach(cleanup)

  it('renders the generic promo and routes the CTA to Packages', async () => {
    render(<WingsSideSpecialsPromo locale="en" />)

    const promo = await screen.findByTestId('wingsside-specials')
    expect(promo.textContent).toContain('// HOT  LIMITED')
    expect(screen.getByRole('heading', { name: 'SPECIALS.' })).toBeTruthy()
    expect(screen.getByText('Deals')).toBeTruthy()
    expect(screen.getByText('Hot tours')).toBeTruthy()
    expect(screen.getByText('Exclusive packs')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Go to hot tours and packages' }).getAttribute('href')).toBe(
      '/packages',
    )
    expect(promo.querySelector('img')).toBeNull()
  })

  it('appears after hydrating the server-empty client island', async () => {
    const container = document.createElement('div')
    container.innerHTML = renderToString(<WingsSideSpecialsPromo locale="en" />)
    document.body.appendChild(container)

    let root!: ReturnType<typeof hydrateRoot>
    await act(async () => {
      root = hydrateRoot(container, <WingsSideSpecialsPromo locale="en" />)
    })

    expect(await screen.findByTestId('wingsside-specials')).toBeTruthy()

    await act(async () => root.unmount())
    container.remove()
  })

  it('unmounts after client navigation away from Home', async () => {
    const view = render(<WingsSideSpecialsPromo locale="en" />)
    expect(await screen.findByTestId('wingsside-specials')).toBeTruthy()

    mockPathname = '/packages'
    view.rerender(<WingsSideSpecialsPromo locale="en" />)

    expect(screen.queryByTestId('wingsside-specials')).toBeNull()
  })

  it('dismisses for the browser session and stays hidden after remount', async () => {
    const first = render(<WingsSideSpecialsPromo locale="en" />)
    fireEvent.click(await screen.findByRole('button', { name: 'Dismiss specials' }))

    await waitFor(() => expect(screen.queryByTestId('wingsside-specials')).toBeNull())
    expect(window.sessionStorage.getItem(WINGSSIDE_SPECIALS_DISMISSED_KEY)).toBe('1')

    first.unmount()
    render(<WingsSideSpecialsPromo locale="en" />)
    await waitFor(() => expect(screen.queryByTestId('wingsside-specials')).toBeNull())
  })
})
