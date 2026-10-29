const BUSINESS_TIMEZONE = 'Asia/Ho_Chi_Minh'

const businessDateFormatter = new Intl.DateTimeFormat('en-US', {
  day: '2-digit',
  month: '2-digit',
  timeZone: BUSINESS_TIMEZONE,
  year: 'numeric',
})

const parseValidDate = (value: unknown): Date | null => {
  if (value === null || value === undefined || value === '') return null
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }
  return null
}

export type BusinessSeason = 'spring' | 'summer' | 'autumn' | 'winter'

export const BUSINESS_SEASONS = ['spring', 'summer', 'autumn', 'winter'] as const

export const isBusinessSeason = (value: unknown): value is BusinessSeason =>
  typeof value === 'string' && (BUSINESS_SEASONS as readonly string[]).includes(value)

export const toBusinessCalendarDay = (value: unknown): string | null => {
  const date = parseValidDate(value)
  if (!date) return null

  const parts = businessDateFormatter.formatToParts(date)
  const year = parts.find((p) => p.type === 'year')?.value
  const month = parts.find((p) => p.type === 'month')?.value
  const day = parts.find((p) => p.type === 'day')?.value

  if (!year || !month || !day) return null
  return `${year}-${month}-${day}`
}

export const businessCalendarMonth = (value: unknown): string | null => {
  if (typeof value === 'string' && /^\d{4}-(?:0[1-9]|1[0-2])$/.test(value)) {
    return value
  }
  const day = toBusinessCalendarDay(value)
  return day ? day.slice(0, 7) : null
}

export const seasonOfBusinessMonth = (value: unknown): BusinessSeason | null => {
  let monthNum: number | null = null

  if (typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 12) {
    monthNum = value
  } else if (typeof value === 'string') {
    const monthStr = businessCalendarMonth(value)
    if (monthStr) {
      monthNum = Number(monthStr.slice(5, 7))
    }
  } else if (value instanceof Date) {
    const monthStr = businessCalendarMonth(value)
    if (monthStr) {
      monthNum = Number(monthStr.slice(5, 7))
    }
  }

  if (monthNum === null) return null
  if (monthNum >= 3 && monthNum <= 5) return 'spring'
  if (monthNum >= 6 && monthNum <= 8) return 'summer'
  if (monthNum >= 9 && monthNum <= 11) return 'autumn'
  if (monthNum === 12 || monthNum === 1 || monthNum === 2) return 'winter'
  return null
}

export const daysUntilBusinessDay = (
  target: unknown,
  now: unknown = new Date(),
): number | null => {
  const targetDay = toBusinessCalendarDay(target)
  const nowDay = toBusinessCalendarDay(now)
  if (!targetDay || !nowDay) return null

  const [tY, tM, tD] = targetDay.split('-').map(Number)
  const [nY, nM, nD] = nowDay.split('-').map(Number)

  const targetUtc = Date.UTC(tY, tM - 1, tD)
  const nowUtc = Date.UTC(nY, nM - 1, nD)

  return Math.round((targetUtc - nowUtc) / 86_400_000)
}

export type BusinessMonthOption = { label: string; value: string }

export const getNextBusinessMonths = (
  count = 12,
  now = new Date(),
  locale = 'vi',
): Array<BusinessMonthOption> => {
  const currentDayStr = toBusinessCalendarDay(now) || '2026-10-01'
  const [yearStr, monthStr] = currentDayStr.split('-')
  let currentYear = Number(yearStr)
  let currentMonth = Number(monthStr)

  const options: Array<BusinessMonthOption> = []
  for (let i = 0; i < count; i++) {
    const y = currentYear
    const m = currentMonth
    const value = `${y}-${String(m).padStart(2, '0')}`
    const label =
      locale === 'en'
        ? new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(
            new Date(Date.UTC(y, m - 1, 1)),
          )
        : `Tháng ${m}/${y}`
    options.push({ label, value })

    currentMonth++
    if (currentMonth > 12) {
      currentMonth = 1
      currentYear++
    }
  }
  return options
}
