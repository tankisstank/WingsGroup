import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

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
import { Sites } from '@/collections/Sites'
import { createTrustedSiteContextHeaders } from '@/utilities/siteDomains'

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
  {
    id: 3,
    code: 'wing-side',
    defaultLocale: 'en',
    isActive: true,
    name: 'WingSide',
    primaryDomain: 'wingside.vn',
  },
]

const trustedHeaders = (values: Record<string, string> = {}) =>
  createTrustedSiteContextHeaders(new Headers(), {
    host: values['x-site-host'] || 'localhost',
    locale: values['x-locale'],
    publicPath: values['x-public-path'] || '/',
    siteCode: values['x-site-code'],
    sitePrefix: values['x-site-prefix'],
  })

describe('site context security', () => {
  beforeEach(() => {
    vi.stubEnv('SITE_CONTEXT_SECRET', 'site-context-security-test-secret')
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

  afterEach(() => {
    vi.unstubAllEnvs()
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

  it('ignores a self-consistent proxy bundle without a valid signature', async () => {
    mocks.headers.mockResolvedValue(
      new Headers({
        'x-site-code': 'wings-go',
        'x-site-context-source': 'proxy',
        'x-site-host': 'localhost',
        'x-site-prefix': '/wingsgo',
      }),
    )

    await expect(getCurrentSite()).resolves.toMatchObject({ code: 'wings-group' })
  })

  it('accepts a known route site code only from trusted proxy context', async () => {
    mocks.headers.mockResolvedValue(await trustedHeaders({ 'x-site-code': 'wings-go' }))

    await expect(getCurrentSite()).resolves.toMatchObject({ code: 'wings-go' })
  })

  it('resolves an allowed production host through the trusted proxy context', async () => {
    mocks.headers.mockResolvedValue(await trustedHeaders({ 'x-site-host': 'wingsgo.vn' }))

    await expect(getCurrentSite()).resolves.toMatchObject({ code: 'wings-go' })
  })

  it('resolves wingside.vn to the WingSide tenant', async () => {
    mocks.headers.mockResolvedValue(await trustedHeaders({ 'x-site-host': 'wingside.vn' }))

    await expect(getCurrentSite()).resolves.toMatchObject({ code: 'wing-side', id: 3 })
  })

  it('fails closed for an unknown trusted host', async () => {
    mocks.headers.mockResolvedValue(await trustedHeaders({ 'x-site-host': 'attacker.example' }))

    await expect(getCurrentSite()).rejects.toThrow('NEXT_NOT_FOUND')
    expect(mocks.notFound).toHaveBeenCalledOnce()
  })

  it('fails closed when a deployed host conflicts with a path alias', async () => {
    mocks.headers.mockResolvedValue(
      await trustedHeaders({
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
      await trustedHeaders({
        'x-locale': 'en',
        'x-site-code': 'wings-go',
      }),
    )
    await expect(getCurrentLocale()).resolves.toBe('en')
  })

  it('always adds the resolved site constraint to collection queries', async () => {
    mocks.headers.mockResolvedValue(await trustedHeaders({ 'x-site-code': 'wings-go' }))

    await expect(
      appendSiteWhere({
        slug: { equals: 'shared-slug' },
      }),
    ).resolves.toEqual({
      and: [{ site: { equals: 2 } }, { slug: { equals: 'shared-slug' } }],
    })
  })

  it('keeps anonymous Sites access closed while allowing only two trusted directory lookups', () => {
    const readAccess = Sites.access?.read
    expect(typeof readAccess).toBe('function')
    expect((readAccess as (args: unknown) => unknown)({ req: {} })).toBe(false)

    const source = readFileSync(join(process.cwd(), 'src', 'utilities', 'siteContext.ts'), 'utf8')
    expect(source.match(/overrideAccess:\s*true/g)).toHaveLength(2)
    expect(source).not.toMatch(
      /collection:\s*['"](?:pages|tour-products|tour-departures)['"][\s\S]{0,180}overrideAccess:\s*true/,
    )
  })
})
