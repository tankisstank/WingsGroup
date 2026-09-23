import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  config,
  isCacheablePublicPageRequest,
  proxy,
  PUBLIC_PAGE_CACHE_CONTROL,
} from '@/proxy'
import { createTrustedSiteContextHeaders, SITE_CONTEXT_TTL_SECONDS } from '@/utilities/siteDomains'
import {
  mintWingsGroupLocalPreviewGrant,
  WINGSGROUP_LOCAL_PREVIEW_GRANT_COOKIE,
} from '@/wingsgroup/localPreview'
import { loadMultisiteAuditInventory } from '../helpers/multisiteAuditInventory'

const overriddenRequestHeaders = (response: Response): Headers => {
  const headers = new Headers()
  const names = response.headers.get('x-middleware-override-headers')?.split(',') || []

  for (const name of names) {
    const value = response.headers.get(`x-middleware-request-${name}`)
    if (value !== null) headers.set(name, value)
  }

  return headers
}

const localPreviewCookie = async (): Promise<string> => {
  vi.stubEnv('LOCAL_PREVIEW_GRANT_SECRET', 'proxy-test-preview-secret')
  const grant = await mintWingsGroupLocalPreviewGrant({
    draftCookie: 'development-id',
    locale: 'vi',
    siteCode: 'wings-group',
    userID: 'proxy-user',
  })
  if (!grant) throw new Error('Test preview grant was not minted')
  return `${WINGSGROUP_LOCAL_PREVIEW_GRANT_COOKIE}=${grant}; __prerender_bypass=development-id`
}

describe('tenant proxy rewrites', () => {
  const multisiteInventory = loadMultisiteAuditInventory()

  beforeEach(() => {
    vi.stubEnv('SITE_CONTEXT_SECRET', 'proxy-test-context-secret')
  })

  it('runs the signed tenant-context proxy for the WingsGo catalog API', () => {
    expect(config.matcher).toContain('/api/wingsgo/tour-catalog')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  const signedAliasHeaders = async (): Promise<Headers> =>
    createTrustedSiteContextHeaders(new Headers({ host: 'localhost:3100' }), {
      host: 'localhost',
      publicPath: '/wingsgo',
      requestID: 'proxy-test-request',
      siteCode: 'wings-go',
      sitePrefix: '/wingsgo',
    })

  it('permanently redirects the legacy WingSide alias before tenant rewrite', async () => {
    const response = await proxy(
      new NextRequest(
        'http://localhost:3100/wingsside/it/destinations/ha-noi?source=legacy&campaign=summer',
        { headers: { host: 'localhost:3100' } },
      ),
    )

    expect(response.status).toBe(308)
    expect(response.headers.get('location')).toBe(
      'http://localhost:3100/wing-side/it/destinations/ha-noi?source=legacy&campaign=summer',
    )
    expect(response.headers.get('x-middleware-rewrite')).toBeNull()
  })

  it('bootstraps Vietnamese Payload admin locale with one same-route redirect', async () => {
    const initialResponse = await proxy(
      new NextRequest('http://localhost:3100/admin/login?returnTo=%2Fadmin%2Fconsole', {
        headers: { host: 'localhost:3100' },
      }),
    )

    expect(initialResponse.status).toBe(307)
    expect(initialResponse.headers.get('location')).toBe(
      'http://localhost:3100/admin/login?returnTo=%2Fadmin%2Fconsole',
    )
    expect(initialResponse.headers.get('set-cookie')).toContain('payload-lng=vi')
    expect(initialResponse.headers.get('cache-control')).toBe(
      'private, no-cache, no-store, max-age=0, must-revalidate',
    )

    const settledResponse = await proxy(
      new NextRequest('http://localhost:3100/admin/login?returnTo=%2Fadmin%2Fconsole', {
        headers: { cookie: 'payload-lng=vi', host: 'localhost:3100' },
      }),
    )

    expect(settledResponse.status).toBe(200)
    expect(settledResponse.headers.get('x-middleware-next')).toBe('1')
  })

  it('only enables shared caching for anonymous production public document requests', () => {
    vi.stubEnv('NODE_ENV', 'production')
    try {
      expect(
        isCacheablePublicPageRequest(
          new NextRequest('https://wingsgroup.vn/tin-tuc', { headers: { host: 'wingsgroup.vn' } }),
        ),
      ).toBe(true)
      expect(
        isCacheablePublicPageRequest(
          new NextRequest('https://wingsgroup.vn/tin-tuc', {
            headers: { cookie: '__prerender_bypass=preview', host: 'wingsgroup.vn' },
          }),
        ),
      ).toBe(false)
      expect(
        isCacheablePublicPageRequest(
          new NextRequest('https://wingsgroup.vn/api/health/live', {
            headers: { host: 'wingsgroup.vn' },
          }),
        ),
      ).toBe(false)
      expect(
        isCacheablePublicPageRequest(
          new NextRequest('https://wingsgroup.vn/admin', { headers: { host: 'wingsgroup.vn' } }),
        ),
      ).toBe(false)
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('removes no-store for anonymous production pages without enabling shared caching', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    try {
      const response = await proxy(
        new NextRequest('https://wingsgroup.vn/tin-tuc', { headers: { host: 'wingsgroup.vn' } }),
      )

      expect(response.headers.get('cache-control')).toBe(PUBLIC_PAGE_CACHE_CONTROL)
      expect(response.headers.get('cache-control')).not.toContain('no-store')
      expect(response.headers.get('cache-control')).toContain('private')
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('preserves the trusted tenant bundle when Next processes the rewrite destination', async () => {
    const publicResponse = await proxy(
      new NextRequest('http://localhost:3100/wing-side', {
        headers: { host: 'localhost:3100' },
      }),
    )
    const rewrittenHeaders = overriddenRequestHeaders(publicResponse)

    expect(publicResponse.headers.get('x-middleware-rewrite')).toBe('http://localhost:3100/')
    expect(rewrittenHeaders.get('x-site-code')).toBe('wing-side')
    expect(rewrittenHeaders.get('x-public-path')).toBe('/wing-side')

    const internalResponse = await proxy(
      new NextRequest('http://localhost:3100/', {
        headers: rewrittenHeaders,
      }),
    )
    const serverComponentHeaders = overriddenRequestHeaders(internalResponse)

    expect(internalResponse.headers.get('x-middleware-next')).toBe('1')
    expect(serverComponentHeaders.get('x-site-code')).toBe('wing-side')
    expect(serverComponentHeaders.get('x-site-prefix')).toBe('/wing-side')
    expect(serverComponentHeaders.get('x-public-path')).toBe('/wing-side')
  })

  it('rebuilds an inconsistent client-supplied tenant bundle', async () => {
    const response = await proxy(
      new NextRequest('http://localhost:3100/', {
        headers: {
          host: 'localhost:3100',
          'x-public-path': '/wing-side/not-the-current-route',
          'x-site-code': 'wing-side',
          'x-site-context-source': 'proxy',
          'x-site-host': 'localhost',
          'x-site-prefix': '/wing-side',
        },
      }),
    )
    const rebuiltHeaders = overriddenRequestHeaders(response)

    expect(rebuiltHeaders.get('x-site-code')).toBeNull()
    expect(rebuiltHeaders.get('x-site-prefix')).toBeNull()
    expect(rebuiltHeaders.get('x-public-path')).toBe('/')
  })

  it('derives the local preview client context without browser edge headers', async () => {
    const response = await proxy(
      new NextRequest('http://localhost:3100/api/lead-submissions', {
        headers: {
          cookie: await localPreviewCookie(),
          host: 'localhost:3100',
        },
      }),
    )

    expect(overriddenRequestHeaders(response).get('x-client-ip')).toBe('127.0.0.1')
  })

  it('ignores forged edge headers on local preview requests', async () => {
    const response = await proxy(
      new NextRequest('http://localhost:3100/api/lead-submissions', {
        headers: {
          cookie: await localPreviewCookie(),
          host: 'localhost:3100',
          'x-client-ip': '198.51.100.99',
          'x-real-ip': '198.51.100.98',
          'x-site-code': 'wings-care',
          'x-site-context-source': 'proxy',
          'x-site-host': 'wingscare.wingsgroup.vn',
        },
      }),
    )
    const headers = overriddenRequestHeaders(response)

    expect(headers.get('x-client-ip')).toBe('127.0.0.1')
    expect(headers.get('x-site-code')).toBeNull()
    expect(headers.get('x-site-host')).toBe('localhost')
  })

  it('does not derive a local preview context in production', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    try {
      const response = await proxy(
        new NextRequest('http://localhost:3100/api/lead-submissions', {
          headers: {
            cookie: '__prerender_bypass=development-id',
            host: 'localhost:3100',
            'x-real-ip': '198.51.100.98',
          },
        }),
      )

      expect(overriddenRequestHeaders(response).get('x-client-ip')).toBeNull()
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('preserves locale-only context for its internal rewrite destination', async () => {
    const publicResponse = await proxy(
      new NextRequest('http://localhost:3100/it/search', {
        headers: { host: 'localhost:3100' },
      }),
    )
    const rewrittenHeaders = overriddenRequestHeaders(publicResponse)
    const internalResponse = await proxy(
      new NextRequest('http://localhost:3100/search', {
        headers: rewrittenHeaders,
      }),
    )
    const serverComponentHeaders = overriddenRequestHeaders(internalResponse)

    expect(serverComponentHeaders.get('x-locale')).toBe('it')
    expect(serverComponentHeaders.get('x-public-path')).toBe('/it/search')
    expect(serverComponentHeaders.get('x-site-code')).toBeNull()
  })

  it('preserves locale-only public-host context when Next rewrites to a local dev listener', async () => {
    const publicResponse = await proxy(
      new NextRequest('http://wingscare.wingsgroup.vn:3100/en', {
        headers: { host: '127.0.0.1:3100' },
      }),
    )
    const rewrittenHeaders = overriddenRequestHeaders(publicResponse)
    const internalResponse = await proxy(
      new NextRequest('http://localhost:3100/', {
        headers: rewrittenHeaders,
      }),
    )
    const serverComponentHeaders = overriddenRequestHeaders(internalResponse)

    expect(serverComponentHeaders.get('x-locale')).toBe('en')
    expect(serverComponentHeaders.get('x-site-host')).toBe('wingscare.wingsgroup.vn')
    expect(serverComponentHeaders.get('x-public-path')).toBe('/en')
  })

  it('preserves a local alias bundle when Next switches localhost and 127.0.0.1 internally', async () => {
    const publicResponse = await proxy(
      new NextRequest('http://127.0.0.1:3100/wing-side/en/destinations/ha-noi', {
        headers: { host: '127.0.0.1:3100' },
      }),
    )
    const rewrittenHeaders = overriddenRequestHeaders(publicResponse)
    const internalResponse = await proxy(
      new NextRequest('http://localhost:3100/destinations/ha-noi', {
        headers: rewrittenHeaders,
      }),
    )
    const serverComponentHeaders = overriddenRequestHeaders(internalResponse)

    expect(serverComponentHeaders.get('x-site-code')).toBe('wing-side')
    expect(serverComponentHeaders.get('x-site-prefix')).toBe('/wing-side/en')
    expect(serverComponentHeaders.get('x-public-path')).toBe('/wing-side/en/destinations/ha-noi')
    expect(serverComponentHeaders.get('x-locale')).toBe('en')
  })

  it('rejects a self-consistent unsigned alias bundle', async () => {
    const response = await proxy(
      new NextRequest('http://localhost:3100/', {
        headers: {
          host: 'localhost:3100',
          'x-public-path': '/wing-side',
          'x-site-code': 'wing-side',
          'x-site-context-source': 'proxy',
          'x-site-host': 'localhost',
          'x-site-prefix': '/wing-side',
        },
      }),
    )
    const headers = overriddenRequestHeaders(response)

    expect(headers.get('x-site-code')).toBeNull()
    expect(headers.get('x-site-prefix')).toBeNull()
    expect(headers.get('x-site-host')).toBe('localhost')
  })

  it('fails closed for missing, forged, and altered context signatures', async () => {
    const valid = await signedAliasHeaders()
    const cases = [
      ['missing', (headers: Headers) => headers.delete('x-site-context-signature')],
      ['forged', (headers: Headers) => headers.set('x-site-context-signature', 'forged')],
      ['altered', (headers: Headers) => headers.set('x-site-prefix', '/wingsgo/altered')],
    ] as const

    for (const [label, alter] of cases) {
      const headers = new Headers(valid)
      alter(headers)
      const response = await proxy(
        new NextRequest('http://localhost:3100/', {
          headers,
        }),
      )

      expect(overriddenRequestHeaders(response).get('x-site-code'), label).toBeNull()
      expect(overriddenRequestHeaders(response).get('x-site-prefix'), label).toBeNull()
    }
  })

  it('rejects an expired signed context', async () => {
    vi.useFakeTimers()
    try {
      const headers = await signedAliasHeaders()
      vi.advanceTimersByTime((SITE_CONTEXT_TTL_SECONDS + 1) * 1000)

      const response = await proxy(
        new NextRequest('http://localhost:3100/', {
          headers,
        }),
      )

      expect(overriddenRequestHeaders(response).get('x-site-code')).toBeNull()
      expect(overriddenRequestHeaders(response).get('x-site-prefix')).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it('consumes a signed context once at the internal rewrite boundary', async () => {
    const headers = await signedAliasHeaders()
    const firstResponse = await proxy(
      new NextRequest('http://localhost:3100/', {
        headers,
      }),
    )
    const firstHeaders = overriddenRequestHeaders(firstResponse)
    expect(firstHeaders.get('x-site-code')).toBe('wings-go')

    const replayResponse = await proxy(
      new NextRequest('http://localhost:3100/', {
        headers,
      }),
    )
    const replayHeaders = overriddenRequestHeaders(replayResponse)
    expect(replayHeaders.get('x-site-code')).toBeNull()
    expect(replayHeaders.get('x-site-prefix')).toBeNull()
  })

  it('routes a preserved tenant media destination through governed Payload handling', async () => {
    const publicResponse = await proxy(
      new NextRequest('http://localhost:3100/wingsgo/media/e09-pending.jpg', {
        headers: { host: 'localhost:3100' },
      }),
    )
    const rewrittenHeaders = overriddenRequestHeaders(publicResponse)
    const internalResponse = await proxy(
      new NextRequest('http://localhost:3100/media/e09-pending.jpg', {
        headers: rewrittenHeaders,
      }),
    )

    expect(internalResponse.headers.get('x-middleware-rewrite')).toBe(
      'http://localhost:3100/api/media/file/e09-pending.jpg',
    )
  })

  it('preserves the trusted tenant bundle for the governed media API destination', async () => {
    const publicResponse = await proxy(
      new NextRequest('http://localhost:3100/wingsgo/media/e09-pending.jpg', {
        headers: { host: 'localhost:3100' },
      }),
    )
    const rewrittenHeaders = overriddenRequestHeaders(publicResponse)
    const internalResponse = await proxy(
      new NextRequest('http://localhost:3100/api/media/file/e09-pending.jpg', {
        headers: rewrittenHeaders,
      }),
    )
    const internalHeaders = overriddenRequestHeaders(internalResponse)

    expect(internalResponse.headers.get('x-middleware-next')).toBe('1')
    expect(internalHeaders.get('x-public-path')).toBe('/wingsgo/media/e09-pending.jpg')
    expect(internalHeaders.get('x-site-code')).toBe('wings-go')
  })

  it('preserves the trusted bundle for canonical-host media API destinations', async () => {
    const publicResponse = await proxy(
      new NextRequest('https://wingsgroup.vn/media/e09-pending.jpg', {
        headers: { host: 'wingsgroup.vn' },
      }),
    )
    const rewrittenHeaders = overriddenRequestHeaders(publicResponse)
    const internalResponse = await proxy(
      new NextRequest('https://wingsgroup.vn/api/media/file/e09-pending.jpg', {
        headers: rewrittenHeaders,
      }),
    )
    const internalHeaders = overriddenRequestHeaders(internalResponse)

    expect(internalResponse.headers.get('x-middleware-next')).toBe('1')
    expect(internalHeaders.get('x-public-path')).toBe('/media/e09-pending.jpg')
    expect(internalHeaders.get('x-site-code')).toBeNull()
  })

  it('prefers a public browser hostname over a local dev listener host when they differ', async () => {
    const response = await proxy(
      new NextRequest('http://wingscare.wingsgroup.vn:3100/en', {
        headers: {
          host: '127.0.0.1:3100',
        },
      }),
    )
    const headers = overriddenRequestHeaders(response)

    expect(headers.get('x-site-host')).toBe('wingscare.wingsgroup.vn')
    expect(headers.get('x-locale')).toBe('en')
    expect(response.headers.get('x-middleware-rewrite')).toBe(
      'http://wingscare.wingsgroup.vn:3100/',
    )
  })

  it('prefers the tenant Host over a 0.0.0.0 standalone listener host', async () => {
    const response = await proxy(
      new NextRequest('http://0.0.0.0:4519/', {
        headers: { host: 'wingsgroup.local:4519' },
      }),
    )

    expect(overriddenRequestHeaders(response).get('x-site-host')).toBe('wingsgroup.local')
  })

  it('does not treat a client Host of 0.0.0.0 as a local production tenant', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    try {
      const response = await proxy(
        new NextRequest('http://wingsgroup.local:4519/', {
          headers: { host: '0.0.0.0:4519' },
        }),
      )
      const headers = overriddenRequestHeaders(response)

      expect(headers.get('x-site-host')).toBe('0.0.0.0')
      expect(headers.get('x-site-code')).toBeNull()
      expect(headers.get('x-client-ip')).toBeNull()
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('returns 404 for CMS-only locales on every public host in the multisite inventory', async () => {
    for (const site of multisiteInventory.sites) {
      const nestedPath = Object.values(site.nestedRouteSamples)[0] || '/'

      for (const host of site.hosts) {
        const response = await proxy(
          new NextRequest(`https://${host}/ja${nestedPath === '/' ? '' : nestedPath}`, {
            headers: { host },
          }),
        )

        expect(response.status, `${site.name} on ${host}`).toBe(404)
      }
    }
  })

  it('redirects each public default-locale prefix to its canonical unprefixed URL', async () => {
    for (const site of multisiteInventory.sites) {
      for (const host of site.hosts) {
        const response = await proxy(
          new NextRequest(`https://${host}/${site.defaultLocale}/sample-route`, {
            headers: { host },
          }),
        )

        expect(response.status, `${site.name} on ${host}`).toBe(308)
        expect(response.headers.get('location'), `${site.name} on ${host}`).toBe(
          `https://${host}/sample-route`,
        )
      }
    }
  })

  it('returns 404 for every local site alias on public hosts', async () => {
    for (const site of multisiteInventory.sites) {
      const sampleLocale = site.publicLocales[0] || site.defaultLocale
      const nestedPath =
        site.nestedRouteSamples[sampleLocale] || Object.values(site.nestedRouteSamples)[0] || '/'

      for (const host of site.hosts) {
        const aliasedPath = `/${site.localAlias}/${sampleLocale}${nestedPath === '/' ? '' : nestedPath}`
        const response = await proxy(
          new NextRequest(`https://${host}${aliasedPath}`, {
            headers: { host },
          }),
        )

        expect(response.status, `${site.name} alias leaked on ${host}`).toBe(404)
      }
    }
  })

  it('keeps every local alias available on localhost bootstrap hosts', async () => {
    for (const site of multisiteInventory.sites) {
      const sampleLocale = site.publicLocales[0] || site.defaultLocale
      const nestedPath =
        site.nestedRouteSamples[sampleLocale] || Object.values(site.nestedRouteSamples)[0] || '/'
      const publicPath = `/${site.localAlias}/${sampleLocale}${nestedPath === '/' ? '' : nestedPath}`
      const response = await proxy(
        new NextRequest(`http://localhost:3100${publicPath}`, {
          headers: { host: 'localhost:3100' },
        }),
      )

      expect(response.status, `${site.name} alias unavailable on localhost`).toBe(200)
      expect(response.headers.get('x-middleware-rewrite')).toContain(
        nestedPath === '/' ? '/' : nestedPath,
      )
    }
  })
})
