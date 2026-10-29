import { getCopyLocale, type CopyLocaleCode } from '@/utilities/locales'

export interface WingsGoCatalogCopy {
  contactPriceLabel: string

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
  priceMinPlaceholder: string
  filterPriceMax: string
  priceMaxPlaceholder: string

  // Results & status
  emptyFiltered: string
  loadMoreError: string
  retry: string
  loading: string
  loadMore: (count: number) => string
  allLoaded: string
}

export const WINGSGO_CATALOG_COPY: Record<CopyLocaleCode, WingsGoCatalogCopy> = {
  vi: {
    contactPriceLabel: 'Liên hệ để nhận giá mới nhất',

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
    priceMinPlaceholder: 'Ví dụ 10000000',
    filterPriceMax: 'Giá đến (VND)',
    priceMaxPlaceholder: 'Ví dụ 30000000',

    emptyFiltered: 'Không có tour phù hợp bộ lọc.',
    loadMoreError: 'Không tải thêm được catalog tour.',
    retry: 'Thử lại',
    loading: 'Đang tải…',
    loadMore: (count: number) => `Tải thêm ${count} tour`,
    allLoaded: 'Đã hiển thị hết tour phù hợp.',
  },
  en: {
    contactPriceLabel: 'Contact us for latest pricing',

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
    priceMinPlaceholder: 'e.g. 10000000',
    filterPriceMax: 'Price to (VND)',
    priceMaxPlaceholder: 'e.g. 30000000',

    emptyFiltered: 'No tours match your filters.',
    loadMoreError: 'Unable to load more tours.',
    retry: 'Retry',
    loading: 'Loading…',
    loadMore: (count: number) => `Load ${count} more tours`,
    allLoaded: 'All matching tours have been displayed.',
  },
}

export const getWingsGoCatalogCopy = (locale?: null | string): WingsGoCatalogCopy => {
  const copyLocale = getCopyLocale(locale)
  return WINGSGO_CATALOG_COPY[copyLocale]
}
