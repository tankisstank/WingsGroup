import { cleanup, render, screen } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { WingsGroupEditorialArticle } from '@/components/WingsGroupV3/EditorialArticle'
import type { Post } from '@/payload-types'

afterEach(cleanup)

vi.mock('@/components/Media', () => ({
  Media: ({ alt }: { alt: string }) => <div aria-label={alt} role="img" />,
}))
vi.mock('@/components/RichText', () => ({
  default: () => <div>Rendered article body</div>,
}))
vi.mock('@/components/SiteLink', () => ({
  SiteLink: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

const content = {
  root: {
    children: [],
    direction: 'ltr',
    format: '',
    indent: 0,
    type: 'root',
    version: 1,
  },
}

const article = {
  _status: 'published',
  categories: [{ id: 3, site: 9, title: 'Guides' }],
  content,
  id: 1,
  meta: { description: 'A practical editorial introduction.' },
  populatedAuthors: [{ id: 'author-1', name: 'Editorial team' }],
  publishedAt: '2026-08-23T00:00:00.000Z',
  site: 9,
  slug: 'governed-article',
  title: 'Governed article',
} as unknown as Post

const media = {
  alt: 'A traveller reviewing journey information',
  id: 44,
  url: '/media/governed.webp',
} as never

describe('WingsGroup v3 editorial detail', () => {
  it('renders a governed hero with honest alt/caption and complete editorial metadata', () => {
    render(
      <WingsGroupEditorialArticle
        heroMedia={media}
        locale="en"
        post={article}
        relatedItems={[
          {
            media,
            post: { ...article, id: 2, slug: 'related-story', title: 'Related story' },
          },
        ]}
      />,
    )

    expect(screen.getByRole('heading', { level: 1, name: 'Governed article' })).toBeTruthy()
    expect(
      screen.getAllByRole('img', { name: 'A traveller reviewing journey information' }),
    ).toHaveLength(2)
    expect(
      screen
        .getAllByRole('img', { name: 'A traveller reviewing journey information' })
        .every((image) => image.closest('[data-wingsgroup-editorial-media="true"]')),
    ).toBe(true)
    expect(
      screen.getByText('Editorial image for illustration; it is not documentary evidence.'),
    ).toBeTruthy()
    expect(screen.getByText('23/08/2026')).toBeTruthy()
    expect(screen.getByText('By: Editorial team')).toBeTruthy()
    expect(screen.getByText('Source: WingsGroup')).toBeTruthy()
    expect(screen.getByText('Guides')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Related story' }).getAttribute('href')).toBe(
      '/tin-tuc/related-story',
    )
  })

  it('fails closed with an accessible publication placeholder when no governed media resolves', () => {
    render(
      <WingsGroupEditorialArticle heroMedia={null} locale="vi" post={article} relatedItems={[]} />,
    )

    expect(screen.getByText('Ảnh biên tập đang chờ công bố')).toBeTruthy()
    expect(screen.queryByRole('img')).toBeNull()
    expect(screen.getByText('Nguồn: WingsGroup')).toBeTruthy()
  })
})
