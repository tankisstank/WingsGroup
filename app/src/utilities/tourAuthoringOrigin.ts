import { getTrustedCMSOrigins } from '@/utilities/previewHandoff'

export const normalizeOrigin = (value: string | null) => {
  if (!value) return null
  try {
    return new URL(value).origin
  } catch {
    return null
  }
}

export const sameOriginCookieMutation = (request: Request) => {
  if (!request.headers.get('cookie')) return true
  if (request.headers.get('sec-fetch-site') === 'cross-site') return false
  const expectedOrigins = new Set([
    normalizeOrigin(request.url),
    ...getTrustedCMSOrigins(),
  ].filter((origin): origin is string => origin !== null))
  const originHeader = request.headers.get('origin')
  if (originHeader !== null) {
    const origin = normalizeOrigin(originHeader)
    return origin !== null && expectedOrigins.has(origin)
  }
  const referer = request.headers.get('referer')
  if (!referer) return false
  const refererOrigin = normalizeOrigin(referer)
  return refererOrigin !== null && expectedOrigins.has(refererOrigin)
}
