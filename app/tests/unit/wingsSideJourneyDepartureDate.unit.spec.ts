import { describe, expect, it } from 'vitest'

import { formatJourneyDeparture } from '@/app/(frontend)/journeys/WingSideJourneysClient'

describe('WingSide journey departure date', () => {
  it('preserves a Payload day-only date independently of the visitor timezone', () => {
    expect(formatJourneyDeparture('2026-08-01', 'en')).toBe('Aug 1, 2026')
  })
})
