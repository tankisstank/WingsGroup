import { describe, expect, it, vi } from 'vitest'

import { wingsGroupMediaReadAccess } from '@/access/siteScope'

const request = ({
  cookie,
  user,
}: {
  cookie?: string
  user?: { role: 'super-admin' }
} = {}) => ({
  context: {},
  headers: new Headers({
    ...(cookie ? { cookie } : {}),
    host: '127.0.0.1:4175',
    'x-site-host': '127.0.0.1',
  }),
  user,
})

describe('WingsGroup media read access', () => {
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
        user: { role: 'super-admin' },
      }),
    } as never)

    expect(result).toBe(true)
  })

  it('does not treat a local draft cookie as a production preview grant', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    try {
      const result = await wingsGroupMediaReadAccess({
        req: request({
          cookie: '__prerender_bypass=run-owned-preview',
          user: { role: 'super-admin' },
        }),
      } as never)

      expect(result).not.toBe(true)
    } finally {
      vi.unstubAllEnvs()
    }
  })
})
