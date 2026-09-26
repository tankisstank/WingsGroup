const HOST_PORT = /:\d+$/u

export const normalizePublicMediaHost = (value: string | null | undefined): string =>
  (value || '').trim().toLowerCase().replace(HOST_PORT, '').replace(/\.$/u, '')

export const isSafePublicMediaFilename = (value: unknown): value is string =>
  typeof value === 'string' &&
  value.length > 0 &&
  value.length <= 255 &&
  value !== '.' &&
  value !== '..' &&
  !value.includes('/') &&
  !value.includes('\\') &&
  !value.includes('\u0000') &&
  /^[A-Za-z0-9][A-Za-z0-9._-]*$/u.test(value)

export const isWingsGroupPublicHost = (
  requestHost: string | null | undefined,
  primaryDomain: string | null | undefined,
): boolean => {
  const host = normalizePublicMediaHost(requestHost)
  const configured = normalizePublicMediaHost(primaryDomain)
  return Boolean(host && configured && (host === configured || host === `www.${configured}`))
}

export const publicMediaContentType = (filename: string): string => {
  const extension = filename.slice(filename.lastIndexOf('.') + 1).toLowerCase()
  return (
    {
      avif: 'image/avif',
      gif: 'image/gif',
      jpeg: 'image/jpeg',
      jpg: 'image/jpeg',
      png: 'image/png',
      svg: 'image/svg+xml',
      webp: 'image/webp',
    }[extension] || 'application/octet-stream'
  )
}
