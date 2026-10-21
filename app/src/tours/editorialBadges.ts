export type EditorialBadgeKind = 'hot' | 'specialized' | 'vip'

export type EditorialBadgeItem = {
  id?: string | null
  kind: EditorialBadgeKind
  label: string | Record<string, string>
}

export type EditorialBadgeDTO = {
  kind: EditorialBadgeKind
  label: string
}

export const EDITORIAL_BADGE_KINDS: readonly EditorialBadgeKind[] = [
  'hot',
  'specialized',
  'vip',
] as const

export const EDITORIAL_BADGE_PRESETS: Record<string, Record<EditorialBadgeKind, string>> = {
  vi: {
    hot: 'Tour hot',
    specialized: 'Specialize',
    vip: 'VIP',
  },
  en: {
    hot: 'Tour hot',
    specialized: 'Specialize',
    vip: 'VIP',
  },
}

export const getEditorialBadgePreset = (
  kind?: string | null,
  locale?: string | null,
): string => {
  if (!kind || !EDITORIAL_BADGE_KINDS.includes(kind as EditorialBadgeKind)) return ''
  const loc = locale === 'en' ? 'en' : 'vi'
  return EDITORIAL_BADGE_PRESETS[loc]?.[kind as EditorialBadgeKind] || EDITORIAL_BADGE_PRESETS.vi[kind as EditorialBadgeKind] || ''
}

/**
 * Server-side Payload validator for TourProducts.editorialBadges array.
 * Enforces:
 * - Max 3 items
 * - Allowed kinds: hot | specialized | vip
 * - No duplicate kind within the array
 * - Label must be non-empty string when provided
 */
export const validateEditorialBadges = (
  value: unknown,
  _args?: unknown,
): true | string => {
  if (!value) return true
  if (!Array.isArray(value)) return 'Dữ liệu nhãn biên tập không hợp lệ.'

  if (value.length > 3) {
    return 'Tối đa 3 nhãn biên tập trên một tour.'
  }

  const seenKinds = new Set<string>()

  for (let i = 0; i < value.length; i++) {
    const item = value[i]
    if (!item || typeof item !== 'object') {
      return `Phần tử nhãn thứ ${i + 1} không hợp lệ.`
    }

    const kind = (item as { kind?: unknown }).kind
    if (typeof kind !== 'string' || !EDITORIAL_BADGE_KINDS.includes(kind as EditorialBadgeKind)) {
      return `Loại nhãn không hợp lệ: "${kind}". Chỉ chấp nhận: hot, specialized, vip.`
    }

    if (seenKinds.has(kind)) {
      return `Loại nhãn "${kind}" bị trùng lặp. Mỗi loại chỉ được chọn tối đa một lần.`
    }
    seenKinds.add(kind)

    const label = (item as { label?: unknown }).label
    if (label !== undefined && label !== null) {
      if (typeof label === 'string') {
        if (!label.trim()) {
          return `Nhãn hiển thị cho "${kind}" không được để trống.`
        }
      } else if (typeof label === 'object') {
        const hasAnyNonEmpty = Object.values(label as Record<string, unknown>).some(
          (val) => typeof val === 'string' && val.trim().length > 0,
        )
        if (!hasAnyNonEmpty) {
          return `Nhãn hiển thị cho "${kind}" không được để trống.`
        }
      }
    }
  }

  return true
}

/**
 * Normalizes raw tour editorialBadges into a clean shared DTO for all card surfaces.
 * Rules:
 * - At most 1 badge per kind, max 3 badges total.
 * - Order in the array defines display order of stickers.
 * - Extracts localized label according to locale without falling back to Vietnamese on /en.
 * - hot controls hasHotEditorialBadge (for 2px rainbow/conic gradient border).
 * - Badges with empty labels are omitted.
 * - Editorial badges never alter or infer prices or discounts.
 */
export const normalizeEditorialBadges = (
  rawBadges: unknown,
  locale?: string | null,
): {
  editorialBadges: EditorialBadgeDTO[]
  hasHotEditorialBadge: boolean
} => {
  if (!Array.isArray(rawBadges) || rawBadges.length === 0) {
    return {
      editorialBadges: [],
      hasHotEditorialBadge: false,
    }
  }

  const isEn = locale === 'en'
  const seenKinds = new Set<EditorialBadgeKind>()
  const result: EditorialBadgeDTO[] = []

  for (const item of rawBadges) {
    if (!item || typeof item !== 'object') continue
    const kind = item.kind as EditorialBadgeKind
    if (!EDITORIAL_BADGE_KINDS.includes(kind)) continue
    if (seenKinds.has(kind)) continue
    if (result.length >= 3) break

    let resolvedLabel = ''
    const rawLabel = item.label

    if (typeof rawLabel === 'string') {
      const trimmed = rawLabel.trim()
      // If item is explicitly tagged with another locale, don't leak
      if (item._locale && isEn && item._locale !== 'en') {
        resolvedLabel = ''
      } else {
        resolvedLabel = trimmed
      }
    } else if (rawLabel && typeof rawLabel === 'object') {
      const localizedMap = rawLabel as Record<string, unknown>
      if (isEn) {
        // Strict no Vietnamese fallback on English route
        const enVal = localizedMap.en
        resolvedLabel = typeof enVal === 'string' ? enVal.trim() : ''
      } else {
        const targetVal = locale ? localizedMap[locale] : undefined
        if (typeof targetVal === 'string' && targetVal.trim()) {
          resolvedLabel = targetVal.trim()
        } else if (typeof localizedMap.vi === 'string') {
          resolvedLabel = localizedMap.vi.trim()
        }
      }
    }

    if (!resolvedLabel) {
      continue
    }

    seenKinds.add(kind)
    result.push({
      kind,
      label: resolvedLabel,
    })
  }

  const hasHotEditorialBadge = result.some((badge) => badge.kind === 'hot')

  return {
    editorialBadges: result,
    hasHotEditorialBadge,
  }
}

/**
 * Resolves storage key for editor's last-used badge label in CMS.
 * Scoped strictly by siteKey, locale, and kind to guarantee zero cross-site/cross-locale leakage.
 */
export const getEditorialBadgeStorageKey = (
  siteKey: string | number | undefined,
  locale: string | null | undefined,
  kind: string | null | undefined,
): string => {
  const safeSite =
    siteKey !== undefined && siteKey !== null && String(siteKey).trim()
      ? String(siteKey).trim()
      : 'default'
  const safeLocale = locale === 'en' ? 'en' : 'vi'
  const safeKind = kind && typeof kind === 'string' ? kind.trim() : 'unknown'
  return `wingstravel:editorial-badge-label:${safeSite}:${safeLocale}:${safeKind}`
}

/**
 * Retrieves the editor's last-used label from client storage for (site, locale, kind).
 */
export const getEditorialBadgeStoredLabel = (
  storage: Pick<Storage, 'getItem'> | undefined,
  siteKey: string | number | undefined,
  locale: string | null | undefined,
  kind: string | null | undefined,
): string | null => {
  if (!storage || typeof storage.getItem !== 'function' || !kind) return null
  try {
    const key = getEditorialBadgeStorageKey(siteKey, locale, kind)
    const val = storage.getItem(key)
    return val && typeof val === 'string' && val.trim() ? val.trim() : null
  } catch {
    return null
  }
}

/**
 * Stores the editor's last-used label into client storage for (site, locale, kind).
 */
export const setEditorialBadgeStoredLabel = (
  storage: Pick<Storage, 'setItem'> | undefined,
  siteKey: string | number | undefined,
  locale: string | null | undefined,
  kind: string | null | undefined,
  label: string | null | undefined,
): void => {
  if (!storage || typeof storage.setItem !== 'function' || !kind || !label || !label.trim()) return
  try {
    const key = getEditorialBadgeStorageKey(siteKey, locale, kind)
    storage.setItem(key, label.trim())
  } catch {
    // Gracefully handle storage quota or security errors
  }
}

/**
 * Inspects badges in the current document to see if a label was previously entered for this kind.
 */
export const findDocumentEditorialBadgeLabel = (
  badges: unknown,
  kind: string | null | undefined,
): string | null => {
  if (!Array.isArray(badges) || !kind) return null
  const found = badges.find(
    (item) =>
      item &&
      typeof item === 'object' &&
      'kind' in item &&
      item.kind === kind &&
      'label' in item &&
      typeof item.label === 'string' &&
      item.label.trim(),
  )
  return found && typeof (found as { label?: string }).label === 'string'
    ? (found as { label: string }).label.trim()
    : null
}

/**
 * Resolves the nearest label for an editorial badge.
 * Order of precedence:
 * 1. Preserves explicit non-empty currentLabel (if provided).
 * 2. Stored last-used label for (siteKey, locale, kind) in editor's storage.
 * 3. In-document badge label for the same kind.
 * 4. Fallback to default preset for (locale, kind).
 */
export const resolveNearestEditorialBadgeLabel = ({
  currentLabel,
  docBadges,
  kind,
  locale,
  siteKey,
  storage,
}: {
  currentLabel?: string | null
  docBadges?: unknown
  kind: string
  locale: string
  siteKey?: string | number
  storage?: Pick<Storage, 'getItem'>
}): string => {
  if (currentLabel && typeof currentLabel === 'string' && currentLabel.trim()) {
    return currentLabel.trim()
  }

  const stored = getEditorialBadgeStoredLabel(storage, siteKey, locale, kind)
  if (stored) {
    return stored
  }

  const inDoc = findDocumentEditorialBadgeLabel(docBadges, kind)
  if (inDoc) {
    return inDoc
  }

  return getEditorialBadgePreset(kind, locale)
}

