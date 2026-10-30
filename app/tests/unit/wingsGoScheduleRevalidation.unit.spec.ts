import { beforeEach, describe, expect, it, vi } from 'vitest'

const cache = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}))

vi.mock('next/cache.js', () => cache)
vi.mock('@/collections/TourCurations/hooks', () => ({ clearRedisCurationCache: vi.fn() }))

import {
  revalidateTourDeparture,
  revalidateTourDepartureDelete,
  revalidateTourProduct,
} from '@/collections/Tours/hooks/revalidateTourContent'

// US-093 AC5: editing a price, departure or badge must refresh the schedule in both locales.
const expectSchedulePathsRevalidated = () => {
  expect(cache.revalidatePath).toHaveBeenCalledWith('/lich-khoi-hanh')
  expect(cache.revalidatePath).toHaveBeenCalledWith('/en/lich-khoi-hanh')
}

describe('WingsGo departure schedule revalidation', () => {
  beforeEach(() => {
    cache.revalidatePath.mockReset()
    cache.revalidateTag.mockReset()
  })

  it('revalidates VI and EN schedule when a departure price changes', async () => {
    await revalidateTourDeparture({
      doc: { _status: 'published', id: 77, priceFrom: 19900000, site: 7, tourProduct: { id: 33, slug: 'han-quoc-5n4d' } },
      previousDoc: { _status: 'published', id: 77, priceFrom: 21900000, site: 7, tourProduct: { id: 33, slug: 'han-quoc-5n4d' } },
      req: { context: {}, payload: { find: vi.fn().mockResolvedValue({ docs: [] }) } },
    } as never)
    expectSchedulePathsRevalidated()
  })

  it('revalidates VI and EN schedule when a departure is unpublished', async () => {
    await revalidateTourDeparture({
      doc: { _status: 'draft', id: 77, site: 7, tourProduct: { id: 33, slug: 'han-quoc-5n4d' } },
      previousDoc: { _status: 'published', id: 77, site: 7, tourProduct: { id: 33, slug: 'han-quoc-5n4d' } },
      req: { context: {}, payload: { find: vi.fn().mockResolvedValue({ docs: [] }) } },
    } as never)
    expectSchedulePathsRevalidated()
  })

  it('revalidates VI and EN schedule when a departure is deleted', async () => {
    await revalidateTourDepartureDelete({
      doc: { id: 88, site: 9, tourProduct: { id: 44, slug: 'nhat-ban-6n5d' } },
      req: { context: {}, payload: { findByID: vi.fn() } },
    } as never)
    expectSchedulePathsRevalidated()
  })

  it('revalidates VI and EN schedule when a tour product badge changes', async () => {
    await revalidateTourProduct({
      doc: { _status: 'published', editorialBadges: ['hot'], id: 55, site: 7, slug: 'seoul' },
      previousDoc: { _status: 'published', editorialBadges: [], id: 55, site: 7, slug: 'seoul' },
      req: { context: {}, payload: { find: vi.fn().mockResolvedValue({ docs: [] }) } },
    } as never)
    expectSchedulePathsRevalidated()
  })
})
