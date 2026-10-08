/**
 * Utility to convert arbitrary text (specifically Vietnamese Unicode)
 * into a clean, URL-friendly Latin slug.
 *
 * Normalization rules:
 * - Đ / đ -> d
 * - Decomposes diacritics via Unicode NFD and removes accent marks
 * - Converts non-alphanumeric characters to hyphens
 * - Collapses consecutive hyphens and trims leading/trailing hyphens
 * - Compatible with Payload's slugField custom slugify signature:
 *     ({ data, req, valueToSlugify }) => string
 */
export const vietnameseSlugify = (value?: unknown): string => {
  const input =
    typeof value === 'object' && value !== null && 'valueToSlugify' in value
      ? (value as { valueToSlugify?: unknown }).valueToSlugify
      : value

  if (typeof input !== 'string') return ''

  return input
    .replace(/[đĐ]/g, 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-')
}

export default vietnameseSlugify
