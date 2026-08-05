import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import AdminOperatorConsole from '@/components/AdminOperatorConsole'

const endpoints = {
  leadsCount: '/api/form-submissions?depth=0&limit=0',
  mediaCount: '/api/media?depth=0&limit=0',
  me: '/api/users/me',
  pageDrafts: '/api/pages?depth=0&limit=0&where[_status][equals]=draft',
  pagesCount: '/api/pages?depth=0&limit=0',
  postDrafts: '/api/posts?depth=0&limit=0&where[_status][equals]=draft',
  postsCount: '/api/posts?depth=0&limit=0',
  recentLeads: '/api/form-submissions?depth=1&limit=5&sort=-createdAt',
  recentPages: '/api/pages?depth=0&limit=5&sort=-updatedAt',
  sites: '/api/sites?depth=0&limit=20&sort=name',
} as const

type Reply = () => Promise<Response> | Response
type ReplyOverrides = Partial<Record<(typeof endpoints)[keyof typeof endpoints], Reply[]>>

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json' },
    status,
  })

const defaultBodies: Record<string, unknown> = {
  [endpoints.leadsCount]: { totalDocs: 3 },
  [endpoints.mediaCount]: { totalDocs: 8 },
  [endpoints.me]: { user: { role: 'editor' } },
  [endpoints.pageDrafts]: { totalDocs: 0 },
  [endpoints.pagesCount]: { totalDocs: 0 },
  [endpoints.postDrafts]: { totalDocs: 2 },
  [endpoints.postsCount]: { totalDocs: 12 },
  [endpoints.recentLeads]: {
    docs: [
      {
        createdAt: '2026-08-05T02:00:00.000Z',
        form: { title: 'Liên hệ tour' },
        id: 'lead-1',
      },
    ],
  },
  [endpoints.recentPages]: {
    docs: [{ id: 'page-1', title: 'Trang Hà Nội', updatedAt: '2026-08-05T01:00:00.000Z' }],
  },
  [endpoints.sites]: { docs: [{ code: 'wings-travel', id: 'site-1', name: 'WingsTravel' }] },
}

const getURL = (input: RequestInfo | URL) => {
  if (typeof input === 'string') {
    return input
  }

  return input instanceof URL ? input.toString() : input.url
}

const createFetchMock = (overrides: ReplyOverrides = {}) => {
  const queues = new Map(
    Object.entries(overrides).map(([url, replies]) => [url, [...(replies ?? [])]]),
  )

  return vi.fn(async (input: RequestInfo | URL) => {
    const url = getURL(input)
    const reply = queues.get(url)?.shift()

    if (reply) {
      return await reply()
    }

    if (!(url in defaultBodies)) {
      throw new Error(`Unexpected request: ${url}`)
    }

    return jsonResponse(defaultBodies[url])
  })
}

const getMetric = (name: string) => screen.getByRole('article', { name })

describe('AdminOperatorConsole request states', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/admin/console')
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('renders isolated loading states and a skip link that targets the focusable main', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>(() => undefined)),
    )

    render(<AdminOperatorConsole />)

    expect(screen.getByText('Đang tải vai trò.')).toBeTruthy()
    expect(screen.getByText('Đang tải danh sách site.')).toBeTruthy()
    expect(screen.getByText('Đang tải trang cập nhật gần đây.')).toBeTruthy()
    expect(screen.getByText('Đang tải lead gần đây.')).toBeTruthy()
    expect(screen.getAllByText('Đang tải dữ liệu.')).toHaveLength(6)

    const main = screen.getByRole('main')
    expect(main.getAttribute('id')).toBe('cms-console-main')
    expect(main.getAttribute('tabindex')).toBe('-1')
    expect(screen.getByText('Bỏ qua đến nội dung Console').getAttribute('href')).toBe(
      '#cms-console-main',
    )
  })

  it('keeps a successful numeric zero in the ready state', async () => {
    vi.stubGlobal('fetch', createFetchMock())

    render(<AdminOperatorConsole />)
    await screen.findByText('Biên tập viên')

    const pagesMetric = getMetric('Trang')
    expect(within(pagesMetric).getByText('0')).toBeTruthy()
    expect(within(pagesMetric).queryByText('Chưa có dữ liệu.')).toBeNull()
    expect(within(pagesMetric).queryByRole('button')).toBeNull()
  })

  it('renders successful empty collection responses as empty', async () => {
    vi.stubGlobal(
      'fetch',
      createFetchMock({
        [endpoints.recentLeads]: [() => jsonResponse({ docs: [] })],
        [endpoints.recentPages]: [() => jsonResponse({ docs: [] })],
        [endpoints.sites]: [() => jsonResponse({ docs: [] })],
      }),
    )

    render(<AdminOperatorConsole />)

    expect(await screen.findByText('Chưa có site được gán.')).toBeTruthy()
    expect(screen.getByText('Chưa có trang nào được cập nhật gần đây.')).toBeTruthy()
    expect(screen.getByText('Chưa có lead nào.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Tải lại (danh sách site|trang|lead)/ })).toBeNull()
  })

  it('maps 401 and 403 to no-access without offering retries', async () => {
    vi.stubGlobal(
      'fetch',
      createFetchMock({
        [endpoints.me]: [() => jsonResponse({}, 401)],
        [endpoints.pagesCount]: [() => jsonResponse({}, 403)],
        [endpoints.recentLeads]: [() => jsonResponse({}, 403)],
        [endpoints.recentPages]: [() => jsonResponse({}, 401)],
        [endpoints.sites]: [() => jsonResponse({}, 403)],
      }),
    )

    render(<AdminOperatorConsole />)

    expect(await screen.findByText('Không có quyền xem vai trò.')).toBeTruthy()
    expect(screen.getByText('Không có quyền xem danh sách site.')).toBeTruthy()
    expect(screen.getByText('Không có quyền xem trang cập nhật gần đây.')).toBeTruthy()
    expect(screen.getByText('Không có quyền xem lead gần đây.')).toBeTruthy()
    expect(within(getMetric('Trang')).getByText('Không có quyền xem.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Tải lại/ })).toBeNull()
  })

  it('uses alerts for network and 5xx errors and unavailable for malformed success data', async () => {
    vi.stubGlobal(
      'fetch',
      createFetchMock({
        [endpoints.me]: [() => jsonResponse({ user: {} })],
        [endpoints.pagesCount]: [() => jsonResponse({}, 503)],
        [endpoints.postsCount]: [() => jsonResponse({ totalDocs: '12' })],
        [endpoints.recentLeads]: [() => jsonResponse({}, 500)],
        [endpoints.recentPages]: [() => Promise.reject(new TypeError('network unavailable'))],
        [endpoints.sites]: [() => jsonResponse({ docs: 'not-an-array' })],
      }),
    )

    render(<AdminOperatorConsole />)

    expect(await screen.findByText('Dữ liệu vai trò không khả dụng.')).toBeTruthy()
    expect(screen.getByText('Dữ liệu site không khả dụng.')).toBeTruthy()
    expect(within(getMetric('Bài viết')).getByText('Chưa có dữ liệu.')).toBeTruthy()

    const pageMetricAlert = within(getMetric('Trang')).getByRole('alert')
    expect(pageMetricAlert.textContent).toContain('Không thể tải dữ liệu.')
    expect(
      screen.getByText('Không thể tải trang cập nhật gần đây.').closest('[role="alert"]'),
    ).toBeTruthy()
    expect(screen.getByText('Không thể tải lead gần đây.').closest('[role="alert"]')).toBeTruthy()
  })

  it('retries only one failed metric and retains successful panels', async () => {
    const fetchMock = createFetchMock({
      [endpoints.pagesCount]: [() => jsonResponse({}, 500), () => jsonResponse({ totalDocs: 7 })],
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<AdminOperatorConsole />)

    const retry = await screen.findByRole('button', { name: 'Tải lại Trang' })
    expect(within(getMetric('Bài viết')).getByText('12')).toBeTruthy()
    expect(screen.getByText('WingsTravel')).toBeTruthy()

    fireEvent.click(retry)

    await waitFor(() => expect(within(getMetric('Trang')).getByText('7')).toBeTruthy())
    expect(within(getMetric('Bài viết')).getByText('12')).toBeTruthy()
    expect(screen.getByText('WingsTravel')).toBeTruthy()

    const callsFor = (url: string) =>
      fetchMock.mock.calls.filter(([input]) => getURL(input as RequestInfo | URL) === url).length

    expect(callsFor(endpoints.pagesCount)).toBe(2)
    expect(callsFor(endpoints.postsCount)).toBe(1)
    expect(callsFor(endpoints.sites)).toBe(1)
    expect(callsFor(endpoints.recentPages)).toBe(1)
  })

  it('keeps truthful draft labels, real routes, and super-admin visibility', async () => {
    vi.stubGlobal(
      'fetch',
      createFetchMock({
        [endpoints.me]: [() => jsonResponse({ user: { role: 'super-admin' } })],
      }),
    )

    render(<AdminOperatorConsole />)
    await screen.findByText('Quản trị toàn hệ')

    expect(getMetric('Trang nháp')).toBeTruthy()
    expect(getMetric('Bài viết nháp')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Search' }).getAttribute('href')).toBe(
      '/admin/collections/search',
    )
    expect(screen.getAllByRole('link', { name: 'Nhập dữ liệu' }).length).toBeGreaterThan(0)
    expect(document.body.textContent).not.toContain('chờ duyệt')
    expect(document.body.textContent).not.toContain('Import luôn tạo bản nháp')
  })
})
