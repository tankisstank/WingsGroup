import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getPayload: vi.fn(),
  headers: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND')
  }),
}))

vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('next/headers', () => ({ headers: mocks.headers }))
vi.mock('next/navigation', () => ({ notFound: mocks.notFound }))
vi.mock('payload', () => ({ getPayload: mocks.getPayload }))

import {
  appendSiteWhere,
  getCurrentLocale,
  getCurrentSite,
  invalidateSiteContextCache,
} from '@/utilities/siteContext'

const sites = [
  {
    id: 1,
    code: 'wings-group',
    defaultLocale: 'vi',
    isActive: true,
    name: 'WingsGroup',
    primaryDomain: 'wingsgroup.vn',
  },
  {
    id: 2,
    code: 'wings-go',
    defaultLocale: 'vi',
    isActive: true,
    name: 'WingsGo',
    primaryDomain: 'wingsgo.vn',
  },
]

const trustedHeaders = (values: Record<string, string> = {}) =>
  new Headers({
    'x-site-context-source': 'proxy',
    ...values,
  })

describe('site context security', () => {
  beforeEach(() => {
    invalidateSiteContextCache()
    mocks.notFound.mockClear()
    mocks.headers.mockReset()
    mocks.getPayload.mockResolvedValue({
      find: vi.fn(async ({ where }: { where?: Record<string, unknown> }) => {
        const serialized = JSON.stringify(where || {})
        const byCode = sites.find((site) => serialized.includes(`"${site.code}"`))

        return { docs: byCode ? [byCode] : sites }
      }),
    })
  })

  it('ignores client-supplied tenant headers without trusted proxy context', async () => {
    mocks.headers.mockResolvedValue(
      new Headers({
        'x-site-code': 'wings-go',
        'x-site-host': 'wingsgo.vn',
      }),
    )

    await expect(getCurrentSite()).resolves.toMatchObject({ code: 'wings-group' })
  })

  it('accepts a known route site code only from trusted proxy context', async () => {
    mocks.headers.mockResolvedValue(trustedHeaders({ 'x-site-code': 'wings-go' }))

    await expect(getCurrentSite()).resolves.toMatchObject({ code: 'wings-go' })
  })

  it('fails closed for an unknown trusted host', async () => {
    mocks.headers.mockResolvedValue(trustedHeaders({ 'x-site-host': 'attacker.example' }))

    await expect(getCurrentSite()).rejects.toThrow('NEXT_NOT_FOUND')
    expect(mocks.notFound).toHaveBeenCalledOnce()
  })

  it('fails closed when a deployed host conflicts with a path alias', async () => {
    mocks.headers.mockResolvedValue(
      trustedHeaders({
        'x-site-code': 'wings-go',
        'x-site-host': 'wingsgroup.vn',
      }),
    )

    await expect(getCurrentSite()).rejects.toThrow('NEXT_NOT_FOUND')
  })

  it('reads locale only from trusted path context and otherwise uses the site default', async () => {
    mocks.headers.mockResolvedValue(
      new Headers({
        'x-locale': 'it',
      }),
    )
    await expect(getCurrentLocale()).resolves.toBe('vi')

    invalidateSiteContextCache()
    mocks.headers.mockResolvedValue(
      trustedHeaders({
        'x-locale': 'en',
        'x-site-code': 'wings-go',
      }),
    )
    await expect(getCurrentLocale()).resolves.toBe('en')
  })

  it('always adds the resolved site constraint to collection queries', async () => {
    mocks.headers.mockResolvedValue(trustedHeaders({ 'x-site-code': 'wings-go' }))

    await expect(
      appendSiteWhere({
        slug: { equals: 'shared-slug' },
      }),
    ).resolves.toEqual({
      and: [
        { site: { equals: 2 } },
        { slug: { equals: 'shared-slug' } },
      ],
    })
  })
})
