import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('payload', () => ({ getPayload: vi.fn() }))
vi.mock('@/utilities/siteContext', () => ({
  appendSiteWhere: vi.fn(),
  getCurrentSite: vi.fn(),
}))

import {
  rankRelatedTourFallbacks,
  scheduleTrustSignals,
  selectRelatedTourCards,
} from '@/tours/queries'
import { getDurationLabel, getTourPricePosture, normalizeTourPublicText } from '@/tours/utils'

describe('public tour projection', () => {
  it('keeps WingsGo schedule trust signals as valid Vietnamese UTF-8 copy', () => {
    expect(scheduleTrustSignals).toEqual([
      'Giá công khai theo từng đợt mở bán',
      'Giữ chỗ sau khi sales xác nhận tồn chỗ',
      'Hỗ trợ visa, hồ sơ và điều phối trước ngày đi',
      'Điều hành gửi xác nhận trước khi chốt booking',
    ])
    expect(scheduleTrustSignals.join('')).not.toMatch(/[├╗╞─]/u)
  })

  it('passes the requested public locale into consultative tour chrome', () => {
    const source = readFileSync(
      join(process.cwd(), 'src', 'app', '(frontend)', 'cmsPage.tsx'),
      'utf8',
    )

    expect(source).toMatch(
      /<TourDetailPage[\s\S]*?locale=\{locale\}[\s\S]*?presentation="consultative"/u,
    )
  })

  it.each([
    ['en', '1 day / 0 nights', '2 days / 1 night'],
    ['it', '1 giorno / 0 notti', '2 giorni / 1 notte'],
    ['es', '1 día / 0 noches', '2 días / 1 noche'],
    ['pt', '1 dia / 0 noites', '2 dias / 1 noite'],
    ['vi', '1 ngày / 0 đêm', '2 ngày / 1 đêm'],
  ] as const)('pluralizes duration correctly for %s', (locale, singularDay, singularNight) => {
    expect(getDurationLabel(1, 0, locale)).toBe(singularDay)
    expect(getDurationLabel(2, 1, locale)).toBe(singularNight)
  })

  it('normalizes canonical place names and obvious punctuation spacing only', () => {
    expect(normalizeTourPublicText('Sapa - Halong. Power Station . NOTE :Bring shoes.')).toBe(
      'Sa Pa - Ha Long. Power Station. NOTE: Bring shoes.',
    )
  })

  it('ranks fallback relations by destination, region, style, duration, then stable slug', () => {
    const source = {
      destinationTags: ['sapa', 'hanoi'],
      durationDays: 6,
      market: 'vietnam',
      travelStyles: ['adventure', 'culture'],
    }
    const candidates = [
      {
        destinationTags: ['sapa'],
        durationDays: 9,
        market: 'vietnam',
        slug: 'sapa-wellness',
        travelStyles: ['wellness'],
      },
      {
        destinationTags: ['sapa'],
        durationDays: 8,
        market: 'vietnam',
        slug: 'sapa-soft-adventure',
        travelStyles: ['adventure'],
      },
      {
        destinationTags: ['sapa'],
        durationDays: 7,
        market: 'vietnam',
        slug: 'sapa-culture',
        travelStyles: ['culture'],
      },
      {
        destinationTags: ['hue'],
        durationDays: 6,
        market: 'vietnam',
        slug: 'central-adventure',
        travelStyles: ['adventure'],
      },
    ]

    expect(rankRelatedTourFallbacks(source, candidates).map(({ slug }) => slug)).toEqual([
      'sapa-culture',
      'sapa-soft-adventure',
      'sapa-wellness',
      'central-adventure',
    ])
  })

  it('keeps explicit CMS related-tour order ahead of fallback ranking', () => {
    const configured = [{ slug: 'editorial-second' }, { slug: 'editorial-first' }]
    const fallback = [
      {
        destinationTags: ['sapa'],
        durationDays: 3,
        market: 'vietnam',
        slug: 'algorithmic-best',
        summary:
          'A calm mountain journey. Book this BestPrice Travel package now. Meet your local planner.',
        title: 'Sa Pa private journey',
        travelStyles: ['adventure'],
      },
    ]

    expect(
      selectRelatedTourCards({
        candidates: fallback,
        configured,
        source: {
          destinationTags: ['sapa'],
          durationDays: 3,
          market: 'vietnam',
          travelStyles: ['adventure'],
        },
      }),
    ).toEqual(configured)
  })

  it('removes source-brand sentences from fallback related cards', () => {
    const [card] = selectRelatedTourCards({
      candidates: [
        {
          destinationTags: ['sapa'],
          durationDays: 3,
          market: 'vietnam',
          slug: 'sapa-private',
          summary:
            'A calm mountain journey. Book this BestPrice Travel package now. Meet your local planner.',
          title: 'Sa Pa private journey',
          travelStyles: ['adventure'],
        },
      ],
      configured: [],
      source: {
        destinationTags: ['sapa'],
        durationDays: 3,
        market: 'vietnam',
        travelStyles: ['adventure'],
      },
    })

    expect(card).toMatchObject({
      summary: 'A calm mountain journey. Meet your local planner.',
      title: 'Sa Pa private journey',
    })
  })

  it.each([
    ['en', 'We confirm your tailored quote before any deposit.'],
    ['it', 'Confermiamo il preventivo personalizzato prima di qualsiasi acconto.'],
    ['es', 'Confirmamos tu propuesta personalizada antes de cualquier depósito.'],
    ['pt', 'Confirmamos sua proposta personalizada antes de qualquer depósito.'],
    ['vi', 'Chúng tôi xác nhận báo giá thiết kế riêng trước khi bạn đặt cọc.'],
  ] as const)('uses consultative price language for %s', (locale, honesty) => {
    expect(getTourPricePosture({ locale })).toMatchObject({ honesty })
  })
})
