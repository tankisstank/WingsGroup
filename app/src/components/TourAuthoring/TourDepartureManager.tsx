'use client'

import { useLocale, useDocumentInfo } from '@payloadcms/ui'
import { useCallback, useEffect, useState } from 'react'

import { formatAdminDate } from '@/utilities/formatAdminDate'
import {
  buildTourAuthoringDepartureQuery,
  getTourAuthoringFreshness,
  parseTourAuthoringPrice,
  tourAuthoringRelationID,
} from '@/utilities/tourAuthoring'

export type DepartureFormValue = {
  airline: string
  availabilityStatus: 'limited' | 'open' | 'sold-out'
  currency: 'USD' | 'VND'
  departureCity: string
  departureDate: string
  expiresAt: string
  priceFrom: string
  verified: boolean
}

type Departure = DepartureFormValue & { _status?: string | null; id: number | string; updatedAt: string; verifiedAt?: string | null }
type DepartureSaveMode = 'next' | 'done'

const availabilityLabels = {
  limited: 'Sắp hết chỗ / Limited',
  open: 'Mở bán / Open',
  'sold-out': 'Đã kín / Sold out',
} as const

const blankDeparture = (): DepartureFormValue => ({ airline: '', availabilityStatus: 'open', currency: 'VND', departureCity: '', departureDate: '', expiresAt: '', priceFrom: '', verified: false })

const freshnessLabel = { current: 'Xác minh còn hiệu lực', expired: 'Đã hết hạn · public có thể hiển thị Liên hệ tư vấn', 'needs-verification': 'Cần xác minh' } as const

export function TourDepartureForm({ createActions = false, initial, onCancel, onSubmit }: { createActions?: boolean; initial: DepartureFormValue; onCancel: () => void; onSubmit: (value: DepartureFormValue, mode: DepartureSaveMode) => Promise<void> | void }) {
  const [form, setForm] = useState(initial)
  const [error, setError] = useState('')
  useEffect(() => {
    setForm(initial)
    setError('')
  }, [initial])
  const set = (key: keyof DepartureFormValue, value: string | boolean) => setForm((current) => ({ ...current, [key]: value, ...(key !== 'verified' && key !== 'expiresAt' ? { expiresAt: '', verified: false } : {}) }))
  const submit = async (submitMode: DepartureSaveMode) => {
    const price = parseTourAuthoringPrice(form.priceFrom, form.currency)
    if (!form.departureDate || price === null) return setError('Nhập ngày khởi hành và giá hợp lệ. VND nhận số nguyên hoặc dấu phân cách hàng nghìn rõ ràng.')
    if (form.verified && !form.expiresAt) return setError('Đã xác minh cần có thời điểm hết hạn xác minh.')
    setError('')
    await onSubmit({ ...form, priceFrom: String(price) }, submitMode)
  }
  return <div role="group" aria-label="Form lịch khởi hành" style={{ display: 'grid', gap: '0.6rem', padding: '0.75rem 0', borderTop: '1px solid var(--theme-elevation-150)' }}>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.6rem' }}>
      <label>Ngày khởi hành<input required type="date" value={form.departureDate} onChange={(event) => set('departureDate', event.target.value)} /></label>
      <label>Điểm đi<input value={form.departureCity} onChange={(event) => set('departureCity', event.target.value)} /></label>
      <label>Hãng bay<input value={form.airline} onChange={(event) => set('airline', event.target.value)} /></label>
      <label>Giá<input inputMode="decimal" required value={form.priceFrom} onChange={(event) => set('priceFrom', event.target.value)} /></label>
      <label>Tiền tệ<select value={form.currency} onChange={(event) => set('currency', event.target.value as DepartureFormValue['currency'])}><option value="VND">VND</option><option value="USD">USD</option></select></label>
      <label>Availability<select value={form.availabilityStatus} onChange={(event) => set('availabilityStatus', event.target.value as DepartureFormValue['availabilityStatus'])}>{Object.entries(availabilityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    </div>
    <label><input type="checkbox" checked={form.verified} onChange={(event) => set('verified', event.target.checked)} /> Tôi xác nhận giá và tình trạng chỗ đã được kiểm tra</label>
    {form.verified && <label>Hết hạn xác minh<input type="datetime-local" value={form.expiresAt} onChange={(event) => set('expiresAt', event.target.value)} /></label>}
    {error && <p role="alert" style={{ color: 'var(--theme-error-500)', margin: 0 }}>{error}</p>}
    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>{createActions ? <><button type="button" onClick={() => void submit('next')}>Lưu & thêm tiếp</button><button type="button" onClick={() => void submit('done')}>Lưu & hoàn tất</button></> : <button type="button" onClick={() => void submit('done')}>Lưu lịch khởi hành</button>}<button type="button" onClick={onCancel}>Hủy</button></div>
  </div>
}

export default function TourDepartureManager() {
  const { data, id } = useDocumentInfo()
  const { code: locale } = useLocale()
  const [departures, setDepartures] = useState<Departure[]>([])
  const [form, setForm] = useState<DepartureFormValue | null>(null)
  const [editingID, setEditingID] = useState<number | string | null>(null)
  const [error, setError] = useState('')
  const productID = id
  const siteID = tourAuthoringRelationID(data?.site)

  const load = useCallback(async () => {
    if (productID == null || siteID == null) return
    const response = await fetch(`${buildTourAuthoringDepartureQuery(productID, siteID)}&locale=${encodeURIComponent(locale || 'vi')}`, { credentials: 'include', headers: { 'Accept-Language': locale || 'vi' } })
    if (!response.ok) throw new Error(`Không tải được lịch khởi hành (${response.status}).`)
    const result = await response.json() as { docs?: Departure[] }
    setDepartures(result.docs || [])
  }, [locale, productID, siteID])

  useEffect(() => { void load().catch((reason: Error) => setError(reason.message)) }, [load])

  const save = async (value: DepartureFormValue, saveAndNext = false) => {
    if (productID == null || siteID == null) return
    const payload = { availabilityStatus: value.availabilityStatus, currency: value.currency, departureCity: value.departureCity || null, departureDate: value.departureDate, airline: value.airline || null, priceFrom: Number(value.priceFrom), site: siteID, tourProduct: productID, verifiedAt: value.verified ? new Date().toISOString() : null, expiresAt: value.verified ? new Date(value.expiresAt).toISOString() : null, _status: 'draft' }
    const response = await fetch(editingID == null ? '/api/tour-departures' : `/api/tour-departures/${editingID}`, { body: JSON.stringify(payload), credentials: 'include', headers: { 'Content-Type': 'application/json', 'Accept-Language': locale || 'vi' }, method: editingID == null ? 'POST' : 'PATCH' })
    if (!response.ok) {
      const body = await response.json().catch(() => ({})) as { errors?: Array<{ message?: string }>; message?: string }
      if (response.status === 409) throw new Error('Đã có lịch khởi hành trùng inventoryIdentity. Dòng hiện có không bị ghi đè.')
      throw new Error(body.errors?.[0]?.message || body.message || `Không lưu được lịch khởi hành (${response.status}).`)
    }
    await load()
    setError('')
    setEditingID(null)
    setForm(saveAndNext ? { ...value, departureDate: '', verified: false, expiresAt: '' } : null)
  }

  const deleteDeparture = async (departureID: number | string) => {
    if (!window.confirm('Xóa lịch khởi hành này? Chỉ quan hệ inventory này bị xóa.')) return
    const response = await fetch(`/api/tour-departures/${departureID}`, { credentials: 'include', method: 'DELETE' })
    if (!response.ok) throw new Error(response.status === 403 ? 'Bạn không có quyền xóa lịch này.' : `Không xóa được lịch khởi hành (${response.status}).`)
    await load()
  }

  if (productID == null) return <section style={{ marginTop: '1rem', padding: '1rem', border: '1px solid var(--theme-elevation-150)' }}><strong>Ngày khởi hành & giá</strong><p style={{ marginBottom: 0 }}>Lưu TourProduct trước khi thêm lịch khởi hành.</p></section>

  return <section aria-label="Quản lý ngày khởi hành" style={{ marginTop: '1rem', padding: '1rem', border: '1px solid var(--theme-elevation-150)', borderRadius: 6 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}><div><h3 style={{ margin: 0 }}>Ngày khởi hành & giá</h3><p style={{ margin: '0.35rem 0', color: 'var(--theme-elevation-600)' }}>Lưu độc lập với form TourProduct. Mọi dòng đều thuộc cùng site và tour này.</p></div><button type="button" onClick={() => { setEditingID(null); setForm(blankDeparture()); setError('') }}>Thêm lịch</button></div>
    {error && <p role="alert" style={{ color: 'var(--theme-error-500)' }}>{error}</p>}
    {form && <TourDepartureForm createActions={editingID == null} initial={form} onCancel={() => { setForm(null); setEditingID(null) }} onSubmit={(value, mode) => save(value, editingID == null && mode === 'next').catch((reason: Error) => setError(reason.message))} />}
    <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', minWidth: 850, marginTop: '0.75rem' }}><thead><tr><th>Ngày</th><th>Điểm đi</th><th>Hãng bay</th><th>Giá</th><th>Tiền tệ</th><th>Availability</th><th>Publish</th><th>Freshness</th><th /></tr></thead><tbody>{departures.map((departure) => { const freshness = getTourAuthoringFreshness(departure); return <tr key={departure.id}><td>{formatAdminDate(departure.departureDate)}</td><td>{departure.departureCity || '—'}</td><td>{departure.airline || '—'}</td><td>{Number(departure.priceFrom).toLocaleString('vi-VN')}</td><td>{departure.currency}</td><td>{availabilityLabels[departure.availabilityStatus]}</td><td>{departure._status === 'published' ? 'Đã xuất bản' : 'Bản nháp'}</td><td>{freshnessLabel[freshness]}</td><td><button type="button" onClick={() => { setEditingID(departure.id); setForm({ airline: departure.airline || '', availabilityStatus: departure.availabilityStatus, currency: departure.currency, departureCity: departure.departureCity || '', departureDate: departure.departureDate.slice(0, 10), expiresAt: departure.expiresAt ? departure.expiresAt.slice(0, 16) : '', priceFrom: String(departure.priceFrom), verified: freshness === 'current' }) }}>Sửa</button>{' '}<button type="button" onClick={() => void deleteDeparture(departure.id).catch((reason: Error) => setError(reason.message))}>Xóa</button></td></tr> })}</tbody></table>{!departures.length && <p>Chưa có lịch khởi hành.</p>}</div>
  </section>
}
