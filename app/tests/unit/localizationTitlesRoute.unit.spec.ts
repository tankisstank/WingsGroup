import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  createLocalReq: vi.fn(),
  find: vi.fn(),
  getPayload: vi.fn(),
  headers: vi.fn(),
}))

vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('next/headers', () => ({ headers: mocks.headers }))
vi.mock('payload', () => ({
  createLocalReq: mocks.createLocalReq,
  getPayload: mocks.getPayload,
}))

import { POST } from '@/app/(payload)/api/localization-titles/route'

describe('site-aware localization title fallback', () => {
  afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
  })

  it('uses WingSide default English as the source for a missing Italian title', async () => {
    const user = { id: 7, role: 'site-manager' }
    mocks.headers.mockResolvedValue(new Headers())
    mocks.auth.mockResolvedValue({ user })
    mocks.createLocalReq.mockResolvedValue({ user })
    mocks.getPayload.mockResolvedValue({ auth: mocks.auth, find: mocks.find })
    mocks.find.mockImplementation(async (args: { collection: string; locale?: string }) => {
      if (args.collection === 'sites') {
        return { docs: [{ defaultLocale: 'en', id: 3 }] }
      }
      if (args.locale === 'it') {
        return { docs: [{ id: 308, site: 3, title: null }] }
      }
      return { docs: [{ id: 308, title: 'Discover Vietnam' }] }
    })

    const response = await POST(
      new Request('https://wingsgroup.vn/api/localization-titles', {
        body: JSON.stringify({ collection: 'pages', ids: [308], locale: 'it' }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      }),
    )
    const body = (await response.json()) as { titles?: Record<string, { locale: string; title: string }> }

    expect(response.status).toBe(200)
    expect(body.titles).toEqual({ '308': { locale: 'en', title: 'Discover Vietnam' } })
    expect(mocks.find).toHaveBeenCalledWith(expect.objectContaining({ collection: 'pages', locale: 'it' }))
    expect(mocks.find).toHaveBeenCalledWith(expect.objectContaining({ collection: 'pages', locale: 'en' }))
  })
})
