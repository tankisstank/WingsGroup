import React from 'react'
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MediumImpactHero } from '@/heros/MediumImpact'
import { RenderHero } from '@/heros/RenderHero'
import type { Page } from '@/payload-types'
import { richText } from '../../scripts/lib/payloadSeedBuilders'

vi.mock('@/components/Link', () => ({
  CMSLink: ({ url, label }: { url?: string; label?: string }) => <a href={url}>{label}</a>,
}))
vi.mock('next/image', () => ({
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}))
vi.mock('@/heros/HighImpact', () => ({ HighImpactHero: () => null }))
vi.mock('@/heros/LowImpact', () => ({ LowImpactHero: () => null }))
vi.mock('@/components/WingsGroupV3/EditorialHero', () => ({ WingsGroupEditorialHero: () => null }))
afterEach(cleanup)

const fixture = {
  type: 'mediumImpact',
  richText: richText('Tour theo mùa: Khám phá vẻ đẹp thế giới', 'Nội dung giữ nguyên', 'h1'),
  links: [{ link: { type: 'custom', label: 'Xem lịch', url: '/lich-khoi-hanh' } }],
  media: {
    id: 123,
    mimeType: 'video/mp4',
    filename: 'fixture.mp4',
    alt: 'Campaign video',
    caption: richText('Tiêu đề caption', 'Mô tả caption'),
  },
} as Page['hero']

describe('Campaign media caption switch', () => {
  it('keeps captions by default for shared media on other pages', () => {
    const { container } = render(<MediumImpactHero {...fixture} />)
    expect(container.textContent).toContain('Tiêu đề caption')
    expect(container.textContent).toContain('Mô tả caption')
  })

  it('forwards the internal opt out while preserving H1, video and CTA', () => {
    const { container } = render(<RenderHero {...fixture} showMediaCaption={false} />)
    expect(container.textContent).not.toContain('Tiêu đề caption')
    expect(container.textContent).not.toContain('Mô tả caption')
    expect(container.querySelectorAll('h1')).toHaveLength(1)
    expect(container.querySelector('h1')?.textContent).toBe('Tour theo mùa: Khám phá vẻ đẹp thế giới')
    expect(container.querySelector('video')).not.toBeNull()
    expect(container.querySelector('a')?.getAttribute('href')).toBe('/lich-khoi-hanh')
    expect(fixture.media && typeof fixture.media === 'object' && fixture.media.caption).toBeTruthy()
  })

  it('keeps image fallback and handles an absent media relation', () => {
    const media = { ...(fixture.media as object), mimeType: 'image/png' } as Exclude<Page['hero']['media'], number | null | undefined>
    const { container, rerender } = render(<MediumImpactHero {...fixture} media={media} showMediaCaption={false} />)
    expect(container.querySelector('img')).not.toBeNull()
    rerender(<MediumImpactHero {...fixture} media={null} showMediaCaption={false} />)
    expect(container.querySelector('.site-detail-hero__media')).toBeNull()
    expect(container.querySelector('h1')).not.toBeNull()
  })
})
