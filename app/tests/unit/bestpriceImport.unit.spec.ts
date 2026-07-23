import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  bestPriceSlug,
  buildBestPriceNormalizedTours,
  cleanBestPriceText,
  mapBestPriceMarket,
  normalizeBestPriceRecord,
  readBestPriceManifest,
  resolveBestPriceMediaAlt,
} from '../../scripts/lib/bestprice22'

let fixtureRoot = ''
let crawlerRoot = ''
let manifestPath = ''
let rawPath = ''

beforeAll(async () => {
  fixtureRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'wings-bestprice-unit-'))
  crawlerRoot = path.join(fixtureRoot, 'crawler')
  manifestPath = path.join(fixtureRoot, 'tour-source-match.csv')
  rawPath = path.join(crawlerRoot, 'bestprice_tours.json')

  const manifestRows = ['status,candidate_source,document,candidate_url,tour_title']
  const records = []

  for (let index = 1; index <= 22; index += 1) {
    const suffix = String(index).padStart(2, '0')
    const isIndochina = index === 22
    const sourceId = isIndochina
      ? 'indochina-tours--codex-fixture-22'
      : `vietnam-tours--codex-fixture-${suffix}`
    const title = isIndochina
      ? 'Best of Vietnam and Cambodia Fixture 2 days'
      : `Vietnam Fixture Journey ${suffix} 2 days`
    const sourceUrl = `https://www.bestpricetravel.com/${
      isIndochina ? 'indochina-tours' : 'vietnam-tours'
    }/codex-fixture-${suffix}.html`
    const imageRelativePath = `images\\bestprice\\${sourceId}\\01.jpg`
    const imagePath = path.join(crawlerRoot, 'storage', 'images', 'bestprice', sourceId, '01.jpg')

    await fs.mkdir(path.dirname(imagePath), { recursive: true })
    await fs.writeFile(imagePath, Buffer.from(`synthetic-image-${suffix}`, 'utf8'))

    manifestRows.push(`full,bestprice,fixture-${suffix}.docx,${sourceUrl},${title}`)
    records.push({
      url: sourceUrl,
      tour_id: sourceId,
      category: isIndochina ? 'indochina-tours' : 'vietnam-tours',
      meta: { description: `Synthetic parser fixture ${suffix}.` },
      content: {
        heading: title,
        price: index === 1 ? '' : '99 USD',
        body_html:
          '<div class="itinerary-box"><span class="iti-day-title">Day 1 Hanoi</span><div class="itinerary-content"><p>Explore Hanoi.</p></div></div>',
        body_text: 'Duration :\\n2 days',
      },
      images: [
        {
          alt: `Synthetic fixture ${suffix}`,
          local_path: imageRelativePath,
        },
      ],
    })
  }

  await fs.mkdir(crawlerRoot, { recursive: true })
  await fs.writeFile(manifestPath, `${manifestRows.join('\n')}\n`, 'utf8')
  await fs.writeFile(rawPath, `${JSON.stringify(records)}\n`, 'utf8')
})

afterAll(async () => {
  if (fixtureRoot) {
    await fs.rm(fixtureRoot, { force: true, recursive: true })
  }
})

describe('BestPrice 22 tour import parser', () => {
  it('should load exactly the 22 full BestPrice manifest rows', async () => {
    const manifest = await readBestPriceManifest(manifestPath)

    expect(manifest).toHaveLength(22)
    expect(manifest.every((row) => row.sourceUrl.includes('bestpricetravel.com'))).toBe(true)
    expect(manifest.every((row) => row.sourceUrl.includes('codex-fixture-'))).toBe(true)
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

  it('separates BestPrice Included activities from the sibling Excluded list', async () => {
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
            '<h2 id="h_tour_inclusion">Inclusions</h2>' +
            '<div><label>Included activities</label><ul><li>Local guide</li><li>Domestic flight</li></ul></div>' +
            '<div><label>Excluded</label><ul><li>International flights</li><li>Travel Insurance</li></ul></div>' +
            '<h2 id="h_tour_rate">Rates &amp; Availability</h2>' +
            '<div class="itinerary-box"><span class="iti-day-title">Day 1 Hanoi</span><div class="itinerary-content"><p>Explore Hanoi.</p></div></div>',
          body_text: 'Duration :\n1 day',
        },
        images: [],
      },
    })

    expect(tour.includes).toEqual(['Local guide', 'Domestic flight'])
    expect(tour.excludes).toEqual(['International flights', 'Travel Insurance'])
  })

  it('should replace generic or blank media alt with the normalized tour title', async () => {
    const title = 'Northern Vietnam Rice Terrace Journey 4 days'
    const sourceId = 'vietnam-tours--rice-terrace-alt'
    const imageRelativePath = `images\\bestprice\\${sourceId}\\01.jpg`
    const imagePath = path.join(crawlerRoot, 'storage', 'images', 'bestprice', sourceId, '01.jpg')
    await fs.mkdir(path.dirname(imagePath), { recursive: true })
    await fs.writeFile(imagePath, Buffer.from('synthetic-hero-alt', 'utf8'))

    const tour = await normalizeBestPriceRecord({
      crawlerRoot,
      sourceFile: rawPath,
      manifestRow: {
        document: 'fixture-alt.docx',
        sourceUrl: 'https://www.bestpricetravel.com/vietnam-tours/rice-terrace-alt.html',
        title,
      },
      record: {
        url: 'https://www.bestpricetravel.com/vietnam-tours/rice-terrace-alt.html',
        tour_id: sourceId,
        category: 'vietnam-tours',
        meta: { description: 'A memorable experience.Socialize with local hosts.' },
        content: {
          heading: title,
          price: '199 USD',
          body_html:
            '<div class="itinerary-box"><span class="iti-day-title">Day 1 Sapa</span><div class="itinerary-content"><p>Explore rice terraces.</p></div></div>',
          body_text: 'Duration :\n4 days',
        },
        images: [
          {
            alt: 'img-video',
            local_path: imageRelativePath,
            src_url: 'https://example.invalid/01.jpg',
          },
        ],
      },
    })

    expect(resolveBestPriceMediaAlt('img-video', title)).toBe(title)
    expect(resolveBestPriceMediaAlt('IMG Video', title)).toBe(title)
    expect(resolveBestPriceMediaAlt('img_video', title)).toBe(title)
    expect(resolveBestPriceMediaAlt('', title)).toBe(title)
    expect(resolveBestPriceMediaAlt('  ', title)).toBe(title)
    expect(tour.images).toHaveLength(1)
    expect(tour.images[0].alt).toBe(title)
    expect(tour.summary).toBe('A memorable experience. Socialize with local hosts.')
  })

  it('uses the approved public summary for the audited Northern Vietnam tour only', async () => {
    const sourceId = 'vietnam-tours--best-of-northern-vietnam-6-days'
    const title = 'Best of Northern Vietnam 6 days'
    const imageRelativePath = `images\\bestprice\\${sourceId}\\01.jpg`
    const imagePath = path.join(crawlerRoot, 'storage', 'images', 'bestprice', sourceId, '01.jpg')
    await fs.mkdir(path.dirname(imagePath), { recursive: true })
    await fs.writeFile(imagePath, Buffer.from('synthetic-northern-hero', 'utf8'))

    const tour = await normalizeBestPriceRecord({
      crawlerRoot,
      sourceFile: rawPath,
      manifestRow: {
        document: 'best-of-northern-vietnam.docx',
        sourceUrl:
          'https://www.bestpricetravel.com/vietnam-tours/best-of-northern-vietnam-6-days.html',
        title,
      },
      record: {
        url: 'https://www.bestpricetravel.com/vietnam-tours/best-of-northern-vietnam-6-days.html',
        tour_id: sourceId,
        category: 'vietnam-tours',
        meta: {
          description: 'The Best of Northern Vietnam is a memorable experience.Socialize yourself.',
        },
        content: {
          heading: title,
          price: '999 USD',
          body_html:
            '<div class="itinerary-box"><span class="iti-day-title">Day 1 Hanoi</span><div class="itinerary-content"><p>Explore Hanoi.</p></div></div>',
          body_text: 'Duration :\n6 days',
        },
        images: [{ local_path: imageRelativePath }],
      },
    })

    expect(tour.summary).toBe(
      'Explore Hanoi, Ninh Binh, Sapa, Fansipan and Ha Long on a private six-day Northern Vietnam journey with local planning and flexible pacing.',
    )
    expect(tour.summary).not.toContain('experience.Socialize')
  })

  it('should preserve meaningful media alt from the crawl source', async () => {
    const title = 'Vietnam Coastline Fixture 2 days'
    const sourceId = 'vietnam-tours--meaningful-alt'
    const imageRelativePath = `images\\bestprice\\${sourceId}\\01.jpg`
    const imagePath = path.join(crawlerRoot, 'storage', 'images', 'bestprice', sourceId, '01.jpg')
    await fs.mkdir(path.dirname(imagePath), { recursive: true })
    await fs.writeFile(imagePath, Buffer.from('synthetic-meaningful-alt', 'utf8'))
    const meaningfulAlt = 'Halong Bay limestone karsts at sunrise'

    const tour = await normalizeBestPriceRecord({
      crawlerRoot,
      sourceFile: rawPath,
      manifestRow: {
        document: 'fixture-meaningful-alt.docx',
        sourceUrl: 'https://www.bestpricetravel.com/vietnam-tours/meaningful-alt.html',
        title,
      },
      record: {
        url: 'https://www.bestpricetravel.com/vietnam-tours/meaningful-alt.html',
        tour_id: sourceId,
        category: 'vietnam-tours',
        meta: { description: 'Coastal journey summary.' },
        content: {
          heading: title,
          price: '149 USD',
          body_html:
            '<div class="itinerary-box"><span class="iti-day-title">Day 1 Halong</span><div class="itinerary-content"><p>Cruise the bay.</p></div></div>',
          body_text: 'Duration :\n2 days',
        },
        images: [
          {
            alt: meaningfulAlt,
            local_path: imageRelativePath,
            src_url: 'https://example.invalid/01.jpg',
          },
        ],
      },
    })

    expect(resolveBestPriceMediaAlt(meaningfulAlt, title)).toBe(meaningfulAlt)
    expect(tour.images).toHaveLength(1)
    expect(tour.images[0].alt).toBe(meaningfulAlt)
    expect(tour.images[0].alt).not.toBe(title)
  })

  it('should insert one space after glued sentence punctuation without altering decimals or URLs', () => {
    expect(cleanBestPriceText('experience.Socialize')).toBe('experience. Socialize')
    expect(cleanBestPriceText('A memorable experience.Socialize with local hosts.')).toBe(
      'A memorable experience. Socialize with local hosts.',
    )
    expect(cleanBestPriceText('Price is 99.50 USD')).toBe('Price is 99.50 USD')
    expect(cleanBestPriceText('See https://www.bestpricetravel.com/tours')).toBe(
      'See https://www.bestpricetravel.com/tours',
    )
    expect(cleanBestPriceText('See https://example.Travel/Path.WithCaps now')).toBe(
      'See https://example.Travel/Path.WithCaps now',
    )
  })
})
