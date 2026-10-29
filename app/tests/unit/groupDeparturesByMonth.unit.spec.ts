import { describe, expect, it } from 'vitest'

import { groupDeparturesByMonth } from '@/tours/utils'

describe('groupDeparturesByMonth regression snapshots', () => {
  it('groups WingSide 00:00:00Z dates across months and year boundary stably', () => {
    const fixture = [
      { departureDate: '2026-10-15T00:00:00.000Z', id: 101 },
      { departureDate: '2026-11-01T00:00:00.000Z', id: 102 },
      { departureDate: '2026-11-20T00:00:00.000Z', id: 103 },
      { departureDate: '2026-12-31T00:00:00.000Z', id: 104 },
      { departureDate: '2027-01-01T00:00:00.000Z', id: 105 },
      { departureDate: '2027-02-14T00:00:00.000Z', id: 106 },
      { departureDate: null, id: 107 },
    ]

    const grouped = groupDeparturesByMonth(fixture)

    expect(grouped).toMatchSnapshot()
  })
})
