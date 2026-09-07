import { draftMode, headers } from 'next/headers'

import { getLocaleFromPathname, getSiteAliasFromPathname } from './sitePaths'
import { getProductionPreviewSiteCode } from './previewOrigin'

export const PREVIEW_HANDOFF_COOKIE = '__wingstravel_preview_handoff'
export const PREVIEW_HANDOFF_TTL_SECONDS = 60

export type PreviewCollection = 'pages' | 'posts' | 'tour-campaigns' | 'tour-products'

type Claims = {
  collection: PreviewCollection
  documentID: string
  exp: number
  iat: number
  locale: string
  path: string
  siteCode: string
  version: 1
}

const encode = (value: Uint8Array) => {
  let binary = ''
  for (const byte of value) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/gu, '-').replace(/\//gu, '_').replace(/=+$/u, '')
}

const decode = (value: string): Uint8Array | null => {
  if (!/^[A-Za-z0-9_-]+$/u.test(value)) return null
  try {
    const padded = value.replace(/-/gu, '+').replace(/_/gu, '/')
    const binary = atob(`${padded}${'='.repeat((4 - (padded.length % 4)) % 4)}`)
    return Uint8Array.from(binary, (character) => character.charCodeAt(0))
  } catch {
    return null
  }
}

const secret = () => process.env.PREVIEW_HANDOFF_SECRET?.trim() || process.env.PAYLOAD_SECRET?.trim() || null

const key = async (usage: KeyUsage[]) => {
  const value = secret()
  if (!value || !globalThis.crypto?.subtle) return null
  return crypto.subtle.importKey('raw', new TextEncoder().encode(value), { hash: 'SHA-256', name: 'HMAC' }, false, usage)
}

const normalizePath = (path: string) => {
  if (!path.startsWith('/') || path.startsWith('//') || /[?#\\]/u.test(path)) return null
  const decoded = path.split('/').filter(Boolean)
  if (decoded.some((segment) => segment === '.' || segment === '..')) return null
  return path.replace(/\/+/gu, '/') || '/'
}

export const mintPreviewHandoff = async (input: Omit<Claims, 'exp' | 'iat' | 'version'>) => {
  const signingKey = await key(['sign'])
  const path = normalizePath(input.path)
  if (!signingKey || !path || !input.documentID || !input.siteCode || !input.locale) return null
  const iat = Math.floor(Date.now() / 1000)
  const claims: Claims = { ...input, path, exp: iat + PREVIEW_HANDOFF_TTL_SECONDS, iat, version: 1 }
  const payload = encode(new TextEncoder().encode(JSON.stringify(claims)))
  const signature = await crypto.subtle.sign('HMAC', signingKey, new TextEncoder().encode(`v1.${payload}`))
  return `v1.${payload}.${encode(new Uint8Array(signature))}`
}

export const verifyPreviewHandoff = async (token: string | null | undefined): Promise<Claims | null> => {
  if (!token || token.length > 4096) return null
  const [version, payload, signature] = token.split('.')
  const verificationKey = await key(['verify'])
  const signatureBytes = signature && decode(signature)
  if (version !== 'v1' || !payload || !signatureBytes || !verificationKey || token.split('.').length !== 3) return null
  if (!(await crypto.subtle.verify('HMAC', verificationKey, signatureBytes as BufferSource, new TextEncoder().encode(`v1.${payload}`)))) return null
  const decoded = decode(payload)
  if (!decoded) return null
  try {
    const claims = JSON.parse(new TextDecoder().decode(decoded)) as Partial<Claims>
    const now = Math.floor(Date.now() / 1000)
    if (
      claims.version !== 1 ||
      !['pages', 'posts', 'tour-campaigns', 'tour-products'].includes(claims.collection || '') ||
      typeof claims.documentID !== 'string' || !claims.documentID ||
      typeof claims.siteCode !== 'string' || !claims.siteCode ||
      typeof claims.locale !== 'string' || !claims.locale ||
      typeof claims.path !== 'string' || !normalizePath(claims.path) ||
      typeof claims.iat !== 'number' || typeof claims.exp !== 'number' ||
      claims.iat > now + 5 || claims.exp <= now || claims.exp - claims.iat <= 0 || claims.exp - claims.iat > PREVIEW_HANDOFF_TTL_SECONDS
    ) return null
    return claims as Claims
  } catch {
    return null
  }
}

const readCookie = (header: string | null, name: string) =>
  header?.split(';').map((item) => item.trim()).find((item) => item.startsWith(`${name}=`))?.slice(name.length + 1) || null

/** True only for a server-issued, current-host handoff bound to this public path. */
export const hasAuthorizedPreviewHandoff = async (): Promise<boolean> => {
  const requestHeaders = await headers()
  const claims = await verifyPreviewHandoff(readCookie(requestHeaders.get('cookie'), PREVIEW_HANDOFF_COOKIE))
  if (!claims) return false
  const path = requestHeaders.get('x-public-path') || '/'
  const alias = getSiteAliasFromPathname(path)
  const locale = getLocaleFromPathname(path) || 'vi'
  const publicPath = path.split('/').filter(Boolean).slice(alias ? (getLocaleFromPathname(path) ? 2 : 1) : getLocaleFromPathname(path) ? 1 : 0)
  const normalizedPublicPath = `/${publicPath.join('/')}`.replace(/\/$/u, '') || '/'
  return (
    claims.siteCode === requestHeaders.get('x-site-code') &&
    claims.locale === locale &&
    claims.path === normalizedPublicPath
  )
}

/** Draft mode alone is insufficient: all draft reads require this scoped grant. */
export const isAuthorizedDraftMode = async (): Promise<boolean> =>
  (await draftMode()).isEnabled && (await hasAuthorizedPreviewHandoff())

/**
 * Live Preview is rendered in Payload's cross-domain iframe. Only a valid,
 * expiring handoff may relax the normal same-origin frame policy, and only
 * when the iframe was initiated by the production CMS origin.
 */
export const isAuthorizedPreviewFrameRequest = async ({
  headers: requestHeaders,
  host,
  pathname,
}: {
  headers: Headers
  host: string | null
  pathname: string
}): Promise<boolean> => {
  if (process.env.NODE_ENV !== 'production' || !host) return false

  const referer = requestHeaders.get('referer')
  if (!referer) return false

  try {
    if (new URL(referer).origin !== 'https://wingsgroup.vn') return false
  } catch {
    return false
  }

  const siteCode = getProductionPreviewSiteCode(host)
  const claims = await verifyPreviewHandoff(readCookie(requestHeaders.get('cookie'), PREVIEW_HANDOFF_COOKIE))

  return Boolean(claims && siteCode && claims.siteCode === siteCode && claims.path === normalizePath(pathname))
}
