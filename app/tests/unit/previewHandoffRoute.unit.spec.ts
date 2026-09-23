import { afterEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

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
import { mintPreviewHandoff } from '@/utilities/previewHandoff'

describe('preview handoff redirect', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.clearAllMocks()
  })

  it('redirects a WingsGo non-default locale to its locale-prefixed public path', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('PREVIEW_HANDOFF_SECRET', 'route-handoff-secret')
    mocks.cookies.mockResolvedValue({ set: vi.fn() })
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
  })

  it('does not add a locale prefix for a tenant default locale', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('PREVIEW_HANDOFF_SECRET', 'route-handoff-secret')
    mocks.cookies.mockResolvedValue({ set: vi.fn() })
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
  })
})
