import type { SiteSetting } from '@/payload-types'

export interface HotlineItem {
  raw: string
  normalized: string
  href: string
  label?: string
}

export const WINGSGO_DEFAULT_HOTLINES: readonly [string, string, string] = [
  '0912910101',
  '0915250101',
  '0915260101',
] as const

/**
 * Normalizes a phone number.
 *
 * For WingsGo:
 * - Strict Vietnamese validation: 0 + 9 digits or +84 / 84 + 9 digits normalized to 0 + 9 digits.
 * - Rejects any alphabetical characters or custom protocols.
 *
 * For non-WingsGo:
 * - Preserves valid international E.164 phone numbers (e.g. +33 1 23 45 67 89 -> +33123456789).
 * - Local VN numbers (0 + 9 digits) are also supported.
 * - Preserves leading 0 as string.
 */
export function normalizePhoneNumber(
  input: string | null | undefined,
  options?: { isWingsGo?: boolean },
): string | null {
  if (!input || typeof input !== 'string') return null
  const trimmed = input.trim()
  if (!trimmed) return null

  // Reject alphabetical characters, protocols (e.g., tel:, http:)
  if (/[a-zA-Z]/.test(trimmed)) return null

  // Strip safe formatting separators (spaces, dots, hyphens, parentheses)
  let clean = trimmed.replace(/[\s.\-()]/g, '')

  // Handle +84 / 84 Vietnamese prefix -> 0 + 9 digits
  if (clean.startsWith('+84')) {
    clean = '0' + clean.slice(3)
  } else if (clean.startsWith('84') && clean.length === 11) {
    clean = '0' + clean.slice(2)
  }

  // Vietnamese 10-digit format starting with 0
  if (/^0\d{9}$/.test(clean)) {
    return clean
  }

  // Safe international handling for non-WingsGo tenants (+ followed by 7-15 digits)
  if (!options?.isWingsGo) {
    if (/^\+[1-9]\d{6,14}$/.test(clean)) {
      return clean
    }
  }

  return null
}

/**
 * Formats a 10-digit phone number as standard display pattern (e.g. 0912 910 101).
 * International numbers outside 10 digits are returned trimmed/normalized.
 */
export function formatHotlineDisplay(phone: string | null | undefined): string {
  if (!phone || typeof phone !== 'string') return ''
  const normalized = normalizePhoneNumber(phone, { isWingsGo: false })
  const target = normalized || phone.trim()
  if (/^0\d{9}$/.test(target)) {
    return `${target.slice(0, 4)} ${target.slice(4, 7)} ${target.slice(7)}`
  }
  return target
}

/**
 * Pure, client-safe resolver for site hotlines.
 *
 * Rules:
 * - Normalized and href tel always keep leading 0 or international prefix.
 * - Deduplicates by normalized phone number.
 * - Main supportPhone comes first, followed by additional hotlines in order.
 * - Valid Vietnamese and international numbers are rendered consistently with CMS validation.
 * - WingsGo falls back to 0912910101 if main is missing/invalid.
 * - ONLY undefined permits supplementary defaults for WingsGo.
 * - null or [] is authoritative empty: no secondary fallback is added.
 * - Other tenants preserve valid international phone numbers and do not receive WingsGo defaults.
 */
export function resolveSiteHotlines(
  settings?: Partial<SiteSetting> | null,
  siteCode?: string | null,
): HotlineItem[] {
  const isWingsGo = siteCode === 'wings-go'
  const result: HotlineItem[] = []
  const seen = new Set<string>()

  const addHotline = (raw: string, label?: string | null) => {
    const normalized = normalizePhoneNumber(raw)
    if (!normalized || seen.has(normalized)) return
    seen.add(normalized)
    result.push({
      raw,
      normalized,
      href: `tel:${normalized}`,
      ...(label ? { label } : {}),
    })
  }

  // 1. Resolve main supportPhone
  const cmsSupportPhone = settings?.supportPhone
  const normalizedMain = normalizePhoneNumber(cmsSupportPhone)

  if (normalizedMain) {
    addHotline(cmsSupportPhone!, undefined)
  } else if (isWingsGo) {
    addHotline(WINGSGO_DEFAULT_HOTLINES[0], undefined)
  }

  // 2. Resolve additional hotlines
  const additional = settings?.additionalHotlines
  if (additional === undefined) {
    // ONLY undefined permits supplementary defaults for WingsGo
    if (isWingsGo) {
      addHotline(WINGSGO_DEFAULT_HOTLINES[1], 'Tư vấn tour')
      addHotline(WINGSGO_DEFAULT_HOTLINES[2], 'Hỗ trợ dịch vụ')
    }
  } else if (Array.isArray(additional)) {
    // Array (including []) is authoritative CMS configuration
    for (const item of additional) {
      if (item?.phoneNumber) {
        addHotline(item.phoneNumber, item.label || undefined)
      }
    }
  }
  // Note: if additional === null, it is authoritative empty; no fallback added.

  return result
}
