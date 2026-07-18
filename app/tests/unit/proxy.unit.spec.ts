import { NextRequest } from 'next/server'
import { describe, expect, it } from 'vitest'

import { proxy } from '@/proxy'
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

describe('tenant proxy rewrites', () => {
  const multisiteInventory = loadMultisiteAuditInventory()

  it('preserves the trusted tenant bundle when Next processes the rewrite destination', () => {
    const publicResponse = proxy(
      new NextRequest('http://localhost:3100/wingsside', {
        headers: { host: 'localhost:3100' },
      }),
    )
    const rewrittenHeaders = overriddenRequestHeaders(publicResponse)

    expect(publicResponse.headers.get('x-middleware-rewrite')).toBe('http://localhost:3100/')
    expect(rewrittenHeaders.get('x-site-code')).toBe('wings-side')
    expect(rewrittenHeaders.get('x-public-path')).toBe('/wingsside')

    const internalResponse = proxy(
      new NextRequest('http://localhost:3100/', {
        headers: rewrittenHeaders,
      }),
    )
    const serverComponentHeaders = overriddenRequestHeaders(internalResponse)

    expect(internalResponse.headers.get('x-middleware-next')).toBe('1')
    expect(serverComponentHeaders.get('x-site-code')).toBe('wings-side')
    expect(serverComponentHeaders.get('x-site-prefix')).toBe('/wingsside')
    expect(serverComponentHeaders.get('x-public-path')).toBe('/wingsside')
  })

  it('rebuilds an inconsistent client-supplied tenant bundle', () => {
    const response = proxy(
      new NextRequest('http://localhost:3100/', {
        headers: {
          host: 'localhost:3100',
          'x-public-path': '/wingsside/not-the-current-route',
          'x-site-code': 'wings-side',
          'x-site-context-source': 'proxy',
          'x-site-host': 'localhost',
          'x-site-prefix': '/wingsside',
        },
      }),
    )
    const rebuiltHeaders = overriddenRequestHeaders(response)

    expect(rebuiltHeaders.get('x-site-code')).toBeNull()
    expect(rebuiltHeaders.get('x-site-prefix')).toBeNull()
    expect(rebuiltHeaders.get('x-public-path')).toBe('/')
  })

  it('preserves locale-only context for its internal rewrite destination', () => {
    const publicResponse = proxy(
      new NextRequest('http://localhost:3100/it/search', {
        headers: { host: 'localhost:3100' },
      }),
    )
    const rewrittenHeaders = overriddenRequestHeaders(publicResponse)
    const internalResponse = proxy(
      new NextRequest('http://localhost:3100/search', {
        headers: rewrittenHeaders,
      }),
    )
    const serverComponentHeaders = overriddenRequestHeaders(internalResponse)

    expect(serverComponentHeaders.get('x-locale')).toBe('it')
    expect(serverComponentHeaders.get('x-public-path')).toBe('/it/search')
    expect(serverComponentHeaders.get('x-site-code')).toBeNull()
  })

  it('preserves locale-only public-host context when Next rewrites to a local dev listener', () => {
    const publicResponse = proxy(
      new NextRequest('http://wingscare.wingsgroup.vn:3100/en', {
        headers: { host: '127.0.0.1:3100' },
      }),
    )
    const rewrittenHeaders = overriddenRequestHeaders(publicResponse)
    const internalResponse = proxy(
      new NextRequest('http://localhost:3100/', {
        headers: rewrittenHeaders,
      }),
    )
    const serverComponentHeaders = overriddenRequestHeaders(internalResponse)

    expect(serverComponentHeaders.get('x-locale')).toBe('en')
    expect(serverComponentHeaders.get('x-site-host')).toBe('wingscare.wingsgroup.vn')
    expect(serverComponentHeaders.get('x-public-path')).toBe('/en')
  })

  it('preserves a local alias bundle when Next switches localhost and 127.0.0.1 internally', () => {
    const publicResponse = proxy(
      new NextRequest('http://127.0.0.1:3100/wingsside/en/destinations/ha-noi', {
        headers: { host: '127.0.0.1:3100' },
      }),
    )
    const rewrittenHeaders = overriddenRequestHeaders(publicResponse)
    const internalResponse = proxy(
      new NextRequest('http://localhost:3100/destinations/ha-noi', {
        headers: rewrittenHeaders,
      }),
    )
    const serverComponentHeaders = overriddenRequestHeaders(internalResponse)

    expect(serverComponentHeaders.get('x-site-code')).toBe('wings-side')
    expect(serverComponentHeaders.get('x-site-prefix')).toBe('/wingsside/en')
    expect(serverComponentHeaders.get('x-public-path')).toBe('/wingsside/en/destinations/ha-noi')
    expect(serverComponentHeaders.get('x-locale')).toBe('en')
  })

  it('bounds a self-consistent alias bundle to the same local alias identity', () => {
    // A second Proxy invocation and a direct local request are indistinguishable.
    // Preserving this bundle cannot escalate production tenancy: getCurrentSite
    // remains host-first outside development and rejects host/code mismatches.
    const response = proxy(
      new NextRequest('http://localhost:3100/', {
        headers: {
          host: 'localhost:3100',
          'x-public-path': '/wingsside',
          'x-site-code': 'wings-side',
          'x-site-context-source': 'proxy',
          'x-site-host': 'localhost',
          'x-site-prefix': '/wingsside',
        },
      }),
    )
    const headers = overriddenRequestHeaders(response)

    expect(headers.get('x-site-code')).toBe('wings-side')
    expect(headers.get('x-site-prefix')).toBe('/wingsside')
    expect(headers.get('x-site-host')).toBe('localhost')
  })

  it('prefers a public browser hostname over a local dev listener host when they differ', () => {
    const response = proxy(
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

  it('returns 404 for CMS-only locales on every public host in the multisite inventory', () => {
    for (const site of multisiteInventory.sites) {
      const nestedPath =
        Object.values(site.nestedRouteSamples)[0] || '/'

      for (const host of site.hosts) {
        const response = proxy(
          new NextRequest(`https://${host}/ja${nestedPath === '/' ? '' : nestedPath}`, {
            headers: { host },
          }),
        )

        expect(response.status, `${site.name} on ${host}`).toBe(404)
      }
    }
  })

  it('returns 404 for every local site alias on public hosts', () => {
    for (const site of multisiteInventory.sites) {
      const sampleLocale = site.publicLocales[0] || site.defaultLocale
      const nestedPath =
        site.nestedRouteSamples[sampleLocale] ||
        Object.values(site.nestedRouteSamples)[0] ||
        '/'

      for (const host of site.hosts) {
        const aliasedPath = `/${site.localAlias}/${sampleLocale}${nestedPath === '/' ? '' : nestedPath}`
        const response = proxy(
          new NextRequest(`https://${host}${aliasedPath}`, {
            headers: { host },
          }),
        )

        expect(response.status, `${site.name} alias leaked on ${host}`).toBe(404)
      }
    }
  })

  it('keeps every local alias available on localhost bootstrap hosts', () => {
    for (const site of multisiteInventory.sites) {
      const sampleLocale = site.publicLocales[0] || site.defaultLocale
      const nestedPath =
        site.nestedRouteSamples[sampleLocale] ||
        Object.values(site.nestedRouteSamples)[0] ||
        '/'
      const publicPath = `/${site.localAlias}/${sampleLocale}${nestedPath === '/' ? '' : nestedPath}`
      const response = proxy(
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
