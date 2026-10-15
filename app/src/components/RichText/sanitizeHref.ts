/**
 * URL sanitizer for Lexical RichText links and CMS URL inputs.
 * Strictly allowlists safe protocols (http, https, mailto, tel) and safe relative paths (/path, #hash, ./path).
 * Rejects javascript:, vbscript:, data:, protocol-relative (//evil.com), and strips control characters.
 */
export const sanitizeHref = (href?: unknown): string => {
  if (typeof href !== 'string') return '#'
  // Strip control characters (ASCII 0x00-0x1F, 0x7F) and whitespace
  const cleaned = href.replace(/[\u0000-\u001F\u007F]/g, '').trim()
  if (!cleaned) return '#'

  // Relative URLs: /path (disallow protocol-relative //), #hash, ./path
  if (cleaned.startsWith('/') && !cleaned.startsWith('//')) {
    return cleaned
  }
  if (cleaned.startsWith('#') || cleaned.startsWith('./')) {
    return cleaned
  }

  // Absolute URLs: allow only http, https, mailto, tel
  try {
    // Protocol-relative URLs like "//evil.com" should not be treated as relative
    if (cleaned.startsWith('//')) return '#'
    const parsed = new URL(cleaned, 'https://wingstravel.vn')
    const protocol = parsed.protocol.toLowerCase()
    const allowedProtocols = ['http:', 'https:', 'mailto:', 'tel:']
    if (allowedProtocols.includes(protocol)) {
      return cleaned
    }
    return '#'
  } catch {
    return '#'
  }
}
