import {
  dismissWingsSideSpecials,
  getWingsSideSpecialsCopy,
  isWingsSideSpecialsHomePathname,
  isWingsSideSpecialsDismissed,
  shouldRenderWingsSideSpecials,
  WINGSSIDE_SPECIALS_DISMISSED_KEY,
} from '@/utilities/wingsSideSpecials'
import { describe, expect, it, vi } from 'vitest'

describe('WingSide Specials helpers', () => {
  it.each([
    '/',
    '/en',
    '/it',
    '/es',
    '/pt',
    '/vi',
    '/wingsside',
    '/wingsside/en/',
    '/wingsside/it',
    '/wingsside/es',
    '/wingsside/pt',
    '/wingsside/vi',
  ])('recognizes Home pathname %s', (pathname) =>
    expect(isWingsSideSpecialsHomePathname(pathname)).toBe(true),
  )

  it.each([
    '/packages',
    '/en/packages',
    '/it/packages',
    '/es/packages',
    '/pt/packages',
    '/vi/packages',
    '/wingsside/en/packages',
    '/wingsside/it/packages',
    '/wingsside/es/packages',
    '/wingsside/pt/packages',
    '/wingsside/vi/packages',
  ])('rejects non-Home pathname %s', (pathname) =>
    expect(isWingsSideSpecialsHomePathname(pathname)).toBe(false),
  )

  it('falls back to English for unknown and missing locales', () => {
    expect(getWingsSideSpecialsCopy('fr')).toEqual(getWingsSideSpecialsCopy('en'))
    expect(getWingsSideSpecialsCopy()).toEqual(getWingsSideSpecialsCopy('en'))
    expect(getWingsSideSpecialsCopy('vi').items).toEqual([
      'Ưu đãi',
      'Tour nổi bật',
      'Gói độc quyền',
    ])
  })

  it('keeps the approved visible badge and title exact in all five supported promo locales', () => {
    for (const locale of ['en', 'it', 'es', 'pt', 'vi']) {
      expect(getWingsSideSpecialsCopy(locale)).toMatchObject({
        badge: '// HOT  LIMITED',
        title: 'SPECIALS.',
      })
    }
  })

  it('renders only on the exact WingSide Home pathname', () => {
    expect(shouldRenderWingsSideSpecials('wing-side', '/')).toBe(true)
    expect(shouldRenderWingsSideSpecials('wing-side', '/en')).toBe(true)
    expect(shouldRenderWingsSideSpecials('wing-side', '/it')).toBe(true)
    expect(shouldRenderWingsSideSpecials('wing-side', '/wingsside/pt')).toBe(true)
    expect(shouldRenderWingsSideSpecials('wing-side', '/packages')).toBe(false)
    expect(shouldRenderWingsSideSpecials('wings-go', '/')).toBe(false)
    expect(shouldRenderWingsSideSpecials('wing-side', '/?campaign=hot')).toBe(true)
  })

  it('persists and reads session dismissal without throwing when storage is unavailable', () => {
    const storage = {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
    }

    expect(isWingsSideSpecialsDismissed(storage)).toBe(false)
    dismissWingsSideSpecials(storage)
    expect(storage.setItem).toHaveBeenCalledWith(WINGSSIDE_SPECIALS_DISMISSED_KEY, '1')

    storage.getItem.mockReturnValue('1')
    expect(isWingsSideSpecialsDismissed(storage)).toBe(true)

    expect(isWingsSideSpecialsDismissed()).toBe(false)
    expect(() => dismissWingsSideSpecials()).not.toThrow()
  })
})
