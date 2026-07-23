const addHostVariants = (hosts: Set<string>, host: string) => {
  hosts.add(host)

  const withoutWWW = host.replace(/^www\./, '')
  hosts.add(withoutWWW)

  if (withoutWWW === host) {
    hosts.add(`www.${host}`)
  }
}

export const localBootstrapProductionHostMap: Record<string, string> = {
  'wingscare.local': 'wingscare.wingsgroup.vn',
  'wingspass.local': 'wingspass.wingsgroup.vn',
  'wingsside.local': 'wingside.vn',
}

export const internalSiteContextHeaderNames = [
  'x-client-ip',
  'x-request-id',
  'x-locale',
  'x-public-path',
  'x-site-code',
  'x-site-context-source',
  'x-site-host',
  'x-site-prefix',
] as const

type TrustedSiteContext = {
  clientIP?: null | string
  host: string
  locale?: null | string
  publicPath: string
  requestID?: string
  siteCode?: null | string
  sitePrefix?: null | string
}

/**
 * Public requests must never be allowed to provide WingsTravel's internal
 * tenant headers. The proxy calls this helper for every frontend request,
 * removes any client-supplied values, and then creates a fresh context.
 */
export const createTrustedSiteContextHeaders = (
  incomingHeaders: Headers,
  context: TrustedSiteContext,
): Headers => {
  const requestHeaders = new Headers(incomingHeaders)

  for (const headerName of internalSiteContextHeaderNames) {
    requestHeaders.delete(headerName)
  }

  requestHeaders.set('x-site-context-source', 'proxy')
  requestHeaders.set('x-site-host', normalizeHost(context.host) || '')
  requestHeaders.set('x-public-path', context.publicPath || '/')
  if (context.clientIP) {
    requestHeaders.set('x-client-ip', context.clientIP.slice(0, 128))
  }
  if (context.requestID) {
    requestHeaders.set('x-request-id', context.requestID)
  }

  if (context.locale) {
    requestHeaders.set('x-locale', context.locale)
  }

  if (context.siteCode) {
    requestHeaders.set('x-site-code', context.siteCode)
  }

  if (context.sitePrefix) {
    requestHeaders.set('x-site-prefix', context.sitePrefix)
  }

  return requestHeaders
}

export const normalizeHost = (host?: null | string): string | null => {
  if (!host) {
    return null
  }

  const firstHost = host.split(',')[0]?.trim()

  if (!firstHost) {
    return null
  }

  const normalizedInput = /^https?:\/\//i.test(firstHost) ? firstHost : `http://${firstHost}`

  try {
    return new URL(normalizedInput).hostname.toLowerCase()
  } catch {
    return firstHost.toLowerCase().split(':')[0]?.trim() || null
  }
}

export const domainCandidates = (domain?: null | string): string[] => {
  const normalized = normalizeHost(domain)

  if (!normalized) {
    return []
  }

  const hosts = new Set<string>()
  addHostVariants(hosts, normalized)

  for (const host of [...hosts]) {
    if (host.endsWith('.local')) {
      const productionHost = localBootstrapProductionHostMap[host] || host.replace(/\.local$/, '.vn')
      addHostVariants(hosts, productionHost)
    }
  }

  return [...hosts]
}

export const requestHostCandidates = (headers: Headers): string[] => {
  const hosts = new Set<string>()
  const trustedProxyHost =
    headers.get('x-site-context-source') === 'proxy' ? headers.get('x-site-host') : null

  for (const host of [trustedProxyHost, headers.get('host')]) {
    const normalized = normalizeHost(host)

    if (normalized) {
      addHostVariants(hosts, normalized)
    }
  }

  return [...hosts]
}
