import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { ThemeProvider, useTheme } from '@/providers/Theme'

const ThemeProbe = () => {
  const { setTheme, theme } = useTheme()

  return (
    <div>
      <button data-testid="theme-btn" onClick={() => setTheme('dark')} type="button">
        {theme}
      </button>
      <button data-testid="reset-btn" onClick={() => setTheme(null)} type="button">
        reset
      </button>
    </div>
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

    await waitFor(() => expect(screen.getByTestId('theme-btn').textContent).toBe('light'))
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')

    fireEvent.click(screen.getByTestId('theme-btn'))

    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    expect(screen.getByTestId('theme-btn').textContent).toBe('light')
  })

  it('keeps WingsGo light despite a stored dark preference and ignores setTheme to dark', async () => {
    window.localStorage.setItem('payload-theme', 'dark')
    document.documentElement.setAttribute('data-theme', 'dark')

    render(
      <ThemeProvider siteCode="wings-go">
        <ThemeProbe />
      </ThemeProvider>,
    )

    await waitFor(() => expect(screen.getByTestId('theme-btn').textContent).toBe('light'))
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')

    fireEvent.click(screen.getByTestId('theme-btn'))

    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    expect(screen.getByTestId('theme-btn').textContent).toBe('light')
  })

  it('keeps WingsGo light when setTheme is called with null', async () => {
    render(
      <ThemeProvider siteCode="wings-go">
        <ThemeProbe />
      </ThemeProvider>,
    )

    await waitFor(() => expect(screen.getByTestId('theme-btn').textContent).toBe('light'))
    fireEvent.click(screen.getByTestId('reset-btn'))

    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    expect(screen.getByTestId('theme-btn').textContent).toBe('light')
  })

  it('preserves the existing preference behavior for other sites', async () => {
    window.localStorage.setItem('payload-theme', 'dark')
    document.documentElement.setAttribute('data-theme', 'light')

    render(
      <ThemeProvider siteCode="wing-side">
        <ThemeProbe />
      </ThemeProvider>,
    )

    await waitFor(() => expect(screen.getByTestId('theme-btn').textContent).toBe('dark'))
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  it('allows other sites to change theme to dark via setTheme and persists preference', async () => {
    render(
      <ThemeProvider siteCode="wing-side">
        <ThemeProbe />
      </ThemeProvider>,
    )

    await waitFor(() => expect(screen.getByTestId('theme-btn').textContent).toBe('light'))
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')

    fireEvent.click(screen.getByTestId('theme-btn'))

    await waitFor(() => expect(screen.getByTestId('theme-btn').textContent).toBe('dark'))
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(window.localStorage.getItem('payload-theme')).toBe('dark')
  })

  it('ensures strict site isolation between WingsGo and WingSide', async () => {
    // 1. WingsGo remains light
    window.localStorage.setItem('payload-theme', 'dark')
    const { unmount } = render(
      <ThemeProvider siteCode="wings-go">
        <ThemeProbe />
      </ThemeProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('theme-btn').textContent).toBe('light'))
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    unmount()

    // 2. WingSide respects the stored dark preference
    render(
      <ThemeProvider siteCode="wing-side">
        <ThemeProbe />
      </ThemeProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('theme-btn').textContent).toBe('dark'))
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })
})
