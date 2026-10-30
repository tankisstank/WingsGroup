import { getCopyLocale, type CopyLocaleCode } from '@/utilities/locales'

export interface WingsGoCatalogCopy {
  contactPriceLabel: string
  contactPriceShortLabel: string

  // Hero section
  heroKicker: string
  heroTitle: string
  heroTitleParts: [string, string, string]
  heroSubtitle: string
  heroTrendingTitle: string
  heroViewTour: string
  heroNextDeparture: string
  heroPriceFrom: string
  daysUntilDepartureBadge: (days: number) => string
  heroDeparturePrefix: string
  heroProofMarkets: (count: number) => string
  heroProofTours: (count: number) => string
  heroProofToursNote: string

  // Quick search
  quickSearchTitle: string
  quickSearchMarketLabel: string
  quickSearchMarketAll: string
  quickSearchMonthLabel: string
  quickSearchMonthAll: string
  quickSearchSeasonLabel: string
  quickSearchSeasonAll: string
  quickSearchSubmit: string

  // Season names
  seasonSpring: string
  seasonSummer: string
  seasonAutumn: string
  seasonWinter: string

  // Upcoming strip section
  upcomingKicker: string
  upcomingTitle: string
  upcomingTitleParts: [string, string, string]
  upcomingDescription: string
  upcomingPrev: string
  upcomingNext: string
  upcomingBoardLabel: string

  // Market tiles section
  marketTilesKicker: string
  marketTilesTitle: string
  marketTilesDescription: string
  marketToursCount: (count: number) => string
  marketAllLabel: string
  marketLowestPriceFrom: string

  // Featured section
  featuredKicker: string
  featuredTitle: string
  featuredDescription: string
  featuredEmpty: string

  // Catalog section
  catalogKicker: string
  catalogTitle: string
  filtersAriaLabel: string

  // Filters
  filterMarket: string
  allMarkets: string
  marketKorea: string
  marketJapan: string
  marketChina: string

  filterSort: string
  sortNextDeparture: string
  sortPrice: string
  sortTitle: string

  filterDurationMin: string
  durationMinPlaceholder: string
  filterDurationMax: string
  durationMaxPlaceholder: string

  filterPriceMin: string
  filterPriceRange: string
  filterDurationRange: string
  priceMinPlaceholder: string
  filterPriceMax: string
  priceMaxPlaceholder: string

  // Results & status
  emptyFiltered: string
  emptyBudgetExplanation: string
  clearFilters: string
  clearAllFilters: string
  removeBudgetFilter: string
  activeFiltersAriaLabel: string
  allSeasons: string
  removeFilterLabel: (filterName: string) => string
  loadMoreError: string
  retry: string
  loading: string
  loadMore: (count: number) => string
  allLoaded: string
}

export const WINGSGO_CATALOG_COPY: Record<CopyLocaleCode, WingsGoCatalogCopy> = {
  vi: {
    contactPriceLabel: 'Liên hệ để nhận giá mới nhất',
    contactPriceShortLabel: 'Liên hệ nhận giá',

    heroKicker: 'WingsGo Tours',
    heroTitle: 'Khám phá thế giới cùng WingsGo',
    heroTitleParts: ['Khám phá ', 'thế giới', ' cùng WingsGo'],
    heroSubtitle:
      'Tour chọn lọc chất lượng cao, lịch khởi hành rõ ràng, trải nghiệm trọn vẹn và giá minh bạch.',
    heroTrendingTitle: 'Tour đang được quan tâm',
    heroViewTour: 'Xem tour',
    heroNextDeparture: 'Khởi hành gần nhất',
    heroPriceFrom: 'Giá từ',
    daysUntilDepartureBadge: (days: number) =>
      days === 0 ? 'Khởi hành hôm nay' : `Khởi hành sau ${days} ngày`,
    heroDeparturePrefix: 'Khởi hành',
    heroProofMarkets: (count: number) => `${count} thị trường`,
    heroProofTours: (count: number) => `${count} hành trình`,
    heroProofToursNote: 'đang mở bán',

    quickSearchTitle: 'Tìm kiếm tour nhanh',
    quickSearchMarketLabel: 'Điểm đến',
    quickSearchMarketAll: 'Tất cả điểm đến',
    quickSearchMonthLabel: 'Tháng khởi hành',
    quickSearchMonthAll: 'Tất cả các tháng',
    quickSearchSeasonLabel: 'Mùa',
    quickSearchSeasonAll: 'Tất cả các mùa',
    quickSearchSubmit: 'Tìm tour',

    seasonSpring: 'Mùa xuân (T3 - T5)',
    seasonSummer: 'Mùa hạ (T6 - T8)',
    seasonAutumn: 'Mùa thu (T9 - T11)',
    seasonWinter: 'Mùa đông (T12 - T2)',

    upcomingKicker: 'Lịch khởi hành gần nhất',
    upcomingTitle: 'Sắp cất cánh',
    upcomingTitleParts: ['Sắp ', 'cất cánh', '.'],
    upcomingPrev: 'Xem đoàn trước',
    upcomingNext: 'Xem đoàn tiếp theo',
    upcomingBoardLabel: 'Các đoàn sắp khởi hành, cuộn ngang',
    upcomingDescription:
      'Những chuyến đi có ngày khởi hành gần nhất, giá minh bạch và sẵn sàng cất cánh.',

    marketTilesKicker: 'Điểm đến phổ biến',
    marketTilesTitle: 'Khám phá theo thị trường',
    marketTilesDescription:
      'Xem số tour và giá thấp nhất đang mở bán ở từng điểm đến.',
    marketToursCount: (count: number) => `${count} tour`,
    marketAllLabel: 'Tất cả thị trường',
    marketLowestPriceFrom: 'Giá từ',

    featuredKicker: 'Gợi ý chọn nhanh',
    featuredTitle: 'Tour nổi bật',
    featuredDescription:
      'Những line tour được biên tập theo thứ tự ưu tiên; nếu chưa đủ sáu, hệ thống tự bổ sung tour đủ điều kiện mà không thay đổi lựa chọn trong CMS.',
    featuredEmpty: 'Hiện chưa có tour đủ điều kiện hiển thị.',

    catalogKicker: 'Catalog WingsGo',
    catalogTitle: 'Tất cả tour',
    filtersAriaLabel: 'Bộ lọc catalog tour',

    filterMarket: 'Thị trường',
    allMarkets: 'Tất cả',
    marketKorea: 'Hàn Quốc',
    marketJapan: 'Nhật Bản',
    marketChina: 'Trung Quốc',

    filterSort: 'Sắp xếp',
    sortNextDeparture: 'Ngày đi gần nhất',
    sortPrice: 'Giá thấp đến cao',
    sortTitle: 'Tên tour',

    filterDurationMin: 'Số ngày tối thiểu',
    durationMinPlaceholder: 'Ví dụ 3',
    filterDurationMax: 'Số ngày tối đa',
    durationMaxPlaceholder: 'Ví dụ 6',

    filterPriceMin: 'Giá từ (VND)',
    filterPriceRange: 'Ngân sách',
    filterDurationRange: 'Số ngày',
    priceMinPlaceholder: 'Ví dụ 10000000',
    filterPriceMax: 'Giá đến (VND)',
    priceMaxPlaceholder: 'Ví dụ 30000000',

    emptyFiltered: 'Không có tour phù hợp bộ lọc.',
    emptyBudgetExplanation:
      'Các tour có giá "Liên hệ" không tham gia vào bộ lọc ngân sách.',
    clearFilters: 'Xóa bộ lọc',
    clearAllFilters: 'Xóa tất cả bộ lọc',
    removeBudgetFilter: 'Bỏ lọc ngân sách',
    activeFiltersAriaLabel: 'Các bộ lọc đang áp dụng',
    allSeasons: 'Tất cả các mùa',
    removeFilterLabel: (filterName: string) => `Xóa bộ lọc: ${filterName}`,
    loadMoreError: 'Không tải thêm được catalog tour.',
    retry: 'Thử lại',
    loading: 'Đang tải…',
    loadMore: (count: number) => `Tải thêm ${count} tour`,
    allLoaded: 'Đã hiển thị hết tour phù hợp.',
  },
  en: {
    contactPriceLabel: 'Contact us for latest pricing',
    contactPriceShortLabel: 'Ask for price',

    heroKicker: 'WingsGo Tours',
    heroTitle: 'Explore the World with WingsGo',
    heroTitleParts: ['Explore ', 'the World', ' with WingsGo'],
    heroSubtitle:
      'Curated premium tours, reliable departure dates, seamless journeys, and transparent pricing.',
    heroTrendingTitle: 'Trending tours',
    heroViewTour: 'View tour',
    heroNextDeparture: 'Next departure',
    heroPriceFrom: 'From',
    daysUntilDepartureBadge: (days: number) =>
      days === 0 ? 'Departs today' : days === 1 ? 'Departs in 1 day' : `Departs in ${days} days`,
    heroDeparturePrefix: 'Departs',
    heroProofMarkets: (count: number) => (count === 1 ? '1 market' : `${count} markets`),
    heroProofTours: (count: number) => (count === 1 ? '1 itinerary' : `${count} itineraries`),
    heroProofToursNote: 'open for booking',

    quickSearchTitle: 'Quick tour search',
    quickSearchMarketLabel: 'Destination',
    quickSearchMarketAll: 'All destinations',
    quickSearchMonthLabel: 'Departure month',
    quickSearchMonthAll: 'All months',
    quickSearchSeasonLabel: 'Season',
    quickSearchSeasonAll: 'All seasons',
    quickSearchSubmit: 'Search tours',

    seasonSpring: 'Spring (Mar - May)',
    seasonSummer: 'Summer (Jun - Aug)',
    seasonAutumn: 'Autumn (Sep - Nov)',
    seasonWinter: 'Winter (Dec - Feb)',

    upcomingKicker: 'Next departures',
    upcomingTitle: 'Departing soon',
    upcomingTitleParts: ['Departing ', 'soon', '.'],
    upcomingPrev: 'Previous departures',
    upcomingNext: 'Next departures',
    upcomingBoardLabel: 'Upcoming departures, scroll horizontally',
    upcomingDescription:
      'Tours with nearest departure dates, transparent pricing, and ready to take off.',

    marketTilesKicker: 'Popular destinations',
    marketTilesTitle: 'Explore by market',
    marketTilesDescription:
      'See how many tours and the lowest open price for each destination.',
    marketToursCount: (count: number) => (count === 1 ? '1 tour' : `${count} tours`),
    marketAllLabel: 'All markets',
    marketLowestPriceFrom: 'From',

    featuredKicker: 'Quick picks',
    featuredTitle: 'Featured tours',
    featuredDescription:
      'Curated tour routes prioritized by editors; if fewer than six are selected, the system fills remaining slots with eligible tours without altering CMS settings.',
    featuredEmpty: 'No eligible tours to display right now.',

    catalogKicker: 'WingsGo catalog',
    catalogTitle: 'All tours',
    filtersAriaLabel: 'Tour catalog filters',

    filterMarket: 'Market',
    allMarkets: 'All',
    marketKorea: 'South Korea',
    marketJapan: 'Japan',
    marketChina: 'China',

    filterSort: 'Sort by',
    sortNextDeparture: 'Earliest departure',
    sortPrice: 'Price: low to high',
    sortTitle: 'Tour name',

    filterDurationMin: 'Min duration (days)',
    durationMinPlaceholder: 'e.g. 3',
    filterDurationMax: 'Max duration (days)',
    durationMaxPlaceholder: 'e.g. 6',

    filterPriceMin: 'Price from (VND)',
    filterPriceRange: 'Budget',
    filterDurationRange: 'Duration',
    priceMinPlaceholder: 'e.g. 10000000',
    filterPriceMax: 'Price to (VND)',
    priceMaxPlaceholder: 'e.g. 30000000',

    emptyFiltered: 'No tours match your filters.',
    emptyBudgetExplanation:
      'Tours with contact pricing are excluded from budget filtering.',
    clearFilters: 'Clear filters',
    clearAllFilters: 'Clear all filters',
    removeBudgetFilter: 'Remove budget filter',
    activeFiltersAriaLabel: 'Active filters',
    allSeasons: 'All seasons',
    removeFilterLabel: (filterName: string) => `Remove filter: ${filterName}`,
    loadMoreError: 'Unable to load more tours.',
    retry: 'Retry',
    loading: 'Loading…',
    loadMore: (count: number) => `Load ${count} more tours`,
    allLoaded: 'All matching tours have been displayed.',
  },
}

export const resolveWingsGoCopyLocale = (locale?: null | string): CopyLocaleCode => {
  if (!locale) return 'vi'
  return getCopyLocale(locale)
}

export const getWingsGoCatalogCopy = (locale?: null | string): WingsGoCatalogCopy => {
  const copyLocale = resolveWingsGoCopyLocale(locale)
  return WINGSGO_CATALOG_COPY[copyLocale]
}

// Lives outside the client form so server components get the real object.
export const WINGSGO_MARKET_LABELS: Record<string, { en: string; vi: string }> = {
  cambodia: { en: 'Cambodia', vi: 'Campuchia' },
  china: { en: 'China', vi: 'Trung Quốc' },
  indochina: { en: 'Indochina', vi: 'Đông Dương' },
  japan: { en: 'Japan', vi: 'Nhật Bản' },
  korea: { en: 'South Korea', vi: 'Hàn Quốc' },
  laos: { en: 'Laos', vi: 'Lào' },
  myanmar: { en: 'Myanmar', vi: 'Myanmar' },
  other: { en: 'Other destinations', vi: 'Tuyến khác' },
  thailand: { en: 'Thailand', vi: 'Thái Lan' },
  vietnam: { en: 'Vietnam', vi: 'Việt Nam' },
}
