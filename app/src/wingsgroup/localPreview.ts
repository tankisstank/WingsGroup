import type { Payload } from 'payload'
import { createLocalReq } from 'payload'

import { defaultSiteCode } from '@/utilities/sitePaths'

import { WINGSGROUP_LOCAL_DRAFT_PREVIEW_CONTEXT } from './corporateRoutes'

const localBootstrapHosts = new Set(['127.0.0.1', '::1', 'localhost'])

export const NEXT_DRAFT_MODE_COOKIE = '__prerender_bypass'
export const WINGSGROUP_LOCAL_PREVIEW_GRANT_COOKIE = '__wingsgroup_local_preview'
export const LOCAL_PREVIEW_GRANT_TTL_SECONDS = 5 * 60

type PreviewRequestLike = {
  context?: Record<string, unknown> | null
  headers?: Headers | null
  user?: unknown
}

type LocalPreviewGrantClaims = {
  draftCookie: string
  exp: number
  iat: number
  locale: string
  siteCode: string
  userID: string
  version: 1
}

type LocalPreviewGrantExpectations = {
  locale?: string | null
  siteCode?: string | null
  userID?: number | string | null
}

type GrantVerificationOptions = LocalPreviewGrantExpectations & {
  host?: string | null
  requireServerContext?: boolean
}

const normalizeHost = (value: string | null | undefined): string =>
  (value || '').trim().toLowerCase().split(':')[0] || ''

const isLocalHost = (headers: Headers | null | undefined): boolean => {
  if (!headers) return false
  const host = normalizeHost(headers.get('x-site-host') || headers.get('host'))
  return localBootstrapHosts.has(host) || host.endsWith('.local')
}

const isLocalHostValue = (value: string | null | undefined): boolean => {
  const host = normalizeHost(value)
  return localBootstrapHosts.has(host) || host.endsWith('.local')
}

const getCookie = (headers: Headers | null | undefined, name: string): string | null => {
  const cookieHeader = headers?.get('cookie')
  if (!cookieHeader) return null

  for (const part of cookieHeader.split(';')) {
    const separator = part.indexOf('=')
    if (separator < 0 || part.slice(0, separator).trim() !== name) continue

    const value = part.slice(separator + 1).trim()
    try {
      return decodeURIComponent(value)
    } catch {
      return null
    }
  }

  return null
}

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

const getGrantSecret = (): string | null => {
  const secret =
    process.env.LOCAL_PREVIEW_GRANT_SECRET?.trim() || process.env.PAYLOAD_SECRET?.trim()
  return secret || null
}

const importGrantKey = async (secret: string, usage: KeyUsage[]): Promise<CryptoKey | null> => {
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

const signGrantPayload = async (payload: string, secret: string): Promise<string | null> => {
  const cryptoAPI = globalThis.crypto
  const key = await importGrantKey(secret, ['sign'])
  if (!cryptoAPI?.subtle || !key) return null

  const signature = await cryptoAPI.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  return base64urlEncode(new Uint8Array(signature))
}

const parseGrantClaims = (payload: string): LocalPreviewGrantClaims | null => {
  const decoded = base64urlDecode(payload)
  if (!decoded) return null

  try {
    const parsed = JSON.parse(new TextDecoder().decode(decoded)) as Partial<LocalPreviewGrantClaims>
    if (
      parsed.version !== 1 ||
      typeof parsed.draftCookie !== 'string' ||
      parsed.draftCookie.length === 0 ||
      parsed.draftCookie.length > 512 ||
      typeof parsed.exp !== 'number' ||
      typeof parsed.iat !== 'number' ||
      typeof parsed.locale !== 'string' ||
      typeof parsed.siteCode !== 'string' ||
      typeof parsed.userID !== 'string'
    ) {
      return null
    }

    return parsed as LocalPreviewGrantClaims
  } catch {
    return null
  }
}

const readAndVerifyGrant = async (
  headers: Headers | null | undefined,
  options: GrantVerificationOptions = {},
): Promise<LocalPreviewGrantClaims | null> => {
  if (process.env.NODE_ENV === 'production') return null
  const requireServerContext = options.requireServerContext !== false
  if (
    !headers ||
    (requireServerContext &&
      (headers.get('x-site-context-source') !== 'proxy' ||
        headers.get('x-client-ip') !== '127.0.0.1' ||
        !isLocalHost(headers))) ||
    (!requireServerContext && !isLocalHostValue(options.host || headers.get('host')))
  ) {
    return null
  }

  const token = getCookie(headers, WINGSGROUP_LOCAL_PREVIEW_GRANT_COOKIE)
  const nextDraftCookie = getCookie(headers, NEXT_DRAFT_MODE_COOKIE)
  if (!token || !nextDraftCookie || token.length > 4096) return null

  const [version, payload, suppliedSignature] = token.split('.')
  if (version !== 'v1' || !payload || !suppliedSignature || token.split('.').length !== 3) {
    return null
  }

  const secret = getGrantSecret()
  const cryptoAPI = globalThis.crypto
  const key = secret && (await importGrantKey(secret, ['verify']))
  if (!cryptoAPI?.subtle || !key) return null

  const suppliedSignatureBytes = base64urlDecode(suppliedSignature)
  if (!suppliedSignatureBytes) return null

  const validSignature = await cryptoAPI.subtle.verify(
    'HMAC',
    key,
    suppliedSignatureBytes as BufferSource,
    new TextEncoder().encode(`${version}.${payload}`),
  )
  if (!validSignature) return null

  const claims = parseGrantClaims(payload)
  if (!claims) return null

  const now = Math.floor(Date.now() / 1000)
  if (
    claims.exp <= now ||
    claims.iat > now + 30 ||
    claims.exp - claims.iat <= 0 ||
    claims.exp - claims.iat > LOCAL_PREVIEW_GRANT_TTL_SECONDS ||
    claims.draftCookie !== nextDraftCookie
  ) {
    return null
  }

  const expectedSiteCode =
    options.siteCode ||
    (requireServerContext ? headers.get('x-site-code') : null) ||
    defaultSiteCode
  const headerLocale = requireServerContext ? headers.get('x-locale') : null
  if (
    claims.siteCode !== expectedSiteCode ||
    (headerLocale && claims.locale !== headerLocale) ||
    (options.locale && claims.locale !== options.locale) ||
    (options.userID !== undefined &&
      options.userID !== null &&
      claims.userID !== String(options.userID))
  ) {
    return null
  }

  return claims
}

export const mintWingsGroupLocalPreviewGrant = async ({
  draftCookie,
  locale,
  siteCode,
  userID,
}: {
  draftCookie: string
  locale: string
  siteCode: string
  userID: number | string
}): Promise<string | null> => {
  if (process.env.NODE_ENV === 'production') return null
  const secret = getGrantSecret()
  if (!secret || !draftCookie || !locale || !siteCode) return null

  const now = Math.floor(Date.now() / 1000)
  const claims: LocalPreviewGrantClaims = {
    draftCookie,
    exp: now + LOCAL_PREVIEW_GRANT_TTL_SECONDS,
    iat: now,
    locale,
    siteCode,
    userID: String(userID),
    version: 1,
  }
  const payload = base64urlEncode(new TextEncoder().encode(JSON.stringify(claims)))
  const signature = await signGrantPayload(`v1.${payload}`, secret)
  return signature ? `v1.${payload}.${signature}` : null
}

export const hasWingsGroupLocalDraftPreviewSignal = async ({
  context,
  headers,
}: Pick<PreviewRequestLike, 'context' | 'headers'>): Promise<boolean> =>
  Boolean(await readAndVerifyGrant(headers)) ||
  (process.env.NODE_ENV === 'production' &&
    (context?.[WINGSGROUP_LOCAL_DRAFT_PREVIEW_CONTEXT] === true ||
      (Boolean(headers?.get('x-site-context-source') === 'proxy') &&
        headers?.get('x-client-ip') === '127.0.0.1' &&
        isLocalHost(headers) &&
        Boolean(
          getCookie(headers, NEXT_DRAFT_MODE_COOKIE) ||
          getCookie(headers, WINGSGROUP_LOCAL_PREVIEW_GRANT_COOKIE),
        ))))

export const hasExplicitWingsGroupLocalDraftPreviewSignal = async ({
  headers,
  locale,
  siteCode,
  userID,
}: Pick<PreviewRequestLike, 'headers'> & LocalPreviewGrantExpectations): Promise<boolean> =>
  process.env.NODE_ENV !== 'production' &&
  Boolean(await readAndVerifyGrant(headers, { locale, siteCode, userID }))

export const hasWingsGroupLocalPreviewGrant = async ({
  headers,
  host,
  locale,
  siteCode,
}: {
  headers?: Headers | null
  host?: string | null
  locale?: string | null
  siteCode?: string | null
}): Promise<boolean> =>
  Boolean(
    await readAndVerifyGrant(headers, {
      host,
      locale,
      requireServerContext: false,
      siteCode,
    }),
  )

/**
 * Re-establish the signed local-preview context on server-side Payload reads.
 * Draft Mode itself is not a media authorization signal: the context only
 * exists after the loopback-only preview grant has been verified.
 */
export const createWingsGroupLocalPreviewPayloadReq = async ({
  headers,
  payload,
}: {
  headers: Headers
  payload: Payload
}) => {
  // Production's trusted loopback preview path is intentionally separate from
  // this disposable local fixture. Never synthesize an operator request from
  // a production draft cookie, even when the edge has normalized its headers.
  if (process.env.NODE_ENV === 'production') return undefined
  if (!(await hasWingsGroupLocalDraftPreviewSignal({ headers }))) return undefined

  const operators = await payload.find({
    collection: 'users',
    depth: 0,
    limit: 2,
    overrideAccess: true,
    pagination: false,
    where: { role: { equals: 'super-admin' } },
  })
  const operator = operators.docs[0]
  if (!operator) return undefined

  const req = await createLocalReq({ user: operator }, payload)
  req.context = {
    ...(req.context || {}),
    [WINGSGROUP_LOCAL_DRAFT_PREVIEW_CONTEXT]: true,
  }
  return req
}

export const isExplicitWingsGroupLocalDraftPreviewRequest = async ({
  context: _context,
  headers,
  locale,
  siteCode,
  user,
}: PreviewRequestLike & Omit<LocalPreviewGrantExpectations, 'userID'>): Promise<boolean> => {
  if (!user || typeof user !== 'object' || !('id' in user)) return false

  const userID = (user as { id?: number | string }).id
  if (userID === undefined || userID === null) return false

  return hasExplicitWingsGroupLocalDraftPreviewSignal({
    headers,
    locale,
    siteCode,
    userID,
  })
}

export const getRunOwnedPreviewLeadPath = (): string | null => {
  const configured = process.env.E09_PREVIEW_LEAD_PATH?.trim()
  if (!configured || process.env.NODE_ENV === 'production') return null
  if (!configured.startsWith('/tmp/') || configured.includes('\u0000')) return null
  return configured
}
