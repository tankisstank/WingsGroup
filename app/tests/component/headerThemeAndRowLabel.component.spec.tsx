import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const { setHeaderTheme, useRowLabel } = vi.hoisted(() => ({
  setHeaderTheme: vi.fn(),
  useRowLabel: vi.fn(),
}))

vi.mock('@/providers/HeaderTheme', () => ({
  useHeaderTheme: () => ({ setHeaderTheme }),
}))

vi.mock('@payloadcms/ui', () => ({
  useRowLabel: () => useRowLabel(),
}))

import HeaderThemeClient from '@/components/HeaderThemeClient'
import { NavItemRowLabel } from '@/components/NavItemRowLabel'

describe('shared theme and navigation row components', () => {
  it('keeps the route-selected light/dark header intent', () => {
    const { rerender } = render(<HeaderThemeClient theme="light" />)
    expect(setHeaderTheme).toHaveBeenLastCalledWith('light')

    rerender(<HeaderThemeClient theme="dark" />)
    expect(setHeaderTheme).toHaveBeenLastCalledWith('dark')
  })

  it('keeps nav row numbering and empty-label fallback', () => {
    useRowLabel.mockReturnValue({
      data: { link: { label: 'Journeys' } },
      rowNumber: 1,
    })
    const { rerender } = render(<NavItemRowLabel path="" />)
    expect(screen.getByText('Nav item 2: Journeys')).toBeTruthy()

    useRowLabel.mockReturnValue({ data: { link: { label: '' } }, rowNumber: 1 })
    rerender(<NavItemRowLabel path="" />)
    expect(screen.getByText('Row')).toBeTruthy()
  })
})
