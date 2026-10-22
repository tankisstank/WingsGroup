import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const preview = vi.hoisted(() => ({
  isLivePreviewing: true,
  setURL: vi.fn(),
  url: '/next/preview?collection=tour-products&id=41&path=%2Ftour%2Fseoul&locale=vi',
}))
vi.mock('@payloadcms/ui', () => ({ useLivePreviewContext: () => ({ ...preview }) }))
import { useTourPreviewRefresh } from '@/components/TourAuthoring/useTourPreviewRefresh'

beforeEach(() => {
  preview.isLivePreviewing = true
  preview.url = '/next/preview?collection=tour-products&id=41&path=%2Ftour%2Fseoul&locale=vi'
  preview.setURL.mockReset()
})
afterEach(cleanup)

describe('refresh saved tour through its authenticated CMS initializer', () => {
  it('renews the handoff on each save, preserving document, locale and path', () => {
    const { result } = renderHook(() => useTourPreviewRefresh(41, 'vi'))
    act(() => {
      result.current()
      result.current()
    })
    const first = new URL(preview.setURL.mock.calls[0][0])
    const second = new URL(preview.setURL.mock.calls[1][0])
    expect(first.origin).toBe(window.location.origin)
    expect(first.pathname).toBe('/next/preview')
    expect(first.searchParams.get('id')).toBe('41')
    expect(first.searchParams.get('locale')).toBe('vi')
    expect(first.searchParams.get('path')).toBe('/tour/seoul')
    expect(first.searchParams.get('refresh')).not.toBe(second.searchParams.get('refresh'))
    expect(first.searchParams.has('handoff')).toBe(false)
  })

  it.each([
    'https://foreign.invalid/next/preview?collection=tour-products&id=41&locale=vi',
    '/next/preview?collection=tour-products&id=42&locale=vi',
    '/next/preview?collection=tour-products&id=41&locale=en',
    '/next/preview?collection=pages&id=41&locale=vi',
    '/tour/seoul?collection=tour-products&id=41&locale=vi',
    'https://[invalid',
  ])('does not navigate an unrelated or malformed initializer: %s', (url) => {
    preview.url = url
    const { result } = renderHook(() => useTourPreviewRefresh(41, 'vi'))
    act(() => result.current())
    expect(preview.setURL).not.toHaveBeenCalled()
  })

  it('does not open preview when it is disabled', () => {
    preview.isLivePreviewing = false
    const { result } = renderHook(() => useTourPreviewRefresh(41, 'vi'))
    act(() => result.current())
    expect(preview.setURL).not.toHaveBeenCalled()
  })

  it('does not refresh without a saved document ID', () => {
    const { result } = renderHook(() => useTourPreviewRefresh(null, 'vi'))
    act(() => result.current())
    expect(preview.setURL).not.toHaveBeenCalled()
  })

  it.each(['disabled', 'different initializer', 'different tour', 'different locale'])(
    'ignores an in-flight save when preview changed: %s', (scenario) => {
      const { result, rerender } = renderHook(
        ({ id, locale }) => useTourPreviewRefresh(id, locale),
        { initialProps: { id: 41, locale: 'vi' } },
      )
      const savedCallback = result.current
      if (scenario === 'disabled') preview.isLivePreviewing = false
      if (scenario === 'different initializer') preview.url = '/next/preview?collection=pages&id=99&locale=vi'
      rerender({ id: scenario === 'different tour' ? 42 : 41, locale: scenario === 'different locale' ? 'en' : 'vi' })
      act(() => savedCallback())
      expect(preview.setURL).not.toHaveBeenCalled()
    },
  )
})
