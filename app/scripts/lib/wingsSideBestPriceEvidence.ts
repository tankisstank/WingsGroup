import { createHash } from 'node:crypto'

import type {
  ClassificationManifest,
  SourceDepartureRow,
  SourceEvidence,
} from './wingsSideGroupCommerceLifecycle'

export type BestPriceEvidenceCandidate = {
  productId: 63 | 65 | 69
  sourceId: string
  sourceUrl: string
  departureDate: string
  variantKey: string
  priceFrom: number
}

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex')
const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
const sourceDatePatterns = (dateOnly: string) => {
  const parsed = new Date(`${dateOnly}T00:00:00.000Z`)
  if (!Number.isFinite(parsed.getTime()))
    throw new Error(`Invalid candidate departure date: ${dateOnly}`)
  const display = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC',
    weekday: 'short',
  }).format(parsed)
  return [
    escape(dateOnly),
    escape(display)
      .replace(/^([A-Za-z]{3})\s/u, '$1,?\\s*')
      .replace(/,\s*/u, ',?\\s*'),
  ]
}

const exactDepartureRow = ({
  dateOnly,
  html,
  priceFrom,
}: {
  dateOnly: string
  html: string
  priceFrom: number
}) => {
  const [year, month, day] = dateOnly.split('-')
  const queryDate = `departure_date=${day}-${month}-${year}`
  const queryIndex = html.indexOf(queryDate)
  const datePattern = `(?:${sourceDatePatterns(dateOnly).join('|')})`
  const pricePattern = `(?:USD(?:<[^>]+>|\\s)*|US(?:<[^>]+>|\\s)*\\$(?:<[^>]+>|\\s)*)${priceFrom}(?:\\.00)?(?:<[^>]+>|\\s)*\\/(?:<[^>]+>|\\s)*pax`
  if (queryIndex >= 0) {
    const itemStarts = [
      html.lastIndexOf('<div data-count=', queryIndex),
      html.lastIndexOf('<div class="item', queryIndex),
    ]
    const start = Math.max(...itemStarts)
    const nextCandidates = [
      html.indexOf('<div data-count=', queryIndex + queryDate.length),
      html.indexOf('<div class="item', queryIndex + queryDate.length),
    ].filter((index) => index >= 0)
    const end = nextCandidates.length
      ? Math.min(...nextCandidates)
      : Math.min(html.length, queryIndex + 5000)
    if (start >= 0 && end > queryIndex) {
      const candidate = html.slice(start, end)
      if (
        new RegExp(datePattern, 'iu').test(candidate) &&
        new RegExp(pricePattern, 'iu').test(candidate) &&
        /Guarantee(?:d)?\s+depart/iu.test(candidate)
      ) {
        return candidate
      }
    }
  }
  const fallback = html.match(
    new RegExp(
      `<(?:tr|li|div)\\b[^>]*>[\\s\\S]{0,5000}?${datePattern}[\\s\\S]{0,5000}?${pricePattern}[\\s\\S]{0,5000}?<\\/(?:tr|li|div)>`,
      'iu',
    ),
  )?.[0]
  return fallback && /Guarantee(?:d)?\s+depart/iu.test(fallback) ? fallback : undefined
}

export const captureBestPriceExactRowEvidence = async ({
  candidates,
  fetcher = fetch,
  manifest,
  now = new Date(),
  ttlHours = 8,
}: {
  candidates: BestPriceEvidenceCandidate[]
  fetcher?: typeof fetch
  manifest: ClassificationManifest
  now?: Date
  ttlHours?: number
}): Promise<SourceEvidence> => {
  if (!(ttlHours > 0 && ttlHours <= 24)) throw new Error('Evidence TTL must be within 24 hours')
  const locked = new Map(manifest.products.map((row) => [row.productId, row]))
  const checkedAt = now.toISOString()
  const expiresAt = new Date(now.getTime() + ttlHours * 3_600_000).toISOString()
  const rows: SourceDepartureRow[] = []
  for (const candidate of candidates) {
    const expected = locked.get(candidate.productId)
    if (!expected || expected.sourceId !== candidate.sourceId) {
      throw new Error(
        `Evidence candidate ${candidate.productId} does not match the locked manifest`,
      )
    }
    const requested = new URL(candidate.sourceUrl)
    const expectedSlug = candidate.sourceId.split('--').at(-1)
    if (
      requested.protocol !== 'https:' ||
      !['bestpricetravel.com', 'www.bestpricetravel.com'].includes(requested.hostname) ||
      !expectedSlug ||
      !requested.pathname.toLowerCase().includes(expectedSlug.toLowerCase())
    ) {
      throw new Error(`Evidence candidate ${candidate.productId} has a mismatched source URL`)
    }
    const response = await fetcher(requested, { redirect: 'follow' })
    if (
      !response.ok ||
      response.status !== 200 ||
      response.redirected ||
      response.url !== requested.href
    ) {
      throw new Error(`Evidence candidate ${candidate.productId} redirected or failed`)
    }
    const html = await response.text()
    const withoutJSONLD = html.replace(
      /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/giu,
      '',
    )
    const exactRow = exactDepartureRow({
      dateOnly: candidate.departureDate,
      html: withoutJSONLD,
      priceFrom: candidate.priceFrom,
    })
    if (!exactRow) {
      throw new Error(
        `Evidence candidate ${candidate.productId} lacks an exact visible date/price row`,
      )
    }
    rows.push({
      productId: candidate.productId,
      sourceId: candidate.sourceId,
      departureDate: candidate.departureDate,
      variantKey: candidate.variantKey,
      priceFrom: candidate.priceFrom,
      currency: 'USD',
      priceBasis: 'per-person',
      availabilityStatus: 'open',
      availabilityBadge: 'Guaranteed departure',
      verifiedAt: checkedAt,
      expiresAt,
      sourceUrl: requested.href,
      requestedSourceUrl: requested.href,
      finalSourceUrl: response.url,
      httpStatus: 200,
      evidenceKind: 'exact-html-row',
      sourcePageSha256: sha256(html),
      sourceRowSha256: sha256(exactRow),
      sourceStatus: 'guaranteed-departure',
      exactRowDate: candidate.departureDate,
      exactRowPerPaxPrice: `USD ${candidate.priceFrom}/pax`,
    })
  }
  return { schemaVersion: 1, sourceSystem: 'bestpricetravel', checkedAt, expiresAt, rows }
}
