import path from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  bestPriceSlug,
  buildBestPriceNormalizedTours,
  mapBestPriceMarket,
  normalizeBestPriceRecord,
  readBestPriceManifest,
} from '../../scripts/lib/bestprice22'

const repoRoot = path.resolve(process.cwd(), '..')
const manifestPath = path.join(repoRoot, 'output', 'doc', 'tour-source-match-20260717.csv')
const crawlerRoot = 'E:\\repo\\tour-crawlers'
const rawPath = path.join(crawlerRoot, 'bestprice_tours.json')

describe('BestPrice 22 tour import parser', () => {
  it('should load exactly the 22 full BestPrice manifest rows', async () => {
    const manifest = await readBestPriceManifest(manifestPath)

    expect(manifest).toHaveLength(22)
    expect(manifest.every((row) => row.sourceUrl.includes('bestpricetravel.com'))).toBe(true)
  })

  it('should map the accepted routes to Vietnam and Indochina markets', async () => {
    const result = await buildBestPriceNormalizedTours({ crawlerRoot, manifestPath, rawPath })
    const counts = result.tours.reduce<Record<string, number>>((accumulator, tour) => {
      accumulator[tour.market] = (accumulator[tour.market] || 0) + 1
      return accumulator
    }, {})

    expect(result.missing).toHaveLength(0)
    expect(counts.vietnam).toBe(21)
    expect(counts.indochina).toBe(1)
    expect(counts.korea || 0).toBe(0)
  })

  it('should keep public slugs descriptive and source-free', () => {
    expect(bestPriceSlug('Best of Vietnam and Cambodia 15 days')).toBe(
      'best-of-vietnam-and-cambodia-15-days',
    )
    expect(bestPriceSlug('BPT-indochina-tours--best-of-vietnam-and-cambodia-15-days')).not.toBe(
      'bpt-indochina-tours-best-of-vietnam-and-cambodia-15-days',
    )
  })

  it('should reject image paths outside the matching BestPrice tour folder', async () => {
    const tour = await normalizeBestPriceRecord({
      crawlerRoot,
      sourceFile: rawPath,
      manifestRow: {
        document: 'fixture.docx',
        sourceUrl: 'https://www.bestpricetravel.com/vietnam-tours/example.html',
        title: 'Vietnam Example 1 day',
      },
      record: {
        url: 'https://www.bestpricetravel.com/vietnam-tours/example.html',
        tour_id: 'vietnam-tours--example',
        category: 'vietnam-tours',
        meta: { description: 'Example summary' },
        content: {
          heading: 'Vietnam Example 1 day',
          price: '99 USD',
          body_html:
            '<div class="itinerary-box"><span class="iti-day-title">Day 1 Hanoi</span><div class="itinerary-content"><p>Explore Hanoi.</p></div></div>',
          body_text: 'Duration :\n1 day',
        },
        images: [
          {
            alt: 'Wrong folder',
            local_path: 'images\\bestprice\\other-tour\\01.jpg',
            src_url: 'https://example.invalid/01.jpg',
          },
        ],
      },
    })

    expect(tour.images).toHaveLength(0)
    expect(tour.blockingErrors).toContain('NO_MEDIA')
    expect(tour.warnings.some((warning) => /^INVALID_IMAGE_PATH:/u.test(warning))).toBe(true)
  })

  it('should allow contact-mode publishing without priceFrom', async () => {
    const result = await buildBestPriceNormalizedTours({ crawlerRoot, manifestPath, rawPath })
    const missingPrice = result.tours.find((tour) => tour.warnings.includes('NO_PRICE_FROM'))

    expect(missingPrice).toBeTruthy()
    expect(missingPrice?.warnings).toContain('NO_FUTURE_DEPARTURES')
    expect(missingPrice?.publishEligible).toBe(true)
  })

  it('should classify the combined Vietnam Cambodia tour as Indochina', () => {
    expect(mapBestPriceMarket('indochina-tours', 'Best of Vietnam and Cambodia 15 days')).toBe(
      'indochina',
    )
  })
})
