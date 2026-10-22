import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  draftMode: vi.fn(),
  headers: vi.fn(),
}))

vi.mock('next/headers', () => ({ draftMode: mocks.draftMode, headers: mocks.headers }))

import {
  getAuthorizedPreviewHandoff,
  getPreviewPathIdentity,
  isAuthorizedPreviewFrameRequest,
  mintPreviewHandoff,
  normalizePreviewPath,
  PREVIEW_HANDOFF_COOKIE,
  verifyPreviewHandoff,
} from '@/utilities/previewHandoff'

describe('production preview handoff', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
  })

  it('binds a short-lived handoff to its exact page, site and path', async () => {
    vi.stubEnv('PREVIEW_HANDOFF_SECRET', 'unit-handoff-secret')
    const token = await mintPreviewHandoff({
      collection: 'pages',
      documentID: '308',
      locale: 'vi',
      path: '/tour/valid',
      siteCode: 'wings-go',
    })

    expect(await verifyPreviewHandoff(token)).toMatchObject({
      defaultLocale: 'vi',
      documentID: '308',
      mode: 'draft',
      path: '/tour/valid',
      siteCode: 'wings-go',
    })
    expect(await verifyPreviewHandoff(`${token}x`)).toBeNull()
  })

  it('exposes the signed published-version status only for the matching collection', async () => {
    vi.stubEnv('PREVIEW_HANDOFF_SECRET', 'unit-handoff-secret')
    const token = await mintPreviewHandoff({
      collection: 'tour-products',
      documentID: '308',
      hasPublishedVersion: true,
      locale: 'en',
      path: '/tour/valid',
      siteCode: 'wings-go',
    })
    mocks.headers.mockResolvedValue(
      new Headers({
        cookie: `${PREVIEW_HANDOFF_COOKIE}=${token}`,
        'x-public-path': '/wingsgo/en/tour/valid',
      }),
    )

    await expect(getAuthorizedPreviewHandoff('tour-products')).resolves.toMatchObject({
      collection: 'tour-products',
      documentID: '308',
      hasPublishedVersion: true,
    })
    await expect(getAuthorizedPreviewHandoff('pages')).resolves.toBeNull()
  })

  it('ignores a legacy unpartitioned grant when the new grant is absent', async () => {
    vi.stubEnv('PREVIEW_HANDOFF_SECRET', 'unit-handoff-secret')
    const token = await mintPreviewHandoff({
      collection: 'pages',
      documentID: '308',
      locale: 'vi',
      path: '/tour/valid',
      siteCode: 'wings-go',
    })
    mocks.headers.mockResolvedValue(new Headers({
      cookie: `__wingstravel_preview_handoff=${token}`,
      'x-public-path': '/tour/valid',
    }))

    await expect(getAuthorizedPreviewHandoff()).resolves.toBeNull()
  })

  it('binds published mode and rejects encoded traversal in paths', async () => {
    vi.stubEnv('PREVIEW_HANDOFF_SECRET', 'unit-handoff-secret')
    const token = await mintPreviewHandoff({
      collection: 'posts',
      defaultLocale: 'en',
      documentID: '309',
      locale: 'en',
      mode: 'published',
      path: '/posts/valid',
      siteCode: 'wing-side',
    })

    expect(await verifyPreviewHandoff(token)).toMatchObject({
      defaultLocale: 'en',
      locale: 'en',
      mode: 'published',
    })
    expect(normalizePreviewPath('/posts/%252e%252e/secret')).toBeNull()
    expect(normalizePreviewPath('/posts/valid/')).toBe('/posts/valid')
  })

  it('normalizes site aliases and public locale prefixes before comparing the path', () => {
    expect(getPreviewPathIdentity('/wing-side/en/posts/valid')).toEqual({
      locale: 'en',
      path: '/posts/valid',
    })
    expect(getPreviewPathIdentity('/en/posts/valid')).toEqual({
      locale: 'en',
      path: '/posts/valid',
    })
    expect(getPreviewPathIdentity('/posts/valid')).toEqual({ locale: null, path: '/posts/valid' })
  })

  it('rejects expired and malformed handoffs', async () => {
    vi.stubEnv('PREVIEW_HANDOFF_SECRET', 'unit-handoff-secret')
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-07T00:00:00Z'))
    const token = await mintPreviewHandoff({
      collection: 'pages',
      documentID: '308',
      locale: 'vi',
      path: '/tour/valid',
      siteCode: 'wings-go',
    })

    vi.advanceTimersByTime(61_000)
    expect(await verifyPreviewHandoff(token)).toBeNull()
    expect(await verifyPreviewHandoff('forged')).toBeNull()
  })

  it('allows only a valid handoff from the CMS origin to frame the bound public path', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    // The operational CMS is reached at /admin, but security compares origins.
    vi.stubEnv('PREVIEW_CMS_ORIGINS', 'https://wingsgroup.vn/admin')
    vi.stubEnv('PREVIEW_PUBLIC_ORIGINS', 'wings-go=wingsgo.vn')
    vi.stubEnv('PREVIEW_HANDOFF_SECRET', 'unit-handoff-secret')
    const token = await mintPreviewHandoff({
      collection: 'pages',
      documentID: '308',
      locale: 'en',
      path: '/tour/valid',
      siteCode: 'wings-go',
    })
    const headers = new Headers({
      cookie: `${PREVIEW_HANDOFF_COOKIE}=${token}`,
      referer: 'https://wingsgroup.vn/admin/collections/pages/308',
    })

    await expect(
      isAuthorizedPreviewFrameRequest({ headers, host: 'wingsgo.vn', pathname: '/en/tour/valid' }),
    ).resolves.toBe(true)
    await expect(
      isAuthorizedPreviewFrameRequest({ headers, host: 'wingsgo.vn', pathname: '/vi/tour/valid' }),
    ).resolves.toBe(false)
    await expect(
      isAuthorizedPreviewFrameRequest({ headers, host: 'wingsgo.vn', pathname: '/en/tour/other' }),
    ).resolves.toBe(false)
    await expect(
      isAuthorizedPreviewFrameRequest({
        headers: new Headers({ ...Object.fromEntries(headers), referer: 'https://evil.example/' }),
        host: 'wingsgo.vn',
        pathname: '/en/tour/valid',
      }),
    ).resolves.toBe(false)
    await expect(
      isAuthorizedPreviewFrameRequest({ headers, host: 'wingsplus.vn', pathname: '/en/tour/valid' }),
    ).resolves.toBe(false)
  })
})
