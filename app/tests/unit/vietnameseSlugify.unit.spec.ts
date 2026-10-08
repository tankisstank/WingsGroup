import { describe, expect, it } from 'vitest'
import { vietnameseSlugify } from '@/utilities/slugify'

describe('vietnameseSlugify', () => {
  it('converts Vietnamese unicode with accents to clean Latin slug', () => {
    const input = 'ĐÓN TẾT TẠI NHẬT BẢN – HÀ NỘI – OSAKA – KOBE – KYOTO – NÚI PHÚ SĨ – TRƯỢT TUYẾT – TOKYO (VNA)'
    expect(vietnameseSlugify(input)).toBe(
      'don-tet-tai-nhat-ban-ha-noi-osaka-kobe-kyoto-nui-phu-si-truot-tuyet-tokyo-vna',
    )
  })

  it('handles lowercase and uppercase Đ/đ correctly', () => {
    expect(vietnameseSlugify('Đà Nẵng & Hội An')).toBe('da-nang-hoi-an')
    expect(vietnameseSlugify('đường ven biển')).toBe('duong-ven-bien')
  })

  it('handles special characters, punctuation and multiple spaces', () => {
    expect(vietnameseSlugify('Tour Phú Quốc 3N2Đ: Khám Phá Đảo Ngọc! 🏝️')).toBe(
      'tour-phu-quoc-3n2d-kham-pha-dao-ngoc',
    )
    expect(vietnameseSlugify('  Hạ Long --- Cát Bà (Du thuyền 5*)  ')).toBe(
      'ha-long-cat-ba-du-thuyen-5',
    )
  })

  it('works with Payload slugField argument object signature', () => {
    const payloadArgs = {
      data: { title: 'Test' },
      req: {} as any,
      valueToSlugify: 'Khám Phá Miền Tây Sông Nước',
    }
    expect(vietnameseSlugify(payloadArgs)).toBe('kham-pha-mien-tay-song-nuoc')
  })

  it('handles empty or non-string inputs gracefully', () => {
    expect(vietnameseSlugify('')).toBe('')
    expect(vietnameseSlugify(null)).toBe('')
    expect(vietnameseSlugify(undefined)).toBe('')
    expect(vietnameseSlugify(123)).toBe('')
  })
})
