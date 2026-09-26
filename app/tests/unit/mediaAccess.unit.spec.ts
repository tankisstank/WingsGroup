import { describe, expect, it, vi } from 'vitest'

import { wingsGroupMediaReadAccess } from '@/access/siteScope'
import { createTrustedSiteContextHeaders } from '@/utilities/siteDomains'
import {
  hasExplicitWingsGroupLocalDraftPreviewSignal,
  hasWingsGroupLocalDraftPreviewSignal,
  mintWingsGroupLocalPreviewGrant,
  WINGSGROUP_LOCAL_PREVIEW_GRANT_COOKIE,
} from '@/wingsgroup/localPreview'
import { WINGSGROUP_LOCAL_DRAFT_PREVIEW_CONTEXT } from '@/wingsgroup/corporateRoutes'

const request = ({
  cookie,
  context = {},
  external = true,
  user,
}: {
  cookie?: string
  context?: Record<string, unknown>
  external?: boolean
  user?: {
    id?: number | string
    role: 'editor' | 'site-manager' | 'super-admin'
    sites?: Array<number | string>
  }
} = {}) => ({
  context,
  headers: new Headers({
    ...(cookie ? { cookie } : {}),
    ...(external ? { host: '127.0.0.1:4175' } : {}),
    'x-client-ip': '127.0.0.1',
    'x-site-context-source': 'proxy',
    'x-site-host': '127.0.0.1',
  }),
  user,
})

describe('WingsGroup media read access', () => {
  it('admits local draft preview only from server-derived context', async () => {
    const forged = new Headers({
      cookie: '__prerender_bypass=run-owned-preview',
      host: '127.0.0.1:4175',
      'x-site-host': '127.0.0.1',
    })
    const trusted = new Headers({
      cookie: '__prerender_bypass=run-owned-preview',
      host: '127.0.0.1:4175',
      'x-client-ip': '127.0.0.1',
      'x-site-context-source': 'proxy',
      'x-site-host': '127.0.0.1',
    })

    expect(await hasWingsGroupLocalDraftPreviewSignal({ headers: forged })).toBe(false)
    expect(await hasWingsGroupLocalDraftPreviewSignal({ headers: trusted })).toBe(false)

    vi.stubEnv('NODE_ENV', 'production')
    try {
      expect(await hasWingsGroupLocalDraftPreviewSignal({ headers: trusted })).toBe(true)
      expect(await hasExplicitWingsGroupLocalDraftPreviewSignal({ headers: trusted })).toBe(false)
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('returns only governed published media gates to anonymous readers', async () => {
    const result = await wingsGroupMediaReadAccess({ req: request({ external: false }) } as never)

    expect(result).toMatchObject({
      or: expect.arrayContaining([
        expect.objectContaining({
          and: expect.arrayContaining([{ 'governance.publicationState': { equals: 'published' } }]),
        }),
      ]),
    })
  })

  it('rejects raw or forged anonymous media requests', async () => {
    await expect(wingsGroupMediaReadAccess({ req: request() } as never)).resolves.toBe(false)
  })

  it('scopes public media files to the signed proxy tenant context', async () => {
    vi.stubEnv('SITE_CONTEXT_SECRET', 'media-context-test-secret')
    try {
      const headers = await createTrustedSiteContextHeaders(
        new Headers({ host: 'wingsgroup.example' }),
        {
          host: 'wingsgroup.example',
          publicPath: '/media/logo.webp',
          siteCode: 'wings-group',
        },
      )
      const result = await wingsGroupMediaReadAccess({
        req: {
          headers,
          payload: {
            find: async () => ({
              docs: [
                {
                  additionalDomains: [],
                  code: 'wings-group',
                  id: 7,
                  isActive: true,
                  primaryDomain: 'wingsgroup.example',
                },
              ],
            }),
          },
        },
      } as never)

      expect(result).toMatchObject({
        and: [{ site: { equals: 7 } }, { or: expect.any(Array) }],
      })

      const derivativeHeaders = await createTrustedSiteContextHeaders(
        new Headers({ host: 'wingsgroup.example' }),
        {
          host: 'wingsgroup.example',
          publicPath: '/media/IMG_8755-1-1440.avif',
          siteCode: 'wings-group',
        },
      )
      const derivativeResult = await wingsGroupMediaReadAccess({
        req: {
          headers: derivativeHeaders,
          payload: {
            find: async () => ({
              docs: [
                {
                  additionalDomains: [],
                  code: 'wings-group',
                  id: 7,
                  isActive: true,
                  primaryDomain: 'wingsgroup.example',
                },
              ],
            }),
          },
        },
      } as never)

      const serializedDerivativeResult = JSON.stringify(derivativeResult)
      expect(serializedDerivativeResult).toContain('sizes.wingsgroup-v3-1440-avif.filename')
      expect(serializedDerivativeResult).toContain('IMG_8755-1-1440.avif')
      expect(serializedDerivativeResult).toContain('governance.responsiveDerivatives.url')

      const adapterHeaders = new Headers(derivativeHeaders)
      adapterHeaders.delete('host')
      const adapterResult = await wingsGroupMediaReadAccess({
        req: {
          headers: adapterHeaders,
          url: 'http://localhost/',
          payload: {
            find: async () => ({
              docs: [
                {
                  additionalDomains: [],
                  code: 'wings-group',
                  id: 7,
                  isActive: true,
                  primaryDomain: 'wingsgroup.example',
                },
              ],
            }),
          },
        },
      } as never)
      expect(JSON.stringify(adapterResult)).toContain('governance.responsiveDerivatives.url')
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('allows pending media only inside an authenticated local draft preview', async () => {
    vi.stubEnv('LOCAL_PREVIEW_GRANT_SECRET', 'media-preview-test-secret')
    const grant = await mintWingsGroupLocalPreviewGrant({
      draftCookie: 'next-draft-token',
      locale: 'vi',
      siteCode: 'wings-group',
      userID: 7,
    })

    const result = await wingsGroupMediaReadAccess({
      req: request({
        cookie: `${WINGSGROUP_LOCAL_PREVIEW_GRANT_COOKIE}=${grant}; __prerender_bypass=next-draft-token`,
        user: { id: 7, role: 'site-manager', sites: [7] },
      }),
    } as never)

    expect(result).toEqual({ site: { in: [7] } })
  })

  it('keeps a normal authenticated Media read scoped to the user site', async () => {
    const result = await wingsGroupMediaReadAccess({
      req: request({
        user: { role: 'site-manager', sites: [7] },
      }),
    } as never)

    expect(result).toEqual({ site: { in: [7] } })

    const mediaRows = [
      { id: 101, site: 7, filename: 'site-seven.jpg' },
      { id: 202, site: 8, filename: 'site-eight.jpg' },
    ]
    const visibleRows = mediaRows.filter((row) =>
      (result as { site: { in: Array<number | string> } }).site.in.some(
        (siteID) => String(siteID) === String(row.site),
      ),
    )

    expect(visibleRows).toEqual([mediaRows[0]])
    expect(visibleRows).not.toContain(mediaRows[1])
  })

  it('fails closed for a production context marker on an authenticated site manager', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    try {
      const result = await wingsGroupMediaReadAccess({
        req: request({
          context: { [WINGSGROUP_LOCAL_DRAFT_PREVIEW_CONTEXT]: true },
          user: { role: 'site-manager', sites: [7] },
        }),
      } as never)

      expect(result).toBe(false)
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('fails closed for a production local draft cookie on an authenticated site manager', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    try {
      const result = await wingsGroupMediaReadAccess({
        req: request({
          cookie: '__prerender_bypass=run-owned-preview',
          user: { role: 'site-manager', sites: [7] },
        }),
      } as never)

      expect(result).toBe(false)
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('does not treat an anonymous local draft cookie as a preview grant', async () => {
    const result = await wingsGroupMediaReadAccess({
      req: request({ cookie: '__prerender_bypass=run-owned-preview', external: false }),
    } as never)

    expect(result).toMatchObject({ or: expect.any(Array) })
    expect(result).not.toBe(true)
  })
})
