import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@payloadcms/ui', () => ({
  useDocumentInfo: () => ({ data: { site: 2 }, id: 41 }),
  useLocale: () => ({ code: 'vi' }),
}))

import TourDepartureManager, { TourDepartureForm } from '@/components/TourAuthoring/TourDepartureManager'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const initial = {
  airline: '',
  availabilityStatus: 'open' as const,
  currency: 'VND' as const,
  departureCity: '',
  departureDate: '',
  expiresAt: '',
  priceFrom: '',
  verified: false,
}

describe('Tour departure authoring actions', () => {
  it('keeps input explicit and requires an expiry for verified price/availability', async () => {
    const onSubmit = vi.fn()
    render(<TourDepartureForm initial={initial} onCancel={vi.fn()} onSubmit={onSubmit} />)

    fireEvent.change(screen.getByLabelText('Ngày khởi hành'), { target: { value: '2026-10-03' } })
    fireEvent.change(screen.getByLabelText('Giá'), { target: { value: '12,000,000' } })
    fireEvent.click(screen.getByLabelText(/Tôi xác nhận/))
    fireEvent.click(screen.getByRole('button', { name: 'Lưu lịch khởi hành' }))
    expect(screen.getByRole('alert').textContent).toContain('Đã xác minh cần có thời điểm hết hạn')
    expect(onSubmit).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText('Hết hạn xác minh'), { target: { value: '2026-10-01T00:00' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu lịch khởi hành' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ priceFrom: '12000000', verified: true }), 'done'))
  })

  it('exposes both create actions, preserves failed input, and translates availability', async () => {
    const response = (body: unknown, status = 200) => ({ ok: status < 400, status, json: async () => body })
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ docs: [{ id: 1, airline: '', availabilityStatus: 'open', currency: 'VND', departureCity: '', departureDate: '2026-10-03', expiresAt: null, priceFrom: 12000000, updatedAt: '2026-09-17T00:00:00.000Z' }] }))
      .mockResolvedValueOnce(response({}, 500))
      .mockImplementation(async (_input: RequestInfo | URL, init?: RequestInit) => response(init?.method === 'POST' ? {} : { docs: [] }, init?.method === 'POST' ? 201 : 200))
    vi.stubGlobal('fetch', fetchMock)

    render(<TourDepartureManager />)
    await waitFor(() => expect(screen.getByText('Mở bán / Open')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Thêm lịch' }))
    fireEvent.change(screen.getByLabelText('Ngày khởi hành'), { target: { value: '2026-11-01' } })
    fireEvent.change(screen.getByLabelText('Giá'), { target: { value: '13000000' } })
    expect(screen.getByRole('button', { name: 'Lưu & thêm tiếp' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Lưu & hoàn tất' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Lưu & thêm tiếp' }))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Không lưu được lịch khởi hành'))
    expect((screen.getByLabelText('Giá') as HTMLInputElement).value).toBe('13000000')

    fireEvent.click(screen.getByRole('button', { name: 'Lưu & hoàn tất' }))
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Lưu & hoàn tất' })).toBeNull())

    fireEvent.click(screen.getByRole('button', { name: 'Thêm lịch' }))
    fireEvent.change(screen.getByLabelText('Ngày khởi hành'), { target: { value: '2026-12-01' } })
    fireEvent.change(screen.getByLabelText('Giá'), { target: { value: '14000000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu & thêm tiếp' }))
    await waitFor(() => expect((screen.getByLabelText('Ngày khởi hành') as HTMLInputElement).value).toBe(''))
  })
})
