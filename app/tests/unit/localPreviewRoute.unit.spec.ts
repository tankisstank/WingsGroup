import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({ auth: vi.fn(), findByID: vi.fn(), getPayload: vi.fn() }))
vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('payload', () => ({ getPayload: mocks.getPayload }))

import { GET } from '@/app/(frontend)/next/preview/route'

describe('preview handoff initializer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('PREVIEW_HANDOFF_SECRET', 'route-handoff-secret')
    vi.stubEnv('PREVIEW_PUBLIC_ORIGINS', 'wings-go=wingsgo.vn')
    mocks.auth.mockResolvedValue({ user: { id: 77, role: 'super-admin' } })
    mocks.findByID.mockResolvedValue({
      id: 308,
      pathname: '/tour/tour-6n5d-hang-chau-o-tran-thuong-hai-hang-chau-bay-ca-dcv-265869',
      site: { code: 'wings-go', primaryDomain: 'wingsgo.vn' },
    })
    mocks.getPayload.mockResolvedValue({ auth: mocks.auth, findByID: mocks.findByID })
  })

  it('uses the persisted pathname and sends its bounded token only in a POST body', async () => {
    const response = await GET(new NextRequest('https://wingsgroup.vn/next/preview?collection=pages&id=308&path=%2Fforged'))
    const html = await response.text()
    expect(response.status).toBe(200)
    expect(html).toContain('action="https://wingsgo.vn/next/preview/handoff"')
    expect(response.headers.get('Content-Security-Policy')).toBe("form-action 'self' https://wingsgo.vn")
    expect(html).toContain('name="handoff"')
    expect(html).not.toContain('localhost')
    expect(html).not.toContain('PREVIEW_SECRET')
    expect(html).not.toContain('/forged')
  })

  it('rejects unauthenticated and malformed requests before issuing a handoff', async () => {
    mocks.auth.mockResolvedValue({ user: null })
    expect((await GET(new NextRequest('https://wingsgroup.vn/next/preview?collection=pages&id=308&path=%2Ftour'))).status).toBe(403)
    expect((await GET(new NextRequest('https://wingsgroup.vn/next/preview?collection=pages&id=308&path=https%3A%2F%2Fevil.example'))).status).toBe(404)
  })

  it('does not use a stale local CMS domain as a production preview target', async () => {
    mocks.findByID.mockResolvedValue({
      id: 308,
      pathname: '/tour/tour-6n5d-hang-chau-o-tran-thuong-hai-hang-chau-bay-ca-dcv-265869',
      site: { code: 'wings-go', primaryDomain: 'wingsgo.local' },
    })

    const response = await GET(new NextRequest('https://wingsgroup.vn/next/preview?collection=pages&id=308&path=%2Ftour'))
    const html = await response.text()
    expect(response.status).toBe(200)
    expect(html).toContain('action="https://wingsgo.vn/next/preview/handoff"')
    expect(html).not.toContain('wingsgo.local')
  })

  it('fails closed when no public destination is allowlisted', async () => {
    vi.stubEnv('PREVIEW_PUBLIC_ORIGINS', '')
    expect((await GET(new NextRequest('https://wingsgroup.vn/next/preview?collection=pages&id=308&path=%2Ftour'))).status).toBe(503)
  })
})
