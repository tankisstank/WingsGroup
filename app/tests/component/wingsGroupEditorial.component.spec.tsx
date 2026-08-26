import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { WingsGroupEditorialArchive } from '@/components/WingsGroupV3/EditorialArchive'

afterEach(cleanup)

vi.mock('@/utilities/wingsGroupEditorial', () => ({
  formatWingsGroupEditorialDate: (value: string, locale: string) =>
    new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(value)),
  getGovernedEditorialAuthorNames: () => ['Editorial team'],
  getWingsGroupEditorialPostPath: (slug: string) => `/tin-tuc/${slug}`,
  queryWingsGroupEditorialFallbackMedia: vi.fn(async () => new Map()),
  queryWingsGroupEditorialPosts: vi.fn(async () => [
    {
      _status: 'published',
      content: { root: { children: [] } },
      id: 1,
      meta: {},
      populatedAuthors: [{ id: 'author-1', name: 'Editorial team' }],
      publishedAt: '2026-08-23T00:00:00.000Z',
      site: 9,
      slug: 'governed-article',
      title: 'Governed article',
    },
  ]),
  resolveWingsGroupEditorialMedia: () => ({
    alt: 'A traveller preparing for a journey',
    id: 44,
    url: '/media/editorial.webp',
  }),
}))

vi.mock('@/components/Media', () => ({
  Media: ({ alt }: { alt: string }) => <div aria-label={alt} role="img" />,
}))

describe('WingsGroup v3 editorial archive', () => {
  it('renders governed title/date/author/source metadata and canonical deep links', async () => {
    render(
      await WingsGroupEditorialArchive({
        blockType: 'archive',
        limit: 12,
        locale: 'vi',
        populateBy: 'collection',
        relationTo: 'posts',
      } as never),
    )

    expect(screen.getByRole('heading', { name: 'Governed article', level: 3 })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Governed article' }).getAttribute('href')).toBe(
      '/tin-tuc/governed-article',
    )
    expect(screen.getByText('23/08/2026')).toBeTruthy()
    expect(screen.getByText('Tác giả: Editorial team')).toBeTruthy()
    expect(screen.getByText('Nguồn: WingsGroup')).toBeTruthy()
    expect(
      screen
        .getByRole('img', { name: 'A traveller preparing for a journey' })
        .closest('[data-wingsgroup-editorial-media="true"]'),
    ).toBeTruthy()
  })

  it('keeps the same media-led archetype and natural source metadata in English', async () => {
    render(
      await WingsGroupEditorialArchive({
        blockType: 'archive',
        limit: 12,
        locale: 'en',
        populateBy: 'collection',
        relationTo: 'posts',
      } as never),
    )

    expect(screen.getByText('23/08/2026')).toBeTruthy()
    expect(screen.getByText('By: Editorial team')).toBeTruthy()
    expect(screen.getByText('Source: WingsGroup')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Read story' })).toBeTruthy()
  })
})
