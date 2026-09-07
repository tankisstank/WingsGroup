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
  'x-site-context-issued-at',
  'x-site-context-expires-at',
  'x-site-context-nonce',
  'x-site-context-signature',
] as const

export const SITE_CONTEXT_TTL_SECONDS = 30

const maximumConsumedSiteContextNonces = 4096
const consumedSiteContextNonces = new Map<string, number>()

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
const base64urlEncode = (value: Uint8Array): string => {
  let binary = ''
  for (const byte of value) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/gu, '-').replace(/\//gu, '_').replace(/=+$/u, '')
}

const base64urlDecode = (value: string): Uint8Array | null => {
  if (!/^[A-Za-z0-9_-]+$/u.test(value)) return null

  try {
    const padded = value.replace(/-/gu, '+').replace(/_/gu, '/')
    const binary = atob(`${padded}${'='.repeat((4 - (padded.length % 4)) % 4)}`)
    return Uint8Array.from(binary, (character) => character.charCodeAt(0))
  } catch {
    return null
  }
}

const getSiteContextSecret = (): string | null =>
  process.env.SITE_CONTEXT_SECRET?.trim() || process.env.PAYLOAD_SECRET?.trim() || null

const importSiteContextKey = async (
  secret: string,
  usage: KeyUsage[],
): Promise<CryptoKey | null> => {
  const cryptoAPI = globalThis.crypto
  if (!cryptoAPI?.subtle) return null

  return cryptoAPI.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { hash: 'SHA-256', name: 'HMAC' },
    false,
    usage,
  )
}

const siteContextSigningPayload = (headers: Headers): string =>
  [
    normalizeHost(headers.get('x-site-host')) || '',
    headers.get('x-public-path') || '/',
    headers.get('x-locale') || '',
    headers.get('x-site-code') || '',
    headers.get('x-site-prefix') || '',
    headers.get('x-request-id') || '',
    headers.get('x-site-context-issued-at') || '',
    headers.get('x-site-context-expires-at') || '',
    headers.get('x-site-context-nonce') || '',
  ].join('\n')

const signSiteContext = async (headers: Headers): Promise<string | null> => {
  const secret = getSiteContextSecret()
  const cryptoAPI = globalThis.crypto
  const key = secret && (await importSiteContextKey(secret, ['sign']))
  if (!cryptoAPI?.subtle || !key) return null

  const signature = await cryptoAPI.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(siteContextSigningPayload(headers)),
  )
  return base64urlEncode(new Uint8Array(signature))
}

const consumeSiteContextNonce = (nonce: string, expiresAt: number): boolean => {
  const now = Math.floor(Date.now() / 1000)

  for (const [consumedNonce, consumedExpiresAt] of consumedSiteContextNonces) {
    if (consumedExpiresAt <= now) consumedSiteContextNonces.delete(consumedNonce)
  }

  if (consumedSiteContextNonces.has(nonce)) return false

  consumedSiteContextNonces.set(nonce, expiresAt)
  while (consumedSiteContextNonces.size > maximumConsumedSiteContextNonces) {
    const oldestNonce = consumedSiteContextNonces.keys().next().value
    if (!oldestNonce) break
    consumedSiteContextNonces.delete(oldestNonce)
  }

  return true
}

export const hasValidTrustedSiteContext = async (
  headers: Headers,
  { consumeReplayToken = false }: { consumeReplayToken?: boolean } = {},
): Promise<boolean> => {
  if (headers.get('x-site-context-source') !== 'proxy') return false

  const issuedAt = Number(headers.get('x-site-context-issued-at'))
  const expiresAt = Number(headers.get('x-site-context-expires-at'))
  const nonce = headers.get('x-site-context-nonce') || ''
  const now = Math.floor(Date.now() / 1000)
  if (
    !Number.isSafeInteger(issuedAt) ||
    !Number.isSafeInteger(expiresAt) ||
    !nonce ||
    issuedAt > now + 5 ||
    expiresAt <= now ||
    expiresAt - issuedAt <= 0 ||
    expiresAt - issuedAt > SITE_CONTEXT_TTL_SECONDS
  ) {
    return false
  }

  const secret = getSiteContextSecret()
  const cryptoAPI = globalThis.crypto
  const key = secret && (await importSiteContextKey(secret, ['verify']))
  const signature = base64urlDecode(headers.get('x-site-context-signature') || '')
  if (!cryptoAPI?.subtle || !key || !signature) return false

  const validSignature = await cryptoAPI.subtle.verify(
    'HMAC',
    key,
    signature as BufferSource,
    new TextEncoder().encode(siteContextSigningPayload(headers)),
  )

  return validSignature && (!consumeReplayToken || consumeSiteContextNonce(nonce, expiresAt))
}

export const createTrustedSiteContextHeaders = async (
  incomingHeaders: Headers,
  context: TrustedSiteContext,
): Promise<Headers> => {
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

  const issuedAt = Math.floor(Date.now() / 1000)
  requestHeaders.set('x-site-context-issued-at', String(issuedAt))
  requestHeaders.set('x-site-context-expires-at', String(issuedAt + SITE_CONTEXT_TTL_SECONDS))
  requestHeaders.set('x-site-context-nonce', crypto.randomUUID())

  const signature = await signSiteContext(requestHeaders)
  if (signature) requestHeaders.set('x-site-context-signature', signature)

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
      const productionHost =
        localBootstrapProductionHostMap[host] || host.replace(/\.local$/, '.vn')
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
