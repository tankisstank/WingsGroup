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

/** Human-friendly city name in Vietnamese or English for well-known airport codes. */
export const formatDepartureCityName = (
  code?: null | string,
  locale: DisplayLocale = 'vi',
): null | string => {
  if (!code) return null
  const upper = code.trim().toUpperCase()
  if (upper === 'HAN') return locale === 'en' ? 'Hanoi' : 'Hà Nội'
  if (upper === 'SGN') return locale === 'en' ? 'Ho Chi Minh City' : 'TP. Hồ Chí Minh'
  if (upper === 'DAD') return locale === 'en' ? 'Da Nang' : 'Đà Nẵng'
  if (upper === 'HPH') return locale === 'en' ? 'Hai Phong' : 'Hải Phòng'
  return code
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

export type NormalizedScheduleAirline = {
  key: string
  label: string
}

const KNOWN_AIRLINES: Array<{
  key: string
  label: string
  codePattern: RegExp
  namePattern: RegExp
}> = [
  {
    key: 'VN',
    label: 'Vietnam Airlines',
    codePattern: /\b(VN|VNA)\b/,
    namePattern: /\bvietnam\s+airlines?\b/i,
  },
  {
    key: 'VJ',
    label: 'Vietjet Air',
    codePattern: /\bVJ\b/,
    namePattern: /\bvietjet(\s+air)?\b/i,
  },
  {
    key: 'CA',
    label: 'Air China',
    codePattern: /\bCA\b/,
    namePattern: /\bair\s+china\b/i,
  },
  {
    key: 'EK',
    label: 'Emirates',
    codePattern: /\bEK\b/,
    namePattern: /\bemirates\b/i,
  },
  {
    key: 'WE',
    label: 'Parata Air',
    codePattern: /\bWE\b/,
    namePattern: /\bparata\s+air\b/i,
  },
  {
    key: 'VU',
    label: 'Vietravel Airlines',
    codePattern: /\bVU\b/,
    namePattern: /\bviett?ravel\s+airlines?\b/i,
  },
  {
    key: '9G',
    label: 'Sun PhuQuoc Airways',
    codePattern: /\b9G\b/,
    namePattern: /\bsun\s+phu\s*quoc\s+airways\b/i,
  },
  {
    key: '7C',
    label: 'Jeju Air',
    codePattern: /\b7C\b/,
    namePattern: /\bjeju\s+air\b/i,
  },
  {
    key: 'NH',
    label: 'All Nippon Airways',
    codePattern: /\bNH\b/,
    namePattern: /\ball\s+nippon\s+airways\b/i,
  },
  {
    key: 'TK',
    label: 'Turkish Airlines',
    codePattern: /\bTK\b/,
    namePattern: /\bturkish\s+airlines\b/i,
  },
  {
    key: 'FD',
    label: 'Thai AirAsia',
    codePattern: /\bFD\b/,
    namePattern: /\bthai\s+airasia\b/i,
  },
]

/**
 * US-093 D10: Normalizes an airline string against the 11 known airlines from phase 0 baseline.
 * Returns null if the string is empty or contains only quotes/whitespace.
 * If unrecognized or matches multiple airlines, keeps raw cleaned string with key `raw:<string>`.
 */
export const normalizeScheduleAirline = (
  raw?: unknown,
): NormalizedScheduleAirline | null => {
  if (raw == null || typeof raw !== 'string') return null

  // NFKC normalize
  let cleaned = raw.normalize('NFKC')

  // Strip leading and trailing quotes and whitespace
  cleaned = cleaned.replace(/^[\s"“”'‘’]+|[\s"“”'‘’]+$/g, '').trim()
  if (!cleaned) return null

  // Collapse internal whitespace
  cleaned = cleaned.replace(/\s+/g, ' ')

  const matched: Array<{ key: string; label: string }> = []
  for (const airline of KNOWN_AIRLINES) {
    if (airline.codePattern.test(cleaned) || airline.namePattern.test(cleaned)) {
      matched.push({ key: airline.key, label: airline.label })
    }
  }

  if (matched.length === 1) {
    return matched[0]
  }

  // 0 matches or multiple matches: preserve raw cleaned string
  return {
    key: `raw:${cleaned.toLowerCase()}`,
    label: cleaned,
  }
}

const isUpperCaseText = (value: string) =>
  value === value.toLocaleUpperCase('vi') && value !== value.toLocaleLowerCase('vi')

const ACRONYM_ALLOWLIST = new Set([
  'UNESCO',
  'VN',
  'VNA',
  'VJ',
  'CA',
  'EK',
  'WE',
  'VU',
  '9G',
  '7C',
  'NH',
  'TK',
  'FD',
])

export const toTitleCaseWord = (word: string) => {
  // Extract leading and trailing punctuation/symbols (leaving alphanumeric core)
  const match = word.match(/^([^\p{L}\p{N}]*)([\s\S]*?)([^\p{L}\p{N}]*)$/u)
  if (!match) return word
  const [, prefix, core, suffix] = match
  if (!core) return word

  // Duration code like 5N4Đ or 5N4D (or 6N5Đ, etc.) -> keep standard uppercase
  const durationMatch = core.match(/^(\d+)[Nn](\d+)([ĐđDd])$/)
  if (durationMatch) {
    const [, n1, n2, dayChar] = durationMatch
    const dUpper = dayChar.toLowerCase() === 'đ' ? 'Đ' : 'D'
    return `${prefix}${n1}N${n2}${dUpper}${suffix}`
  }

  // Single duration code like 5N or 5D
  const singleDurationMatch = core.match(/^(\d+)([NnDdĐđ])$/)
  if (singleDurationMatch) {
    const [, n, char] = singleDurationMatch
    const charUpper = char.toLowerCase() === 'đ' ? 'Đ' : char.toUpperCase()
    return `${prefix}${n}${charUpper}${suffix}`
  }

  // Check allowlist for acronyms: only keep uppercase when the word in source was ALREADY UPPERCASE
  const isAlreadyUpper =
    core.length > 0 &&
    core === core.toLocaleUpperCase('vi') &&
    core !== core.toLocaleLowerCase('vi')

  if (isAlreadyUpper && ACRONYM_ALLOWLIST.has(core)) {
    return `${prefix}${core.toLocaleUpperCase('vi')}${suffix}`
  }

  const lower = core.toLocaleLowerCase('vi')
  return `${prefix}${lower.charAt(0).toLocaleUpperCase('vi') + lower.slice(1)}${suffix}`
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
