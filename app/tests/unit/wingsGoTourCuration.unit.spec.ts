import { describe, expect, it } from 'vitest'
import { arrayMove } from '@dnd-kit/sortable'

import type { CuratedTourCardData, CurationValidationReport } from '@/components/WingsGoTourCuration/types'

// Replicating helper logic for unit testing
export const extractIDs = (val: unknown): Array<number | string> => {
  if (!Array.isArray(val)) return []
  return val
    .map((item: any) => {
      if (typeof item === 'number' || typeof item === 'string') return item
      if (item && typeof item === 'object' && 'id' in item && item.id != null) return item.id
      return null
    })
    .filter((id): id is number | string => id !== null && id !== undefined)
}

export const computeValidationReport = (tours: CuratedTourCardData[]): CurationValidationReport => {
  const ids = tours.map((t) => String(t.id))
  const uniqueIds = new Set(ids)
  const hasDuplicates = ids.length !== uniqueIds.size

  const missingDepartures = tours
    .filter((t) => !t.hasFutureDeparture)
    .map((t) => t.id)

  const missingPromoInHero = tours
    .slice(0, 3)
    .filter((t) => !t.promoLabel)
    .map((t) => t.id)

  const errors: string[] = []
  const warnings: string[] = []

  if (hasDuplicates) {
    errors.push('Có tour trùng lặp trong danh sách.')
  }
  if (tours.length > 6) {
    errors.push('Số lượng tour vượt quá giới hạn tối đa 6.')
  }
  if (missingDepartures.length > 0) {
    errors.push(`Có ${missingDepartures.length} tour chưa có lịch bay tương lai.`)
  }
  if (missingPromoInHero.length > 0) {
    warnings.push(`Có ${missingPromoInHero.length} tour ở khối Hero chưa có nhãn ưu đãi.`)
  }

  return {
    isValid: errors.length === 0,
    totalCount: tours.length,
    errors,
    warnings,
    hasDuplicates,
    missingDepartures,
    missingPromoInHero,
  }
}

const mockTour = (id: number | string, overrides: Partial<CuratedTourCardData> = {}): CuratedTourCardData => ({
  id,
  slotNumber: 1,
  title: `Tour ${id}`,
  slug: `tour-${id}`,
  isPublished: true,
  hasFutureDeparture: true,
  hasWrapperPage: true,
  priceFrom: 15000000,
  promoLabel: 'HOT DEAL',
  ...overrides,
})

describe('WingsGo Visual Tour Curation & Simulator Logic (US-078)', () => {
  describe('extractIDs helper', () => {
    it('handles numeric and string arrays', () => {
      expect(extractIDs([10, 20, '30'])).toEqual([10, 20, '30'])
    })

    it('handles object relationship arrays from Payload form state', () => {
      expect(extractIDs([{ id: 101 }, { id: '202' }, { id: null }, null, undefined])).toEqual([
        101,
        '202',
      ])
    })

    it('returns empty array on non-array input', () => {
      expect(extractIDs(null)).toEqual([])
      expect(extractIDs(undefined)).toEqual([])
      expect(extractIDs('not-an-array')).toEqual([])
    })
  })

  describe('Reordering & Slot allocation', () => {
    it('accurately moves a tour from slot 1 to slot 3 using arrayMove', () => {
      const initial = [mockTour(1), mockTour(2), mockTour(3), mockTour(4)]
      const reordered = arrayMove(initial, 0, 2)

      expect(reordered.map((t) => t.id)).toEqual([2, 3, 1, 4])
    })

    it('accurately divides tours into Hero Zone (Top 3) and Catalog Zone (Next 3)', () => {
      const all6Tours = [
        mockTour(1),
        mockTour(2),
        mockTour(3),
        mockTour(4),
        mockTour(5),
        mockTour(6),
      ]

      const heroZone = all6Tours.slice(0, 3)
      const catalogZone = all6Tours.slice(3, 6)

      expect(heroZone.map((t) => t.id)).toEqual([1, 2, 3])
      expect(catalogZone.map((t) => t.id)).toEqual([4, 5, 6])
      expect(heroZone.length).toBe(3)
      expect(catalogZone.length).toBe(3)
    })
  })

  describe('Pre-validation Engine', () => {
    it('validates a pristine list of 6 fully qualified tours', () => {
      const tours = [1, 2, 3, 4, 5, 6].map((id) => mockTour(id, { promoLabel: 'GIẢM 2TR' }))
      const report = computeValidationReport(tours)

      expect(report.isValid).toBe(true)
      expect(report.totalCount).toBe(6)
      expect(report.errors).toHaveLength(0)
      expect(report.warnings).toHaveLength(0)
    })

    it('flags error if any tour lacks a future departure', () => {
      const tours = [
        mockTour(1, { hasFutureDeparture: true }),
        mockTour(2, { hasFutureDeparture: false }),
        mockTour(3, { hasFutureDeparture: true }),
      ]
      const report = computeValidationReport(tours)

      expect(report.isValid).toBe(false)
      expect(report.missingDepartures).toEqual([2])
      expect(report.errors[0]).toContain('chưa có lịch bay tương lai')
    })

    it('flags warning when Hero tours (Slots 1-3) lack promoLabel, but ignores Slots 4-6', () => {
      const tours = [
        mockTour(1, { promoLabel: null }), // Hero slot 1 without promo
        mockTour(2, { promoLabel: 'HOT' }), // Hero slot 2
        mockTour(3, { promoLabel: null }), // Hero slot 3 without promo
        mockTour(4, { promoLabel: null }), // Catalog slot 4 without promo -> should NOT trigger hero warning
        mockTour(5, { promoLabel: null }), // Catalog slot 5 without promo -> should NOT trigger hero warning
      ]
      const report = computeValidationReport(tours)

      expect(report.isValid).toBe(true) // Warnings do not invalidate save
      expect(report.missingPromoInHero).toEqual([1, 3])
      expect(report.warnings).toHaveLength(1)
      expect(report.warnings[0]).toContain('2 tour ở khối Hero chưa có nhãn ưu đãi')
    })

    it('flags error when duplicate tours are present', () => {
      const tours = [mockTour(1), mockTour(2), mockTour(1)]
      const report = computeValidationReport(tours)

      expect(report.isValid).toBe(false)
      expect(report.hasDuplicates).toBe(true)
      expect(report.errors).toContain('Có tour trùng lặp trong danh sách.')
    })

    it('flags error if count exceeds 6 slots', () => {
      const tours = [1, 2, 3, 4, 5, 6, 7].map((id) => mockTour(id))
      const report = computeValidationReport(tours)

      expect(report.isValid).toBe(false)
      expect(report.errors).toContain('Số lượng tour vượt quá giới hạn tối đa 6.')
    })
  })

  describe('Multi-Tier Resolver Fallback (AC-10)', () => {
    it('Tier 1: Page-bound curation takes highest precedence', async () => {
      const { resolveCuratedTourIDs } = await import('@/tours/wingsGoCatalog')
      const mockPayload = {
        findByID: async () => ({ id: 99, featuredTours: [101, 102, 103] }),
        find: async () => ({ docs: [{ id: 1, featuredTours: [201, 202] }] }),
      } as any

      const result = await resolveCuratedTourIDs({
        page: {
          id: 10,
          pathname: '/tour',
          site: 1,
          wingsGoTourCatalog: {
            enabled: true,
            curation: 99,
            featuredTours: [301, 302],
          },
        },
        payload: mockPayload,
        siteID: 1,
      })

      expect(result).toEqual([101, 102, 103])
    })

    it('Tier 2: Site default curation is used when page curation is omitted', async () => {
      const { resolveCuratedTourIDs } = await import('@/tours/wingsGoCatalog')
      const mockPayload = {
        findByID: async () => null,
        find: async () => ({ docs: [{ id: 1, featuredTours: [201, 202, 203] }] }),
      } as any

      const result = await resolveCuratedTourIDs({
        page: {
          id: 10,
          pathname: '/tour',
          site: 1,
          wingsGoTourCatalog: {
            enabled: true,
            curation: null,
            featuredTours: [301, 302],
          },
        },
        payload: mockPayload,
        siteID: 1,
      })

      expect(result).toEqual([201, 202, 203])
    })

    it('Tier 3: Legacy featuredTours array on page is used when neither page curation nor default exists', async () => {
      const { resolveCuratedTourIDs } = await import('@/tours/wingsGoCatalog')
      const mockPayload = {
        findByID: async () => null,
        find: async () => ({ docs: [] }),
      } as any

      const result = await resolveCuratedTourIDs({
        page: {
          id: 10,
          pathname: '/tour',
          site: 1,
          wingsGoTourCatalog: {
            enabled: true,
            curation: null,
            featuredTours: [301, 302, 303],
          },
        },
        payload: mockPayload,
        siteID: 1,
      })

      expect(result).toEqual([301, 302, 303])
    })

    it('Cross-site Isolation: Rejects curation reference from a different site and falls back to site default', async () => {
      const { resolveCuratedTourIDs } = await import('@/tours/wingsGoCatalog')
      const mockPayload = {
        findByID: async () => ({
          id: 999,
          name: 'WingSide Curation',
          site: 2, // Different site!
          featuredTours: [901, 902],
        }),
        find: async () => ({
          docs: [
            {
              id: 100,
              isDefault: true,
              site: 1, // Same site default!
              featuredTours: [101, 102],
            },
          ],
        }),
      } as any

      const result = await resolveCuratedTourIDs({
        page: {
          id: 10,
          pathname: '/tour',
          site: 1,
          wingsGoTourCatalog: {
            enabled: true,
            curation: 999,
          },
        },
        payload: mockPayload,
        siteID: 1,
      })

      // Should reject 999 (site 2) and fall back to site 1 default [101, 102]
      expect(result).toEqual([101, 102])
    })

    it('Tier 4: Returns empty array to trigger algorithmic fallback when no curation or legacy list exists', async () => {
      const { resolveCuratedTourIDs } = await import('@/tours/wingsGoCatalog')
      const mockPayload = {
        findByID: async () => null,
        find: async () => ({ docs: [] }),
      } as any

      const result = await resolveCuratedTourIDs({
        page: {
          id: 10,
          pathname: '/tour',
          site: 1,
          wingsGoTourCatalog: {
            enabled: true,
            curation: null,
            featuredTours: [],
          },
        },
        payload: mockPayload,
        siteID: 1,
      })

      expect(result).toEqual([])
    })
  })

  describe('TourCurations Collection Hooks (AC-7 & AC-8)', () => {
    it('enforceSingleDefaultPerSite disables previous defaults for the same site', async () => {
      const { enforceSingleDefaultPerSite } = await import('@/collections/TourCurations/hooks')
      const updatedDocs: Array<{ id: number; data: any }> = []

      const mockPayload = {
        find: async () => ({
          docs: [
            { id: 10, isDefault: true, site: 1 },
            { id: 20, isDefault: true, site: 1 },
          ],
        }),
        update: async ({ id, data }: any) => {
          updatedDocs.push({ id, data })
          return { id, ...data }
        },
      }

      const req = { payload: mockPayload } as any
      const data = { name: 'New Default', isDefault: true, site: 1 }

      await enforceSingleDefaultPerSite({
        data,
        originalDoc: { id: 30, site: 1 },
        req,
        operation: 'create',
      } as any)

      expect(updatedDocs).toEqual([
        { id: 10, data: { isDefault: false } },
        { id: 20, data: { isDefault: false } },
      ])
    })

    it('validateTourCurationTours rejects lists exceeding 6 slots', async () => {
      const { validateTourCurationTours } = await import('@/collections/TourCurations/hooks')
      const data = { site: 1, featuredTours: [1, 2, 3, 4, 5, 6, 7] }

      await expect(
        validateTourCurationTours({
          data,
          originalDoc: undefined,
          req: { payload: {} } as any,
          operation: 'create',
        } as any),
      ).rejects.toThrow('Bộ sưu tập tour chỉ được chọn tối đa 6 tour nổi bật.')
    })

    it('validateTourCurationTours rejects duplicate tours in collection', async () => {
      const { validateTourCurationTours } = await import('@/collections/TourCurations/hooks')
      const data = { site: 1, featuredTours: [1, 2, 3, 1] }

      await expect(
        validateTourCurationTours({
          data,
          originalDoc: undefined,
          req: { payload: {} } as any,
          operation: 'create',
        } as any),
      ).rejects.toThrow('Không được chọn trùng lặp tour trong bộ sưu tập.')
    })

    it('validateTourCurationTours rejects tours from a different site', async () => {
      const { validateTourCurationTours } = await import('@/collections/TourCurations/hooks')
      const mockPayload = {
        find: async () => ({
          docs: [{ id: 1, site: 1 }], // Only 1 matched out of 2 requested
        }),
      }

      const data = { site: 1, featuredTours: [1, 2] }

      await expect(
        validateTourCurationTours({
          data,
          originalDoc: undefined,
          req: { payload: mockPayload } as any,
          operation: 'create',
        } as any),
      ).rejects.toThrow('Tất cả các tour trong bộ sưu tập phải thuộc cùng site đã chọn.')
    })

    it('validateTourCurationTours uses originalDoc.featuredTours on partial patch', async () => {
      const { validateTourCurationTours } = await import('@/collections/TourCurations/hooks')
      const mockPayload = {
        find: async () => ({
          docs: [{ id: 1, site: 2 }], // 1 tour matched for site 2
        }),
      }

      // data only updates site to 2, featuredTours is undefined
      const data = { site: 2 }
      const originalDoc = { id: 10, site: 1, featuredTours: [1] }

      const result = await validateTourCurationTours({
        data,
        originalDoc,
        req: { payload: mockPayload } as any,
        operation: 'update',
      } as any)

      expect(result).toEqual({ site: 2 })
    })

    it('preventCurationDelete blocks deleting default curation', async () => {
      const { preventCurationDelete } = await import('@/collections/TourCurations/hooks')
      const mockPayload = {
        findByID: async () => ({ id: 10, isDefault: true, site: 1 }),
        find: async () => ({ docs: [] }),
      }

      await expect(
        preventCurationDelete({
          id: 10,
          req: { payload: mockPayload } as any,
          collection: { slug: 'tour-curations' } as any,
        } as any),
      ).rejects.toThrow('Không thể xóa bộ sưu tập đang được thiết lập làm mặc định của site.')
    })

    it('preventCurationDelete blocks deleting curation bound to active page', async () => {
      const { preventCurationDelete } = await import('@/collections/TourCurations/hooks')
      const mockPayload = {
        findByID: async () => ({ id: 20, isDefault: false, site: 1 }),
        find: async () => ({ docs: [{ id: 100, pathname: '/tour' }] }),
      }

      await expect(
        preventCurationDelete({
          id: 20,
          req: { payload: mockPayload } as any,
          collection: { slug: 'tour-curations' } as any,
        } as any),
      ).rejects.toThrow('Không thể xóa bộ sưu tập vì đang được sử dụng bởi trang (/tour).')
    })

    it('preventCurationDelete allows deleting unbound non-default curation', async () => {
      const { preventCurationDelete } = await import('@/collections/TourCurations/hooks')
      const mockPayload = {
        findByID: async () => ({ id: 30, isDefault: false, site: 1 }),
        find: async () => ({ docs: [] }),
      }

      await expect(
        preventCurationDelete({
          id: 30,
          req: { payload: mockPayload } as any,
          collection: { slug: 'tour-curations' } as any,
        } as any),
      ).resolves.toBeUndefined()
    })
  })
})
