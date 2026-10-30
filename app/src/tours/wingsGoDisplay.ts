import { toBusinessCalendarDay } from './businessCalendar'

type DisplayLocale = 'en' | 'vi'

const DEPARTURE_CITY_CODES: Array<[RegExp, string]> = [
  [/^(ha ?noi|hanoi|hn)$/, 'HAN'],
  [/^(ho chi minh( city)?|tp\.? ?hcm|hcm|sai ?gon|saigon)$/, 'SGN'],
  [/^(da ?nang)$/, 'DAD'],
  [/^(hai ?phong)$/, 'HPH'],
]

const foldVietnamese = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim()

/** Airport code for well-known departure cities, otherwise the city as written. */
export const getDepartureCityCode = (city?: null | string): null | string => {
  const cities = (city || '')
    .split(/\s*[/,]\s*/)
    .map((part) => part.trim())
    .filter(Boolean)
  if (cities.length === 0) return null
  return cities
    .map((part) => {
      const folded = foldVietnamese(part)
      const match = DEPARTURE_CITY_CODES.find(([pattern]) => pattern.test(folded))
      return match ? match[1] : part
    })
    .join(' / ')
}

/** "6N5Đ" in Vietnamese, "6D5N" in English. */
export const getCompactDurationLabel = (
  days?: null | number,
  nights?: null | number,
  locale: DisplayLocale = 'vi',
): null | string => {
  if (!days) return null
  const nightCount = typeof nights === 'number' ? nights : null
  if (locale === 'en') return nightCount === null ? `${days}D` : `${days}D${nightCount}N`
  return nightCount === null ? `${days}N` : `${days}N${nightCount}Đ`
}

/** "23,9 triệu" / "VND 23.9M"; prices under one million fall back to full digits. */
export const formatShortTourPrice = (value: number, locale: DisplayLocale = 'vi'): string => {
  if (value < 1_000_000) {
    return locale === 'en'
      ? `VND ${new Intl.NumberFormat('en-US').format(value)}`
      : `${new Intl.NumberFormat('vi-VN').format(value)}đ`
  }
  const millions = new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'vi-VN', {
    maximumFractionDigits: 1,
  }).format(Math.round(value / 100_000) / 10)
  return locale === 'en' ? `VND ${millions}M` : `${millions} triệu`
}

const VI_WEEKDAYS = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7']
const EN_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const EN_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Day, month and weekday of a departure on the Vietnam business calendar. */
export const getDepartureStub = (
  value: unknown,
  locale: DisplayLocale = 'vi',
): { day: string; month: string; weekday: string } | null => {
  const businessDay = toBusinessCalendarDay(value)
  if (!businessDay) return null
  const [year, month, day] = businessDay.split('-').map(Number)
  const weekdayIndex = new Date(Date.UTC(year, month - 1, day)).getUTCDay()
  return {
    day: String(day).padStart(2, '0'),
    month: locale === 'en' ? EN_MONTHS[month - 1] : `Th${month}`,
    weekday: (locale === 'en' ? EN_WEEKDAYS : VI_WEEKDAYS)[weekdayIndex],
  }
}

/** "dd/mm" of a departure on the Vietnam business calendar. */
export const getShortDepartureDate = (value: unknown): null | string => {
  const businessDay = toBusinessCalendarDay(value)
  if (!businessDay) return null
  const [, month, day] = businessDay.split('-')
  return `${day}/${month}`
}

const isUpperCaseText = (value: string) =>
  value === value.toLocaleUpperCase('vi') && value !== value.toLocaleLowerCase('vi')

const toTitleCaseWord = (word: string) => {
  // Keep short ASCII acronyms such as VNA or VJ.
  if (/^[A-Z0-9]{2,3}$/.test(word)) return word
  const lower = word.toLocaleLowerCase('vi')
  return lower.charAt(0).toLocaleUpperCase('vi') + lower.slice(1)
}

/**
 * Route-style title for compact surfaces: drops the departure city that every
 * WingsGo tour starts with, joins stops with " · " and softens ALL-CAPS titles.
 */
export const getTourRouteTitle = (title: string, departureCity?: null | string): string => {
  const segments = title
    .split(/\s+[–—-]\s+/)
    .map((segment) => segment.trim())
    .filter(Boolean)
  const origins = new Set(
    ['ha noi', ...(departureCity || '').split(/\s*[/,]\s*/)].map(foldVietnamese).filter(Boolean),
  )
  if (segments.length > 1 && origins.has(foldVietnamese(segments[0]))) {
    segments.shift()
  }
  const route = segments.join(' · ')
  if (!isUpperCaseText(route)) return route
  return route
    .split(' ')
    .map((word) => (word === '·' ? word : toTitleCaseWord(word)))
    .join(' ')
}
