import { describe, expect, it, vi } from 'vitest'

import { wingsGroupMediaReadAccess } from '@/access/siteScope'
import {
  hasExplicitWingsGroupLocalDraftPreviewSignal,
  hasWingsGroupLocalDraftPreviewSignal,
} from '@/wingsgroup/localPreview'
import { WINGSGROUP_LOCAL_DRAFT_PREVIEW_CONTEXT } from '@/wingsgroup/corporateRoutes'

const request = ({
  cookie,
  context = {},
  user,
}: {
  cookie?: string
  context?: Record<string, unknown>
  user?: { role: 'editor' | 'site-manager' | 'super-admin'; sites?: Array<number | string> }
} = {}) => ({
  context,
  headers: new Headers({
    ...(cookie ? { cookie } : {}),
    host: '127.0.0.1:4175',
    'x-client-ip': '127.0.0.1',
    'x-site-context-source': 'proxy',
    'x-site-host': '127.0.0.1',
  }),
  user,
})

describe('WingsGroup media read access', () => {
  it('admits local draft preview only from server-derived context', () => {
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

    expect(hasWingsGroupLocalDraftPreviewSignal({ headers: forged })).toBe(false)
    expect(hasWingsGroupLocalDraftPreviewSignal({ headers: trusted })).toBe(true)

    vi.stubEnv('NODE_ENV', 'production')
    try {
      expect(hasExplicitWingsGroupLocalDraftPreviewSignal({ headers: trusted })).toBe(false)
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('returns only governed published media gates to anonymous readers', async () => {
    const result = await wingsGroupMediaReadAccess({ req: request() } as never)

    expect(result).toMatchObject({
      or: expect.arrayContaining([
        expect.objectContaining({
          and: expect.arrayContaining([{ 'governance.publicationState': { equals: 'published' } }]),
        }),
      ]),
    })
  })

  it('allows pending media only inside an authenticated local draft preview', async () => {
    const result = await wingsGroupMediaReadAccess({
      req: request({
        cookie: '__prerender_bypass=run-owned-preview',
        user: { role: 'site-manager', sites: [7] },
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
      req: request({ cookie: '__prerender_bypass=run-owned-preview' }),
    } as never)

    expect(result).toMatchObject({ or: expect.any(Array) })
    expect(result).not.toBe(true)
  })
})
