import { describe, expect, it } from 'vitest'

import {
  snapshotDuration,
  snapshotMarket,
  snapshotPrice,
  snapshotPublicSlug,
  snapshotSourceFromURL,
} from '../../scripts/lib/tourSnapshots'

describe('tour snapshot parser', () => {
  it('recognizes only the two approved source hosts', () => {
    expect(snapshotSourceFromURL('https://www.bestpricetravel.com/vietnam-tours/a.html')).toBe(
      'bestpricetravel',
    )
    expect(snapshotSourceFromURL('https://thesinhtour.com/en/example/')).toBe('thesinhtour')
    expect(snapshotSourceFromURL('https://example.com/tour')).toBeNull()
  })

  it('maps inbound destinations', () => {
    expect(snapshotMarket({ category: 'halong-bay-cruise' })).toBe('vietnam')
    expect(snapshotMarket({ category: 'bangkok-tours' })).toBe('thailand')
    expect(snapshotMarket({ category: 'angkor-tours' })).toBe('cambodia')
  })

  it('parses duration and marks inferred nights', () => {
    expect(snapshotDuration('Duration: 4 days 3 nights')).toEqual({
      days: 4,
      nights: 3,
      inferredNights: false,
    })
    expect(snapshotDuration('Time: 1 Day')).toEqual({ days: 1, nights: 0, inferredNights: true })
  })

  it('takes the lowest explicit USD source price', () => {
    expect(snapshotPrice({ content: { price: '66 USD', tables: [[['Premium', 'US$74']]] } })).toBe(
      66,
    )
  })

  it('creates descriptive stable slugs without raw-only IDs', () => {
    const slug = snapshotPublicSlug('Hera Luxury Day Cruise Lan Ha Bay', 'thesinhtour', '15204')
    expect(slug).toMatch(/^hera-luxury-day-cruise-lan-ha-bay-tst-[a-f0-9]{8}$/u)
  })
})
