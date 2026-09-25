import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const uiMocks = vi.hoisted(() => ({ setValue: vi.fn() }))

vi.mock('@payloadcms/ui', () => ({
  FieldError: () => null,
  FieldLabel: ({ label }: { label?: string }) => React.createElement('label', null, label),
  useAuth: () => ({ user: { role: 'super-admin', sites: [1, 2] } }),
  useDocumentInfo: () => ({ data: { site: 2 }, id: 41 }),
  useField: () => ({ errorMessage: null, setValue: uiMocks.setValue, showError: false, value: null }),
  useFormModified: () => false,
  useLocale: () => ({ code: 'vi' }),
}))

import TourDepartureManager, { TourDepartureForm } from '@/components/TourAuthoring/TourDepartureManager'
import TourAuthoringReadiness from '@/components/TourAuthoring/TourAuthoringReadiness'
import TourProductSiteField from '@/components/TourAuthoring/TourProductSiteField'
import TourSlugField from '@/components/TourAuthoring/TourSlugField'

afterEach(() => {
  cleanup()
  uiMocks.setValue.mockReset()
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

  it('stores numeric site IDs from the create-tour selector', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      json: async () => ({ docs: [{ id: 1, name: 'WingSide' }, { id: 2, name: 'WingsGo' }] }),
      ok: true,
    }))

    render(<TourProductSiteField field={{ label: 'Site' }} path="site" />)
    fireEvent.change(await screen.findByRole('combobox', { name: 'Site' }), { target: { value: '2' } })

    expect(uiMocks.setValue).toHaveBeenCalledWith(2)
  })

  it('normalizes the tour slug while the editor types', () => {
    render(<TourSlugField field={{ label: 'Đường dẫn tour' }} path="slug" />)

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Seoul-Nami-2026' } })

    expect(uiMocks.setValue).toHaveBeenCalledWith('seoul-nami-2026')
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
    expect(screen.getByRole('group', { name: 'Form lịch khởi hành' }).className).toContain('tour-authoring-quick-add-card')
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

  it('persists a quick-added departure and reloads it from the related collection', async () => {
    const response = (body: unknown, status = 200) => ({ ok: status < 400, status, json: async () => body })
    let savedDeparture: Record<string, unknown> | null = null
    let listReads = 0
    let postedURL = ''
    let postedBody: Record<string, unknown> | null = null
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'POST') {
        postedURL = String(input)
        postedBody = JSON.parse(String(init.body)) as Record<string, unknown>
        savedDeparture = {
          _status: 'draft',
          airline: 'Vietnam Airlines',
          availabilityStatus: 'open',
          currency: 'VND',
          departureCity: 'Hà Nội',
          departureDate: '2026-11-01T00:00:00.000Z',
          expiresAt: null,
          id: 52,
          priceFrom: 15000000,
          updatedAt: '2026-09-19T00:00:00.000Z',
        }
        return response(savedDeparture, 201)
      }

      listReads += 1
      return response({ docs: savedDeparture ? [savedDeparture] : [] })
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<TourDepartureManager />)
    await waitFor(() => expect(listReads).toBe(1))
    fireEvent.click(screen.getByRole('button', { name: 'Thêm lịch' }))
    fireEvent.change(screen.getByLabelText('Ngày khởi hành'), { target: { value: '2026-11-01' } })
    fireEvent.change(screen.getByLabelText('Điểm đi'), { target: { value: 'Hà Nội' } })
    fireEvent.change(screen.getByLabelText('Hãng bay'), { target: { value: 'Vietnam Airlines' } })
    fireEvent.change(screen.getByLabelText('Giá'), { target: { value: '15000000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu & hoàn tất' }))

    await waitFor(() => expect(screen.getByText('Vietnam Airlines')).toBeTruthy())
    expect(screen.getByText('15.000.000')).toBeTruthy()
    expect(postedURL).toBe('/api/tour-departures')
    expect(postedBody).toMatchObject({
      _status: 'draft',
      departureCity: 'Hà Nội',
      departureDate: '2026-11-01',
      priceFrom: 15000000,
      site: 2,
      tourProduct: 41,
    })
    expect(listReads).toBe(2)
    expect(screen.queryByRole('button', { name: 'Lưu & hoàn tất' })).toBeNull()
  })

  it('shows wrapper drift and relinks only a matching candidate', async () => {
    const response = (body: unknown, status = 200) => ({ ok: status < 400, status, json: async () => body })
    const state = {
      canPublish: false,
      departures: [],
      issues: [{ code: 'invalid_wrapper', message: 'Wrapper không đúng đường dẫn dự kiến /tour/<slug>.', severity: 'error' }],
      product: { expectedPath: '/tour/demo', id: 41, site: 2, slug: 'demo', status: 'draft', updatedAt: 'now' },
      revision: 'a'.repeat(64),
      wrapper: { health: 'invalid_path', id: 314, path: '/tour/old', site: 2, status: 'draft' },
      wrapperCandidates: [{ health: 'valid', id: 315, path: '/tour/demo', site: 2, status: 'draft' }],
    }
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(state))
      .mockResolvedValueOnce(response({ ...state, canPublish: true, issues: [], wrapper: state.wrapperCandidates[0], wrapperCandidates: [] }))
    vi.stubGlobal('fetch', fetchMock)

    render(<TourAuthoringReadiness />)
    await waitFor(() => expect(screen.getByText('/tour/old')).toBeTruthy())
    expect(screen.getByText('/tour/demo')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Gán wrapper này' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toMatchObject({ action: 'relink', wrapperID: 315, locale: 'vi' })
  })
})
