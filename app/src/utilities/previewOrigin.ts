const localhostOrLocalHostname = (hostname: string) =>
  hostname === 'localhost' || hostname.endsWith('.local') || hostname.endsWith('.localhost')

const configuredOrigins = () =>
  new Map(
    (process.env.PREVIEW_PUBLIC_ORIGINS || '')
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean)
      .flatMap((entry) => {
        const separator = entry.indexOf('=')
        if (separator < 1) return []

        const siteCode = entry.slice(0, separator).trim()
        const configuredOrigin = entry.slice(separator + 1).trim()
        if (!siteCode || !configuredOrigin) return []

        try {
          const origin = new URL(configuredOrigin.startsWith('http') ? configuredOrigin : `https://${configuredOrigin}`)
          if (
            origin.protocol !== 'https:' ||
            origin.pathname !== '/' ||
            origin.search ||
            origin.hash ||
            origin.username ||
            origin.password ||
            origin.port ||
            localhostOrLocalHostname(origin.hostname)
          ) return []

          return [[siteCode, origin.origin] as const]
        } catch {
          return []
        }
      }),
  )

/**
 * Resolves a child site's preview destination from deployment configuration,
 * rather than mutable CMS domain fields. This prevents a stale `.local` seed
 * domain (or a compromised Site record) from becoming a preview redirect.
 */
export const getProductionPreviewOrigin = (siteCode: string): string | null =>
  configuredOrigins().get(siteCode) || null

export const getProductionPreviewSiteCode = (host: string): string | null => {
  const normalizedHost = host.trim().toLowerCase().replace(/:\d+$/u, '')

  for (const [siteCode, origin] of configuredOrigins()) {
    if (new URL(origin).hostname === normalizedHost) return siteCode
  }

  return null
}
