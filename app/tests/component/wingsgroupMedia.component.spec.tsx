import { render } from '@testing-library/react'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'

import { ImageMedia } from '@/components/Media/ImageMedia'
import type { Media } from '@/payload-types'

vi.mock('next/image', () => ({
  default: (props: React.ComponentProps<'img'> & { unoptimized?: boolean }) => (
    <img {...props} data-unoptimized={props.unoptimized ? 'true' : undefined} />
  ),
}))

const sha = 'a'.repeat(64)
const publishedMedia = (publicationState: 'pending' | 'published'): Media =>
  ({
    alt: 'A governed WingsGroup image',
    createdAt: '2026-08-24T00:00:00.000Z',
    governance: {
      derivativeState: publicationState === 'published' ? 'verified' : 'pending',
      managedBy: 'wingsgroup-v3',
      publicationState,
      responsiveDerivatives:
        publicationState === 'published'
          ? [
              {
                format: 'avif',
                height: 480,
                sha256: sha,
                url: 'https://wingsgroup.vn/media/a-640.avif',
                width: 640,
              },
              {
                format: 'webp',
                height: 480,
                sha256: sha,
                url: 'https://wingsgroup.vn/media/a-640.webp',
                width: 640,
              },
            ]
          : [],
      provenanceReference: 'manifest:media-a',
      rightsEvidence: 'stakeholder-rights-approval',
      rightsState: 'approved',
      sourceArchiveSha256: sha,
      sourceAttachmentId: 'attachment-a',
      sourceFileSha256: sha,
      sourceIdentity: `attachment-a:${sha}`,
    },
    filename: 'a.png',
    height: 1024,
    id: 1,
    sizes: {
      'wingsgroup-v3-640-avif': {
        filename: 'current-640.avif',
        url: '/api/media/file/current-640.avif',
        width: 640,
      },
      'wingsgroup-v3-640-webp': {
        filename: 'current-640.webp',
        url: '/api/media/file/current-640.webp',
        width: 640,
      },
    },
    site: {
      code: 'wings-group',
      createdAt: '2026-08-24T00:00:00.000Z',
      defaultLocale: 'vi',
      id: 7,
      name: 'WingsGroup',
      primaryDomain: 'wingsgroup.vn',
      supportedLocales: ['vi', 'en'],
      updatedAt: '2026-08-24T00:00:00.000Z',
    },
    updatedAt: '2026-08-24T00:00:00.000Z',
    url: '/media/a.png',
    width: 1536,
  }) as Media

describe('WingsGroup ImageMedia responsive delivery', () => {
  it('emits verified AVIF/WebP sources while retaining the original fallback', () => {
    const { container } = render(<ImageMedia resource={publishedMedia('published')} />)

    expect(container.querySelector('source[type="image/avif"]')?.getAttribute('srcset')).toMatch(
      /current-640\.avif\?.* 640w/,
    )
    expect(container.querySelector('source[type="image/webp"]')?.getAttribute('srcset')).toMatch(
      /current-640\.webp\?.* 640w/,
    )
    expect(container.querySelector('source[type="image/avif"]')?.getAttribute('srcset')).not.toContain(
      '/media/a-640.avif',
    )
    expect(container.querySelector('img')?.getAttribute('src')).toContain('/media/a.png')
  })

  it('does not emit responsive sources for pending development media', () => {
    const { container } = render(<ImageMedia resource={publishedMedia('pending')} />)

    expect(container.querySelectorAll('source')).toHaveLength(0)
    expect(container.querySelector('img')?.getAttribute('src')).toContain('/media/a.png')
  })

  it('derives a readable fallback alt from the filename when localized alt is missing', () => {
    const { container } = render(
      <ImageMedia
        resource={
          {
            ...publishedMedia('published'),
            alt: null,
            filename: 'wingscare-travel-care-hero-3.png',
          } as Media
        }
      />,
    )

    expect(container.querySelector('img')?.getAttribute('alt')).toBe('wingscare travel care hero 3')
  })

  it('keeps absolute WingsGroup media on the governed direct route', () => {
    const { container } = render(
      <ImageMedia resource={{ ...publishedMedia('pending'), url: 'https://wingsgroup.vn/media/a.png' }} />,
    )

    expect(container.querySelector('img')?.getAttribute('data-unoptimized')).toBe('true')
  })
})
