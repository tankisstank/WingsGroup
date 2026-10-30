import { getCopyLocale, type CopyLocaleCode } from '@/utilities/locales'

export interface WingsGoScheduleCopy {
  // Hero
  heroKicker: string
  heroTitle: (yearRange: string) => string
  heroDescription: (city: string | null) => string
  heroStatDepartures: string
  heroStatTours: string
  heroStatPriced: string
  heroStatNearest: string
  heroVerifiedLabel: (day: string) => string
  heroPeakMonth: (month: string) => string

  // Month Chart
  chartHeading: string
  chartAriaLabel: string
  chartMonthAria: (month: string, year: string, count: number) => string
  chartPeakMonth: (month: string, year: string, count: number) => string
  chartNoData: string

  // Market Cards
  marketSectionKicker: string
  marketSectionTitle: string
  marketCardDeparting: (date: string) => string
  marketCardHotBadge: string
  marketCardNoPrice: string
  marketCardContactForPrice: string
  marketCardDepartureCount: (count: number) => string
  marketCardToursCount: (count: number) => string
  imageComingSoon: (title: string) => string
  imageComingSoonFallback: string

  // Availability
  statusOpen: string
  statusLimited: string
  statusSoldOut: string
  statusQuote: string

  // Filter labels
  filterStatusQuote: string
  filterStatusSoldOut: string
  filterStatusLimited: string
  filterStatusOpen: string

  // Market labels (schedule-specific; "other" differs from /tour)
  marketOther: string

  // CTA
  ctaHoldSeat: string
  ctaRequestQuote: string
  ctaInquiry: string
  ctaViewTour: string

  // Misc
  daysUntilDeparture: (days: number) => string
  returnDay: (day: string) => string
  departureCount: (count: number) => string
  tourCount: (count: number) => string
  priceFrom: string
  noPrice: string
  searchPlaceholder: string
  searchAriaLabel: string
  airlineFilterAria: string
  airlineAll: string
  statusFilterAria: string
  statusAll: string
  sortFilterAria: string
  sortNearest: string
  sortLowestPrice: string
  viewModeAria: string
  marketAll: string
  resultCounts: (departures: number, tours: number) => string
  clearFilterAria: (label: string) => string
  clearAllFilters: string
  monthGroupTitle: (month: string, year: string) => string
  showMore: (count: number) => string
  showLess: string
  hotTourBadge: string
  viewTourAction: string
  returnsOn: (date: string) => string
  emptyFilteredTitle: string
  emptyFilteredDesc: string
  emptyRemoveFilter: (name: string, count: number) => string
  emptyContactExpert: string
  sortDate: string
  sortPrice: string
  viewDate: string
  viewTour: string
  emptyTitle: string
  emptyDescription: string
}

export const WINGSGO_SCHEDULE_COPY: Record<CopyLocaleCode, WingsGoScheduleCopy> = {
  vi: {
    heroKicker: 'Lịch khởi hành',
    heroTitle: (yearRange) => `Lịch khởi hành ${yearRange}`,
    heroDescription: (city) =>
      city
        ? `Lịch khởi hành tour WingsGo từ ${city}, giá minh bạch và cập nhật liên tục.`
        : 'Lịch khởi hành tour WingsGo, giá minh bạch và cập nhật liên tục.',
    heroStatDepartures: 'đợt mở bán',
    heroStatTours: 'hành trình',
    heroStatPriced: 'đợt có giá',
    heroStatNearest: 'Đợt gần nhất',
    heroVerifiedLabel: (day) => `Cập nhật ${day}`,
    heroPeakMonth: (month) => `Cao điểm: ${month}`,

    chartHeading: 'Số đợt theo tháng',
    chartAriaLabel: 'Lọc theo tháng khởi hành',
    chartMonthAria: (month, year, count) => `Tháng ${month}/${year}: ${count} đợt`,
    chartPeakMonth: (month, year, count) =>
      `Cao điểm: Tháng ${month}/${year} (${count} đợt)`,
    chartNoData: 'Không có đợt khớp bộ lọc',

    marketSectionKicker: 'Thị trường chủ lực',
    marketSectionTitle: 'Đợt nổi bật theo thị trường',
    marketCardDeparting: (date) => `Khởi hành ${date}`,
    marketCardHotBadge: 'Tour hot',
    marketCardNoPrice: 'Chưa có giá',
    marketCardContactForPrice: 'Liên hệ để nhận lịch và giá',
    marketCardDepartureCount: (count) => `${count} đợt`,
    marketCardToursCount: (count) => `${count} hành trình`,
    imageComingSoon: (title) => `Ảnh đang cập nhật cho ${title}`,
    imageComingSoonFallback: 'Ảnh tour đang cập nhật',

    statusOpen: 'Mở bán',
    statusLimited: 'Sắp hết chỗ',
    statusSoldOut: 'Đã kín',
    statusQuote: 'Liên hệ báo giá',

    filterStatusQuote: 'Chờ báo giá',
    filterStatusSoldOut: 'Đã kín',
    filterStatusLimited: 'Sắp hết chỗ',
    filterStatusOpen: 'Mở bán',

    marketOther: 'Thị trường khác',

    ctaHoldSeat: 'Giữ chỗ',
    ctaRequestQuote: 'Hỏi giá',
    ctaInquiry: 'Liên hệ',
    ctaViewTour: 'Xem tour',

    daysUntilDeparture: (days) =>
      days === 0 ? 'Khởi hành hôm nay' : `Còn ${days} ngày`,
    returnDay: (day) => `Về ${day}`,
    departureCount: (count) => `${count} đợt`,
    tourCount: (count) => `${count} hành trình`,
    priceFrom: 'Giá từ',
    noPrice: 'Liên hệ',
    searchPlaceholder: 'Tìm tour, thị trường, hãng bay…',
    searchAriaLabel: 'Tìm theo tên hành trình',
    airlineFilterAria: 'Hãng bay',
    airlineAll: 'Tất cả hãng bay',
    statusFilterAria: 'Tình trạng',
    statusAll: 'Mọi tình trạng',
    sortFilterAria: 'Sắp xếp',
    sortNearest: 'Ngày gần nhất',
    sortLowestPrice: 'Giá thấp nhất',
    viewModeAria: 'Cách hiển thị',
    marketAll: 'Tất cả',
    resultCounts: (departures, tours) =>
      `${departures} đợt khởi hành • ${tours} hành trình`,
    clearFilterAria: (label) => `Bỏ lọc ${label}`,
    clearAllFilters: 'Xoá tất cả',
    monthGroupTitle: (month, year) => `Tháng ${month}/${year}`,
    showMore: (count) => `Xem thêm ${count} đợt`,
    showLess: 'Thu gọn',
    hotTourBadge: 'Tour hot',
    viewTourAction: 'Xem tour',
    returnsOn: (date) => `Về ${date}`,
    emptyFilteredTitle: 'Không có đợt khởi hành phù hợp',
    emptyFilteredDesc:
      'Thử bỏ bớt một số bộ lọc bên dưới hoặc liên hệ để được tư vấn lịch riêng.',
    emptyRemoveFilter: (name, count) => `Bỏ lọc ${name} (${count} đợt)`,
    emptyContactExpert: 'Nhận tư vấn từ chuyên viên',
    sortDate: 'Theo ngày',
    sortPrice: 'Theo giá',
    viewDate: 'Theo ngày',
    viewTour: 'Theo hành trình',
    emptyTitle: 'Chưa có đợt khởi hành',
    emptyDescription: 'Hiện chưa có đợt khởi hành nào trong tương lai. Vui lòng quay lại sau.',
  },
  en: {
    heroKicker: 'Departure schedule',
    heroTitle: (yearRange) => `Departure Schedule ${yearRange}`,
    heroDescription: (city) =>
      city
        ? `WingsGo departure schedule from ${city}, with transparent pricing and regular updates.`
        : 'WingsGo departure schedule, with transparent pricing and regular updates.',
    heroStatDepartures: 'open departures',
    heroStatTours: 'itineraries',
    heroStatPriced: 'priced departures',
    heroStatNearest: 'Nearest departure',
    heroVerifiedLabel: (day) => `Updated ${day}`,
    heroPeakMonth: (month) => `Peak: ${month}`,

    chartHeading: 'Departures by month',
    chartAriaLabel: 'Filter by departure month',
    chartMonthAria: (month, year, count) =>
      `${month} ${year}: ${count} ${count === 1 ? 'departure' : 'departures'}`,
    chartPeakMonth: (month, year, count) =>
      `Peak: ${month} ${year} (${count} ${count === 1 ? 'departure' : 'departures'})`,
    chartNoData: 'No departures match filters',

    marketSectionKicker: 'Key destinations',
    marketSectionTitle: 'Featured departures by market',
    marketCardDeparting: (date) => `Departing ${date}`,
    marketCardHotBadge: 'Hot tour',
    marketCardNoPrice: 'Price on request',
    marketCardContactForPrice: 'Contact us for schedule and pricing',
    marketCardDepartureCount: (count) =>
      count === 1 ? '1 departure' : `${count} departures`,
    marketCardToursCount: (count) =>
      count === 1 ? '1 itinerary' : `${count} itineraries`,
    imageComingSoon: (title) => `Image coming soon for ${title}`,
    imageComingSoonFallback: 'Tour image coming soon',

    statusOpen: 'Open',
    statusLimited: 'Few seats left',
    statusSoldOut: 'Sold out',
    statusQuote: 'Request a quote',

    filterStatusQuote: 'Quote',
    filterStatusSoldOut: 'Sold out',
    filterStatusLimited: 'Few seats left',
    filterStatusOpen: 'Open',

    marketOther: 'Other destinations',

    ctaHoldSeat: 'Hold seat',
    ctaRequestQuote: 'Ask for price',
    ctaInquiry: 'Contact us',
    ctaViewTour: 'View tour',

    daysUntilDeparture: (days) =>
      days === 0 ? 'Departs today' : days === 1 ? 'In 1 day' : `In ${days} days`,
    returnDay: (day) => `Returns ${day}`,
    departureCount: (count) => (count === 1 ? '1 departure' : `${count} departures`),
    tourCount: (count) => (count === 1 ? '1 itinerary' : `${count} itineraries`),
    priceFrom: 'From',
    noPrice: 'Contact us',
    searchPlaceholder: 'Search tours, markets, airlines…',
    searchAriaLabel: 'Search by itinerary name',
    airlineFilterAria: 'Airline',
    airlineAll: 'All airlines',
    statusFilterAria: 'Availability',
    statusAll: 'All availability',
    sortFilterAria: 'Sort by',
    sortNearest: 'Nearest date',
    sortLowestPrice: 'Lowest price',
    viewModeAria: 'View mode',
    marketAll: 'All',
    resultCounts: (departures, tours) =>
      `${departures} ${departures === 1 ? 'departure' : 'departures'} • ${tours} ${tours === 1 ? 'itinerary' : 'itineraries'}`,
    clearFilterAria: (label) => `Remove ${label} filter`,
    clearAllFilters: 'Clear all',
    monthGroupTitle: (month, year) => `${month} ${year}`,
    showMore: (count) => `Show ${count} more ${count === 1 ? 'departure' : 'departures'}`,
    showLess: 'Show less',
    hotTourBadge: 'Hot tour',
    viewTourAction: 'View tour',
    returnsOn: (date) => `Returns ${date}`,
    emptyFilteredTitle: 'No departures match your filters',
    emptyFilteredDesc:
      'Try removing some filters below or contact us for a custom itinerary.',
    emptyRemoveFilter: (name, count) =>
      `Remove ${name} (${count} ${count === 1 ? 'departure' : 'departures'})`,
    emptyContactExpert: 'Talk to a travel expert',
    sortDate: 'By date',
    sortPrice: 'By price',
    viewDate: 'By date',
    viewTour: 'By itinerary',
    emptyTitle: 'No upcoming departures',
    emptyDescription: 'There are no future departures at this time. Please check back later.',
  },
}

export const resolveScheduleCopyLocale = (locale?: null | string): CopyLocaleCode => {
  if (!locale) return 'vi'
  return getCopyLocale(locale)
}

export const getWingsGoScheduleCopy = (locale?: null | string): WingsGoScheduleCopy => {
  const copyLocale = resolveScheduleCopyLocale(locale)
  return WINGSGO_SCHEDULE_COPY[copyLocale]
}
