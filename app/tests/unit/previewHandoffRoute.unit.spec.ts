import { afterEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const mocks = vi.hoisted(() => ({
  cookies: vi.fn(),
  draftMode: vi.fn(),
  getCurrentSite: vi.fn(),
  redirect: vi.fn(),
}))

vi.mock('next/headers', () => ({ cookies: mocks.cookies, draftMode: mocks.draftMode }))
vi.mock('next/navigation', () => ({
  redirect: mocks.redirect.mockImplementation((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`)
  }),
}))
vi.mock('@/utilities/siteContext', () => ({ getCurrentSite: mocks.getCurrentSite }))

import { POST } from '@/app/(frontend)/next/preview/handoff/route'
import { GET as exitPreview } from '@/app/(frontend)/next/exit-preview/route'
import { mintPreviewHandoff, PREVIEW_HANDOFF_COOKIE } from '@/utilities/previewHandoff'
import { partitionDraftModeCookie } from '@/utilities/previewCookies'

describe('preview handoff redirect', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.clearAllMocks()
  })

  it('redirects a WingsGo non-default locale to its locale-prefixed public path', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('PREVIEW_HANDOFF_SECRET', 'route-handoff-secret')
    const response = new NextResponse()
    response.cookies.set('__prerender_bypass', 'next-build-specific-value')
    mocks.cookies.mockResolvedValue(response.cookies)
    mocks.draftMode.mockResolvedValue({ enable: vi.fn(), isEnabled: true })
    mocks.getCurrentSite.mockResolvedValue({ code: 'wings-go' })

    const token = await mintPreviewHandoff({
      collection: 'pages',
      defaultLocale: 'vi',
      documentID: '308',
      locale: 'en',
      path: '/tour/valid',
      siteCode: 'wings-go',
    })
    const form = new FormData()
    form.set('handoff', token || '')

    await expect(
      POST(new NextRequest('https://wingsgo.vn/next/preview/handoff', { body: form, method: 'POST' })),
    ).rejects.toThrow('NEXT_REDIRECT:/en/tour/valid')

    const serialized = response.headers.getSetCookie()
    expect(serialized).toHaveLength(2)
    for (const header of serialized) {
      expect(header).toContain('HttpOnly')
      expect(header).toContain('Secure')
      expect(header).toContain('SameSite=none')
      expect(header).toContain('Partitioned')
      expect(header).toContain('Path=/')
      expect(header).not.toContain('Domain=')
    }
    expect(response.cookies.get('__prerender_bypass')?.value).toBe('next-build-specific-value')
    expect(response.cookies.get(PREVIEW_HANDOFF_COOKIE)?.maxAge).toBeLessThanOrEqual(60)
    expect(response.cookies.get('__wingstravel_preview_handoff')).toBeUndefined()
  })

  it('does not add a locale prefix for a tenant default locale', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('PREVIEW_HANDOFF_SECRET', 'route-handoff-secret')
    const response = new NextResponse()
    mocks.cookies.mockResolvedValue(response.cookies)
    mocks.draftMode.mockResolvedValue({ disable: vi.fn(), isEnabled: false })
    mocks.getCurrentSite.mockResolvedValue({ code: 'wings-go' })

    const token = await mintPreviewHandoff({
      collection: 'posts',
      defaultLocale: 'vi',
      documentID: '309',
      locale: 'vi',
      mode: 'published',
      path: '/posts/valid',
      siteCode: 'wings-go',
    })
    const form = new FormData()
    form.set('handoff', token || '')

    await expect(
      POST(new NextRequest('https://wingsgo.vn/next/preview/handoff', { body: form, method: 'POST' })),
    ).rejects.toThrow('NEXT_REDIRECT:/posts/valid')
    expect(response.cookies.get('__prerender_bypass')).toMatchObject({
      expires: new Date(0), maxAge: 0, partitioned: true, value: '',
    })
  })

  it('expires the partitioned cookies and legacy grant when exiting in the same context', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    const response = new NextResponse()
    mocks.cookies.mockResolvedValue(response.cookies)
    mocks.draftMode.mockResolvedValue({ disable: vi.fn() })

    expect((await exitPreview()).status).toBe(200)
    for (const name of ['__prerender_bypass', PREVIEW_HANDOFF_COOKIE]) {
      expect(response.cookies.get(name)).toMatchObject({
        expires: new Date(0), httpOnly: true, maxAge: 0,
        partitioned: true, path: '/', sameSite: 'none', secure: true, value: '',
      })
    }
    expect(response.cookies.get('__wingstravel_preview_handoff')).toMatchObject({ maxAge: 0 })
  })

  it('does not issue cookies for invalid grants or a different tenant', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('PREVIEW_HANDOFF_SECRET', 'route-handoff-secret')
    const response = new NextResponse()
    mocks.cookies.mockResolvedValue(response.cookies)
    mocks.getCurrentSite.mockResolvedValue({ code: 'wings-plus' })
    const token = await mintPreviewHandoff({
      collection: 'pages', documentID: '308', locale: 'vi',
      path: '/tour/valid', siteCode: 'wings-go',
    })
    for (const value of ['forged', token || '']) {
      const form = new FormData()
      form.set('handoff', value)
      expect((await POST(new NextRequest('https://wingsgo.vn/next/preview/handoff', {
        body: form, method: 'POST',
      }))).status).toBe(403)
    }
    expect(response.headers.getSetCookie()).toEqual([])
  })

  it('fails closed if Next did not issue its build-specific bypass cookie', () => {
    vi.stubEnv('NODE_ENV', 'production')
    const response = new NextResponse()

    expect(() => partitionDraftModeCookie(response.cookies, true))
      .toThrow('Preview cookie could not be issued')
    expect(response.headers.getSetCookie()).toEqual([])
  })

  it('keeps local development cookies unchanged', () => {
    vi.stubEnv('NODE_ENV', 'development')
    const response = new NextResponse()

    partitionDraftModeCookie(response.cookies, true)
    expect(response.headers.getSetCookie()).toEqual([])
  })
})
