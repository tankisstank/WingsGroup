import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  cookies: vi.fn(),
  draftMode: vi.fn(),
  getPayload: vi.fn(),
  redirect: vi.fn(),
}))

vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('payload', () => ({ getPayload: mocks.getPayload }))
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }))
vi.mock('next/headers', () => ({ cookies: mocks.cookies, draftMode: mocks.draftMode }))

import { GET } from '@/app/(frontend)/next/preview/route'
import {
  hasExplicitWingsGroupLocalDraftPreviewSignal,
  NEXT_DRAFT_MODE_COOKIE,
  WINGSGROUP_LOCAL_PREVIEW_GRANT_COOKIE,
} from '@/wingsgroup/localPreview'

describe('local preview route grant issuance', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('PREVIEW_SECRET', 'route-preview-secret')
    vi.stubEnv('LOCAL_PREVIEW_GRANT_SECRET', 'route-grant-secret')

    const values = new Map<string, string>()
    let enabled = false
    const cookieStore = {
      get: (name: string) => {
        const value = values.get(name)
        return value ? { name, value } : undefined
      },
      set: (cookie: { name: string; value: string }) => {
        if (cookie.value) values.set(cookie.name, cookie.value)
        else values.delete(cookie.name)
      },
    }

    mocks.cookies.mockResolvedValue(cookieStore)
    mocks.draftMode.mockResolvedValue({
      get isEnabled() {
        return enabled
      },
      disable: () => {
        enabled = false
        values.delete(NEXT_DRAFT_MODE_COOKIE)
      },
      enable: () => {
        enabled = true
        values.set(NEXT_DRAFT_MODE_COOKIE, 'next-generated-token')
      },
    })
    mocks.auth.mockResolvedValue({ user: { id: 77, role: 'super-admin' } })
    mocks.getPayload.mockResolvedValue({ auth: mocks.auth, logger: { error: vi.fn() } })
  })

  it('signs a bounded grant only after authenticated draft mode is enabled', async () => {
    await GET(
      new NextRequest(
        'http://localhost:4175/next/preview?path=%2Flien-he&previewSecret=route-preview-secret',
      ),
    )

    expect(mocks.redirect).toHaveBeenCalledWith('/lien-he')
    const cookieStore = await mocks.cookies.mock.results[0]?.value
    const grant = cookieStore?.get(WINGSGROUP_LOCAL_PREVIEW_GRANT_COOKIE)?.value
    const draftCookie = cookieStore?.get(NEXT_DRAFT_MODE_COOKIE)?.value
    expect(grant).toBeTruthy()
    expect(draftCookie).toBe('next-generated-token')

    const headers = new Headers({
      cookie: `${WINGSGROUP_LOCAL_PREVIEW_GRANT_COOKIE}=${grant}; ${NEXT_DRAFT_MODE_COOKIE}=${draftCookie}`,
      host: 'localhost:4175',
      'x-client-ip': '127.0.0.1',
      'x-locale': 'vi',
      'x-site-context-source': 'proxy',
      'x-site-host': 'localhost',
    })
    expect(
      await hasExplicitWingsGroupLocalDraftPreviewSignal({
        headers,
        locale: 'vi',
        siteCode: 'wings-group',
        userID: 77,
      }),
    ).toBe(true)
  })

  it('does not issue a grant when authentication fails', async () => {
    mocks.auth.mockResolvedValue({ user: null })

    const response = await GET(
      new NextRequest(
        'http://localhost:4175/next/preview?path=%2Flien-he&previewSecret=route-preview-secret',
      ),
    )

    expect(response.status).toBe(403)
    expect(mocks.redirect).not.toHaveBeenCalled()
  })
})
