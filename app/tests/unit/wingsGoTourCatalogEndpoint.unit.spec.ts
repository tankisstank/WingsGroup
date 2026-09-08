import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getCurrentLocale: vi.fn(),
  getCurrentSite: vi.fn(),
  getPayload: vi.fn(),
}))
const { getCurrentLocale, getCurrentSite, getPayload } = mocks

vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('payload', () => ({ getPayload: mocks.getPayload }))
vi.mock('@/utilities/siteContext', () => ({
  getCurrentLocale: mocks.getCurrentLocale,
  getCurrentSite: mocks.getCurrentSite,
}))

import { GET } from '@/app/(payload)/api/wingsgo/tour-catalog/route'

describe('WingsGo tour catalog endpoint', () => {
  beforeEach(() => {
    getPayload.mockReset()
    getCurrentLocale.mockResolvedValue('vi')
    getCurrentSite.mockResolvedValue({ code: 'wings-go', id: 7 })
  })

  it('rejects pagination larger than one server batch', async () => {
    const response = await GET(new Request('http://localhost/api/wingsgo/tour-catalog?limit=7'))

    expect(response.status).toBe(400)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(getPayload).not.toHaveBeenCalled()
  })

  it('returns a safe empty DTO when the published wrapper page is not enabled', async () => {
    getPayload.mockResolvedValue({
      find: vi.fn().mockResolvedValue({ docs: [] }),
    })

    const response = await GET(
      new Request('http://localhost/api/wingsgo/tour-catalog?limit=6&offset=6'),
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.json()).toEqual({ all: [], featured: [], hasMore: false, nextOffset: 0 })
  })

  it('marks the non-WingsGo empty response as non-cacheable too', async () => {
    getCurrentSite.mockResolvedValue({ code: 'wing-side', id: 8 })
    getPayload.mockResolvedValue({ find: vi.fn() })

    const response = await GET(new Request('http://localhost/api/wingsgo/tour-catalog'))

    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.json()).toEqual({ all: [], featured: [], hasMore: false, nextOffset: 0 })
  })
})
