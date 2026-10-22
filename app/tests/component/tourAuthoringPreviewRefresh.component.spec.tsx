import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const uiMocks = vi.hoisted(() => ({
  localeCode: 'vi',
  reportUpdate: vi.fn(),
  setValue: vi.fn(),
}))

vi.mock('@payloadcms/ui', () => ({
  FieldError: () => null,
  FieldLabel: ({ label }: { label?: string }) => React.createElement('label', null, label),
  useAuth: () => ({ user: { role: 'super-admin', sites: [1, 2] } }),
  useDocumentEvents: () => ({ reportUpdate: uiMocks.reportUpdate }),
  useDocumentInfo: () => ({
    data: { id: 41, site: 2, slug: 'tour-seoul', title: 'Hành trình Seoul mùa lá đỏ' },
    id: 41,
  }),
  useField: () => ({ errorMessage: null, setValue: uiMocks.setValue, showError: false, value: 'tour-seoul' }),
  useFormModified: () => false,
  useLocale: () => ({ code: uiMocks.localeCode }),
}))

vi.mock('@/components/TourAuthoring/TourAuthoringReadiness', () => ({
  default: ({ departureRevision }: { departureRevision?: number }) => (
    <div data-revision={departureRevision ?? 0} data-testid="readiness-mock">
      Readiness Mock
    </div>
  ),
}))

import TourProductAuthoring from '@/components/TourAuthoring'

const makeResponse = (body: unknown, status = 200) => ({
  json: async () => body,
  ok: status >= 200 && status < 300,
  status,
})

describe('TourProductAuthoring preview refresh event contracts (US083)', () => {
  beforeEach(() => {
    uiMocks.localeCode = 'vi'
    uiMocks.reportUpdate.mockReset()
    uiMocks.setValue.mockReset()
    window.confirm = vi.fn().mockReturnValue(true)
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('triggers useDocumentEvents().reportUpdate and increments readiness revision after successful departure create and edit with promo', async () => {
    const existingDoc = {
      airline: 'VJ',
      availabilityStatus: 'open',
      currency: 'VND',
      departureCity: 'Hà Nội',
      departureDate: '2026-11-20',
      expiresAt: '2099-12-31T23:59:00.000Z',
      id: 99,
      originalPrice: 18000000,
      priceFrom: 15000000,
      promoLabel: 'Flash Sale Mùa Thu',
      updatedAt: '2026-09-01T00:00:00.000Z',
    }

    const fetchMock = vi.fn().mockImplementation(async (url: string | URL, init?: RequestInit) => {
      const urlStr = String(url)
      const method = init?.method || 'GET'

      if (method === 'GET' && urlStr.includes('/api/tour-departures')) {
        return makeResponse({ docs: [] })
      }
      if (method === 'POST' && urlStr.includes('/api/tour-departures')) {
        return makeResponse({ doc: existingDoc }, 201)
      }
      return makeResponse({ docs: [] })
    })

    vi.stubGlobal('fetch', fetchMock)

    render(<TourProductAuthoring />)
    await screen.findByRole('button', { name: 'Thêm lịch' })
    expect(screen.getByTestId('readiness-mock').getAttribute('data-revision')).toBe('0')

    // Open add departure form
    fireEvent.click(screen.getByRole('button', { name: 'Thêm lịch' }))
    fireEvent.change(screen.getByLabelText('Ngày khởi hành'), { target: { value: '2026-11-20' } })
    fireEvent.change(screen.getByLabelText('Giá'), { target: { value: '15000000' } })

    // Enable promotion fields
    fireEvent.click(screen.getByLabelText(/Áp dụng ưu đãi/))
    fireEvent.change(screen.getByLabelText('Giá gốc'), { target: { value: '18000000' } })
    fireEvent.change(screen.getByLabelText('Nhãn promotion'), { target: { value: 'Flash Sale Mùa Thu' } })

    // Verification checkbox and expiry
    fireEvent.click(screen.getByLabelText(/Tôi xác nhận/))
    fireEvent.change(screen.getByLabelText('Hết hạn xác minh'), { target: { value: '2099-12-31T23:59' } })

    // When save completes, reload should return the new doc
    fetchMock.mockImplementation(async (url: string | URL, init?: RequestInit) => {
      const method = init?.method || 'GET'
      if (method === 'PATCH') {
        return makeResponse({ doc: { ...existingDoc, priceFrom: 14000000 } }, 200)
      }
      return makeResponse({ docs: [existingDoc] })
    })

    // Click Save & Complete
    fireEvent.click(screen.getByRole('button', { name: 'Lưu & hoàn tất' }))

    await waitFor(() => {
      expect(uiMocks.reportUpdate).toHaveBeenCalledTimes(1)
      expect(uiMocks.reportUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          doc: expect.objectContaining({
            id: 41,
            site: 2,
            slug: 'tour-seoul',
            title: 'Hành trình Seoul mùa lá đỏ',
          }),
          entitySlug: 'tour-products',
          id: 41,
          operation: 'update',
          updatedAt: expect.any(String),
        }),
      )
    })

    // Regression guard: Relationship/Input.js dereferences mostRecentUpdate.doc.id unconditionally
    const firstCall = uiMocks.reportUpdate.mock.calls[0][0]
    expect(firstCall.doc).toBeDefined()
    expect(firstCall.doc.id).toBe(41)
    expect(firstCall.doc.title).toBe('Hành trình Seoul mùa lá đỏ')
    expect(firstCall.id).toBe(41)
    expect(Number.isFinite(Date.parse(firstCall.updatedAt))).toBe(true)

    expect(screen.getByTestId('readiness-mock').getAttribute('data-revision')).toBe('1')

    // Now edit the saved departure
    const editBtn = await screen.findByRole('button', { name: 'Sửa' })
    fireEvent.click(editBtn)

    fireEvent.change(screen.getByLabelText('Giá'), { target: { value: '14000000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu lịch khởi hành' }))

    await waitFor(() => {
      expect(uiMocks.reportUpdate).toHaveBeenCalledTimes(2)
      expect(uiMocks.reportUpdate).toHaveBeenLastCalledWith(
        expect.objectContaining({
          doc: expect.objectContaining({
            id: 41,
            site: 2,
            slug: 'tour-seoul',
            title: 'Hành trình Seoul mùa lá đỏ',
          }),
          entitySlug: 'tour-products',
          id: 41,
          operation: 'update',
          updatedAt: expect.any(String),
        }),
      )
    })

    const secondCall = uiMocks.reportUpdate.mock.calls[1][0]
    expect(secondCall.doc).toBeDefined()
    expect(secondCall.doc.id).toBe(41)
    expect(secondCall.doc.title).toBe('Hành trình Seoul mùa lá đỏ')
    expect(secondCall.id).toBe(41)
    expect(Number.isFinite(Date.parse(secondCall.updatedAt))).toBe(true)

    expect(screen.getByTestId('readiness-mock').getAttribute('data-revision')).toBe('2')
  })

  it('does NOT emit reportUpdate when departure mutation fails on server error', async () => {
    const fetchMock = vi.fn().mockImplementation(async (_url: string | URL, init?: RequestInit) => {
      const method = init?.method || 'GET'
      if (method === 'POST') {
        return makeResponse({ message: 'Server database constraint error' }, 500)
      }
      return makeResponse({ docs: [] })
    })

    vi.stubGlobal('fetch', fetchMock)

    render(<TourProductAuthoring />)
    await screen.findByRole('button', { name: 'Thêm lịch' })

    fireEvent.click(screen.getByRole('button', { name: 'Thêm lịch' }))
    fireEvent.change(screen.getByLabelText('Ngày khởi hành'), { target: { value: '2026-11-20' } })
    fireEvent.change(screen.getByLabelText('Giá'), { target: { value: '15000000' } })

    fireEvent.click(screen.getByRole('button', { name: 'Lưu & hoàn tất' }))

    await screen.findByRole('alert')
    expect(screen.getByRole('alert').textContent).toContain('Server database constraint error')

    expect(uiMocks.reportUpdate).not.toHaveBeenCalled()
    expect(screen.getByTestId('readiness-mock').getAttribute('data-revision')).toBe('0')
  })

  it('triggers useDocumentEvents().reportUpdate and increments readiness revision after successful departure delete', async () => {
    const existingDoc = {
      airline: 'VJ',
      availabilityStatus: 'open',
      currency: 'VND',
      departureCity: 'Đà Nẵng',
      departureDate: '2026-12-05',
      expiresAt: null,
      id: 77,
      originalPrice: null,
      priceFrom: 12000000,
      promoLabel: null,
      updatedAt: '2026-09-01T00:00:00.000Z',
    }

    let deleted = false
    const fetchMock = vi.fn().mockImplementation(async (_url: string | URL, init?: RequestInit) => {
      const method = init?.method || 'GET'
      if (method === 'DELETE') {
        deleted = true
        return makeResponse({}, 200)
      }
      return makeResponse({ docs: deleted ? [] : [existingDoc] })
    })

    vi.stubGlobal('fetch', fetchMock)

    render(<TourProductAuthoring />)
    const deleteBtn = await screen.findByRole('button', { name: 'Xóa' })

    fireEvent.click(deleteBtn)

    await waitFor(() => {
      expect(uiMocks.reportUpdate).toHaveBeenCalledTimes(1)
      expect(uiMocks.reportUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          doc: expect.objectContaining({
            id: 41,
            site: 2,
            slug: 'tour-seoul',
            title: 'Hành trình Seoul mùa lá đỏ',
          }),
          entitySlug: 'tour-products',
          id: 41,
          operation: 'update',
          updatedAt: expect.any(String),
        }),
      )
    })

    const deleteCall = uiMocks.reportUpdate.mock.calls[0][0]
    expect(deleteCall.doc).toBeDefined()
    expect(deleteCall.doc.id).toBe(41)
    expect(deleteCall.doc.title).toBe('Hành trình Seoul mùa lá đỏ')
    expect(deleteCall.id).toBe(41)
    expect(Number.isFinite(Date.parse(deleteCall.updatedAt))).toBe(true)

    expect(screen.getByTestId('readiness-mock').getAttribute('data-revision')).toBe('1')
  })

  it('suppresses reportUpdate when in-flight departure save completes after context has changed (locale roundtrip / stale guard)', async () => {
    let resolvePost: (value: ReturnType<typeof makeResponse>) => void
    const postPromise = new Promise<ReturnType<typeof makeResponse>>((resolve) => {
      resolvePost = resolve
    })

    const fetchMock = vi.fn().mockImplementation(async (_url: string | URL, init?: RequestInit) => {
      const method = init?.method || 'GET'
      if (method === 'POST') {
        return postPromise
      }
      return makeResponse({ docs: [] })
    })

    vi.stubGlobal('fetch', fetchMock)

    const { rerender } = render(<TourProductAuthoring />)
    await screen.findByRole('button', { name: 'Thêm lịch' })

    fireEvent.click(screen.getByRole('button', { name: 'Thêm lịch' }))
    fireEvent.change(screen.getByLabelText('Ngày khởi hành'), { target: { value: '2026-11-20' } })
    fireEvent.change(screen.getByLabelText('Giá'), { target: { value: '15000000' } })

    // Start mutation (in-flight)
    fireEvent.click(screen.getByRole('button', { name: 'Lưu & hoàn tất' }))

    // While request is in-flight, simulate switching locale which increments contextVersion
    uiMocks.localeCode = 'en'
    rerender(<TourProductAuthoring />)

    // Now resolve the in-flight POST request
    resolvePost!(makeResponse({ doc: { id: 55 } }, 201))

    // Allow any microtasks to settle
    await new Promise((r) => setTimeout(r, 50))

    // Stale guard bails out before calling onSaved
    expect(uiMocks.reportUpdate).not.toHaveBeenCalled()
    expect(screen.getByTestId('readiness-mock').getAttribute('data-revision')).toBe('0')
  })
})
