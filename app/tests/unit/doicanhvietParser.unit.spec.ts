import { describe, expect, it } from 'vitest'

import {
  annotateDuplicateCandidates,
  buildTourWrapperLayout,
  deterministicMediaFilename,
  isDescriptivePublicSlug,
  removeAirlineMarkers,
  parseDoicanhvietRecord,
  sourceSlug,
} from '../../scripts/lib/doicanhviet'

describe('doicanhviet parser', () => {
  it('normalizes a Korean tour with multi-date pricing rows', async () => {
    const record = await parseDoicanhvietRecord({
      crawlerRoot: 'E:\\repo\\doicanhviet-crawler',
      sourceFile: 'storage/datasets/default/fixture.json',
      record: {
        tour_id: 'fixture-korea',
        category: 'han-quoc',
        url: 'https://doicanhviet.com/han-quoc/fixture.html',
        crawled_at: '2026-07-15T00:00:00.000Z',
        meta: { title: 'Tour Hàn Quốc 5N4Đ Seoul Nami' },
        content: {
          heading: 'Tour Hàn Quốc 5N4Đ Seoul Nami',
          body_text: [
            'Tour Hàn Quốc 5N4Đ Seoul Nami',
            'Thời gian: 5 ngày - 4 đêm',
            'Hàng không: Vietjet Air (VJ)',
            'NGÀY 1: HÀ NỘI - SEOUL ĂN:-/-/-',
            'Đón đoàn tại sân bay và bay sang Seoul.',
            'NGÀY 2: SEOUL - NAMI ĂN:S/T/T',
            'Tham quan đảo Nami. Nghỉ đêm khách sạn tại Seoul.',
            'NGÀY 3: SEOUL - HÀ NỘI ĂN:S/-/-',
            'Ra sân bay trở về Hà Nội.',
          ].join('\n'),
          tables: [
            [
              ['NGÀY KHỞI HÀNH', 'NGƯỜI LỚN', 'TRẺ EM', 'EM BÉ'],
              ['20/8; 27/8/2026', '15.900.000VNĐ', '14.900.000', '5.500.000'],
            ],
          ],
        },
        images: [],
      },
    })

    expect(record.kind).toBe('tour')
    expect(record.market).toBe('korea')
    expect(record.durationDays).toBe(5)
    expect(record.durationNights).toBe(4)
    expect(record.itineraryDays).toHaveLength(3)
    expect(record.blockingErrors).toContain('ITINERARY_DURATION_MISMATCH:3/5')
    expect(record.sectionVisibility).not.toContain('itinerary')
    expect(record.publishEligible).toBe(false)
    expect(record.departures).toHaveLength(2)
    expect(record.departures[0].priceFrom).toBe(15900000)
    expect(record.departures[0].airline).toBe('Vietjet Air')
    expect(record.slug).toContain('dcv-fixture-korea')
    expect(record.source.sourceSystem).toBe('doicanhviet')
    expect(record.source.sourceHash).toMatch(/^[a-f0-9]{64}$/u)
    expect(record.rawPricing).toHaveLength(1)
    expect(record.parsedValues.market.value).toBe('korea')
  })

  it('flags domestic tours without a supported market instead of guessing', async () => {
    const record = await parseDoicanhvietRecord({
      crawlerRoot: 'E:\\repo\\doicanhviet-crawler',
      sourceFile: 'fixture.json',
      record: {
        tour_id: 'fixture-dien-bien',
        category: 'dien-bien',
        url: 'https://doicanhviet.com/viet-nam/dien-bien.html',
        content: {
          heading: 'Tour Điện Biên 3 ngày 2 đêm',
          body_text: 'Tour Điện Biên 3 ngày 2 đêm\nNGÀY 1: HÀ NỘI - ĐIỆN BIÊN\nKhởi hành bằng xe.',
          tables: [],
        },
        images: [],
      },
    })

    expect(record.kind).toBe('tour')
    expect(record.market).toBeNull()
    expect(record.warnings).toContain('UNMAPPED_MARKET')
    expect(record.publishEligible).toBe(false)
  })

  it('classifies news records and keeps them out of tour parsing', async () => {
    const record = await parseDoicanhvietRecord({
      crawlerRoot: 'E:\\repo\\doicanhviet-crawler',
      sourceFile: 'fixture.json',
      record: {
        tour_id: 'fixture-news',
        category: 'tin-tuc-nuoc-ngoai',
        url: 'https://doicanhviet.com/tin-tuc-nuoc-ngoai/example.html',
        content: {
          heading: 'Tin tức du lịch Hàn Quốc',
          body_text: 'Tin tức du lịch Hàn Quốc và các thông tin mới nhất.',
          tables: [],
        },
        images: [],
      },
    })

    expect(record.kind).toBe('news')
    expect(record.itineraryDays).toHaveLength(0)
    expect(record.departures).toHaveLength(0)
    expect(record.warnings).toContain('IS_NEWS')
  })

  it('flags malformed compact date cells while keeping valid dates', async () => {
    const record = await parseDoicanhvietRecord({
      crawlerRoot: 'E:\\repo\\doicanhviet-crawler',
      sourceFile: 'fixture.json',
      record: {
        tour_id: 'fixture-date',
        category: 'han-quoc',
        content: {
          heading: 'Tour Hàn Quốc 5N4Đ khởi hành năm 2025',
          body_text: 'NGÀY 1: HÀ NỘI - SEOUL\nKhởi hành.',
          tables: [
            [
              ['NGÀY KHỞI HÀNH', 'NGƯỜI LỚN'],
              ['30/706/08', '10.000.000'],
            ],
          ],
        },
        images: [],
      },
    })

    expect(record.departures).toHaveLength(1)
    expect(record.warnings).toContain('MALFORMED_DATE_CELL:30/706/08')
  })

  it('classifies category pagination URLs and does not parse them as tours', async () => {
    const record = await parseDoicanhvietRecord({
      crawlerRoot: 'E:\\repo\\doicanhviet-crawler',
      sourceFile: 'fixture.json',
      record: {
        tour_id: 'fixture-page-3',
        category: 'tour-nuoc-ngoai',
        url: 'https://doicanhviet.com/tour-nuoc-ngoai/pages/p-3.html',
        content: { heading: 'Trang 3', body_text: 'Danh sách tour', tables: [] },
        images: [],
      },
    })

    expect(record.kind).toBe('pagination')
    expect(record.itineraryDays).toHaveLength(0)
    expect(record.departures).toHaveLength(0)
  })

  it('never infers a departure year from crawled_at', async () => {
    const record = await parseDoicanhvietRecord({
      crawlerRoot: 'E:\\repo\\doicanhviet-crawler',
      sourceFile: 'fixture.json',
      record: {
        tour_id: 'fixture-ambiguous-year',
        category: 'han-quoc',
        crawled_at: '2026-07-15T00:00:00.000Z',
        content: {
          heading: 'Tour Hàn Quốc 5N4Đ',
          body_text: 'NGÀY 1: HÀ NỘI - SEOUL\nKhởi hành.',
          tables: [
            [
              ['NGÀY KHỞI HÀNH', 'NGƯỜI LỚN'],
              ['20/8', '10.000.000'],
            ],
          ],
        },
        images: [],
      },
    })

    expect(record.departures).toHaveLength(0)
    expect(record.warnings.some((warning) => warning.startsWith('AMBIGUOUS_DEPARTURE_YEAR:'))).toBe(
      true,
    )
  })

  it('blocks duplicate, non-contiguous and incomplete itinerary days', async () => {
    const record = await parseDoicanhvietRecord({
      crawlerRoot: 'E:\\repo\\doicanhviet-crawler',
      sourceFile: 'fixture.json',
      record: {
        tour_id: 'fixture-itinerary-errors',
        category: 'han-quoc',
        content: {
          heading: 'Tour Hàn Quốc 3 ngày 2 đêm',
          body_text: [
            'Thời gian: 3 ngày - 2 đêm',
            'NGÀY 1: HÀ NỘI - SEOUL',
            'Khởi hành sang Seoul.',
            'NGÀY 1:',
            'NGÀY 3: SEOUL - HÀ NỘI',
            'Trở về Hà Nội.',
          ].join('\n'),
          tables: [],
        },
        images: [],
      },
    })

    expect(record.blockingErrors).toContain('DUPLICATE_ITINERARY_DAY:1')
    expect(record.blockingErrors).toContain('NON_CONTIGUOUS_ITINERARY_DAY:1')
    expect(record.blockingErrors).toContain('MISSING_ITINERARY_TITLE:2')
    expect(record.blockingErrors).toContain('MISSING_ITINERARY_SUMMARY:2')
    expect(record.publishEligible).toBe(false)
  })

  it('uses deterministic media names scoped by source, index and content hash', () => {
    const first = { localPath: 'E:\\crawler\\215093\\01.jpg', hash: 'abcdef0123456789' }
    const second = { localPath: 'E:\\crawler\\215094\\01.jpg', hash: 'abcdef0123456789' }
    expect(deterministicMediaFilename('215093', 0, first)).toBe('dcv-215093-01-abcdef01.jpg')
    expect(deterministicMediaFilename('215093', 0, first)).not.toBe(
      deterministicMediaFilename('215094', 0, second),
    )
  })

  it('marks exact source duplicates as review-only candidates', async () => {
    const make = (sourceId: string) =>
      parseDoicanhvietRecord({
        crawlerRoot: 'E:\\repo\\doicanhviet-crawler',
        sourceFile: 'fixture.json',
        record: {
          tour_id: sourceId,
          category: 'han-quoc',
          content: {
            heading: 'Tour Hàn Quốc 3 ngày 2 đêm',
            body_text: 'Thời gian: 3 ngày - 2 đêm\nNGÀY 1: HÀ NỘI - SEOUL\nKhởi hành.',
            tables: [],
          },
          images: [],
        },
      })
    const records = await Promise.all([make('duplicate-a'), make('duplicate-b')])
    annotateDuplicateCandidates(records)
    expect(records[0].duplicateCandidates).toEqual(['duplicate-b'])
    expect(records[0].warnings).toContain('POSSIBLE_SOURCE_DUPLICATE')
    expect(records[0].publishEligible).toBe(false)
  })

  it('rejects source-only public slugs', () => {
    expect(isDescriptivePublicSlug('dcv-215093')).toBe(false)
    expect(isDescriptivePublicSlug('seoul-nami-5n4d-vj-dcv-215093')).toBe(true)
  })

  it('rejects records from a different crawler source host', async () => {
    const record = await parseDoicanhvietRecord({
      crawlerRoot: 'E:\\repo\\tour-crawlers',
      sourceFile: 'bestprice/000000001.json',
      record: {
        tour_id: 'bagan-tour',
        category: 'bagan-tours',
        url: 'https://www.bestpricetravel.com/bagan-tours/example.html',
        content: { heading: 'Bagan 3 ngày 2 đêm', body_text: 'NGÀY 1: BAGAN\nKhởi hành.' },
        images: [],
      },
    })

    expect(record.kind).toBe('invalid')
    expect(record.publishEligible).toBe(false)
  })

  it('removes airline markers from public titles and generated slugs', () => {
    expect(removeAirlineMarkers('TOUR HÀN QUỐC 5N4Đ BAY VJ')).toBe('TOUR HÀN QUỐC 5N4Đ')
    expect(removeAirlineMarkers('Seoul - Nami bay VNA')).toBe('Seoul - Nami')
    const slug = sourceSlug('215093', 'TOUR HÀN QUỐC 5N4Đ BAY VJ')
    expect(slug).not.toContain('-bay-vj-')
    expect(slug).not.toContain('-vn-')
  })

  it('builds a valid non-empty Page wrapper layout', () => {
    const layout = buildTourWrapperLayout('Tour summary fallback content.')
    expect(layout).toHaveLength(1)
    expect(layout[0].blockType).toBe('content')
    expect(layout[0].columns[0].richText.root.children[0].children[0].text).toBe(
      'Tour summary fallback content.',
    )
  })
})
