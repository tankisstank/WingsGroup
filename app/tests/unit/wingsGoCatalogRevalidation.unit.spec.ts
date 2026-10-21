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

import { revalidatePage } from '@/collections/Pages/hooks/revalidatePage'
import {
  revalidateTourDeparture,
  revalidateTourDepartureDelete,
  revalidateTourProduct,
  revalidateTourProductDelete,
} from '@/collections/Tours/hooks/revalidateTourContent'

describe('WingsGo catalog revalidation', () => {
  beforeEach(() => {
    cache.revalidatePath.mockReset()
    cache.revalidateTag.mockReset()
    curationHooks.clearRedisCurationCache.mockReset()
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

  it('invalidates the deleted departure product detail when the relation is only an ID', async () => {
    const payload = {
      findByID: vi.fn().mockResolvedValue({ id: 44, slug: 'deleted-departure-tour' }),
    }

    await revalidateTourDepartureDelete({
      doc: { id: 88, site: 9, tourProduct: 44 },
      req: { context: {}, payload },
    } as never)

    expect(payload.findByID).toHaveBeenCalledWith({
      collection: 'tour-products',
      depth: 0,
      id: 44,
      overrideAccess: true,
    })
    expect(cache.revalidatePath).toHaveBeenCalledWith('/')
    expect(cache.revalidatePath).toHaveBeenCalledWith('/vi')
    expect(cache.revalidatePath).toHaveBeenCalledWith('/en')
    expect(cache.revalidatePath).toHaveBeenCalledWith('/tour')
    expect(cache.revalidatePath).toHaveBeenCalledWith('/tour/deleted-departure-tour')
    expect(curationHooks.clearRedisCurationCache).toHaveBeenCalledWith(9)
  })

  it('invalidates homepage and localized routes when a departure changes', async () => {
    const payload = {
      find: vi.fn().mockResolvedValue({ docs: [] }),
    }

    await revalidateTourDeparture({
      doc: {
        _status: 'published',
        id: 77,
        site: 7,
        tourProduct: { id: 33, slug: 'han-quoc-5n4d' },
      },
      previousDoc: undefined,
      req: { context: {}, payload },
    } as never)

    expect(cache.revalidatePath).toHaveBeenCalledWith('/')
    expect(cache.revalidatePath).toHaveBeenCalledWith('/vi')
    expect(cache.revalidatePath).toHaveBeenCalledWith('/en')
    expect(cache.revalidatePath).toHaveBeenCalledWith('/tour')
    expect(cache.revalidatePath).toHaveBeenCalledWith('/tour/han-quoc-5n4d')
    expect(curationHooks.clearRedisCurationCache).toHaveBeenCalledWith(7)
  })

  it('does not invalidate public paths while Payload creates the initial admin draft', async () => {
    const payload = {
      find: vi.fn(),
      logger: { info: vi.fn() },
    }

    await revalidateTourProduct({
      doc: { id: 99, _status: 'draft', slug: null },
      previousDoc: undefined,
      req: {
        context: {},
        payload,
        url: 'http://localhost:3101/admin/collections/tour-products/create',
      },
    } as never)

    expect(payload.find).not.toHaveBeenCalled()
    expect(cache.revalidatePath).not.toHaveBeenCalled()
  })

  it('clears only the product tenant curation cache on change and deletion', async () => {
    const payload = { find: vi.fn().mockResolvedValue({ docs: [] }) }
    const doc = { id: 55, site: 7, slug: 'seoul', _status: 'published' }
    await revalidateTourProduct({ doc, req: { context: {}, payload } } as never)
    expect(curationHooks.clearRedisCurationCache).toHaveBeenCalledWith(7)
    curationHooks.clearRedisCurationCache.mockClear()
    await revalidateTourProductDelete({ doc, req: { context: {} } } as never)
    expect(curationHooks.clearRedisCurationCache).toHaveBeenCalledWith(7)
  })
})
