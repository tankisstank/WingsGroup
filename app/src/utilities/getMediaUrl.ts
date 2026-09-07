/**
 * Processes media resource URL to ensure proper formatting
 * @param url The original URL from the resource
 * @param cacheTag Optional cache tag to append to the URL
 * @returns Properly formatted URL with cache tag if provided
 *
 * Payload's internal file endpoint is normalized to the public `/media/`
 * route so the proxy can establish trusted site context and enforce the
 * publication gate. Local paths are kept relative so
 * Next.js image optimization treats them as local rather than fetching
 * through `remotePatterns`, which blocks private IPs since Next.js 16.
 */
export const normalizePublicMediaURL = (url: string | null | undefined): string => {
  if (!url) return ''

  const payloadFilePrefix = '/api/media/file/'

  return url.startsWith(payloadFilePrefix) ? `/media/${url.slice(payloadFilePrefix.length)}` : url
}

export const getMediaUrl = (url: string | null | undefined, cacheTag?: string | null): string => {
  const publicURL = normalizePublicMediaURL(url)
  if (!publicURL) return ''

  if (cacheTag && cacheTag !== '') {
    cacheTag = encodeURIComponent(cacheTag)
  }

  if (!cacheTag) return publicURL

  const [urlWithoutHash, hash = ''] = publicURL.split('#', 2)
  const separator = urlWithoutHash.includes('?') ? '&' : '?'

  return `${urlWithoutHash}${separator}${cacheTag}${hash ? `#${hash}` : ''}`
}
