import { describe, expect, it } from 'vitest'

import {
  ADMIN_SOURCE_LOCALE,
  formatLocalizedAdminTitle,
  isMissingLocalizedTitle,
} from '@/utilities/localizedAdminTitle'

describe('localized admin title fallback', () => {
  it('recognizes blank and native missing-title placeholders', () => {
    expect(isMissingLocalizedTitle('')).toBe(true)
    expect(isMissingLocalizedTitle('<Không có Tiêu đề>')).toBe(true)
    expect(isMissingLocalizedTitle('<No title>')).toBe(true)
    expect(isMissingLocalizedTitle('Tour Hàng Châu')).toBe(false)
  })

  it('explains a missing translation without mutating the source locale', () => {
    expect(
      formatLocalizedAdminTitle({
        fallbackTitle: { locale: ADMIN_SOURCE_LOCALE, title: 'Khám phá Việt Nam' },
      }),
    ).toBe('[Chưa dịch] — Khám phá Việt Nam (vi)')
    expect(formatLocalizedAdminTitle({ loading: true })).toBe('[Chưa dịch] — Đang tải tiêu đề gốc…')
    expect(formatLocalizedAdminTitle({})).toBe('[Chưa dịch] — Chưa có tiêu đề')
  })
})
