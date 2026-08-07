import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { WidgetServerProps } from 'payload'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { WingsGroupMetrics } from '@/components/AdminDashboard/WingsGroupMetrics'

type CountArgs = {
  collection: string
  overrideAccess?: boolean
  req?: unknown
  where?: {
    _status?: {
      equals?: string
    }
  }
}

type FindArgs = {
  collection: string
  overrideAccess?: boolean
  req?: unknown
  sort?: string
}

type MockOverrides = {
  count?: (args: CountArgs) => Promise<unknown> | unknown
  find?: (args: FindArgs) => Promise<unknown> | unknown
  role?: 'editor' | 'site-manager' | 'super-admin'
}

const defaultCount = ({ collection, where }: CountArgs) => {
  if (collection === 'pages' && where?._status?.equals === 'draft') {
    return { totalDocs: 1 }
  }

  if (collection === 'posts' && where?._status?.equals === 'draft') {
    return { totalDocs: 2 }
  }

  return { totalDocs: collection === 'form-submissions' ? 3 : 4 }
}

const defaultFind = ({ collection }: FindArgs) => {
  if (collection === 'sites') {
    return { docs: [{ id: 'site-1', name: 'WingsTravel' }] }
  }

  if (collection === 'pages') {
    return {
      docs: [{ id: 'page-1', title: 'Trang Hà Nội', updatedAt: '2026-08-05T01:00:00.000Z' }],
    }
  }

  if (collection === 'posts') {
    return {
      docs: [{ id: 'post-1', title: 'Bài viết Hà Nội', updatedAt: '2026-08-05T02:00:00.000Z' }],
    }
  }

  return {
    docs: [
      {
        createdAt: '2026-08-05T03:00:00.000Z',
        form: { title: 'Liên hệ tour' },
        id: 'lead-1',
      },
    ],
  }
}

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json' },
    status,
  })

const renderWidget = async (overrides: MockOverrides = {}) => {
  const payload = {
    count: vi.fn(overrides.count ?? defaultCount),
    find: vi.fn(overrides.find ?? defaultFind),
  }
  const req = {
    payload,
    user: {
      id: 'user-1',
      role: overrides.role ?? 'editor',
      sites: ['site-1'],
    },
  }

  render(
    await WingsGroupMetrics({
      req,
    } as unknown as WidgetServerProps),
  )

  return { payload, req }
}

const metricFor = (label: string) => {
  const metrics = screen.getByRole('region', { name: 'Số liệu CMS' })
  const link = within(metrics).getByText(label, { selector: 'span' }).closest('a')

  if (!link) {
    throw new Error(`Metric link not found for ${label}`)
  }

  return link
}

describe('WingsGroupMetrics truthful server read model', () => {
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('keeps all initial Local API reads bound to the request access context', async () => {
    const { payload, req } = await renderWidget()

    for (const [args] of payload.count.mock.calls) {
      expect(args.overrideAccess).toBe(false)
      expect(args.req).toBe(req)
    }

    for (const [args] of payload.find.mock.calls) {
      expect(args.overrideAccess).toBe(false)
      expect(args.req).toBe(req)
    }
  })

  it('isolates one recent find failure without hiding successful groups', async () => {
    await renderWidget({
      find: async (args) => {
        if (args.collection === 'pages') {
          throw new Error('pages unavailable')
        }

        return defaultFind(args)
      },
    })

    expect(screen.getByRole('alert').textContent).toContain('Không thể tải trang cập nhật gần đây')
    expect(screen.getByText('Bài viết Hà Nội')).toBeTruthy()
    expect(screen.getByText('Liên hệ tour')).toBeTruthy()
    expect(screen.getByText('WingsTravel')).toBeTruthy()
    expect(within(metricFor('Trang')).getByText('4')).toBeTruthy()
  })

  it('shows panel-local loading and retries only the failed recent endpoint', async () => {
    let resolveRetry: (response: Response) => void = () => undefined
    const retryResponse = new Promise<Response>((resolve) => {
      resolveRetry = resolve
    })
    const fetchMock = vi.fn((_input: RequestInfo | URL, _init?: RequestInit) => retryResponse)
    vi.stubGlobal('fetch', fetchMock)

    await renderWidget({
      find: async (args) => {
        if (args.collection === 'pages') {
          throw new Error('pages unavailable')
        }

        return defaultFind(args)
      },
    })

    expect(screen.getByText('Bài viết Hà Nội')).toBeTruthy()
    expect(screen.getByText('WingsTravel')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Tải lại trang cập nhật gần đây' }))

    expect(screen.getByText('Đang tải trang cập nhật gần đây')).toBeTruthy()
    expect(screen.getByText('Bài viết Hà Nội')).toBeTruthy()
    expect(screen.getByText('WingsTravel')).toBeTruthy()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/pages?depth=0&limit=4&sort=-updatedAt')

    await act(async () => {
      resolveRetry(
        jsonResponse({
          docs: [
            {
              id: 'page-retry',
              title: 'Trang sau retry',
              updatedAt: '2026-08-05T04:00:00.000Z',
            },
          ],
        }),
      )
      await retryResponse
    })

    await waitFor(() => expect(screen.getByText('Trang sau retry')).toBeTruthy())
    expect(screen.getByText('Bài viết Hà Nội')).toBeTruthy()
    expect(screen.getByText('WingsTravel')).toBeTruthy()
  })

  it('retries one failed metric without resetting successful metric panels', async () => {
    let resolveRetry: (response: Response) => void = () => undefined
    const retryResponse = new Promise<Response>((resolve) => {
      resolveRetry = resolve
    })
    const fetchMock = vi.fn((_input: RequestInfo | URL, _init?: RequestInit) => retryResponse)
    vi.stubGlobal('fetch', fetchMock)

    await renderWidget({
      count: async (args) => {
        if (args.collection === 'pages' && args.where?._status?.equals === 'draft') {
          throw new Error('draft pages unavailable')
        }

        return defaultCount(args)
      },
    })

    expect(within(metricFor('Trang')).getByText('4')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Tải lại Trang nháp' }))

    expect(within(metricFor('Trang nháp')).getByText('Đang tải dữ liệu')).toBeTruthy()
    expect(within(metricFor('Trang')).getByText('4')).toBeTruthy()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      '/api/pages?depth=0&limit=0&where[_status][equals]=draft',
    )

    await act(async () => {
      resolveRetry(jsonResponse({ totalDocs: 7 }))
      await retryResponse
    })

    await waitFor(() => expect(within(metricFor('Trang nháp')).getByText('7')).toBeTruthy())
    expect(within(metricFor('Trang')).getByText('4')).toBeTruthy()
  })

  it('shows zero only for a successful count and unavailable for malformed success', async () => {
    await renderWidget({
      count: async (args) => {
        if (args.collection === 'pages' && !args.where) {
          return { totalDocs: 0 }
        }

        if (args.collection === 'posts' && !args.where) {
          return { totalDocs: '0' }
        }

        return defaultCount(args)
      },
    })

    expect(within(metricFor('Trang')).getByText('0')).toBeTruthy()
    expect(within(metricFor('Trang')).queryByText('Chưa có dữ liệu')).toBeNull()
    expect(within(metricFor('Bài viết')).getByText('—')).toBeTruthy()
    expect(within(metricFor('Bài viết')).getByText('Chưa có dữ liệu')).toBeTruthy()
    expect(within(metricFor('Bài viết')).queryByText('0')).toBeNull()
  })

  it('distinguishes empty, no-access, and operational error recent groups', async () => {
    await renderWidget({
      find: async (args) => {
        if (args.collection === 'pages') {
          return { docs: [] }
        }

        if (args.collection === 'posts') {
          throw { status: 403 }
        }

        if (args.collection === 'form-submissions') {
          throw new Error('submission service failed')
        }

        return defaultFind(args)
      },
    })

    expect(screen.getByText('Chưa có trang nào được cập nhật gần đây')).toBeTruthy()
    expect(screen.getByText('Không có quyền xem bài viết cập nhật gần đây')).toBeTruthy()
    expect(screen.getByText('Không thể tải lead gần đây').closest('[role="alert"]')).toBeTruthy()
  })

  it('uses shared draft labels and the exact aggregate scope labels', async () => {
    await renderWidget({ role: 'super-admin' })

    expect(screen.getByRole('heading', { name: 'Việc cần xử lý' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Tạo trang nháp' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Site được phân quyền' })).toBeTruthy()
    expect(metricFor('Trang nháp')).toBeTruthy()
    expect(metricFor('Bài viết nháp')).toBeTruthy()
    expect(screen.getByText('Tất cả site được phân quyền')).toBeTruthy()
    expect(screen.getByText('Tất cả locale')).toBeTruthy()
    expect(screen.getByText('Quản trị toàn hệ')).toBeTruthy()
    expect(document.body.textContent).not.toContain('publish')
    expect(document.body.textContent).not.toContain('Import dữ liệu')
  })

  it('marks the summary incomplete instead of claiming nothing noteworthy after a failure', async () => {
    await renderWidget({
      count: async (args) => {
        if (args.collection === 'posts' && args.where?._status?.equals === 'draft') {
          throw new Error('draft count failed')
        }

        if (
          args.collection === 'form-submissions' ||
          (args.collection === 'pages' && args.where?._status?.equals === 'draft')
        ) {
          return { totalDocs: 0 }
        }

        return defaultCount(args)
      },
    })

    expect(screen.getByText('Một số số liệu tóm tắt chưa sẵn sàng')).toBeTruthy()
    expect(screen.queryByText('Chưa có số liệu cần lưu ý')).toBeNull()
  })
})
