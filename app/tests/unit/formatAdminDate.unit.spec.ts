import { describe, expect, it } from 'vitest'

import { formatAdminDate } from '@/utilities/formatAdminDate'

describe('formatAdminDate', () => {
  it('renders the Vietnam operational timezone in an explicit 24-hour format', () => {
    expect(formatAdminDate('2026-09-08T18:30:00.000Z')).toBe('09/09/2026 01:30')
  })

  it('uses clear placeholders for missing and invalid timestamps', () => {
    expect(formatAdminDate()).toBe('Chưa có ngày')
    expect(formatAdminDate('not-a-date')).toBe('Ngày không hợp lệ')
  })
})
