import { describe, expect, it, vi } from 'vitest'

vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('payload', () => ({ getPayload: vi.fn() }))
vi.mock('@/utilities/previewHandoff', () => ({
  getTrustedCMSOrigins: () => new Set(['https://wingsgroup.vn']),
}))

import { sameOriginCookieMutation } from '@/app/(payload)/api/tour-authoring/[id]/route'

describe('tour authoring mutation origin checks', () => {
  it('accepts the production CMS referer when the app runs behind an internal proxy', () => {
    const request = new Request('http://127.0.0.1:3000/api/tour-authoring/109', {
      headers: {
        cookie: 'payload-token=authenticated',
        referer: 'https://wingsgroup.vn/admin/collections/tour-products/109',
      },
      method: 'POST',
    })

    expect(sameOriginCookieMutation(request)).toBe(true)
  })

  it('normalizes a trusted origin and rejects cross-site mutations', () => {
    expect(
      sameOriginCookieMutation(
        new Request('http://127.0.0.1:3000/api/tour-authoring/109', {
          headers: {
            cookie: 'payload-token=authenticated',
            origin: 'https://wingsgroup.vn/',
          },
          method: 'POST',
        }),
      ),
    ).toBe(true)

    expect(
      sameOriginCookieMutation(
        new Request('http://127.0.0.1:3000/api/tour-authoring/109', {
          headers: {
            cookie: 'payload-token=authenticated',
            origin: 'https://evil.example',
          },
          method: 'POST',
        }),
      ),
    ).toBe(false)
  })
})
