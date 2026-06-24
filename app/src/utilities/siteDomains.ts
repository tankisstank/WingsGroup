const addHostVariants = (hosts: Set<string>, host: string) => {
  hosts.add(host)

  const withoutWWW = host.replace(/^www\./, '')
  hosts.add(withoutWWW)

  if (withoutWWW === host) {
    hosts.add(`www.${host}`)
  }
}

const legacyLocalProductionHosts: Record<string, string> = {
  'wingscare.local': 'wingscare.wingsgroup.vn',
  'wingspass.local': 'wingspass.wingsgroup.vn',
  'wingsside.local': 'wingside.vn',
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
      const productionHost = legacyLocalProductionHosts[host] || host.replace(/\.local$/, '.vn')
      addHostVariants(hosts, productionHost)
    }
  }

  return [...hosts]
}

export const requestHostCandidates = (headers: Headers): string[] => {
  const hosts = new Set<string>()

  for (const headerName of ['x-forwarded-host', 'host']) {
    const normalized = normalizeHost(headers.get(headerName))

    if (normalized) {
      addHostVariants(hosts, normalized)
    }
  }

  return [...hosts]
}
