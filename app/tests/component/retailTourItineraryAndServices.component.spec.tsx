import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { TourDetailPage } from '@/tours/StructuredPages'
import type { TourResolvedData } from '@/tours/types'

vi.mock('@/components/Media', () => ({
  Media: ({ alt, className, resource }: { alt?: string; className?: string; resource?: any }) => (
    <img
      alt={alt || resource?.alt || 'Tour media'}
      className={className}
      src={resource?.url || 'https://images.unsplash.com/photo-1517154421773-0529f29ea451'}
    />
  ),
}))

vi.mock('@/components/SiteLink', () => ({
  SiteLink: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={String(href)} {...props}>
      {children}
    </a>
  ),
}))

afterEach(cleanup)

describe('US-027 Slice 3: Itinerary Accordion & Services Module retail component tests', () => {
  const baseTourData: TourResolvedData = {
    departures: [],
    featuredDepartures: [],
    nextDeparture: null,
    sectionOrder: ['hero', 'facts', 'itinerary', 'services', 'departures', 'sticky-cta'],
    sectionVisibility: ['hero', 'facts', 'itinerary', 'services', 'departures', 'sticky-cta'],
    tour: {
      id: 201,
      title: 'Hành Trình Khám Phá Seoul - Nami - Everland 5N4Đ',
      slug: 'seoul-nami-everland-5n4d',
      durationDays: 5,
      durationNights: 4,
      itineraryDays: [
        {
          dayNumber: 1,
          title: 'Hà Nội - Seoul (Nghỉ đêm trên máy bay)',
          route: 'Hà Nội • Incheon',
          summary: 'Đoàn tập trung tại sân bay Nội Bài làm thủ tục đón chuyến bay đi Incheon.',
          meals: 'Ăn tối nhẹ trên máy bay',
          transport: 'Máy bay Vietnam Airlines',
          accommodation: 'Nghỉ đêm trên máy bay',
          sleepingStandard: 'Tiêu chuẩn hàng không',
        },
        {
          dayNumber: 2,
          title: 'Incheon - Đảo Nami - Tháp Namsan',
          route: 'Incheon • Nami • Seoul',
          summary: 'Tham quan Đảo Nami xinh đẹp, bối cảnh Bản tình ca mùa đông.',
          meals: 'Ăn sáng, trưa, tối',
          transport: 'Xe du lịch 45 chỗ',
          accommodation: 'Khách sạn 4 sao Seoul',
          sleepingStandard: 'Phòng 2 người',
          dayHighlight: 'Trải nghiệm chụp ảnh tại Đảo Nami lãng mạn',
        },
        {
          dayNumber: 3,
          title: 'Công viên Everland - Cung điện Gyeongbokgung',
          route: 'Seoul • Everland',
          summary: 'Thỏa sức vui chơi tại công viên chủ đề ngoài trời lớn nhất Hàn Quốc.',
          meals: 'Ăn sáng, trưa',
          transport: 'Xe du lịch',
          accommodation: 'Khách sạn 4 sao Seoul',
        },
      ],
      includes: [
        { label: 'Vé máy bay khứ hồi kèm 23kg hành lý ký gửi' },
        { label: 'Khách sạn tiêu chuẩn 4 sao trung tâm' },
        { label: 'Các bữa ăn theo chương trình' },
      ],
      excludes: [
        { label: 'Hộ chiếu còn hạn trên 6 tháng' },
        { label: 'Chi phí cá nhân ngoài chương trình' },
      ],
      servicesSummary: {
        hotelSummary: 'Khách sạn 4 sao tiêu chuẩn quốc tế',
        transportSummary: 'Xe du lịch đời mới suốt tuyến',
        mealsSummary: 'Bao gồm các bữa ăn đặc sản địa phương',
        operatorNotes: 'Thứ tự các điểm tham quan có thể thay đổi tùy tình hình thực tế.',
        notes: [
          { label: 'Quý khách vui lòng tuân thủ quy định xuất nhập cảnh.' },
        ],
      },
    },
    variants: [],
  }

  it('renders itinerary accordion with default Day 1 expanded and toggles all days via expand/collapse all button', () => {
    const { container } = render(
      <TourDetailPage data={baseTourData} locale="vi" siteCode="wingsgo" />,
    )

    // Check expand/collapse all button exists
    const toggleAllBtn = container.querySelector('[data-od-id="tour-itinerary-toggle-all"]')
    expect(toggleAllBtn).toBeTruthy()
    expect(toggleAllBtn?.textContent).toContain('Mở rộng tất cả')

    // Day 1 should be open by default
    const day1Details = container.querySelector('[data-od-id="retail-itinerary-day-1"]')?.closest('details')
    const day2Details = container.querySelector('[data-od-id="retail-itinerary-day-2"]')?.closest('details')
    const day3Details = container.querySelector('[data-od-id="retail-itinerary-day-3"]')?.closest('details')

    expect(day1Details?.hasAttribute('open')).toBe(true)
    expect(day2Details?.hasAttribute('open')).toBe(false)
    expect(day3Details?.hasAttribute('open')).toBe(false)

    // Click "Mở rộng tất cả"
    fireEvent.click(toggleAllBtn!)

    // Now all days should be open
    expect(day1Details?.hasAttribute('open')).toBe(true)
    expect(day2Details?.hasAttribute('open')).toBe(true)
    expect(day3Details?.hasAttribute('open')).toBe(true)
    expect(toggleAllBtn?.textContent).toContain('Thu gọn tất cả')

    // Click "Thu gọn tất cả"
    fireEvent.click(toggleAllBtn!)
    expect(day1Details?.hasAttribute('open')).toBe(false)
    expect(day2Details?.hasAttribute('open')).toBe(false)
    expect(day3Details?.hasAttribute('open')).toBe(false)
    expect(toggleAllBtn?.textContent).toContain('Mở rộng tất cả')

    // Click individual summary of Day 2
    const day2Summary = container.querySelector('[data-od-id="retail-itinerary-day-2"]')
    expect(day2Summary).toBeTruthy()
    fireEvent.click(day2Summary!)
    expect(day2Details?.hasAttribute('open')).toBe(true)
    expect(day1Details?.hasAttribute('open')).toBe(false)
    expect(toggleAllBtn?.getAttribute('aria-expanded')).toBe('false')

    // Click individual summary of Day 2 again to close
    fireEvent.click(day2Summary!)
    expect(day2Details?.hasAttribute('open')).toBe(false)
    expect(toggleAllBtn?.getAttribute('aria-expanded')).toBe('false')
  })

  it('filters out boilerplate placeholder "Điểm nhấn của ngày được giữ đủ rõ" and displays only real highlight', () => {
    const tourWithPlaceholder: TourResolvedData = {
      ...baseTourData,
      tour: {
        ...baseTourData.tour,
        itineraryDays: [
          {
            dayNumber: 1,
            title: 'Ngày 1: Hà Nội - Seoul',
            dayHighlight: 'Điểm nhấn của ngày được giữ đủ rõ cho cả nhóm khách đọc nhanh.',
          },
          {
            dayNumber: 2,
            title: 'Ngày 2: Seoul - Nami',
            dayHighlight: 'Check-in rực rỡ dưới hàng ngân hạnh vàng óng ả Đảo Nami.',
          },
        ],
      },
    }

    const { container } = render(
      <TourDetailPage data={tourWithPlaceholder} locale="vi" siteCode="wingsgo" />,
    )

    // The placeholder boilerplate should be filtered out by isUsableText guard
    expect(container.textContent).not.toContain('Điểm nhấn của ngày được giữ đủ rõ cho cả nhóm khách đọc nhanh.')
    // Real highlight must be rendered
    expect(container.textContent).toContain('Check-in rực rỡ dưới hàng ngân hạnh vàng óng ả Đảo Nami.')
  })

  it('renders services section with structured includes, excludes, hotel, transport, and operator notes', () => {
    const { container } = render(
      <TourDetailPage data={baseTourData} locale="vi" siteCode="wingsgo" />,
    )

    const servicesPanel = container.querySelector('[data-od-id="tour-services"]')
    expect(servicesPanel).toBeTruthy()

    // Includes
    const includedBox = container.querySelector('[data-od-id="tour-services-included"]')
    expect(includedBox).toBeTruthy()
    expect(includedBox?.textContent).toContain('Vé máy bay khứ hồi kèm 23kg hành lý ký gửi')
    expect(includedBox?.textContent).toContain('Khách sạn tiêu chuẩn 4 sao trung tâm')

    // Excludes
    const excludedBox = container.querySelector('[data-od-id="tour-services-excluded"]')
    expect(excludedBox).toBeTruthy()
    expect(excludedBox?.textContent).toContain('Hộ chiếu còn hạn trên 6 tháng')

    // Hotel & Transport
    const hotelBox = container.querySelector('[data-od-id="tour-services-hotel"]')
    expect(hotelBox?.textContent).toContain('Khách sạn 4 sao tiêu chuẩn quốc tế')

    const transportBox = container.querySelector('[data-od-id="tour-services-transport"]')
    expect(transportBox?.textContent).toContain('Xe du lịch đời mới suốt tuyến')

    // Overnight stops
    const stopsBox = container.querySelector('[data-od-id="tour-services-stops"]')
    expect(stopsBox).toBeTruthy()
    expect(stopsBox?.textContent).toContain('Khách sạn 4 sao Seoul')

    // Operator notes
    const notesBox = container.querySelector('[data-od-id="tour-services-notes"]')
    expect(notesBox).toBeTruthy()
    expect(notesBox?.textContent).toContain('Thứ tự các điểm tham quan có thể thay đổi tùy tình hình thực tế.')
  })

  it('handles empty services gracefully without crashing or faking missing information', () => {
    const emptyTourData: TourResolvedData = {
      ...baseTourData,
      tour: {
        ...baseTourData.tour,
        includes: [],
        excludes: [],
        servicesSummary: null,
      },
    }

    const { container } = render(
      <TourDetailPage data={emptyTourData} locale="vi" siteCode="wingsgo" />,
    )

    const includedBox = container.querySelector('[data-od-id="tour-services-included"]')
    expect(includedBox?.textContent).toContain('Xác nhận khi tư vấn.')

    const excludedBox = container.querySelector('[data-od-id="tour-services-excluded"]')
    expect(excludedBox?.textContent).toContain('Xác nhận khi tư vấn.')

    // Notes block shouldn't render when empty
    const notesBox = container.querySelector('[data-od-id="tour-services-notes"]')
    expect(notesBox).toBeNull()
  })
})
