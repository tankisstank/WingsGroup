import { render } from '@testing-library/react'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'

import { ImageMedia } from '@/components/Media/ImageMedia'
import type { Media } from '@/payload-types'

vi.mock('next/image', () => ({
  default: (props: React.ComponentProps<'img'>) => <img {...props} />,
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
      /640\.avif\?.* 640w/,
    )
    expect(container.querySelector('source[type="image/webp"]')?.getAttribute('srcset')).toMatch(
      /640\.webp\?.* 640w/,
    )
    expect(container.querySelector('img')?.getAttribute('src')).toContain('/media/a.png')
  })

  it('does not emit responsive sources for pending development media', () => {
    const { container } = render(<ImageMedia resource={publishedMedia('pending')} />)

    expect(container.querySelectorAll('source')).toHaveLength(0)
    expect(container.querySelector('img')?.getAttribute('src')).toContain('/media/a.png')
  })
})
