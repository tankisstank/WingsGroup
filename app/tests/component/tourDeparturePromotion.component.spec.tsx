import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const uiMocks = vi.hoisted(() => ({
  documentId: 41,
  documentSite: 2,
  localeCode: 'vi',
  setValue: vi.fn(),
}))

vi.mock('@payloadcms/ui', () => ({
  FieldError: () => null,
  FieldLabel: ({ label }: { label?: string }) => React.createElement('label', null, label),
  useAuth: () => ({ user: { role: 'super-admin', sites: [1, 2] } }),
  useDocumentEvents: () => ({ reportUpdate: vi.fn() }),
  useDocumentInfo: () => ({ data: { site: uiMocks.documentSite }, id: uiMocks.documentId }),
  useField: () => ({ errorMessage: null, setValue: uiMocks.setValue, showError: false, value: null }),
  useFormModified: () => false,
  useLocale: () => ({ code: uiMocks.localeCode }),
}))

import TourDepartureManager, {
  type DepartureFormValue,
  TourDepartureForm,
} from '@/components/TourAuthoring/TourDepartureManager'

afterEach(() => {
  cleanup()
  uiMocks.setValue.mockReset()
  uiMocks.localeCode = 'vi'
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

const defaultInitial: DepartureFormValue = {
  airline: '', availabilityStatus: 'open', currency: 'VND', departureCity: '',
  departureDate: '2026-11-01', expiresAt: '', originalPrice: '', priceFrom: '10000000',
  promoLabel: '', promotionEnabled: false, verified: false,
}

const existingDeparture = {
  _status: 'draft', airline: 'Vietnam Airlines', availabilityStatus: 'open',
  currency: 'VND', departureCity: 'Hà Nội', departureDate: '2026-11-15T00:00:00.000Z',
  expiresAt: null, id: 77, originalPrice: 15000000, priceFrom: 12000000,
  promoLabel: 'Ưu đãi mùa thu', updatedAt: '2026-10-20T00:00:00.000Z',
}

const mockResponse = (body: unknown, status = 200) => ({
  json: async () => body,
  ok: status < 400,
  status,
})

describe('US083 CMS Tour Departure Promotion - Component Tests', () => {
  it('defaults promotion fields to hidden and toggles inputs on checkbox change', () => {
    render(<TourDepartureForm initial={defaultInitial} onCancel={vi.fn()} onSubmit={vi.fn()} />)
    const toggle = screen.getByLabelText('Áp dụng ưu đãi') as HTMLInputElement
    expect(toggle.checked).toBe(false)
    expect(screen.queryByLabelText('Giá gốc')).toBeNull()

    fireEvent.click(toggle)
    expect(toggle.checked).toBe(true)
    expect(screen.getByLabelText('Giá gốc')).toBeTruthy()
    expect(screen.getByLabelText('Nhãn promotion')).toBeTruthy()

    fireEvent.click(toggle)
    expect(toggle.checked).toBe(false)
    expect(screen.queryByLabelText('Giá gốc')).toBeNull()
  })

  it('validates promotion price bounds and requirements, allowing label-only', async () => {
    const onSubmit = vi.fn()
    render(<TourDepartureForm initial={defaultInitial} onCancel={vi.fn()} onSubmit={onSubmit} />)
    fireEvent.click(screen.getByLabelText('Áp dụng ưu đãi'))
    const save = () => fireEvent.click(screen.getByRole('button', { name: 'Lưu lịch khởi hành' }))
    const changeOrig = (value: string) => fireEvent.change(screen.getByLabelText('Giá gốc'), { target: { value } })

    // 1. Both empty
    save()
    expect(screen.getByRole('alert').textContent).toContain('Nhập giá gốc hoặc nhãn promotion cho ưu đãi.')
    expect(onSubmit).not.toHaveBeenCalled()

    // 2. Non-numeric & 3. Lower/equal
    const checkInvalid = (val: string) => {
      changeOrig(val)
      save()
      expect(screen.getByRole('alert').textContent).toContain('giá gốc phải hợp lệ và lớn hơn giá bán')
    }
    checkInvalid('invalid-price')
    checkInvalid('8,000,000')

    // 4. Label-only
    changeOrig('')
    fireEvent.change(screen.getByLabelText('Nhãn promotion'), { target: { value: 'Ưu đãi mùa hè' } })
    save()
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ originalPrice: '', priceFrom: '10000000', promoLabel: 'Ưu đãi mùa hè', promotionEnabled: true }),
        'done',
      )
    })

    // 5. Greater price
    changeOrig('12,000,000')
    save()
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ originalPrice: '12000000', priceFrom: '10000000', promotionEnabled: true }),
        'done',
      )
    })
  })

  it('submits promotionEnabled:false, originalPrice:"", promoLabel:"" when disabled to clear promotion', async () => {
    const onSubmit = vi.fn()
    render(
      <TourDepartureForm
        initial={{ ...defaultInitial, originalPrice: '14000000', promoLabel: 'Flash Sale', promotionEnabled: true }}
        onCancel={vi.fn()}
        onSubmit={onSubmit}
      />,
    )
    const toggle = screen.getByLabelText('Áp dụng ưu đãi') as HTMLInputElement
    expect(toggle.checked).toBe(true)

    fireEvent.click(toggle)
    expect(toggle.checked).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: 'Lưu lịch khởi hành' }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ originalPrice: '', promoLabel: '', promotionEnabled: false }),
        'done',
      )
    })
  })

  it('resets verified to false and clears expiresAt whenever promotion or price fields change', () => {
    const verifiedInitial: DepartureFormValue = {
      ...defaultInitial,
      expiresAt: '2027-01-01T12:00',
      originalPrice: '15000000',
      promoLabel: 'Mùa thu',
      promotionEnabled: true,
      verified: true,
    }
    render(<TourDepartureForm initial={verifiedInitial} onCancel={vi.fn()} onSubmit={vi.fn()} />)
    const verifyCheckbox = screen.getByLabelText(/Tôi xác nhận/) as HTMLInputElement
    const reVerify = (action: () => void) => {
      fireEvent.click(verifyCheckbox)
      fireEvent.change(screen.getByLabelText('Hết hạn xác minh'), { target: { value: '2027-01-01T12:00' } })
      action()
      expect(verifyCheckbox.checked).toBe(false)
    }
    expect(verifyCheckbox.checked).toBe(true)

    fireEvent.change(screen.getByLabelText('Giá gốc'), { target: { value: '16000000' } })
    expect(verifyCheckbox.checked).toBe(false)
    expect(screen.queryByLabelText('Hết hạn xác minh')).toBeNull()

    reVerify(() => fireEvent.change(screen.getByLabelText('Nhãn promotion'), { target: { value: 'Mùa đông' } }))
    reVerify(() => fireEvent.click(screen.getByLabelText('Áp dụng ưu đãi')))
    reVerify(() => fireEvent.change(screen.getByLabelText('Giá'), { target: { value: '11000000' } }))
  })

  it('shows promo columns in list, and editing departure sends PATCH with promo payload', async () => {
    let patchUrl = ''
    let patchMethod = ''
    let patchBody: Record<string, unknown> | null = null

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'PATCH') {
        patchUrl = String(input)
        patchMethod = init.method
        patchBody = JSON.parse(String(init.body)) as Record<string, unknown>
        return mockResponse({ ...existingDeparture, ...patchBody }, 200)
      }
      return mockResponse({ docs: [existingDeparture] })
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<TourDepartureManager />)
    await waitFor(() => expect(screen.getByText('12.000.000')).toBeTruthy())
    expect(screen.getByText('15.000.000')).toBeTruthy()
    expect(screen.getByText('Ưu đãi mùa thu')).toBeTruthy()
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('fallback-locale=none'), expect.any(Object))

    fireEvent.click(screen.getByRole('button', { name: 'Sửa' }))
    expect((screen.getByLabelText('Áp dụng ưu đãi') as HTMLInputElement).checked).toBe(true)
    expect((screen.getByLabelText('Giá gốc') as HTMLInputElement).value).toBe('15000000')

    fireEvent.change(screen.getByLabelText('Giá gốc'), { target: { value: '16000000' } })
    fireEvent.change(screen.getByLabelText('Nhãn promotion'), { target: { value: 'Siêu Sale 2026' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu lịch khởi hành' }))

    await waitFor(() => expect(patchMethod).toBe('PATCH'))
    expect(patchUrl).toContain('/api/tour-departures/77')
    expect(patchUrl).toContain('locale=vi')
    expect(patchUrl).toContain('draft=true')
    expect(patchBody).toMatchObject({
      _status: 'draft', originalPrice: 16000000, priceFrom: 12000000,
      promoLabel: 'Siêu Sale 2026', site: 2, tourProduct: 41,
    })
  })

  it('sends originalPrice: null and promoLabel: null in PATCH when promotion is disabled on save', async () => {
    let patchBody: Record<string, unknown> | null = null
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'PATCH') {
        patchBody = JSON.parse(String(init.body)) as Record<string, unknown>
        return mockResponse({ ...existingDeparture, ...patchBody }, 200)
      }
      return mockResponse({ docs: [existingDeparture] })
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<TourDepartureManager />)
    await waitFor(() => expect(screen.getByText('Ưu đãi mùa thu')).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: 'Sửa' }))
    const toggle = screen.getByLabelText('Áp dụng ưu đãi') as HTMLInputElement
    expect(toggle.checked).toBe(true)

    fireEvent.click(toggle)
    fireEvent.click(screen.getByRole('button', { name: 'Lưu lịch khởi hành' }))

    await waitFor(() => expect(patchBody).not.toBeNull())
    expect(patchBody).toMatchObject({ originalPrice: null, promoLabel: null })
  })

  it('preserves user promotion inputs in form when PATCH/POST API fails', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'POST') return mockResponse({ message: 'Lỗi máy chủ tạm thời' }, 500)
      return mockResponse({ docs: [] })
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<TourDepartureManager />)
    await waitFor(() => expect(screen.getByText('Chưa có lịch khởi hành.')).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: 'Thêm lịch' }))
    const change = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } })
    change('Ngày khởi hành', '2026-12-01')
    change('Giá', '15000000')
    fireEvent.click(screen.getByLabelText('Áp dụng ưu đãi'))
    change('Giá gốc', '18000000')
    change('Nhãn promotion', 'Hot Deal Cuối Năm')
    fireEvent.click(screen.getByRole('button', { name: 'Lưu & hoàn tất' }))

    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Lỗi máy chủ tạm thời'))
    expect((screen.getByLabelText('Giá') as HTMLInputElement).value).toBe('15000000')
    expect((screen.getByLabelText('Áp dụng ưu đãi') as HTMLInputElement).checked).toBe(true)
    expect((screen.getByLabelText('Giá gốc') as HTMLInputElement).value).toBe('18000000')
    expect((screen.getByLabelText('Nhãn promotion') as HTMLInputElement).value).toBe('Hot Deal Cuối Năm')
  })

  it('closes the open editor and discards unsaved form when locale changes', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockResponse({ docs: [] }))
    vi.stubGlobal('fetch', fetchMock)

    const { rerender } = render(<TourDepartureManager />)
    await waitFor(() => expect(screen.getByText('Chưa có lịch khởi hành.')).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: 'Thêm lịch' }))
    expect(screen.getByRole('group', { name: 'Form lịch khởi hành' })).toBeTruthy()

    uiMocks.localeCode = 'en'
    rerender(<TourDepartureManager />)

    await waitFor(() => {
      expect(screen.queryByRole('group', { name: 'Form lịch khởi hành' })).toBeNull()
    })
  })

  it('prevents deferred PATCH response from closing newer editor after VI-EN-VI roundtrip', async () => {
    let resolvePatch!: (value: ReturnType<typeof mockResponse>) => void
    const patchPromise = new Promise<ReturnType<typeof mockResponse>>((res) => {
      resolvePatch = res
    })

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'PATCH') return patchPromise
      return mockResponse({ docs: [existingDeparture] })
    })
    vi.stubGlobal('fetch', fetchMock)

    const { rerender } = render(<TourDepartureManager />)
    await waitFor(() => expect(screen.getByText('12.000.000')).toBeTruthy())

    // 1. Edit departure and initiate save
    fireEvent.click(screen.getByRole('button', { name: 'Sửa' }))
    expect(screen.getByRole('group', { name: 'Form lịch khởi hành' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Lưu lịch khởi hành' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/tour-departures/77'),
      expect.objectContaining({ method: 'PATCH' }),
    ))

    // 2. Locale roundtrip vi -> en -> vi
    uiMocks.localeCode = 'en'
    rerender(<TourDepartureManager />)
    await waitFor(() => expect(screen.queryByRole('group', { name: 'Form lịch khởi hành' })).toBeNull())

    uiMocks.localeCode = 'vi'
    rerender(<TourDepartureManager />)
    await waitFor(() => expect(screen.getByText('12.000.000')).toBeTruthy())

    // 3. Open fresh editor in new context generation
    fireEvent.click(screen.getByRole('button', { name: 'Thêm lịch' }))
    expect(screen.getByRole('group', { name: 'Form lịch khởi hành' })).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Ngày khởi hành'), { target: { value: '2026-12-25' } })

    // 4. Stale PATCH resolves from older generation
    resolvePatch(mockResponse({ ...existingDeparture, priceFrom: 12000000 }, 200))

    await new Promise((r) => setTimeout(r, 60))
    expect(screen.getByRole('group', { name: 'Form lịch khởi hành' })).toBeTruthy()
    expect((screen.getByLabelText('Ngày khởi hành') as HTMLInputElement).value).toBe('2026-12-25')
  })

  it('prevents deferred delete reload from invoking onSaved after locale change', async () => {
    let resolveReload!: (value: ReturnType<typeof mockResponse>) => void
    const reloadPromise = new Promise<ReturnType<typeof mockResponse>>((res) => {
      resolveReload = res
    })
    let deleteCount = 0
    const onSaved = vi.fn()
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'DELETE') {
        deleteCount++
        return mockResponse({ id: 77 }, 200)
      }
      if (deleteCount > 0) return reloadPromise
      return mockResponse({ docs: [existingDeparture] })
    })
    vi.stubGlobal('fetch', fetchMock)

    const { rerender } = render(<TourDepartureManager onSaved={onSaved} />)
    await waitFor(() => expect(screen.getByText('12.000.000')).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: 'Xóa' }))
    await waitFor(() => expect(deleteCount).toBe(1))

    uiMocks.localeCode = 'en'
    rerender(<TourDepartureManager onSaved={onSaved} />)

    resolveReload(mockResponse({ docs: [] }))
    await new Promise((r) => setTimeout(r, 60))
    expect(onSaved).not.toHaveBeenCalled()
  })
})
