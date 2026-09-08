import { beforeEach, describe, expect, it, vi } from 'vitest'

const cache = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}))

vi.mock('next/cache.js', () => cache)

import { revalidatePage } from '@/collections/Pages/hooks/revalidatePage'

describe('WingsGo catalog revalidation', () => {
  beforeEach(() => {
    cache.revalidatePath.mockReset()
    cache.revalidateTag.mockReset()
  })

  it('invalidates the catalog when a published tour wrapper changes', async () => {
    const payload = {
      find: vi.fn().mockResolvedValue({ docs: [] }),
      logger: { info: vi.fn() },
    }

    await revalidatePage({
      doc: {
        _status: 'published',
        id: 9,
        pathname: '/tour/seoul-5n4d',
        site: 7,
      },
      previousDoc: undefined,
      req: { context: {}, payload },
    } as never)

    expect(cache.revalidatePath).toHaveBeenCalledWith('/tour')
    expect(cache.revalidatePath).toHaveBeenCalledWith('/vi/tour')
    expect(cache.revalidateTag).toHaveBeenCalledWith('pages-sitemap', 'max')
  })
})
