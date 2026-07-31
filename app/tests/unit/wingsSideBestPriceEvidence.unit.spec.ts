import { describe, expect, it, vi } from 'vitest'

import manifestJSON from '../../scripts/data/wingsside-group-commerce-v1/classification.json'
import { captureBestPriceExactRowEvidence } from '../../scripts/lib/wingsSideBestPriceEvidence'
import type { ClassificationManifest } from '../../scripts/lib/wingsSideGroupCommerceLifecycle'

const manifest = manifestJSON as ClassificationManifest
const sourceId = manifest.products.find(({ productId }) => productId === 63)!.sourceId
const sourceUrl = `https://www.bestpricetravel.com/${sourceId.split('--').at(-1)}.html`
const candidate = [
  {
    productId: 63 as const,
    sourceId,
    sourceUrl,
    departureDate: '2026-12-23',
    variantKey: 'standard',
    priceFrom: 741,
  },
]

const response = (html: string, overrides: Partial<Response> = {}) =>
  ({
    ok: true,
    redirected: false,
    status: 200,
    text: async () => html,
    url: sourceUrl,
    ...overrides,
  }) as Response

describe('BestPrice exact-row evidence capture', () => {
  it('captures visible exact-row hashes with a maximum 24-hour envelope', async () => {
    const fetcher = vi.fn(async () =>
      response(
        '<html><div data-count="4" class="item"><div><span>Wed, 23 Dec</span></div><div>Guaranteed departure with promotion details and inclusions.</div><div class="price"><span class="font-size-13">US</span><span class="price-from">$741</span><span>/pax</span></div><button data-url="?departure_date=23-12-2026">Inquire</button></div></html>',
      ),
    )
    const evidence = await captureBestPriceExactRowEvidence({
      candidates: candidate,
      fetcher: fetcher as never,
      manifest,
      now: new Date('2026-07-31T10:00:00.000Z'),
      ttlHours: 24,
    })
    expect(evidence.rows[0]).toMatchObject({ evidenceKind: 'exact-html-row', httpStatus: 200 })
    expect(evidence.rows[0]!.sourcePageSha256).toMatch(/^[a-f0-9]{64}$/u)
    expect(Date.parse(evidence.expiresAt) - Date.parse(evidence.checkedAt)).toBe(86_400_000)
  })

  it('captures the nested production departure-row structure', async () => {
    const fetcher = vi.fn(async () =>
      response(
        '<html><div data-count="9" class="item"><div><span>Wed, 23 Dec</span></div>' +
          '<div>Guarantee depart</div><div><span>from</span><span>US</span>' +
          '<span>$741</span><span>/pax</span></div></div></html>',
      ),
    )
    const evidence = await captureBestPriceExactRowEvidence({
      candidates: candidate,
      fetcher: fetcher as never,
      manifest,
      now: new Date('2026-07-31T10:00:00.000Z'),
    })

    expect(evidence.rows).toHaveLength(1)
    expect(evidence.rows[0]).toMatchObject({
      exactRowDate: '2026-12-23',
      exactRowPerPaxPrice: 'USD 741/pax',
    })
  })

  it('rejects redirects, mismatched URLs, and JSON-LD-only inventory', async () => {
    await expect(
      captureBestPriceExactRowEvidence({
        candidates: candidate,
        fetcher: vi.fn(async () => response('', { redirected: true })) as never,
        manifest,
      }),
    ).rejects.toThrow(/redirected/)
    await expect(
      captureBestPriceExactRowEvidence({
        candidates: [
          { ...candidate[0]!, sourceUrl: 'https://www.bestpricetravel.com/a-different-tour.html' },
        ],
        fetcher: vi.fn() as never,
        manifest,
      }),
    ).rejects.toThrow(/mismatched source URL/)
    await expect(
      captureBestPriceExactRowEvidence({
        candidates: candidate,
        fetcher: vi.fn(async () =>
          response(
            '<script type="application/ld+json">{"date":"2026-12-23","price":"USD 741/pax"}</script>',
          ),
        ) as never,
        manifest,
      }),
    ).rejects.toThrow(/exact visible/)
  })
})
