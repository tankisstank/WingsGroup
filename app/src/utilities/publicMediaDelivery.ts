const HOST_PORT = /:\d+$/u

export const normalizePublicMediaHost = (value: string | null | undefined): string =>
  (value || '').trim().toLowerCase().replace(HOST_PORT, '').replace(/\.$/u, '')

export const isSafePublicMediaFilename = (value: unknown): value is string =>
  typeof value === 'string' &&
  value.length > 0 &&
  value.length <= 255 &&
  value !== '.' &&
  value !== '..' &&
  !/[\\/\u0000-\u001F\u007F]/u.test(value)

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
      mp4: 'video/mp4',
      png: 'image/png',
      svg: 'image/svg+xml',
      webm: 'video/webm',
      webp: 'image/webp',
    }[extension] || 'application/octet-stream'
  )
}

export interface ByteRange {
  start: number
  end: number
}

export type ParseRangeResult =
  | { type: 'range'; range: ByteRange }
  | { type: 'unsatisfiable' }
  | { type: 'ignore' }

/**
 * Parses HTTP single byte range according to RFC 9110 Section 14.1.2.
 * Invalid or multipart ranges return 'ignore' to fall back to a full 200 response.
 */
export const parseSingleByteRange = (
  rangeHeader: string | null | undefined,
  fileSize: number,
): ParseRangeResult => {
  if (!rangeHeader || typeof rangeHeader !== 'string') return { type: 'ignore' }
  const trimmed = rangeHeader.trim()
  if (!trimmed.startsWith('bytes=')) return { type: 'ignore' }

  const rangeSet = trimmed.slice(6).trim()
  // Servers are not required to support multipart/byteranges; serve full file per RFC 9110
  if (rangeSet.includes(',')) return { type: 'ignore' }

  // An empty file can never satisfy any byte range
  if (fileSize <= 0) return { type: 'unsatisfiable' }

  // Suffix byte range: bytes=-<suffix>
  if (rangeSet.startsWith('-')) {
    const suffixStr = rangeSet.slice(1).trim()
    if (!/^\d+$/u.test(suffixStr)) return { type: 'ignore' }
    const suffix = parseInt(suffixStr, 10)
    if (suffix <= 0) return { type: 'unsatisfiable' }
    const length = Math.min(suffix, fileSize)
    return {
      type: 'range',
      range: {
        start: fileSize - length,
        end: fileSize - 1,
      },
    }
  }

  const parts = rangeSet.split('-')
  if (parts.length !== 2) return { type: 'ignore' }

  const [startStr, endStr] = parts
  if (!/^\d+$/u.test(startStr)) return { type: 'ignore' }
  const start = parseInt(startStr, 10)

  // Open range: bytes=<start>-
  if (endStr === '') {
    if (start >= fileSize) return { type: 'unsatisfiable' }
    return {
      type: 'range',
      range: {
        start,
        end: fileSize - 1,
      },
    }
  }

  // Closed range: bytes=<start>-<end>
  if (!/^\d+$/u.test(endStr)) return { type: 'ignore' }
  const end = parseInt(endStr, 10)

  if (start > end || start >= fileSize) {
    return { type: 'unsatisfiable' }
  }

  return {
    type: 'range',
    range: {
      start,
      end: Math.min(end, fileSize - 1),
    },
  }
}
