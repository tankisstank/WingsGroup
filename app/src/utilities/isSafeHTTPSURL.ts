export const isSafeHTTPSURL = (value: unknown): value is string => {
  if (typeof value !== 'string' || /[\\\u0000-\u001f\u007f]/u.test(value)) return false

  const href = value.trim()
  if (!/^https:\/\/[^/]/i.test(href)) return false

  try {
    const url = new URL(href)
    return url.protocol === 'https:' && Boolean(url.hostname) && !url.username && !url.password
  } catch {
    return false
  }
}
