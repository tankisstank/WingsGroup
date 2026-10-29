import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const replace = vi.fn()

vi.mock('next/navigation', () => ({
  usePathname: () => '/tour',
  useRouter: () => ({ replace }),
}))

import { WingsGoMarketTiles } from '@/tours/WingsGoMarketTiles'
import type { WingsGoCatalogMarketSummary } from '@/tours/wingsGoCatalog'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const sampleMarkets: WingsGoCatalogMarketSummary[] = [
  {
    count: 12,
    image: {
      alt: 'Tokyo Japan',
      url: 'https://images.unsplash.com/japan.jpg',
    },
    lowestPrice: {
      currency: 'VND',
      kind: 'verified',
      originalPrice: 19900000,
      value: 17900000,
    },
    market: 'japan',
  },
  {
    count: 1,
    image: null,
    lowestPrice: null,
    market: 'korea',
  },
  {
    count: 5,
    image: null,
    lowestPrice: {
      currency: 'VND',
      kind: 'verified',
      value: 9900000,
    },
    market: 'thailand',
  },
]

describe('US-092 Phase 4: WingsGoMarketTiles', () => {
  let originalScrollTo: typeof window.scrollTo
  let scrollToMock: ReturnType<typeof vi.fn>
  let scrollIntoViewMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    originalScrollTo = window.scrollTo
    scrollToMock = vi.fn()
    window.scrollTo = scrollToMock as never

    scrollIntoViewMock = vi.fn()
    window.HTMLElement.prototype.scrollIntoView = scrollIntoViewMock as never

    // Reset window.location.search
    window.history.pushState({}, '', '/tour')
  })

  afterEach(() => {
    window.scrollTo = originalScrollTo
  })

  it('renders nothing when markets is empty or null', () => {
    const { container: emptyContainer } = render(
      <WingsGoMarketTiles locale="vi" markets={[]} />,
    )
    expect(emptyContainer.firstElementChild).toBeNull()

    const { container: nullContainer } = render(
      <WingsGoMarketTiles locale="vi" markets={undefined} />,
    )
    expect(nullContainer.firstElementChild).toBeNull()
  })

  it('renders market tiles with localized labels, counts, and prices in VI', () => {
    render(<WingsGoMarketTiles locale="vi" markets={sampleMarkets} selectedMarket="japan" />)

    // Heading & kicker
    expect(screen.getByText('Điểm đến phổ biến')).toBeTruthy()
    expect(screen.getByRole('heading', { level: 2, name: 'Khám phá theo thị trường' })).toBeTruthy()

    // Market labels
    expect(screen.getByRole('button', { name: /Nhật Bản/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Hàn Quốc/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Thái Lan/ })).toBeTruthy()

    // Tour counts in VI
    expect(screen.getByText('12 tour')).toBeTruthy()
    expect(screen.getByText('1 tour')).toBeTruthy()
    expect(screen.getByText('5 tour')).toBeTruthy()

    // Verified price and contact price
    expect(screen.getByText('17.900.000 ₫')).toBeTruthy()
    expect(screen.getByText('Liên hệ để nhận giá mới nhất')).toBeTruthy()

    // aria-pressed state
    const japanBtn = screen.getByRole('button', { name: /Nhật Bản/ })
    const koreaBtn = screen.getByRole('button', { name: /Hàn Quốc/ })
    expect(japanBtn.getAttribute('aria-pressed')).toBe('true')
    expect(koreaBtn.getAttribute('aria-pressed')).toBe('false')
  })

  it('renders market tiles in EN without Vietnamese text and with correct singular/plural counts', () => {
    const VIETNAMESE_CHAR_REGEX =
      /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i

    const { container } = render(
      <WingsGoMarketTiles locale="en" markets={sampleMarkets} selectedMarket="korea" />,
    )

    // Heading & kicker in EN
    expect(screen.getByText('Popular destinations')).toBeTruthy()
    expect(screen.getByRole('heading', { level: 2, name: 'Explore by market' })).toBeTruthy()

    // Market labels in EN
    expect(screen.getByRole('button', { name: /Japan/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /South Korea/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Thailand/ })).toBeTruthy()

    // Tour counts in EN: singular "1 tour", plural "12 tours", "5 tours"
    expect(screen.getByText('12 tours')).toBeTruthy()
    expect(screen.getByText('1 tour')).toBeTruthy()
    expect(screen.getByText('5 tours')).toBeTruthy()

    // Contact price in EN
    expect(screen.getByText('Contact us for latest pricing')).toBeTruthy()

    // No Vietnamese characters
    const textElements = container.querySelectorAll('h2, h3, p, span, button')
    for (const el of textElements) {
      expect(el.textContent || '').not.toMatch(VIETNAMESE_CHAR_REGEX)
    }
  })

  it('renders image when present and fallback gradient tile when image is null (no broken images)', () => {
    const { container } = render(
      <WingsGoMarketTiles locale="vi" markets={sampleMarkets} />,
    )

    // Japan has image
    const img = container.querySelector('img')
    expect(img).toBeTruthy()
    expect(img?.getAttribute('src')).toBe('https://images.unsplash.com/japan.jpg')
    expect(img?.getAttribute('alt')).toBe('Tokyo Japan')

    // Korea and Thailand have no image -> SVG fallback icon rendered
    const svgs = container.querySelectorAll('svg')
    expect(svgs.length).toBeGreaterThanOrEqual(2)
  })

  it('click builds URL: sets market, preserves other active filters, drops offset and cursor, and scrolls to #wingsgo-all-tours', () => {
    // Setup initial URL with existing filters and pagination
    window.history.pushState({}, '', '/tour?season=autumn&offset=12&cursor=dummyCursor')

    // Create target anchor in DOM
    const allToursSection = document.createElement('div')
    allToursSection.id = 'wingsgo-all-tours'
    document.body.appendChild(allToursSection)

    try {
      render(<WingsGoMarketTiles locale="vi" markets={sampleMarkets} />)

      const japanBtn = screen.getByRole('button', { name: /Nhật Bản/ })
      fireEvent.click(japanBtn)

      // router.replace must receive URL with market=japan, season=autumn, no offset or cursor
      expect(replace).toHaveBeenCalledTimes(1)
      const replacedUrl = replace.mock.calls[0][0] as string
      expect(replacedUrl).toContain('market=japan')
      expect(replacedUrl).toContain('season=autumn')
      expect(replacedUrl).not.toContain('offset')
      expect(replacedUrl).not.toContain('cursor')

      // router.replace must be called with { scroll: false }
      expect(replace.mock.calls[0][1]).toEqual({ scroll: false })

      // window.scrollTo must be called, and scrollIntoView must NEVER be called
      expect(scrollToMock).toHaveBeenCalled()
      expect(scrollIntoViewMock).not.toHaveBeenCalled()
    } finally {
      document.body.removeChild(allToursSection)
    }
  })

  it('clicking the active tile toggles off and clears market from URL', () => {
    window.history.pushState({}, '', '/tour?market=japan&season=spring')

    render(
      <WingsGoMarketTiles locale="vi" markets={sampleMarkets} selectedMarket="japan" />,
    )

    const japanBtn = screen.getByRole('button', { name: /Nhật Bản/ })
    fireEvent.click(japanBtn)

    expect(replace).toHaveBeenCalledTimes(1)
    const replacedUrl = replace.mock.calls[0][0] as string
    expect(replacedUrl).not.toContain('market=')
    expect(replacedUrl).toContain('season=spring')
  })

  it('respects prefers-reduced-motion: reduce when scrolling to target', () => {
    const allToursSection = document.createElement('div')
    allToursSection.id = 'wingsgo-all-tours'
    document.body.appendChild(allToursSection)

    const originalMatchMedia = window.matchMedia
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('prefers-reduced-motion: reduce'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }))

    try {
      render(<WingsGoMarketTiles locale="vi" markets={sampleMarkets} />)

      const thailandBtn = screen.getByRole('button', { name: /Thái Lan/ })
      fireEvent.click(thailandBtn)

      expect(scrollToMock).toHaveBeenCalledWith(
        expect.objectContaining({
          behavior: 'auto',
        }),
      )
    } finally {
      window.matchMedia = originalMatchMedia
      document.body.removeChild(allToursSection)
    }
  })
})
