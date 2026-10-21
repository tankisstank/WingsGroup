import { describe, expect, it } from 'vitest'

import {
  EDITORIAL_BADGE_PRESETS,
  findDocumentEditorialBadgeLabel,
  getEditorialBadgePreset,
  getEditorialBadgeStorageKey,
  getEditorialBadgeStoredLabel,
  normalizeEditorialBadges,
  resolveNearestEditorialBadgeLabel,
  setEditorialBadgeStoredLabel,
  validateEditorialBadges,
} from '@/tours/editorialBadges'

describe('US-084 Editorial Badges - validateEditorialBadges', () => {
  it('allows null, undefined or empty arrays', () => {
    expect(validateEditorialBadges(null)).toBe(true)
    expect(validateEditorialBadges(undefined)).toBe(true)
    expect(validateEditorialBadges([])).toBe(true)
  })

  it('allows a valid single badge', () => {
    expect(
      validateEditorialBadges([
        { kind: 'hot', label: 'Tour hot' },
      ]),
    ).toBe(true)
  })

  it('allows valid two and three badges with distinct kinds', () => {
    expect(
      validateEditorialBadges([
        { kind: 'hot', label: 'Tour hot' },
        { kind: 'specialized', label: 'Specialize' },
      ]),
    ).toBe(true)

    expect(
      validateEditorialBadges([
        { kind: 'hot', label: 'Tour hot' },
        { kind: 'specialized', label: 'Specialize' },
        { kind: 'vip', label: 'VIP' },
      ]),
    ).toBe(true)
  })

  it('rejects more than 3 badges', () => {
    const result = validateEditorialBadges([
      { kind: 'hot', label: 'Hot' },
      { kind: 'specialized', label: 'Special' },
      { kind: 'vip', label: 'VIP' },
      { kind: 'hot', label: 'Hot 2' },
    ])
    expect(result).toBe('Tối đa 3 nhãn biên tập trên một tour.')
  })

  it('rejects duplicate badge kinds', () => {
    const result = validateEditorialBadges([
      { kind: 'hot', label: 'Tour hot 1' },
      { kind: 'hot', label: 'Tour hot 2' },
    ])
    expect(result).toContain('bị trùng lặp')
  })

  it('rejects invalid kinds', () => {
    const result = validateEditorialBadges([
      { kind: 'invalid-kind', label: 'Bad' },
    ])
    expect(result).toContain('Loại nhãn không hợp lệ')
  })

  it('rejects empty or whitespace-only label strings', () => {
    const resultEmpty = validateEditorialBadges([
      { kind: 'hot', label: '' },
    ])
    expect(resultEmpty).toContain('không được để trống')

    const resultWhitespace = validateEditorialBadges([
      { kind: 'vip', label: '   ' },
    ])
    expect(resultWhitespace).toContain('không được để trống')
  })

  it('rejects non-object elements', () => {
    const result = validateEditorialBadges(['string-item' as any])
    expect(typeof result).toBe('string')
  })
})

describe('US-084 Editorial Badges - getEditorialBadgePreset', () => {
  it('returns Vietnamese presets for vi locale', () => {
    expect(getEditorialBadgePreset('hot', 'vi')).toBe('Tour hot')
    expect(getEditorialBadgePreset('specialized', 'vi')).toBe('Specialize')
    expect(getEditorialBadgePreset('vip', 'vi')).toBe('VIP')
  })

  it('returns English presets for en locale', () => {
    expect(getEditorialBadgePreset('hot', 'en')).toBe('Tour hot')
    expect(getEditorialBadgePreset('specialized', 'en')).toBe('Specialize')
    expect(getEditorialBadgePreset('vip', 'en')).toBe('VIP')
  })

  it('returns empty string for invalid kind or null', () => {
    expect(getEditorialBadgePreset(null)).toBe('')
    expect(getEditorialBadgePreset('unknown')).toBe('')
  })
})

describe('US-084 Editorial Badges - normalizeEditorialBadges', () => {
  it('returns empty result when input is null, undefined, or empty', () => {
    expect(normalizeEditorialBadges(null)).toEqual({
      editorialBadges: [],
      hasHotEditorialBadge: false,
    })
    expect(normalizeEditorialBadges(undefined)).toEqual({
      editorialBadges: [],
      hasHotEditorialBadge: false,
    })
    expect(normalizeEditorialBadges([])).toEqual({
      editorialBadges: [],
      hasHotEditorialBadge: false,
    })
  })

  it('correctly maps single hot badge and sets hasHotEditorialBadge true', () => {
    const result = normalizeEditorialBadges([
      { kind: 'hot', label: 'Tour hot' },
    ])
    expect(result.hasHotEditorialBadge).toBe(true)
    expect(result.editorialBadges).toEqual([
      { kind: 'hot', label: 'Tour hot' },
    ])
  })

  it('correctly maps specialized and vip without setting hasHotEditorialBadge', () => {
    const result = normalizeEditorialBadges([
      { kind: 'specialized', label: 'Tour chuyên biệt' },
      { kind: 'vip', label: 'Tour VIP' },
    ])
    expect(result.hasHotEditorialBadge).toBe(false)
    expect(result.editorialBadges).toEqual([
      { kind: 'specialized', label: 'Tour chuyên biệt' },
      { kind: 'vip', label: 'Tour VIP' },
    ])
  })

  it('preserves array order and caps at 3 items', () => {
    const result = normalizeEditorialBadges([
      { kind: 'vip', label: 'VIP 1' },
      { kind: 'specialized', label: 'Spec 1' },
      { kind: 'hot', label: 'Hot 1' },
      { kind: 'specialized', label: 'Spec 2' },
    ])
    expect(result.editorialBadges).toHaveLength(3)
    expect(result.editorialBadges[0].kind).toBe('vip')
    expect(result.editorialBadges[1].kind).toBe('specialized')
    expect(result.editorialBadges[2].kind).toBe('hot')
    expect(result.hasHotEditorialBadge).toBe(true)
  })

  it('deduplicates kinds by keeping the first occurrence', () => {
    const result = normalizeEditorialBadges([
      { kind: 'hot', label: 'First Hot' },
      { kind: 'hot', label: 'Second Hot' },
    ])
    expect(result.editorialBadges).toEqual([
      { kind: 'hot', label: 'First Hot' },
    ])
  })

  it('resolves localized label map for vi and en locales', () => {
    const localized = [
      {
        kind: 'specialized',
        label: { vi: 'Chuyên biệt', en: 'Specialized' },
      },
    ]

    const resultVi = normalizeEditorialBadges(localized, 'vi')
    expect(resultVi.editorialBadges[0].label).toBe('Chuyên biệt')

    const resultEn = normalizeEditorialBadges(localized, 'en')
    expect(resultEn.editorialBadges[0].label).toBe('Specialized')
  })

  it('fails closed: DOES NOT fall back to Vietnamese label on /en when English translation is missing', () => {
    const viOnly = [
      {
        kind: 'hot',
        label: { vi: 'Tour hot tiếng Việt' },
      },
      {
        kind: 'specialized',
        label: { vi: 'Chuyên biệt tiếng Việt', en: 'Specialized English' },
      },
    ]

    const resultEn = normalizeEditorialBadges(viOnly, 'en')
    // hot badge has no en translation -> MUST NOT FALL BACK to Vietnamese! Omitted!
    expect(resultEn.hasHotEditorialBadge).toBe(false)
    expect(resultEn.editorialBadges).toEqual([
      { kind: 'specialized', label: 'Specialized English' },
    ])
  })

  it('never infers price, discount, or promoLabel from editorial badges', () => {
    const raw = [
      { kind: 'hot', label: 'Tour hot' },
      { kind: 'vip', label: 'VIP' },
    ]
    const result = normalizeEditorialBadges(raw, 'vi')

    // Confirm strict shape: only editorialBadges and hasHotEditorialBadge
    expect(Object.keys(result).sort()).toEqual(['editorialBadges', 'hasHotEditorialBadge'])
    expect((result as any).price).toBeUndefined()
    expect((result as any).originalPrice).toBeUndefined()
    expect((result as any).promoLabel).toBeUndefined()
    expect((result as any).discount).toBeUndefined()
  })
})

describe('US-084 Editorial Badges - Scoped Last-Used Label Behavior in CMS Authoring', () => {
  const createMockStorage = (): Storage => {
    const store = new Map<string, string>()
    return {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value)
      },
      removeItem: (key: string) => {
        store.delete(key)
      },
      clear: () => {
        store.clear()
      },
      key: (index: number) => Array.from(store.keys())[index] ?? null,
      length: store.size,
    }
  }

  it('generates storage keys strictly scoped by siteKey, locale, and kind', () => {
    expect(getEditorialBadgeStorageKey('1', 'vi', 'hot')).toBe(
      'wingstravel:editorial-badge-label:1:vi:hot',
    )
    expect(getEditorialBadgeStorageKey('wings-go', 'en', 'vip')).toBe(
      'wingstravel:editorial-badge-label:wings-go:en:vip',
    )
    expect(getEditorialBadgeStorageKey(undefined, null, 'specialized')).toBe(
      'wingstravel:editorial-badge-label:default:vi:specialized',
    )
  })

  it('stores and retrieves labels for matching siteKey, locale, and kind', () => {
    const storage = createMockStorage()
    setEditorialBadgeStoredLabel(storage, '1', 'vi', 'hot', 'Tour Hot Mùa Thu 2026')

    expect(getEditorialBadgeStoredLabel(storage, '1', 'vi', 'hot')).toBe('Tour Hot Mùa Thu 2026')
  })

  it('prevents cross-site leakage: custom label on site 1 is never visible on site 2', () => {
    const storage = createMockStorage()
    setEditorialBadgeStoredLabel(storage, '1', 'vi', 'hot', 'Tour Hot WingsGo Độc Quyền')

    // Site 2 (e.g. WingSide) querying the same kind and locale must get null
    expect(getEditorialBadgeStoredLabel(storage, '2', 'vi', 'hot')).toBeNull()

    // Resolving nearest label for site 2 must fall back to standard preset, never site 1 label
    const site2Label = resolveNearestEditorialBadgeLabel({
      kind: 'hot',
      locale: 'vi',
      siteKey: '2',
      storage,
    })
    expect(site2Label).toBe('Tour hot')
    expect(site2Label).not.toBe('Tour Hot WingsGo Độc Quyền')
  })

  it('prevents cross-locale leakage: Vietnamese custom label is never used on English route', () => {
    const storage = createMockStorage()
    setEditorialBadgeStoredLabel(storage, '1', 'vi', 'hot', 'Tour Hot Đặc Biệt')

    // en querying hot on site 1 must not see Vietnamese label
    expect(getEditorialBadgeStoredLabel(storage, '1', 'en', 'hot')).toBeNull()

    const enLabel = resolveNearestEditorialBadgeLabel({
      kind: 'hot',
      locale: 'en',
      siteKey: '1',
      storage,
    })
    expect(enLabel).toBe('Tour hot')
  })

  it('prevents cross-kind leakage: hot label is never used for vip or specialized', () => {
    const storage = createMockStorage()
    setEditorialBadgeStoredLabel(storage, '1', 'vi', 'hot', 'Tour Hot Khuyến Mại')

    expect(getEditorialBadgeStoredLabel(storage, '1', 'vi', 'vip')).toBeNull()
    expect(getEditorialBadgeStoredLabel(storage, '1', 'vi', 'specialized')).toBeNull()

    const vipLabel = resolveNearestEditorialBadgeLabel({
      kind: 'vip',
      locale: 'vi',
      siteKey: '1',
      storage,
    })
    expect(vipLabel).toBe('VIP')
  })

  it('preserves explicit existing label when provided and does not overwrite it', () => {
    const storage = createMockStorage()
    setEditorialBadgeStoredLabel(storage, '1', 'vi', 'hot', 'Stored Hot Label')

    const label = resolveNearestEditorialBadgeLabel({
      currentLabel: 'Tự biên tập riêng cho tour này',
      kind: 'hot',
      locale: 'vi',
      siteKey: '1',
      storage,
    })
    expect(label).toBe('Tự biên tập riêng cho tour này')
  })

  it('finds existing label in current document when storage has no entry', () => {
    const storage = createMockStorage()
    const docBadges = [
      { kind: 'vip', label: 'VIP Diamond Luxury' },
    ]

    expect(findDocumentEditorialBadgeLabel(docBadges, 'vip')).toBe('VIP Diamond Luxury')
    expect(findDocumentEditorialBadgeLabel(docBadges, 'hot')).toBeNull()

    const label = resolveNearestEditorialBadgeLabel({
      docBadges,
      kind: 'vip',
      locale: 'vi',
      siteKey: '1',
      storage,
    })
    expect(label).toBe('VIP Diamond Luxury')
  })

  it('gracefully handles missing storage or exceptions without crashing', () => {
    const brokenStorage = {
      getItem: () => {
        throw new Error('QuotaExceeded or SecurityError')
      },
      setItem: () => {
        throw new Error('QuotaExceeded or SecurityError')
      },
    }

    expect(() => {
      setEditorialBadgeStoredLabel(brokenStorage as any, '1', 'vi', 'hot', 'Test')
    }).not.toThrow()

    expect(getEditorialBadgeStoredLabel(brokenStorage as any, '1', 'vi', 'hot')).toBeNull()

    const label = resolveNearestEditorialBadgeLabel({
      kind: 'hot',
      locale: 'vi',
      siteKey: '1',
      storage: brokenStorage as any,
    })
    expect(label).toBe('Tour hot')
  })
})

