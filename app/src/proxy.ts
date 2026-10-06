import { NextResponse, type NextRequest } from 'next/server'

import {
  allSiteAliasToCodeMap,
  getCanonicalSiteAlias,
  getLocaleFromPathname,
  getSiteAliasFromPathname,
} from '@/utilities/sitePaths'
import { isPublicLocale } from '@/utilities/locales'
import {
  createTrustedSiteContextHeaders,
  hasValidTrustedSiteContext,
  normalizeHost,
} from '@/utilities/siteDomains'
import { hasWingsGroupLocalPreviewGrant } from '@/wingsgroup/localPreview'
import { isAuthorizedPreviewFrameRequest } from '@/utilities/previewHandoff'

const stripLeadingSegments = (pathname: string, count: number) => {
  const segments = pathname.split('/').filter(Boolean)
  const stripped = segments.slice(count).join('/')

  return stripped ? `/${stripped}` : '/'
}

const localBootstrapHosts = new Set(['127.0.0.1', '::1', 'localhost'])
const localListenerHosts = new Set(['0.0.0.0', ...localBootstrapHosts])
const adminLocale = 'vi'
const adminLocaleCookie = 'payload-lng'
export const PUBLIC_PAGE_CACHE_CONTROL =
  'private, max-age=0, must-revalidate'
const SENSITIVE_PUBLIC_PATH_PREFIXES = ['/admin', '/api', '/media', '/next'] as const
// The edge cannot query Payload safely on every request. Keep this small
// public-routing contract aligned with the seeded production domains; tenant
// content and metadata still use the Site record as the source of truth.
const defaultLocaleByPublicHost: Record<string, string> = {
  'wingscare.wingsgroup.vn': 'vi',
  'wingsgo.vn': 'vi',
  'wingsgroup.vn': 'vi',
  'wingspass.wingsgroup.vn': 'vi',
  'wingsplus.vn': 'vi',
  'wingside.vn': 'en',
}
const wingsGoPublicHosts = new Set(['wingsgo.vn', 'www.wingsgo.vn'])

const isLocalDevelopmentHost = (host: null | string) =>
  Boolean(host && (localBootstrapHosts.has(host) || host.endsWith('.local')))

const isLocalListenerHost = (host: null | string) =>
  Boolean(host && (localListenerHosts.has(host) || host.endsWith('.local')))

/**
 * Dynamic route rendering is required for tenant and preview resolution, which
 * makes Next emit `no-store` by default. Shared caching is safe only for an
 * anonymous document request: a preview, Payload session, or any other cookie
 * must always reach the origin instead of receiving a shared public variant.
 */
export const isCacheablePublicPageRequest = (request: NextRequest): boolean => {
  if (process.env.NODE_ENV !== 'production') return false
  if (!['GET', 'HEAD'].includes(request.method)) return false
  if (request.headers.has('authorization') || request.headers.has('cookie')) return false

  const pathname = request.nextUrl.pathname
  return !SENSITIVE_PUBLIC_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
}

const applyPublicPageCachePolicy = (request: NextRequest, response: NextResponse) => {
  if (!isCacheablePublicPageRequest(request)) return response

  response.headers.set('Cache-Control', PUBLIC_PAGE_CACHE_CONTROL)
  // The App Router owns its final Vary header, so an application-level
  // `Vary: Cookie` cannot safely protect a shared CDN cache here. Private
  // caching removes the BFCache-blocking `no-store` without sharing content
  // between preview/authenticated and anonymous sessions.
  return response
}

const resolvePermanentTourRedirect = async (request: NextRequest, effectiveHost: string | null): Promise<NextResponse | null> => {
  const pathname = request.nextUrl.pathname
  if (!wingsGoPublicHosts.has(effectiveHost || '') || !pathname.startsWith('/tour/') || pathname === '/tour/') return null

  const endpoint = new URL('/api/redirects', request.url)
  if (request.headers.get('x-forwarded-proto')) {
    endpoint.protocol = 'http:'
    endpoint.hostname = '127.0.0.1'
    endpoint.port = '3000'
  }
  endpoint.searchParams.set('where[from][equals]', pathname)
  endpoint.searchParams.set('depth', '0')
  endpoint.searchParams.set('limit', '1')

  try {
    const response = await fetch(endpoint, {
      cache: 'no-store',
      headers: { accept: 'application/json' },
    })
    if (!response.ok) return null

    const body = (await response.json()) as {
      docs?: Array<{ to?: { url?: string | null }; type?: string | null }>
    }
    const redirect = body.docs?.[0]
    if (redirect?.type !== '301' || !redirect.to?.url) return null

    const destination = new URL(redirect.to.url, request.url)
    if (!['http:', 'https:'].includes(destination.protocol) || destination.href === request.url) return null

    return NextResponse.redirect(destination, 301)
  } catch {
    // A lookup failure must leave the normal CMS route available.
    return null
  }
}

const isServerOwnedLocalDraftPreview = async (
  request: NextRequest,
  effectiveHost: null | string,
  siteCode: null | string,
  locale: null | string,
): Promise<boolean> =>
  process.env.NODE_ENV !== 'production' &&
  isLocalDevelopmentHost(effectiveHost) &&
  (await hasWingsGroupLocalPreviewGrant({
    headers: request.headers,
    host: effectiveHost,
    locale,
    siteCode,
  }))

const notFoundResponse = () =>
  new NextResponse('Not Found', {
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'text/plain; charset=utf-8',
    },
    status: 404,
  })

const resolveEffectiveHost = (request: NextRequest): string | null => {
  const headerHost = normalizeHost(request.headers.get('host'))
  const urlHost = normalizeHost(request.nextUrl.hostname)

  if (headerHost && urlHost && headerHost !== urlHost) {
    if (isLocalDevelopmentHost(headerHost) && !isLocalListenerHost(urlHost)) {
      return urlHost
    }

    if (isLocalListenerHost(urlHost) && !isLocalDevelopmentHost(headerHost)) {
      return headerHost
    }
  }

  return headerHost || urlHost
}

const isEquivalentPreservedHost = (preservedHost: null | string, currentHost: null | string) => {
  if (!preservedHost || !currentHost) {
    return false
  }

  if (preservedHost === currentHost) {
    return true
  }

  if (!isLocalDevelopmentHost(preservedHost) && isLocalDevelopmentHost(currentHost)) {
    return true
  }

  return localBootstrapHosts.has(preservedHost) && localBootstrapHosts.has(currentHost)
}

const getPreservedRewriteContext = async (request: NextRequest): Promise<Headers | null> => {
  if (request.headers.get('x-site-context-source') !== 'proxy') return null

  const publicPath = request.headers.get('x-public-path')
  const publicAlias = publicPath ? getSiteAliasFromPathname(publicPath) : null
  const publicLocale = publicPath ? getLocaleFromPathname(publicPath) : null

  if (publicAlias === 'wingsside') return null

  const expectedSiteCode = publicAlias ? allSiteAliasToCodeMap[publicAlias] : null
  const isCanonicalMediaPath = publicPath?.startsWith('/media/') === true
  const expectedPath = publicPath
    ? isCanonicalMediaPath
      ? publicPath
      : stripLeadingSegments(publicPath, publicAlias ? (publicLocale ? 2 : 1) : 1)
    : null
  const isExpectedRewritePath =
    expectedPath === request.nextUrl.pathname ||
    (expectedPath?.startsWith('/media/') === true &&
      request.nextUrl.pathname === `/api/public-media/${expectedPath.slice('/media/'.length)}`)
  const isCanonicalMediaRewrite =
    isCanonicalMediaPath && isExpectedRewritePath
  const currentHost = resolveEffectiveHost(request)

  // Next invokes Proxy again for the internal rewrite destination. Preserve
  // only a context that is self-consistent with the original public alias,
  // the rewritten pathname and the effective host. A client-supplied header
  // bundle on an ordinary request fails these checks and is rebuilt below.
  if (
    (!publicAlias && !publicLocale && !isCanonicalMediaRewrite) ||
    !isExpectedRewritePath ||
    !isEquivalentPreservedHost(request.headers.get('x-site-host'), currentHost) ||
    (publicAlias
      ? request.headers.get('x-site-code') !== expectedSiteCode
      : request.headers.has('x-site-code') || request.headers.has('x-site-prefix')) ||
    (publicLocale && request.headers.get('x-locale') !== publicLocale)
  ) {
    return null
  }

  if (!(await hasValidTrustedSiteContext(request.headers, { consumeReplayToken: true }))) {
    return null
  }

  return new Headers(request.headers)
}

const isMediaPath = (pathname: string): boolean =>
  pathname === '/media' || pathname.startsWith('/media/')

const getMediaFilename = (pathname: string): string | null => {
  if (!isMediaPath(pathname)) return null

  const filename = pathname.slice('/media/'.length)
  if (
    !filename ||
    filename === '.' ||
    filename === '..' ||
    filename.includes('/') ||
    filename.includes('\\')
  ) {
    return ''
  }

  return filename
}

const rewriteMediaRequest = (request: NextRequest, requestHeaders: Headers): NextResponse => {
  const filename = getMediaFilename(request.nextUrl.pathname)
  if (!filename) return notFoundResponse()

  const url = request.nextUrl.clone()
  url.pathname = `/api/public-media/${filename}`
  const response = NextResponse.rewrite(url, {
    request: {
      headers: requestHeaders,
    },
  })
  const requestID = requestHeaders.get('x-request-id')
  if (requestID) response.headers.set('X-Request-ID', requestID)
  return response
}

export async function proxy(request: NextRequest) {
  // Payload resolves its native Admin translation during the request from
  // `payload-lng`. A client-side cookie write happens too late for the login
  // shell, so bootstrap it with one same-URL redirect before Payload renders.
  // This is an operator-UI preference only: it never changes CMS content
  // locale, which continues to be explicit in editor and REST calls.
  if (
    (request.nextUrl.pathname === '/admin' || request.nextUrl.pathname.startsWith('/admin/')) &&
    request.cookies.get(adminLocaleCookie)?.value !== adminLocale
  ) {
    const response = NextResponse.redirect(request.nextUrl)
    response.headers.set('Cache-Control', 'private, no-cache, no-store, max-age=0, must-revalidate')
    response.cookies.set(adminLocaleCookie, adminLocale, {
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
      sameSite: 'lax',
    })
    return response
  }

  const effectiveHost = resolveEffectiveHost(request)
  const forwardedHost = normalizeHost(request.headers.get('x-forwarded-host'))
  const redirectHost = wingsGoPublicHosts.has(effectiveHost || '')
    ? effectiveHost
    : forwardedHost
  const permanentTourRedirect = await resolvePermanentTourRedirect(request, redirectHost)
  if (permanentTourRedirect) return permanentTourRedirect

  const preservedRewriteContext = await getPreservedRewriteContext(request)

  if (preservedRewriteContext) {
    if (isMediaPath(request.nextUrl.pathname)) {
      return rewriteMediaRequest(request, preservedRewriteContext)
    }

    const response = NextResponse.next({ request: { headers: preservedRewriteContext } })
    const requestID = preservedRewriteContext.get('x-request-id')
    if (requestID) response.headers.set('X-Request-ID', requestID)
    return applyPublicPageCachePolicy(request, response)
  }

  const requestID = crypto.randomUUID()
  const siteAlias = getSiteAliasFromPathname(request.nextUrl.pathname)
  const locale = getLocaleFromPathname(request.nextUrl.pathname)
  if (siteAlias === 'wingsside') {
    const url = request.nextUrl.clone()
    const segments = url.pathname.split('/').filter(Boolean)
    segments[0] = getCanonicalSiteAlias(siteAlias) || siteAlias
    url.pathname = `/${segments.join('/')}`

    return NextResponse.redirect(url, 308)
  }

  // Site aliases are a local multisite development contract. They must not
  // become alternate public production URLs (or tenant-selection inputs).
  if (siteAlias && !isLocalDevelopmentHost(effectiveHost)) {
    return notFoundResponse()
  }

  // CMS-enabled locales may exist in Payload, but only public-enabled locales
  // are routable/indexable on the public surface. Fail closed before the
  // locale is stripped and accidentally served as the default homepage.
  if (locale && !isPublicLocale(locale)) {
    return notFoundResponse()
  }

  const canonicalHost = effectiveHost?.replace(/^www\./u, '') || null
  const defaultLocale = canonicalHost ? defaultLocaleByPublicHost[canonicalHost] : null

  if (!siteAlias && locale && locale === defaultLocale) {
    const url = request.nextUrl.clone()
    url.pathname = stripLeadingSegments(request.nextUrl.pathname, 1)
    return NextResponse.redirect(url, 308)
  }

  const siteCode = siteAlias ? allSiteAliasToCodeMap[siteAlias] : null
  const sitePrefix = siteAlias ? `/${siteAlias}${locale ? `/${locale}` : ''}` : null
  const localDraftPreview = await isServerOwnedLocalDraftPreview(
    request,
    effectiveHost,
    siteAlias ? allSiteAliasToCodeMap[siteAlias] : null,
    locale,
  )
  const requestHeaders = await createTrustedSiteContextHeaders(request.headers, {
    // A direct local Next server has no deployment edge. Its preview context is
    // therefore derived from the server-observed local host and the signed,
    // expiring grant minted by /next/preview, never from browser-supplied
    // draft-cookie or X-Real-IP/X-Client-IP values. On deployed hosts, only
    // the edge-overwritten X-Real-IP is promoted.
    clientIP: localDraftPreview
      ? '127.0.0.1'
      : isLocalDevelopmentHost(effectiveHost)
        ? null
        : request.headers.get('x-real-ip'),
    // Tenant selection is intentionally based on the effective HTTP Host. In
    // local/E2E deployments Next's URL can retain the listener hostname even
    // when the request Host targets a real tenant domain. Forwarded host is
    // deliberately ignored here; the deployment edge must normalize Host.
    host: effectiveHost || request.nextUrl.hostname,
    locale,
    publicPath: request.nextUrl.pathname,
    requestID,
    siteCode,
    sitePrefix,
  })
  const previewFrame = await isAuthorizedPreviewFrameRequest({
    headers: request.headers,
    host: effectiveHost,
    pathname: request.nextUrl.pathname,
  })
  const withRequestID = (response: NextResponse) => {
    response.headers.set('X-Request-ID', requestID)
    if (previewFrame) {
      response.headers.delete('X-Frame-Options')
      response.headers.set('Content-Security-Policy', "frame-ancestors 'self' https://wingsgroup.vn")
      const reportOnlyCSP = response.headers.get('Content-Security-Policy-Report-Only')
      if (reportOnlyCSP) {
        response.headers.set(
          'Content-Security-Policy-Report-Only',
          reportOnlyCSP.replace("frame-ancestors 'self'", "frame-ancestors 'self' https://wingsgroup.vn"),
        )
      }
    }
    return applyPublicPageCachePolicy(request, response)
  }

  // Route public media through the context-preserving application handler. Do
  // not use Payload's native file endpoint here: its static-file access check
  // receives a local request without the original route params/headers.
  if (isMediaPath(request.nextUrl.pathname)) {
    return withRequestID(rewriteMediaRequest(request, requestHeaders))
  }

  if (!siteAlias) {
    if (!locale) {
      return withRequestID(
        NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        }),
      )
    }

    const url = request.nextUrl.clone()
    url.pathname = stripLeadingSegments(request.nextUrl.pathname, 1)

    return withRequestID(
      NextResponse.rewrite(url, {
        request: {
          headers: requestHeaders,
        },
      }),
    )
  }

  const url = request.nextUrl.clone()
  url.pathname = stripLeadingSegments(request.nextUrl.pathname, locale ? 2 : 1)

  return withRequestID(
    NextResponse.rewrite(url, {
      request: {
        headers: requestHeaders,
      },
    }),
  )
}

export const config = {
  matcher: [
    '/api/lead-submissions',
    '/api/public-media/:path*',
    // The catalog endpoint resolves the tenant through the proxy-signed host
    // context just like server-rendered public pages. Keep this explicit: the
    // catch-all intentionally excludes all other APIs.
    '/api/wingsgo/tour-catalog',
    '/((?!api|_next/static|_next/image|favicon.ico|favicon.svg).*)',
  ],
}
