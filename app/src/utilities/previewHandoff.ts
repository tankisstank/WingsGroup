import { draftMode, headers } from 'next/headers'

import {
  allSiteAliasToCodeMap,
  defaultSiteCode,
  getLocaleFromPathname,
  getSiteAliasFromPathname,
  isPublicLocale,
  isSupportedLocale,
} from './sitePaths'
import { hasValidTrustedSiteContext } from './siteDomains'
import { getProductionPreviewOrigin, getProductionPreviewSiteCode } from './previewOrigin'

export const PREVIEW_HANDOFF_COOKIE = '__wingstravel_preview_handoff'
export const PREVIEW_HANDOFF_TTL_SECONDS = 60

export type PreviewCollection = 'pages' | 'posts' | 'tour-campaigns' | 'tour-products'
export type PreviewMode = 'draft' | 'published'

export type PreviewHandoffClaims = {
  collection: PreviewCollection
  defaultLocale: string
  documentID: string
  exp: number
  iat: number
  locale: string
  mode: PreviewMode
  path: string
  siteCode: string
  version: 1
}

type MintPreviewHandoffInput = Omit<
  PreviewHandoffClaims,
  'defaultLocale' | 'exp' | 'iat' | 'mode' | 'version'
> & {
  defaultLocale?: string
  mode?: PreviewMode
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

const secret = () =>
  process.env.PREVIEW_HANDOFF_SECRET?.trim() || process.env.PAYLOAD_SECRET?.trim() || null

const key = async (usage: KeyUsage[]) => {
  const value = secret()
  if (!value || !globalThis.crypto?.subtle) return null
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(value),
    { hash: 'SHA-256', name: 'HMAC' },
    false,
    usage,
  )
}

export const normalizePreviewPath = (path: string): string | null => {
  if (
    !path ||
    path.length > 2048 ||
    !path.startsWith('/') ||
    path.startsWith('//') ||
    /[?#\\]/u.test(path)
  ) {
    return null
  }

  const normalized = path.replace(/\/+/gu, '/')
  const segments = normalized.split('/').filter(Boolean)
  for (const segment of segments) {
    let decodedSegment = segment
    try {
      decodedSegment = decodeURIComponent(segment)
      if (decodedSegment.includes('%')) decodedSegment = decodeURIComponent(decodedSegment)
    } catch {
      return null
    }

    if (
      decodedSegment === '.' ||
      decodedSegment === '..' ||
      decodedSegment.includes('/') ||
      decodedSegment.includes('\\') ||
      /[?#]/u.test(decodedSegment)
    ) {
      return null
    }
  }

  return normalized === '/' ? normalized : normalized.replace(/\/+$/u, '') || '/'
}

export const mintPreviewHandoff = async (input: MintPreviewHandoffInput) => {
  const signingKey = await key(['sign'])
  const path = normalizePreviewPath(input.path)
  const defaultLocale = input.defaultLocale || 'vi'
  const mode = input.mode || 'draft'
  if (
    !signingKey ||
    !path ||
    !input.documentID ||
    !input.siteCode ||
    !isPublicLocale(input.locale) ||
    !isPublicLocale(defaultLocale) ||
    !isSupportedLocale(defaultLocale) ||
    (mode !== 'draft' && mode !== 'published')
  ) {
    return null
  }

  const iat = Math.floor(Date.now() / 1000)
  const claims: PreviewHandoffClaims = {
    collection: input.collection,
    defaultLocale,
    documentID: input.documentID,
    exp: iat + PREVIEW_HANDOFF_TTL_SECONDS,
    iat,
    locale: input.locale,
    mode,
    path,
    siteCode: input.siteCode,
    version: 1,
  }
  const payload = encode(new TextEncoder().encode(JSON.stringify(claims)))
  const signature = await crypto.subtle.sign(
    'HMAC',
    signingKey,
    new TextEncoder().encode(`v1.${payload}`),
  )
  return `v1.${payload}.${encode(new Uint8Array(signature))}`
}

export const verifyPreviewHandoff = async (
  token: string | null | undefined,
): Promise<PreviewHandoffClaims | null> => {
  if (!token || token.length > 4096) return null
  const [version, payload, signature] = token.split('.')
  const verificationKey = await key(['verify'])
  const signatureBytes = signature && decode(signature)
  if (
    version !== 'v1' ||
    !payload ||
    !signatureBytes ||
    !verificationKey ||
    token.split('.').length !== 3
  ) {
    return null
  }
  if (
    !(await crypto.subtle.verify(
      'HMAC',
      verificationKey,
      signatureBytes as BufferSource,
      new TextEncoder().encode(`v1.${payload}`),
    ))
  ) {
    return null
  }
  const decoded = decode(payload)
  if (!decoded) return null
  try {
    const claims = JSON.parse(new TextDecoder().decode(decoded)) as Partial<PreviewHandoffClaims>
    const now = Math.floor(Date.now() / 1000)
    const defaultLocale = claims.defaultLocale || claims.locale
    const mode = claims.mode || 'draft'
    const { exp, iat, locale } = claims
    if (
      typeof iat !== 'number' ||
      typeof exp !== 'number' ||
      !Number.isSafeInteger(iat) ||
      !Number.isSafeInteger(exp)
    ) {
      return null
    }

    if (
      claims.version !== 1 ||
      !['pages', 'posts', 'tour-campaigns', 'tour-products'].includes(claims.collection || '') ||
      typeof claims.documentID !== 'string' ||
      !claims.documentID ||
      typeof claims.siteCode !== 'string' ||
      !claims.siteCode ||
      !isPublicLocale(locale) ||
      !isPublicLocale(defaultLocale) ||
      !isSupportedLocale(defaultLocale) ||
      (mode !== 'draft' && mode !== 'published') ||
      typeof claims.path !== 'string' ||
      !normalizePreviewPath(claims.path) ||
      iat > now + 5 ||
      exp <= now ||
      exp - iat <= 0 ||
      exp - iat > PREVIEW_HANDOFF_TTL_SECONDS
    ) {
      return null
    }

    return {
      collection: claims.collection as PreviewCollection,
      defaultLocale: defaultLocale as string,
      documentID: claims.documentID,
      exp,
      iat,
      locale: locale as string,
      mode: mode as PreviewMode,
      path: normalizePreviewPath(claims.path) as string,
      siteCode: claims.siteCode,
      version: 1,
    }
  } catch {
    return null
  }
}

const readCookie = (header: string | null, name: string) =>
  header
    ?.split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`))
    ?.slice(name.length + 1) || null

export type PreviewPathIdentity = {
  locale: string | null
  path: string
}

/** Remove only the known local site alias and public locale from a request path. */
export const getPreviewPathIdentity = (pathname: string): PreviewPathIdentity | null => {
  const normalizedPath = normalizePreviewPath(pathname)
  if (!normalizedPath) return null

  const segments = normalizedPath.split('/').filter(Boolean)
  const siteAlias = getSiteAliasFromPathname(normalizedPath)
  const locale = getLocaleFromPathname(normalizedPath)
  const offset = (siteAlias ? 1 : 0) + (locale ? 1 : 0)

  return {
    locale,
    path: normalizePreviewPath(`/${segments.slice(offset).join('/')}`) || '/',
  }
}

const getRequestSiteCode = async (
  requestHeaders: Headers,
  pathname: string,
): Promise<string | null> => {
  const siteAlias = getSiteAliasFromPathname(pathname)
  if (siteAlias) {
    const aliasSiteCode = allSiteAliasToCodeMap[siteAlias]
    if (aliasSiteCode) return aliasSiteCode
  }

  const trustedContext = await hasValidTrustedSiteContext(requestHeaders)
  if (trustedContext) {
    const hostSiteCode = getProductionPreviewSiteCode(requestHeaders.get('x-site-host') || '')
    if (hostSiteCode) return hostSiteCode

    const contextSiteCode = requestHeaders.get('x-site-code')
    if (contextSiteCode) return contextSiteCode
  }

  const host = requestHeaders.get('host') || ''
  if (host.split(':')[0] === 'localhost' || host.split(':')[0] === '127.0.0.1') {
    return defaultSiteCode
  }

  return null
}

const getAuthorizedPreviewHandoff = async (): Promise<PreviewHandoffClaims | null> => {
  const requestHeaders = await headers()
  const claims = await verifyPreviewHandoff(
    readCookie(requestHeaders.get('cookie'), PREVIEW_HANDOFF_COOKIE),
  )
  if (!claims) return null

  const path = requestHeaders.get('x-public-path') || '/'
  const identity = getPreviewPathIdentity(path)
  if (!identity) return null

  const requestSiteCode = await getRequestSiteCode(requestHeaders, path)
  const requestLocale = identity.locale || claims.defaultLocale
  if (
    claims.siteCode !== requestSiteCode ||
    claims.locale !== requestLocale ||
    claims.path !== identity.path
  ) {
    return null
  }

  return claims
}

/** True only for a server-issued, current-host handoff bound to this public path. */
export const hasAuthorizedPreviewHandoff = async (): Promise<boolean> =>
  Boolean(await getAuthorizedPreviewHandoff())

/** Draft mode alone is insufficient: all draft reads require this scoped grant. */
export const isAuthorizedDraftMode = async (): Promise<boolean> =>
  (await draftMode()).isEnabled && (await getAuthorizedPreviewHandoff())?.mode === 'draft'

const getTrustedCMSOrigins = (): Set<string> => {
  const values = (process.env.PREVIEW_CMS_ORIGINS || 'https://wingsgroup.vn')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
  const origins = new Set<string>()

  for (const value of values) {
    try {
      const origin = new URL(value).origin
      if (new URL(value).protocol === 'https:') origins.add(origin)
    } catch {
      // Invalid deployment configuration is ignored; no permissive origin is added.
    }
  }

  return origins
}

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

  const siteCode = getProductionPreviewSiteCode(host)
  const expectedPreviewOrigin = siteCode
    ? getProductionPreviewOrigin(siteCode)
    : null

  try {
    const refererURL = new URL(referer)
    const isTrustedCMSReferer = getTrustedCMSOrigins().has(refererURL.origin)
    const isTrustedPreviewContinuation =
      expectedPreviewOrigin !== null && refererURL.origin === expectedPreviewOrigin
    if (!isTrustedCMSReferer && !isTrustedPreviewContinuation) return false
  } catch {
    return false
  }

  const claims = await verifyPreviewHandoff(
    readCookie(requestHeaders.get('cookie'), PREVIEW_HANDOFF_COOKIE),
  )
  const identity = getPreviewPathIdentity(pathname)

  return Boolean(
    claims &&
      siteCode &&
      identity &&
      claims.siteCode === siteCode &&
      claims.locale === (identity.locale || claims.defaultLocale) &&
      claims.path === identity.path,
  )
}
