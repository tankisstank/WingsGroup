import { describe, expect, it } from 'vitest'

import { redirects } from '../../redirects'

describe('public compatibility redirects', () => {
  it('keeps legacy aliases compatibility-only and same-site', async () => {
    const rules = (await redirects?.()) || []
    const selected = rules.filter((rule) =>
      ['/vi', '/posts', '/posts/:slug*', '/wingsside', '/wingsside/:path*'].includes(
        String(rule.source),
      ),
    )

    expect(selected).toEqual([
      { destination: '/', permanent: true, source: '/vi' },
      { destination: '/tin-tuc', permanent: true, source: '/posts' },
      {
        destination: '/tin-tuc/:slug*',
        has: [{ type: 'host', value: '(?:www\\.)?wingsgroup\\.vn' }],
        permanent: true,
        source: '/posts/:slug*',
      },
      { destination: '/wing-side', permanent: true, source: '/wingsside' },
      { destination: '/wing-side/:path*', permanent: true, source: '/wingsside/:path*' },
    ])
    expect(JSON.stringify(selected)).not.toMatch(/https?:\/\//i)
  })
})
