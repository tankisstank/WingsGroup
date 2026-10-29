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
