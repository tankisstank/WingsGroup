import { vietnameseSlugify } from './slugify'

/**
 * Normalizes a tour slug candidate into a lowercase, Latin-only, URL-friendly slug.
 * Applies explicit đ/Đ mapping, Unicode NFD diacritics removal, lowercase,
 * dash collapsing and edge trimming.
 *
 * Implements the canonical slug specification for US-075.
 */
export const normalizeTourSlug = (value?: unknown): string => {
  return vietnameseSlugify(value)
}

/**
 * Normalizes raw input in real-time as the editor types in the CMS input field.
 * Preserves hyphens while typing, but strips diacritics and forces lowercase.
 */
export const normalizeTourSlugInput = (value: string): string => {
  if (typeof value !== 'string') return ''
  return value
    .replace(/[đĐ]/g, 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
}

/**
 * Derives a tour slug from title or custom slug.
 * Prefers an explicitly provided customSlug if present;
 * otherwise derives from the Vietnamese title.
 */
export const titleToTourSlug = (title?: string | null, customSlug?: string | null): string => {
  if (typeof customSlug === 'string' && customSlug.trim()) {
    return normalizeTourSlug(customSlug)
  }
  return normalizeTourSlug(title || '')
}

export { vietnameseSlugify }
export default normalizeTourSlug
