import { describe, expect, it, vi } from 'vitest'

vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('next/headers', () => ({ headers: vi.fn() }))
vi.mock('payload', () => ({ createLocalReq: vi.fn(), getPayload: vi.fn() }))

import { loadCollection } from '@/app/(payload)/api/site-review/loadCollection'

describe('Site Review collection pagination', () => {
  it('loads every page instead of silently truncating at 1,000 records', async () => {
    const find = vi
      .fn()
      .mockResolvedValueOnce({
        docs: Array.from({ length: 100 }, (_, index) => ({ id: index + 1 })),
        hasNextPage: true,
        nextPage: 2,
      })
      .mockResolvedValueOnce({
        docs: Array.from({ length: 37 }, (_, index) => ({ id: index + 101 })),
        hasNextPage: false,
        nextPage: null,
      })

    const result = await loadCollection({
      collection: 'pages',
      payload: { find } as never,
      req: {} as never,
    })

    expect(result.docs).toHaveLength(137)
    expect(result.docs.at(-1)).toEqual({ id: 137 })
    expect(find).toHaveBeenNthCalledWith(1, expect.objectContaining({ limit: 100, page: 1, pagination: true }))
    expect(find).toHaveBeenNthCalledWith(2, expect.objectContaining({ limit: 100, page: 2, pagination: true }))
  })

  it('returns all 1,001 records without duplicates across the final page', async () => {
    const find = vi.fn().mockImplementation(async (args: { page?: number }) => {
      const page = args.page || 1
      const count = page === 11 ? 1 : 100
      const start = (page - 1) * 100

      return {
        docs: Array.from({ length: count }, (_, index) => ({ id: start + index + 1 })),
        hasNextPage: page < 11,
        nextPage: page < 11 ? page + 1 : null,
      }
    })

    const result = await loadCollection({
      collection: 'posts',
      payload: { find } as never,
      req: {} as never,
    })

    const ids = result.docs.map((doc) => doc.id)
    expect(ids).toHaveLength(1001)
    expect(new Set(ids).size).toBe(1001)
    expect(ids[0]).toBe(1)
    expect(ids.at(-1)).toBe(1001)
    expect(find).toHaveBeenCalledTimes(11)
    expect(find).toHaveBeenLastCalledWith(expect.objectContaining({ limit: 100, page: 11, pagination: true }))
  })
})
