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

  it('places 17:00:00.000Z of the previous UTC day into the next VN business month', () => {
    // 2026-10-31T17:00:00.000Z in UTC is 2026-11-01T00:00:00 in Asia/Ho_Chi_Minh (+7)
    // 2026-12-31T17:00:00.000Z in UTC is 2027-01-01T00:00:00 in Asia/Ho_Chi_Minh (+7)
    const departures = [
      { departureDate: '2026-10-31T17:00:00.000Z', id: 201 },
      { departureDate: '2026-12-31T17:00:00.000Z', id: 202 },
    ]

    const grouped = groupDeparturesByMonth(departures)

    expect(grouped).toHaveLength(2)
    expect(grouped[0].key).toBe('2026-11')
    expect(grouped[0].items[0].id).toBe(201)
    expect(grouped[1].key).toBe('2027-01')
    expect(grouped[1].items[0].id).toBe(202)
  })
})
