import React from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ find: vi.fn() }))

vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('payload', () => ({ getPayload: async () => ({ find: mocks.find }) }))
vi.mock('@/utilities/siteContext', () => ({
  appendSiteWhere: async (where: unknown) => ({ and: [{ site: { equals: 7 } }, where] }),
  getCurrentLocale: async () => 'en',
  getCurrentSite: async () => ({ code: 'wings-group', id: 7 }),
}))
vi.mock('@/components/RichText', () => ({ default: () => null }))
vi.mock('@/components/CollectionArchive', () => ({
  CollectionArchive: ({ posts }: { posts: Array<{ id: number; title: string }> }) => (
    <div>{posts.map((post) => <p key={post.id}>{post.title}</p>)}</div>
  ),
}))

import { ArchiveBlock } from '@/blocks/ArchiveBlock/Component'

describe('ArchiveBlock public locale boundary', () => {
  beforeEach(() => mocks.find.mockReset())
  afterEach(cleanup)

  it.each(['collection', 'selection'])('enforces locale, access and published status for %s', async (populateBy) => {
    mocks.find.mockResolvedValue({ docs: [{ id: 11, title: 'English article' }] })
    const result = await ArchiveBlock({
      blockType: 'archive',
      populateBy,
      selectedDocs: [{ relationTo: 'posts', value: 11 }],
    } as never)
    render(result)

    expect(screen.getByText('English article')).toBeTruthy()
    expect(mocks.find).toHaveBeenCalledWith(expect.objectContaining({
      collection: 'posts',
      fallbackLocale: false,
      locale: 'en',
      overrideAccess: false,
      where: expect.objectContaining({
        and: expect.arrayContaining([{ _status: { equals: 'published' } }]),
      }),
    }))
    expect(JSON.stringify(mocks.find.mock.calls[0][0].where)).toContain('"site":{"equals":7}')
  })
})
