import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { WingsGroupEditorialArchive } from '@/components/WingsGroupV3/EditorialArchive'

vi.mock('@/utilities/wingsGroupEditorial', () => ({
  getGovernedEditorialAuthorNames: () => ['Editorial team'],
  getWingsGroupEditorialPostPath: (slug: string) => `/tin-tuc/${slug}`,
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
  })
})
