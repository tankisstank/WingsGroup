import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { ThemeProvider, useTheme } from '@/providers/Theme'

const ThemeProbe = () => {
  const { setTheme, theme } = useTheme()

  return (
    <button onClick={() => setTheme('dark')} type="button">
      {theme}
    </button>
  )
}

afterEach(() => {
  cleanup()
  window.localStorage.clear()
  document.documentElement.setAttribute('data-theme', 'light')
})

describe('public theme provider', () => {
  it('keeps WingsGroup light despite a stored dark preference', async () => {
    window.localStorage.setItem('payload-theme', 'dark')
    document.documentElement.setAttribute('data-theme', 'dark')

    render(
      <ThemeProvider siteCode="wings-group">
        <ThemeProbe />
      </ThemeProvider>,
    )

    await waitFor(() => expect(screen.getByRole('button').textContent).toBe('light'))
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')

    fireEvent.click(screen.getByRole('button'))

    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })

  it('preserves the existing preference behavior for other sites', async () => {
    window.localStorage.setItem('payload-theme', 'dark')
    document.documentElement.setAttribute('data-theme', 'light')

    render(
      <ThemeProvider siteCode="wing-side">
        <ThemeProbe />
      </ThemeProvider>,
    )

    await waitFor(() => expect(screen.getByRole('button').textContent).toBe('dark'))
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })
})
