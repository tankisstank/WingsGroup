import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  find: vi.fn(),
  getCurrentSite: vi.fn(),
}))

vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('payload', () => ({ getPayload: vi.fn(async () => ({ find: mocks.find })) }))
vi.mock('@/utilities/siteContext', () => ({ getCurrentSite: mocks.getCurrentSite }))
vi.mock('next-sitemap', () => ({
  getServerSideSitemap: vi.fn(async (entries: unknown[]) => Response.json(entries)),
}))

import { GET } from '@/app/(frontend)/(sitemaps)/posts-sitemap.xml/route'

const governedContent = {
  root: {
    children: [{ children: [{ text: 'Governed editorial content' }], type: 'paragraph' }],
    direction: null,
    format: '',
    indent: 0,
    type: 'root',
    version: 1,
  },
}

describe('WingsGroup editorial sitemap integration', () => {
  it('emits only governed same-tenant posts on canonical Vietnamese paths', async () => {
    mocks.getCurrentSite.mockResolvedValue({
      code: 'wings-group',
      defaultLocale: 'vi',
      id: 9,
      primaryDomain: 'wingsgroup.vn',
    })
    mocks.find.mockImplementation(async ({ collection }: { collection: string }) =>
      collection === 'site-settings'
        ? { docs: [{ site: 9, wingsGroupV3: { enabled: true } }] }
        : {
            docs: [
              {
                _status: 'published',
                content: governedContent,
                site: 9,
                slug: 'governed-story',
                title: 'Governed story',
                updatedAt: '2026-08-23T00:00:00.000Z',
              },
              {
                _status: 'published',
                content: null,
                site: 9,
                slug: 'missing-content',
                title: 'Not publishable',
                updatedAt: '2026-08-23T00:00:00.000Z',
              },
              {
                _status: 'published',
                content: governedContent,
                site: 10,
                slug: 'other-tenant',
                title: 'Other tenant',
                updatedAt: '2026-08-23T00:00:00.000Z',
              },
            ],
          },
    )

    const response = await GET(new Request('https://wingsgroup.vn/posts-sitemap.xml'))
    const entries = (await response.json()) as Array<{ loc: string }>

    expect(response.status).toBe(200)
    expect(entries).toEqual([
      { loc: 'https://wingsgroup.vn/tin-tuc/governed-story', lastmod: '2026-08-23T00:00:00.000Z' },
    ])
    expect(mocks.find).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'posts',
        select: expect.objectContaining({ content: true, site: true, title: true }),
      }),
    )
  })
})
