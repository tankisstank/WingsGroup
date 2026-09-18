const adminDateFormatter = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  hour: '2-digit',
  hour12: false,
  minute: '2-digit',
  month: '2-digit',
  timeZone: 'Asia/Ho_Chi_Minh',
  year: 'numeric',
})

const getDatePart = (parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes) =>
  parts.find((part) => part.type === type)?.value || ''

/**
 * Explicit admin contract: DD/MM/YYYY HH:mm in the operational timezone.
 * Storage remains an ISO/UTC timestamp; only presentation is localized here.
 */
export const formatAdminDate = (value?: Date | null | string): string => {
  if (value === null || value === undefined || value === '') {
    return 'Chưa có ngày'
  }

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return 'Ngày không hợp lệ'
  }

  const parts = adminDateFormatter.formatToParts(date)
  const day = getDatePart(parts, 'day')
  const month = getDatePart(parts, 'month')
  const year = getDatePart(parts, 'year')
  const hour = getDatePart(parts, 'hour')
  const minute = getDatePart(parts, 'minute')

  return `${day}/${month}/${year} ${hour}:${minute}`
}
