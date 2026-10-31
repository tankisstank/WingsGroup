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
  chartPeakLabel: string
  chartPeakMonthName: (month: string, year: string) => string
  chartPeakCount: (count: number) => string
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
  filterButton: string
  filterButtonAria: (count: number) => string
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
  clearSearch: string
  tourFallbackTitle: string

  // Phase 4
  assuranceKicker: string
  assuranceTitle: string
  assuranceLead: string
  assuranceContactCTA: string
  assuranceCallLabel: (phone: string) => string
  assuranceStep1Title: string
  assuranceStep1Desc: string
  assuranceStep2Title: string
  assuranceStep2Desc: string
  assuranceStep3Title: string
  assuranceStep3Desc: string
  contactForQuote: string
  moreDates: (count: number) => string
  departureCountLabel: (count: number) => string
  dateChipAria: (day: string, status: string) => string
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
    chartPeakLabel: 'Cao điểm:',
    chartPeakMonthName: (month, year) => `Tháng ${month}/${year}`,
    chartPeakCount: (count) => `với ${count} đợt`,
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

    filterButton: 'Bộ lọc',
    filterButtonAria: (count) =>
      count > 0 ? `Bộ lọc (${count} đang chọn)` : 'Mở bộ lọc',
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
    clearSearch: 'Xoá tìm kiếm',
    tourFallbackTitle: 'Tour WingsGo',

    assuranceKicker: 'Trước khi giữ chỗ',
    assuranceTitle: 'Lịch để chọn. Chỗ do người thật xác nhận.',
    assuranceLead:
      'Số chỗ và giá vé máy bay thay đổi theo ngày. Chuyên viên WingsGo kiểm tra lại từng đợt trước khi bạn đặt cọc.',
    assuranceContactCTA: 'Trao đổi với chuyên viên',
    assuranceCallLabel: (phone) => `Gọi ${phone}`,
    assuranceStep1Title: 'Chọn đợt khởi hành',
    assuranceStep1Desc: 'So sánh ngày đi, hãng bay và giá của cùng một hành trình.',
    assuranceStep2Title: 'Gửi yêu cầu',
    assuranceStep2Desc: 'Tên tour và ngày đi được gửi kèm tự động.',
    assuranceStep3Title: 'Xác nhận rồi mới đặt cọc',
    assuranceStep3Desc: 'Chuyên viên kiểm tra số chỗ, giá và điều kiện visa.',
    contactForQuote: 'Liên hệ báo giá',
    moreDates: (count) => `+${count} ngày khác`,
    departureCountLabel: (count) => `${count} đợt`,
    dateChipAria: (day, status) => `Khởi hành ${day} - ${status}`,
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
    chartPeakLabel: 'Peak:',
    chartPeakMonthName: (month, year) => `${month} ${year}`,
    chartPeakCount: (count) => `with ${count} ${count === 1 ? 'departure' : 'departures'}`,
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

    filterButton: 'Filters',
    filterButtonAria: (count) =>
      count > 0 ? `Filters (${count} active)` : 'Open filters',
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
    clearSearch: 'Clear search',
    tourFallbackTitle: 'WingsGo Tour',

    assuranceKicker: 'Before holding a seat',
    assuranceTitle: 'Schedules to choose. Seats confirmed by real experts.',
    assuranceLead:
      'Seat availability and flight fares change daily. WingsGo experts verify each departure before you make a deposit.',
    assuranceContactCTA: 'Talk to a specialist',
    assuranceCallLabel: (phone) => `Call ${phone}`,
    assuranceStep1Title: 'Choose departure date',
    assuranceStep1Desc: 'Compare departure dates, airlines and prices for the same itinerary.',
    assuranceStep2Title: 'Submit request',
    assuranceStep2Desc: 'Tour name and chosen date are sent automatically.',
    assuranceStep3Title: 'Confirmed before deposit',
    assuranceStep3Desc: 'Our travel experts verify seat availability, fares and visa requirements.',
    contactForQuote: 'Contact for quote',
    moreDates: (count) => `+${count} more dates`,
    departureCountLabel: (count) => (count === 1 ? '1 departure' : `${count} departures`),
    dateChipAria: (day, status) => `Departure ${day} - ${status}`,
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
