import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('tour itinerary admin contract', () => {
  const root = path.resolve(__dirname, '../..')

  it('uses Payload native array collapse controls and a meaningful row summary', () => {
    const collection = fs.readFileSync(path.join(root, 'src/collections/TourProducts.ts'), 'utf8')
    const rowLabel = fs.readFileSync(path.join(root, 'src/components/TourItineraryRowLabel.tsx'), 'utf8')

    expect(collection).toContain("name: 'itineraryDays'")
    expect(collection).toContain('initCollapsed: true')
    expect(collection).toContain("RowLabel: '@/components/TourItineraryRowLabel'")
    expect(rowLabel).toContain('useRowLabel')
    expect(rowLabel).toContain('Ngày ${day}')
  })
})
