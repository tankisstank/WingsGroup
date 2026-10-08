import { describe, expect, it } from 'vitest'
import {
  normalizeTourSlug,
  normalizeTourSlugInput,
  titleToTourSlug,
} from '@/utilities/normalizeTourSlug'

describe('normalizeTourSlug (US-075)', () => {
  it('normalizes Vietnamese unicode titles with diacritics to clean Latin slugs', () => {
    expect(normalizeTourSlug('Đà Nẵng / 5N4Đ')).toBe('da-nang-5n4d')
    expect(
      normalizeTourSlug(
        'ĐÓN TẾT TẠI NHẬT BẢN – HÀ NỘI – OSAKA – KOBE – KYOTO – NÚI PHÚ SĨ – TRƯỢT TUYẾT – TOKYO (VNA)',
      ),
    ).toBe(
      'don-tet-tai-nhat-ban-ha-noi-osaka-kobe-kyoto-nui-phu-si-truot-tuyet-tokyo-vna',
    )
  })

  it('normalizes uppercase Latin characters to lowercase', () => {
    expect(normalizeTourSlug('SEOUL-TOUR')).toBe('seoul-tour')
    expect(normalizeTourSlug('TOKYO-OSAKA-KYOTO')).toBe('tokyo-osaka-kyoto')
  })

  it('normalizes explicit đ and Đ characters without stripping consonants', () => {
    expect(normalizeTourSlug('Đảo Điệp Sơn')).toBe('dao-diep-son')
    expect(normalizeTourSlug('đường ven biển đồ sơn')).toBe('duong-ven-bien-do-son')
  })

  it('normalizes special punctuation, symbols, and collapses repeated dashes', () => {
    expect(normalizeTourSlug('Tour Hạ Long --- Cát Bà (5★) 2N1Đ! 🚢')).toBe(
      'tour-ha-long-cat-ba-5-2n1d',
    )
  })

  it('normalizes and trims edge hyphens and surrounding whitespace', () => {
    expect(normalizeTourSlug('   --- tour nha trang 4n3d ---   ')).toBe(
      'tour-nha-trang-4n3d',
    )
  })

  it('normalizes interactive input on keystroke preserving intermediate hyphens', () => {
    expect(normalizeTourSlugInput('ĐÀ-NẴNG-')).toBe('da-nang-')
    expect(normalizeTourSlugInput('Tour Phú Quốc 3N2Đ')).toBe('tour-phu-quoc-3n2d')
  })

  it('derives clean slug from Vietnamese canonical title', () => {
    expect(titleToTourSlug('Khám Phá Sapa 3N2Đ')).toBe('kham-pha-sapa-3n2d')
    expect(titleToTourSlug('Du Lịch Đà Lạt Thành Phố Ngàn Hoa')).toBe(
      'du-lich-da-lat-thanh-pho-ngan-hoa',
    )
  })

  it('derives empty slug safely when title is missing or blank', () => {
    expect(titleToTourSlug('')).toBe('')
    expect(titleToTourSlug(null)).toBe('')
    expect(titleToTourSlug(undefined)).toBe('')
  })

  it('prefers custom slug when explicitly provided', () => {
    expect(titleToTourSlug('Tên Tour Tiếng Việt', 'custom-slug-viet')).toBe(
      'custom-slug-viet',
    )
    expect(titleToTourSlug('Khám Phá Hạ Long', 'ha-long-cruise-vip')).toBe(
      'ha-long-cruise-vip',
    )
  })

  it('prefers normalized custom slug and removes illegal characters from custom input', () => {
    expect(titleToTourSlug('Tên Tour Bất Kỳ', 'CUSTOM / SLUG ĐẶC BIỆT!')).toBe(
      'custom-slug-dac-biet',
    )
  })
})
