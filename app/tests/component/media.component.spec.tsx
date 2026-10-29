import { render } from '@testing-library/react'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'

import { Media } from '@/components/Media'
import type { Media as MediaType } from '@/payload-types'

vi.mock('next/image', () => ({
  default: (props: any) => {
    const { fetchPriority, loading, priority, unoptimized, ...rest } = props
    return (
      <img
        {...rest}
        data-fetchpriority={fetchPriority}
        data-loading={loading}
        data-priority={priority ? 'true' : 'false'}
        data-unoptimized={unoptimized ? 'true' : 'false'}
      />
    )
  },
}))

describe('Media & ImageMedia Tenant Delivery (AC6 WP1)', () => {
  it('does not render an empty image when no resource is available', () => {
    const { container } = render(<Media resource={null} />)

    expect(container.querySelector('img')).toBeNull()
    expect(container.innerHTML).toBe('')
  })

  it('renders responsive AVIF and WebP sources for tenant media using verified metadata widths', () => {
    const tenantMedia: Partial<MediaType> = {
      id: 201,
      filename: 'fuji-tour.jpg',
      url: '/media/fuji-tour.jpg',
      width: 1920,
      height: 1080,
      updatedAt: '2026-10-24T00:00:00.000Z',
      sizes: {
        'wingsgroup-v3-640-avif': {
          filename: 'fuji-tour-640.avif',
          url: '/api/media/file/fuji-tour-640.avif',
          width: 640,
        },
        'wingsgroup-v3-960-avif': {
          filename: 'fuji-tour-960.avif',
          url: '/api/media/file/fuji-tour-960.avif',
          width: 960,
        },
        'wingsgroup-v3-1440-avif': {
          // Sharp could not upscale or file only reached 960px width
          filename: 'fuji-tour-1440.avif',
          url: '/api/media/file/fuji-tour-1440.avif',
          width: 960, // duplicate width candidate
        },
        'wingsgroup-v3-640-webp': {
          filename: 'fuji-tour-640.webp',
          url: '/api/media/file/fuji-tour-640.webp',
          width: 640,
        },
        'wingsgroup-v3-960-webp': {
          filename: 'fuji-tour-960.webp',
          url: '/api/media/file/fuji-tour-960.webp',
          width: 960,
        },
      },
    }

    const { container } = render(
      <Media priority resource={tenantMedia as MediaType} size="(max-width: 768px) 100vw, 50vw" />,
    )

    const avifSource = container.querySelector('source[type="image/avif"]')
    const webpSource = container.querySelector('source[type="image/webp"]')
    const img = container.querySelector('img')

    expect(avifSource).not.toBeNull()
    expect(webpSource).not.toBeNull()

    const avifSrcSet = avifSource?.getAttribute('srcset') || ''
    const webpSrcSet = webpSource?.getAttribute('srcset') || ''

    // Verified widths only
    expect(avifSrcSet).toContain('640w')
    expect(avifSrcSet).toContain('960w')
    // Deduplication check: duplicate 960w must not be listed twice
    const occurrencesOf960 = (avifSrcSet.match(/960w/g) || []).length
    expect(occurrencesOf960).toBe(1)
    expect(avifSrcSet).not.toContain('1440w')

    expect(webpSrcSet).toContain('640w')
    expect(webpSrcSet).toContain('960w')

    // Sizes attribute propagated
    expect(avifSource?.getAttribute('sizes')).toBe('(max-width: 768px) 100vw, 50vw')

    // NextImage priority check: priority is false to avoid double fetch of fallback JPEG, but loading is eager and fetchPriority is high
    expect(img?.getAttribute('data-priority')).toBe('false')
    expect(img?.getAttribute('data-loading')).toBe('eager')
    expect(img?.getAttribute('data-fetchpriority')).toBe('high')
    expect(img?.getAttribute('src')).toContain('/media/fuji-tour.jpg')
  })

  it('falls back cleanly to original image when no derivatives exist', () => {
    const legacyMedia: Partial<MediaType> = {
      id: 202,
      filename: 'legacy-card.jpg',
      url: '/media/legacy-card.jpg',
      width: 800,
      height: 600,
      sizes: {},
    }

    const { container } = render(<Media priority resource={legacyMedia as MediaType} />)

    expect(container.querySelectorAll('source')).toHaveLength(0)
    const img = container.querySelector('img')
    expect(img?.getAttribute('src')).toContain('/media/legacy-card.jpg')
    // In fallback mode without sources, priority true is allowed so Next can preload original
    expect(img?.getAttribute('data-priority')).toBe('true')
  })

  it('recognizes explicit absolute URL on wingsgo.vn as public media and sets unoptimized', () => {
    const absoluteGoMedia: Partial<MediaType> = {
      id: 203,
      filename: 'wingsgo-hero.jpg',
      url: 'https://wingsgo.vn/media/wingsgo-hero.jpg',
      width: 1920,
      height: 1080,
    }

    const { container } = render(<Media resource={absoluteGoMedia as MediaType} />)
    const img = container.querySelector('img')
    expect(img?.getAttribute('data-unoptimized')).toBe('true')
  })

  it('keeps Next image optimization enabled for third-party or foreign media URLs', () => {
    const foreignMedia: Partial<MediaType> = {
      id: 204,
      filename: 'external.jpg',
      url: 'https://external-cdn.example.com/media/external.jpg',
      width: 1920,
      height: 1080,
    }

    const { container } = render(<Media resource={foreignMedia as MediaType} />)
    const img = container.querySelector('img')
    expect(img?.getAttribute('data-unoptimized')).toBe('false')
  })
})