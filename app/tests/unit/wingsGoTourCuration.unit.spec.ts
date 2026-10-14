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
})
