import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getCurrentLocale: vi.fn(),
  getCurrentSite: vi.fn(),
  getPayload: vi.fn(),
  queryWingsGoTourCatalog: vi.fn(),
}))
const { getCurrentLocale, getCurrentSite, getPayload, queryWingsGoTourCatalog } = mocks

vi.mock('@payload-config', () => ({ default: {} }))
vi.mock('payload', () => ({ getPayload: mocks.getPayload }))
vi.mock('@/utilities/siteContext', () => ({
  getCurrentLocale: mocks.getCurrentLocale,
  getCurrentSite: mocks.getCurrentSite,
}))
vi.mock('@/tours/wingsGoCatalog', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/tours/wingsGoCatalog')>()
  return {
    ...actual,
    queryWingsGoTourCatalog: mocks.queryWingsGoTourCatalog,
  }
})

import { GET } from '@/app/(payload)/api/wingsgo/tour-catalog/route'

describe('WingsGo tour catalog endpoint', () => {
  beforeEach(() => {
    getPayload.mockReset()
    queryWingsGoTourCatalog.mockReset()
    getCurrentLocale.mockResolvedValue('vi')
    getCurrentSite.mockResolvedValue({ code: 'wings-go', id: 7 })
  })

  it('rejects pagination larger than one server batch with 400 and Cache-Control: no-store', async () => {
    const response = await GET(new Request('http://localhost/api/wingsgo/tour-catalog?limit=7'))

    expect(response.status).toBe(400)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.json()).toEqual({ error: 'Invalid catalog pagination.' })
    expect(getPayload).not.toHaveBeenCalled()
  })

  it('returns a safe empty DTO when the published wrapper page is not enabled with Cache-Control: no-store', async () => {
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

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.json()).toEqual({ all: [], featured: [], hasMore: false, nextOffset: 0 })
  })

  it('returns 200 success with Cache-Control: no-store and forwards locale to the query', async () => {
    getCurrentLocale.mockResolvedValue('vi')
    const mockFind = vi.fn().mockResolvedValue({
      docs: [{ id: 10, pathname: '/tour', wingsGoTourCatalog: { enabled: true } }],
    })
    getPayload.mockResolvedValue({ find: mockFind })
    const successData = {
      all: [{ id: 1, title: 'Tour 1' }],
      featured: [],
      hasMore: false,
      nextOffset: 1,
    }
    queryWingsGoTourCatalog.mockResolvedValue(successData)

    const response = await GET(new Request('http://localhost/api/wingsgo/tour-catalog?limit=6'))

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.json()).toEqual(successData)

    expect(mockFind).toHaveBeenCalledWith(
      expect.objectContaining({
        fallbackLocale: 'vi',
        locale: 'vi',
      }),
    )
    expect(queryWingsGoTourCatalog).toHaveBeenCalledWith(
      expect.objectContaining({
        locale: 'vi',
        limit: 6,
      }),
    )
  })

  it('forwards explicit ?locale=en param to page lookup and catalog query', async () => {
    getCurrentLocale.mockResolvedValue('vi') // Default site locale is vi, but query param requests en
    const mockFind = vi.fn().mockResolvedValue({
      docs: [{ id: 10, pathname: '/tour', wingsGoTourCatalog: { enabled: true } }],
    })
    getPayload.mockResolvedValue({ find: mockFind })
    queryWingsGoTourCatalog.mockResolvedValue({
      all: [],
      featured: [],
      hasMore: false,
      nextOffset: 0,
    })

    const response = await GET(
      new Request('http://localhost/api/wingsgo/tour-catalog?limit=6&locale=en'),
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')

    expect(mockFind).toHaveBeenCalledWith(
      expect.objectContaining({
        fallbackLocale: false,
        locale: 'en',
      }),
    )
    expect(queryWingsGoTourCatalog).toHaveBeenCalledWith(
      expect.objectContaining({
        locale: 'en',
        limit: 6,
      }),
    )
  })

  it('returns 500 with Cache-Control: no-store when catalog query throws', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const mockFind = vi.fn().mockResolvedValue({
      docs: [{ id: 10, pathname: '/tour', wingsGoTourCatalog: { enabled: true } }],
    })
    getPayload.mockResolvedValue({ find: mockFind })
    queryWingsGoTourCatalog.mockRejectedValue(new Error('simulated query failure'))

    const response = await GET(new Request('http://localhost/api/wingsgo/tour-catalog?limit=6'))

    expect(response.status).toBe(500)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.json()).toEqual({ error: 'Unable to load the WingsGo catalog.' })
  })
})
