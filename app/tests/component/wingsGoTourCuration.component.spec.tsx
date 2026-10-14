import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const curationState = vi.hoisted(() => ({
  setValue: vi.fn(),
  value: [10, 20, 30] as Array<number | string | { id?: number | string | null }>,
}))

vi.mock('@payloadcms/ui', () => ({
  useField: () => ({
    errorMessage: undefined,
    setValue: curationState.setValue,
    showError: false,
    value: curationState.value,
  }),
  FieldLabel: ({ label }: { label: string }) => <label>{label}</label>,
  FieldError: () => null,
}))

import FeaturedToursCurationField from '@/components/WingsGoTourCuration/FeaturedToursCurationField'
import { LiveSimulatorPreview } from '@/components/WingsGoTourCuration/LiveSimulatorPreview'
import type { CuratedTourCardData } from '@/components/WingsGoTourCuration/types'

afterEach(() => {
  cleanup()
  curationState.setValue.mockClear()
  vi.unstubAllGlobals()
})

const mockTourCard = (id: number | string, overrides: Partial<CuratedTourCardData> = {}): CuratedTourCardData => ({
  id,
  slotNumber: 1,
  title: `Tour Du Lịch ${id}`,
  slug: `tour-du-lich-${id}`,
  market: 'korea',
  durationDays: 5,
  durationNights: 4,
  thumbnailUrl: `/media/tour-${id}.jpg`,
  priceFrom: 19990000,
  currency: 'VND',
  nextDepartureDate: '2026-11-20T00:00:00.000Z',
  promoLabel: 'GIẢM 2TR',
  isPublished: true,
  hasFutureDeparture: true,
  hasWrapperPage: true,
  ...overrides,
})

describe('FeaturedToursCurationField Component', () => {
  it('renders curation board and live simulator preview in split-screen layout', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes('tour-products')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            docs: [
              { id: 10, title: 'Tour Seoul 5N4D', slug: 'tour-seoul', market: 'korea', heroMedia: { url: '/seoul.jpg' }, _status: 'published' },
              { id: 20, title: 'Tour Tokyo 6N5D', slug: 'tour-tokyo', market: 'japan', heroMedia: { url: '/tokyo.jpg' }, _status: 'published' },
              { id: 30, title: 'Tour Bắc Kinh 5N4D', slug: 'tour-bac-kinh', market: 'china', heroMedia: { url: '/backinh.jpg' }, _status: 'published' },
            ],
          }),
        })
      }
      if (url.includes('tour-departures')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            docs: [
              { id: 101, tourProduct: 10, departureDate: '2026-12-01T00:00:00.000Z', priceFrom: 18990000, promoLabel: 'HOT' },
              { id: 102, tourProduct: 20, departureDate: '2026-12-05T00:00:00.000Z', priceFrom: 29990000, promoLabel: 'EARLY BIRD' },
              { id: 103, tourProduct: 30, departureDate: '2026-12-10T00:00:00.000Z', priceFrom: 15990000, promoLabel: 'ƯU ĐÃI' },
            ],
          }),
        })
      }
      return Promise.resolve({ ok: true, json: async () => ({ docs: [] }) })
    })

    vi.stubGlobal('fetch', fetchMock)
    render(<FeaturedToursCurationField path="wingsGoTourCatalog.featuredTours" />)

    expect(screen.getByTestId('wingsgo-curation-console')).toBeTruthy()
    expect(screen.getByTestId('live-simulator-panel')).toBeTruthy()

    await waitFor(() => {
      expect(screen.getAllByText('Tour Seoul 5N4D').length).toBeGreaterThanOrEqual(2)
      expect(screen.getAllByText('Tour Tokyo 6N5D').length).toBeGreaterThanOrEqual(2)
      expect(screen.getAllByText('Tour Bắc Kinh 5N4D').length).toBeGreaterThanOrEqual(2)
    })

    // Check slot badges
    expect(screen.getByText('#1')).toBeTruthy()
    expect(screen.getByText('#2')).toBeTruthy()
    expect(screen.getByText('#3')).toBeTruthy()

    // Test quick reorder with Down arrow on item 0 (Seoul)
    const downButtons = screen.getAllByTitle('Di chuyển xuống dưới')
    fireEvent.click(downButtons[0])
    expect(curationState.setValue).toHaveBeenCalledWith([20, 10, 30])

    // Test remove item (Bắc Kinh #30)
    const removeButtons = screen.getAllByTitle('Gỡ khỏi danh sách tour nổi bật')
    fireEvent.click(removeButtons[2])
    expect(curationState.setValue).toHaveBeenCalledWith([20, 10])
  })
})

describe('LiveSimulatorPreview Component', () => {
  it('renders simulated Hero block for top 3 tours and toggle between Desktop and Mobile', () => {
    const tours = [
      mockTourCard(1, { title: 'Tour Hàn Quốc Mùa Thu' }),
      mockTourCard(2, { title: 'Tour Nhật Bản Núi Phú Sĩ' }),
      mockTourCard(3, { title: 'Tour Thượng Hải Hàng Châu' }),
      mockTourCard(4, { title: 'Tour Thái Lan Bangkok Pattaya' }),
    ]

    render(<LiveSimulatorPreview tours={tours} />)

    // Check Hero titles
    expect(screen.getByText('Tour Hàn Quốc Mùa Thu')).toBeTruthy()
    expect(screen.getByText('Tour Nhật Bản Núi Phú Sĩ')).toBeTruthy()
    expect(screen.getByText('Tour Thượng Hải Hàng Châu')).toBeTruthy()

    // Check Catalog title
    expect(screen.getByText('Tour Thái Lan Bangkok Pattaya')).toBeTruthy()

    // Check device switcher
    const mobileBtn = screen.getByTitle('Xem giao diện Mobile điện thoại (375px)')
    fireEvent.click(mobileBtn)
    expect(mobileBtn.classList.contains('active')).toBe(true)

    const desktopBtn = screen.getByTitle('Xem giao diện Desktop màn hình rộng')
    fireEvent.click(desktopBtn)
    expect(desktopBtn.classList.contains('active')).toBe(true)
  })
})
