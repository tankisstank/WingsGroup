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
