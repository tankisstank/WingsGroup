import { beforeEach, describe, expect, it, vi } from 'vitest'

const cache = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}))

const curationHooks = vi.hoisted(() => ({
  clearRedisCurationCache: vi.fn(),
}))

vi.mock('next/cache.js', () => cache)
vi.mock('@/collections/TourCurations/hooks', () => curationHooks)

import {
  revalidateTourProduct,
  revalidateTourProductDelete,
} from '@/collections/Tours/hooks/revalidateTourContent'

describe('US-084 TourProduct editorial badges tenant-scoped revalidation', () => {
  beforeEach(() => {
    cache.revalidatePath.mockReset()
    cache.revalidateTag.mockReset()
    curationHooks.clearRedisCurationCache.mockReset()
  })

  it('revalidates homepage, /tour, and localized market routes when editorial badges are changed on a published tour', async () => {
    const payload = {
      find: vi.fn().mockResolvedValue({ docs: [] }),
    }

    const doc = {
      _status: 'published',
      editorialBadges: [
        { kind: 'hot', label: 'Tour hot' },
        { kind: 'vip', label: 'VIP' },
      ],
      id: 101,
      market: 'japan',
      site: 7,
      slug: 'japan-cherry-blossom',
    }

    const previousDoc = {
      _status: 'published',
      editorialBadges: [],
      id: 101,
      market: 'japan',
      site: 7,
      slug: 'japan-cherry-blossom',
    }

    await revalidateTourProduct({
      doc,
      previousDoc,
      req: { context: {}, payload },
    } as never)

    // Verify public surfaces are revalidated
    expect(cache.revalidatePath).toHaveBeenCalledWith('/')
    expect(cache.revalidatePath).toHaveBeenCalledWith('/vi')
    expect(cache.revalidatePath).toHaveBeenCalledWith('/en')
    expect(cache.revalidatePath).toHaveBeenCalledWith('/tour')
    expect(cache.revalidatePath).toHaveBeenCalledWith('/vi/tour')
    expect(cache.revalidatePath).toHaveBeenCalledWith('/en/tour')
    expect(cache.revalidatePath).toHaveBeenCalledWith('/tour/japan-cherry-blossom')
    expect(cache.revalidatePath).toHaveBeenCalledWith('/thi-truong/nhat-ban')

    // Verify tenant-scoped curation cache is cleared only for tenant site 7
    expect(curationHooks.clearRedisCurationCache).toHaveBeenCalledWith(7)
  })

  it('clears previous site curation cache when a tour product site relation is changed', async () => {
    const payload = {
      find: vi.fn().mockResolvedValue({ docs: [] }),
    }

    const doc = {
      _status: 'published',
      editorialBadges: [{ kind: 'hot', label: 'Tour hot' }],
      id: 102,
      market: 'korea',
      site: 8,
      slug: 'korea-autumn',
    }

    const previousDoc = {
      _status: 'published',
      editorialBadges: [{ kind: 'hot', label: 'Tour hot' }],
      id: 102,
      market: 'korea',
      site: 7,
      slug: 'korea-autumn',
    }

    await revalidateTourProduct({
      doc,
      previousDoc,
      req: { context: {}, payload },
    } as never)

    expect(curationHooks.clearRedisCurationCache).toHaveBeenCalledWith(8)
    expect(curationHooks.clearRedisCurationCache).toHaveBeenCalledWith(7)
  })

  it('revalidates public paths and clears only tenant curation cache on deletion', async () => {
    const doc = {
      editorialBadges: [{ kind: 'vip', label: 'VIP' }],
      id: 103,
      site: 7,
      slug: 'deleted-tour',
    }

    await revalidateTourProductDelete({
      doc,
      req: { context: {} },
    } as never)

    expect(cache.revalidatePath).toHaveBeenCalledWith('/')
    expect(cache.revalidatePath).toHaveBeenCalledWith('/tour')
    expect(cache.revalidatePath).toHaveBeenCalledWith('/tour/deleted-tour')
    expect(curationHooks.clearRedisCurationCache).toHaveBeenCalledWith(7)
  })

  it('suppresses revalidation when disableRevalidate is set in context', async () => {
    const payload = {
      find: vi.fn(),
    }

    await revalidateTourProduct({
      doc: { _status: 'published', id: 104, site: 7, slug: 'suppressed' },
      previousDoc: undefined,
      req: { context: { disableRevalidate: true }, payload },
    } as never)

    expect(payload.find).not.toHaveBeenCalled()
    expect(cache.revalidatePath).not.toHaveBeenCalled()
    expect(curationHooks.clearRedisCurationCache).not.toHaveBeenCalled()
  })
})
