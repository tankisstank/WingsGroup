'use client'

import { useEffect, useState } from 'react'

import { parseTourAuthoringPrice } from '@/utilities/tourAuthoring'

export type DepartureFormValue = {
  airline: string
  availabilityStatus: 'limited' | 'open' | 'sold-out'
  currency: 'USD' | 'VND'
  departureCity: string
  departureDate: string
  expiresAt: string
  originalPrice?: string
  priceFrom: string
  promoLabel?: string
  promotionEnabled?: boolean
  verified: boolean
}

type DepartureSaveMode = 'next' | 'done'

export const availabilityLabels = {
  limited: 'Sắp hết chỗ / Limited',
  open: 'Mở bán / Open',
  'sold-out': 'Đã kín / Sold out',
} as const

export function TourDepartureForm({
  busy = false,
  createActions = false,
  initial,
  onCancel,
  onSubmit,
}: {
  busy?: boolean
  createActions?: boolean
  initial: DepartureFormValue
  onCancel: () => void
  onSubmit: (value: DepartureFormValue, mode: DepartureSaveMode) => Promise<void> | void
}) {
  const [form, setForm] = useState(initial)
  const [error, setError] = useState('')
  const promotionEnabled = form.promotionEnabled ?? Boolean(form.originalPrice || form.promoLabel)

  useEffect(() => {
    setForm(initial)
    setError('')
  }, [initial])

  const set = (key: keyof DepartureFormValue, value: string | boolean) => {
    setForm((current) => ({
      ...current,
      [key]: value,
      ...(key !== 'verified' && key !== 'expiresAt' ? { expiresAt: '', verified: false } : {}),
    }))
  }

  const submit = async (mode: DepartureSaveMode) => {
    if (busy) return
    const price = parseTourAuthoringPrice(form.priceFrom, form.currency)
    if (!form.departureDate || price === null) {
      setError('Nhập ngày khởi hành và giá hợp lệ. VND nhận số nguyên hoặc dấu phân cách hàng nghìn rõ ràng.')
      return
    }
    const originalInput = form.originalPrice?.trim() || ''
    const originalPrice = originalInput ? parseTourAuthoringPrice(originalInput, form.currency) : null
    const promoLabel = form.promoLabel?.trim() || ''
    if (promotionEnabled && (price <= 0 || (originalInput && (originalPrice === null || originalPrice <= price)))) {
      setError('Ưu đãi cần giá bán lớn hơn 0; giá gốc phải hợp lệ và lớn hơn giá bán.')
      return
    }
    if (promotionEnabled && !originalInput && !promoLabel) {
      setError('Nhập giá gốc hoặc nhãn promotion cho ưu đãi.')
      return
    }
    if (form.verified && !form.expiresAt) {
      setError('Đã xác minh cần có thời điểm hết hạn xác minh.')
      return
    }
    if (form.verified && (!Number.isFinite(Date.parse(form.expiresAt)) || Date.parse(form.expiresAt) <= Date.now())) {
      setError('Hết hạn xác minh phải là thời điểm hợp lệ trong tương lai.')
      return
    }
    setError('')
    await onSubmit({
      ...form,
      originalPrice: promotionEnabled && originalPrice !== null ? String(originalPrice) : '',
      priceFrom: String(price),
      promoLabel: promotionEnabled ? promoLabel : '',
      promotionEnabled,
    }, mode)
  }

  return (
    <div className="tour-authoring-quick-add-card" role="group" aria-label="Form lịch khởi hành" style={{ display: 'grid', gap: '0.6rem' }}>
      <fieldset disabled={busy} style={{ border: 0, margin: 0, padding: 0, minWidth: 0, display: 'grid', gap: '0.6rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))', gap: '0.6rem' }}>
          <label>Ngày khởi hành
            <input required type="date" value={form.departureDate} onChange={(event) => set('departureDate', event.target.value)} />
          </label>
          <label>Điểm đi
            <input value={form.departureCity} onChange={(event) => set('departureCity', event.target.value)} />
          </label>
          <label>Hãng bay
            <input value={form.airline} onChange={(event) => set('airline', event.target.value)} />
          </label>
          <label>Giá
            <input inputMode="decimal" required value={form.priceFrom} onChange={(event) => set('priceFrom', event.target.value)} />
          </label>
          <label>Tiền tệ
            <select value={form.currency} onChange={(event) => set('currency', event.target.value as DepartureFormValue['currency'])}>
              <option value="VND">VND</option>
              <option value="USD">USD</option>
            </select>
          </label>
          <label>Availability
            <select value={form.availabilityStatus} onChange={(event) => set('availabilityStatus', event.target.value as DepartureFormValue['availabilityStatus'])}>
              {Object.entries(availabilityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
        </div>
        <label className="tour-authoring-verification">
          <input type="checkbox" checked={promotionEnabled} onChange={(event) => set('promotionEnabled', event.target.checked)} /> Áp dụng ưu đãi
        </label>
        {promotionEnabled && (
          <div style={{ display: 'grid', gap: '0.6rem' }}>
            <label>Giá gốc
              <input inputMode="decimal" value={form.originalPrice || ''} onChange={(event) => set('originalPrice', event.target.value)} />
            </label>
            <label>Nhãn promotion
              <input value={form.promoLabel || ''} onChange={(event) => set('promoLabel', event.target.value)} />
            </label>
            <p style={{ margin: 0 }}>Giá gốc dùng cùng tiền tệ với giá bán. Nhãn áp dụng theo ngôn ngữ đang chọn; ưu đãi chỉ hiển thị khi xác minh còn hiệu lực và chưa kín chỗ.</p>
          </div>
        )}
        <label className="tour-authoring-verification">
          <input type="checkbox" checked={form.verified} onChange={(event) => set('verified', event.target.checked)} /> Tôi xác nhận giá và tình trạng chỗ đã được kiểm tra
        </label>
        {form.verified && (
          <label>Hết hạn xác minh
            <input type="datetime-local" value={form.expiresAt} onChange={(event) => set('expiresAt', event.target.value)} />
          </label>
        )}
        {error && <p role="alert" style={{ color: 'var(--theme-error-500)', margin: 0 }}>{error}</p>}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {createActions ? (
            <>
              <button type="button" onClick={() => void submit('next')}>Lưu & thêm tiếp</button>
              <button type="button" onClick={() => void submit('done')}>Lưu & hoàn tất</button>
            </>
          ) : <button type="button" onClick={() => void submit('done')}>Lưu lịch khởi hành</button>}
          <button type="button" onClick={onCancel}>Hủy</button>
        </div>
      </fieldset>
    </div>
  )
}
