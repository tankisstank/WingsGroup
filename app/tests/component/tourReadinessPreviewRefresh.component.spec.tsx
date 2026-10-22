import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const uiMocks = vi.hoisted(() => ({
  documentData: { id: 75, site: 2, title: 'Tour Khám Phá Tokyo - Phú Sĩ' } as Record<string, unknown> | null,
  documentId: 75 as number | string | null | undefined,
  formModified: false,
  localeCode: 'vi',
  reportUpdate: vi.fn(),
}))

vi.mock('@payloadcms/ui', () => ({
  useDocumentEvents: () => ({
    mostRecentUpdate: null,
    reportUpdate: uiMocks.reportUpdate,
  }),
  useDocumentInfo: () => ({ data: uiMocks.documentData, id: uiMocks.documentId }),
  useFormModified: () => uiMocks.formModified,
  useLocale: () => ({ code: uiMocks.localeCode }),
}))

import TourAuthoringReadiness from '@/components/TourAuthoring/TourAuthoringReadiness'

afterEach(() => {
  cleanup()
  uiMocks.documentData = { id: 75, site: 2, title: 'Tour Khám Phá Tokyo - Phú Sĩ' }
  uiMocks.documentId = 75
  uiMocks.formModified = false
  uiMocks.localeCode = 'vi'
  uiMocks.reportUpdate.mockReset()
  vi.unstubAllGlobals()
})

const makeReadiness = (overrides?: Record<string, unknown>) => ({
  canPublish: true,
  departures: [
    { id: 11, status: 'draft', updatedAt: '2026-09-17T00:00:00.000Z' },
    { id: 12, status: 'draft', updatedAt: '2026-09-17T00:00:00.000Z' },
  ],
  issues: [],
  product: { id: 75, site: 2, status: 'draft', updatedAt: '2026-09-17T00:00:00.000Z' },
  revision: 'rev-1',
  wrapper: { id: 91, path: '/tours/sample', status: 'draft' },
  ...overrides,
})

const mockResponse = (body: unknown, status = 200) => ({
  json: async () => body,
  ok: status < 400,
  status,
})

describe('TourAuthoringReadiness - Preview Refresh & DocumentEvents', () => {
  it('calls reportUpdate on successful publication action with tour-products slug and valid ISO timestamp', async () => {
    const readiness = makeReadiness()
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'POST') {
        return mockResponse({ ...readiness, product: { ...readiness.product, status: 'published' } })
      }
      return mockResponse(readiness)
    })
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('confirm', vi.fn(() => true))

    render(<TourAuthoringReadiness />)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Xuất bản tour' })).toBeTruthy())

    // Select departure to enable publish button
    const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[]
    fireEvent.click(checkboxes[0])

    const publishBtn = screen.getByRole('button', { name: 'Xuất bản tour' }) as HTMLButtonElement
    expect(publishBtn.disabled).toBe(false)
    fireEvent.click(publishBtn)

    await waitFor(() => expect(uiMocks.reportUpdate).toHaveBeenCalledTimes(1))
    expect(uiMocks.reportUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        doc: expect.objectContaining({
          id: 75,
          site: 2,
          title: 'Tour Khám Phá Tokyo - Phú Sĩ',
        }),
        entitySlug: 'tour-products',
        id: 75,
        operation: 'update',
        updatedAt: expect.any(String),
      }),
    )

    // Regression assertions: Relationship/Input.js dereferences mostRecentUpdate.doc.id unconditionally
    const callArg = uiMocks.reportUpdate.mock.calls[0][0]
    expect(callArg.doc).toBeDefined()
    expect(callArg.doc.id).toBe(75)
    expect(callArg.doc.title).toBe('Tour Khám Phá Tokyo - Phú Sĩ')
    expect(callArg.id).toBe(75)
    expect(Number.isFinite(Date.parse(callArg.updatedAt))).toBe(true)
  })

  it('calls reportUpdate on successful non-publish action (e.g. provision replacement wrapper)', async () => {
    const readiness = makeReadiness()
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'POST') {
        return mockResponse({ ...readiness, wrapper: { id: 99, path: '/tours/sample', status: 'draft' } })
      }
      return mockResponse(readiness)
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<TourAuthoringReadiness />)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Tạo wrapper thay thế' })).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: 'Tạo wrapper thay thế' }))

    await waitFor(() => expect(uiMocks.reportUpdate).toHaveBeenCalledTimes(1))
    expect(uiMocks.reportUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        doc: expect.objectContaining({
          id: 75,
          site: 2,
          title: 'Tour Khám Phá Tokyo - Phú Sĩ',
        }),
        entitySlug: 'tour-products',
        id: 75,
        operation: 'update',
        updatedAt: expect.any(String),
      }),
    )

    const callArg = uiMocks.reportUpdate.mock.calls[0][0]
    expect(callArg.doc).toBeDefined()
    expect(callArg.doc.id).toBe(75)
    expect(callArg.doc.title).toBe('Tour Khám Phá Tokyo - Phú Sĩ')
    expect(callArg.id).toBe(75)
    expect(Number.isFinite(Date.parse(callArg.updatedAt))).toBe(true)
  })

  it('does NOT call reportUpdate when POST action returns an error status', async () => {
    const readiness = makeReadiness()
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'POST') {
        return mockResponse({ message: 'Tạo wrapper thất bại.' }, 500)
      }
      return mockResponse(readiness)
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<TourAuthoringReadiness />)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Tạo wrapper thay thế' })).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: 'Tạo wrapper thay thế' }))

    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy())
    expect(uiMocks.reportUpdate).not.toHaveBeenCalled()
  })

  it('does NOT call reportUpdate when user cancels publication confirmation dialog', async () => {
    const readiness = makeReadiness()
    const fetchMock = vi.fn(async () => mockResponse(readiness))
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('confirm', vi.fn(() => false)) // user cancels

    render(<TourAuthoringReadiness />)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Xuất bản tour' })).toBeTruthy())

    const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[]
    fireEvent.click(checkboxes[0])

    fireEvent.click(screen.getByRole('button', { name: 'Xuất bản tour' }))

    await new Promise((r) => setTimeout(r, 60))
    expect(uiMocks.reportUpdate).not.toHaveBeenCalled()
  })

  it('does NOT call reportUpdate when action network request rejects', async () => {
    const readiness = makeReadiness()
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'POST') {
        throw new Error('Network error')
      }
      return mockResponse(readiness)
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<TourAuthoringReadiness />)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Tạo wrapper thay thế' })).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: 'Tạo wrapper thay thế' }))

    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy())
    expect(uiMocks.reportUpdate).not.toHaveBeenCalled()
  })

  it('does NOT emit reportUpdate when locale changes while action is in-flight (stale context guard)', async () => {
    const readiness = makeReadiness()
    let resolvePost!: (value: ReturnType<typeof mockResponse>) => void
    const postPromise = new Promise<ReturnType<typeof mockResponse>>((res) => {
      resolvePost = res
    })

    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'POST') {
        return postPromise
      }
      return mockResponse(readiness)
    })
    vi.stubGlobal('fetch', fetchMock)

    const { rerender } = render(<TourAuthoringReadiness />)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Tạo wrapper thay thế' })).toBeTruthy())

    // 1. Trigger action in initial 'vi' context
    fireEvent.click(screen.getByRole('button', { name: 'Tạo wrapper thay thế' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/tour-authoring/75'),
      expect.objectContaining({ method: 'POST' }),
    ))

    // 2. Locale changes to 'en' while POST is pending
    uiMocks.localeCode = 'en'
    rerender(<TourAuthoringReadiness />)
    await waitFor(() => expect((screen.getByRole('button', { name: 'Create replacement wrapper' }) as HTMLButtonElement).disabled).toBe(false))

    // 3. Stale POST resolves
    resolvePost(mockResponse({ ...readiness, wrapper: { id: 105, path: '/tours/sample', status: 'draft' } }))

    // 4. Stale completion should drop response and never call reportUpdate
    await new Promise((r) => setTimeout(r, 60))
    expect(uiMocks.reportUpdate).not.toHaveBeenCalled()
  })

  it.each([
    { data: null, description: 'null document data' },
    { data: { site: 2, title: 'No ID Tour' }, description: 'missing data.id' },
    { data: { id: 76, site: 2, title: 'Mismatched Tour' }, description: 'mismatched data.id (76 vs 75)' },
  ])('does NOT call reportUpdate when useDocumentInfo data is $description (identity guard)', async ({ data }) => {
    uiMocks.documentData = data
    uiMocks.documentId = 75
    const readiness = makeReadiness()
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'POST') {
        return mockResponse({ ...readiness, wrapper: { id: 99, path: '/tours/sample', status: 'draft' } })
      }
      return mockResponse(readiness)
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<TourAuthoringReadiness />)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Tạo wrapper thay thế' })).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: 'Tạo wrapper thay thế' }))

    // Wait for POST action completion rendered in UI (#99 replacement wrapper) instead of arbitrary sleep
    await waitFor(() => expect(screen.getByText('#99')).toBeTruthy())
    expect(uiMocks.reportUpdate).not.toHaveBeenCalled()
  })

  it.each([
    { dataId: 75, description: 'numeric route id 75 with numeric data.id 75', routeId: 75 },
    { dataId: 75, description: 'string route id "75" with numeric data.id 75', routeId: '75' },
  ])('emits canonical numeric id on valid identity match ($description)', async ({ routeId, dataId }) => {
    uiMocks.documentId = routeId
    uiMocks.documentData = { id: dataId, site: 2, title: 'Tour Khám Phá Tokyo - Phú Sĩ' }
    const readiness = makeReadiness()
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'POST') {
        return mockResponse({ ...readiness, wrapper: { id: 99, path: '/tours/sample', status: 'draft' } })
      }
      return mockResponse(readiness)
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<TourAuthoringReadiness />)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Tạo wrapper thay thế' })).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: 'Tạo wrapper thay thế' }))

    await waitFor(() => expect(uiMocks.reportUpdate).toHaveBeenCalledTimes(1))
    expect(uiMocks.reportUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        doc: expect.objectContaining({
          id: 75,
          site: 2,
          title: 'Tour Khám Phá Tokyo - Phú Sĩ',
        }),
        entitySlug: 'tour-products',
        id: 75,
        operation: 'update',
        updatedAt: expect.any(String),
      }),
    )

    const callArg = uiMocks.reportUpdate.mock.calls[0][0]
    expect(callArg.doc).toBeDefined()
    expect(callArg.doc.id).toBe(75)
    expect(typeof callArg.doc.id).toBe('number')
    expect(callArg.doc.title).toBe('Tour Khám Phá Tokyo - Phú Sĩ')
    expect(callArg.id).toBe(75)
    expect(typeof callArg.id).toBe('number')
    expect(Number.isFinite(Date.parse(callArg.updatedAt))).toBe(true)
  })
})
